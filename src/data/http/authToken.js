// Session handling for staff accounts. Authentication is permanently based on
// username and password. Production uses the remote role-login endpoint.
import { getLocale } from '@/i18n/locale.js';
import { apiUrl, isLocalApiMode } from './apiConfig.js';
import { ApiError } from './apiError.js';

const STORAGE_KEY = 'sf-session-access';
const PASSWORD_CHANGE_STORAGE_KEY = 'sf-session-password-change-required';
const DEVICE_KEY = 'sf-device-id';
const AUTH_EVENT = 'sf:auth-changed';
const AUTH_ENDPOINT = import.meta.env?.VITE_AUTH_ENDPOINT || 'role-login';
const LOCAL_LOGIN_PATH = 'auth/login';
const normalizedRemoteEndpoint = AUTH_ENDPOINT?.replace(/^\/+|\/+$/g, '');
const REMOTE_LOGIN_PATH = normalizedRemoteEndpoint
  ? `${normalizedRemoteEndpoint.startsWith('auth/') ? normalizedRemoteEndpoint : `auth/${normalizedRemoteEndpoint}`}/`
  : null;

let token = readStorage(STORAGE_KEY);
let passwordChangeRequired = readStorage(PASSWORD_CHANGE_STORAGE_KEY) === 'true';

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

async function parsePayload(response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

function unwrap(payload) {
  if (payload && payload.success === true && Object.hasOwn(payload, 'data')) return payload.data;
  return payload;
}

function authError(response, method, path, payload) {
  return new ApiError(response.status, method, path, payload, response.headers.get('Retry-After'));
}

function stableDeviceId() {
  const existing = readStorage(DEVICE_KEY);
  if (existing) return existing;

  const value =
    globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeStorage(DEVICE_KEY, value);
  return value;
}

function responseRequiresPasswordChange(data) {
  return Boolean(
    data?.mustChangePassword ??
      data?.must_change_password ??
      data?.passwordChangeRequired ??
      data?.password_change_required,
  );
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
  token = null;
  passwordChangeRequired = false;
  writeStorage(STORAGE_KEY, null);
  writeStorage(PASSWORD_CHANGE_STORAGE_KEY, null);
  notifySessionChange();
}

/** Whether the active session may only replace a temporary password. */
export function requiresPasswordChange() {
  return Boolean(token && passwordChangeRequired);
}

/** Set when the API says the session is restricted to a password change. */
export function markPasswordChangeRequired() {
  passwordChangeRequired = true;
  writeStorage(PASSWORD_CHANGE_STORAGE_KEY, 'true');
  notifySessionChange();
}

function markPasswordChangeComplete() {
  passwordChangeRequired = false;
  writeStorage(PASSWORD_CHANGE_STORAGE_KEY, null);
  notifySessionChange();
}

export function subscribeToSession(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

/** Authenticate a staff user with username and password. */
export async function login({ username, password }) {
  const path = isLocalApiMode() ? LOCAL_LOGIN_PATH : REMOTE_LOGIN_PATH;
  if (!path) {
    throw new ApiError(500, 'POST', 'auth/login', {
      code: 'auth_endpoint_not_configured',
      message: 'This deployment has no configured username/password login endpoint.',
    });
  }
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': getLocale() },
    body: JSON.stringify({
      username: String(username ?? '').trim(),
      password: String(password ?? ''),
      device_id: stableDeviceId(),
      platform: 'web',
    }),
  });
  const payload = await parsePayload(response);
  if (!response.ok || payload?.success === false) throw authError(response, 'POST', path, payload);

  const data = unwrap(payload);
  const access = data?.access ?? data?.token;
  if (typeof access !== 'string' || !access) {
    throw new ApiError(500, 'POST', path, {
      code: 'invalid_auth_response',
      message: 'The server did not return a session token.',
    });
  }
  token = access;
  passwordChangeRequired = responseRequiresPasswordChange(data);
  writeStorage(STORAGE_KEY, token);
  writeStorage(PASSWORD_CHANGE_STORAGE_KEY, passwordChangeRequired ? 'true' : null);
  notifySessionChange();
  return data;
}

/** Replace a temporary password before any staff workspace can be opened. */
export async function changePassword({ currentPassword, newPassword }) {
  const current = getToken();
  if (!current) {
    throw new ApiError(401, 'POST', 'auth/change-password', {
      code: 'authentication_failed',
      message: 'Your session has ended. Please sign in again.',
    });
  }

  const path = isLocalApiMode() ? 'auth/change-password' : 'auth/change-password/';
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${current}`,
      'Content-Type': 'application/json',
      'Accept-Language': getLocale(),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const payload = await parsePayload(response);
  if (!response.ok || payload?.success === false) throw authError(response, 'POST', path, payload);

  markPasswordChangeComplete();
  return unwrap(payload);
}

/** End the server-side session when possible, then always remove it locally. */
export async function logout() {
  const current = getToken();
  if (!current) return;

  const path = isLocalApiMode() ? 'auth/logout' : 'auth/logout/';
  try {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${current}`,
        'Accept-Language': getLocale(),
        ...(isLocalApiMode() ? {} : { 'Content-Type': 'application/json' }),
      },
      body: undefined,
    });
    const payload = await parsePayload(response);
    if (!response.ok && response.status !== 401) throw authError(response, 'POST', path, payload);
  } finally {
    clearToken();
  }
}
