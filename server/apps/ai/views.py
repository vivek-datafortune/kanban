from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.boards.models import Card, CardLabel, ChecklistItem, Label
from apps.boards.serializers import CardSerializer
from apps.workspaces.models import WorkspaceMembership

from .agents.graph import build_suggestion_graph
from .llm import get_llm
from .models import AIUsage, AISuggestion
from .serializers import AISuggestionSerializer
from .throttles import AIRateThrottle


class GenerateDescriptionView(APIView):
    """
    POST /api/ai/describe/
    Body: { card_id: uuid }
    Fast single-step LLM call: returns only an enriched description as HTML.
    Used by the Tiptap toolbar AI button.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        from langchain_core.messages import HumanMessage, SystemMessage
        from pydantic import BaseModel, Field

        card_id = request.data.get("card_id")
        custom_prompt: str = (request.data.get("prompt") or "").strip()
        if not card_id:
            return Response({"detail": "card_id is required."}, status=400)

        card = get_object_or_404(
            Card.objects.select_related("list__board__workspace"), id=card_id
        )
        if not WorkspaceMembership.objects.filter(
            workspace=card.list.board.workspace, user=request.user
        ).exists():
            return Response({"detail": "Not authorized."}, status=403)

        class DescriptionOutput(BaseModel):
            description_html: str = Field(
                description=(
                    "A rich HTML description for the card. "
                    "Use <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote> tags. "
                    "Include: what needs to be done, context/goals, and 2-3 acceptance criteria "
                    "as a <ul> list. Keep it concise (5-8 sentences)."
                )
            )

        user_instruction = (
            f"\n\nAdditional instruction from the user: {custom_prompt}"
            if custom_prompt
            else ""
        )

        llm = get_llm(temperature=0.7).with_structured_output(DescriptionOutput)
        messages = [
            SystemMessage(
                content=(
                    "You are a senior product manager writing rich, clear card descriptions "
                    "for a Kanban board. Output valid HTML using only inline formatting tags "
                    "(<p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>). No <div>, no <br>."
                )
            ),
            HumanMessage(
                content=(
                    f"Card title: {card.title}\n"
                    f"Current description: {card.description or '(empty)'}\n"
                    f"Column: {card.list.title}\n\n"
                    "Write an enriched HTML description with context, goals, and acceptance criteria."
                    f"{user_instruction}"
                )
            ),
        ]
        try:
            result: DescriptionOutput = llm.invoke(messages)
        except Exception as exc:
            return Response({"detail": f"AI error: {str(exc)}"}, status=502)

        AIUsage.objects.create(
            workspace=card.list.board.workspace,
            user=request.user,
            model=settings.GROQ_MODEL,
            endpoint="describe",
        )
        return Response({"description": result.description_html})


class GenerateChecklistView(APIView):
    """
    POST /api/ai/checklist/
    Body: { card_id: uuid, prompt?: string }
    Returns: { items: string[] }
    Generates 5-7 actionable checklist items for the card.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        from langchain_core.messages import HumanMessage, SystemMessage
        from pydantic import BaseModel, Field

        card_id = request.data.get("card_id")
        custom_prompt: str = (request.data.get("prompt") or "").strip()
        if not card_id:
            return Response({"detail": "card_id is required."}, status=400)

        card = get_object_or_404(
            Card.objects.select_related("list__board__workspace"), id=card_id
        )
        if not WorkspaceMembership.objects.filter(
            workspace=card.list.board.workspace, user=request.user
        ).exists():
            return Response({"detail": "Not authorized."}, status=403)

        class ChecklistOutput(BaseModel):
            items: list[str] = Field(
                description=(
                    "A JSON array of 5 to 7 short, specific, actionable checklist items. "
                    "MUST be a JSON array of strings, e.g. [\"Do X\", \"Do Y\"]. "
                    "Each item is an imperative sentence under 10 words. "
                    "No numbering or bullet prefixes."
                )
            )

            @classmethod
            def model_validate(cls, obj, **kwargs):
                if isinstance(obj, dict) and isinstance(obj.get("items"), str):
                    raw = obj["items"]
                    obj = {**obj, "items": [i.strip() for i in raw.split(",") if i.strip()]}
                return super().model_validate(obj, **kwargs)
        user_instruction = (
            f"\n\nAdditional instruction from the user: {custom_prompt}"
            if custom_prompt
            else ""
        )

        # Include existing items so AI doesn't duplicate them
        existing = list(card.checklist_items.values_list("text", flat=True))
        existing_note = (
            f"\nExisting checklist items (do NOT duplicate): {', '.join(existing)}"
            if existing
            else ""
        )

        llm = get_llm(temperature=0.7).with_structured_output(ChecklistOutput)
        messages = [
            SystemMessage(
                content=(
                    "You are a senior project manager creating actionable task checklists "
                    "for Kanban board cards. Each item must be concise, specific, and completable."
                )
            ),
            HumanMessage(
                content=(
                    f"Card title: {card.title}\n"
                    f"Description: {card.description or '(empty)'}\n"
                    f"Column: {card.list.title}"
                    f"{existing_note}\n\n"
                    "Generate 5-7 actionable checklist items."
                    f"{user_instruction}"
                )
            ),
        ]
        try:
            result: ChecklistOutput = llm.invoke(messages)
        except Exception as exc:
            return Response({"detail": f"AI error: {str(exc)}"}, status=502)

        AIUsage.objects.create(
            workspace=card.list.board.workspace,
            user=request.user,
            model=settings.GROQ_MODEL,
            endpoint="checklist",
        )
        return Response({"items": result.items})


