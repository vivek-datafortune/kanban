# Phase 1 — Core Board Engine

> **Priority:** P0 (Critical — nothing works without this)
> **Depends on:** Auth system (✅ already built)
> **Status:** ✅ Backend complete · ⚠️ Frontend partially complete

---

## Goal

Users can create workspaces, boards, lists, and cards. Cards can be dragged between lists. Basic RBAC controls who can do what.

---

## Backend (Implemented ✅)

### 1.1 Workspace App (`server/apps/workspaces/`)

**Models:**

```
Workspace
├── id: UUIDField (pk, default=uuid4)
├── name: CharField(max_length=150)
├── slug: SlugField(unique, max_length=160)  ← auto-generated from name on save
├── description: TextField(blank=True, default="")
├── created_by: FK → User (CASCADE)
├── created_at: DateTimeField(auto_now_add)
├── updated_at: DateTimeField(auto_now)

WorkspaceMembership
├── id: UUIDField (pk, default=uuid4)
├── workspace: FK → Workspace (CASCADE)
├── user: FK → User (CASCADE)
├── role: CharField(max_length=10, choices=[owner, admin, member], default=member)
├── joined_at: DateTimeField(auto_now_add)
├── unique_together: (workspace, user)
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/workspaces/` | List user's workspaces | Authenticated |
| POST | `/api/workspaces/` | Create workspace (creator becomes Owner) | Authenticated |
| GET | `/api/workspaces/<slug>/` | Workspace detail | IsWorkspaceMember |
| PATCH/PUT | `/api/workspaces/<slug>/` | Update workspace | IsWorkspaceAdmin |
| DELETE | `/api/workspaces/<slug>/` | Delete workspace | IsWorkspaceOwner |
| GET | `/api/workspaces/<slug>/members/` | List members | IsWorkspaceMember |
| POST | `/api/workspaces/<slug>/members/` | Add member by email | IsWorkspaceAdmin |
| GET | `/api/workspaces/<slug>/members/<uuid>/` | Member detail | IsWorkspaceAdmin |
| PATCH/PUT | `/api/workspaces/<slug>/members/<uuid>/` | Change member role | IsWorkspaceAdmin |
| DELETE | `/api/workspaces/<slug>/members/<uuid>/` | Remove member | IsWorkspaceAdmin |

**Permissions (`server/apps/workspaces/permissions.py`):**
- `IsWorkspaceMember` — user has any membership in the workspace
- `IsWorkspaceAdmin` — user role is `owner` or `admin`
- `IsWorkspaceOwner` — user role is `owner`

### 1.2 Board App (`server/apps/boards/`)

**Models:**

```
Board
├── id: UUIDField (pk, default=uuid4)
├── workspace: FK → Workspace (CASCADE)
├── title: CharField(max_length=200)
├── background_color: CharField(max_length=7, default="#e0e5ec")
├── visibility: CharField(max_length=10, choices=[workspace, private], default=workspace)
├── created_by: FK → User (CASCADE)
├── created_at: DateTimeField(auto_now_add)
├── updated_at: DateTimeField(auto_now)

StarredBoard (M2M through — per-user starring)
├── id: UUIDField (pk)
├── user: FK → User
├── board: FK → Board
├── unique_together: (user, board)

Label
├── id: UUIDField (pk)
├── board: FK → Board
├── name: CharField(max_length=50)
├── color: CharField(max_length=7)
```

### 1.3 Lists & Cards (`server/apps/boards/` — same app)

**Models:**

