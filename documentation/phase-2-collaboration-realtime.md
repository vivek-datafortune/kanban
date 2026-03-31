# Phase 2 — Collaboration & Real-Time

> **Priority:** P1 (High — multi-user experience)
> **Depends on:** Phase 1 (Core Board Engine)
> **Source of truth:** [product-plan.md](./product-plan.md) §1.2 (RBAC, Invitations), §1.3 (Real-Time), §1.8 (Notifications)

---

## Goal

Multiple users can collaborate on the same board with live updates. Workspace owners can invite members via email. Cards support comments, checklists, and activity history.

---

## Backend Tasks

### 2.1 Invitation System (`server/apps/workspaces/`)

**Model:**

```
WorkspaceInvitation
├── id: UUID (pk)
├── workspace: FK → Workspace
├── email: EmailField
├── role: CharField (admin / member)
├── invited_by: FK → User
├── token: CharField(unique)  ← URL-safe signed token
├── status: CharField (pending / accepted / expired / revoked)
├── created_at: DateTimeField
├── expires_at: DateTimeField  ← created_at + 7 days
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/workspaces/:slug/invitations/` | Send invitation(s) — accepts `[{email, role}]` | Owner, Admin |
| GET | `/api/workspaces/:slug/invitations/` | List pending invitations | Owner, Admin |
| POST | `/api/workspaces/:slug/invitations/:id/resend/` | Resend invitation email | Owner, Admin |
| DELETE | `/api/workspaces/:slug/invitations/:id/` | Revoke invitation | Owner, Admin |
| POST | `/api/invitations/accept/` | Accept invitation `{token}` | Authenticated |

**Flow:**
1. POST creates invitation, generates signed token, sends email via `django-anymail`
2. Email contains link: `{FRONTEND_URL}/invite/{token}`
3. Frontend invite page: if logged in → POST accept → redirect to workspace. If not → redirect to login with `?next=/invite/{token}`
4. Accept endpoint: validates token, checks expiry, creates `WorkspaceMembership`, marks invitation as accepted
5. Rate limit: 20 invitations/hour/workspace (DRF throttle)

### 2.2 Comments (`server/apps/boards/`)

**Model:**

```
Comment
├── id: UUID (pk)
├── card: FK → Card
├── author: FK → User
├── body: TextField
├── created_at, updated_at: DateTimeField
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/cards/:id/comments/` | List comments (paginated, newest first) | Board access |
| POST | `/api/cards/:id/comments/` | Add comment | Board access |
| PATCH | `/api/comments/:id/` | Edit comment | Author only |
| DELETE | `/api/comments/:id/` | Delete comment | Author, Admin, Owner |

**@Mentions:**
- Parse `@user-email` patterns in comment body
- On save, extract mentioned users → create notifications
- Frontend renders mentions as highlighted links

### 2.3 Checklists (`server/apps/boards/`)

**Models:**

```
Checklist
├── id: UUID (pk)
├── card: FK → Card
├── title: CharField(200)
├── position: FloatField
├── created_at: DateTimeField

ChecklistItem
├── id: UUID (pk)
├── checklist: FK → Checklist
├── title: CharField(500)
├── is_checked: BooleanField(default=False)
├── position: FloatField
├── assigned_to: FK → User (null)
```

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| CRUD | `/api/cards/:id/checklists/` | Manage checklists on a card |
| CRUD | `/api/checklists/:id/items/` | Manage items within a checklist |
| PATCH | `/api/checklist-items/:id/toggle/` | Quick toggle checked state |

### 2.4 Activity Log (`server/apps/boards/`)

**Model:**

```
Activity
├── id: UUID (pk)
├── card: FK → Card (null for board-level)
├── board: FK → Board
├── actor: FK → User
├── action: CharField  ← e.g., "card.moved", "comment.added", "member.assigned"
├── details: JSONField  ← e.g., {"from_list": "To Do", "to_list": "Done"}
├── created_at: DateTimeField
```

**Implementation:**
- Django signals or explicit calls in serializer `.save()` methods
- Activity created on: card create/move/update/delete, comment add, member assign/unassign, checklist item toggle, label add/remove
- GET `/api/boards/:id/activity/` — paginated, filterable by card
- GET `/api/cards/:id/activity/` — card-specific activity

### 2.5 WebSocket / Real-Time (`server/apps/realtime/`)

**Dependencies:** `channels`, `channels-redis`, `daphne`

**Consumer:**

```python
# BoardConsumer (JsonWebsocketConsumer)
# Group: "board_{board_id}"
# Events: card.created, card.updated, card.moved, card.deleted,
#          list.created, list.updated, list.deleted,
#          comment.added, member.joined, checklist.toggled
```

**Message Format:**

```json
{
  "type": "card.moved",
  "payload": {
    "card_id": "uuid",
    "from_list": "uuid",
    "to_list": "uuid",
    "position": 2048.0,
    "actor": {"id": "uuid", "email": "user@example.com"}
  },
  "timestamp": "2026-03-30T12:00:00Z"
}
```

