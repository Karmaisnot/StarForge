import { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';

type Feature = 'work' | 'finance' | 'people' | 'academic' | 'operations';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Tenant-scoped persisted documents for staff workspaces. The document API is
 * deliberately small: domain services own validation and mutations, while this
 * repository owns atomic read/write and data isolation.
 */
export class WorkspaceRepository {
  constructor(private readonly db: Db) {}

  async read<T>(academyId: string, scope: string, feature: Feature, initial: () => T): Promise<T> {
    const existing = await this.db.workspaceState.findUnique({
      where: { academyId_scope_feature: { academyId, scope, feature } },
    });
    if (existing) return clone(existing.data as T);

    // Lazy initialization means new staff accounts receive a real persisted
    // workspace without a special deployment step. The unique key makes a
    // concurrent first request safe; the loser simply re-reads the winner.
    try {
      const created = await this.db.workspaceState.create({
        data: { academyId, scope, feature, data: asJson(initial()) },
      });
      return clone(created.data as T);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const raced = await this.db.workspaceState.findUnique({
        where: { academyId_scope_feature: { academyId, scope, feature } },
      });
      if (!raced) throw error;
      return clone(raced.data as T);
    }
  }

  async mutate<T, Result>(
    academyId: string,
    scope: string,
    feature: Feature,
    initial: () => T,
    mutate: (document: T) => Result,
  ): Promise<Result> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.workspaceState.findUnique({
        where: { academyId_scope_feature: { academyId, scope, feature } },
      });
      const document = existing ? clone(existing.data as T) : initial();
      const result = mutate(document);

      if (existing) {
        await tx.workspaceState.update({
          where: { id: existing.id },
          data: { data: asJson(document) },
        });
      } else {
        await tx.workspaceState.create({
          data: { academyId, scope, feature, data: asJson(document) },
        });
      }
      return result;
    });
  }

  listTeachers(academyId: string) {
    return this.db.teacher.findMany({
      where: { academyId },
      orderBy: { name: 'asc' },
      include: {
        branch: true,
        subjects: { include: { subject: true }, orderBy: { position: 'asc' } },
      },
    });
  }

  listStudents(academyId: string) {
    return this.db.student.findMany({
      where: { academyId },
      orderBy: { name: 'asc' },
      include: { cohort: true },
    });
  }

  listCohortsForTeacher(academyId: string, teacherId: string) {
    return this.db.cohort.findMany({
      where: {
        academyId,
        OR: [{ teacherId }, { instructors: { some: { teacherId } } }],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
