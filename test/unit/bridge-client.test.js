import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BridgeClient, bridgePing, resetBridgeClientForTests } from '../../src/bridge/client.js';

const FAKE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../helpers/test/fake-bridge-daemon.mjs',
);

afterEach(() => {
  resetBridgeClientForTests();
});

test('fake bridge daemon ping and dial', async () => {
  const spec = { cmd: process.execPath, args: [FAKE] };
  const client = new BridgeClient(spec);
  await client.start();
  const st = await client.request('get_call_state', {});
  assert.equal(st.state, 'idle');
  await client.request('dial', { number: '+15550101001' });
  const st2 = await client.request('get_call_state', {});
  assert.equal(st2.state, 'outgoing');
  await client.close();
});

test('bridgePing with fake spec', async () => {
  const ok = await bridgePing({ bridgeSpec: { cmd: process.execPath, args: [FAKE] } });
  assert.equal(ok, true);
});
