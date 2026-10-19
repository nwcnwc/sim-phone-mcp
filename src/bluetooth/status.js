import dbus from 'dbus-next';
import { dbusValue } from '../telephony/dbus-util.js';

const BLUEZ = 'org.bluez';
const HFP_AG_UUID = '0000111f-0000-1000-8000-00805f9b34fb';

function deviceUuids(raw) {
  const list = dbusValue(raw) || [];
  if (!Array.isArray(list)) return [];
  return list.map((u) => String(dbusValue(u)).toLowerCase());
}

function adapterPathFromConfig(cfg, adapters) {
  if (!cfg.btAdapter) return adapters[0] || null;
  const want = cfg.btAdapter;
  const byPath = adapters.find((a) => a.path === want);
  if (byPath) return byPath;
  const byName = adapters.find((a) => a.name === want || a.path.endsWith('/' + want));
  return byName || adapters[0] || null;
}

export async function readBluetoothStatus(cfg, deps = {}) {
  const getBus = deps.systemBus || (() => dbus.systemBus());
  try {
    const bus = getBus();
    const root = await bus.getProxyObject(BLUEZ, '/');
    const mgr = root.getInterface('org.freedesktop.DBus.ObjectManager');
    const objects = await mgr.GetManagedObjects();
    const adapters = [];
    const devices = [];
    for (const [objPath, ifaces] of Object.entries(objects)) {
      if (ifaces['org.bluez.Adapter1']) {
        const a = ifaces['org.bluez.Adapter1'];
        adapters.push({
          path: objPath,
          name: dbusValue(a.Name) || objPath,
          powered: dbusValue(a.Powered) === true,
          address: dbusValue(a.Address) || '',
        });
      }
      if (ifaces['org.bluez.Device1']) {
        const d = ifaces['org.bluez.Device1'];
        devices.push({
          path: objPath,
          alias: dbusValue(d.Alias) || dbusValue(d.Name) || objPath,
          paired: dbusValue(d.Paired) === true,
          connected: dbusValue(d.Connected) === true,
          uuids: deviceUuids(d.UUIDs),
        });
      }
    }
    const adapter = adapterPathFromConfig(cfg, adapters);
    const powered = adapter ? adapter.powered : false;
    const adapterName = adapter ? adapter.name : null;
    const phone = devices.find((d) => d.paired && d.connected)
      || devices.find((d) => d.paired)
      || null;
    const hfpConnected = phone ? phone.uuids.includes(HFP_AG_UUID) : false;
    return {
      adapterPowered: powered,
      adapterName,
      pairedPhone: phone ? { alias: phone.alias, hfpConnected: !!hfpConnected } : null,
    };
  } catch {
    return {
      adapterPowered: false,
      adapterName: null,
      pairedPhone: null,
    };
  }
}
