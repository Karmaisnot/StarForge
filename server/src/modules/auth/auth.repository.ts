import type { Db } from '../../db/prisma';

/** Credential lookup for authentication. */
export class AuthRepository {
  constructor(private readonly db: Db) {}

  /**
   * Find a teacher by username. Usernames are unique per academy; in the
   * single-academy dev tenant this is unambiguous. A future multi-tenant login
   * would also key on an academy/subdomain.
   */
  findTeacherByUsername(username: string) {
    return this.db.teacher.findFirst({ where: { username } });
  }

  findTeacherById(id: string) {
    return this.db.teacher.findUnique({ where: { id } });
  }

  updatePassword(id: string, passwordHash: string) {
    return this.db.teacher.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false },
    });
  }
}
