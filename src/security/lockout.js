/**
 * In-memory rate limit / lockout per caller id (normalized E.164 or empty).
 */

export function createLockoutTracker(settings) {
  const failures = new Map();

  function prune(now) {
    const windowMs = settings.window_seconds * 1000;
    for (const [key, times] of failures) {
      const kept = times.filter((t) => now - t < windowMs);
      if (kept.length) failures.set(key, kept);
      else failures.delete(key);
    }
  }

  return {
    isLocked(callerKey, now = Date.now()) {
      prune(now);
      const times = failures.get(callerKey) || [];
      if (times.length < settings.max_failures) return false;
      const last = times[times.length - 1];
      return now - last < settings.duration_seconds * 1000;
    },
    recordFailure(callerKey, now = Date.now()) {
      prune(now);
      const times = failures.get(callerKey) || [];
      times.push(now);
      failures.set(callerKey, times);
    },
    reset() {
      failures.clear();
    },
  };
}
