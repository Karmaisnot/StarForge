import type { FastifyInstance } from 'fastify';
import type { AuthService } from './auth.service';
import { ChangePasswordSchema, LoginSchema } from './auth.schemas';

/** Auth routes plugin factory. Mounted under /api. */
export function authRoutes(service: AuthService) {
  return async function register(app: FastifyInstance) {
    app.post('/auth/login', async (req, reply) => {
      const body = LoginSchema.parse(req.body);
      const payload = await service.login(body.username, body.password, {
        userAgent: req.headers['user-agent'] ?? 'unknown',
        platform: body.platform ?? 'web',
      });
      const token = await reply.jwtSign(payload);
      return { token, mustChangePassword: payload.mustChangePassword };
    });

    app.post('/auth/change-password', { preHandler: [app.authenticate] }, async (req) => {
      const body = ChangePasswordSchema.parse(req.body);
      await service.changePassword(
        req.auth.teacherId,
        req.auth.sessionId,
        body.currentPassword,
        body.newPassword,
      );
      return { ok: true, mustChangePassword: false };
    });

    app.post('/auth/logout', { preHandler: [app.authenticate] }, async (req) => {
      await service.logout(req.auth.sessionId, req.auth.teacherId);
      return { ok: true };
    });
  };
}
