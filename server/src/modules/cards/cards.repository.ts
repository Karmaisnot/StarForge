import { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';
import type { RecentCardRow } from './cards.mapper';

/** Up/down card tallies for a window. */
export interface KindCounts {
  up: number;
  down: number;
}

/**
 * Card + CardType data access. Every derived figure (per-type counts, weekly
 * up/down, distinct recipients, week-over-week trend) is produced with set-based
 * groupBy/aggregate queries — never per-row loops — so the page stays a constant
 * number of queries regardless of how many cards exist (no N+1).
 */
export class CardsRepository {
  constructor(private readonly db: Db) {}

  /** Most-recent cards for the tenant, newest first, with the relations the DTO needs. */
  listRecent(academyId: string, take = 6): Promise<RecentCardRow[]> {
    return this.db.card.findMany({
      where: { academyId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { cardType: true, student: true, cohort: true, issuer: true },
    });
  }

  /** The tenant's card-type catalogue, in display order. */
  listTypes(academyId: string) {
    return this.db.cardType.findMany({
      where: { academyId },
      orderBy: { position: 'asc' },
    });
  }

  /** Map of cardTypeId -> total cards of that type (single grouped query). */
  async cardCountByType(academyId: string): Promise<Map<string, number>> {
    const rows = await this.db.card.groupBy({
      by: ['cardTypeId'],
      where: { academyId },
      _count: { _all: true },
    });
    const out = new Map<string, number>();
    for (const r of rows) out.set(r.cardTypeId, r._count._all);
    return out;
  }

  /** Up/down card counts for the tenant created on/after `since` (one grouped query). */
  async kindCountsSince(academyId: string, since: Date): Promise<KindCounts> {
    const rows = await this.db.card.groupBy({
      by: ['kind'],
      where: { academyId, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const out: KindCounts = { up: 0, down: 0 };
    for (const r of rows) {
      if (r.kind === 'up') out.up = r._count._all;
      else if (r.kind === 'down') out.down = r._count._all;
    }
    return out;
  }

  /** Up card count for a half-open window [since, before) — used for the trend delta. */
  async upCountBetween(academyId: string, since: Date, before: Date): Promise<number> {
    return this.db.card.count({
      where: { academyId, kind: 'up', createdAt: { gte: since, lt: before } },
    });
  }

  /** Distinct students that received a card on/after `since` (deduped via groupBy). */
  async distinctRecipientsSince(academyId: string, since: Date): Promise<number> {
    const rows = await this.db.card.groupBy({
      by: ['studentId'],
      where: { academyId, createdAt: { gte: since }, studentId: { not: null } },
    });
    return rows.length;
  }

  /** Number of card types in the tenant's catalogue. */
  typeCount(academyId: string): Promise<number> {
    return this.db.cardType.count({ where: { academyId } });
  }

  /** A single card type scoped to the tenant (null if it belongs to another academy). */
  findType(id: string, academyId: string) {
    return this.db.cardType.findFirst({ where: { id, academyId } });
  }

  /** A single student scoped to the tenant (null if it belongs to another academy). */
  findStudent(id: string, academyId: string) {
    return this.db.student.findFirst({ where: { id, academyId } });
  }

  /**
   * Resolve a card type by its display name (any locale) + optional kind, scoped
   * to the tenant. Lets a name-based UI (the Give-Card modal) issue without ids.
   * The catalogue is tiny, so an in-memory locale match is cheaper than JSON SQL.
   */
  async findTypeByNameKind(academyId: string, typeName: string, kind?: string) {
    const types = await this.db.cardType.findMany({
      where: { academyId, ...(kind ? { kind } : {}) },
    });
    const target = typeName.trim().toLowerCase();
    return (
      types.find((t) => {
        const n = t.name as { uz?: string; ru?: string; en?: string };
        return [n.uz, n.ru, n.en].some((v) => (v ?? '').trim().toLowerCase() === target);
      }) ?? null
    );
  }

  /** Resolve a student by exact name within the tenant (null if not found). */
  findStudentByName(name: string, academyId: string) {
    return this.db.student.findFirst({ where: { academyId, name: name.trim() } });
  }

  /** Resolve a physical student access code within the current tenant. */
  findStudentByCode(code: string, academyId: string) {
    return this.db.student.findFirst({ where: { academyId, studentId: code.trim() } });
  }

  /** Immutable audit record for every security-desk scan, valid or invalid. */
  recordScan(data: {
    academyId: string;
    studentId?: string;
    scannedById: string;
    code: string;
    valid: boolean;
  }) {
    return this.db.accessScan.create({ data });
  }

  /** A single cohort scoped to the tenant (null if it belongs to another academy). */
  findCohort(id: string, academyId: string) {
    return this.db.cohort.findFirst({ where: { id, academyId } });
  }

  /**
   * Insert a card and return it with the relations the recent-card DTO needs.
   * `kind` is denormalized from the type by the caller for fast aggregation.
   */
  create(data: {
    academyId: string;
    cardTypeId: string;
    studentId: string;
    cohortId?: string | null;
    issuerId: string;
    kind: string;
    reason?: string | null;
  }) {
    return this.db.card.create({
      data: {
        academyId: data.academyId,
        cardTypeId: data.cardTypeId,
        studentId: data.studentId,
        cohortId: data.cohortId ?? null,
        issuerId: data.issuerId,
        kind: data.kind,
        // `reason` is a nullable Json column: a plain user string is stored as-is;
        // absence must use Prisma's JsonNull sentinel (not a bare null).
        reason: data.reason ?? Prisma.JsonNull,
      },
      include: { cardType: true, student: true, cohort: true, issuer: true },
    });
  }
}
