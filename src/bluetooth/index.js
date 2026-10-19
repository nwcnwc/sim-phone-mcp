import { readBluetoothStatus } from './status.js';
import { readBluetoothStatusBridge } from './bridge.js';

export async function readBluetoothStatusForPlatform(cfg, deps = {}) {
  const platform = deps.platform || process.platform;
  if (platform === 'linux') {
    return readBluetoothStatus(cfg, deps);
  }
  return readBluetoothStatusBridge(deps);
}
