import type { Prisma } from '@prisma/client';
import { BusinessRuleError, NotFoundError } from '../../shared/errors';
import { loc } from '../../shared/locale';
import type { AuthContext } from '../../http/plugins/auth';
import type { CohortRepository, Localized } from './cohort.repository';
import { mapCohort, mapStudent } from './cohort.mapper';
import type {
  CohortWorkspaceQuery,
  CreateCohortInput,
  TakeAttendanceInput,
} from './cohort.schemas';

/** Default localized placeholder for missing display strings (UI parity). */
const DASH: Localized = { uz: '—', ru: '—', en: '—' };
const DEFAULT_COLOR = 'var(--sf-primary)';

/** Mirror a plain (already-localized) display string into every locale leaf. */
function asLocalized(value: string | undefined, fallback: Localized): Localized {
  const v = value?.trim();
  if (!v || v === '—') return fallback;
  return { uz: v, ru: v, en: v };
}

const ROLE_LABELS = {
  main: loc('Asosiy o‘qituvchi', 'Основной преподаватель', 'Main teacher'),
  video: loc('Video o‘qituvchi', 'Видео-преподаватель', 'Video teacher'),
  support: loc('Yordamchi o‘qituvchi', 'Преподаватель поддержки', 'Support teacher'),
  custom: loc('O‘qituvchi', 'Преподаватель', 'Teacher'),
};

function roleLabel(role: string) {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? ROLE_LABELS.custom;
}

function bumpLevelLabel(label: string): string {
  const roman: Record<string, string> = { I: 'II', II: 'III', III: 'IV', IV: 'V', V: 'VI' };
  for (const value of ['III', 'II', 'IV', 'VI', 'V', 'I']) {
    const pattern = new RegExp(`\\b${value}\\b`);
    if (pattern.test(label)) return label.replace(pattern, roman[value] ?? `${value}+`);
  }
  if (/\d+/.test(label)) return label.replace(/\d+/, (value) => String(Number(value) + 1));
  return `${label} +`;
}

function nextLevel(value: Prisma.JsonValue | Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (typeof value === 'string') return bumpLevelLabel(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, label]) => [key, bumpLevelLabel(String(label))]),
    );
  }
  return DASH;
}

type LessonRow = Awaited<ReturnType<CohortRepository['listLessons']>>[number];

function lessonDto(lesson: LessonRow) {
  return {
    id: lesson.id,
    title: lesson.title,
    startsAt: lesson.startsAt.toISOString(),
    endsAt: lesson.endsAt.toISOString(),
    type: lesson.type,
    typeLabel: roleLabel(lesson.type),
    teacherName: lesson.teacher.name,
    room: lesson.room,
    ...(lesson.homework
      ? {
          homework: {
            title: lesson.homework.title,
            dueAt: lesson.homework.dueAt.toISOString(),
            submitted: lesson.homework.submitted,
            total: lesson.homework.total,
          },
        }
      : {}),
  };
}

/** Cohort read + write use-cases with computed roster/attendance metrics. */
export class CohortService {
  constructor(private readonly repo: CohortRepository) {}

  async list(ctx: AuthContext) {
    const cohorts = await this.repo.listForTeacher(ctx.academyId, ctx.teacherId);
    const ids = cohorts.map((c) => c.id);
    const [studentCounts, cardCounts, attendance] = await Promise.all([
      this.repo.studentCountByCohort(ids),
      this.repo.cardCountByCohort(ids),
      this.repo.latestAttendanceByCohort(ids),
    ]);
    return cohorts.map((c) =>
      mapCohort(c, {
        studentCount: studentCounts.get(c.id) ?? 0,
        attendance: attendance.get(c.id) ?? 0,
        up: cardCounts.get(c.id)?.up ?? 0,
        down: cardCounts.get(c.id)?.down ?? 0,
      }),
    );
  }

  async getById(ctx: AuthContext, id: string) {
    const cohort = await this.repo.getById(id, ctx.academyId, ctx.teacherId);
    if (!cohort) return null; // parity with mock getById (returns null)
    const [studentCounts, cardCounts, attendance] = await Promise.all([
      this.repo.studentCountByCohort([id]),
      this.repo.cardCountByCohort([id]),
      this.repo.latestAttendanceByCohort([id]),
    ]);
    return mapCohort(cohort, {
      studentCount: studentCounts.get(id) ?? 0,
      attendance: attendance.get(id) ?? 0,
      up: cardCounts.get(id)?.up ?? 0,
      down: cardCounts.get(id)?.down ?? 0,
    });
  }

