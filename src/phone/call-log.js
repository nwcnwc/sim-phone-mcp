import fs from 'node:fs';
import path from 'node:path';

export function callLogPath(home) {
  return path.join(home, 'call-log.jsonl');
}

export function appendCallLog(home, entry) {
  const file = callLogPath(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const line = JSON.stringify({
    time: entry.time || new Date().toISOString(),
    direction: entry.direction,
    number: entry.number,
    action: entry.action,
    result: entry.result,
  });
  fs.appendFileSync(file, line + '\n', 'utf8');
}

export function readCallLog(home) {
  const file = callLogPath(home);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
