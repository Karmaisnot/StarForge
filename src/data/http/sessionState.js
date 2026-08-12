export const AUTH_SESSION_CHANGED = 'sf:auth-session-changed';
export const AUTH_SESSION_INVALIDATED = 'sf:auth-session-invalidated';

const initialStatus = 'checking';

let snapshot = Object.freeze({
  status: initialStatus,
  user: null,
  features: [],
  error: null,
  reason: null,
});

export function getSessionSnapshot() {
  return snapshot;
}

export function setSessionSnapshot(next, reason = 'updated') {
  snapshot = Object.freeze({
    status: next?.status ?? 'anonymous',
    user: next?.user ?? null,
    features: Array.isArray(next?.features) ? next.features : [],
    error: next?.error ?? null,
    reason: next?.reason ?? null,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_CHANGED, { detail: { reason, snapshot } }),
    );
  }
  return snapshot;
}

export function invalidateSession(reason = 'unauthorized') {
  setSessionSnapshot({ status: 'anonymous' }, reason);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALIDATED, { detail: { reason } }));
  }
}

export function subscribeToSession(listener) {
  if (typeof window === 'undefined') return () => {};
  const update = () => listener(getSessionSnapshot());
  window.addEventListener(AUTH_SESSION_CHANGED, update);
  return () => window.removeEventListener(AUTH_SESSION_CHANGED, update);
}

export function resetSessionStateForTests() {
  snapshot = Object.freeze({
    status: initialStatus,
    user: null,
    features: [],
    error: null,
    reason: null,
  });
}
