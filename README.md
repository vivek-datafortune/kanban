# Kanban

A full-stack Trello-inspired project management app built for small teams, featuring real-time drag-and-drop boards, OAuth authentication, and a modern glassmorphism UI.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Django](https://img.shields.io/badge/Django-6-092E20?logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Features

### Authentication
- Email-only login (no username) with custom User model
- Google & Microsoft OAuth via `django-allauth`
- JWT tokens stored in HTTP-only cookies
- Protected routes on the frontend

### Workspaces
- Create and manage workspaces with unique slugs
- Workspace-level membership roles (Owner, Admin, Member)
- Boards grouped under workspaces

### Boards
- Create boards with customizable background colors
- Pin/star boards for quick access
- Workspace or private visibility options
- Board-scoped labels with custom colors

### Lists & Cards
- Drag-and-drop list reordering (horizontal)
- Drag-and-drop card reordering and cross-list movement
- Zero-flicker optimistic updates with local state
- Card details: labels, members, due dates, start dates, descriptions, completion status
- Visual indicators for overdue and completed cards
- Inline card and list creation with animated forms

### UI/UX
- **Glassmorphism design** with frosted glass surfaces and `backdrop-blur`
- **Dual themes** — "Frost" (light) and "Void" (dark) with system detection
- Smooth page transitions and staggered entrance animations via `framer-motion`
- Animated back navigation, hover effects, and drag feedback
- Thin themed scrollbars
- Custom reusable dropdown menu component
- Responsive grid layouts

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 8 | Build tool & dev server |
| Tailwind CSS | 4 | Utility-first styling |
| @tanstack/react-query | 5 | Server state management |
| Zustand | 5 | Client-side global state |
| @hello-pangea/dnd | 18 | Drag and drop |
| Framer Motion | 12 | Animations |
| react-cookie | 8 | Cookie-based auth tokens |
| react-router-dom | 7 | Routing |
| Lucide React | — | Icons |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Django | 6 | Web framework |
| Django REST Framework | 3.15+ | REST API |
| dj-rest-auth | 6+ | Auth endpoints |
| django-allauth | 65+ | OAuth (Google, Microsoft) |
| simplejwt | 5.3+ | JWT tokens |
| PostgreSQL | 16 | Database |
| psycopg | 3.2+ | PostgreSQL adapter |
| django-cors-headers | — | CORS handling |
| django-environ | — | Environment config |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | Container orchestration (3 services) |
| Nginx | Production reverse proxy & SPA serving |

---

## Project Structure

```
kanban/
├── docker-compose.yml          # Development orchestration
├── docker-compose.prod.yml     # Production overrides
│
├── client/                     # React SPA
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/         # UI & domain components
│   │   │   ├── board/          # Board, list, card components
│   │   │   └── ui/             # Reusable UI primitives
│   │   ├── hooks/              # Custom hooks (use-boards, use-cards, etc.)
│   │   ├── pages/              # Route-level views
│   │   ├── store/              # Zustand stores
│   │   ├── types/              # TypeScript interfaces
│   │   └── lib/                # API wrapper, utilities
│   └── ...
│
├── server/                     # Django REST API
│   ├── Dockerfile
│   ├── apps/
│   │   ├── users/              # Custom User model, OAuth views
│   │   ├── workspaces/         # Workspace & membership management
│   │   └── boards/             # Boards, lists, cards, labels
│   ├── config/
│   │   └── settings/           # base.py, development.py, production.py
│   └── ...
│
└── documentation/              # Product roadmap & phase plans
```

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:vivek-datafortune/kanban.git
   cd kanban
   ```

2. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` and fill in:
   - `DJANGO_SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` — from [Azure Portal](https://portal.azure.com)

3. **Start all services**
   ```bash
   docker compose up -d
   ```

4. **Run migrations & create a superuser**
   ```bash
   docker compose exec web python manage.py migrate
   docker compose exec web python manage.py createsuperuser
   ```

5. **Open the app**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API: [http://localhost:8000/api/](http://localhost:8000/api/)
   - Admin: [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Email + password login |
| POST | `/api/auth/logout/` | Logout |
| POST | `/api/auth/registration/` | Register |
| GET | `/api/auth/google/url/` | Get Google OAuth URL |
| POST | `/api/auth/google/` | Exchange Google auth code |
| GET | `/api/auth/microsoft/url/` | Get Microsoft OAuth URL |
| POST | `/api/auth/microsoft/` | Exchange Microsoft auth code |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me/` | Current user profile |

### Workspaces
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/workspaces/` | List / create workspaces |
| GET/PUT/DELETE | `/api/workspaces/:slug/` | Manage workspace |
| GET | `/api/workspaces/:slug/members/` | List members |

### Boards
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/workspaces/:slug/boards/` | List / create boards |
| GET/PUT/DELETE | `/api/boards/:id/` | Manage board |
| POST | `/api/boards/:id/star/` | Toggle pin/star |

### Lists & Cards
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/boards/:id/lists/` | List / create lists |
| PATCH/DELETE | `/api/lists/:id/` | Update / delete list |
| GET/POST | `/api/lists/:id/cards/` | List / create cards |
| PATCH/DELETE | `/api/cards/:id/` | Update / delete card |
| PATCH | `/api/cards/:id/move/` | Move / reorder card |
| POST/DELETE | `/api/cards/:id/labels/` | Manage card labels |
| POST/DELETE | `/api/cards/:id/members/` | Manage card members |

---

## Roadmap

### Phase 1 — Core Board Engine ✅
Workspaces, boards, lists, cards, drag-and-drop, labels, members, OAuth authentication.

### Phase 2 — Collaboration & Real-Time
- Workspace invitation system with email invites
- Real-time board updates via WebSockets (Django Channels)
- Card comments and activity history
- Checklists within cards
- Notification system (in-app + email)

### Phase 3 — File Attachments & Time Tracking
- Card file attachments (S3/MinIO storage)
- Image previews and document links
- Per-card time tracking with estimates and timers
- Manual time entries and time reports

### Phase 4 — AI Features
- AI-powered subtask generation from card titles
- Smart label suggestions based on card content
- Priority scoring for cards
- Duplicate card detection
- Natural language card creation

### Phase 5 — Integrations
- Google Calendar sync for card due dates
- Email-to-card and comment-via-email
- Outbound webhooks for third-party automation

### Phase 6 — Templates, Analytics & Search
- Pre-built board templates (project management, software, marketing, etc.)
- Workspace analytics dashboard with charts
- Full-text search across all workspace content

---

## License

This project is for learning purposes.