  /**
   * Create a cohort for the caller's tenant. A supplied `subjectId` is resolved
   * within the academy (ignored if it does not belong to the tenant). Computed
   * metrics are all 0 since the cohort starts with an empty roster.
   */
  async create(ctx: AuthContext, input: CreateCohortInput) {
    let subjectId: string | null = null;
    let subjectLabel: Localized = DASH;
    if (input.subjectId) {
      const subject = await this.repo.getSubject(input.subjectId, ctx.academyId);
      if (subject) {
        subjectId = subject.id;
        subjectLabel = subject.name as Localized;
      }
    }
    const cohort = await this.repo.create({
      academyId: ctx.academyId,
      teacherId: ctx.teacherId,
      subjectId,
      name: input.name,
      level: asLocalized(input.level, DASH),
      subjectLabel,
      room: asLocalized(input.room, DASH),
      color: input.color?.trim() || DEFAULT_COLOR,
      lessonsPerWeek: input.lessonsPerWeek ?? 0,
    });
    return mapCohort(cohort, { studentCount: 0, attendance: 0, up: 0, down: 0 });
  }

  /**
   * Record an attendance take for a cohort. The cohort must belong to the
   * tenant (404 otherwise) and at least one entry is required (422 otherwise).
   * Entries whose student is no longer on the roster (removed mid-take) are
   * skipped rather than failing the whole save, keeping the write race-safe.
   * The persisted summary is derived from the surviving entries.
   */
  async takeAttendance(ctx: AuthContext, cohortId: string, input: TakeAttendanceInput) {
    const cohort = await this.repo.getById(cohortId, ctx.academyId, ctx.teacherId);
    if (!cohort) throw new NotFoundError('Cohort');
    if (input.entries.length === 0) {
      throw new BusinessRuleError('Attendance requires at least one student');
    }

    const rosterIds = await this.repo.studentIdsInCohort(cohortId, ctx.academyId);
    // Keep only entries whose student still belongs to the cohort; dedupe by id
    // (last write wins) so a duplicated studentId cannot break the unique index.
    const surviving = new Map<string, boolean>();
    for (const e of input.entries) {
      if (rosterIds.has(e.studentId)) surviving.set(e.studentId, e.present);
    }
    if (surviving.size === 0) {
      throw new BusinessRuleError('No entries match the current roster');
    }

    const entries = [...surviving].map(([studentId, present]) => ({ studentId, present }));
    const total = entries.length;
    const present = entries.filter((e) => e.present).length;
    const percent = total ? Math.round((present / total) * 100) : 0;

    await this.repo.createAttendance({
      academyId: ctx.academyId,
      cohortId,
      takenById: ctx.teacherId,
      present,
      total,
      percent,
      entries,
    });
    return { present, total, percent };
  }

  async getRoster(ctx: AuthContext, cohortId: string) {
    const cohort = await this.repo.getById(cohortId, ctx.academyId, ctx.teacherId);
    if (!cohort) throw new NotFoundError('Cohort');
    const students = await this.repo.getStudents(cohortId, ctx.academyId);
    const ids = students.map((s) => s.id);
    const [cardCounts, attendance] = await Promise.all([
      this.repo.cardCountByStudent(ids),
      this.repo.attendanceByStudent(ids),
    ]);
    return students.map((s) =>
      mapStudent(s, {
        up: cardCounts.get(s.id)?.up ?? 0,
        down: cardCounts.get(s.id)?.down ?? 0,
        attendance: attendance.get(s.id) ?? 0,
      }),
    );
  }

