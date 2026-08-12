import type { Db } from '../../db/prisma';

/** Data access for auth sessions (devices). Shared by Auth and Account. */
export class SessionRepository {
  constructor(private readonly db: Db) {}

  create(data: { teacherId: string; userAgent: string; platform: string }) {
    return this.db.authSession.create({ data });
  }

  findActive(id: string, teacherId: string) {
    return this.db.authSession.findFirst({ where: { id, teacherId, revokedAt: null } });
  }

  touch(id: string) {
    return this.db.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  }

  revoke(id: string, teacherId: string) {
    return this.db.authSession.updateMany({
      where: { id, teacherId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllExcept(teacherId: string, currentSessionId: string) {
    return this.db.authSession.updateMany({
      where: { teacherId, revokedAt: null, id: { not: currentSessionId } },
      data: { revokedAt: new Date() },
    });
  }

  listActive(teacherId: string) {
    return this.db.authSession.findMany({
      where: { teacherId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}
