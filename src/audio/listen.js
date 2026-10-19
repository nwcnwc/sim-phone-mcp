import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findHfpDownlinkNode } from './pipewire-nodes.js';
import { pwDump, defaultPwDump } from './speak.js';

export async function recordDownlink(seconds, cfg, deps = {}) {
  const runPwDump = deps.runPwDump || defaultPwDump;
  const dump = await pwDump(runPwDump);
  const downlink = findHfpDownlinkNode(dump);
  if (!downlink) {
    throw new Error('Call audio is not up yet: no HFP downlink node found in PipeWire.');
  }
  const dir = path.join(cfg.home, 'recordings');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'listen-' + Date.now() + '.wav');
  const record = deps.recordFromNode || defaultRecordFromNode;
  await record(downlink.id, seconds, out, deps);
  return { wavPath: out, node: downlink };
}

function defaultRecordFromNode(nodeId, seconds, outFile, deps) {
  return new Promise((resolve, reject) => {
    const args = ['--target', String(nodeId), '-d', String(seconds), outFile];
    const cmd = deps.pwRecordCmd || 'pw-record';
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (b) => { err += b; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err || cmd + ' failed'));
      else resolve();
    });
  });
}

export async function transcribeWav(cfg, wavPath, deps = {}) {
  if (cfg.sttCmd) {
    const runCmd = deps.runSttCmd || defaultSttCmd;
    const text = await runCmd(cfg.sttCmd, wavPath);
    return text.trim() || null;
  }
  if (cfg.sttUrl) {
    const post = deps.postStt || defaultPostStt;
    const body = await post(cfg.sttUrl, wavPath);
    return body.text ?? null;
  }
  return null;
}

function defaultSttCmd(cmd, wavPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [wavPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (b) => { out += b; });
    child.stderr.on('data', (b) => { err += b; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err || cmd + ' exited ' + code));
      else resolve(out);
    });
  });
}

async function defaultPostStt(url, wavPath) {
  const data = fs.readFileSync(wavPath);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'audio/wav' },
    body: data,
  });
  if (!res.ok) throw new Error('STT request failed: HTTP ' + res.status);
  return res.json();
}

export async function listenOnCall(seconds, cfg, deps = {}) {
  const { wavPath } = await recordDownlink(seconds, cfg, deps);
  const transcript = await transcribeWav(cfg, wavPath, deps);
  return { wavPath, transcript };
}

/** True when call audio nodes exist (used before speak). */
export async function hasCallAudio(deps = {}) {
  const runPwDump = deps.runPwDump || defaultPwDump;
  try {
    const dump = await pwDump(runPwDump);
    return !!(findHfpUplinkNode(dump) && findHfpDownlinkNode(dump));
  } catch {
    return false;
  }
}
