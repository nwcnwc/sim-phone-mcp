import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HFP_VALUES = new Set(['auto', 'pipewire', 'ofono', 'winrt', 'macos']);

function readJsonFile(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e && e.code === 'ENOENT') return {};
    throw new Error('SIMPHONE_CONFIG is not valid JSON: ' + file);
  }
}

function pick(envVal, fileVal) {
  if (envVal !== undefined && envVal !== '') return envVal;
  if (fileVal !== undefined && fileVal !== '') return fileVal;
  return '';
}

export function defaultHome() {
  return path.join(os.homedir(), '.local', 'share', 'sim-phone');
}

export function loadConfigFile(env = process.env) {
  const filePath = env.SIMPHONE_CONFIG || '';
  return filePath ? readJsonFile(filePath) : {};
}

export function loadConfig(env = process.env) {
  const home = env.SIMPHONE_HOME || defaultHome();
  const file = loadConfigFile(env);

  const owner = pick(env.SIMPHONE_OWNER, file.owner);
  const allowRaw = pick(env.SIMPHONE_ALLOW, file.allow);
  const hfpRaw = (pick(env.SIMPHONE_HFP, file.hfp) || 'auto').toLowerCase();
  const hfp = HFP_VALUES.has(hfpRaw) ? hfpRaw : 'auto';
  const sttUrl = pick(env.SIMPHONE_STT_URL, file.stt_url);
  const sttCmd = env.SIMPHONE_STT_CMD || '';
  const voice = pick(env.SIMPHONE_VOICE, file.voice) || 'af_heart';
  const btAdapter = env.SIMPHONE_BT_ADAPTER || '';

  return {
    home,
    owner,
    allowRaw,
    hfp,
    sttUrl,
    sttCmd,
    voice,
    btAdapter,
  };
}