**Presence:**
- On connect: add user to board group, broadcast `user.joined` with user info
- On disconnect: remove from group, broadcast `user.left`
- Frontend shows active user avatars on board header

**Integration with REST:**
- After every successful DRF write operation, send event to channel group
- Use `channel_layer.group_send()` in serializer `.save()` or signal handler
- Frontend receives via WebSocket → invalidates/updates React Query cache

### 2.6 Notifications (`server/apps/notifications/`)

**Model:**

```
Notification
├── id: UUID (pk)
├── user: FK → User (recipient)
├── type: CharField  ← assigned, mentioned, due_soon, comment_reply
├── title: CharField
├── body: TextField
├── card: FK → Card (null)
├── board: FK → Board (null)
├── workspace: FK → Workspace (null)
├── is_read: BooleanField(default=False)
├── created_at: DateTimeField
```

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications/` | List user's notifications (paginated) |
| GET | `/api/notifications/unread-count/` | Count of unread |
| PATCH | `/api/notifications/:id/read/` | Mark as read |
| POST | `/api/notifications/read-all/` | Mark all as read |

**Triggers:**
- Card assigned to user → notification
- @mentioned in comment → notification
- Reply to user's comment → notification
- Card due in 24 hours → notification (Celery periodic task)

---

## Frontend Tasks

### 2.7 Invitation UI

| Component | Route | Description |
|---|---|---|
| Invite Modal | (workspace settings) | Email input + role select. Support multiple emails. |
| Pending List | `/w/:slug/settings` | Table of pending invitations with resend/revoke. |
| Accept Page | `/invite/:token` | Accept invitation → auto-redirect to workspace. |

### 2.8 Comment Section (Card Detail Modal)

- Comment list below card description
- Text input with submit button
- @mention autocomplete (dropdown of workspace members)
- Edit/delete own comments (inline)
- Timestamps with relative time ("2 hours ago")

### 2.9 Checklist UI (Card Detail Modal)

- "Add Checklist" button → title input
- Each checklist: title + progress bar (e.g., "3/5")
- Checklist items: checkbox + text. Click to toggle. Inline edit.
- Drag to reorder items
- Delete checklist with confirmation

### 2.10 Activity Feed (Card Detail Modal sidebar)

- Chronological list of actions with avatar, description, timestamp
- "Card moved from To Do to In Progress by user@example.com"
- Load more (paginated)

### 2.11 WebSocket Integration

```typescript
// src/hooks/use-board-socket.ts
// Connect to ws://host/ws/board/{boardId}/
// On message: match event type → update React Query cache
// - card.moved → update card's list + position in query data
// - comment.added → invalidate comments query
// - list.created → append to lists query data
```

### 2.12 Notification Bell

- Bell icon in app header (all pages)
- Badge with unread count
- Dropdown panel: recent notifications, click to navigate to card
- "Mark all as read" button

### 2.13 React Query Hooks

```
use-invitations.ts    → useInvitations(slug), useSendInvitation(), useRevokeInvitation(), useAcceptInvitation()
use-comments.ts       → useComments(cardId), useAddComment(), useEditComment(), useDeleteComment()
use-checklists.ts     → useChecklists(cardId), useCreateChecklist(), useToggleItem()
use-activity.ts       → useActivity(cardId)
use-notifications.ts  → useNotifications(), useUnreadCount(), useMarkRead(), useMarkAllRead()
use-board-socket.ts   → useBoardSocket(boardId)
```

---

## Acceptance Criteria

- [ ] Owner/Admin can send email invitations with role assignment
- [ ] Invitees can accept via signed link (new or existing users)
- [ ] Pending invitations can be resent or revoked
- [ ] Workspace settings page (`/w/:slug/settings`) with member + invitation management
- [ ] Card member assignment UI in card detail modal (deferred from Phase 1)
- [ ] Comments can be added, edited, deleted on cards
- [ ] @mentions in comments trigger notifications
- [ ] Checklists with toggleable items and progress bar work on cards
- [ ] Activity log records all card changes with actor and timestamp
- [ ] WebSocket delivers real-time updates to all users on the same board
- [ ] Presence indicators show who's viewing a board
- [ ] Notification bell shows unread count and notification list
- [ ] Moving a card on one browser instantly reflects on another

---

## New Dependencies

**Backend:**
- `channels` + `channels-redis` + `daphne` (WebSocket support)
- `django-anymail` (email sending for invitations — can reuse for Phase 5)
- `redis` (Docker service — already available as Celery broker)

**Frontend:**
- None (existing stack covers all needs)

**Infrastructure:**
- Redis service in `docker-compose.yml` (add if not present)
- Update Django `ASGI_APPLICATION` and `CHANNEL_LAYERS` settings
