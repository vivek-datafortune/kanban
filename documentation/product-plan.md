# Trello Clone — Product Plan

## Overview

A Trello-like project management application built for **small teams (2–20 members)** with real-time collaboration, AI-powered productivity features, and third-party integrations. The app follows a **Neumorphism** design system with light ("Peach Cloud") and dark ("Twilight") themes.

**Tech Stack:**

- **Frontend:** React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zustand, TanStack React Query
- **Backend:** Django 6, Django REST Framework, PostgreSQL, Django Channels (WebSockets)
- **AI:** LangChain + LangGraph (Python)
- **Auth:** Google & Microsoft OAuth via django-allauth, JWT tokens

---

## 1. Must-Have Features

### 1.1 Core Board System

| Feature | Description |
|---|---|
| **Workspaces** | Top-level container for boards. Each team gets a workspace with invite-based membership (Owner, Admin, Member roles). |
| **Boards** | Kanban boards within a workspace. Support visibility levels: private, workspace-visible. Star/favorite boards for quick access. |
| **Lists** | Vertical columns within a board (e.g., To Do, In Progress, Done). Drag-and-drop reordering. |
| **Cards** | Individual tasks within a list. Drag-and-drop between lists and within a list. |

### 1.2 Authorization & Roles (RBAC)

Three roles at **workspace level**, with board-level overrides:

