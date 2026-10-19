import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import { loadConfig } from '../../src/config.js';
import { buildAllowlist } from '../../src/phone/allowlist.js';
import { appendCallLog } from '../../src/phone/call-log.js';
import { tmpHome } from './fixtures/tmp-home.js';
import { createCallGate } from '../../src/security/call-gate.js';
import { createLockoutTracker } from '../../src/security/lockout.js';
import { loadChallengeSettings } from '../../src/security/challenge-config.js';
import { answersMatch, normalizeAnswerText } from '../../src/security/answer-match.js';
import { readChallengeFailures } from '../../src/security/failure-log.js';
import { readPendingNotifications } from '../../src/security/notify-owner.js';

const OWNER = '+15550101001';

class FakeTelephony {
  constructor() {
    this.backend = 'fake';
    this.available = true;
    this.dials = [];
    this.state = 'idle';
    this.calls = [];
  }
  async dial(number) {
    this.dials.push(number);
    this.state = 'outgoing';
  }
  async answer() {
    this.state = 'active';
  }
  async hangUp() {
    this.state = 'idle';
    this.calls = [];
  }
  async getCallState() {
    if (this.calls.length) {
      const active = this.calls.find((c) => c.state !== 'disconnected') || this.calls[0];
      return { state: active.state, calls: this.calls };
    }
    return { state: this.state, calls: [] };
  }
}

let home;
let ctx;
let client;
let telephony;
let spoken;
let listenTranscript;

function challengeEnabled(phrase, answer) {
  return loadChallengeSettings({
    challenge: {
      phrase,
      answer,
      decoy_max_seconds: 2,
      listen_seconds: 3,
      lockout: { max_failures: 3, window_seconds: 60, duration_seconds: 30 },
    },
  }, {});
}

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
  spoken = [];
  listenTranscript = 'correct passphrase';
  const cfg = loadConfig({
    SIMPHONE_HOME: home,
    SIMPHONE_OWNER: OWNER,
  });
  const challenge = challengeEnabled('State your passphrase.', 'correct passphrase');
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
      hasUplinkAudio: async () => true,
    },
    logCall(entry) {
      appendCallLog(home, entry);
    },
    challenge,
    callGate: createCallGate(),
    lockout: createLockoutTracker(challenge.lockout),
    challengeSpeak: async (_ctx, line) => {
      spoken.push(line);
      assert.equal(line.includes('correct passphrase'), false);
    },
    challengeListen: async () => ({ transcript: listenTranscript }),
  };
  await connect();
});

test('answer matcher is forgiving', () => {
  assert.equal(answersMatch('Correct Passphrase!', 'correct passphrase'), true);
  assert.equal(answersMatch('wrong', 'correct passphrase'), false);
  assert.equal(normalizeAnswerText('  Hi.  ', { ignore_case: true, ignore_punctuation: true }), 'hi');
});

test('call_owner passes challenge with correct STT', async () => {
  listenTranscript = 'correct passphrase';
  const r = json(await call('call_owner'));
  assert.equal(r.dialed, true);
  assert.equal(r.owner_challenge.verified, true);
  assert.equal(ctx.callGate.mode, 'verified');
  assert.ok(spoken.some((s) => s.includes('State your passphrase')));
});

test('call_owner enters decoy on wrong answer', async () => {
  listenTranscript = 'intruder';
  const r = json(await call('call_owner'));
  assert.equal(r.owner_challenge.verified, false);
  assert.equal(r.call_security_mode, 'decoy');
  assert.equal(readChallengeFailures(home).length, 1);
  assert.equal(readPendingNotifications(home).length, 1);
});

test('silence counts as challenge failure', async () => {
  listenTranscript = '   ';
  const r = json(await call('call_owner'));
  assert.equal(r.owner_challenge.reason, 'silence');
  assert.equal(ctx.callGate.mode, 'decoy');
});

test('decoy blocks call_owner and status but allows speak', async () => {
  listenTranscript = 'nope';
  await call('call_owner');
  assert.equal(ctx.callGate.mode, 'decoy');
  const blocked = await call('call_owner');
  assert.equal(blocked.isError, true);
  assert.match(text(blocked), /Decoy mode/i);
  const st = await call('status');
  assert.equal(st.isError, true);
  ctx.audio.speakOnCall = async (t) => {
    spoken.push('agent:' + t);
    return { name: 'uplink' };
  };
  const sp = json(await call('speak', { text: 'nice weather' }));
  assert.equal(sp.spoken, true);
});

test('lockout after repeated failures', async () => {
  listenTranscript = 'bad';
  for (let i = 0; i < 3; i++) {
    ctx.callGate.reset();
    await call('call_owner');
  }
  ctx.callGate.reset();
  listenTranscript = 'correct passphrase';
  const r = json(await call('call_owner'));
  assert.equal(r.owner_challenge.reason, 'lockout');
});

test('incoming owner answer runs challenge', async () => {
  telephony.calls = [{
    state: 'incoming',
    lineIdentification: OWNER,
  }];
  listenTranscript = 'correct passphrase';
  const r = json(await call('answer'));
  assert.equal(r.answered, true);
  assert.equal(r.owner_challenge.verified, true);
});

test('decoy max duration triggers hang up', async () => {
  listenTranscript = 'wrong';
  ctx.challenge.decoyMaxSeconds = 1;
  const hangUps = [];
  telephony.hangUp = async () => {
    hangUps.push(1);
    telephony.state = 'idle';
  };
  await call('call_owner');
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(hangUps.length, 1);
  assert.equal(ctx.callGate.mode, 'idle');
});

test('challenge config never appears in tool JSON output', async () => {
  listenTranscript = 'correct passphrase';
  const r = await call('call_owner');
  const raw = text(r);
  assert.equal(raw.includes('correct passphrase'), false);
  assert.equal(raw.includes('passphrase'), false);
});
