import { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';

/**
 * Survey + response data access. Each query is tenant-scoped (academyId) and,
 * where the data is per-teacher, teacher-scoped. Active/history partitioning is
 * driven by the teacher's *final* responses (submitted | skipped), fetched in a
 * single set-based query — never per-survey loops, so there is no N+1.
 */
export class SurveyRepository {
  constructor(private readonly db: Db) {}

  /** All surveys for the tenant, oldest first (stable display order). */
  listSurveys(academyId: string) {
    return this.db.survey.findMany({
      where: { academyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * This teacher's *final* responses (submitted | skipped) within the tenant,
   * keyed by surveyId. These are the surveys that belong to history; any survey
   * the teacher has not finalised is still active.
   */
  async finalResponsesByTeacher(academyId: string, teacherId: string) {
    const rows = await this.db.surveyResponse.findMany({
      where: {
        teacherId,
        status: { in: ['submitted', 'skipped'] },
        survey: { academyId },
      },
      orderBy: { submittedAt: 'desc' },
    });
    const out = new Map<string, (typeof rows)[number]>();
    for (const r of rows) out.set(r.surveyId, r);
    return out;
  }

  /**
   * This teacher's in-progress (draft) responses, keyed by surveyId. A draft
   * carries partial `progress` for an active survey without finalising it.
   */
  async draftProgressByTeacher(academyId: string, teacherId: string) {
    const rows = await this.db.surveyResponse.findMany({
      where: {
        teacherId,
        status: 'draft',
        survey: { academyId },
      },
      select: { surveyId: true, progress: true },
    });
    const out = new Map<string, number>();
    for (const r of rows) out.set(r.surveyId, r.progress);
    return out;
  }

  /** A single survey, tenant-scoped. Null when it is not in this academy. */
  getSurvey(id: string, academyId: string) {
    return this.db.survey.findFirst({ where: { id, academyId } });
  }

  getSurveyDetail(id: string, academyId: string) {
    return this.db.survey.findFirst({
      where: { id, academyId },
      include: { questionItems: { orderBy: { position: 'asc' } } },
    });
  }

  getResponse(surveyId: string, teacherId: string) {
    return this.db.surveyResponse.findUnique({
      where: { surveyId_teacherId: { surveyId, teacherId } },
    });
  }

  async upsertDraft(
    surveyId: string,
    teacherId: string,
    data: { answers: Record<string, unknown>; progress: number },
  ) {
    const where = { surveyId_teacherId: { surveyId, teacherId } };
    const existing = await this.db.surveyResponse.findUnique({ where });
    if (existing) {
      if (existing.status !== 'draft') return existing;
      await this.db.surveyResponse.updateMany({
        where: { id: existing.id, status: 'draft' },
        data: {
          answers: data.answers as Prisma.InputJsonValue,
          progress: data.progress,
        },
      });
      return this.db.surveyResponse.findUniqueOrThrow({ where });
    }

    try {
      return await this.db.surveyResponse.create({
        data: {
          surveyId,
          teacherId,
          status: 'draft',
          answers: data.answers as Prisma.InputJsonValue,
          progress: data.progress,
        },
      });
    } catch (error) {
      // A concurrent final submission may win the unique-key race. Never turn
      // that final response back into a draft.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      return this.db.surveyResponse.findUniqueOrThrow({ where });
    }
  }

  /**
   * Idempotently finalise this teacher's response to a survey. The unique
   * (surveyId, teacherId) pair guarantees a re-submit/re-skip updates the same
   * row instead of inserting a duplicate; `submittedAt` is stamped on every
   * write so history orders by the latest finalisation.
   */
  upsertResponse(
    surveyId: string,
    teacherId: string,
    data: {
      status: 'submitted' | 'skipped';
      rating: number | null;
      comment: string | null;
      answers?: Record<string, unknown>;
    },
  ) {
    const now = new Date();
    return this.db.surveyResponse.upsert({
      where: { surveyId_teacherId: { surveyId, teacherId } },
      create: {
        surveyId,
        teacherId,
        ...data,
        answers: (data.answers ?? {}) as Prisma.InputJsonValue,
        progress: data.status === 'submitted' ? 100 : 0,
        submittedAt: now,
      },
      update: {
        ...data,
        answers: (data.answers ?? {}) as Prisma.InputJsonValue,
        progress: data.status === 'submitted' ? 100 : 0,
        submittedAt: now,
      },
    });
  }
}
