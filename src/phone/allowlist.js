import { normalizeNumber } from './normalize.js';

export function buildAllowlist(owner, allowRaw) {
  const list = [];
  const seen = new Set();
  function add(raw) {
    const n = normalizeNumber(raw);
    if (seen.has(n)) return;
    seen.add(n);
    list.push(n);
  }
  if (owner && String(owner).trim()) add(owner);
  if (allowRaw && String(allowRaw).trim()) {
    for (const part of String(allowRaw).split(',')) {
      const t = part.trim();
      if (t) add(t);
    }
  }
  return list;
}

export function isAllowed(number, allowlist) {
  const n = normalizeNumber(number);
  return allowlist.includes(n);
}

export const DISALLOWED_MESSAGE =
  'That number is not on your allowlist. Only your owner number and numbers you explicitly allow can be dialed. Do not try other numbers.';
