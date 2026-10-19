import { isSilentTranscript } from './answer-match.js';
import { appendChallengeFailure } from './failure-log.js';
import { enqueueOwnerNotification } from './notify-owner.js';

const DECOY_SIGNOFF =
  'Thanks for calling. I need to go now. Goodbye.';

/**
 * Speak challenge, listen, verify. Never speaks the expected answer.
 */
export async function runOwnerChallenge(ctx, meta = {}) {
  const { challenge, callGate, lockout } = ctx;
  if (!challenge?.enabled) {
    callGate.setVerified();
    return { verified: true, skipped: true };
  }

  const callerKey = meta.caller || 'unknown';
  if (lockout.isLocked(callerKey)) {
    await enterDecoyAfterFailure(ctx, meta, 'lockout');
    return { verified: false, mode: 'decoy', reason: 'lockout' };
  }

  const speak = ctx.challengeSpeak || defaultSpeak;
  const listen = ctx.challengeListen || defaultListen;

  await speak(ctx, `${challenge.intro} ${challenge.phrase}`);
  const { transcript } = await listen(ctx, challenge.listenSeconds);

  if (isSilentTranscript(transcript)) {
    await enterDecoyAfterFailure(ctx, meta, 'silence');
    return { verified: false, mode: 'decoy', reason: 'silence' };
  }

  if (!challenge.verifyTranscript(transcript)) {
    lockout.recordFailure(callerKey);
    await enterDecoyAfterFailure(ctx, meta, 'wrong_answer');
    return { verified: false, mode: 'decoy', reason: 'wrong_answer' };
  }

  callGate.setVerified();
  return { verified: true };
}

async function enterDecoyAfterFailure(ctx, meta, reason) {
  const { challenge, callGate, cfg, telephony } = ctx;
  appendChallengeFailure(cfg.home, {
    caller: meta.caller || '',
    reason,
    direction: meta.direction || '',
  });
  enqueueOwnerNotification(cfg.home, { caller: meta.caller || '', reason });

  const delayMs = (challenge?.decoyMaxSeconds ?? 120) * 1000;
  callGate.enterDecoy(delayMs, async () => {
    try {
      const speak = ctx.challengeSpeak || defaultSpeak;
      await speak(ctx, DECOY_SIGNOFF);
    } catch {
      /* best effort */
    }
    try {
      await telephony.hangUp();
    } catch {
      /* best effort */
    }
    callGate.reset();
  });
}

async function defaultSpeak(ctx, text) {
  const audioUp = ctx.audio.hasUplinkAudio
    ? await ctx.audio.hasUplinkAudio()
    : false;
  if (!audioUp) {
    throw new Error('Call audio is not up yet for challenge speak.');
  }
  const speakFn = ctx.audio.speakOnCall
    || (async (t) => {
      const { speakOnCall } = await import('../audio/speak.js');
      return speakOnCall(ctx.cfg, t, ctx.audio);
    });
  await speakFn(text);
}

async function defaultListen(ctx, seconds) {
  const listenFn = ctx.audio.listenOnCall
    || (async (s) => {
      const { listenOnCall } = await import('../audio/listen.js');
      return listenOnCall(s, ctx.cfg, ctx.audio);
    });
  const result = await listenFn(seconds);
  return { transcript: result.transcript, wavPath: result.wavPath };
}
