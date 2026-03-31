# Phase 6 — Templates, Analytics & Search

> **Priority:** P3 (Low — polish & power-user features)
> **Depends on:** Phase 1 (Boards, Cards, Labels), Phase 3 (Time Tracking)
> **Source of truth:** [product-plan.md](./product-plan.md) §1.5–1.7

---

## Goal

Provide board templates for quick setup, a dashboard with actionable analytics, and full-text search across all workspace content.

---

## Backend Tasks

### 6.1 Board Templates

**Models:**
```
BoardTemplate
├── id: UUIDField (pk)
├── title: CharField
├── description: TextField
├── thumbnail: ImageField (nullable)
├── category: CharField [project_management, software, marketing, hr, education, custom]
├── is_system: BooleanField — shipped templates (non-deletable)
├── created_by: FK → User (nullable for system)
├── workspace: FK → Workspace (nullable for system)
├── data: JSONField — full board snapshot
├── use_count: IntegerField
├── created_at / updated_at
```

**Template `data` JSONField Schema:**
```json
{
  "lists": [
    {
      "title": "Backlog",
      "position": 1,
      "cards": [
        {
          "title": "Example task",
          "description": "...",
          "labels": [{"name": "Bug", "color": "#ef4444"}],
          "checklist": [
            {"title": "QA Checklist", "items": ["Unit tests", "E2E tests"]}
          ]
        }
      ]
    }
  ],
  "labels": [
    {"name": "Bug", "color": "#ef4444"},
    {"name": "Feature", "color": "#22c55e"}
  ]
}
```

**System Templates (seeded via migration/management command):**

| Template | Lists | Description |
|---|---|---|
| Kanban Basic | Backlog, To Do, In Progress, Review, Done | General-purpose workflow |
| Sprint Board | Sprint Backlog, Current Sprint, In Progress, Testing, Done | Scrum sprint planning |
| Bug Tracker | Reported, Triaging, In Progress, Fixed, Verified | Issue tracking |
| Content Calendar | Ideas, Drafting, Editing, Scheduled, Published | Content marketing |
| Hiring Pipeline | Applied, Phone Screen, Interview, Offer, Hired, Rejected | Recruitment workflow |
| Project Kickoff | Planning, Design, Development, QA, Launch | Waterfall project phases |

**Template Operations:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/templates/` | List all templates (system + workspace custom) |
| GET | `/api/templates/:id/` | Template detail with full JSON |
| POST | `/api/templates/` | Create custom template from scratch |
| POST | `/api/boards/:id/save-as-template/` | Save existing board as template |
| POST | `/api/templates/:id/use/` | Create new board from template |
| DELETE | `/api/templates/:id/` | Delete custom template (not system) |

**`use` action logic:**
1. Create Board with template title (user can rename)
2. Create Labels from `data.labels`
3. Create Lists from `data.lists` with positions
4. Create Cards with descriptions, labels, checklists
5. Increment `use_count`

### 6.2 Dashboard Analytics

**Endpoint:** `GET /api/workspaces/:slug/analytics/`

**Query Params:**
- `period`: `7d`, `30d`, `90d` (default `30d`)
- `board_id`: optional filter to single board

**Response Sections:**

#### Velocity Chart (cards completed per day/week)
```json
{
  "velocity": {
    "labels": ["Jan 1", "Jan 8", "Jan 15", "Jan 22"],
    "datasets": [
      {"label": "Completed", "data": [12, 18, 15, 22]},
      {"label": "Created", "data": [20, 14, 19, 16]}
    ]
  }
}
```

#### Burndown Chart (remaining cards over time)
```json
{
  "burndown": {
    "labels": ["Day 1", "Day 2", "..."],
    "ideal": [100, 93, 86, "..."],
    "actual": [100, 95, 90, "..."]
  }
}
```

#### Workload Distribution (cards per member)
```json
{
  "workload": [
    {"user": "alice@example.com", "assigned": 12, "completed": 8, "overdue": 1},
    {"user": "bob@example.com", "assigned": 9, "completed": 7, "overdue": 0}
  ]
}
```

#### Label Distribution
```json
{
  "label_distribution": [
    {"label": "Bug", "color": "#ef4444", "count": 23},
    {"label": "Feature", "color": "#22c55e", "count": 41}
  ]
}
```

#### Time Tracking Summary (requires Phase 3)
```json
{
  "time_summary": {
    "total_hours": 142.5,
    "estimated_hours": 180,
    "top_cards": [
      {"title": "Auth system", "hours": 18.2},
      {"title": "Dashboard UI", "hours": 12.7}
    ]
  }
}
```

**Implementation Notes:**
- Use Django ORM aggregation (`annotate`, `Count`, `Sum`, `TruncWeek`)
- Cache results with 15-minute TTL (Redis cache backend)
- For burndown: query daily snapshots or compute from Activity log timestamps

### 6.3 Global Search

**PostgreSQL Full-Text Search Setup:**

**SearchIndex Approach:**
```python
# On Card model — add SearchVectorField
from django.contrib.postgres.search import SearchVectorField, SearchVector, SearchRank, SearchQuery

class Card(models.Model):
    # ... existing fields ...
    search_vector = SearchVectorField(null=True)

    class Meta:
        indexes = [
            GinIndex(fields=["search_vector"])
        ]
