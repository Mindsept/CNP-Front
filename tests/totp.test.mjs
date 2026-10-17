import assert from 'node:assert/strict';
import { test } from 'node:test';
import { totp } from '../scripts/e2e/totp.mjs';

test('E2E TOTP follows the RFC 6238 SHA-1 vectors with six digits', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totp(secret, 59_000), '287082');
  assert.equal(totp(secret, 1_111_111_109_000), '081804');
  assert.equal(totp(secret, 2_000_000_000_000), '279037');
});
