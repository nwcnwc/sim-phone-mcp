import { bridgePing } from '../bridge/client.js';
import { busHasName, sessionBus, systemBus } from './dbus-util.js';

export async function probeBackends(deps = {}) {
  const platform = deps.platform || process.platform;
  if (platform === 'linux') {
    const session = deps.sessionBus || sessionBus;
    const system = deps.systemBus || systemBus;
    const hasPipewire = deps.hasPipewire ?? (() => busHasName(session(), 'org.pipewire.Telephony'));
    const hasOfono = deps.hasOfono ?? (() => busHasName(system(), 'org.ofono'));
    const pipewire = await hasPipewire();
    const ofono = await hasOfono();
    return { pipewire, ofono, winrt: false, macos: false };
  }
  if (platform === 'win32') {
    const ok = deps.bridgeAvailable ?? (() => bridgePing(deps));
    const winrt = await ok();
    return { pipewire: false, ofono: false, winrt, macos: false };
  }
  if (platform === 'darwin') {
    const ok = deps.bridgeAvailable ?? (() => bridgePing(deps));
    const macos = await ok();
    return { pipewire: false, ofono: false, winrt: false, macos };
  }
  return { pipewire: false, ofono: false, winrt: false, macos: false };
}

export function resolveBackendPreference(cfgHfp, probe, platform = process.platform) {
  if (cfgHfp === 'pipewire') {
    return probe.pipewire ? 'pipewire' : null;
  }
  if (cfgHfp === 'ofono') {
    return probe.ofono ? 'ofono' : null;
  }
  if (cfgHfp === 'winrt') {
    return probe.winrt ? 'winrt' : null;
  }
  if (cfgHfp === 'macos') {
    return probe.macos ? 'macos' : null;
  }
  if (platform === 'linux') {
    if (probe.pipewire) return 'pipewire';
    if (probe.ofono) return 'ofono';
    return null;
  }
  if (platform === 'win32' && probe.winrt) return 'winrt';
  if (platform === 'darwin' && probe.macos) return 'macos';
  if (cfgHfp === 'auto') {
    if (probe.winrt) return 'winrt';
    if (probe.macos) return 'macos';
  }
  return null;
}