```

**Trigger for Index Updates:**
- Django signal on Card `post_save` → update `search_vector`
- Concatenate: `title` (weight A) + `description` (weight B)
- Or use PostgreSQL trigger for better performance

**Searchable Entities:**
- Cards (title + description)
- Comments (content)
- Boards (title)
- Checklists (item text)

**API Endpoint:**

`GET /api/workspaces/:slug/search/?q=landing+page&type=card&board=uuid`

**Query Params:**
- `q` (required): search query
- `type`: `card`, `comment`, `board`, `all` (default `all`)
- `board_id`: filter to single board
- `page` / `page_size`: pagination

**Response:**
```json
{
  "results": [
    {
      "type": "card",
      "id": "uuid",
      "title": "Design landing page",
      "highlight": "...conversion-optimized <mark>landing page</mark>...",
      "board": {"id": "uuid", "title": "Marketing"},
      "list": {"id": "uuid", "title": "In Progress"},
      "rank": 0.85
    }
  ],
  "total": 12,
  "facets": {
    "boards": [{"id": "uuid", "title": "Marketing", "count": 8}],
    "types": [{"type": "card", "count": 10}, {"type": "comment", "count": 2}]
  }
}
```

**Permissions:** Results filtered to cards/boards the requesting user has access to.

### 6.4 Saved Filters

**Model:**
```
SavedFilter
├── id: UUIDField (pk)
├── user: FK → User
├── board: FK → Board (nullable — workspace-level filters)
├── name: CharField
├── filters: JSONField
├── is_default: BooleanField
├── created_at / updated_at
```

**`filters` JSONField Schema:**
```json
{
  "labels": ["uuid1", "uuid2"],
  "members": ["uuid1"],
  "due": "overdue",               // overdue | today | this_week | no_date
  "priority": ["P0", "P1"],
  "search": "keyword"
}
```

**API:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/boards/:id/filters/` | List saved filters for board |
| POST | `/api/boards/:id/filters/` | Create saved filter |
| PATCH | `/api/boards/:id/filters/:fid/` | Update filter |
| DELETE | `/api/boards/:id/filters/:fid/` | Delete filter |

---

## Frontend Tasks

### 6.5 Template Gallery Page

**Route:** `/workspaces/:slug/templates`

**Components:**
- `TemplateGallery` — grid of template cards grouped by category
  - Each card: thumbnail, title, description, "Use Template" button
  - Category filter tabs
- `TemplatePreview` — modal showing full list/card structure preview
- `SaveAsTemplateDialog` — form (title, description, category) triggered from board menu
- "Create Board" flow updated: step 1 = choose template or blank

### 6.6 Analytics Dashboard Page

**Route:** `/workspaces/:slug/analytics`

**Components:**
- `AnalyticsDashboard` — page layout with period selector (7d/30d/90d) and board filter
- `VelocityChart` — line/bar chart (created vs completed over time)
- `BurndownChart` — line chart with ideal vs actual lines
- `WorkloadTable` — sortable table with member, assigned, completed, overdue columns
- `LabelPieChart` — donut chart showing label distribution
- `TimeSummaryCard` — total hours vs estimated, top cards by time

**Charting Library:** `recharts` (lightweight, React-native, composable)

### 6.7 Global Search UI

**Components:**
- `SearchCommand` — command palette triggered by `Cmd/Ctrl + K`
  - Input with debounced search (300ms)
  - Result groups: Cards, Comments, Boards
  - Each result: icon, title, highlighted snippet, board/list breadcrumb
  - Keyboard navigation (arrow keys + Enter)
- `SearchFilters` — type filter pills, board filter dropdown
- Recent searches stored in Zustand (last 5)

### 6.8 Saved Filters Bar

**Location:** Board page, below header

**Components:**
- `FilterBar` — horizontal row of filter pills (labels, members, due date, priority)
- `SavedFilterDropdown` — select from saved filters, "Save current filter" option
- Active filters reflected in URL query params for shareable links

### 6.9 React Query Hooks

```
use-templates.ts     → useTemplates(), useTemplate(id), useCreateFromTemplate(), useSaveAsTemplate()
use-analytics.ts     → useAnalytics(slug, period, boardId)
use-search.ts        → useSearch(slug, query, type), useRecentSearches()
use-saved-filters.ts → useSavedFilters(boardId), useCreateFilter(), useDeleteFilter()
```

---

## Acceptance Criteria

### Templates
- [ ] User can browse system templates by category
- [ ] User can create a board from any template
- [ ] User can save an existing board as a custom template
- [ ] Custom templates scoped to workspace
- [ ] System templates seeded on first deployment

### Analytics
- [ ] Velocity chart shows cards created vs completed over time
- [ ] Burndown chart with ideal vs actual lines
- [ ] Workload table shows per-member statistics
- [ ] Label distribution visualized as donut chart
- [ ] Time tracking summary shown (if Phase 3 data exists)
- [ ] Period selector (7d/30d/90d) filters all charts
- [ ] Board filter narrows analytics to single board

### Search
- [ ] `Cmd/Ctrl + K` opens search palette
- [ ] Results appear within 300ms of typing
- [ ] Search highlights matching terms
- [ ] Results respect workspace permissions
- [ ] Faceted results grouped by type
- [ ] Clicking result navigates to card/board

### Saved Filters
- [ ] User can save current filter combination
- [ ] Saved filters appear in dropdown
- [ ] Filter state reflected in URL (shareable)

---

## New Dependencies

**Backend:**
- `Pillow` (template thumbnails — if using ImageField)
- `django-redis` (cache backend for analytics — may already be present for Channels)

**Frontend:**
- `recharts` (charting library)
- `cmdk` (command palette UI — or build with shadcn/ui Dialog)

**Infrastructure:**
- None new (PostgreSQL full-text search is built-in)
