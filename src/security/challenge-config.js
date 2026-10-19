import crypto from 'node:crypto';
import { mergeMatchOpts, normalizeAnswerText, answersMatch } from './answer-match.js';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function pick(envVal, fileVal) {
  if (envVal !== undefined && envVal !== '') return envVal;
  if (fileVal !== undefined && fileVal !== '') return fileVal;
  return '';
}

function scryptHash(plain, salt) {
  return crypto.scryptSync(plain, salt, 32, SCRYPT_PARAMS);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Build challenge settings from config file + env. Answer material never logged.
 */
export function loadChallengeSettings(file = {}, env = process.env) {
  const block = file.challenge && typeof file.challenge === 'object' ? file.challenge : {};
  const phrase = pick(env.SIMPHONE_CHALLENGE_PHRASE, block.phrase);
  const answerPlain = pick(env.SIMPHONE_CHALLENGE_ANSWER, block.answer);
  const answerHashB64 = block.answer_hash || '';
  const answerSaltB64 = block.answer_salt || '';
  const match = mergeMatchOpts(block.match);
  const decoyMaxSeconds = Number(block.decoy_max_seconds ?? env.SIMPHONE_DECOY_MAX_SECONDS ?? 120);
  const listenSeconds = Number(block.listen_seconds ?? env.SIMPHONE_CHALLENGE_LISTEN_SECONDS ?? 8);
  const intro = pick(env.SIMPHONE_CHALLENGE_INTRO, block.intro)
    || 'This is your assistant on a secured line.';
  const lockout = {
    max_failures: Number(block.lockout?.max_failures ?? 5),
    window_seconds: Number(block.lockout?.window_seconds ?? 3600),
    duration_seconds: Number(block.lockout?.duration_seconds ?? 1800),
  };

  let verifyFn = null;
  if (answerPlain) {
    const expected = String(answerPlain);
    verifyFn = (transcript) => answersMatch(transcript, expected, match);
  } else if (answerHashB64 && answerSaltB64) {
    const hash = Buffer.from(answerHashB64, 'base64');
    const salt = Buffer.from(answerSaltB64, 'base64');
    verifyFn = (transcript) => {
      const normalized = normalizeAnswerText(transcript, match);
      if (!normalized) return false;
      const derived = scryptHash(normalized, salt);
      return timingSafeEqual(derived, hash);
    };
  }

  const enabled = !!(phrase && verifyFn);

  return {
    enabled,
    phrase: String(phrase || ''),
    intro,
    match,
    decoyMaxSeconds: Math.max(30, Math.min(decoyMaxSeconds, 600)),
    listenSeconds: Math.max(3, Math.min(listenSeconds, 30)),
    lockout,
    verifyTranscript(transcript) {
      if (!verifyFn) return false;
      return verifyFn(transcript);
    },
  };
}

/** Hash a normalized answer for storage in local config (optional migration). */
export function hashAnswerForConfig(plainAnswer, matchOpts = {}) {
  const normalized = normalizeAnswerText(plainAnswer, mergeMatchOpts(matchOpts));
  const salt = crypto.randomBytes(16);
  const hash = scryptHash(normalized, salt);
  return {
    answer_hash: hash.toString('base64'),
    answer_salt: salt.toString('base64'),
  };
}
