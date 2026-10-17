import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AuthPage } from './auth-page.mjs';

const credentialsPath = process.env.CNP_E2E_CREDENTIALS;
if (!credentialsPath) throw new Error('Set CNP_E2E_CREDENTIALS to the private disposable account fixture');
const config = {
  frontend: (process.env.CNP_E2E_FRONTEND_URL ?? 'http://127.0.0.1:15173').replace(/\/$/, ''),
  api: (process.env.CNP_E2E_API_URL ?? 'http://127.0.0.1:18080/api/v1').replace(/\/$/, ''),
  issuer: process.env.CNP_E2E_ISSUER ?? 'http://127.0.0.1:18081/realms/cnp-e2e',
};
const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
const artifacts = process.env.CNP_E2E_ARTIFACT_DIR ?? path.join(path.dirname(credentialsPath), 'browser-results');
await fs.mkdir(artifacts, { recursive: true, mode: 0o700 });
const modulePath = process.env.CNP_E2E_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: process.env.CNP_E2E_HEADED !== '1' });
const results = [];

async function exportToken(auth) {
  const token = await auth.accessToken();
  assert.ok(token, 'The OIDC session must contain an access token');
  if (process.env.CNP_E2E_TOKEN_FILE) {
    await fs.writeFile(process.env.CNP_E2E_TOKEN_FILE, token, { mode: 0o600 });
  }
}

async function scenario(name, execute) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await execute(new AuthPage(page, config), page);
    results.push({ name, status: 'passed' });
    console.log(`PASS: ${name}`);
    await context.tracing.stop();
  } catch (error) {
    results.push({ name, status: 'failed' });
    await fs.writeFile(path.join(artifacts, `${name}.error.txt`), String(error.stack ?? error), { mode: 0o600 });
    await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true }).catch(() => {});
    await context.tracing.stop({ path: path.join(artifacts, `${name}.zip`) });
    console.error(`FAIL: ${name} (private diagnostics saved)`);
  } finally {
    await context.close();
  }
}

try {
  await Promise.all([
    scenario('keycloak-mfa-session-and-mcp-navigation', async (auth, page) => {
      assert.equal((await auth.signIn(credentials.users.user, '/projects')).status(), 200);
      await page.waitForURL(`${config.frontend}/projects`);
      await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor();
      await exportToken(auth);
      const restored = page.waitForResponse(response => response.url() === `${config.api}/auth/me`);
      await page.reload();
      assert.equal((await restored).status(), 200);
      await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor();
      await auth.signOut();

      const query = new URLSearchParams({
        client_id: 'e2e-navigation-only', redirect_uri: 'http://127.0.0.1:15999/callback',
        response_type: 'code', code_challenge: 'e2e_challenge_for_navigation_only_0123456789abc',
        code_challenge_method: 'S256', scope: 'cnp:read', resource: config.api.replace(/\/api\/v1$/, '/mcp'),
        state: 'e2e-navigation-state',
      });
      const destination = `/mcp/consent?${query}`;
      assert.equal((await auth.signIn(credentials.users.user, destination)).status(), 200);
      await page.waitForURL(`${config.frontend}${destination}`);
      await page.getByRole('heading', { name: 'Connect an MCP client' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Authorize connection' }).isDisabled(), true);
      const acknowledgment = page.getByRole('checkbox', { name: 'I authorize this client for the selected permissions and projects.' });
      assert.equal(await acknowledgment.isChecked(), false);
      for (const checkbox of await page.getByRole('checkbox').all()) assert.equal(await checkbox.isChecked(), false);
      await exportToken(auth);
    }),
    scenario('keycloak-identity-without-cnp-access', async (auth, page) => {
      assert.equal((await auth.signIn(credentials.users.denied, '/projects')).status(), 403);
      await page.getByRole('heading', { name: 'CNP profile unavailable' }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Projects', exact: true }).count(), 0);
      assert.ok(await auth.accessToken(), 'Keycloak succeeded while CNP correctly refused business access');
    }),
  ]);
} finally {
  await browser.close();
}
await fs.writeFile(path.join(artifacts, 'summary.json'), `${JSON.stringify(results, null, 2)}\n`, { mode: 0o600 });
if (results.some(result => result.status === 'failed')) process.exitCode = 1;