```
List
├── id: UUIDField (pk)
├── board: FK → Board
├── title: CharField(max_length=200)
├── position: FloatField  ← fractional indexing
├── is_archived: BooleanField(default=False)
├── created_at: DateTimeField(auto_now_add)

Card
├── id: UUIDField (pk)
├── list: FK → List
├── title: CharField(max_length=500)
├── description: TextField(blank=True, default="")
├── position: FloatField  ← fractional indexing
├── due_date: DateTimeField(null, blank)
├── start_date: DateTimeField(null, blank)
├── is_completed: BooleanField(default=False)
├── labels: M2M → Label (through CardLabel)
├── members: M2M → User (through CardMember)
├── created_by: FK → User
├── created_at: DateTimeField(auto_now_add)
├── updated_at: DateTimeField(auto_now)

CardLabel (M2M through)
├── card: FK → Card
├── label: FK → Label

CardMember (M2M through)
├── card: FK → Card
├── user: FK → User
```

**API Endpoints (Boards, Lists, Cards):**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/workspaces/<slug>/boards/` | List boards in workspace | IsWorkspaceMember |
| POST | `/api/workspaces/<slug>/boards/` | Create board | IsWorkspaceMember |
| GET | `/api/boards/<uuid>/` | Board detail (nested lists + cards + labels) | Authenticated (workspace member check) |
| PATCH/PUT | `/api/boards/<uuid>/` | Update board | Authenticated (creator/admin) |
| DELETE | `/api/boards/<uuid>/` | Delete board | Authenticated (creator/admin) |
| POST | `/api/boards/<uuid>/star/` | Toggle star/unstar | Authenticated |
| GET | `/api/boards/<uuid>/labels/` | List board labels | Authenticated |
| POST | `/api/boards/<uuid>/labels/` | Create label | Authenticated |
| PATCH/PUT | `/api/boards/<uuid>/labels/<uuid>/` | Update label | Authenticated |
| DELETE | `/api/boards/<uuid>/labels/<uuid>/` | Delete label | Authenticated |
| POST | `/api/boards/<uuid>/lists/` | Create list | Authenticated |
| PATCH/PUT | `/api/lists/<uuid>/` | Update list (title, position) | Authenticated |
| DELETE | `/api/lists/<uuid>/` | Delete list + cards | Authenticated |
| POST | `/api/lists/<uuid>/cards/` | Create card | Authenticated |
| PATCH/PUT | `/api/cards/<uuid>/` | Update card (title, desc, dates, completion) | Authenticated |
| PATCH | `/api/cards/<uuid>/move/` | Move card (list + position) | Authenticated |
| POST | `/api/cards/<uuid>/labels/` | Add label to card | Authenticated |
| DELETE | `/api/cards/<uuid>/labels/<uuid>/` | Remove label from card | Authenticated |
| POST | `/api/cards/<uuid>/members/` | Assign member to card | Authenticated |
| DELETE | `/api/cards/<uuid>/members/<int>/` | Unassign member from card | Authenticated |

**Fractional Indexing:**
- New item at bottom: `position = last.position + 1024`
- Moved between two items: `position = (above.position + below.position) / 2`
- Rebalance when gap < 0.001

---

## Frontend (Implemented)

### 1.4 Types (`src/types/`)

```typescript
// auth.ts
interface User { pk: number; email: string; first_name: string; last_name: string }
interface AuthTokens { access: string; refresh: string }
interface AuthUrlResponse { authorization_url: string }
interface LoginResponse { access: string; refresh: string; user: User }

// workspace.ts
type Role = "owner" | "admin" | "member"
interface Workspace { id: string; name: string; slug: string; description: string; role: Role; member_count: number; created_at: string; updated_at: string }
interface WorkspaceMember { id: string; user: User; role: Role; joined_at: string }

