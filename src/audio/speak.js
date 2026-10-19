import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { installKokoro } from 'gifos-mcp-core/src/voice/kokoro.js';
import { speakAsTts } from 'gifos-mcp-core/src/voice/providers.js';
import { findHfpUplinkNode } from './pipewire-nodes.js';

export async function pwDump(runPwDump) {
  const raw = await runPwDump();
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export function defaultPwDump() {
  return new Promise((resolve, reject) => {
    const child = spawn('pw-dump', [], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (b) => { out += b; });
    child.stderr.on('data', (b) => { err += b; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err || 'pw-dump failed with code ' + code));
      else resolve(out);
    });
  });
}

export async function synthesizeSpeech(cfg, text, deps = {}) {
  const install = deps.installKokoro || installKokoro;
  const speak = deps.speakAsTts || speakAsTts;
  const engine = await install({ home: cfg.home, voice: cfg.voice });
  const out = await speak(engine, { text, voice: cfg.voice });
  if (Buffer.isBuffer(out)) return out;
  if (out && out.bytes) return Buffer.from(out.bytes);
  return Buffer.from(out);
}

export async function playWavToUplink(wavBuffer, deps = {}) {
  const runPwDump = deps.runPwDump || defaultPwDump;
  const dump = await pwDump(runPwDump);
  const uplink = findHfpUplinkNode(dump);
  if (!uplink) {
    throw new Error('Call audio is not up yet: no HFP uplink node found in PipeWire. Start or answer a call first.');
  }
  const play = deps.playToNode || defaultPlayToNode;
  await play(uplink.id, wavBuffer, deps);
  return uplink;
}

function defaultPlayToNode(nodeId, wavBuffer, deps) {
  const tmpDir = deps.tmpDir || path.join(process.env.TMPDIR || '/tmp', 'sim-phone-mcp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const file = path.join(tmpDir, 'speak-' + Date.now() + '.wav');
  fs.writeFileSync(file, wavBuffer);
  return new Promise((resolve, reject) => {
    const args = ['-p', '--target', String(nodeId), file];
    const child = spawn('pw-cat', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (b) => { err += b; });
    child.on('error', reject);
    child.on('close', (code) => {
      fs.unlink(file, () => {});
      if (code !== 0) reject(new Error(err || 'pw-cat playback failed'));
      else resolve();
    });
  });
}

export async function speakOnCall(cfg, text, deps = {}) {
  const wav = await synthesizeSpeech(cfg, text, deps);
  return playWavToUplink(wav, deps);
}

export async function hasUplinkAudio(deps = {}) {
  const runPwDump = deps.runPwDump || defaultPwDump;
  try {
    const dump = await pwDump(runPwDump);
    return !!findHfpUplinkNode(dump);
  } catch {
    return false;
  }
}
