import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function tmpHome(prefix = 'sim-phone-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
