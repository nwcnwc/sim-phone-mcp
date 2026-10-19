import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBluetoothStatus } from '../../src/bluetooth/status.js';

const HFP_AG = '0000111f-0000-1000-8000-00805f9b34fb';
const HFP = '0000111e-0000-1000-8000-00805f9b34fb';

function v(sig, value) {
  return { signature: sig, value };
}

function bluezBus(objects) {
  return {
    getProxyObject: async () => ({
      getInterface: () => ({
        GetManagedObjects: async () => objects,
      }),
    }),
  };
}

test('readBluetoothStatus unwraps Variant adapter fields', async () => {
  const objects = {
    '/org/bluez/hci0': {
      'org.bluez.Adapter1': {
        Name: v('s', 'hci0'),
        Powered: v('b', true),
        Address: v('s', '00:11:22:33:44:55'),
      },
    },
  };
  const status = await readBluetoothStatus({}, { systemBus: () => bluezBus(objects) });
  assert.equal(status.adapterPowered, true);
  assert.equal(status.adapterName, 'hci0');
});

test('readBluetoothStatus hfpConnected requires AG UUID not ACL alone', async () => {
  const objects = {
    '/org/bluez/hci0': {
      'org.bluez.Adapter1': { Name: v('s', 'hci0'), Powered: v('b', true), Address: v('s', 'aa') },
    },
    '/org/bluez/dev1': {
      'org.bluez.Device1': {
        Alias: v('s', 'Phone'),
        Paired: v('b', true),
        Connected: v('b', true),
        UUIDs: v('as', [HFP]),
      },
    },
  };
  const status = await readBluetoothStatus({}, { systemBus: () => bluezBus(objects) });
  assert.equal(status.pairedPhone.alias, 'Phone');
  assert.equal(status.pairedPhone.hfpConnected, false);
});

test('readBluetoothStatus hfpConnected true with Hands-Free Audio Gateway UUID', async () => {
  const objects = {
    '/org/bluez/hci0': {
      'org.bluez.Adapter1': { Name: v('s', 'hci0'), Powered: v('b', true), Address: v('s', 'aa') },
    },
    '/org/bluez/dev1': {
      'org.bluez.Device1': {
        Alias: v('s', 'Phone'),
        Paired: v('b', true),
        Connected: v('b', false),
        UUIDs: v('as', [v('s', HFP_AG)]),
      },
    },
  };
  const status = await readBluetoothStatus({}, { systemBus: () => bluezBus(objects) });
  assert.equal(status.pairedPhone.hfpConnected, true);
});
