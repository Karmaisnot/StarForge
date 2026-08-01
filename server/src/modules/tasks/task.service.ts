import { NotFoundError } from '../../shared/errors';
import { TaskColumnId } from '../../domain/enums';
import type { AuthContext } from '../../http/plugins/auth';
import type { TaskRepository } from './task.repository';
import type { CreateTaskInput } from './task.schemas';
import { mapColumn, mapFilters, mapTask } from './task.mapper';

/** Task board read use-cases. Every query is scoped to the caller's academy. */
export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  /** All tasks for the tenant, with `mine` derived from ownership. */
  async list(ctx: AuthContext) {
    const tasks = await this.repo.listForAcademy(ctx.academyId);
    return tasks.map((t) => mapTask(t, t.ownerId === ctx.teacherId));
  }

  /** The static, ordered board columns. */
  async listColumns(_ctx: AuthContext) {
    const columns = await this.repo.listColumns();
    return columns.map(mapColumn);
  }

  /** Filter chips with counts computed from the tenant's tasks (no stale literals). */
  async listFilters(ctx: AuthContext) {
    const { academyId, teacherId } = ctx;
    const [all, mine, mgmt, urgent, done] = await Promise.all([
      this.repo.countAll(academyId),
      this.repo.countMine(academyId, teacherId),
      this.repo.countFromMgmt(academyId),
      this.repo.countUrgent(academyId),
      this.repo.countDone(academyId),
    ]);
    return mapFilters({ all, mine, mgmt, urgent, done });
  }

  /**
   * Move a task to one of the four board columns. The update is scoped by academy;
   * a zero affected-row count means the task is missing or belongs to another
   * tenant — surfaced as 404 (never leaking cross-tenant existence). Idempotent:
   * setting the same column twice succeeds and returns the same DTO.
   */
  async setState(ctx: AuthContext, id: string, state: string) {
    const count = await this.repo.setColumn(id, ctx.academyId, state);
    if (count === 0) throw new NotFoundError('Task');
    const task = await this.repo.getById(id, ctx.academyId);
    if (!task) throw new NotFoundError('Task'); // deleted between update and read
    return mapTask(task, task.ownerId === ctx.teacherId);
  }

  /** Reorder both affected columns in one database transaction. */
  async move(ctx: AuthContext, id: string, state: string, targetIndex: number) {
    const task = await this.repo.move(id, ctx.academyId, state, targetIndex);
    if (!task) throw new NotFoundError('Task');
    return mapTask(task, task.ownerId === ctx.teacherId);
  }

  /**
   * Create a task owned by the caller (so `mine` is true) in the `todo` column.
   * `assigner` is the caller's own name; `projectId`, when given, is validated to
   * belong to the tenant before use so the relation can't cross academies.
   */
  async create(ctx: AuthContext, input: CreateTaskInput) {
    let projectId: string | null = null;
    if (input.projectId) {
      const project = await this.repo.getProject(input.projectId, ctx.academyId);
      if (!project) throw new NotFoundError('Project');
      projectId = project.id;
    }

    const assigner = (await this.repo.getTeacherName(ctx.teacherId, ctx.academyId)) ?? '';

    const task = await this.repo.create({
      academyId: ctx.academyId,
      ownerId: ctx.teacherId,
      columnId: TaskColumnId.TODO,
      title: input.title,
      assigner,
      priority: input.priority ?? null,
      projectId,
      deadlineLabel: input.deadlineLabel ?? null,
      deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
      urgent: input.urgent ?? false,
      fromMgmt: input.fromMgmt ?? false,
    });

    return mapTask(task, true);
  }
}
