# Keycloak browser qualification

`npm run test:e2e:auth` checks a running frontend, API and Keycloak realm using
disposable test accounts. It makes real browser requests and does not mock
authentication. The normal `npm test` suite remains independent of these services.

## Prerequisites

- Install Node 22.18+ dependencies with `npm ci`, then `npx playwright install chromium`.
- Run a disposable CNP API with Keycloak validation and the same issuer as the frontend.
- Configure the frontend origin, callback and logout URLs on the Keycloak client
  and allow the frontend origin in the API CORS configuration.
- Provision two Keycloak users with passwords and a configured SHA-1, six-digit,
  30-second TOTP credential. Both must be able to complete Keycloak sign-in.
- Allow `user` to access CNP, but exclude `denied` from the API allowlist. The
  denied account must have a CNP profile so this tests the allowlist policy.

Save the following fixture outside the repository, using disposable credentials:

```json
{
  "users": {
    "user": {
      "username": "allowed-test-user",
      "password": "<disposable password>",
      "otp_secret_base32": "<test TOTP secret>"
    },
    "denied": {
      "username": "denied-test-user",
      "password": "<disposable password>",
      "otp_secret_base32": "<test TOTP secret>"
    }
  }
}
```

## Run

For example, in a shell with the test services already running:

```sh
export CNP_E2E_CREDENTIALS=/private/path/credentials.json
export CNP_E2E_FRONTEND_URL=http://127.0.0.1:15173
export CNP_E2E_API_URL=http://127.0.0.1:18080/api/v1
export CNP_E2E_ISSUER=http://127.0.0.1:18081/realms/cnp-e2e
npm run test:e2e:auth
```

The URLs above are the defaults. `CNP_E2E_HEADED=1` shows the browser. Set
`CNP_E2E_PLAYWRIGHT_MODULE` only when using an already installed Playwright module
from another absolute path.

Each scenario uses a fresh browser context. The test verifies:

1. OIDC authorization uses the expected issuer origin, PKCE S256, a nonce and the
   frontend callback.
2. Password and MFA sign-in load `/projects` through a successful `/auth/me` call.
3. Reload restores the authenticated session.
4. Sign-out revokes the API browser session and clears the frontend OIDC session.
5. A new MFA sign-in preserves the entire MCP consent URL, including OAuth query
   parameters. No permission is preselected and authorization stays disabled.
6. A Keycloak-authenticated user excluded by CNP receives HTTP 403 and cannot
   open the projects page.

The navigation check does not authorize an MCP client or change GitHub/cloud
resources. Full MCP OAuth and tool qualification is a separate backend exercise.
When two sign-ins fall in the same TOTP window, the test waits for the next window
because Keycloak rejects reuse of the previous code.

The process exits with a nonzero status on failure. The private fixture directory
receives `browser-results/summary.json`; failures also save a screenshot, error and
Playwright trace. `CNP_E2E_ARTIFACT_DIR` can select another private directory.
Traces can contain session data and test credentials: keep them outside Git and
restrict access. They are not uploaded by the frontend CI workflow.

For another local qualification process only, `CNP_E2E_TOKEN_FILE` may point to a
private output file. The test writes the final allowed user's short-lived access
token there without printing it. Leave this variable unset for ordinary runs.
