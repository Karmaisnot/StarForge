import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../shared/errors';
import type { AuthContext } from '../../http/plugins/auth';
import type { CardsRepository } from './cards.repository';
import type { IssueCardInput } from './cards.schemas';
import { mapCardStats, mapCardType, mapRecentCard } from './cards.mapper';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Cards read use-cases. All metrics are computed from rows, scoped to the tenant. */
export class CardsService {
  constructor(private readonly repo: CardsRepository) {}

  /** Recent cards for the activity feed, newest first (mirrors recentCardsFixture). */
  async listRecent(ctx: AuthContext) {
    const now = new Date();
    const cards = await this.repo.listRecent(ctx.academyId);
    return cards.map((c) => mapRecentCard(c, now));
  }

  /** Card-type catalogue with a computed per-type card count. */
  async listTypes(ctx: AuthContext) {
    const types = await this.repo.listTypes(ctx.academyId);
    const counts = await this.repo.cardCountByType(ctx.academyId);
    return types.map((t) => mapCardType(t, counts.get(t.id) ?? 0));
  }

  /**
   * Header stats — every figure computed from card rows:
   *  - up/down this week  : kind counts in the last 7 days
   *  - recipients         : distinct students carded this week
   *  - typeCount          : size of the catalogue
   *  - upTrend            : signed delta of UP cards this week vs the prior week
   */
  async getStats(ctx: AuthContext) {
    const { academyId } = ctx;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - WEEK_MS);
    const twoWeeksAgo = new Date(now.getTime() - 2 * WEEK_MS);

    const [thisWeek, recipients, typeCount, upPrevWeek] = await Promise.all([
      this.repo.kindCountsSince(academyId, weekAgo),
      this.repo.distinctRecipientsSince(academyId, weekAgo),
      this.repo.typeCount(academyId),
      this.repo.upCountBetween(academyId, twoWeeksAgo, weekAgo),
    ]);

    const delta = thisWeek.up - upPrevWeek;
    const upTrend = `${delta >= 0 ? '+' : ''}${delta}`;

    return mapCardStats({
      upThisWeek: thisWeek.up,
      downThisWeek: thisWeek.down,
      recipients,
      typeCount,
      upTrend,
    });
  }

  /**
   * Issue a card. Every referenced id is re-resolved scoped to the caller's
   * academy (client-supplied ids are never trusted): an unknown type/student/
   * cohort is a 404, and a student that doesn't belong to the supplied cohort is
   * a 422 business-rule violation. `kind` is derived from the type (not the body)
   * so the denormalized column can't drift; `issuerId`/`createdAt` come from the
   * authenticated context / now. Counts and stats stay compute-on-read.
   */
  async issue(ctx: AuthContext, input: IssueCardInput) {
    const { academyId, teacherId } = ctx;

    // Resolve the card type by id (precise) or by display name + kind (the
    // name-based Give-Card modal). Either way it is scoped to the tenant.
    const type = input.cardTypeId
      ? await this.repo.findType(input.cardTypeId, academyId)
      : await this.repo.findTypeByNameKind(academyId, input.typeName!, input.kind);
    if (!type) throw new NotFoundError('Card type');

    const student = input.studentId
      ? await this.repo.findStudent(input.studentId, academyId)
      : await this.repo.findStudentByName(input.recipient!, academyId);
    if (!student) throw new NotFoundError('Student');

    let cohortId: string | null = null;
    if (input.cohortId !== undefined) {
      const cohort = await this.repo.findCohort(input.cohortId, academyId);
      if (!cohort) throw new NotFoundError('Cohort');
      if (student.cohortId !== cohort.id) {
        throw new BusinessRuleError('Student does not belong to the specified cohort');
      }
      cohortId = cohort.id;
    } else {
      // Default the card's cohort to the student's own cohort for activity-feed parity.
      cohortId = student.cohortId ?? null;
    }

    const card = await this.repo.create({
      academyId,
      cardTypeId: type.id,
      studentId: student.id,
      cohortId,
      issuerId: teacherId,
      kind: type.kind,
      reason: input.reason ?? null,
    });

    return mapRecentCard(card);
  }

  /**
   * Validate a physical student code and write a durable security audit event.
   * The scanner is role-protected server-side too, so a hidden UI control is
   * never the only permission boundary.
   */
  async scan(ctx: AuthContext, code: string) {
    if (ctx.roleKey !== 'security') throw new ForbiddenError();

    const normalized = code.trim();
    const student = await this.repo.findStudentByCode(normalized, ctx.academyId);
    await this.repo.recordScan({
      academyId: ctx.academyId,
      studentId: student?.id,
      scannedById: ctx.teacherId,
      code: normalized,
      valid: Boolean(student),
    });

    if (!student) {
      return {
        scanId: null,
        valid: false,
        error: 'Access code was not found',
        scannedAt: new Date().toISOString(),
      };
    }

    return {
      scanId: student.id,
      valid: true,
      student: student.name,
      cardType: 'Student access',
      scannedAt: new Date().toISOString(),
      attendanceLesson: null,
    };
  }
}
