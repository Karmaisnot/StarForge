// Staff browser-session lifecycle. Production credentials live exclusively in
// the backend's HttpOnly cookie; this module stores only identity presentation
// state and non-secret cross-tab notifications.
import { isApiMode } from './apiConfig.js';
import { ApiError } from './apiError.js';
import {
  configureHttpSessionPolicy,
  httpClient,
  resetHttpSessionPolicy,
} from './httpClient.js';
import {
  AUTH_SESSION_CHANGED,
  getSessionSnapshot,
  setSessionSnapshot,
  subscribeToSession,
} from './sessionState.js';

export { AUTH_SESSION_CHANGED, getSessionSnapshot, subscribeToSession };

const DEVICE_KEY = 'sf-staff-device';
const SESSION_SIGNAL_KEY = 'sf-staff-session-epoch';
const LOGOUT_SIGNAL_KEY = 'sf-staff-logout-epoch';
const LEGACY_KEYS = ['sf-session-access', 'sf-session-password-change-required'];
const BLOCKED_ROLE_TOKENS = new Set([
  'ceo',
  'owner',
  'director',
  'manager',
  'administrator',
  'admin',
]);
const BLOCKED_ROLE_PHRASES = ['chief-executive', 'head-of-department', 'head-of-dept'];

let hydrationRequest = null;

function removeLegacyCredentials() {
  for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      LEGACY_KEYS.forEach((key) => storage?.removeItem(key));
    } catch {
      // A blocked storage API cannot weaken the cookie-owned session.
    }
  }
}

