/** Tool access modes after owner-looking calls. */

const DECOY_ALLOWED = new Set(['speak', 'listen', 'hang_up']);

export function createCallGate() {
  let mode = 'idle';
  let decoyTimer = null;

  function clearDecoyTimer() {
    if (decoyTimer) {
      clearTimeout(decoyTimer);
      decoyTimer = null;
    }
  }

  return {
    get mode() {
      return mode;
    },

    reset() {
      mode = 'idle';
      clearDecoyTimer();
    },

    setVerified() {
      mode = 'verified';
      clearDecoyTimer();
    },

    enterDecoy(delayMs, onTimeout) {
      mode = 'decoy';
      clearDecoyTimer();
      if (onTimeout && delayMs > 0) {
        decoyTimer = setTimeout(() => {
          decoyTimer = null;
          onTimeout();
        }, delayMs);
      }
    },

    canInvokeTool(toolName) {
      if (mode === 'idle' || mode === 'verified') {
        return { allowed: true };
      }
      if (mode === 'decoy') {
        if (DECOY_ALLOWED.has(toolName)) {
          return { allowed: true };
        }
        return {
          allowed: false,
          message:
            'Decoy mode: this tool is disabled. Only casual speak/listen and hang_up are available; no calls, status, or private actions.',
        };
      }
      return { allowed: true };
    },
  };
}

export { DECOY_ALLOWED };
