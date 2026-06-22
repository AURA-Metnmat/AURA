const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptState {
  failures: number;
  lockedUntil: number | null;
}

const attemptsByIp = new Map<string, AttemptState>();

function getState(ip: string): AttemptState {
  const existing = attemptsByIp.get(ip);
  if (existing) return existing;
  const state = { failures: 0, lockedUntil: null };
  attemptsByIp.set(ip, state);
  return state;
}

export function checkAdminLoginAllowed(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const state = getState(ip);
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000),
    };
  }
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    state.failures = 0;
    state.lockedUntil = null;
  }
  return { allowed: true };
}

export function recordAdminLoginFailure(ip: string): void {
  const state = getState(ip);
  state.failures += 1;
  if (state.failures >= MAX_FAILURES) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
  }
}

export function clearAdminLoginSuccess(ip: string): void {
  attemptsByIp.delete(ip);
}
