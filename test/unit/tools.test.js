import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import { loadConfig } from '../../src/config.js';
import { buildAllowlist } from '../../src/phone/allowlist.js';
import { appendCallLog, readCallLog } from '../../src/phone/call-log.js';
import { tmpHome } from './fixtures/tmp-home.js';

class FakeTelephony {
  constructor() {
    this.backend = 'fake';
    this.available = true;
    this.dials = [];
    this.state = 'idle';
  }
  async dial(number) {
    this.dials.push(number);
    this.state = 'outgoing';
  }
  async answer() { this.state = 'active'; }
  async hangUp() { this.state = 'idle'; }
  async getCallState() { return { state: this.state, calls: [] }; }
}

const OWNER = '+15550101001';
const OTHER = '+15550101002';
const STRANGER = '+15559999999';

let home;
let ctx;
let client;
let telephony;

const pwDump = () => Promise.resolve(JSON.stringify([
  { type: 'PipeWire:Interface:Node', id: 1, info: { props: { 'node.name': 'bluez_input.test', 'media.class': 'Stream/Input/Audio' } } },
  { type: 'PipeWire:Interface:Node', id: 2, info: { props: { 'node.name': 'bluez_output.test', 'media.class': 'Stream/Output/Audio' } } },
]));

async function connect() {
  const server = createServer(ctx);
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'unit', version: '1' });
  await Promise.all([server.connect(a), client.connect(b)]);
}

const call = (name, args = {}) => client.callTool({ name, arguments: args });
const text = (r) => r.content[0].text;
const json = (r) => JSON.parse(text(r));

beforeEach(async () => {
  home = tmpHome();
  telephony = new FakeTelephony();
  const cfg = loadConfig({
    SIMPHONE_HOME: home,
    SIMPHONE_OWNER: OWNER,
    SIMPHONE_ALLOW: OTHER,
  });
  ctx = {
    cfg,
    allowlist: buildAllowlist(cfg.owner, cfg.allowRaw),
    telephony,
    bluetooth: {
      read: async () => ({
        adapterPowered: true,
        adapterName: 'hci0',
        pairedPhone: { alias: 'Test Phone', hfpConnected: true },
      }),
    },
    audio: {
      runPwDump: pwDump,
      installKokoro: async () => ({
        speak: async () => Buffer.from('fake-wav'),
      }),
      speakAsTts: async (engine, req) => engine.speak(req.text, req.voice),
      playToNode: async () => {},
      recordFromNode: async (_id, _sec, out) => {
        fs.writeFileSync(out, 'RIFF');
      },
      hasUplinkAudio: async () => false,
    },
    logCall(entry) {
      appendCallLog(home, entry);
    },
  };
  await connect();
});

test('rejects stranger without dial or log', async () => {
  const r = await call('dial', { number: STRANGER });
  assert.equal(r.isError, true);
  assert.equal(telephony.dials.length, 0);
  assert.equal(readCallLog(home).length, 0);
});

test('dials owner via call_owner', async () => {
  const r = json(await call('call_owner'));
  assert.equal(r.dialed, true);
  assert.deepEqual(telephony.dials, [OWNER]);
  assert.equal(readCallLog(home).length, 1);
});

test('dials allowlisted second number', async () => {
  const r = json(await call('dial', { number: OTHER }));
  assert.equal(r.dialed, true);
  assert.deepEqual(telephony.dials, [OTHER]);
});

test('normalizes dial input', async () => {
  await call('dial', { number: '1-555-010-1002' });
  assert.deepEqual(telephony.dials, [OTHER]);
});

test('status hides owner digits', async () => {
  const s = json(await call('status'));
  assert.equal(s.owner_configured, true);
  assert.equal(s.allowlist_size, 2);
  assert.equal(JSON.stringify(s).includes('555'), false);
  assert.equal(s.telephony_backend, 'fake');
});

test('speak refuses without uplink', async () => {
  const r = await call('speak', { text: 'hello' });
  assert.equal(r.isError, true);
  assert.match(text(r), /not up yet/i);
});

test('speak with uplink uses fake player', async () => {
  ctx.audio.hasUplinkAudio = async () => true;
  let played = false;
  ctx.audio.speakOnCall = async (t) => {
    assert.equal(t, 'hi');
    played = true;
    return { name: 'bluez_input.test' };
  };
  const server = createServer(ctx);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const c = new Client({ name: 'unit', version: '1' });
  await Promise.all([server.connect(a), c.connect(b)]);
  const r = json(await c.callTool({ name: 'speak', arguments: { text: 'hi' } }));
  assert.equal(r.spoken, true);
  assert.equal(played, true);
});

test('listen returns wav without stt', async () => {
  const r = json(await call('listen', { seconds: 2 }));
  assert.ok(r.wav_path);
  assert.equal(r.transcript, null);
  assert.ok(fs.existsSync(r.wav_path));
});

test('unavailable telephony does not dial stranger after allow check', async () => {
  telephony.available = false;
  const r = await call('dial', { number: OWNER });
  assert.equal(r.isError, true);
  assert.equal(telephony.dials.length, 0);
});
