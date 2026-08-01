// Session handling for the external Starforge API. Its access token is opaque:
// it cannot be refreshed or decoded client-side, so a 401 always means re-login.
import { getLocale } from '@/i18n/locale.js';
import { apiUrl, isLocalApiMode } from './apiConfig.js';
import { ApiError } from './apiError.js';

const STORAGE_KEY = 'sf-session-access';
const DEVICE_KEY = 'sf-device-id';
const AUTH_EVENT = 'sf:auth-changed';
// Staff, teacher, student, and parent credentials are role-native on the current
// backend. Keep the old bridge login available only as an explicit compatibility
// override instead of silently sending every role account to the wrong endpoint.
const AUTH_ENDPOINT = import.meta.env?.VITE_AUTH_ENDPOINT || 'role-login';
const LOGIN_PATH = isLocalApiMode()
  ? 'auth/login'
  : AUTH_ENDPOINT === 'legacy-login'
    ? 'auth/login/'
    : 'auth/role-login/';
const LOGOUT_PATH = isLocalApiMode() ? 'auth/logout' : 'auth/logout/';

let token = readStorage(STORAGE_KEY);

function readStorage(key) {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private browsing or storage restrictions should not prevent an in-memory session.
  }
}

function notifySessionChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EVENT));
}

function parsePayload(response) {
  return response.json().catch(() => null);
}

function unwrap(payload) {
  if (payload && payload.success === true && Object.hasOwn(payload, 'data')) return payload.data;
  return payload;
}

function stableDeviceId() {
  const existing = readStorage(DEVICE_KEY);
  if (existing) return existing;

  const value =
    globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeStorage(DEVICE_KEY, value);
  return value;
}

export function getToken() {
  return token;
}

export function setToken(next) {
  token = typeof next === 'string' && next ? next : null;
  writeStorage(STORAGE_KEY, token);
  notifySessionChange();
}

export function clearToken() {
  setToken(null);
}

export function subscribeToSession(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

/** Sign in once; callers are responsible for rendering the form and errors. */
export async function login({ username, password }) {
  const response = await fetch(apiUrl(LOGIN_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': getLocale(),
    },
    body: JSON.stringify({
      username: String(username ?? '').trim(),
      password: String(password ?? ''),
      device_id: stableDeviceId(),
      platform: 'web',
    }),
  });
  const payload = await parsePayload(response);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      response.status,
      'POST',
      LOGIN_PATH,
      payload,
      response.headers.get('Retry-After'),
    );
  }

  const data = unwrap(payload);
  const access = data?.access ?? data?.token;
  if (typeof access !== 'string' || !access) {
    throw new ApiError(500, 'POST', LOGIN_PATH, {
      code: 'invalid_auth_response',
      message: 'The server did not return a session token.',
    });
  }

  setToken(access);
  return data;
}

/** End the server-side session when possible, then always remove it locally. */
export async function logout() {
  const current = getToken();
  if (!current) return;

  try {
    const response = await fetch(apiUrl(LOGOUT_PATH), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${current}`,
        'Accept-Language': getLocale(),
      },
    });
    const payload = response.status === 204 ? null : await parsePayload(response);
    if (!response.ok && response.status !== 401) {
      throw new ApiError(
        response.status,
        'POST',
        LOGOUT_PATH,
        payload,
        response.headers.get('Retry-After'),
      );
    }
  } finally {
    clearToken();
  }
}
