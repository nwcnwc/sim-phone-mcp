/**
 * Forgiving comparison for spoken challenge answers (STT variance).
 */

const DEFAULT_OPTS = {
  ignore_case: true,
  ignore_punctuation: true,
  collapse_whitespace: true,
  max_edit_distance: 1,
};

export function mergeMatchOpts(fileOpts = {}) {
  return { ...DEFAULT_OPTS, ...fileOpts };
}

export function normalizeAnswerText(text, opts) {
  let s = String(text ?? '');
  if (opts.ignore_case) s = s.toLowerCase();
  if (opts.ignore_punctuation) s = s.replace(/[^\p{L}\p{N}\s]/gu, '');
  if (opts.collapse_whitespace) s = s.replace(/\s+/g, ' ').trim();
  else s = s.trim();
  return s;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

export function answersMatch(transcript, expectedAnswer, opts = DEFAULT_OPTS) {
  const o = mergeMatchOpts(opts);
  const a = normalizeAnswerText(transcript, o);
  const b = normalizeAnswerText(expectedAnswer, o);
  if (!a || !b) return false;
  if (a === b) return true;
  const maxDist = Number(o.max_edit_distance);
  if (maxDist > 0) {
    return levenshtein(a, b) <= maxDist;
  }
  return false;
}

export function isSilentTranscript(transcript) {
  if (transcript == null) return true;
  return String(transcript).trim() === '';
}
