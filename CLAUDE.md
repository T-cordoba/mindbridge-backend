# MindBridge — Agent Context

Emotional wellness MVP. AI-powered reflective journal with active crisis safety protocol.
Two independent sub-projects: `backend/` (Node.js API) and `frontend/` (Next.js app).

---

## Quick orientation

| File | Purpose |
|------|---------|
| `AI_CONTEXT.md` | System prompt + JSON contract for the Together AI model |
| `backend/.env.example` | All required env vars (copy to `.env`) |
| `frontend/.env.local.example` | Frontend env vars |

**Start backend:** `cd backend && npm run dev` → `http://localhost:4000`
**Start frontend:** `cd frontend && npm run dev` → `http://localhost:3000`
**Swagger:** `http://localhost:4000/api/docs`
**Run DB migration:** `cd backend && npm run migrate`

---

## Backend

### Tech
- Node.js + Express (CommonJS, no build step)
- PostgreSQL via `pg` pool
- JWT auth (no session, no refresh token for MVP)
- Together AI (`openai/gpt-oss-20b`) — reasoning model, needs `max_tokens ≥ 1500`
- Swagger via `swagger-jsdoc` + `swagger-ui-express`

### Clean Architecture layers

```
backend/src/
├── domain/                         # Pure business logic — NO framework deps
│   ├── entities/                   # User, Session, Message, Psychologist
│   ├── repositories/               # Interface contracts (I*Repository.js)
│   └── value-objects/              # Emotion.js (enum + validators), AlertLevel.js
├── application/                    # Use cases — orchestrate domain + repos
│   └── use-cases/
│       ├── auth/                   # RegisterUser, LoginUser, DeleteAccount
│       ├── journal/                # CreateSession, GetSession(s), SendMessage, DeleteSession
│       ├── dashboard/              # GetEmotionMetrics
│       └── marketplace/            # ListPsychologists, GetPsychologist
├── infrastructure/                 # Concrete implementations
│   ├── ai/                         # TogetherAIService.js, prompts.js
│   └── database/
│       ├── connection.js           # pg Pool singleton
│       ├── migrate.js              # Run with `npm run migrate`
│       ├── migrations/001_initial.sql
│       └── repositories/          # Postgres*Repository.js (implement I*Repository)
└── interfaces/
    ├── docs/swagger.js             # Swagger setup
    └── http/
        ├── controllers/            # Instantiate use cases, wire req→use-case→res
        ├── middleware/             # auth, validate, errorHandler
        └── routes/                 # Express routers with JSDoc @swagger annotations
```

### Adding a new feature — backend checklist

1. **Domain:** add entity in `domain/entities/` and interface in `domain/repositories/` if new data type
2. **Application:** add use case in `application/use-cases/<module>/`. Use case constructor takes repositories as args — no direct DB or HTTP imports
3. **Infrastructure:** add `Postgres*Repository.js` extending the interface; add migration SQL if schema changes
4. **Interfaces:** add controller method, wire in route file with `@swagger` JSDoc, register route in `app.js`

### Controller naming rule

**CRITICAL:** Never name a class field (arrow fn handler) the same as a `this.*` use-case instance in the constructor — JS class fields overwrite instance properties.

```js
// WRONG — deleteAccount field overwrites this.deleteAccount use-case
constructor() { this.deleteAccount = new DeleteAccount(repo); }
deleteAccount = async (req, res, next) => { ... }

// CORRECT — prefix use-case instances with _
constructor() { this._deleteAccount = new DeleteAccount(repo); }
deleteAccount = async (req, res, next) => { await this._deleteAccount.execute(...) }
```

### Emotion taxonomy (immutable for MVP)

Defined in `domain/value-objects/Emotion.js`. **Do not add emotions** without updating:
- `Emotion.js` VALID_EMOTIONS set
- `infrastructure/ai/prompts.js` VALID_EMOTIONS array
- `frontend/src/lib/emotions.ts` EMOTION_LABELS + EMOTION_COLORS

### Error handling

Throw plain `new Error('message string')` from use cases.
`errorHandler.middleware.js` maps known message strings to HTTP status codes.
To add a new error: add the mapping in `errorHandler.middleware.js`.

### Environment variables

All secrets via `.env` (never hardcoded). See `.env.example` for all keys.
DB password in `.env` only — never committed.

---

## Frontend

### Tech
- Next.js 15, App Router, TypeScript
- Tailwind CSS v3 configured to use CSS variables (no hardcoded palette classes)
- Lucide React for all icons (`import { IconName } from 'lucide-react'`)
- Recharts for dashboard charts
- `next-themes` not used — custom ThemeContext via `data-theme` on `<html>`

### Language rule
**All UI strings in Spanish. All code (variables, functions, types, comments) in English.**

### Project structure

