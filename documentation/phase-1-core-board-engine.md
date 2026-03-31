# Phase 1 — Core Board Engine

> **Priority:** P0 (Critical — nothing works without this)
> **Depends on:** Auth system (✅ already built)
> **Source of truth:** [product-plan.md](./product-plan.md) §1.1, §1.2, §4, §6

---

## Goal

Users can create workspaces, boards, lists, and cards. Cards can be dragged between lists. Basic RBAC controls who can do what.

---

## Backend Tasks

### 1.1 Workspace App (`server/apps/workspaces/`)

**Models:**

```
Workspace
├── id: UUID (pk)
├── name: CharField(150)
├── slug: SlugField(unique)
├── description: TextField(blank)
├── created_by: FK → User
├── created_at, updated_at: DateTimeField

WorkspaceMembership
├── id: UUID (pk)
├── workspace: FK → Workspace
├── user: FK → User
├── role: CharField (owner / admin / member)
├── joined_at: DateTimeField
├── unique_together: (workspace, user)
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/workspaces/` | Create workspace (creator becomes Owner) | Authenticated |
| GET | `/api/workspaces/` | List user's workspaces | Authenticated |
| GET | `/api/workspaces/:slug/` | Workspace detail | Workspace member |
| PATCH | `/api/workspaces/:slug/` | Update workspace | Owner, Admin |
| DELETE | `/api/workspaces/:slug/` | Delete workspace | Owner only |
| GET | `/api/workspaces/:slug/members/` | List members | Workspace member |
| POST | `/api/workspaces/:slug/members/` | Add member (direct add) | Owner, Admin |
| PATCH | `/api/workspaces/:slug/members/:id/` | Change role | Owner, Admin |
| DELETE | `/api/workspaces/:slug/members/:id/` | Remove member | Owner, Admin |

**Permissions (DRF):**
- `IsWorkspaceMember` — user has any membership
- `IsWorkspaceAdmin` — user role is owner or admin
- `IsWorkspaceOwner` — user role is owner

### 1.2 Board App (`server/apps/boards/`)

**Models:**

```
Board
├── id: UUID (pk)
├── workspace: FK → Workspace
├── title: CharField(200)
├── background_color: CharField(7, default="#e0e5ec")
├── visibility: CharField (workspace / private)
├── is_starred: BooleanField(default=False)  ← per-user via M2M
├── created_by: FK → User
├── created_at, updated_at: DateTimeField

StarredBoard (M2M through)
├── user: FK → User
├── board: FK → Board

Label
├── id: UUID (pk)
├── board: FK → Board
├── name: CharField(50)
├── color: CharField(7)
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/workspaces/:slug/boards/` | Create board | Workspace member |
| GET | `/api/workspaces/:slug/boards/` | List boards in workspace | Workspace member (filtered by visibility) |
| GET | `/api/boards/:id/` | Board detail (with lists + cards) | Board member / workspace member |
| PATCH | `/api/boards/:id/` | Update board | Board creator, Admin, Owner |
| DELETE | `/api/boards/:id/` | Delete board | Board creator, Admin, Owner |
| POST | `/api/boards/:id/star/` | Star/unstar board | Workspace member |
| CRUD | `/api/boards/:id/labels/` | Manage labels | Admin, Owner |

### 1.3 Lists & Cards (`server/apps/boards/` — same app)

**Models:**

```
List
├── id: UUID (pk)
├── board: FK → Board
├── title: CharField(200)
├── position: FloatField  ← fractional indexing
├── created_at: DateTimeField

Card
├── id: UUID (pk)
├── list: FK → List
├── title: CharField(500)
├── description: TextField(blank)
├── position: FloatField  ← fractional indexing
├── due_date: DateTimeField(null)
├── start_date: DateTimeField(null)
├── is_completed: BooleanField(default=False)
├── created_by: FK → User
├── created_at, updated_at: DateTimeField

CardLabel (M2M through)
├── card: FK → Card
├── label: FK → Label

CardMember (M2M through)
├── card: FK → Card
├── user: FK → User
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/boards/:id/lists/` | Create list | Board access |
| PATCH | `/api/lists/:id/` | Update list (title, position) | Board access |
| DELETE | `/api/lists/:id/` | Delete list + all cards | Admin, Owner, Creator |
| POST | `/api/lists/:id/cards/` | Create card | Board access |
| GET | `/api/boards/:id/cards/` | All cards for board (bulk) | Board access |
| PATCH | `/api/cards/:id/` | Update card (title, desc, position, list, due_date) | Board access |
| DELETE | `/api/cards/:id/` | Delete card | Admin, Owner, Creator |
| POST | `/api/cards/:id/members/` | Assign member | Board access |
| DELETE | `/api/cards/:id/members/:user_id/` | Unassign member | Board access |
| POST | `/api/cards/:id/labels/` | Add label | Board access |
| DELETE | `/api/cards/:id/labels/:label_id/` | Remove label | Board access |

