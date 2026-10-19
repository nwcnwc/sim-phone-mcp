import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBackendPreference } from '../../src/telephony/probe.js';

test('auto prefers pipewire when present', () => {
  assert.equal(resolveBackendPreference('auto', { pipewire: true, ofono: true }), 'pipewire');
});

test('auto falls back to ofono', () => {
  assert.equal(resolveBackendPreference('auto', { pipewire: false, ofono: true }), 'ofono');
});

test('forced pipewire when missing returns null', () => {
  assert.equal(resolveBackendPreference('pipewire', { pipewire: false, ofono: true }), null);
});