```
frontend/src/
├── app/                            # Next.js App Router pages
│   ├── layout.tsx                  # Root layout — wraps ThemeProvider + AuthProvider
│   ├── page.tsx                    # Landing page
│   ├── globals.css                 # Design system (CSS vars, dark/light tokens)
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── journal/page.tsx            # Session list
│   ├── journal/[sessionId]/page.tsx # Chat interface
│   ├── dashboard/page.tsx
│   ├── help/page.tsx               # Marketplace
│   └── about/page.tsx
├── components/
│   ├── ui/                         # Reusable primitives (Button, Input, Card, Badge,
│   │                               #   Modal, Spinner, Alert)
│   ├── layout/                     # Navbar, Footer, ThemeToggle, ProtectedRoute
│   ├── journal/                    # ChatMessage, ChatInput, SessionCard, CrisisAlert
│   ├── dashboard/                  # EmotionChart, StatsCard, MoodTimeline
│   └── marketplace/                # PsychologistCard
├── context/
│   ├── AuthContext.tsx             # user state, login/register/logout/deleteAccount
│   └── ThemeContext.tsx            # theme state, toggle — sets data-theme on <html>
├── lib/
│   ├── api.ts                      # All fetch calls grouped by module (authApi, journalApi…)
│   ├── auth.ts                     # localStorage token helpers
│   └── emotions.ts                 # Emotion → Spanish label, hex color, group
└── types/index.ts                  # All shared TypeScript types
```

### Design system rules

**Never use hardcoded colors or Tailwind palette classes** (`text-purple-600`, `bg-gray-100`, etc.).
Always use semantic tokens mapped to CSS variables:

| Token class | CSS variable | Use for |
|-------------|-------------|---------|
| `bg-bg` | `--color-bg` | Page background |
| `bg-surface` | `--color-surface` | Cards, panels |
| `bg-surface-elevated` | `--color-surface-elevated` | Hover states, inputs |
| `text-primary` | `--color-text-primary` | Main text |
| `text-secondary` | `--color-text-secondary` | Supporting text |
| `text-muted` | `--color-text-muted` | Placeholders, meta |
| `text-primary` (color) | `--color-primary` | Purple brand color |
| `bg-primary-subtle` | `--color-primary-subtle` | Icon backgrounds, tags |
| `border-border` | `--color-border` | Card/input borders |
| `text-danger` | `--color-danger` | Errors |
| `bg-crisis-bg` | `--color-crisis-bg` | Crisis alert backgrounds |

Dark/light mode is automatic — only edit `globals.css` `:root` and `[data-theme="dark"]` blocks.

### Component rules

1. **Every UI component accepts a `className` prop** for layout/spacing overrides from pages
2. **`'use client'`** directive required for: any component using `useState`, `useEffect`, event handlers, `useRouter`, context hooks
3. **Pages are Server Components by default** — add `'use client'` only if needed
4. **Icons:** always from `lucide-react`. Use `size={N}` prop not CSS width/height
5. **Protected pages:** wrap page content with `<ProtectedRoute>` — handles loading state and redirects to `/login`

### Adding a new feature — frontend checklist

1. **Type:** add interface/type to `src/types/index.ts`
2. **API call:** add method to relevant object in `src/lib/api.ts` (`authApi`, `journalApi`, etc.)
3. **Component:** create in appropriate subfolder of `src/components/`. Use existing UI primitives from `components/ui/`
4. **Page:** create `page.tsx` in `src/app/<route>/`. Use `ProtectedRoute` if auth required
5. **Nav link:** add to `privateLinks` or `publicLinks` array in `components/layout/Navbar.tsx`

### Auth flow

- JWT stored in `localStorage` under key `mb_token` (via `src/lib/auth.ts`)
- `AuthContext` loads user on mount via `/api/auth/me`
- `ProtectedRoute` redirects to `/login` if no user
- Disclaimer acceptance is required at register — checked server-side

### API client pattern

```ts
// Always use the typed helpers in lib/api.ts, never fetch directly from pages
import { journalApi } from '@/lib/api';
const { sessions } = await journalApi.getSessions();
```

---

## Database schema (summary)

```sql
users        id, email, password_hash, name, disclaimer_accepted, created_at, updated_at
sessions     id, user_id, title, summary, message_count, max_alert_level, is_blocked, created_at, updated_at
messages     id, session_id, role(user|assistant), content, mood_data(JSONB), alert_level(0-5), created_at
psychologists id, name, specialty, bio, avatar_url, email, phone, location, price_range, rating, languages
```

`mood_data` stores `[["emotion_key", intensity], ...]` — emotion keys must match `Emotion.js` VALID_EMOTIONS.

---

## AI integration

- **Model:** `openai/gpt-oss-20b` via Together AI (reasoning model)
- **max_tokens must be ≥ 1500** — model uses ~350 tokens internally for reasoning before producing output
- **response_format:** `{ type: "json_object" }` enforced on every chat call
- **System prompt** lives in `backend/src/infrastructure/ai/prompts.js`
- **Context compression:** triggered async after session exceeds 20 messages. Summarizes oldest messages, stores in `sessions.summary`. Next calls send summary as system message prefix
- **Crisis detection:** `alerta: 5` → `respuesta` = `"CRISIS_DETECTED"` → backend sets `session.is_blocked = true` → frontend shows `CrisisAlert` component, disables input

---

## What is intentionally out of scope (MVP)

- No message encryption (plain text in DB)
- No email verification
- No password reset flow
- No real psychologist booking (marketplace shows mock data only)
- No admin panel
- No file/image uploads
- No push notifications
- No tests
