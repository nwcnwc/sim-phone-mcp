import fs from 'node:fs';
import path from 'node:path';

const FILE = 'challenge-failures.jsonl';

export function failureLogPath(home) {
  return path.join(home, FILE);
}

export function appendChallengeFailure(home, entry) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    caller: entry.caller || '',
    reason: entry.reason || 'challenge_failed',
    direction: entry.direction || '',
  });
  fs.mkdirSync(home, { recursive: true });
  fs.appendFileSync(failureLogPath(home), line + '\n', { mode: 0o600 });
}

export function readChallengeFailures(home) {
  const p = failureLogPath(home);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
