import { Prisma } from '@prisma/client';
import type { Db } from '../../db/prisma';

/** A task row with its project relation eagerly loaded (single query, no N+1). */
export type TaskWithProject = Awaited<ReturnType<TaskRepository['listForAcademy']>>[number];

/** Fields needed to create a task; tenancy/ownership are injected by the service. */
export interface CreateTaskData {
  academyId: string;
  ownerId: string;
  columnId: string;
  title: Prisma.InputJsonValue;
  assigner: Prisma.InputJsonValue;
  priority: string | null;
  projectId: string | null;
  deadlineLabel: Prisma.InputJsonValue | null;
  deadlineAt: Date | null;
  urgent: boolean;
  fromMgmt: boolean;
}

/**
 * Task board data access. The board is small per tenant, but project names/colors
 * are joined in one `include` (no per-row project lookup) and filter-chip counts
 * are produced with a single `groupBy` aggregate rather than per-row loops.
 */
export class TaskRepository {
  constructor(private readonly db: Db) {}

  listForAcademy(academyId: string) {
    return this.db.task.findMany({
      where: { academyId },
      include: { project: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listColumns() {
    return this.db.taskColumn.findMany({ orderBy: { order: 'asc' } });
  }

  /** A single task (with project) scoped to the tenant, or null if not theirs. */
  getById(id: string, academyId: string): Promise<TaskWithProject | null> {
    return this.db.task.findFirst({ where: { id, academyId }, include: { project: true } });
  }

  /** A project belonging to the tenant — used to validate `projectId` on create. */
  getProject(id: string, academyId: string) {
    return this.db.project.findFirst({ where: { id, academyId } });
  }

  /** The owning teacher's display name — used as the task `assigner` on create. */
  async getTeacherName(teacherId: string, academyId: string): Promise<string | null> {
    const teacher = await this.db.teacher.findFirst({
      where: { id: teacherId, academyId },
      select: { name: true },
    });
    return teacher?.name ?? null;
  }

  /**
   * Move a task to a column, scoped by academy via `updateMany` (Prisma's unique
   * `update` cannot carry a tenancy filter). Returns the affected row count so the
   * service can distinguish "not found / not yours" from a real update.
   */
  async setColumn(id: string, academyId: string, columnId: string): Promise<number> {
    const res = await this.db.task.updateMany({ where: { id, academyId }, data: { columnId } });
    return res.count;
  }

  /** Atomically move a task and compact integer positions in both columns. */
  async move(
    id: string,
    academyId: string,
    columnId: string,
    targetIndex: number,
  ): Promise<TaskWithProject | null> {
    return this.db.$transaction(async (tx) => {
      const task = await tx.task.findFirst({ where: { id, academyId } });
      if (!task) return null;

      const sourceRows = await tx.task.findMany({
        where: { academyId, columnId: task.columnId, NOT: { id } },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      const targetRows =
        task.columnId === columnId
          ? sourceRows
          : await tx.task.findMany({
              where: { academyId, columnId, NOT: { id } },
              orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
              select: { id: true },
            });
      const insertAt = Math.max(0, Math.min(targetRows.length, targetIndex));
      const orderedTarget = [...targetRows];
      orderedTarget.splice(insertAt, 0, { id });

      if (task.columnId !== columnId) {
        await Promise.all(
          sourceRows.map((row, position) =>
            tx.task.updateMany({ where: { id: row.id, academyId }, data: { position } }),
          ),
        );
      }
      await Promise.all(
        orderedTarget.map((row, position) =>
          tx.task.updateMany({
            where: { id: row.id, academyId },
            data: { columnId, position },
          }),
        ),
      );

      return tx.task.findFirst({ where: { id, academyId }, include: { project: true } });
    });
  }

  /** Insert a new task. Position 0 keeps it at the top of its column on read. */
  create(data: CreateTaskData): Promise<TaskWithProject> {
    return this.db.task.create({
      data: {
        academyId: data.academyId,
        ownerId: data.ownerId,
        columnId: data.columnId,
        title: data.title,
        assigner: data.assigner,
        priority: data.priority,
        projectId: data.projectId,
        deadlineLabel: data.deadlineLabel ?? Prisma.JsonNull,
        deadlineAt: data.deadlineAt,
        urgent: data.urgent,
        fromMgmt: data.fromMgmt,
        position: 0,
      },
      include: { project: true },
    });
  }

  /** Total tasks in the tenant — the "all" filter count. */
  countAll(academyId: string) {
    return this.db.task.count({ where: { academyId } });
  }

  /** Tasks owned by the current teacher — the "mine" filter count. */
  countMine(academyId: string, teacherId: string) {
    return this.db.task.count({ where: { academyId, ownerId: teacherId } });
  }

  /** Tasks pushed from management — the "mgmt" filter count. */
  countFromMgmt(academyId: string) {
    return this.db.task.count({ where: { academyId, fromMgmt: true } });
  }

  /** Urgent tasks — the "urgent" filter count. */
  countUrgent(academyId: string) {
    return this.db.task.count({ where: { academyId, urgent: true } });
  }

  /** Completed tasks (in the `done` column) — the "done" filter count. */
  countDone(academyId: string) {
    return this.db.task.count({ where: { academyId, columnId: 'done' } });
  }
}
