import { loadConfig } from '../config.js';
import { probeBackends, resolveBackendPreference } from './probe.js';
import { createOfonoTransport } from './ofono.js';
import { createPipewireTransport } from './pipewire.js';
import { createBridgeTransport } from './bridge.js';

const NO_BACKEND_LINUX =
  'No telephony backend is available. Need org.pipewire.Telephony on the session bus (PipeWire 1.3.82+) or org.ofono on the system bus. See docs/hfp-backend.md.';

const NO_BACKEND_OTHER =
  'No telephony backend is available. Install the platform bridge helper (see docs/setup-laptop-bridge.md) or use a Linux bridge host.';

function unavailableTransport(platform) {
  const msg = platform === 'linux' ? NO_BACKEND_LINUX : NO_BACKEND_OTHER;
  return {
    backend: 'none',
    available: false,
    async dial() { throw new Error(msg); },
    async answer() { throw new Error(msg); },
    async hangUp() { throw new Error(msg); },
    async getCallState() { return { state: 'unknown', calls: [] }; },
  };
}

export async function createTelephony(cfg, deps = {}) {
  const platform = deps.platform || process.platform;
  const probe = deps.probe || (() => probeBackends({ ...deps, platform }));
  const backends = await probe();
  const choice = resolveBackendPreference(cfg.hfp, backends, platform);
  if (!choice) {
    return unavailableTransport(platform);
  }
  if (choice === 'pipewire') {
    return { ...createPipewireTransport(deps), available: true };
  }
  if (choice === 'ofono') {
    return { ...createOfonoTransport(deps), available: true };
  }
  if (choice === 'winrt' || choice === 'macos') {
    return { ...createBridgeTransport(choice, deps), available: true };
  }
  return unavailableTransport(platform);
}

export async function telephonyForEnv(env = process.env, deps = {}) {
  const cfg = loadConfig(env);
  return createTelephony(cfg, deps);
}
