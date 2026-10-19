import { loadConfig, loadConfigFile } from './config.js';
import { buildAllowlist } from './phone/allowlist.js';
import { appendCallLog } from './phone/call-log.js';
import { createTelephony } from './telephony/index.js';
import { readBluetoothStatusForPlatform } from './bluetooth/index.js';
import { createAudioForPlatform } from './audio/index.js';
import { loadChallengeSettings } from './security/challenge-config.js';
import { createCallGate } from './security/call-gate.js';
import { createLockoutTracker } from './security/lockout.js';

export async function createContext(overrides = {}) {
  const env = overrides.env || process.env;
  const platform = overrides.platform || process.platform;
  const cfg = overrides.cfg || loadConfig(env);
  const configFile = overrides.configFile ?? loadConfigFile(env);
  const challenge = overrides.challenge || loadChallengeSettings(configFile, env);
  const allowlist = buildAllowlist(cfg.owner, cfg.allowRaw);
  const telephonyDeps = { ...(overrides.telephonyDeps || {}), platform, env };
  const telephony = overrides.telephony || await createTelephony(cfg, telephonyDeps);
  const bluetooth = overrides.bluetooth || {
    read: () => readBluetoothStatusForPlatform(cfg, { ...(overrides.bluetoothDeps || {}), platform }),
  };
  const audio = overrides.audio || createAudioForPlatform(cfg, { platform, env });
  const kokoro = overrides.kokoro || null;
  const callGate = overrides.callGate || createCallGate();
  const lockout = overrides.lockout || createLockoutTracker(challenge.lockout);

  function logCall(entry) {
    if (overrides.callLog === false) return;
    appendCallLog(cfg.home, entry);
  }

  return {
    cfg,
    configFile,
    challenge,
    callGate,
    lockout,
    allowlist,
    telephony,
    bluetooth,
    audio,
    kokoro,
    logCall,
    challengeSpeak: overrides.challengeSpeak,
    challengeListen: overrides.challengeListen,
  };
}
