# Phase 3 — File Attachments & Time Tracking

> **Priority:** P2 (Medium — enriches cards, not blocking core flow)
> **Depends on:** Phase 1 (Cards exist), Phase 2 (Activity log exists)
> **Source of truth:** [product-plan.md](./product-plan.md) §1.2 (File Attachments), §1.4 (Time Tracking)

---

## Goal

Cards support file attachments (images, PDFs, documents) and per-card time tracking with estimates, timers, and manual entries.

---

## Backend Tasks

### 3.1 File Storage Setup

**Infrastructure:**
- Dev: MinIO container in `docker-compose.yml` (S3-compatible)
- Prod: AWS S3 bucket
- Django: `django-storages` with `boto3` backend

**Settings (`base.py`):**
```python
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default=None)  # MinIO URL for dev
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
AWS_QUERYSTRING_AUTH = True  # Presigned URLs
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour
```

### 3.2 Attachment Model (`server/apps/boards/`)

```
Attachment
├── id: UUID (pk)
├── card: FK → Card
├── file: FileField(upload_to="attachments/%Y/%m/")
├── filename: CharField(255)  ← original filename
├── size: PositiveIntegerField  ← bytes
├── content_type: CharField(100)
├── uploaded_by: FK → User
├── created_at: DateTimeField
```

**Validation:**
- Max file size: 25MB (enforce in serializer + nginx `client_max_body_size`)
- Max attachments per card: 10
- Allowed types: images, PDFs, documents, spreadsheets, archives (deny executables)

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/cards/:id/attachments/` | Upload file (multipart/form-data) | Board access |
| GET | `/api/cards/:id/attachments/` | List attachments with presigned download URLs | Board access |
| DELETE | `/api/attachments/:id/` | Delete attachment | Uploader, Admin, Owner |

**Presigned Upload (optional optimization):**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/cards/:id/attachments/presign/` | Get presigned upload URL — client uploads directly to S3, then confirms |
| POST | `/api/cards/:id/attachments/confirm/` | Confirm upload, create Attachment record |

### 3.3 Time Tracking (`server/apps/boards/`)

**Models:**

```
TimeEntry
├── id: UUID (pk)
├── card: FK → Card
├── user: FK → User
├── started_at: DateTimeField
├── ended_at: DateTimeField(null)  ← null = timer is running
├── duration: DurationField(null)  ← computed on stop, or manual entry
├── note: CharField(500, blank)
├── is_manual: BooleanField(default=False)
├── created_at: DateTimeField
```

**Add fields to Card model:**
```python
estimated_hours = DecimalField(max_digits=6, decimal_places=2, null=True)
```

**API Endpoints:**

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/cards/:id/time/start/` | Start timer (creates TimeEntry with ended_at=null) | Board access |
| POST | `/api/cards/:id/time/stop/` | Stop running timer (sets ended_at, computes duration) | Timer owner |
| POST | `/api/cards/:id/time/` | Manual time entry `{duration, note}` | Board access |
| GET | `/api/cards/:id/time/` | List time entries for card | Board access |
| DELETE | `/api/time-entries/:id/` | Delete time entry | Entry owner, Admin |
| GET | `/api/boards/:id/time-report/` | Aggregated time per member, per card | Board access |
| PATCH | `/api/cards/:id/` | Update `estimated_hours` | Board access |

**Business Rules:**
- Only one active timer per user across all cards (enforce in start endpoint)
- Stop any running timer before starting a new one
- Duration auto-computed: `ended_at - started_at`
- Board time report: `SUM(duration)` grouped by user and card

---

## Frontend Tasks

### 3.4 Attachment UI (Card Detail Modal)

**Section in card detail:** below description, above comments.

- **Upload area:** Drag-and-drop zone + file picker button
- **File list:** Each attachment shows:
  - File icon (based on content_type) or image thumbnail
  - Filename + size ("report.pdf — 2.3 MB")
  - Upload date + uploader name
  - Download button (presigned URL) + delete button
- **Image attachments:** Click to open lightbox preview
- **Upload progress:** Progress bar during upload

### 3.5 Time Tracking UI (Card Detail Modal)

**Section in card detail sidebar:**

- **Estimate:** Inline editable field ("Estimated: 4h")
- **Timer button:** Play/Stop toggle
  - Running state: shows elapsed time ticking (updated every second via `setInterval`)
  - Stopped state: shows "Start Timer" button
- **Time log:** List of entries
  - Each entry: duration, user, date, note
  - "Add Manual Entry" button → duration input + optional note
- **Summary:** "Tracked: 6h 30m / Estimated: 8h" with progress bar

### 3.6 React Query Hooks

```
use-attachments.ts  → useAttachments(cardId), useUploadAttachment(), useDeleteAttachment()
use-time-tracking.ts → useTimeEntries(cardId), useStartTimer(), useStopTimer(), useAddManualTime(), useTimeReport(boardId)
```

### 3.7 Active Timer State

- Store active timer in Zustand: `{ cardId, startedAt, timeEntryId }`
- Show floating timer indicator in app header when a timer is running
- Timer persists across page navigation (Zustand persisted state)
- On page load: check for active timer via `GET /api/cards/:id/time/` where `ended_at=null`

---

## Acceptance Criteria

- [ ] Files can be uploaded to cards (drag-and-drop + file picker)
- [ ] File size validation (25MB max) with helpful error message
- [ ] Image attachments show thumbnail preview
- [ ] Files can be downloaded via presigned URLs
- [ ] Attachments can be deleted by uploader or admin
- [ ] Timer can be started/stopped on a card
- [ ] Only one active timer per user at a time
- [ ] Manual time entries can be added with duration and note
- [ ] Card shows estimated vs tracked time
- [ ] Board time report shows aggregated time per member
- [ ] Active timer indicator visible in header across all pages

---

## New Dependencies

**Backend:**
- `django-storages` + `boto3` (S3/MinIO file storage)

**Frontend:**
- None

**Infrastructure:**
- MinIO service in `docker-compose.yml` (dev S3)
- Nginx `client_max_body_size 25M` (if using nginx proxy)
