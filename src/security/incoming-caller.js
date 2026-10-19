import { normalizeNumber } from '../phone/normalize.js';

/** True when telephony reports an incoming call from the configured owner number. */
export function isOwnerIncomingCall(owner, telephonyState) {
  if (!owner || !telephonyState?.calls?.length) return false;
  let ownerNorm;
  try {
    ownerNorm = normalizeNumber(owner);
  } catch {
    return false;
  }
  const incoming = telephonyState.calls.find(
    (c) => c.state === 'incoming' || c.state === 'alerting',
  );
  if (!incoming?.lineIdentification) return false;
  try {
    return normalizeNumber(incoming.lineIdentification) === ownerNorm;
  } catch {
    return false;
  }
}

export function incomingCallerId(telephonyState) {
  const incoming = telephonyState?.calls?.find(
    (c) => c.state === 'incoming' || c.state === 'alerting',
  );
  if (!incoming?.lineIdentification) return '';
  try {
    return normalizeNumber(incoming.lineIdentification);
  } catch {
    return '';
  }
}
