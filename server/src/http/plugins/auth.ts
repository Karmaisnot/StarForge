import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/env';
import { PasswordChangeRequiredError, UnauthorizedError } from '../../shared/errors';

/** Tenancy + identity carried on every authenticated request. */
export interface AuthContext {
  teacherId: string;
  academyId: string;
  sessionId: string;
  roleKey: string;
  mustChangePassword: boolean;
}

/** Shape of the signed JWT payload. */
export interface AuthTokenPayload {
  sub: string; // teacherId
  academyId: string;
  sid: string; // sessionId
  roleKey: string;
  mustChangePassword?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler that verifies the bearer token and populates `request.auth`. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    auth: AuthContext;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

/**
 * Registers JWT signing/verification and an `authenticate` preHandler. Routes
 * opt in via `{ preHandler: [app.authenticate] }`; everything downstream reads
 * the tenant-scoped identity from `request.auth`, never from the client body.
 */
export const authPlugin = fp<{
  config: AppConfig;
  assertSessionActive: (sessionId: string, teacherId: string) => Promise<boolean>;
}>(async (app: FastifyInstance, opts) => {
  await app.register(jwt, {
    secret: opts.config.JWT_SECRET,
    sign: { expiresIn: opts.config.JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async function authenticate(req: FastifyRequest) {
    let payload: AuthTokenPayload;
    try {
      payload = await req.jwtVerify<AuthTokenPayload>();
    } catch {
      throw new UnauthorizedError();
    }
    if (!payload.sub || !payload.academyId || !payload.sid || !payload.roleKey) {
      throw new UnauthorizedError();
    }
    const mustChangePassword = await opts.assertSessionActive(payload.sid, payload.sub);
    req.auth = {
      teacherId: payload.sub,
      academyId: payload.academyId,
      sessionId: payload.sid,
      roleKey: payload.roleKey,
      mustChangePassword,
    };

    const path = req.url.split('?')[0]?.replace(/\/+$/, '') ?? '';
    const mayUseTemporaryPassword =
      path.endsWith('/auth/change-password') || path.endsWith('/auth/logout');
    if (mustChangePassword && !mayUseTemporaryPassword) throw new PasswordChangeRequiredError();
  });
});
