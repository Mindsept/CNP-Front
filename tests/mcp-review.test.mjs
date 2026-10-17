import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canApproveReview, safeLoginDestination } from '../src/lib/mcp-review.ts';
const challenge = { fingerprint: 'immutable', expires_at: '2030-01-01T00:00:00Z' };
test('human acknowledgment is never implicit', () => assert.equal(canApproveReview(false, false, 'awaiting_review', 'immutable', challenge, 0), false));
test('exact current plan and explicit decision may proceed', () => assert.equal(canApproveReview(true, false, 'awaiting_review', 'immutable', challenge, 0), true));
test('expired, changed, consumed, loading or absent challenges cannot approve', () => {
  for (const args of [[true, false, 'queued', 'immutable', challenge, 0], [true, false, 'awaiting_review', 'changed', challenge, 0], [true, true, 'awaiting_review', 'immutable', challenge, 0], [true, false, 'awaiting_review', 'immutable', null, 0], [true, false, 'awaiting_review', 'immutable', challenge, Date.parse(challenge.expires_at)]]) assert.equal(canApproveReview(...args), false);
});
test('login redirects keep only local routes', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example']) assert.equal(safeLoginDestination(path), '/');
  assert.equal(safeLoginDestination('/mcp/reviews/abc?next=1'), '/mcp/reviews/abc?next=1');
});
