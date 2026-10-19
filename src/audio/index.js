import { createBridgeAudio } from './bridge-audio.js';

export function createAudioForPlatform(cfg, deps = {}) {
  const platform = deps.platform || process.platform;
  if (platform === 'win32' || platform === 'darwin') {
    return createBridgeAudio(cfg, deps);
  }
  return {};
}
