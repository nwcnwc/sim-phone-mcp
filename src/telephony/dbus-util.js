import dbus from 'dbus-next';

const { Message } = dbus;

/** Unwrap dbus-next Variant { signature, value } (or pass through scalars). */
export function dbusValue(v) {
  if (v != null && typeof v === 'object' && 'signature' in v && 'value' in v) {
    return v.value;
  }
  return v;
}

export async function busHasName(bus, name) {
  try {
    const methodCall = new Message({
      destination: 'org.freedesktop.DBus',
      path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus',
      member: 'GetNameOwner',
      signature: 's',
      body: [name],
    });
    await bus.call(methodCall);
    return true;
  } catch (err) {
    if (err?.type === 'org.freedesktop.DBus.Error.NameHasNoOwner') {
      return false;
    }
    return false;
  }
}

export function sessionBus() {
  return dbus.sessionBus();
}

export function systemBus() {
  return dbus.systemBus();
}

/** Parse GetModems() → [{ path, name, online }] (object map or array of pairs). */
export function parseModems(result) {
  const out = [];
  if (!result) return out;
  const pairs = Array.isArray(result) ? result : Object.entries(result);
  for (const entry of pairs) {
    const modemPath = entry[0];
    const props = entry[1] || {};
    const online = dbusValue(props.Online) === true;
    const name = dbusValue(props.Name) || modemPath;
    out.push({ path: modemPath, name, online: !!online });
  }
  return out;
}

export async function pickOnlineModem(bus, service, rootPath) {
  const obj = await bus.getProxyObject(service, rootPath);
  const mgr = obj.getInterface('org.ofono.Manager');
  const modems = parseModems(await mgr.GetModems());
  const online = modems.filter((m) => m.online);
  return online[0] || modems[0] || null;
}
