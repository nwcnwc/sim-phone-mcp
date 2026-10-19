import fs from 'node:fs';
import path from 'node:path';

const PENDING = 'owner-notify-pending.jsonl';

/**
 * Append a hook record for the bot to pick up on its normal channel (no network from server).
 */
export function enqueueOwnerNotification(home, payload) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    type: 'challenge_failure',
    caller: payload.caller || '',
    reason: payload.reason || 'challenge_failed',
  });
  fs.mkdirSync(home, { recursive: true });
  fs.appendFileSync(path.join(home, PENDING), line + '\n', { mode: 0o600 });
}

export function readPendingNotifications(home) {
  const p = path.join(home, PENDING);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
