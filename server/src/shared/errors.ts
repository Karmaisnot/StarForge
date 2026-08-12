/**
 * Domain error hierarchy. Every error the API deliberately raises carries a
 * stable machine `code` and an HTTP `status`, so the Fastify error handler can
 * translate any throw into a consistent JSON envelope without leaking internals.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** 400 — the request was syntactically/semantically invalid. */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
}

/** 401 — no/invalid credentials. */
export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, details);
  }
}

/** 403 — authenticated but lacking the required permission. */
export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'You do not have permission to perform this action', details?: unknown) {
    super(message, details);
  }
}

/** 403 — a temporary password must be replaced before any workspace access. */
export class PasswordChangeRequiredError extends AppError {
  readonly status = 403;
  readonly code = 'PASSWORD_CHANGE_REQUIRED';
  constructor() {
    super('You must change your temporary password before continuing');
  }
}

/** 404 — the addressed resource does not exist (within the tenant). */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
  constructor(resource = 'Resource', details?: unknown) {
    super(`${resource} not found`, details);
  }
}

/** 409 — the request conflicts with current state (optimistic-lock, races). */
export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = 'CONFLICT';
}

/** 422 — well-formed but violates a business rule. */
export class BusinessRuleError extends AppError {
  readonly status = 422;
  readonly code = 'BUSINESS_RULE_VIOLATION';
}

/** 429 — rate limited. */
export class RateLimitError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED';
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