  async getWorkspace(ctx: AuthContext, cohortId: string, query: CohortWorkspaceQuery) {
    const cohort = await this.repo.getById(cohortId, ctx.academyId, ctx.teacherId);
    if (!cohort) throw new NotFoundError('Cohort');
    const [assigned, owner, lessons, attendanceRows, progressionRows, attendance] =
      await Promise.all([
        this.repo.listInstructors(cohort.id),
        this.repo.getTeacher(ctx.teacherId, ctx.academyId),
        this.repo.listLessons(cohort.id, query.from, query.to),
        this.repo.listAttendanceHistory(cohort.id, query.from, query.to),
        this.repo.latestProgression(cohort.id),
        this.repo.latestAttendanceByCohort([cohort.id]),
      ]);

    const instructors = assigned.map((entry) => ({
      id: entry.id,
      name: entry.teacher.name,
      role: entry.role,
      roleLabel: roleLabel(entry.role),
      isYou: entry.teacherId === ctx.teacherId,
      online: true,
    }));
    if (owner && !instructors.some((entry) => entry.isYou)) {
      instructors.unshift({
        id: `owner-${owner.id}`,
        name: owner.name,
        role: 'main',
        roleLabel: ROLE_LABELS.main,
        isYou: true,
        online: true,
      });
    }

    const now = Date.now();
    const lessonDtos = lessons.map(lessonDto);
    const upcomingLessons = lessonDtos.filter(
      (lesson) => new Date(lesson.startsAt).getTime() >= now,
    );
    const lastLesson = [...lessonDtos]
      .reverse()
      .find((lesson) => new Date(lesson.startsAt).getTime() < now);
    const readiness = attendance.get(cohort.id) ?? 0;
    const current = cohort.progressionMode === 'month' ? cohort.currentMonth : cohort.level;
    const next =
      cohort.progressionMode === 'month' ? cohort.currentMonth + 1 : nextLevel(cohort.level);

    return {
      revision: progressionRows?.createdAt.getTime() ?? cohort.createdAt.getTime(),
      instructors,
      nextLesson:
        upcomingLessons[0] ??
        (cohort.nextAt
          ? {
              id: `next-${cohort.id}`,
              title: cohort.subjectLabel,
              startsAt: cohort.nextAt.toISOString(),
              endsAt: new Date(cohort.nextAt.getTime() + 60 * 60_000).toISOString(),
              type: 'main',
              typeLabel: ROLE_LABELS.main,
              teacherName: owner?.name ?? '',
              room: cohort.room,
            }
          : null),
      upcomingLessons: upcomingLessons.slice(0, 8),
      lastLesson: lastLesson
        ? { ...lastLesson, attendance: readiness, homework: lastLesson.homework ?? null }
        : null,
      attendanceHistory: attendanceRows.flatMap((record) =>
        record.entries.map((entry) => ({
          id: entry.id,
          studentId: entry.studentId,
          date: record.takenAt.toISOString().slice(0, 10),
          status: entry.present ? 'present' : 'absent',
        })),
      ),
      progression: {
        mode: cohort.progressionMode,
        current,
        next,
        startedAt: (progressionRows?.createdAt ?? cohort.createdAt).toISOString().slice(0, 10),
        eligible: readiness >= 85,
        readiness,
      },
    };
  }

  async advance(ctx: AuthContext, cohortId: string) {
    const cohort = await this.repo.getById(cohortId, ctx.academyId, ctx.teacherId);
    if (!cohort) throw new NotFoundError('Cohort');
    const attendance = await this.repo.latestAttendanceByCohort([cohort.id]);
    const readiness = attendance.get(cohort.id) ?? 0;
    const mode = cohort.progressionMode === 'month' ? 'month' : 'level';
    const fromValue: Prisma.InputJsonValue =
      mode === 'month' ? cohort.currentMonth : (cohort.level as Prisma.InputJsonValue);
    const toValue: Prisma.InputJsonValue =
      mode === 'month' ? cohort.currentMonth + 1 : nextLevel(cohort.level);
    const event = await this.repo.advanceCohort({
      cohortId: cohort.id,
      advancedById: ctx.teacherId,
      mode,
      fromValue,
      toValue,
      readiness,
      ...(mode === 'month' ? { nextMonth: Number(toValue) } : { nextLevel: toValue }),
    });
    return {
      id: event.id,
      cohortId: cohort.id,
      progression: {
        mode,
        current: toValue,
        next: mode === 'month' ? Number(toValue) + 1 : nextLevel(toValue),
        startedAt: event.createdAt.toISOString().slice(0, 10),
        eligible: readiness >= 85,
        readiness,
      },
    };
  }
}
