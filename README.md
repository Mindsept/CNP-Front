# Cloud Native Platform — Frontend

Internal developer platform that lets teams import GitHub repositories,
analyze their stack, generate a CI workflow, adapt it with AI, and ship the
resulting Pull Request — all from a single console.

Built with **React + TypeScript + Vite + TailwindCSS + shadcn-style UI +
TanStack Query**.

---

## Requirements

- Node.js 18+ (Node 20/22 recommended)
- npm 9+
- A running backend exposing the contracts under
  [`VITE_API_BASE_URL`](#environment-variables)

---

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

The app starts on http://localhost:5173 and talks to the backend at
`VITE_API_BASE_URL`.

### Other commands

```bash
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

---

## Environment variables

| Variable             | Default                          | Description                          |
|----------------------|----------------------------------|--------------------------------------|
| `VITE_API_BASE_URL`  | `http://localhost:8000/api/v1`   | Base URL of the platform backend.    |
| `VITE_APP_NAME`      | `Cloud Native Platform`          | Brand name displayed in the UI.      |

The Axios client reads `VITE_API_BASE_URL` once at startup. Configure a
different value per environment (e.g. on Vercel) — no URL is hardcoded.

---

## Project structure

```
src/
  config/        # environment loading
  lib/           # api client, auth store, error parsing, utils
  types/         # typed request/response models
  services/      # one service per backend resource
  hooks/         # use-auth, use-toast-error, use-api-query
  routes/        # router + ProtectedRoute
  layouts/       # auth-layout, app-layout, sidebar, topbar
  pages/         # one folder per feature
  components/
    ui/          # shadcn-style primitives (button, card, dialog…)
    common/      # page-header, status-badge, empty/error/loading states…
    dashboard/   # dashboard-only widgets
    projects/    # create project dialog
    github/      # GitHub import dialog
    ci/          # adapt / create-PR dialogs
```

---

## Theme

The UI is a premium dark theme on a near-black background (`#050711`) with
violet (`#8B5CF6`) and blue (`#38BDF8`) accents. Surfaces use subtle glass
effects and tasteful shadows — no cheap gradients, no random emojis, no
placeholder copy.

The logo at `/public/logo.png` is reused on the login page, sidebar and
favicon. If the file is missing, the UI falls back to a `CNP` text mark.

---

## Authentication

- Tokens are stored in `localStorage` under `cnp.access_token`,
  `cnp.refresh_token`, and the cached user under `cnp.user`.
- The Axios client attaches `Authorization: Bearer <access_token>`
  automatically.
- On `401`, the client tries `/auth/refresh` once; on failure it clears the
  store and redirects to `/login?next=<previous-url>`.
- Routes inside `<ProtectedRoute>` ensure the user has an access token and a
  fresh `/auth/me` payload before rendering.

---

## API contracts

The frontend follows the contracts documented in the platform spec. Each
endpoint is implemented in `src/services/*.service.ts`:

| Resource    | File                                  |
|-------------|---------------------------------------|
| auth        | `services/auth.service.ts`            |
| projects    | `services/project.service.ts`         |
| github      | `services/github.service.ts`          |
| repositories| `services/repository.service.ts`      |
| ci          | `services/ci.service.ts`              |
| secrets     | `services/secret.service.ts`          |
| jobs        | `services/job.service.ts`             |
| dashboard   | `services/dashboard.service.ts`       |
| audit       | `services/audit.service.ts`           |

Errors are normalized to an `ApiError` (`code`, `message`, `status`,
`details`). Toasts surface `error.message`; pages show inline error states
when a whole page fails to load.

---

## Core demo flow

```
Login
→ Create project
→ Connect GitHub
→ See installations
→ See accessible repositories
→ Import repository into project
→ Analyze repository
→ Generate CI preview
→ Ask AI to adapt / explain
→ Approve CI
→ Open Pull Request
→ Open PR on GitHub
```

Each step is reflected in the UI with loading, empty, success and error
states, plus toast notifications for transient feedback.

---

## Deployment

Any static host works (Vercel, Netlify, Cloudflare Pages…). Set
`VITE_API_BASE_URL` to your production backend URL before running
`npm run build`; the resulting `dist/` folder is what to serve.
