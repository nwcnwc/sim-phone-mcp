/** Find HFP uplink (host → phone) and downlink (phone → host) nodes in pw-dump JSON. */

function nodeProps(node) {
  return node?.info?.props || node?.props || {};
}

function nodeName(node) {
  const p = nodeProps(node);
  return String(p['node.name'] || p['application.name'] || '');
}

function mediaClass(node) {
  return String(nodeProps(node)['media.class'] || '');
}

export function findHfpUplinkNode(dump) {
  if (!Array.isArray(dump)) return null;
  for (const item of dump) {
    if (item.type !== 'PipeWire:Interface:Node') continue;
    const name = nodeName(item).toLowerCase();
    const cls = mediaClass(item).toLowerCase();
    // HF uplink: capture/source feeding the phone (bluez input on the HF unit).
    if (name.includes('bluez') && name.includes('input')) {
      return { id: item.id, name: nodeName(item), mediaClass: cls };
    }
    if (cls.includes('stream/input/audio') && name.includes('headset')) {
      return { id: item.id, name: nodeName(item), mediaClass: cls };
    }
  }
  return null;
}

export function findHfpDownlinkNode(dump) {
  if (!Array.isArray(dump)) return null;
  for (const item of dump) {
    if (item.type !== 'PipeWire:Interface:Node') continue;
    const name = nodeName(item).toLowerCase();
    const cls = mediaClass(item).toLowerCase();
    if (name.includes('bluez') && name.includes('output')) {
      return { id: item.id, name: nodeName(item), mediaClass: cls };
    }
    if (cls.includes('stream/output/audio') && name.includes('headset')) {
      return { id: item.id, name: nodeName(item), mediaClass: cls };
    }
  }
  return null;
}
