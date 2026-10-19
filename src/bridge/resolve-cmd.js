import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function defaultBridgeCommand(platform = process.platform) {
  if (platform === 'win32') {
    return {
      cmd: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(PKG_ROOT, 'helpers', 'win', 'bridge-daemon.ps1')],
    };
  }
  if (platform === 'darwin') {
    const swift = path.join(PKG_ROOT, 'helpers', 'darwin', 'bridge-daemon.swift');
    return { cmd: 'swift', args: [swift] };
  }
  return null;
}

export function resolveBridgeCommand(env = process.env, platform = process.platform) {
  const custom = env.SIMPHONE_BRIDGE_CMD || '';
  if (custom) {
    const parts = custom.trim().split(/\s+/);
    return { cmd: parts[0], args: parts.slice(1) };
  }
  const def = defaultBridgeCommand(platform);
  if (!def) return null;
  if (!fs.existsSync(def.args[def.args.length - 1])) return def;
  return def;
}
