import { pickOnlineModem, sessionBus } from './dbus-util.js';

const SERVICE = 'org.pipewire.Telephony';
const ROOT = '/org/pipewire/Telephony';

export function createPipewireTransport(deps = {}) {
  const getBus = deps.sessionBus || sessionBus;
  let bus = null;

  async function connect() {
    if (!bus) bus = getBus();
    return bus;
  }

  async function modem() {
    const b = await connect();
    return pickOnlineModem(b, SERVICE, ROOT);
  }

  async function voiceCallManager(modemPath) {
    const b = await connect();
    const obj = await b.getProxyObject(SERVICE, modemPath);
    return obj.getInterface('org.ofono.VoiceCallManager');
  }

  async function audioGateway(modemPath) {
    const b = await connect();
    const obj = await b.getProxyObject(SERVICE, modemPath);
    try {
      return obj.getInterface('org.pipewire.Telephony.AudioGateway1');
    } catch {
      return null;
    }
  }

  async function getCalls() {
    const m = await modem();
    if (!m) throw new Error('No PipeWire telephony modem is available.');
    const vcm = await voiceCallManager(m.path);
    const raw = await vcm.GetCalls();
    const calls = [];
    const pairs = Array.isArray(raw) ? raw : Object.entries(raw || {});
    for (const [callPath, props] of pairs) {
      calls.push({
        path: callPath,
        state: props.State || 'unknown',
        lineIdentification: props.LineIdentification || '',
        name: props.Name || '',
      });
    }
    return calls;
  }

  return {
    backend: 'pipewire',

    async dial(number) {
      const m = await modem();
      if (!m) throw new Error('No PipeWire telephony modem is available for dialing.');
      const gw = await audioGateway(m.path);
      if (gw && typeof gw.Dial === 'function') {
        await gw.Dial(number);
        return;
      }
      const vcm = await voiceCallManager(m.path);
      await vcm.Dial(number, 'default');
    },

    async answer() {
      const calls = await getCalls();
      const incoming = calls.find((c) => c.state === 'incoming' || c.state === 'alerting');
      if (!incoming) throw new Error('There is no incoming call to answer.');
      const b = await connect();
      const obj = await b.getProxyObject(SERVICE, incoming.path);
      const vc = obj.getInterface('org.ofono.VoiceCall');
      await vc.Answer();
    },

    async hangUp() {
      const calls = await getCalls();
      if (calls.length) {
        const b = await connect();
        for (const c of calls) {
          if (c.state === 'disconnected') continue;
          const obj = await b.getProxyObject(SERVICE, c.path);
          const vc = obj.getInterface('org.ofono.VoiceCall');
          await vc.Hangup();
        }
        return;
      }
      const m = await modem();
      if (!m) throw new Error('No active call to hang up.');
      const vcm = await voiceCallManager(m.path);
      await vcm.HangupAll();
    },

    async getCallState() {
      const calls = await getCalls();
      const active = calls.find((c) => c.state !== 'disconnected');
      if (!active) return { state: 'idle', calls: [] };
      return { state: active.state, calls };
    },
  };
}
