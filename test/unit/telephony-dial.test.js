import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOfonoTransport } from '../../src/telephony/ofono.js';
import { createPipewireTransport } from '../../src/telephony/pipewire.js';

const MODEM_PATH = '/modem1';
const DIAL_NUMBER = '+15550101001';

function mockBus({ audioGateway = null } = {}) {
  const dials = { vcm: [], gw: [] };

  const bus = {
    getProxyObject: async (_service, path) => {
      if (path === '/' || path === '/org/pipewire/Telephony') {
        return {
          getInterface: () => ({
            GetModems: async () => ({ [MODEM_PATH]: { Online: true, Name: 'Test' } }),
          }),
        };
      }
      if (path !== MODEM_PATH) throw new Error(`unexpected path: ${path}`);
      return {
        getInterface: (iface) => {
          if (iface === 'org.pipewire.Telephony.AudioGateway1') {
            if (!audioGateway) throw new Error('no audio gateway');
            return audioGateway;
          }
          if (iface === 'org.ofono.VoiceCallManager') {
            return {
              Dial: async (number, hide_callerid) => {
                dials.vcm.push({ number, hide_callerid });
              },
            };
          }
          throw new Error(`unexpected interface: ${iface}`);
        },
      };
    },
  };

  return { bus, dials };
}

test('ofono VoiceCallManager.Dial passes hide_callerid "default"', async () => {
  const { bus, dials } = mockBus();
  const transport = createOfonoTransport({ systemBus: () => bus });
  await transport.dial(DIAL_NUMBER);
  assert.deepEqual(dials.vcm, [{ number: DIAL_NUMBER, hide_callerid: 'default' }]);
});

test('pipewire VoiceCallManager fallback Dial passes hide_callerid "default"', async () => {
  const { bus, dials } = mockBus();
  const transport = createPipewireTransport({ sessionBus: () => bus });
  await transport.dial(DIAL_NUMBER);
  assert.deepEqual(dials.vcm, [{ number: DIAL_NUMBER, hide_callerid: 'default' }]);
  assert.equal(dials.gw.length, 0);
});

test('pipewire AudioGateway1.Dial uses a single number argument', async () => {
  const gwDials = [];
  const gw = {
    Dial: async (number) => {
      gwDials.push(number);
    },
  };
  const { bus, dials } = mockBus({ audioGateway: gw });
  const transport = createPipewireTransport({ sessionBus: () => bus });
  await transport.dial(DIAL_NUMBER);
  assert.deepEqual(gwDials, [DIAL_NUMBER]);
  assert.equal(dials.vcm.length, 0);
});