class GenerateSuggestionsView(APIView):
    """
    POST /api/ai/suggest/
    Body: { card_id: uuid }
    Runs the LangGraph pipeline and returns a fresh AISuggestion.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        card_id = request.data.get("card_id")
        if not card_id:
            return Response({"detail": "card_id is required."}, status=400)

        card = get_object_or_404(
            Card.objects.select_related("list__board__workspace"), id=card_id
        )
        board = card.list.board

        if not WorkspaceMembership.objects.filter(
            workspace=board.workspace, user=request.user
        ).exists():
            return Response({"detail": "Not authorized."}, status=403)

        # Build context for the graph
        board_labels = [
            {"id": str(lbl.id), "name": lbl.name, "color": lbl.color}
            for lbl in board.labels.all()
        ]
        board_cards = [
            {"id": str(c.id), "title": c.title, "list_title": lst.title}
            for lst in board.lists.filter(is_archived=False).prefetch_related("cards")
            for c in lst.cards.all()
            if str(c.id) != card_id
        ]

        initial_state = {
            "card_title": card.title,
            "card_description": card.description or "",
            "list_name": card.list.title,
            "board_labels": board_labels,
            "board_cards": board_cards,
            "subtasks": [],
            "description": "",
            "suggested_labels": [],
            "priority": "P2",
            "duplicates": [],
        }

        try:
            graph = build_suggestion_graph()
            result = graph.invoke(initial_state)
        except Exception as exc:
            return Response({"detail": f"AI pipeline error: {str(exc)}"}, status=502)

        suggestion = AISuggestion.objects.create(
            card=card,
            subtasks=result["subtasks"],
            description=result["description"],
            suggested_labels=result["suggested_labels"],
            priority=result["priority"],
            duplicates=result["duplicates"],
        )

        AIUsage.objects.create(
            workspace=board.workspace,
            user=request.user,
            model=settings.GROQ_MODEL,
            endpoint="suggest",
        )

        return Response(AISuggestionSerializer(suggestion).data, status=201)


class CardAISuggestionView(APIView):
    """
    GET /api/cards/:id/ai-suggestions/
    Returns the latest non-dismissed suggestion for the card, or null.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        card = get_object_or_404(Card, id=pk)
        suggestion = card.ai_suggestions.filter(is_dismissed=False).first()
        if suggestion is None:
            return Response(None)
        return Response(AISuggestionSerializer(suggestion).data)


