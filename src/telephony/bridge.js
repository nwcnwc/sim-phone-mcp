import { bridgeRequest, getBridgeClient } from '../bridge/client.js';

const NO_BRIDGE =
  'No telephony backend is available. On Windows or macOS, install the platform bridge helper (see docs/setup-laptop-bridge.md). On Linux, need PipeWire Telephony or oFono.';

export function createBridgeTransport(backendName, deps = {}) {
  const request = deps.bridgeRequest || ((m, p) => bridgeRequest(m, p, deps));

  return {
    backend: backendName,
    available: true,

    async dial(number) {
      const r = await request('dial', { number });
      if (!r || r.ok !== true) throw new Error((r && r.message) || NO_BRIDGE);
    },

    async answer() {
      const r = await request('answer', {});
      if (!r || r.ok !== true) throw new Error((r && r.message) || 'There is no incoming call to answer.');
    },

    async hangUp() {
      const r = await request('hang_up', {});
      if (!r || r.ok !== true) throw new Error((r && r.message) || 'No active call to hang up.');
    },

    async getCallState() {
      const r = await request('get_call_state', {});
      if (!r) return { state: 'unknown', calls: [] };
      return { state: r.state || 'unknown', calls: r.calls || [] };
    },
  };
}

export async function ensureBridgeClient(deps = {}) {
  const client = deps.client || await getBridgeClient(deps);
  if (!client) throw new Error(NO_BRIDGE);
  return client;
}
