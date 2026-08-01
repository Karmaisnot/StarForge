import type { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';

export interface KindCounts {
  up: number;
  down: number;
}

/** Localized leaf as stored in the `{uz,ru,en}` Json columns. */
export type Localized = { uz: string; ru: string; en: string };

export interface CreateCohortData {
  academyId: string;
  teacherId: string;
  subjectId: string | null;
  name: string;
  level: Localized;
  subjectLabel: Localized;
  room: Localized;
  color: string;
  lessonsPerWeek: number;
}

export interface AttendanceRows {
  academyId: string;
  cohortId: string;
  takenById: string;
  present: number;
  total: number;
  percent: number;
  entries: Array<{ studentId: string; present: boolean }>;
}

export interface AdvanceCohortRows {
  cohortId: string;
  advancedById: string;
  mode: 'level' | 'month';
  fromValue: Prisma.InputJsonValue;
  toValue: Prisma.InputJsonValue;
  readiness: number;
  nextMonth?: number;
  nextLevel?: Prisma.InputJsonValue;
}

/**
 * Cohort + roster data access. Derived metrics (student counts, up/down cards,
 * attendance %) are produced with set-based groupBy aggregates — never per-row
 * loops — so a roster of any size stays a constant number of queries (no N+1).
 */
export class CohortRepository {
  constructor(private readonly db: Db) {}

  listForTeacher(academyId: string, teacherId: string) {
    return this.db.cohort.findMany({
      where: {
        academyId,
        OR: [{ teacherId }, { instructors: { some: { teacherId } } }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  getById(id: string, academyId: string, teacherId: string) {
    return this.db.cohort.findFirst({
      where: {
        id,
        academyId,
        OR: [{ teacherId }, { instructors: { some: { teacherId } } }],
      },
    });
  }

  /** Insert a new cohort. Localized leaves are stored as `{uz,ru,en}` Json. */
  create(data: CreateCohortData) {
    return this.db.cohort.create({
      data: {
        academyId: data.academyId,
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        name: data.name,
        level: data.level,
        subjectLabel: data.subjectLabel,
        room: data.room,
        color: data.color,
        lessonsPerWeek: data.lessonsPerWeek,
      },
    });
  }

  /** Resolve a subject within the tenant (for `subjectLabel`); null if absent. */
  getSubject(subjectId: string, academyId: string) {
    return this.db.subject.findFirst({ where: { id: subjectId, academyId } });
  }

  /** Roster student ids for a cohort — the source of truth for race filtering. */
  async studentIdsInCohort(cohortId: string, academyId: string): Promise<Set<string>> {
    const rows = await this.db.student.findMany({
      where: { cohortId, academyId },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Persist an attendance record + its entries atomically. The summary
   * (present/total/percent) is taken from the caller after it has filtered the
   * entries down to students that still belong to the cohort.
   */
  createAttendance(rows: AttendanceRows) {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const record = await tx.attendanceRecord.create({
        data: {
          academyId: rows.academyId,
          cohortId: rows.cohortId,
          takenById: rows.takenById,
          present: rows.present,
          total: rows.total,
          percent: rows.percent,
        },
      });
      if (rows.entries.length) {
        await tx.attendanceEntry.createMany({
          data: rows.entries.map((e) => ({
            recordId: record.id,
            studentId: e.studentId,
            present: e.present,
          })),
        });
      }
      return record;
    });
  }

  getStudents(cohortId: string, academyId: string) {
    return this.db.student.findMany({
      where: { cohortId, academyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  getTeacher(teacherId: string, academyId: string) {
    return this.db.teacher.findFirst({ where: { id: teacherId, academyId } });
  }

  listInstructors(cohortId: string) {
    return this.db.cohortInstructor.findMany({
      where: { cohortId },
      include: { teacher: true },
      orderBy: [{ position: 'asc' }, { assignedAt: 'asc' }],
    });
  }

  listLessons(cohortId: string, from?: string, to?: string) {
    const startsAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
    return this.db.cohortLesson.findMany({
      where: {
        cohortId,
        status: { not: 'cancelled' },
        ...(Object.keys(startsAt).length ? { startsAt } : {}),
      },
      include: { teacher: true, homework: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  listAttendanceHistory(cohortId: string, from?: string, to?: string) {
    const takenAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
    return this.db.attendanceRecord.findMany({
      where: { cohortId, ...(Object.keys(takenAt).length ? { takenAt } : {}) },
      include: { entries: true },
      orderBy: { takenAt: 'asc' },
    });
  }

  latestProgression(cohortId: string) {
    return this.db.cohortProgression.findFirst({
      where: { cohortId },
      orderBy: { createdAt: 'desc' },
    });
  }

  advanceCohort(rows: AdvanceCohortRows) {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cohort.update({
        where: { id: rows.cohortId },
        data: rows.mode === 'month' ? { currentMonth: rows.nextMonth } : { level: rows.nextLevel },
      });
      return tx.cohortProgression.create({
        data: {
          cohortId: rows.cohortId,
          advancedById: rows.advancedById,
          mode: rows.mode,
          fromValue: rows.fromValue,
          toValue: rows.toValue,
          readiness: rows.readiness,
        },
      });
    });
  }

  async studentCountByCohort(cohortIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!cohortIds.length) return out;
    const rows = await this.db.student.groupBy({
      by: ['cohortId'],
      where: { cohortId: { in: cohortIds } },
      _count: { _all: true },
    });
    for (const r of rows) if (r.cohortId) out.set(r.cohortId, r._count._all);
    return out;
  }

  async cardCountByCohort(cohortIds: string[]): Promise<Map<string, KindCounts>> {
    const out = new Map<string, KindCounts>();
    if (!cohortIds.length) return out;
    const rows = await this.db.card.groupBy({
      by: ['cohortId', 'kind'],
      where: { cohortId: { in: cohortIds } },
      _count: { _all: true },
    });
    for (const r of rows) {
      if (!r.cohortId) continue;
      const e = out.get(r.cohortId) ?? { up: 0, down: 0 };
      if (r.kind === 'up') e.up = r._count._all;
      else if (r.kind === 'down') e.down = r._count._all;
      out.set(r.cohortId, e);
    }
    return out;
  }

  async latestAttendanceByCohort(cohortIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!cohortIds.length) return out;
    const rows = await this.db.attendanceRecord.findMany({
      where: { cohortId: { in: cohortIds } },
      orderBy: { takenAt: 'desc' },
      select: { cohortId: true, percent: true },
    });
    for (const r of rows) if (!out.has(r.cohortId)) out.set(r.cohortId, r.percent);
    return out;
  }

  async cardCountByStudent(studentIds: string[]): Promise<Map<string, KindCounts>> {
    const out = new Map<string, KindCounts>();
    if (!studentIds.length) return out;
    const rows = await this.db.card.groupBy({
      by: ['studentId', 'kind'],
      where: { studentId: { in: studentIds } },
      _count: { _all: true },
    });
    for (const r of rows) {
      if (!r.studentId) continue;
      const e = out.get(r.studentId) ?? { up: 0, down: 0 };
      if (r.kind === 'up') e.up = r._count._all;
      else if (r.kind === 'down') e.down = r._count._all;
      out.set(r.studentId, e);
    }
    return out;
  }

  async attendanceByStudent(studentIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!studentIds.length) return out;
    const [totals, presents] = await Promise.all([
      this.db.attendanceEntry.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds } },
        _count: { _all: true },
      }),
      this.db.attendanceEntry.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds }, present: true },
        _count: { _all: true },
      }),
    ]);
    const presentMap = new Map(presents.map((p) => [p.studentId, p._count._all]));
    for (const t of totals) {
      const total = t._count._all;
      const present = presentMap.get(t.studentId) ?? 0;
      out.set(t.studentId, total ? Math.round((present / total) * 100) : 0);
    }
    return out;
  }
}