class AcceptSuggestionView(APIView):
    """
    POST /api/ai-suggestions/:id/accept/
    Body:
      subtasks: string[]           — which subtasks to create as checklist items
      accept_description: bool     — replace card description
      label_ids: string[]          — label UUIDs to apply
      accept_priority: bool        — apply priority to card
    Returns the updated Card.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        suggestion = get_object_or_404(
            AISuggestion.objects.select_related("card__list__board__workspace"), id=pk
        )
        card = suggestion.card
        board = card.list.board

        if not WorkspaceMembership.objects.filter(
            workspace=board.workspace, user=request.user
        ).exists():
            return Response({"detail": "Not authorized."}, status=403)

        accepted_subtasks: list[str] = request.data.get("subtasks", [])
        accept_description: bool = request.data.get("accept_description", False)
        accepted_label_ids: list[str] = request.data.get("label_ids", [])
        accept_priority: bool = request.data.get("accept_priority", False)

        # Create checklist items
        if accepted_subtasks:
            existing = list(card.checklist_items.values_list("position", flat=True))
            base_pos = (max(existing) + 65536) if existing else 65536
            ChecklistItem.objects.bulk_create(
                [
                    ChecklistItem(
                        card=card,
                        text=text.strip(),
                        position=base_pos + i * 65536,
                    )
                    for i, text in enumerate(accepted_subtasks)
                    if text.strip()
                ]
            )

        # Replace description
        if accept_description and suggestion.description:
            card.description = suggestion.description

        # Apply labels
        for label_id in accepted_label_ids:
            try:
                label = Label.objects.get(id=label_id, board=board)
                CardLabel.objects.get_or_create(card=card, label=label)
            except Label.DoesNotExist:
                pass

        # Apply priority
        if accept_priority and suggestion.priority:
            card.priority = suggestion.priority

        card.save()
        suggestion.is_accepted = True
        suggestion.save(update_fields=["is_accepted"])

        return Response(CardSerializer(card, context={"request": request}).data)


class DismissSuggestionView(APIView):
    """POST /api/ai-suggestions/:id/dismiss/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        suggestion = get_object_or_404(AISuggestion, id=pk)
        suggestion.is_dismissed = True
        suggestion.save(update_fields=["is_dismissed"])
        return Response({"status": "dismissed"})


class GenerateTemplateView(APIView):
    """
    POST /api/ai/generate-template/
    Body: { prompt: str, workspace_slug: str }
    Generates and saves a BoardTemplate from a natural language prompt.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        from langchain_core.messages import HumanMessage, SystemMessage
        from pydantic import BaseModel, Field
        from apps.board_templates.models import BoardTemplate
        from apps.board_templates.serializers import BoardTemplateSerializer
        from apps.workspaces.models import Workspace, WorkspaceMembership

        prompt = (request.data.get("prompt") or "").strip()
        workspace_slug = (request.data.get("workspace_slug") or "").strip()
        if not prompt:
            return Response({"detail": "prompt is required."}, status=400)

        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        if not WorkspaceMembership.objects.filter(workspace=workspace, user=request.user).exists():
            return Response({"detail": "Not authorized."}, status=403)

        class CardSchema(BaseModel):
            title: str
            description: str = ""
            labels: list[str] = Field(default_factory=list)
            checklist: list[dict] = Field(default_factory=list)

        class ListSchema(BaseModel):
            title: str
            position: int
            cards: list[CardSchema] = Field(default_factory=list)

        class LabelSchema(BaseModel):
            name: str
            color: str

        class TemplateOutput(BaseModel):
            title: str
            description: str
            category: str
            lists: list[ListSchema]
            labels: list[LabelSchema] = Field(default_factory=list)

        llm = get_llm(temperature=0.8).with_structured_output(TemplateOutput)
        messages = [
            SystemMessage(content=(
                "You are an expert project manager creating Kanban board templates. "
                "Generate a practical board with 3-5 lists, each having 2-4 sample cards. "
                "Pick 2-5 meaningful labels with distinct hex colors. "
                "category must be exactly one of: engineering, product, design, marketing, hr, general."
            )),
            HumanMessage(content=f"Create a Kanban board template for: {prompt}"),
        ]
        try:
            result: TemplateOutput = llm.invoke(messages)
        except Exception as exc:
            return Response({"detail": f"AI error: {str(exc)}"}, status=502)

        valid_categories = [c[0] for c in BoardTemplate.Category.choices]
        template = BoardTemplate.objects.create(
            title=result.title,
            description=result.description,
            category=result.category if result.category in valid_categories else "general",
            is_system=False,
            created_by=request.user,
            workspace=workspace,
            data={
                "lists": [
                    {
                        "title": lst.title,
                        "position": lst.position,
                        "cards": [
                            {
                                "title": c.title,
                                "description": c.description,
                                "labels": c.labels,
                                "checklist": c.checklist,
                            }
                            for c in lst.cards
                        ],
                    }
                    for lst in result.lists
                ],
                "labels": [{"name": l.name, "color": l.color} for l in result.labels],
            },
        )
        AIUsage.objects.create(
            workspace=workspace,
            user=request.user,
            model=settings.GROQ_MODEL,
            endpoint="generate-template",
        )
        return Response(BoardTemplateSerializer(template).data, status=201)
