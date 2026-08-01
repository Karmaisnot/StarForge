import { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';

export type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: {
    branch: true;
    preferences: true;
    subjects: { include: { subject: true } };
  };
}>;

export interface TeacherSummary {
  cohorts: number;
  students: number;
  lessonsPerWeek: number;
}

/** Field-level patch for per-teacher preferences (theme + locale + toggles). */
export interface PreferencesPatch {
  locale?: string;
  palette?: string;
  dark?: boolean;
  notifPush?: boolean;
  notifCards?: boolean;
  notifMgmt?: boolean;
  notifSurvey?: boolean;
  shareProfile?: boolean;
  anonSurvey?: boolean;
  aiData?: boolean;
  betaCalendar?: boolean;
  betaVoice?: boolean;
}

export class AccountRepository {
  constructor(private readonly db: Db) {}

  getTeacher(teacherId: string, academyId: string): Promise<TeacherWithRelations | null> {
    return this.db.teacher.findFirst({
      where: { id: teacherId, academyId },
      include: {
        branch: true,
        preferences: true,
        subjects: { include: { subject: true }, orderBy: { position: 'asc' } },
      },
    });
  }

  /** Derived account summary — computed, never stored. */
  async getSummary(teacherId: string): Promise<TeacherSummary> {
    const cohorts = await this.db.cohort.findMany({
      where: { teacherId },
      select: { id: true, lessonsPerWeek: true },
    });
    const cohortIds = cohorts.map((c) => c.id);
    const students = cohortIds.length
      ? await this.db.student.count({ where: { cohortId: { in: cohortIds } } })
      : 0;
    const lessonsPerWeek = cohorts.reduce((sum, c) => sum + c.lessonsPerWeek, 0);
    return { cohorts: cohorts.length, students, lessonsPerWeek };
  }

  updateTeacher(teacherId: string, data: { name?: string; username?: string }) {
    return this.db.teacher.update({ where: { id: teacherId }, data });
  }

  getPreferences(teacherId: string) {
    return this.db.teacherPreferences.findUnique({ where: { teacherId } });
  }

  upsertPreferences(teacherId: string, data: PreferencesPatch) {
    return this.db.teacherPreferences.upsert({
      where: { teacherId },
      update: data,
      create: { teacherId, ...data },
    });
  }
}
