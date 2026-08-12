import { httpClient, HttpError } from '@/data/http/httpClient.js';

export class ApiError extends HttpError {}

function requestPath(path, params) {
  const raw = String(path ?? '');
  if (!params || typeof params !== 'object') return raw;
  const [pathname, existing = ''] = raw.split('?', 2);
  const query = new URLSearchParams(existing);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.delete(key);
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
    else query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

/** Compatibility transport for the CEO workspace components.
 * It deliberately delegates to the staff app's cookie, CSRF, timeout, retry,
 * read-only-session, and unauthorized-session policies.
 */
export function httpRequest(method, path, options = {}) {
  const normalizedMethod = String(method || 'GET').toLowerCase();
  const target = requestPath(path, options.params);
  const requestOptions = {
    signal: options.signal,
    timeout: options.timeout,
    withMeta: options.withMeta,
    idempotencyKey: options.idempotencyKey,
    headers: options.headers,
    auth: options.auth,
    invalidateOnUnauthorized: options.invalidateOnUnauthorized,
  };
  if (normalizedMethod === 'get' || normalizedMethod === 'head') {
    return httpClient[normalizedMethod](target, requestOptions);
  }
  if (normalizedMethod === 'delete') return httpClient.delete(target, requestOptions);
  if (!['post', 'put', 'patch'].includes(normalizedMethod)) {
    throw new TypeError(`Unsupported API method: ${method}`);
  }
  return httpClient[normalizedMethod](target, options.body, requestOptions);
}
