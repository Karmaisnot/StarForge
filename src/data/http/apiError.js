/** A machine-readable API error, preserving the server's response envelope. */
export class ApiError extends Error {
  constructor(status, method, path, body = null, retryAfter = null) {
    // The legacy tenant API puts errors at the top level, while the bundled
    // Fastify API uses `{ error: { code, message, details } }`. Normalize both
    // forms so validation and permission failures reach the UI intelligibly.
    const detail = body?.error && typeof body.error === 'object' ? body.error : body;
    const message = detail?.message || detail?.detail || `HTTP ${status} ${method} ${path}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.method = method;
    this.path = path;
    this.code = detail?.code ?? detail?.detail?.code ?? 'error';
    this.body = body;
    this.fields = detail?.errors ?? detail?.details ?? null;
    this.retryAfter = retryAfter;
  }
}
