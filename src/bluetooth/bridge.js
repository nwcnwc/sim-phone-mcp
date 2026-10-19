import { bridgeRequest } from '../bridge/client.js';

export async function readBluetoothStatusBridge(deps = {}) {
  const request = deps.bridgeRequest || ((m, p) => bridgeRequest(m, p, deps));
  try {
    const r = await request('bluetooth_status', {});
    if (!r) {
      return { adapterPowered: false, adapterName: null, pairedPhone: null };
    }
    return {
      adapterPowered: r.adapterPowered === true,
      adapterName: r.adapterName || null,
      pairedPhone: r.pairedPhone || null,
    };
  } catch {
    return { adapterPowered: false, adapterName: null, pairedPhone: null };
  }
}
