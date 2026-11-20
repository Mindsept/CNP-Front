import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// With no URL, test the production build locally. A URL also allows the same
// checks against a preview or production, without signing in or changing data.
const remote = process.env.CNP_E2E_FRONTEND_URL;
const base = (remote || 'http://127.0.0.1:14173').replace(/\/$/, '');
const server = remote ? null : spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1',
  '--port', '14173', '--strictPort',
], { stdio: 'inherit' });
let browser;
try {
  if (server) {
    const deadline = Date.now() + 30_000;
    while (true) {
      if (server.exitCode !== null) throw new Error('Preview server exited before becoming ready');
      if (await fetch(base).then(response => response.ok).catch(() => false)) break;
      if (Date.now() >= deadline) throw new Error('Preview server did not become ready');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CNP_CHROMIUM });
  for (const scenario of ['normal', 'unavailable-chunk', 'reduced-motion']) {
    const context = await browser.newContext({
      reducedMotion: scenario === 'reduced-motion' ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    let requested = 0;
    await page.route('**/assets/Galaxy-*.js', route => {
      requested++;
      return scenario === 'unavailable-chunk' ? route.abort('failed') : route.continue();
    });
    await page.goto(`${base}/login?reason=session-expired`, { waitUntil: 'networkidle' });
    const login = page.getByRole('button', { name: /sign in with keycloak/i });
    await login.waitFor();
    assert.equal(await login.isEnabled(), true, `${scenario}: sign-in remains available`);
    assert.equal(await page.getByText('Unexpected Application Error!', { exact: true }).count(), 0);
    if (scenario === 'normal') {
      await page.locator('.cnp-space-galaxy canvas').waitFor();
      assert.ok(requested > 0, 'Galaxy was actually loaded');
    } else if (scenario === 'unavailable-chunk') {
      assert.ok(requested > 0, 'Galaxy import was actually blocked');
      assert.equal(await page.locator('.cnp-space-galaxy').count(), 0);
    } else {
      assert.equal(requested, 0, 'Reduced motion must not load Galaxy');
    }
    assert.equal(await page.locator('.cnp-space-shade').count(), 1);
    console.log(`PASS: ${scenario}`);
    await context.close();
  }
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
}
