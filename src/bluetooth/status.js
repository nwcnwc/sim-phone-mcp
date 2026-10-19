import dbus from 'dbus-next';

const BLUEZ = 'org.bluez';

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
          name: a.Name || objPath,
          powered: a.Powered === true,
          address: a.Address || '',
        });
      }
      if (ifaces['org.bluez.Device1']) {
        const d = ifaces['org.bluez.Device1'];
        devices.push({
          path: objPath,
          alias: d.Alias || d.Name || objPath,
          paired: d.Paired === true,
          connected: d.Connected === true,
          uuids: d.UUIDs || [],
        });
      }
    }
    const adapter = adapterPathFromConfig(cfg, adapters);
    const powered = adapter ? adapter.powered : false;
    const adapterName = adapter ? adapter.name : null;
    const phone = devices.find((d) => d.paired && d.connected)
      || devices.find((d) => d.paired)
      || null;
    const hfpUuid = '0000111e-0000-1000-8000-00805f9b34fb';
    const hfpConnected = phone
      ? phone.connected && (phone.uuids.includes(hfpUuid) || phone.connected)
      : false;
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
