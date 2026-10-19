import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModems } from '../../src/telephony/dbus-util.js';

test('parseModems object map', () => {
  const m = parseModems({ '/m1': { Online: true, Name: 'A' } });
  assert.equal(m[0].path, '/m1');
  assert.equal(m[0].online, true);
});

test('parseModems array pairs', () => {
  const m = parseModems([['/m2', { Online: false, Name: 'B' }]]);
  assert.equal(m[0].name, 'B');
});
