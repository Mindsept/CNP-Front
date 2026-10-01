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
- the local Keycloak stack from `../IaC---CNP/dev/auth`
- A running backend exposing the contracts under
  [`VITE_API_BASE_URL`](#environment-variables)

---

## Quick start

Start Keycloak first from the IaC repository:

```bash
cd ../IaC---CNP/dev/auth
cp .env.example .env
# Replace the CHANGE_ME values on first use.
docker compose up -d
sh scripts/verify.sh
```

Start the backend stack from `../CNP---API` using its [integration guide](../CNP---API/docs/keycloak-integration.md), and explicitly link the Keycloak subject to an existing CNP account. Then start the frontend from this repository:

```bash
cp .env.example .env
npm ci
npm run dev
```

The app starts on http://localhost:5173 and talks to the backend at
`VITE_API_BASE_URL`.

### Other commands

```bash
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm run lint      # run ESLint
npm test          # run the Vitest suite
```

---

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Base URL of the platform backend. |
| `VITE_APP_NAME` | `Cloud Native Platform` | Brand name displayed in the UI. |
| `VITE_KEYCLOAK_URL` | `http://localhost:8081` | Keycloak base URL, without the realm path. |
| `VITE_KEYCLOAK_REALM` | `cnp` | Realm used for OIDC discovery. |
| `VITE_KEYCLOAK_CLIENT_ID` | `cnp-front` | Public SPA client; no client secret is used. |

The Axios client reads `VITE_API_BASE_URL` once at startup. Configure a
different value per environment (e.g. on Vercel) — no URL is hardcoded.

---

## Project structure

```
src/
  auth/          # OIDC client, provider, claim adapter, navigation state
  config/        # environment loading
  lib/           # api client, error parsing, utils
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

The frontend uses `react-oidc-context` and `oidc-client-ts` with OpenID Connect
Authorization Code Flow and PKCE. The browser redirects to Keycloak for the
username/email, password and MFA screens; CNP never receives these credentials.

- Authority: `http://localhost:8081/realms/cnp` in local development.
- Callback: `http://localhost:5173/auth/callback`.
- Logout callback: `http://localhost:5173/auth/logout/callback`.
- Requested scopes: `openid profile email`.
- PKCE is enabled by `oidc-client-ts` for the code flow; it is not disabled or
  reimplemented by CNP.
- OIDC state, nonce, tokens and the current user are maintained by the library
  in `sessionStorage`. They survive F5 in the same tab and are removed when the
  browser tab/session ends.
- Access tokens are renewed by the library through the OIDC refresh/silent-renew
  mechanism. The historical `POST /auth/refresh` flow is no longer used.
- Axios retrieves the current Keycloak access token from the OIDC user manager
  and attaches it as `Authorization: Bearer ...`.
- Routes inside `<ProtectedRoute>` wait for OIDC session restoration before
  deciding whether to render or redirect to `/login`.
- The requested local route is carried through the OIDC state and
  restored after the callback. Only local paths are accepted.

### Manual sign-in and MFA test

1. Open <http://localhost:5173> and select **Continue to sign in**.
2. Authenticate as the development user configured in the Keycloak `.env`.
3. On first use, scan Keycloak's QR Code and enter the TOTP code. React does not
   render or store any MFA material.
4. Confirm that Keycloak returns to CNP and that a protected page is displayed.
5. Refresh the browser and confirm that the session remains active.
6. Use **Sign out** in the user menu. Keycloak terminates its SSO session before
   redirecting to CNP.
7. Open a protected URL again and confirm that CNP requests a new sign-in.

To test return-to navigation, open a protected URL such as
<http://localhost:5173/projects> in a private window before signing in.

To reset MFA for one development user, use the Keycloak administration console:
select realm `cnp`, open the user's **Credentials**, remove the OTP credential,
and require **Configure OTP** on their next login. Keep the existing database
and volumes so CNP identity links and other users remain intact.

### Legacy authentication status

- `/auth/login` and `/auth/refresh` are no longer called by the frontend.
- `/auth/me` loads the CNP business profile after OIDC sign-in. CNP roles come only from this response.
- The old `cnp.access_token`, `cnp.refresh_token` and `cnp.user` local-storage
  entries are deleted once at application startup.
- The historical `/register` page and `POST /auth/register` service remain only
  for compatibility. Registration does not sign in through Keycloak and does
  not provision a Keycloak account. Account provisioning should be migrated in
  a separate ticket.

### CNP business profile

The API validates Keycloak access tokens with audience `cnp-api` in `dual` or
`keycloak` mode. `useAuth().identity` describes the OIDC identity; `user` comes
from `/auth/me` and contains the existing CNP UUID and role. Keycloak roles are
not used for business permissions. An unknown, inactive or disallowed CNP
account cannot open protected business pages; the UI offers retry and logout.

Backend rollback to `AUTH_MODE=legacy` restores legacy API clients. This OIDC
frontend then displays an access error until the API returns to `dual`; it does
not silently switch to legacy credentials. No database rollback is needed.

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
`VITE_API_BASE_URL` and the three `VITE_KEYCLOAK_*` variables before running
`npm run build`; the resulting `dist/` folder is what to serve. The deployed
origin and callback/logout URLs must also be explicitly allowed on the Keycloak
client. Production Keycloak must use HTTPS.
