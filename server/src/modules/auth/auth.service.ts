import { UnauthorizedError } from '../../shared/errors';
import { verifyPassword } from '../../shared/password';
import type { AuthTokenPayload } from '../../http/plugins/auth';
import type { AuthRepository } from './auth.repository';
import type { SessionRepository } from './session.repository';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
}

/**
 * Authentication use-cases. Frameworkagnostic: `login` validates credentials
 * and opens a session, returning the JWT payload for the HTTP layer to sign.
 */
export class AuthService {
  constructor(
    private readonly auth: AuthRepository,
    private readonly sessions: SessionRepository,
  ) {}

  async login(username: string, password: string, device: DeviceInfo): Promise<AuthTokenPayload> {
    const teacher = await this.auth.findTeacherByUsername(username);
    if (!teacher) throw new UnauthorizedError('Invalid username or password');

    const ok = await verifyPassword(password, teacher.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid username or password');

    const session = await this.sessions.create({
      teacherId: teacher.id,
      userAgent: device.userAgent || 'unknown',
      platform: device.platform || 'web',
    });

    return {
      sub: teacher.id,
      academyId: teacher.academyId,
      sid: session.id,
      roleKey: teacher.roleKey,
    };
  }

  async logout(sessionId: string, teacherId: string): Promise<void> {
    await this.sessions.revoke(sessionId, teacherId);
  }

  async assertSessionActive(sessionId: string, teacherId: string): Promise<void> {
    const session = await this.sessions.findActive(sessionId, teacherId);
    if (!session) throw new UnauthorizedError('Your session has ended');
  }
}
