#!/usr/bin/env node
/** Line-delimited JSON RPC for unit tests (no Bluetooth). */
import fs from 'node:fs';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
let callState = 'idle';

function reply(id, result, error) {
  const line = JSON.stringify(error ? { id, error } : { id, result });
  process.stdout.write(line + '\n');
}

rl.on('line', (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = req;
  if (!id) return;

  if (method === 'ping') {
    reply(id, { ok: true, platform: 'fake' });
    return;
  }
  if (method === 'shutdown') {
    reply(id, { ok: true });
    process.exit(0);
    return;
  }
  if (method === 'bluetooth_status') {
    reply(id, {
      adapterPowered: true,
      adapterName: 'Fake BT',
      pairedPhone: { alias: 'Test Phone', hfpConnected: true },
    });
    return;
  }
  if (method === 'dial') {
    callState = 'outgoing';
    reply(id, { ok: true });
    return;
  }
  if (method === 'answer') {
    callState = 'active';
    reply(id, { ok: true });
    return;
  }
  if (method === 'hang_up') {
    callState = 'idle';
    reply(id, { ok: true });
    return;
  }
  if (method === 'get_call_state') {
    reply(id, { state: callState, calls: [] });
    return;
  }
  if (method === 'has_call_audio') {
    reply(id, { uplink: callState === 'active', downlink: callState === 'active' });
    return;
  }
  if (method === 'play_uplink') {
    reply(id, { ok: callState === 'active', deviceName: 'fake-uplink' });
    return;
  }
  if (method === 'record_downlink') {
    fs.writeFileSync(params.wavPath, 'RIFF-fake');
    reply(id, { ok: callState === 'active' });
    return;
  }
  reply(id, null, 'unknown method: ' + method);
});