// board.ts
interface Board { id: string; workspace: string; title: string; background_color: string; visibility: "workspace" | "private"; is_starred: boolean; lists?: List[]; labels?: Label[]; created_by?: User; created_at: string; updated_at: string }
interface Label { id: string; name: string; color: string; board: string }
interface List { id: string; board: string; title: string; position: number; is_archived: boolean; cards: Card[]; created_at: string }
interface Card { id: string; list: string; title: string; description: string; position: number; due_date: string | null; start_date: string | null; is_completed: boolean; labels: Label[]; members: User[]; created_by: User; created_at: string; updated_at: string }
```

### 1.5 App Layout & Routing

**Layout:** `AppLayout` — persistent sidebar + `<Outlet />`
- Sidebar: workspace nav links, "New Workspace" link, theme toggle (light/dark/system), user avatar + logout
- Theme managed via Zustand store (`light | dark | system`), applied by `useTheme()` hook

**Routes (via `App.tsx`):**

| Route | Page | Layout |
|---|---|---|
| `/login` | `LoginPage` — social OAuth (Google, Microsoft) | None |
| `/auth/callback` | `AuthCallbackPage` — token exchange | None |
| `/` | `HomePage` — workspace listing grid | `AppLayout` |
| `/create-workspace` | `CreateWorkspacePage` — form | `AppLayout` |
| `/w/:slug` | `WorkspacePage` — board listing with starred section | `AppLayout` |
| `/w/:slug/b/:boardId` | `BoardPage` — kanban board | `AppLayout` |

**Page headers:** All content pages share a consistent frosted header bar (`bg-card/80 backdrop-blur`, `border-b border-border/30`, slide-down animation `y: -10`).

### 1.6 Board Page (`/w/:slug/b/:boardId`)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Header: ← Back | Board title | Star | ⋯ Menu   │
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

**DnD Implementation (`@hello-pangea/dnd`):**
- `DragDropContext` wraps the board
- Lists are `Draggable` inside a horizontal `Droppable` (reorderable columns)
- Cards are `Draggable` inside per-list vertical `Droppable` (move between lists)
- `onDragEnd`: optimistic local state update → PATCH to server → clear local override on settle
- List drag uses portal (`createPortal`) when `isDragging` to avoid z-index issues

**Board features:**
- Inline list title editing (click to edit)
- List actions dropdown (delete with confirmation)
- Inline "Add a card" form per list
- "Add List" button at end of list row

### 1.7 Card Detail Modal

Opens as overlay when clicking a card. Contains:
- Title (inline editable, saves on blur/Enter)
- Description (textarea, save on blur)
- Labels (pill chips with toggle — add/remove from card using board labels)
- Due date picker (native date input, clearable)
- Completion toggle checkbox
- Delete card button
- ⚠️ **Not implemented:** Card move/copy actions
- Note: Member assignment UI deferred to Phase 2 (requires invitation system for multi-user workspaces)

### 1.8 React Query Hooks (`src/hooks/`)

```
use-auth.ts
├── useAuthUrl(provider)        — GET OAuth authorization URL
├── useSocialLogin()            — POST exchange code for JWT
├── useCurrentUser()            — GET /api/auth/user/
├── useLogout()                 — POST logout + clear cookies/store

use-workspaces.ts
├── useWorkspaces()             — GET all user workspaces
├── useWorkspace(slug)          — GET single workspace
├── useCreateWorkspace()        — POST create workspace
├── useUpdateWorkspace(slug)    — PATCH update workspace
├── useDeleteWorkspace(slug)    — DELETE workspace
├── useWorkspaceMembers(slug)   — GET list members
├── useAddMember(slug)          — POST add member by email
├── useRemoveMember(slug)       — DELETE remove member

use-boards.ts
├── useBoards(slug)             — GET boards in workspace
├── useBoard(id)                — GET board detail (nested lists/cards/labels)
├── useCreateBoard(slug)        — POST create board
├── useUpdateBoard()            — PATCH update board
├── useDeleteBoard()            — DELETE board
├── useStarBoard()              — POST toggle star

use-lists.ts
├── useCreateList(boardId)      — POST create list
├── useUpdateList(boardId)      — PATCH update list (title/position)
├── useDeleteList(boardId)      — DELETE list

