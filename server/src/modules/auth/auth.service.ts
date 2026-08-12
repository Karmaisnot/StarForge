import { UnauthorizedError, ValidationError } from '../../shared/errors';
import { hashPassword, verifyPassword } from '../../shared/password';
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
      mustChangePassword: teacher.mustChangePassword,
    };
  }

  async logout(sessionId: string, teacherId: string): Promise<void> {
    await this.sessions.revoke(sessionId, teacherId);
  }

  async assertSessionActive(sessionId: string, teacherId: string): Promise<boolean> {
    const session = await this.sessions.findActive(sessionId, teacherId);
    if (!session) throw new UnauthorizedError('Your session has ended');

    const teacher = await this.auth.findTeacherById(teacherId);
    if (!teacher) throw new UnauthorizedError('Your account no longer exists');
    return teacher.mustChangePassword;
  }

  async changePassword(
    teacherId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const teacher = await this.auth.findTeacherById(teacherId);
    if (!teacher) throw new UnauthorizedError('Your account no longer exists');

    const currentMatches = await verifyPassword(currentPassword, teacher.passwordHash);
    if (!currentMatches) throw new UnauthorizedError('The temporary password is incorrect');

    const alreadyInUse = await verifyPassword(newPassword, teacher.passwordHash);
    if (alreadyInUse) {
      throw new ValidationError('Your new password must be different from the temporary password');
    }

    await this.auth.updatePassword(teacherId, await hashPassword(newPassword));
    await this.sessions.revokeAllExcept(teacherId, currentSessionId);
  }
}
