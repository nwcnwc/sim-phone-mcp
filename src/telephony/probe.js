import { busHasName, sessionBus, systemBus } from './dbus-util.js';

export async function probeBackends(deps = {}) {
  const session = deps.sessionBus || sessionBus;
  const system = deps.systemBus || systemBus;
  const hasPipewire = deps.hasPipewire ?? (() => busHasName(session(), 'org.pipewire.Telephony'));
  const hasOfono = deps.hasOfono ?? (() => busHasName(system(), 'org.ofono'));

  const pipewire = await hasPipewire();
  const ofono = await hasOfono();
  return { pipewire, ofono };
}

export function resolveBackendPreference(cfgHfp, probe) {
  if (cfgHfp === 'pipewire') {
    return probe.pipewire ? 'pipewire' : null;
  }
  if (cfgHfp === 'ofono') {
    return probe.ofono ? 'ofono' : null;
  }
  if (probe.pipewire) return 'pipewire';
  if (probe.ofono) return 'ofono';
  return null;
}
