import { spawn } from 'node:child_process';
import { resolveBridgeCommand } from './resolve-cmd.js';

let shared = null;

function nextId() {
  return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
}

export class BridgeClient {
  constructor(spec, deps = {}) {
    this.spec = spec;
    this.deps = deps;
    this.child = null;
    this.buf = '';
    this.pending = new Map();
    this.started = false;
  }

  async start() {
    if (this.started) return;
    const spawnFn = this.deps.spawn || spawn;
    this.child = spawnFn(this.spec.cmd, this.spec.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.onData(chunk));
    this.child.stderr.on('data', (chunk) => {
      if (this.deps.onStderr) this.deps.onStderr(chunk);
    });
    this.child.on('error', (err) => this.failAll(err));
    this.child.on('close', (code) => {
      this.started = false;
      this.failAll(new Error('bridge helper exited with code ' + code));
    });
    this.started = true;
    const ping = await this.request('ping', {});
    if (!ping || ping.ok !== true) {
      throw new Error('bridge helper ping failed');
    }
  }

  onData(chunk) {
    this.buf += chunk;
    let idx;
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      const id = msg.id;
      if (!id || !this.pending.has(id)) continue;
      const { resolve, reject } = this.pending.get(id);
      this.pending.delete(id);
      if (msg.error) reject(new Error(String(msg.error)));
      else resolve(msg.result);
    }
  }

  failAll(err) {
    for (const [, { reject }] of this.pending) reject(err);
    this.pending.clear();
  }

  request(method, params = {}) {
    if (!this.started) {
      return Promise.reject(new Error('bridge helper is not started'));
    }
    const id = nextId();
    const payload = JSON.stringify({ id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(payload, (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  async close() {
    if (!this.child) return;
    try {
      await this.request('shutdown', {});
    } catch {
      // ignore
    }
    this.child.kill();
    this.child = null;
    this.started = false;
  }
}

export async function getBridgeClient(deps = {}) {
  const env = deps.env || process.env;
  const platform = deps.platform || process.platform;
  if (env.SIMPHONE_BRIDGE === '0' || env.SIMPHONE_BRIDGE === 'off') {
    return null;
  }
  const spec = deps.bridgeSpec || resolveBridgeCommand(env, platform);
  if (!spec) return null;
  if (!shared) {
    shared = new BridgeClient(spec, deps);
    await shared.start();
  }
  return shared;
}

export async function bridgeRequest(method, params, deps = {}) {
  const client = deps.client || await getBridgeClient(deps);
  if (!client) return null;
  return client.request(method, params);
}

export async function bridgePing(deps = {}) {
  try {
    const client = deps.client;
    if (client) {
      const r = await client.request('ping', {});
      return r && r.ok === true;
    }
    const spec = deps.bridgeSpec || resolveBridgeCommand(deps.env || process.env, deps.platform || process.platform);
    if (!spec) return false;
    const one = new BridgeClient(spec, deps);
    await one.start();
    await one.close();
    return true;
  } catch {
    return false;
  }
}

/** Test helper: reset singleton between tests. */
export function resetBridgeClientForTests() {
  shared = null;
}
