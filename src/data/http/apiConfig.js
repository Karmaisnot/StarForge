// Browser API configuration. Production traffic is deliberately same-origin:
// the public web host proxies /api to the tenant backend, so HttpOnly session
// cookies work without CORS exceptions or exposing an API origin in the bundle.

const rawSource = import.meta.env?.VITE_DATA_SOURCE;

export const DATA_SOURCE = ['mock', 'local', 'remote'].includes(rawSource)
  ? rawSource
  : 'remote';

export const API_PREFIX = DATA_SOURCE === 'local' ? '/api' : '/api/v1';
export const API_MODE = DATA_SOURCE !== 'mock';
export const LOCAL_API_MODE = DATA_SOURCE === 'local';

function normalizePath(path) {
  const value = String(path ?? '').trim();
  if (!value || value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value)) {
    throw new TypeError('API paths must be non-empty same-origin paths.');
  }

  if (value === API_PREFIX || value.startsWith(`${API_PREFIX}/`)) return value;
  return `${API_PREFIX}/${value.replace(/^\/+/, '')}`;
}

/** Resolve a repository path to the app's same-origin API namespace. */
export function apiUrl(path) {
  return normalizePath(path);
}

export function isApiMode() {
  return API_MODE;
}

export function isLocalApiMode() {
  return LOCAL_API_MODE;
}
