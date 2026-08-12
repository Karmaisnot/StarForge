// Same-origin client for the StarForge tenant API. The authenticating session
// is an opaque HttpOnly cookie; JavaScript handles only the non-secret CSRF
// token required for unsafe browser requests.
import { deepLocalize, getLocale } from '@/i18n/locale.js';
import { apiUrl } from './apiConfig.js';
import { ApiError } from './apiError.js';
import { invalidateSession } from './sessionState.js';

export class HttpError extends ApiError {}

const RETRY_DELAYS_MS = [250, 700];
const DEFAULT_TIMEOUT_MS = 12_000;
let readOnlySession = false;

export function configureHttpSessionPolicy(profile) {
  readOnlySession = profile === true || profile?.read_only_session === true;
}

export function resetHttpSessionPolicy() {
  readOnlySession = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ??
    `sf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function csrfCookie() {
  if (typeof document === 'undefined') return '';
  const entry = String(document.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrftoken='));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice('csrftoken='.length));
  } catch {
    return '';
  }
}

function parsePayload(text) {
  if (!text) return { payload: null, invalidJson: false };
  try {
    return { payload: JSON.parse(text), invalidJson: false };
  } catch {
    return { payload: null, invalidJson: true };
  }
}

function unwrapSuccess(payload, withMeta) {
  if (!payload || typeof payload !== 'object' || !Object.hasOwn(payload, 'success')) {
    return withMeta ? { data: payload, pagination: undefined } : payload;
  }
  if (withMeta) {
    return {
      data: payload.data,
      pagination: payload.pagination,
      ...(Array.isArray(payload.warnings) ? { warnings: payload.warnings } : {}),
    };
  }
  return payload.data;
}

function buildHeaders({ body, headers, csrfToken, sessionTransport, idempotencyKey, id }) {
  const next = new Headers(headers);
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  next.set('Accept', 'application/json');
  next.set('Accept-Language', getLocale());
  next.set('X-Request-ID', id);
  if (body != null && !multipart) next.set('Content-Type', 'application/json');
  if (csrfToken) next.set('X-CSRFToken', csrfToken);
  if (sessionTransport) next.set('X-Session-Transport', sessionTransport);
  if (idempotencyKey) next.set('Idempotency-Key', idempotencyKey);
  return next;
}

async function fetchWithRetry(url, init, retryable) {
  const attempts = retryable ? RETRY_DELAYS_MS.length + 1 : 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500 || attempt === attempts - 1) return response;
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
  throw lastError ?? new Error('Network request failed.');
}

async function request(
  path,
  {
    method = 'GET',
    body,
    headers,
    auth = true,
    signal,
    retry = true,
    timeout = DEFAULT_TIMEOUT_MS,
    withMeta = false,
    csrfToken = '',
    sessionTransport = '',
    idempotencyKey = '',
    invalidateOnUnauthorized = true,
  } = {},
) {
  const normalizedMethod = String(method).toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);
  if (readOnlySession && unsafe && path !== 'auth/logout/' && path !== '/api/v1/auth/logout/') {
    throw new HttpError(403, normalizedMethod, path, {
      code: 'read_only_session',
      message: 'This is a view-only session. Sign in directly to make changes.',
    });
  }

  const suppliedCsrf = typeof csrfToken === 'string' ? csrfToken.trim() : '';
  const requestCsrf = unsafe ? suppliedCsrf || csrfCookie() : '';
  const safeIdempotencyKey =
    typeof idempotencyKey === 'string' &&
    /^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)
      ? idempotencyKey
      : '';
  const id = requestId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let callerAborted = Boolean(signal?.aborted);
  const noteCallerAbort = () => {
    callerAborted = true;
  };
  signal?.addEventListener('abort', noteCallerAbort, { once: true });
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const response = await fetchWithRetry(
      apiUrl(path),
      {
        method: normalizedMethod,
        headers: buildHeaders({
          body,
          headers,
          csrfToken: requestCsrf,
          sessionTransport,
          idempotencyKey: safeIdempotencyKey,
          id,
        }),
        body: body == null ? undefined : multipart ? body : JSON.stringify(body),
        credentials: 'same-origin',
        mode: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
      },
      normalizedMethod === 'GET' && retry,
    );
    const text = response.status === 204 ? '' : await response.text();
    const { payload, invalidJson } = parsePayload(text);

    if (response.ok && invalidJson) {
      throw new HttpError(502, normalizedMethod, path, {
        code: 'invalid_api_response',
        message: 'The server returned an invalid response. Please try again.',
      });
    }
    if (!response.ok || payload?.success === false) {
      const error = new HttpError(
        response.status,
        normalizedMethod,
        path,
        payload,
        response.headers.get('Retry-After'),
      );
      if (response.status === 401 && auth && invalidateOnUnauthorized) {
        resetHttpSessionPolicy();
        invalidateSession('unauthorized');
      }
      throw error;
    }

    return deepLocalize(unwrapSuccess(payload, withMeta), getLocale());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new HttpError(0, normalizedMethod, path, {
        code: callerAborted ? 'request_aborted' : 'request_timeout',
        message: callerAborted ? 'Request aborted.' : 'The request timed out. Please try again.',
      });
    }
    if (error instanceof ApiError) throw error;
    throw new HttpError(0, normalizedMethod, path, {
      code: 'network_error',
      message: 'Your workspace is temporarily out of reach. Please try again.',
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', noteCallerAbort);
  }
}

export const httpClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  head: (path, opts) => request(path, { ...opts, method: 'HEAD' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