use-cards.ts
├── useCreateCard(boardId)      — POST create card
├── useUpdateCard(boardId)      — PATCH update card
├── useMoveCard(boardId)        — PATCH move card (list + position)
├── useDeleteCard(boardId)      — DELETE card
├── useAddCardLabel(boardId)    — POST add label to card
├── useRemoveCardLabel(boardId) — DELETE remove label from card
├── useAddCardMember(boardId)   — POST assign member to card

use-labels.ts
├── useLabels(boardId)          — GET board labels

use-theme.ts
├── useTheme()                  — read/write theme from Zustand store, applies to DOM
```

### 1.9 Zustand Store (`src/store/app.store.ts`)

```typescript
interface AppState {
  theme: "light" | "dark" | "system"
  setTheme: (theme: Theme) => void
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  logout: () => void
}
// Persisted to localStorage as "app-store" (theme field only)
```

### 1.10 Components

| Component | Path | Props | Description |
|---|---|---|---|
| `AppLayout` | `components/app-layout.tsx` | — | Sidebar + Outlet |
| `ProtectedRoute` | `components/protected-route.tsx` | `children` | Redirects to `/login` if no `access` cookie |
| `BoardList` | `components/board/board-list.tsx` | `list, index, boardId, onCardClick` | Draggable column with cards |
| `BoardCard` | `components/board/board-card.tsx` | `card, index, onClick` | Draggable card preview (labels, due date, members) |
| `CardDetailModal` | `components/board/card-detail-modal.tsx` | `card, boardId, lists, labels, onClose` | Full card editor overlay |
| `BackButton` | `components/ui/back-button.tsx` | `to, label, className` | Animated back arrow with hover label reveal |
| `Button` | `components/ui/button.tsx` | `variant, size, asChild` | CVA-styled button (Radix Slot support) |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | `children, size` | Radix-free custom dropdown |

### 1.11 Animation Pattern

All list items (workspace cards, board cards, board columns) share a consistent entry animation:
```
initial={{ opacity: 0, y: 6 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, delay: 0.2 + index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
```

Hover on interactive cards uses CSS only (no `whileHover` y-lift):
```
bg-card/60 border border-transparent
hover:bg-card hover:border-border hover:shadow-sm
transition-all duration-150
```

---

## Acceptance Criteria

- [x] User can create a workspace, becoming Owner
- [x] Boards show only to members with proper visibility
- [x] Lists can be created, renamed, reordered, deleted
- [x] Cards can be created, edited, dragged between lists
- [x] Card detail modal shows title, description, labels, due date
- [x] Labels can be assigned/removed from cards
- [x] RBAC enforced on backend (member/admin/owner permissions)
- [x] Fractional indexing avoids full reindex on every drag
- [x] Star/pin boards
- [ ] Label management UI: create/edit/delete board labels (backend ready, no frontend)

**Deferred to Phase 2:**
- Card member assignment UI → requires invitation system for multi-user workspaces
- Workspace member management UI → replaced by Phase 2 invitation system
- Workspace settings page → built as part of Phase 2 invitation UI

---

## Dependencies

**Backend (`pyproject.toml`):**
- `django >= 5.1`, `djangorestframework >= 3.15`, `djangorestframework-simplejwt >= 5.3`
- `dj-rest-auth[with_social] >= 6.0`, `django-allauth[socialaccount] >= 64.0`
- `psycopg[binary] >= 3.2`, `django-cors-headers >= 4.5`, `django-environ >= 0.11`
- `gunicorn >= 23.0`, `whitenoise[brotli] >= 6.8`

**Frontend (`package.json`):**
- `@hello-pangea/dnd` (drag-and-drop — used instead of `@dnd-kit`)
- `@tanstack/react-query`, `react-router-dom`, `zustand`, `react-cookie`
- `framer-motion`, `lucide-react`
- `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `@radix-ui/react-slot`

---

## Dead Code

- `src/pages/dashboard.tsx` — unused, not routed anywhere (`home.tsx` serves `/`)
