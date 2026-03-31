# Phase 4 — AI Features

> **Priority:** P2 (Medium — differentiator, not blocking core usage)
> **Depends on:** Phase 1 (Cards, Labels exist), Phase 2 (Celery/Redis available)
> **Source of truth:** [product-plan.md](./product-plan.md) §3 (AI Features)

---

## Goal

AI assists users in creating and organizing cards — auto-generating subtasks, suggesting labels, scoring priority, and detecting duplicates.

---

## Backend Tasks

### 4.1 Django App Structure

```
server/apps/ai/
├── __init__.py
├── apps.py
├── views.py
├── serializers.py
├── urls.py
├── tasks.py            # Celery async tasks
├── throttles.py        # AI-specific rate limiting
├── agents/
│   ├── __init__.py
│   ├── card_agent.py   # Subtask generation, description enrichment
│   ├── labeler_agent.py # Auto-label, priority scoring
│   ├── tools.py        # LangChain tools (board context lookup)
│   └── graph.py        # LangGraph workflow definition
└── prompts/
    ├── __init__.py
    ├── card_suggestions.py
    └── labeler.py
```

### 4.2 LLM Configuration

**Environment Variables:**
```
AI_PROVIDER=openai           # or "ollama"
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3
AI_RATE_LIMIT=20/hour
```

**Provider Abstraction:**
```python
# Use LangChain's ChatOpenAI or ChatOllama based on AI_PROVIDER env var
# Single factory function: get_llm() → BaseChatModel
```

### 4.3 Smart Card Suggestions

**Endpoint:** `POST /api/ai/suggest/`

**Request:**
```json
{
  "card_id": "uuid",          // optional — existing card
  "title": "Launch landing page",
  "board_id": "uuid"          // for context
}
```

**Response:**
```json
{
  "subtasks": [
    {"title": "Design mockup in Figma", "position": 1},
    {"title": "Write hero copy and CTA text", "position": 2},
    {"title": "Implement responsive layout", "position": 3},
    {"title": "Set up analytics tracking", "position": 4},
    {"title": "QA cross-browser testing", "position": 5}
  ],
  "description": "## Objective\nLaunch a conversion-optimized landing page...\n\n## Acceptance Criteria\n- [ ] Mobile responsive\n- [ ] Page load < 3s...",
  "suggested_labels": ["frontend", "design"]
}
```

**LangChain Implementation:**
- Inject board context as system message: existing lists, labels, recent cards (for tone/style)
- Structured output using Pydantic model: `CardSuggestion(subtasks, description, labels)`
- Temperature: 0.7 for creativity, 0.3 for label matching

**Actions (frontend sends back):**
- `POST /api/ai/suggest/apply/` — creates checklist items from subtasks, updates description, adds labels

### 4.4 Auto-Categorization (LangGraph Workflow)

**Trigger:** Card created or updated (Celery task, debounced 2s)

**LangGraph State:**
```python
class CategorizationState(TypedDict):
    card_title: str
    card_description: str
    board_labels: list[dict]        # existing labels
    board_cards: list[dict]         # existing card titles for duplicate check
    suggested_labels: list[str]
    priority: str                   # P0-P3
    duplicates: list[dict]          # similar cards found
```

**Graph Nodes:**

```
START
  │
  ▼
analyze_content    → Extract keywords, intent, category from title+description
  │
  ├──► match_labels     → Compare against board's existing labels, pick 1-3
  ├──► score_priority   → Assign P0-P3 based on urgency keywords + due date
  └──► check_duplicates → Cosine similarity against existing card titles
  │
  ▼
aggregate_results  → Combine into final suggestion object
  │
  ▼
END → Return suggestions
```

**Parallel execution:** `match_labels`, `score_priority`, `check_duplicates` run in parallel (LangGraph fan-out).

**API:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cards/:id/ai-suggestions/` | Get cached AI suggestions for a card |
| POST | `/api/cards/:id/ai-suggestions/accept/` | Accept suggestions (apply labels, set priority) |
| POST | `/api/cards/:id/ai-suggestions/dismiss/` | Dismiss suggestions |

### 4.5 Rate Limiting & Cost Control

**Throttle:**
```python
class AIRateThrottle(UserRateThrottle):
    rate = settings.AI_RATE_LIMIT  # "20/hour"
```

**Token Tracking Model:**
```
AIUsage
├── workspace: FK → Workspace
├── user: FK → User
├── tokens_input: IntegerField
├── tokens_output: IntegerField
├── model: CharField
├── created_at: DateTimeField
```

**Admin Dashboard Endpoint:**
- `GET /api/workspaces/:slug/ai-usage/` — monthly token usage summary (Admin+)

### 4.6 Privacy & Security

- Only send to LLM: card title, description, label names, list names
- Strip all emails, user names, attachment contents
- Log prompts/responses for debugging (opt-in, disabled in production)
- LLM responses never auto-applied — always require user confirmation

---

## Frontend Tasks

### 4.7 AI Suggestion Panel (Card Detail Modal)

**Location:** Right sidebar or collapsible section in card detail.

**States:**
1. **Idle** — "✨ Generate AI Suggestions" button
2. **Loading** — Spinner with "AI is thinking..."
3. **Results** — Show suggestions with accept/dismiss per item:
   - Subtasks list (checkboxes to select which to add)
   - Generated description (diff view or preview)
   - Suggested labels (pill chips, click to accept individual)
   - Priority badge (P0–P3)
   - Duplicate warning ("Similar to: [Card Title] in [List]")
4. **Applied** — "Suggestions applied ✓" confirmation

### 4.8 Auto-Suggestion Badge

- When AI suggestions are available (background task completed), show a subtle "✨" badge on the card in board view
- Click card → suggestions pre-loaded in panel

### 4.9 React Query Hooks

```
use-ai.ts → useGenerateSuggestions(cardId), useAISuggestions(cardId), useAcceptSuggestions(), useDismissSuggestions()
```

---

## Acceptance Criteria

- [ ] User can click "Generate Suggestions" on any card
- [ ] AI returns subtasks, enriched description, and label suggestions
- [ ] User can accept/dismiss individual suggestions
- [ ] Auto-categorization runs in background on card creation
- [ ] Duplicate detection warns about similar existing cards
- [ ] Priority scoring (P0–P3) is shown and can be accepted
- [ ] Rate limiting enforced (20 requests/user/hour)
- [ ] Token usage tracked per workspace
- [ ] Works with both OpenAI and Ollama (configurable)
- [ ] No PII sent to LLM

---

## New Dependencies

**Backend:**
- `langchain` + `langchain-openai` + `langchain-community` (LLM orchestration)
- `langgraph` (workflow graphs)
- `celery` (already available from Phase 2)
- `tiktoken` (token counting for usage tracking)

**Frontend:**
- None

**Infrastructure:**
- Ollama container in `docker-compose.yml` (optional, for self-hosted LLM)
