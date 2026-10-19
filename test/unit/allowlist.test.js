import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAllowlist, isAllowed, DISALLOWED_MESSAGE } from '../../src/phone/allowlist.js';
import { normalizeNumber } from '../../src/phone/normalize.js';

test('normalizes to plus and digits', () => {
  assert.equal(normalizeNumber('1 (555) 010-9999'), '+15550109999');
  assert.equal(normalizeNumber('+44 20 7946 0958'), '+442079460958');
});

test('owner-only default allowlist', () => {
  const list = buildAllowlist('+15550100001', '');
  assert.deepEqual(list, ['+15550100001']);
  assert.equal(isAllowed('+15550100001', list), true);
  assert.equal(isAllowed('5550100002', list), false);
});

test('two-number allowlist', () => {
  const list = buildAllowlist('+10000000001', '+10000000002');
  assert.equal(list.length, 2);
  assert.equal(isAllowed('+10000000002', list), true);
  assert.equal(isAllowed('+10000000003', list), false);
});

test('disallowed message does not encourage redialing strangers', () => {
  assert.match(DISALLOWED_MESSAGE, /allowlist/i);
  assert.doesNotMatch(DISALLOWED_MESSAGE, /try again/i);
});
