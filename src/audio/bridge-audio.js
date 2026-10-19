import fs from 'node:fs';
import path from 'node:path';
import { bridgeRequest } from '../bridge/client.js';
import { synthesizeSpeech } from './speak.js';
import { transcribeWav } from './listen.js';

export function createBridgeAudio(cfg, deps = {}) {
  const request = deps.bridgeRequest || ((m, p) => bridgeRequest(m, p, deps));

  return {
    async hasUplinkAudio() {
      try {
        const r = await request('has_call_audio', {});
        return !!(r && r.uplink === true);
      } catch {
        return false;
      }
    },

    async speakOnCall(text) {
      const wav = await synthesizeSpeech(cfg, text, deps);
      const dir = path.join(cfg.home, 'tts');
      fs.mkdirSync(dir, { recursive: true });
      const wavPath = path.join(dir, 'speak-' + Date.now() + '.wav');
      fs.writeFileSync(wavPath, wav);
      const r = await request('play_uplink', { wavPath });
      if (!r || r.ok !== true) {
        throw new Error((r && r.message) || 'Call audio is not up yet: HFP uplink is unavailable.');
      }
      return { name: r.deviceName || 'hfp-uplink' };
    },

    async listenOnCall(seconds) {
      const dir = path.join(cfg.home, 'recordings');
      fs.mkdirSync(dir, { recursive: true });
      const wavPath = path.join(dir, 'listen-' + Date.now() + '.wav');
      const r = await request('record_downlink', { seconds, wavPath });
      if (!r || r.ok !== true) {
        throw new Error((r && r.message) || 'Call audio is not up yet: HFP downlink is unavailable.');
      }
      const transcript = await transcribeWav(cfg, wavPath, deps);
      return { wavPath, transcript };
    },
  };
}
