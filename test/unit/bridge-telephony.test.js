import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeTransport } from '../../src/telephony/bridge.js';

test('bridge transport dial and hangup via mock', async () => {
  const calls = [];
  const request = async (method, params) => {
    calls.push({ method, params });
    if (method === 'dial') return { ok: true };
    if (method === 'hang_up') return { ok: true };
    if (method === 'get_call_state') return { state: 'idle', calls: [] };
    return { ok: true };
  };
  const t = createBridgeTransport('winrt', { bridgeRequest: request });
  assert.equal(t.backend, 'winrt');
  await t.dial('+15550101001');
  await t.hangUp();
  assert.deepEqual(calls.map((c) => c.method), ['dial', 'hang_up']);
});
