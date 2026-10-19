import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answersMatch, isSilentTranscript } from '../../src/security/answer-match.js';
import { hashAnswerForConfig, loadChallengeSettings } from '../../src/security/challenge-config.js';

test('hash-based verification matches normalized answer', () => {
  const hashed = hashAnswerForConfig('open sesame');
  const challenge = loadChallengeSettings({
    challenge: {
      phrase: 'Say the words.',
      ...hashed,
    },
  }, {});
  assert.equal(challenge.enabled, true);
  assert.equal(challenge.verifyTranscript('Open, sesame!'), true);
  assert.equal(challenge.verifyTranscript('closed'), false);
});

test('isSilentTranscript', () => {
  assert.equal(isSilentTranscript(null), true);
  assert.equal(isSilentTranscript(''), true);
  assert.equal(isSilentTranscript('hi'), false);
});

test('edit distance tolerance', () => {
  assert.equal(answersMatch('sesame seed', 'sesame see', { max_edit_distance: 2 }), true);
});
