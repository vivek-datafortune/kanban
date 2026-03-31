# Phase 5 — Integrations

> **Priority:** P2 (Medium — high user value, depends on earlier phases)
> **Depends on:** Phase 2 (WebSockets, Celery, Notifications), Phase 3 (Attachments)
> **Source of truth:** [product-plan.md](./product-plan.md) §2 (App Integrations)

---

## Goal

Connect boards to external services — sync card due dates with Google Calendar, send/receive emails for card comments, and expose outbound webhooks for third-party automation.

---

## Backend Tasks

### 5.1 Google Calendar Integration

**Django App:** `server/apps/integrations/google_calendar/`

**OAuth2 Setup:**
- Scopes: `https://www.googleapis.com/auth/calendar.events`
- Consent screen shared with existing Google OAuth login
- Store refresh token per user in `GoogleCalendarConnection` model

**Model:**
```
GoogleCalendarConnection
├── user: FK → User (unique)
├── access_token: TextField (encrypted)
├── refresh_token: TextField (encrypted)
├── token_expiry: DateTimeField
├── calendar_id: CharField (default "primary")
├── is_active: BooleanField
├── created_at / updated_at
```

```
CalendarSync
├── card: FK → Card
├── connection: FK → GoogleCalendarConnection
├── google_event_id: CharField
├── last_synced_at: DateTimeField
├── sync_status: CharField [synced, error, pending]
```

**Two-Way Sync Logic (Celery Tasks):**

| Trigger | Direction | Action |
|---|---|---|
| Card due date set/changed | Trello → Calendar | Create/update Google Calendar event |
| Card due date removed | Trello → Calendar | Delete Google Calendar event |
| Card title changed | Trello → Calendar | Update event title |
| Google event time changed | Calendar → Trello | Update card due date |
| Google event deleted | Calendar → Trello | Clear card due date |

