import { test } from 'node:test';
import assert from 'node:assert/strict';
import dbus from 'dbus-next';
import { busHasName, parseModems } from '../../src/telephony/dbus-util.js';

const { DBusError } = dbus;

function v(sig, value) {
  return { signature: sig, value };
}

test('parseModems object map', () => {
  const m = parseModems({ '/m1': { Online: true, Name: 'A' } });
  assert.equal(m[0].path, '/m1');
  assert.equal(m[0].online, true);
});

test('parseModems array pairs', () => {
  const m = parseModems([['/m2', { Online: false, Name: 'B' }]]);
  assert.equal(m[0].name, 'B');
});

test('parseModems unwraps Variant Online and Name', () => {
  const m = parseModems({
    '/m3': { Online: v('b', true), Name: v('s', 'Modem') },
  });
  assert.equal(m[0].online, true);
  assert.equal(m[0].name, 'Modem');
});

test('busHasName true when GetNameOwner succeeds', async () => {
  const bus = {
    call: async () => ({ body: [':1.42'] }),
  };
  assert.equal(await busHasName(bus, 'org.ofono'), true);
});

test('busHasName false when name has no owner', async () => {
  const bus = {
    call: async () => {
      throw new DBusError('org.freedesktop.DBus.Error.NameHasNoOwner', 'not found');
    },
  };
  assert.equal(await busHasName(bus, 'org.missing'), false);
});

test('busHasName false on other dbus errors', async () => {
  const bus = {
    call: async () => {
      throw new DBusError('org.freedesktop.DBus.Error.AccessDenied', 'nope');
    },
  };
  assert.equal(await busHasName(bus, 'org.ofono'), false);
});
