# Copilot Instructions

## Frontend Stack (React + TypeScript)

- **Forms**: Use `react-hook-form` for all form handling
- **Data Fetching**: Use `@tanstack/react-query` for all server state and API calls
- **Design System**: Follow **Glassmorphism** design patterns — frosted glass surfaces with `backdrop-blur`, semi-transparent tinted backgrounds, subtle white/light borders, soft shadows, rounded corners, muted color palette
- **CSS**: Use **Tailwind CSS** utility classes with **shadcn/ui** components
- **Cookies**: Use `react-cookie` for cookie management
- **Animation**: Use `framer-motion` for all animations and transitions
- **Icons**: Use `lucide-react` for all icons
- **Global State**: Use `zustand` for client-side global state management

## Glassmorphism Design Tokens

- **Light theme ("Frost")**: cool white `#f8f9fc`, indigo accent `hsl(239 84% 67%)`, deep blue-charcoal text
- **Dark theme ("Void")**: deep space-black `#0a0a14`, violet accent `hsl(252 87% 72%)`, light blue-gray text
- Use semantic Tailwind token classes (`bg-glass-bg`, `text-foreground`, `text-muted-foreground`, `text-primary`) — never hardcode theme colors
- CSS variables: `--glass-bg`, `--glass-tint` (rgba white), `--glass-tint-strong`, `--glass-border` (subtle dark/light), `--glass-shadow` (rgba black)
- CSS utility classes in `src/index.css`:
  - `.glass` — `backdrop-blur-[16px]`, tinted background, subtle border + shadow (standard frosted panel)
  - `.glass-sm` — `backdrop-blur-[8px]`, lighter tint (cards, small elements)
  - `.glass-strong` — `backdrop-blur-[24px]`, stronger tint (modals, sidebars, prominent panels)
  - `.glass-inset` — subtle tint, border, no shadow (recessed areas — generally avoid; prefer `bg-secondary border border-border`)
  - `.glass-btn` — border + shadow + hover transitions (generally avoid; prefer solid `bg-primary`/`bg-secondary` buttons)
- **Buttons**: Use solid backgrounds — `bg-primary hover:bg-primary/90` for primary, `bg-secondary hover:bg-secondary/80 border border-border` for secondary. Do NOT use `glass-btn` on buttons
- **Inputs**: Use `bg-secondary border border-border` for inputs/textareas. Do NOT use `glass-inset` on form controls
- **Badges/chips**: Use `bg-secondary` or `bg-primary/10` — no glass classes
- **Icon wrappers**: Use `bg-primary/10` instead of `glass-sm`
- **Hover states**: Use `hover:bg-secondary/60` instead of `hover:bg-white/10`
- Border radius: `rounded-xl` to `rounded-3xl`
- No hard borders — depth comes from backdrop-blur + translucent tinted layers on panels; solid `border-border` on interactive elements
- Use soft gradients for dividers: `bg-linear-to-r from-transparent via-border to-transparent`
- Theme state managed in Zustand store (`light | dark | system`), applied via `useTheme()` hook

## Frontend Conventions

- Components in `src/components/`, pages in `src/pages/`
- Custom hooks in `src/hooks/`, prefixed with `use-`
- API wrapper at `src/lib/api.ts` — always use it, never raw `fetch`
- Zustand stores in `src/store/`, named `*.store.ts`
- Types in `src/types/`, named `*.ts`
- Path alias `@/` maps to `src/`

## Backend Stack (Django + DRF)

- **Framework**: Django 6 with Django REST Framework
- **Auth**: `dj-rest-auth` + `django-allauth` for OAuth (Google, Microsoft), `simplejwt` for JWT tokens
- **Database**: PostgreSQL via `psycopg`
- **Config**: `django-environ` for environment variables
- **User Model**: Custom User model — email-only login, no username field
- **Settings**: Split into `config/settings/base.py`, `development.py`, `production.py`
- **Apps**: All Django apps live under `server/apps/`

## Avoid

- Never use `axios` — use the `api` wrapper in `src/lib/api.ts`
- Never use `useState` for server data — use `@tanstack/react-query`
- Never use inline `fetch()` — always go through the API layer
- Never use `react-icons` or other icon libs — only `lucide-react`
- Never use `localStorage` for auth tokens — use `react-cookie`
- Never add `username` fields — the User model is email-only