| Action | Owner | Admin | Member |
|---|:---:|:---:|:---:|
| Create workspace | ✅ | — | — |
| Delete workspace | ✅ | — | — |
| Rename workspace / update settings | ✅ | ✅ | — |
| Invite members to workspace | ✅ | ✅ | — |
| Remove members from workspace | ✅ | ✅ | — |
| Change member roles | ✅ | ✅ (can't promote to Owner) | — |
| Transfer ownership | ✅ | — | — |
| Create boards | ✅ | ✅ | ✅ |
| Delete boards | ✅ | ✅ | Creator only |
| Create / edit / move cards | ✅ | ✅ | ✅ |
| Delete cards | ✅ | ✅ | Creator only |
| Manage labels | ✅ | ✅ | — |
| Manage webhooks | ✅ | ✅ | — |
| View analytics dashboard | ✅ | ✅ | ✅ (own data) |
| Configure integrations (Calendar, Email) | ✅ | ✅ | — |
| Use AI features | ✅ | ✅ | ✅ |

**Invitation Flow:**

1. Owner/Admin enters one or more email addresses + role
2. System sends invitation email with a unique signed link (expires in 7 days)
3. If invitee already has an account → added to workspace immediately on link click
4. If invitee is new → redirected to OAuth sign-up, then auto-joined to workspace
5. Pending invitations visible in workspace settings (re-send / revoke)
6. Rate limit: max 20 invitations per hour per workspace

**Board-Level Permissions (optional override):**

| Visibility | Who can see | Who can edit |
|---|---|---|
| **Workspace** | All workspace members | All workspace members |
| **Private** | Only board members (explicitly added) | Only board members |

Board creators can add/remove individual members within private boards regardless of workspace role.

### 1.2 Card Details

| Feature | Description |
|---|---|
| **Title & Description** | Markdown-supported rich text description. |
| **Labels** | Color-coded tags with custom names. Filter board by label. |
| **Members** | Assign one or more workspace members to a card. |
| **Due Dates** | Start date + due date with overdue indicators. |
| **Checklists** | Nested to-do lists within a card with progress percentage. |
| **Comments** | Threaded discussion on each card with @mentions. |
| **File Attachments** | Upload images, PDFs, documents to cards. Store in S3-compatible storage (e.g., MinIO for dev, AWS S3 for prod). Max 25MB per file. |
| **Activity Log** | Timestamped history of all changes on a card (moved, assigned, label added, etc.). |

### 1.3 Real-Time Collaboration

| Feature | Description |
|---|---|
| **WebSocket Updates** | Board state synced in real-time via Django Channels + Redis. When any user moves a card, adds a comment, or edits — all connected clients see it instantly. |
| **Presence Indicators** | Show which users are currently viewing a board (avatar dots). |
| **Typing Indicators** | Show when someone is typing a comment. |

### 1.4 Time Tracking

| Feature | Description |
|---|---|
| **Estimate** | Set estimated hours per card. |
| **Timer** | Start/stop timer on a card. Multiple sessions logged. |
| **Time Log** | Manual entry of time spent. View total tracked vs estimated. |
| **Reports** | Per-member, per-board time summaries (feeds into Dashboard Analytics). |

### 1.5 Board Templates

| Feature | Description |
|---|---|
| **System Templates** | Pre-built layouts: Kanban, Sprint Board, Bug Tracker, Content Calendar, Onboarding. |
| **Custom Templates** | Save any board as a reusable template. |
| **Template Marketplace** | Browse and use templates shared within a workspace. |

### 1.6 Dashboard Analytics

| Feature | Description |
|---|---|
| **Board Overview** | Cards per list, overdue count, completion rate. |
| **Member Workload** | Cards assigned per member, time tracked per member. |
| **Velocity Chart** | Cards completed over time (weekly/monthly). |
| **Burndown Chart** | Remaining work vs time for sprint-style boards. |
| **Label Distribution** | Pie chart of cards by label. |

### 1.7 Search & Filters

| Feature | Description |
|---|---|
| **Global Search** | Search cards across all boards by title, description, comments. |
| **Board Filters** | Filter by label, member, due date, activity. Combine filters. |
| **Saved Filters** | Save frequently used filter combinations. |

### 1.8 Notifications

| Feature | Description |
|---|---|
| **In-App** | Bell icon with notification feed — card assigned, mentioned, due soon, comment reply. |
| **Email Digest** | Daily/weekly summary of board activity (configurable). |
| **Push (Future)** | Browser push notifications for urgent items. |

---

## 2. App Integrations

### 2.1 Google Calendar Sync

| Aspect | Detail |
|---|---|
| **Direction** | Two-way sync |
| **Card → Calendar** | When a card has a due date, create/update a Google Calendar event. Include card title, link back to card, assigned members. |
| **Calendar → Card** | Optionally update card due date when calendar event is rescheduled. |
| **Auth** | Leverage existing Google OAuth. Request `calendar.events` scope. |
| **Implementation** | Background Celery task watches for due date changes. Google Calendar API v3 for CRUD. Store sync state per card to avoid duplicates. |
| **Settings** | Per-user toggle: enable/disable sync. Choose which calendar. |

### 2.2 Email Integration

| Aspect | Detail |
|---|---|
| **Create Cards via Email** | Each board gets a unique inbound email address (e.g., `board-abc123@inbound.app.com`). Email subject → card title, body → description, attachments → card files. |
| **Email Notifications** | Transactional emails for: card assigned, mentioned in comment, due date approaching (1 day, 1 hour), weekly digest. |
| **Reply-to-Comment** | Reply to a notification email to add a comment on the card. Parse incoming email, match to card, create comment. |
| **Implementation** | Inbound: webhook-based email parsing (SendGrid Inbound Parse or Mailgun Routes). Outbound: Django `django-anymail` with SendGrid/Mailgun. |

### 2.3 Webhooks (Extensibility)

| Aspect | Detail |
|---|---|
| **Outbound Webhooks** | Workspace admins can register webhook URLs. Fire on events: card.created, card.moved, card.completed, comment.added, member.assigned. |
| **Payload** | JSON with event type, timestamp, actor, and full object data. HMAC signature for verification. |
| **Retry** | 3 retries with exponential backoff on failure. |
| **Use Case** | Enables Zapier-style automation, Slack bots, CI/CD triggers without building native integrations. |

---

## 3. AI Features (LangChain + LangGraph)

### 3.1 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Chat panel / AI action buttons on cards         │
└─────────────┬───────────────────────────────────┘
              │ REST / WebSocket
┌─────────────▼───────────────────────────────────┐
│              Django API Layer                    │
│  server/apps/ai/views.py                        │
│  Validates permissions, rate-limits              │
└─────────────┬───────────────────────────────────┘
              │ Celery task / async
┌─────────────▼───────────────────────────────────┐
│           LangGraph Agent Orchestrator           │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Card     │  │ Auto-    │  │ Suggestion    │  │
│  │ Generator│  │ Labeler  │  │ Engine        │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  Tools: DB queries, board context, user prefs    │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│          LLM Provider (OpenAI / Ollama)          │
└─────────────────────────────────────────────────┘
```

### 3.2 Smart Card Suggestions

| Aspect | Detail |
|---|---|
| **Generate Subtasks** | User types a card title (e.g., "Launch landing page"). AI generates a checklist of subtasks: design mockup, write copy, implement responsive layout, set up analytics, QA testing. |
| **Enrich Description** | Given a card title, generate a structured description with acceptance criteria, context, and suggested labels. |
| **Break Down Epics** | Select a high-level card → AI splits it into multiple smaller cards with titles, descriptions, and suggested list placement. |
| **Implementation** | LangChain `ChatOpenAI` with structured output (Pydantic models for card schema). Board context (existing lists, labels, members) injected as system prompt. |

**Django App Structure:**

```
server/apps/ai/
├── __init__.py
├── apps.py
├── views.py          # API endpoints for AI actions
├── serializers.py    # Request/response schemas
├── tasks.py          # Celery tasks for async AI calls
├── agents/
│   ├── __init__.py
│   ├── card_agent.py       # LangGraph agent for card operations
│   ├── labeler_agent.py    # Auto-categorization agent
│   └── tools.py            # LangChain tools (DB lookups, board context)
└── prompts/
    ├── card_suggestions.py
    └── labeler.py
```

### 3.3 Auto-Categorization

| Aspect | Detail |
|---|---|
| **Auto-Label** | When a card is created, AI analyzes title + description and suggests 1–3 labels from the board's existing label set. User can accept/dismiss. |
| **Priority Scoring** | AI assigns a priority score (P0–P3) based on content analysis, due date proximity, and dependency keywords. |
| **Duplicate Detection** | Before creating a card, AI checks similarity against existing cards in the board. Warns: "Similar card exists in [List]: [Card Title]". |
| **Implementation** | LangGraph workflow: `analyze_content → match_labels → score_priority → check_duplicates → return_suggestions`. Each step is a graph node with conditional edges. |

### 3.4 LangGraph Workflow Example

```
                    ┌─────────────┐
                    │  START       │
                    │  (card text) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Analyze    │
                    │  Content    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼────────┐ ┌─▼───────────┐
       │  Match      │ │  Score    │ │  Check       │
       │  Labels     │ │  Priority │ │  Duplicates  │
       └──────┬──────┘ └──┬────────┘ └─┬───────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  Aggregate  │
                    │  Results    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  END        │
                    │  (suggestions)│
                    └─────────────┘
```

### 3.5 AI Configuration

| Setting | Detail |
|---|---|
| **LLM Provider** | Configurable: OpenAI GPT-4o (cloud) or Ollama (self-hosted) via environment variable. |
| **Rate Limiting** | 20 AI requests per user per hour (configurable). |
| **Cost Control** | Token usage tracked per workspace. Admins see monthly usage dashboard. |
| **Privacy** | Only card title, description, and label names sent to LLM. No user emails or file contents. Board context is anonymized. |

---

## 4. Data Model Overview

```
Workspace
├── name, slug, created_by
├── WorkspaceMembership (user, role: owner/admin/member)
│
├── Board
│   ├── title, background_color, is_starred, visibility
│   ├── BoardMembership (user, role)
│   │
│   ├── List
│   │   ├── title, position (float for reordering)
│   │   │
│   │   └── Card
│   │       ├── title, description, position
│   │       ├── due_date, start_date, is_completed
│   │       ├── estimated_hours, tracked_time
│   │       │
│   │       ├── CardLabel (→ Label)
│   │       ├── CardMember (→ User)
│   │       ├── Checklist
│   │       │   └── ChecklistItem (title, is_checked)
│   │       ├── Comment (body, author, created_at)
│   │       ├── Attachment (file, filename, size)
│   │       ├── TimeEntry (user, started_at, ended_at, duration)
│   │       └── Activity (action, actor, details, timestamp)
│   │
│   └── Label (name, color, board)
│
├── BoardTemplate (title, data_snapshot)
│
└── Notification (user, type, card, is_read)

WebhookEndpoint (workspace, url, events[], secret)
CalendarSync (user, board, google_calendar_id, enabled)
```

---

## 5. Implementation Phases

### Phase 1 — Core Board Engine (Foundation)

> **Goal:** Users can create workspaces, boards, lists, cards and drag them around.

- Workspace & Board CRUD (models, serializers, views, permissions)
- List CRUD with position-based ordering
- Card CRUD with drag-and-drop reordering (fractional indexing)
- Card details: labels, members, due dates, description
- Frontend: Board page with drag-and-drop (use `@dnd-kit/core`)
- Frontend: Card detail modal

### Phase 2 — Collaboration & Real-Time

> **Goal:** Multiple users can work on the same board and see live updates.

- Django Channels setup with Redis
- WebSocket consumers for board events (card moved, created, updated, deleted)
- Workspace invitations and membership management
- Comments with @mentions
- Checklists
- Activity log per card
- In-app notification system

### Phase 3 — File Attachments & Time Tracking

> **Goal:** Cards become richer with attached files and time tracking.

- File upload to S3/MinIO with presigned URLs
- Image preview, file list on card detail
- Time tracking: estimate, start/stop timer, manual entry
- Time reports per board and per member

### Phase 4 — AI Features

> **Goal:** AI assists users in creating and organizing cards.

- Django app `server/apps/ai/` with LangChain + LangGraph
- Smart card suggestions (subtask generation, description enrichment)
- Auto-labeling on card creation
- Priority scoring
- Duplicate detection
- Frontend: AI suggestion panel on card detail, accept/dismiss UI

### Phase 5 — Integrations

> **Goal:** Connect boards to external tools.

- Google Calendar two-way sync (Celery + Google Calendar API)
- Email integration: inbound card creation, outbound notifications, reply-to-comment
- Outbound webhooks with HMAC signing

### Phase 6 — Templates & Analytics

> **Goal:** Power features for team leads and managers.

- Board templates: system defaults + save-as-template
- Dashboard analytics: velocity chart, burndown, workload distribution, label breakdown
- Search: global card search with filters, saved filter presets

---

## 6. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Drag-and-drop** | `@dnd-kit/core` | Framework-agnostic, works with React 19, accessible, supports keyboard DnD. |
| **Card ordering** | Fractional indexing | Avoids reindexing all cards on every move. Use `position` as float. |
| **Real-time** | Django Channels + Redis | Native Django ecosystem. Redis as channel layer and Celery broker (dual use). |
| **File storage** | S3-compatible (MinIO dev / S3 prod) | `django-storages` with `boto3`. Presigned upload URLs to bypass Django for large files. |
| **AI orchestration** | LangGraph | Stateful multi-step workflows (analyze → label → score → deduplicate). Better than raw LangChain chains for branching logic. |
| **Background tasks** | Celery + Redis | AI calls, email sending, calendar sync, webhook delivery — all async. |
| **Search** | Django full-text search (PostgreSQL) | `SearchVector` + `SearchRank` built into Django. No Elasticsearch needed at this scale. |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Response time** | API < 200ms p95 for CRUD, < 2s for AI suggestions |
| **WebSocket latency** | Board updates delivered < 100ms to connected clients |
| **File upload** | Support up to 25MB per file, 10 files per card |
| **Concurrent users** | Support 50 concurrent WebSocket connections per board |
| **AI rate limit** | 20 requests/user/hour, configurable per workspace |
| **Uptime** | 99.5% for self-hosted, monitored via health checks |