**Polling Strategy:**
- Celery beat task: every 5 minutes per connected user
- Use `syncToken` (Google Calendar incremental sync) to fetch only changes
- If `syncToken` expires → full re-sync

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/integrations/google-calendar/connect/` | Initiate OAuth consent |
| GET | `/api/integrations/google-calendar/callback/` | OAuth callback, store tokens |
| DELETE | `/api/integrations/google-calendar/disconnect/` | Revoke access, delete tokens |
| GET | `/api/integrations/google-calendar/status/` | Connection status + last sync |
| POST | `/api/cards/:id/sync-calendar/` | Manually trigger sync for a card |

### 5.2 Email Integration

**Inbound Email (Reply-to-Comment):**

**Architecture:**
1. Board gets a unique reply address: `board-{short_id}+{card_short_id}@reply.trello-app.com`
2. Email provider (SendGrid/Mailgun) receives reply → POST webhook → Django
3. Parse sender email → find user → create Comment on card

**Model:**
```
InboundEmailConfig
├── board: OneToOne → Board
├── reply_domain: CharField
├── is_active: BooleanField
```

**Webhook Endpoint:** `POST /api/integrations/email/inbound/`
- Verify HMAC signature from SendGrid/Mailgun
- Parse `To` address → extract board + card IDs
- Match `From` → authenticate sender (must be workspace member)
- Strip email signature → create Comment
- Return 200 (provider expects fast response)

**Outbound Email Notifications:**
- Use `django-anymail` with SendGrid/Mailgun backend
- Triggered by Notification model signals (Phase 2)

| Event | Email Template |
|---|---|
| Assigned to card | `assigned.html` |
| Mentioned in comment | `mentioned.html` |
| Due date approaching (24h) | `due_soon.html` |
| Invitation to workspace | `invitation.html` (already in Phase 2) |
| Weekly digest | `digest.html` |

**User Preferences Model:**
```
EmailPreference
├── user: OneToOne → User
├── notify_assigned: BooleanField (default True)
├── notify_mentioned: BooleanField (default True)
├── notify_due_soon: BooleanField (default True)
├── weekly_digest: BooleanField (default True)
```

**Celery Tasks:**
- `send_notification_email.delay(notification_id)` — triggered by Notification post_save signal
- `send_weekly_digest.delay()` — Celery beat, every Monday 9am UTC

### 5.3 Outbound Webhooks

**Purpose:** Allow workspace admins to receive HTTP notifications when events occur.

**Model:**
```
Webhook
├── workspace: FK → Workspace
├── url: URLField
├── secret: CharField (auto-generated, used for HMAC)
├── events: ArrayField(CharField) — e.g. ["card.created", "card.moved", "comment.created"]
├── is_active: BooleanField
├── created_by: FK → User
├── created_at / updated_at
```

```
WebhookDelivery
├── webhook: FK → Webhook
├── event: CharField
├── payload: JSONField
├── response_status: IntegerField (nullable)
├── response_body: TextField (nullable, truncated to 1KB)
├── delivered_at: DateTimeField
├── status: CharField [pending, success, failed]
├── attempts: IntegerField
```

**Supported Events:**
```
card.created, card.updated, card.moved, card.archived, card.deleted
comment.created
member.added, member.removed
list.created, list.archived
board.updated
```

**Payload Format:**
```json
{
  "event": "card.moved",
  "timestamp": "2025-01-15T10:30:00Z",
  "workspace": {"id": "uuid", "slug": "my-team"},
  "data": {
    "card": {"id": "uuid", "title": "..."},
    "from_list": {"id": "uuid", "title": "To Do"},
    "to_list": {"id": "uuid", "title": "In Progress"},
    "actor": {"id": "uuid", "email": "..."}
  }
}
```

**HMAC Signature:**
```python
signature = hmac.new(webhook.secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
# Sent as X-Webhook-Signature header
```

**Retry Strategy (Celery Task):**
- Max 5 attempts with exponential backoff: 10s, 60s, 300s, 1800s, 7200s
- Auto-disable webhook after 50 consecutive failures (set `is_active = False`)
- Send email alert to webhook creator on disable

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workspaces/:slug/webhooks/` | List webhooks (Admin+) |
| POST | `/api/workspaces/:slug/webhooks/` | Create webhook |
| PATCH | `/api/workspaces/:slug/webhooks/:id/` | Update webhook URL/events |
| DELETE | `/api/workspaces/:slug/webhooks/:id/` | Delete webhook |
| GET | `/api/workspaces/:slug/webhooks/:id/deliveries/` | Delivery log (last 100) |
| POST | `/api/workspaces/:slug/webhooks/:id/test/` | Send test event |

---

## Frontend Tasks

### 5.4 Google Calendar Settings UI

**Location:** Board Settings → Integrations tab

**Components:**
- `GoogleCalendarConnect` — "Connect Google Calendar" button, shows connected status
- `CalendarSyncSettings` — calendar picker (dropdown), sync toggle per board
- Cards with due dates show a small calendar icon (🗓) linking to Google Calendar event

### 5.5 Email Preferences Page

**Location:** User Settings → Notifications

**Components:**
- `EmailPreferencesForm` — toggle switches for each notification type
- `InboundEmailInfo` — display reply-to address for each board (read-only)

### 5.6 Webhook Management UI

**Location:** Workspace Settings → Webhooks

**Components:**
- `WebhookList` — table with URL, events, status, last delivery
- `WebhookForm` — URL input, event multi-select checkboxes, test button
- `WebhookDeliveryLog` — expandable rows showing payload, response, status

### 5.7 React Query Hooks

```
use-google-calendar.ts  → useCalendarStatus(), useConnectCalendar(), useDisconnectCalendar()
use-email-preferences.ts → useEmailPreferences(), useUpdateEmailPreferences()
use-webhooks.ts          → useWebhooks(slug), useCreateWebhook(), useDeleteWebhook(), useWebhookDeliveries(id)
```

---

## Acceptance Criteria

- [ ] User can connect Google Calendar and see sync status
- [ ] Card due dates sync to Google Calendar events (bidirectional)
- [ ] Replying to email creates a comment on the card
- [ ] Users can configure email notification preferences
- [ ] Weekly digest email sent on schedule
- [ ] Workspace admin can create webhooks with event filtering
- [ ] Webhook payloads include HMAC signature
- [ ] Failed webhooks retry with exponential backoff
- [ ] Webhook auto-disabled after 50 consecutive failures
- [ ] Test webhook sends a sample event and shows response

---

## New Dependencies

**Backend:**
- `google-api-python-client` + `google-auth-oauthlib` (Calendar API v3)
- `django-anymail[sendgrid]` (or `[mailgun]`) — outbound email
- `cryptography` (encrypt stored OAuth tokens at rest)

**Frontend:**
- None

**Infrastructure:**
- SendGrid or Mailgun account (inbound parse + outbound delivery)