function deviceId() {
  try {
    let value = sessionStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() ??
        `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  } catch {
    return '';
  }
}

function broadcast(key, reason) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ reason, at: Date.now(), nonce: Math.random().toString(16).slice(2) }),
    );
  } catch {
    // Other tabs still validate the shared cookie on their next request.
  }
}

function clearLocalSession({ reason = 'signed-out', failure = null } = {}) {
  hydrationRequest = null;
  resetHttpSessionPolicy();
  removeLegacyCredentials();
  try {
    sessionStorage.removeItem(DEVICE_KEY);
  } catch {
    // The in-memory transition still completes when browser storage is blocked.
  }
  setSessionSnapshot(
    failure
      ? {
          status: 'signout-unconfirmed',
          error: failure,
          reason: 'Private data was cleared, but the server could not confirm sign-out.',
        }
      : { status: 'anonymous' },
    reason,
  );
  broadcast(LOGOUT_SIGNAL_KEY, failure ? 'unconfirmed' : 'confirmed');
}

function normalizedRoleLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roleLabels(user) {
  const memberships = Array.isArray(user?.role_memberships) ? user.role_memberships : [];
  return memberships.flatMap((membership) => [
    membership?.account_type_slug,
    membership?.account_type_name,
    membership?.legacy_role,
    membership?.role,
  ]).filter(Boolean);
}

function hasBlockedManagementRole(user) {
  return roleLabels(user).some((label) => {
    const normalized = normalizedRoleLabel(label);
    const tokens = normalized.split('-').filter(Boolean);
    return (
      tokens.some((token) => BLOCKED_ROLE_TOKENS.has(token)) ||
      BLOCKED_ROLE_PHRASES.some((phrase) => normalized.includes(phrase))
    );
  });
}

function classify(user, features, forcePasswordChange = false) {
  const allowedKind = user?.principal_kind === 'staff' || user?.principal_kind === 'teacher';
  if (!allowedKind || hasBlockedManagementRole(user)) {
    resetHttpSessionPolicy();
    return {
      status: 'forbidden',
      user,
      features,
      reason: 'This role account belongs in a different StarForge application.',
    };
  }
  configureHttpSessionPolicy(user);
  return {
    status: user?.must_change_password || forcePasswordChange
      ? 'password-change'
      : 'authenticated',
    user,
    features,
  };
}

function codeOf(error) {
  return String(error?.code ?? error?.body?.code ?? '').toLowerCase();
}

/** Validate the shared cookie and the backend's staff-only product gate. */
export function hydrateSession({ forcePasswordChange = false } = {}) {
  if (!isApiMode()) {
    return Promise.resolve(
      setSessionSnapshot({ status: 'authenticated', user: null }, 'mock-session'),
    );
  }
  if (hydrationRequest) return hydrationRequest;

  setSessionSnapshot(
    { ...getSessionSnapshot(), status: 'checking', error: null },
    'checking',
  );
  const pending = (async () => {
    const [identityResult, gateResult] = await Promise.allSettled([
      httpClient.get('users/me/', { auth: false, invalidateOnUnauthorized: false }),
      httpClient.get('org/app-status/', { auth: false, invalidateOnUnauthorized: false }),
    ]);

    if (identityResult.status === 'rejected') {
      const error = identityResult.reason;
      resetHttpSessionPolicy();
      if (error?.status === 401) {
        return setSessionSnapshot({ status: 'anonymous' }, 'anonymous');
      }
      return setSessionSnapshot({ status: 'error', error }, 'bootstrap-error');
    }

    const user = identityResult.value;
    const passwordChange = Boolean(user?.must_change_password || forcePasswordChange);
    if (gateResult.status === 'rejected' && !passwordChange) {
      const error = gateResult.reason;
      if (error?.status === 403 && codeOf(error) === 'staff_app_account_required') {
        return setSessionSnapshot(classify(user, []), 'forbidden');
      }
      if (error?.status === 401) {
        resetHttpSessionPolicy();
        return setSessionSnapshot({ status: 'anonymous' }, 'anonymous');
      }
      return setSessionSnapshot({ status: 'error', user, error }, 'bootstrap-error');
    }

    const features = gateResult.status === 'fulfilled' && Array.isArray(gateResult.value?.features)
      ? gateResult.value.features
      : [];
    return setSessionSnapshot(
      classify(user, features, forcePasswordChange),
      passwordChange ? 'password-change-required' : 'authenticated',
    );
  })();

  hydrationRequest = pending;
  void pending.finally(() => {
    if (hydrationRequest === pending) hydrationRequest = null;
  });
  return pending;
}

export function requiresPasswordChange() {
  return getSessionSnapshot().status === 'password-change';
}

export function hasAuthenticatedSession() {
  return ['authenticated', 'password-change', 'forbidden'].includes(
    getSessionSnapshot().status,
  );
}

function validateCredentials(username, password) {
  const cleanUsername = String(username ?? '').trim();
  const exactPassword = String(password ?? '');
  if (!cleanUsername || !exactPassword) {
    throw new ApiError(400, 'POST', 'auth/role-login/', {
      code: 'validation_error',
      message: 'Username and password are required.',
    });
  }
  if (cleanUsername.length > 150 || exactPassword.length > 128 || /\p{Cc}/u.test(cleanUsername) || /\p{Cc}/u.test(exactPassword)) {
    throw new ApiError(400, 'POST', 'auth/role-login/', {
      code: 'validation_error',
      message: 'Check the sign-in details and try again.',
    });
  }
  return { username: cleanUsername, password: exactPassword };
}

/** Authenticate through the role-native endpoint and confirm the resulting cookie. */
export async function login({ username, password }) {
  const credentials = validateCredentials(username, password);
  removeLegacyCredentials();
  const browserSession = await httpClient.get('auth/session/', {
    auth: false,
    invalidateOnUnauthorized: false,
  });
  const result = await httpClient.post(
    'auth/role-login/',
    {
      ...credentials,
      platform: 'web',
      device_id: deviceId(),
    },
    {
      auth: false,
      csrfToken: browserSession?.csrf_token,
      sessionTransport: 'cookie',
      invalidateOnUnauthorized: false,
    },
  );
  const next = await hydrateSession({ forcePasswordChange: Boolean(result?.must_change_password) });
  if (next.status === 'anonymous') {
    throw new ApiError(401, 'GET', 'users/me/', {
      code: 'authentication_failed',
      message: 'The browser session could not be confirmed.',
    });
  }
  if (next.status === 'error') throw next.error;
  broadcast(SESSION_SIGNAL_KEY, 'signed-in');
  return next;
}

/** Replace a temporary password using the backend's exact request contract. */
export async function changePassword({ currentPassword, newPassword }) {
  const oldPassword = String(currentPassword ?? '');
  const replacement = String(newPassword ?? '');
  if (!oldPassword || !replacement) {
    throw new ApiError(400, 'POST', 'auth/password/change/', {
      code: 'validation_error',
      message: 'Current and new passwords are required.',
    });
  }
  await httpClient.post('auth/password/change/', {
    old_password: oldPassword,
    new_password: replacement,
  });
  const next = await hydrateSession();
  if (next.status !== 'authenticated' && next.status !== 'forbidden') {
    throw next.error ?? new ApiError(409, 'GET', 'users/me/', {
      code: 'session_confirmation_failed',
      message: 'The password change could not be confirmed.',
    });
  }
  broadcast(SESSION_SIGNAL_KEY, 'password-changed');
  return next;
}

/** End the current session and clear private UI state without waiting on the network. */
export async function logout() {
  const revocation = httpClient.post('auth/logout/', undefined, {
      timeout: 4_000,
      invalidateOnUnauthorized: false,
  });
  // The request has already captured the HttpOnly cookie. Drop every private
  // client view now so a current-device sign-out never leaves the workspace
  // visible while the network response is in flight.
  clearLocalSession({ reason: 'signed-out' });
  let failure = null;
  try {
    await revocation;
  } catch (error) {
    if (error?.status !== 401) failure = error;
  }
  if (failure) throw failure;
}

/**
 * Finish a current-session revocation performed by the session register.
 * The server has already invalidated the credential and cleared its cookie;
 * this synchronously drops every private client-side view and informs tabs.
 */
export function finalizeCurrentSessionRevocation() {
  clearLocalSession({ reason: 'current-session-revoked' });
}

if (typeof window !== 'undefined') {
  removeLegacyCredentials();
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_SIGNAL_KEY && event.newValue) void hydrateSession();
    if (event.key === LOGOUT_SIGNAL_KEY && event.newValue) {
      hydrationRequest = null;
      resetHttpSessionPolicy();
      setSessionSnapshot({ status: 'anonymous' }, 'signed-out-in-another-tab');
    }
  });
}
