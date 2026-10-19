import { loadConfig } from './config.js';
import { buildAllowlist } from './phone/allowlist.js';
import { appendCallLog } from './phone/call-log.js';
import { createTelephony } from './telephony/index.js';
import { readBluetoothStatus } from './bluetooth/status.js';

export async function createContext(overrides = {}) {
  const env = overrides.env || process.env;
  const cfg = overrides.cfg || loadConfig(env);
  const allowlist = buildAllowlist(cfg.owner, cfg.allowRaw);
  const telephony = overrides.telephony || await createTelephony(cfg, overrides.telephonyDeps || {});
  const bluetooth = overrides.bluetooth || {
    read: () => readBluetoothStatus(cfg, overrides.bluetoothDeps || {}),
  };
  const audio = overrides.audio || {};
  const kokoro = overrides.kokoro || null;

  function logCall(entry) {
    if (overrides.callLog === false) return;
    appendCallLog(cfg.home, entry);
  }

  return {
    cfg,
    allowlist,
    telephony,
    bluetooth,
    audio,
    kokoro,
    logCall,
  };
}
