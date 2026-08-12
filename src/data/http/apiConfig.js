// Central API configuration. Production staff traffic goes directly to the
// deployed StarForge API; localhost is used only by the explicit dev:local command.

const rawSource = import.meta.env?.VITE_DATA_SOURCE;
export const PRODUCTION_API_ORIGIN = 'https://starforge.78.111.91.113.nip.io';

// Production is remote by default. Local mode is opt-in and set solely by
// scripts/dev-local.mjs for an isolated developer stack.
export const DATA_SOURCE = ['mock', 'local', 'remote'].includes(rawSource)
  ? rawSource
  : 'remote';

export const API_PREFIX = DATA_SOURCE === 'remote' ? '/api/v1' : '/api';
export const API_MODE = DATA_SOURCE !== 'mock';
export const LOCAL_API_MODE = DATA_SOURCE === 'local';

const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
const rawBaseUrl =
  DATA_SOURCE === 'remote' ? configuredBaseUrl || PRODUCTION_API_ORIGIN : '';

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
