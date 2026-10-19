import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findHfpDownlinkNode, findHfpUplinkNode } from '../../src/audio/pipewire-nodes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/pw-dump-hfp.json'), 'utf8'));

test('finds bluez HFP nodes', () => {
  const up = findHfpUplinkNode(dump);
  const down = findHfpDownlinkNode(dump);
  assert.equal(up.id, 101);
  assert.equal(down.id, 102);
});
