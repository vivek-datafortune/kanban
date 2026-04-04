from __future__ import annotations

from difflib import SequenceMatcher
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from apps.ai.llm import get_llm


# ── State ──────────────────────────────────────────────────────────────────────

class SuggestionState(TypedDict):
    # Inputs
    card_title: str
    card_description: str
    list_name: str
    board_labels: list[dict]   # [{id, name, color}]
    board_cards: list[dict]    # [{id, title, list_title}]
    # Outputs (populated sequentially by nodes)
    subtasks: list[str]
    description: str
    suggested_labels: list[str]  # label UUIDs
    priority: str                # P0-P3
    duplicates: list[dict]       # [{id, title, list_title, similarity}]


# ── Pydantic output schemas ────────────────────────────────────────────────────

class ContentOutput(BaseModel):
    subtasks: list[str] = Field(
        description=(
            "3 to 5 short, actionable sub-tasks needed to complete this card. "
            "Each should be an imperative sentence (e.g. 'Write unit tests')."
        )
    )
    description: str = Field(
        description=(
            "An enriched Markdown description for the card. "
            "Include context, goals, and 2-3 acceptance criteria. Keep it concise (4-6 sentences)."
        )
    )


class LabelsOutput(BaseModel):
    label_ids: list[str] = Field(
        description=(
            "IDs of the 1 to 3 most relevant labels from the provided list. "
            "Return an empty list if none are a good match."
        )
    )


class PriorityOutput(BaseModel):
    priority: str = Field(
        description=(
            "Exactly one of: P0, P1, P2, P3. "
            "P0=Critical/blocker, P1=High/urgent, P2=Medium/normal, P3=Low/nice-to-have"
        )
    )


# ── Graph nodes ────────────────────────────────────────────────────────────────

def generate_content_node(state: SuggestionState) -> dict:
    """Generate subtasks and an enriched description from the card title."""
    llm = get_llm(temperature=0.7).with_structured_output(ContentOutput)

    messages = [
        SystemMessage(
            content=(
                "You are a senior project manager helping a team break down work cards "
                "on a Kanban board into clear, actionable subtasks."
            )
        ),
        HumanMessage(
            content=(
                f"Card Title: {state['card_title']}\n"
                f"Current Description: {state['card_description'] or '(empty)'}\n"
                f"List / Column: {state['list_name']}\n\n"
                "Generate 3-5 actionable subtasks and an enriched Markdown description "
                "with context and acceptance criteria."
            )
        ),
    ]

    result: ContentOutput = llm.invoke(messages)
    return {"subtasks": result.subtasks, "description": result.description}


def match_labels_node(state: SuggestionState) -> dict:
    """Match the card to relevant board labels."""
    if not state["board_labels"]:
        return {"suggested_labels": []}

    llm = get_llm(temperature=0.3).with_structured_output(LabelsOutput)

    label_list = "\n".join(
        f"  - ID: {lbl['id']} | Name: {lbl['name']}"
        for lbl in state["board_labels"]
    )
    description = state["description"] or state["card_description"]

    messages = [
        SystemMessage(
            content="You are a project management assistant that categorises task cards."
        ),
        HumanMessage(
            content=(
                f"Card Title: {state['card_title']}\n"
                f"Description: {description or '(empty)'}\n\n"
                f"Available Board Labels:\n{label_list}\n\n"
                "Return the IDs of the 1-3 most relevant labels. "
                "Return an empty list if no label fits well."
            )
        ),
    ]

    result: LabelsOutput = llm.invoke(messages)
    # Validate returned IDs against actual board labels
    valid_ids = {lbl["id"] for lbl in state["board_labels"]}
    return {"suggested_labels": [lid for lid in result.label_ids if lid in valid_ids]}


def score_priority_node(state: SuggestionState) -> dict:
    """Assign a P0-P3 priority based on card content."""
    llm = get_llm(temperature=0.3).with_structured_output(PriorityOutput)

    description = state["description"] or state["card_description"]

    messages = [
        SystemMessage(
            content=(
                "You are a project manager assigning priority levels to task cards.\n"
                "P0 = Critical/blocker (broken system, data loss, security issue)\n"
                "P1 = High / urgent (important feature, significant bug needed soon)\n"
                "P2 = Medium / normal (standard work, no immediate urgency)\n"
                "P3 = Low / nice-to-have (minor improvement, can wait)"
            )
        ),
        HumanMessage(
            content=(
                f"Card Title: {state['card_title']}\n"
                f"Description: {description or '(empty)'}\n"
                f"List / Column: {state['list_name']}\n\n"
                "Respond with exactly one priority level: P0, P1, P2, or P3."
            )
        ),
    ]

    result: PriorityOutput = llm.invoke(messages)
    priority = result.priority.strip().upper()
    if priority not in ("P0", "P1", "P2", "P3"):
        priority = "P2"
    return {"priority": priority}


def check_duplicates_node(state: SuggestionState) -> dict:
    """Find similar existing cards via string similarity (no LLM call needed)."""
    needle = state["card_title"].lower()
    hits: list[dict] = []

    for card in state["board_cards"]:
        ratio = SequenceMatcher(None, needle, card["title"].lower()).ratio()
        if ratio >= 0.65:
            hits.append(
                {
                    "id": card["id"],
                    "title": card["title"],
                    "list_title": card["list_title"],
                    "similarity": round(ratio, 2),
                }
            )

    hits.sort(key=lambda x: x["similarity"], reverse=True)
    return {"duplicates": hits[:3]}


# ── Compiled graph (module-level singleton) ────────────────────────────────────

def build_suggestion_graph():
    graph: StateGraph = StateGraph(SuggestionState)

    graph.add_node("generate_content", generate_content_node)
    graph.add_node("match_labels", match_labels_node)
    graph.add_node("score_priority", score_priority_node)
    graph.add_node("check_duplicates", check_duplicates_node)

    # Sequential pipeline: generate → label-match → priority → duplicate-check
    graph.add_edge(START, "generate_content")
    graph.add_edge("generate_content", "match_labels")
    graph.add_edge("match_labels", "score_priority")
    graph.add_edge("score_priority", "check_duplicates")
    graph.add_edge("check_duplicates", END)

    return graph.compile()
