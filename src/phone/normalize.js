/** Normalize to E.164-style: leading + then digits only. */
export function normalizeNumber(input) {
  if (input == null || String(input).trim() === '') {
    throw new Error('A phone number is required.');
  }
  const digits = String(input).replace(/\D/g, '');
  if (!digits) throw new Error('The number has no digits.');
  return '+' + digits;
}
