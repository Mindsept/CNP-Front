import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { totp } from './totp.mjs';

export class AuthPage {
  constructor(page, { frontend, api, issuer }) {
    this.page = page;
    this.frontend = frontend;
    this.api = api;
    this.issuer = issuer;
    this.lastCode = null;
  }

  async signIn(account, destination) {
    await this.page.goto(new URL(destination, this.frontend).href);
    await this.page.getByRole('button', { name: 'Continue to sign in' }).click();
    await this.page.getByRole('textbox', { name: /username|email/i }).waitFor();
    const authorization = new URL(this.page.url());
    assert.equal(authorization.origin, new URL(this.issuer).origin);
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(authorization.searchParams.get('response_type'), 'code');
    assert.equal(authorization.searchParams.get('redirect_uri'), `${this.frontend}/auth/callback`);
    assert.ok(authorization.searchParams.get('nonce'));
    await this.page.getByRole('textbox', { name: /username|email/i }).fill(account.username);
    await this.page.getByLabel('Password', { exact: true }).fill(account.password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
    const otp = this.page.getByLabel(/one-time code/i);
    await otp.waitFor();
    let code = totp(account.otp_secret_base32);
    if (code === this.lastCode) {
      // Keycloak rejects reuse of a time-based code after a completed sign-in.
      await setTimeout(30_000 - Date.now() % 30_000 + 100);
      code = totp(account.otp_secret_base32);
    }
    this.lastCode = code;
    const profile = this.page.waitForResponse(response => response.url() === `${this.api}/auth/me`);
    await otp.fill(code);
    await this.page.getByRole('button', { name: /sign in/i }).click();
    return profile;
  }

  async accessToken() {
    return this.page.evaluate(() => {
      for (let index = 0; index < globalThis.sessionStorage.length; index++) {
        const key = globalThis.sessionStorage.key(index);
        if (key?.startsWith('oidc.user:')) {
          const user = JSON.parse(globalThis.sessionStorage.getItem(key));
          if (user.access_token) return user.access_token;
        }
      }
      return null;
    });
  }

  async signOut() {
    await this.page.getByRole('banner').getByRole('button').click();
    const revoked = this.page.waitForResponse(response => response.url() === `${this.api}/auth/browser-logout`);
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
    assert.equal((await revoked).status(), 200);
    await this.page.waitForURL(`${this.frontend}/login`);
    assert.equal(await this.accessToken(), null);
  }
}