**Fractional Indexing:**
- New card at bottom: `position = last_card.position + 1024`
- Card moved between two cards: `position = (card_above.position + card_below.position) / 2`
- Rebalance when gap < 0.001 (batch update all positions in that list)

---

## Frontend Tasks

### 1.4 Types (`src/types/`)

```typescript
// workspace.ts
interface Workspace { id: string; name: string; slug: string; description: string; role: Role }
type Role = "owner" | "admin" | "member"
interface WorkspaceMember { id: string; user: User; role: Role; joined_at: string }

// board.ts
interface Board { id: string; title: string; background_color: string; visibility: "workspace" | "private"; is_starred: boolean; workspace: string }
interface Label { id: string; name: string; color: string; board: string }
interface List { id: string; title: string; position: number; board: string; cards: Card[] }
interface Card { id: string; title: string; description: string; position: number; list: string; due_date: string | null; start_date: string | null; is_completed: boolean; labels: Label[]; members: User[]; created_by: User }
```

### 1.5 Workspace Pages

| Page | Route | Description |
|---|---|---|
| Workspace List | `/` | Show all user's workspaces. "Create Workspace" button. |
| Workspace Detail | `/w/:slug` | Board grid for that workspace. Sidebar with members. |
| Workspace Settings | `/w/:slug/settings` | Name, description, member management, roles. |

### 1.6 Board Page (`/w/:slug/b/:boardId`)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Header: Board title (editable) | Filters | Star │
├──────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │  To Do  │ │In Prog  │ │  Done   │ │  + Add  ││
│ ├─────────┤ ├─────────┤ ├─────────┤ │  List   ││
│ │ Card 1  │ │ Card 3  │ │ Card 5  │ └─────────┘│
│ │ Card 2  │ │ Card 4  │ │         │            │
│ │ + Add   │ │ + Add   │ │ + Add   │            │
│ └─────────┘ └─────────┘ └─────────┘            │
└──────────────────────────────────────────────────┘
```

**DnD Implementation (`@dnd-kit/core`):**
- `DndContext` wraps the board
- Each `List` is a `SortableContext` (vertical)
- Each `Card` is a `useSortable` item
- `onDragEnd`: PATCH card with new `list` + `position`, optimistic update via React Query `setQueryData`

### 1.7 Card Detail Modal

Opens as an overlay when clicking a card. Contains:
- Title (inline editable)
- Description (markdown editor, save on blur)
- Labels (pill chips, click to add/remove)
- Members (avatar list, dropdown to assign)
- Due date picker
- Sidebar actions: Move, Copy, Delete

### 1.8 React Query Hooks (`src/hooks/`)

```
use-workspaces.ts  → useWorkspaces(), useCreateWorkspace(), useUpdateWorkspace()
use-boards.ts      → useBoards(slug), useBoard(id), useCreateBoard(), useStarBoard()
use-lists.ts       → useLists(boardId), useCreateList(), useUpdateList(), useDeleteList()
use-cards.ts       → useCards(boardId), useCreateCard(), useUpdateCard(), useMoveCard(), useDeleteCard()
use-labels.ts      → useLabels(boardId), useCreateLabel(), useDeleteLabel()
```

---

## Acceptance Criteria

- [ ] User can create a workspace, becoming Owner
- [ ] Owner/Admin can invite members by adding directly
- [ ] Boards show only to members with proper visibility
- [ ] Lists can be created, renamed, reordered, deleted
- [ ] Cards can be created, edited, dragged between lists
- [ ] Card detail modal shows title, description, labels, members, due date
- [ ] Labels can be created per board, assigned to cards
- [ ] Members can be assigned/unassigned from cards
- [ ] RBAC enforced: Members can't delete others' boards/cards, can't manage workspace settings
- [ ] Fractional indexing avoids full reindex on every drag

---

## New Dependencies

**Backend:**
- None (DRF already installed)

**Frontend:**
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (drag-and-drop)
