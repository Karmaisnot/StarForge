import type { TaskColumn } from '@prisma/client';
import type { TaskWithProject } from './task.repository';

/** Filter-chip counts, computed from rows (the fixture literals were stale). */
export interface FilterCounts {
  all: number;
  mine: number;
  mgmt: number;
  urgent: number;
  done: number;
}

/**
 * Task DTO — matches tasksFixture field-for-field. `mine` is derived from
 * ownership and only present (true) for the current teacher's tasks, mirroring
 * the fixture which omits the key on others. Localized leaves (title, project,
 * deadline, assigner) are passed through as-is for the frontend to resolve.
 */
export function mapTask(task: TaskWithProject, isMine: boolean) {
  const subtasks =
    task.subtasksTotal === null || task.subtasksTotal === undefined
      ? null
      : { done: task.subtasksDone ?? 0, total: task.subtasksTotal };

  return {
    id: task.id,
    title: task.title, // localized
    priority: task.priority,
    state: task.columnId, // 'todo' | 'doing' | 'review' | 'done'
    project: task.project?.name ?? null, // localized
    projectColor: task.project?.color ?? null,
    deadline: task.deadlineLabel, // localized OR plain string ('22.05')
    urgent: task.urgent,
    fromMgmt: task.fromMgmt,
    subtasks,
    assigner: task.assigner, // mixed: plain name OR localized role
    position: task.position,
    deadlineAt: task.deadlineAt?.toISOString() ?? null,
    ...(isMine ? { mine: true } : {}),
  };
}

/** Column DTO — matches taskColumnsFixture (localized label passed through). */
export function mapColumn(column: TaskColumn) {
  return {
    id: column.id,
    label: column.label, // localized
    color: column.color,
  };
}

/** Filter-chip DTOs — matches taskFiltersFixture; counts are computed. */
export function mapFilters(counts: FilterCounts) {
  return [
    { label: { uz: 'Hammasi', ru: 'Все', en: 'All' }, count: counts.all, key: 'all' },
    { label: { uz: 'Mening', ru: 'Мои', en: 'Mine' }, count: counts.mine, key: 'mine' },
    { label: { uz: 'Boshqaruvdan', ru: 'От руководства', en: 'From management' }, count: counts.mgmt, key: 'mgmt' },
    { label: { uz: 'Shoshilinch', ru: 'Срочные', en: 'Urgent' }, count: counts.urgent, key: 'urgent' },
    { label: { uz: 'Tugatildi', ru: 'Завершённые', en: 'Done' }, count: counts.done, key: 'done' },
  ];
}
