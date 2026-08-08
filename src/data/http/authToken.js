// Session handling for the tenant API. The production Django service uses an
// OTP exchange and JWT pair; the bundled local server remains password-based
// for isolated development only.
import { getLocale } from '@/i18n/locale.js';
import { apiUrl, isLocalApiMode } from './apiConfig.js';
import { ApiError } from './apiError.js';

const STORAGE_KEY = 'sf-session-access';
const REFRESH_STORAGE_KEY = 'sf-session-refresh';
const DEVICE_KEY = 'sf-device-id';
const AUTH_EVENT = 'sf:auth-changed';
const configuredStrategy = import.meta.env?.VITE_AUTH_STRATEGY;
const legacyEndpoint = import.meta.env?.VITE_AUTH_ENDPOINT;
const REMOTE_STRATEGY = configuredStrategy ?? (legacyEndpoint ? 'password' : 'otp');
const LOCAL_LOGIN_PATH = 'auth/login';
const REMOTE_LOGIN_PATH = legacyEndpoint
  ? legacyEndpoint.replace(/^\/+|\/+$/g, '')
  : 'auth/role-login/';

let token = readStorage(STORAGE_KEY);
let refreshToken = readStorage(REFRESH_STORAGE_KEY);

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

export function getToken() {
  return token;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setToken(next) {
  token = typeof next === 'string' && next ? next : null;
  writeStorage(STORAGE_KEY, token);
  notifySessionChange();
}

export function setSession({ access, refresh } = {}) {
  token = typeof access === 'string' && access ? access : null;
  refreshToken = typeof refresh === 'string' && refresh ? refresh : null;
  writeStorage(STORAGE_KEY, token);
  writeStorage(REFRESH_STORAGE_KEY, refreshToken);
  notifySessionChange();
}

export function clearToken() {
  token = null;
  refreshToken = null;
  writeStorage(STORAGE_KEY, null);
  writeStorage(REFRESH_STORAGE_KEY, null);
  notifySessionChange();
}

export function subscribeToSession(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

/** True for the production backend's phone/email + one-time-code flow. */
export function usesOtpAuth() {
  return !isLocalApiMode() && REMOTE_STRATEGY === 'otp';
}

/** Ask the Django tenant backend to send an OTP to a phone number or email. */
export async function requestOtp(identifier) {
  const path = 'auth/otp/request/';
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': getLocale() },
    body: JSON.stringify({ identifier: String(identifier ?? '').trim() }),
  });
  const payload = await parsePayload(response);
  if (!response.ok) throw authError(response, 'POST', path, payload);
  return unwrap(payload);
}

/** Verify an OTP and persist the access/refresh JWT pair returned by Django. */
export async function verifyOtp(identifier, code) {
  const path = 'auth/otp/verify/';
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': getLocale() },
    body: JSON.stringify({
      identifier: String(identifier ?? '').trim(),
      code: String(code ?? '').trim(),
    }),
  });
  const payload = await parsePayload(response);
  if (!response.ok) throw authError(response, 'POST', path, payload);
  const data = unwrap(payload);
  if (!data?.access) {
    throw new ApiError(500, 'POST', path, {
      code: 'invalid_auth_response',
      message: 'The server did not return a session token.',
    });
  }
  setSession(data);
  return data;
}

/** Password bridge used only by the bundled local server or an explicit legacy setting. */
export async function login({ username, password }) {
  const path = isLocalApiMode() ? LOCAL_LOGIN_PATH : REMOTE_LOGIN_PATH;
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
  setSession({ access, refresh: data?.refresh });
  return data;
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
      body: !isLocalApiMode() && refreshToken ? JSON.stringify({ refresh: refreshToken }) : undefined,
    });
    const payload = await parsePayload(response);
    if (!response.ok && response.status !== 401) throw authError(response, 'POST', path, payload);
  } finally {
    clearToken();
  }
}
