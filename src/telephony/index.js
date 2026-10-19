import { loadConfig } from '../config.js';
import { probeBackends, resolveBackendPreference } from './probe.js';
import { createOfonoTransport } from './ofono.js';
import { createPipewireTransport } from './pipewire.js';

const NO_BACKEND =
  'No telephony backend is available. Need org.pipewire.Telephony on the session bus (PipeWire 1.3.82+) or org.ofono on the system bus. See docs/hfp-backend.md.';

export async function createTelephony(cfg, deps = {}) {
  const probe = deps.probe || (() => probeBackends(deps));
  const backends = await probe();
  const choice = resolveBackendPreference(cfg.hfp, backends);
  if (!choice) {
    return {
      backend: 'none',
      available: false,
      async dial() { throw new Error(NO_BACKEND); },
      async answer() { throw new Error(NO_BACKEND); },
      async hangUp() { throw new Error(NO_BACKEND); },
      async getCallState() { return { state: 'unknown', calls: [] }; },
    };
  }
  const transport = choice === 'pipewire'
    ? createPipewireTransport(deps)
    : createOfonoTransport(deps);
  return { ...transport, available: true };
}

export async function telephonyForEnv(env = process.env, deps = {}) {
  const cfg = loadConfig(env);
  return createTelephony(cfg, deps);
}
