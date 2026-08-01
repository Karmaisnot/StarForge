// Central API configuration. In production the SPA is served by the tenant host,
// so an empty base URL deliberately keeps requests same-origin. During local
// development Vite can proxy the same relative /api path to a tenant backend.

const rawBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';
const rawSource = import.meta.env?.VITE_DATA_SOURCE;

// `VITE_USE_MOCK` is retained as a compatibility fallback for existing setups.
// New deployments should select an explicit source so the local Fastify API and
// the legacy tenant API cannot be confused.
export const DATA_SOURCE = ['mock', 'local', 'remote'].includes(rawSource)
  ? rawSource
  : import.meta.env?.VITE_USE_MOCK === 'false'
    ? 'remote'
    : 'mock';

export const API_PREFIX = DATA_SOURCE === 'local' ? '/api' : '/api/v1';
export const API_MODE = DATA_SOURCE !== 'mock';
export const LOCAL_API_MODE = DATA_SOURCE === 'local';

const baseUrl = rawBaseUrl.replace(/\/+$/, '');
const baseAlreadyVersioned = baseUrl.endsWith(API_PREFIX);

function normalizePath(path) {
  const value = String(path ?? '');
  if (value.startsWith(`${API_PREFIX}/`) || value === API_PREFIX) return value;
  return `${API_PREFIX}/${value.replace(/^\/+/, '')}`;
}

/** Resolve an API path against the configured origin and selected API prefix. */
export function apiUrl(path) {
  const normalized = normalizePath(path);
  // Accept either a tenant origin (`https://tenant.example`) or a fully
  // versioned base (`https://tenant.example/api/v1`) in VITE_API_BASE_URL.
  return `${baseUrl}${baseAlreadyVersioned ? normalized.slice(API_PREFIX.length) : normalized}`;
}

/** True only when the application is intentionally configured for API data. */
export function isApiMode() {
  return API_MODE;
}

/** True when requests are served by the Fastify API included in this project. */
export function isLocalApiMode() {
  return LOCAL_API_MODE;
}
