import { useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Avatar, Button, Card, Chip, FilterChip, Icon, Modal, Segmented, ViewSwitcher } from '@/ui';
import { priorityColor, stateTone } from '@/domain/models/task.js';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import styles from './tasks.module.css';

// Filter predicates key off stable, non-localized fields (never display strings).
const PREDICATES = {
  all: () => true,
  mine: (t) => t.mine === true,
  mgmt: (t) => t.fromMgmt,
  urgent: (t) => t.urgent,
  done: (t) => t.state === 'done',
};

const sortableId = (id) => `task:${id}`;

function TaskCard({ task, onToggle, handleProps, style, dragging = false, setNodeRef }) {
  const { t } = useT();
  return (
    <article
      ref={setNodeRef}
      className={styles.taskCard}
      style={style}
      data-dragging={dragging ? '1' : '0'}
    >
      <div
        className={styles.taskRailV}
        style={{ background: task.urgent ? 'var(--sf-danger)' : task.projectColor }}
      />
      <div className={styles.taskCardInner}>
        <div className={styles.taskCardTop}>
          <button
            type="button"
            className={styles.dragHandle}
            aria-label={`${t('tasks.toggleState')} · ${task.title}`}
            {...handleProps}
          >
            <Icon name="more" size={14} />
          </button>
          {task.fromMgmt && <Chip tone="ink">{t('common.mgmtShort')}</Chip>}
          <Chip>
            <span className={styles.projDot} style={{ background: task.projectColor }} />
            {task.project}
          </Chip>
          <span style={{ flex: 1 }} />
          <span
            className="sf-mono"
            style={{ fontSize: 10, fontWeight: 700, color: priorityColor(task.priority) }}
          >
            {task.priority}
          </span>
        </div>
        <div className={`${styles.taskCardT} ${task.state === 'done' ? styles.done : ''}`}>
          {task.title}
        </div>
        <div className={styles.taskCardMeta}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Avatar name={task.assigner} size={18} />
            <span>{task.assigner}</span>
          </span>
          <span style={{ flex: 1 }} />
          {task.subtasks && (
            <span className={`sf-mono ${styles.subs}`}>
              ✓ {task.subtasks.done}/{task.subtasks.total}
            </span>
          )}
          <span
            className="sf-mono"
            style={{
              color: task.urgent
                ? 'var(--sf-danger)'
                : task.state === 'done'
                  ? 'var(--sf-muted)'
                  : 'var(--sf-ink-2)',
              fontWeight: task.urgent ? 700 : 500,
            }}
          >
            {task.deadline}
          </span>
          <button
            type="button"
            className={styles.advanceTask}
            onClick={() => onToggle(task)}
            aria-label={t('tasks.toggleState')}
          >
            <Icon name="arrowR" size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}

function SortableTask({ task, onToggle }) {
  const sortable = useSortable({
    id: sortableId(task.id),
    data: { type: 'task', task, state: task.state },
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <TaskCard
      task={task}
      onToggle={onToggle}
      style={style}
      dragging={sortable.isDragging}
      setNodeRef={sortable.setNodeRef}
      handleProps={{
        ...sortable.attributes,
        ...sortable.listeners,
        ref: sortable.setActivatorNodeRef,
      }}
    />
  );
}

function KanbanColumn({ column, tasks, onToggle, onAdd }) {
  const { t } = useT();
  const droppable = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column', state: column.id },
  });
  return (
    <div
      ref={droppable.setNodeRef}
      className={styles.kanbanCol}
      data-over={droppable.isOver ? '1' : '0'}
    >
      <div className={styles.kanbanHead}>
        <span className={styles.kanbanDot} style={{ background: column.color }} />
        <span className={styles.kanbanName}>{column.label}</span>
        <span className={styles.kanbanCount}>{tasks.length}</span>
        <span style={{ flex: 1 }} />
        <button
          className={styles.iconBtn}
          aria-label={t('common.add')}
          onClick={() => onAdd?.(column.id)}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
      <SortableContext
        id={column.id}
        items={tasks.map((task) => sortableId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.kanbanCards}>
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onToggle={onToggle} />
          ))}
          {tasks.length === 0 && <div className={styles.kanbanEmpty}>{t('tasks.empty')}</div>}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanBoard({ columns, tasks, onToggle, onAdd, onMove }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const endDrag = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;
    const task = active.data.current?.task;
    if (!task) return;
    const targetState = over.data.current?.state ?? over.data.current?.sortable?.containerId;
    if (!targetState) return;
    const targetTasks = tasks.filter((item) => item.state === targetState);
    const overTaskId = over.data.current?.task?.id;
    const targetIndex =
      overTaskId == null
        ? targetTasks.length
        : Math.max(
            0,
            targetTasks.findIndex((item) => String(item.id) === String(overTaskId)),
          );
    onMove(task, targetState, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveTask(active.data.current?.task ?? null)}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={endDrag}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${active.data.current?.task?.title ?? 'task'}`,
          onDragOver: ({ over }) =>
            over ? `Moving over ${over.data.current?.state ?? 'task'}` : 'Outside board',
          onDragEnd: ({ over }) =>
            over ? `Task moved to ${over.data.current?.state ?? 'new position'}` : 'Move cancelled',
          onDragCancel: () => 'Move cancelled',
        },
      }}
    >
      <div className={styles.kanban}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasks.filter((task) => task.state === column.id)}
            onToggle={onToggle}
            onAdd={onAdd}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className={styles.dragOverlay}>
            <TaskCard task={activeTask} onToggle={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TaskListView({ columns, tasks, onToggle }) {
  const { t } = useT();
  return (
    <Card padded={false}>
      <div className={styles.listHead}>
        <div>{t('tasks.cTask')}</div>
        <div>{t('tasks.cProject')}</div>
        <div>{t('tasks.cAssigner')}</div>
        <div>{t('tasks.cDeadline')}</div>
        <div>{t('tasks.cPriority')}</div>
        <div>{t('tasks.cStatus')}</div>
      </div>
      {tasks.map((task) => {
        const col = columns.find((c) => c.id === task.state);
        return (
          <div key={task.id} className={styles.listRow}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
              <button
                className={styles.check}
                onClick={() => onToggle(task)}
                aria-label={t('tasks.toggleState')}
                style={{
                  background: task.state === 'done' ? 'var(--sf-success)' : 'transparent',
                  borderColor:
                    task.state === 'done' ? 'var(--sf-success)' : 'var(--sf-border-strong)',
                }}
              >
                {task.state === 'done' && (
                  <Icon name="check" size={12} stroke={3} style={{ color: '#fffcf5' }} />
                )}
              </button>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {task.fromMgmt && <Chip tone="ink">{t('common.mgmtShort')}</Chip>}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: task.state === 'done' ? 'line-through' : 'none',
                    color: task.state === 'done' ? 'var(--sf-muted)' : 'var(--sf-ink)',
                  }}
                >
                  {task.title}
                </span>
              </div>
            </div>
            <div>
              <Chip>
                <span className={styles.projDot} style={{ background: task.projectColor }} />
                {task.project}
              </Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Avatar name={task.assigner} size={20} />
              <span>{task.assigner}</span>
            </div>
            <div>
              <span
                className="sf-mono"
                style={{
                  fontSize: 12,
                  color: task.urgent ? 'var(--sf-danger)' : 'var(--sf-ink-2)',
                  fontWeight: task.urgent ? 700 : 500,
                }}
              >
                {task.deadline}
              </span>
            </div>
            <div>
              <span
                className="sf-mono"
                style={{ fontSize: 11, fontWeight: 700, color: priorityColor(task.priority) }}
              >
                {task.priority}
              </span>
            </div>
            <div>
              <Chip tone={stateTone(task.state)}>{col?.label}</Chip>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// Structured dates are authoritative; legacy DD.MM labels remain a safe fallback.
function parseDeadline(task) {
  if (task?.deadlineAt) {
    const date = new Date(task.deadlineAt);
    if (!Number.isNaN(date.getTime())) {
      return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
    }
  }
  const deadline = task?.deadline;
  const m = typeof deadline === 'string' && deadline.match(/(\d{2})\.(\d{2})/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: new Date().getFullYear() };
}

const CALENDAR_COPY = {
  en: 'Leave a little room for rest—steady work wins the month.',
  ru: 'Оставьте немного места для отдыха — стабильный ритм выигрывает месяц.',
  uz: 'Dam olishga ham joy qoldiring — barqaror ritm oyni yutadi.',
};

const HOLIDAYS = {
  '1-1': { en: 'New Year', ru: 'Новый год', uz: 'Yangi yil' },
  '3-8': { en: 'Women’s Day', ru: 'Женский день', uz: 'Xotin-qizlar kuni' },
  '3-21': { en: 'Navruz', ru: 'Навруз', uz: 'Navro‘z' },
  '5-9': { en: 'Day of Memory', ru: 'День памяти', uz: 'Xotira kuni' },
  '9-1': { en: 'Independence Day', ru: 'День независимости', uz: 'Mustaqillik kuni' },
  '10-1': { en: 'Teachers’ Day', ru: 'День учителя', uz: 'Ustozlar kuni' },
  '12-8': { en: 'Constitution Day', ru: 'День Конституции', uz: 'Konstitutsiya kuni' },
};

function CalendarView({ tasks, onToggle }) {
  const { t, locale } = useT();
  const weekdays = t('tasks.weekdays');
  // Anchor the calendar on the month that actually holds the most dated tasks,
  // so the view is useful on first render instead of landing on an empty month.
  const dated = tasks.map((task) => ({ task, d: parseDeadline(task) })).filter((x) => x.d);
  const initial = useMemo(() => {
    if (dated.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    const counts = {};
    for (const { d } of dated) {
      const key = `${d.year}-${d.month}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const [year, month] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0][0]
      .split('-');
    return { year: Number(year), month: Number(month) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [cursor, setCursor] = useState(initial);

  const { year, month } = cursor;
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = first.toLocaleString(locale, { month: 'long', year: 'numeric' });

  const byDay = {};
  const unscheduled = [];
  for (const task of tasks) {
    const d = parseDeadline(task);
    // Guard the parsed day against the month length so a task with an
    // impossible day (e.g. "31.02") lands in Unscheduled instead of vanishing.
    if (d && d.year === year && d.month === month && d.day >= 1 && d.day <= daysInMonth) {
      (byDay[d.day] ??= []).push(task);
    } else if (!d || (d.year === year && d.month === month)) {
      unscheduled.push(task);
    }
  }

  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const step = (delta) => {
    setCursor((c) => {
      const next = new Date(c.year, c.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  return (
    <Card padded={false}>
      <div className={styles.calHead}>
        <button
          className={styles.iconBtn}
          onClick={() => step(-1)}
          aria-label={t('tasks.prevMonth')}
        >
          <Icon name="chevR" size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className={styles.calMonth}>{monthLabel}</span>
        <button
          className={styles.iconBtn}
          onClick={() => step(1)}
          aria-label={t('tasks.nextMonth')}
        >
          <Icon name="chevR" size={16} />
        </button>
      </div>
      <div className={styles.calMotivation}>
        <Icon name="brand" size={15} />
        <span>{CALENDAR_COPY[locale] ?? CALENDAR_COPY.en}</span>
      </div>
      <div className={styles.calWeekdays}>
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className={styles.calGrid}>
        {cells.map((day, i) => {
          const holiday = day ? HOLIDAYS[`${month}-${day}`]?.[locale] : null;
          return (
            <div
              key={i}
              className={`${styles.calCell} ${day ? '' : styles.calEmpty} ${holiday ? styles.calHoliday : ''}`}
            >
              {day && (
                <div className={styles.calDay}>
                  <span>{day}</span>
                  {holiday && <small title={holiday}>{holiday}</small>}
                </div>
              )}
              {(byDay[day] ?? []).map((task) => (
                <button
                  key={task.id}
                  className={styles.calTask}
                  style={{ borderLeftColor: task.urgent ? 'var(--sf-danger)' : task.projectColor }}
                  onClick={() => onToggle(task)}
                  title={task.title}
                >
                  <span
                    className="sf-mono"
                    style={{ color: priorityColor(task.priority), fontWeight: 700 }}
                  >
                    {task.priority}
                  </span>{' '}
                  {task.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {unscheduled.length > 0 && (
        <div className={styles.calUnsched}>
          <div className={styles.calUnschedHead}>{t('tasks.unscheduled')}</div>
          <div className={styles.calUnschedList}>
            {unscheduled.map((task) => (
              <button
                key={task.id}
                className={styles.calTask}
                style={{ borderLeftColor: task.urgent ? 'var(--sf-danger)' : task.projectColor }}
                onClick={() => onToggle(task)}
              >
                <span
                  className="sf-mono"
                  style={{ color: priorityColor(task.priority), fontWeight: 700 }}
                >
                  {task.priority}
                </span>{' '}
                {task.title}
                <span className="sf-mono" style={{ marginLeft: 'auto', color: 'var(--sf-muted)' }}>
                  {task.deadline}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function NewTaskModal({ open, onClose, columns, projects, onCreate, presetState }) {
  const { t, locale } = useT();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('P2');
  const [state, setState] = useState(presetState ?? 'todo');
  const [deadline, setDeadline] = useState('');

  // Re-seed the column when the modal is opened from a specific Kanban lane.
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setProject('');
    setPriority('P2');
    setState(presetState ?? 'todo');
    setDeadline('');
  }, [open, presetState]);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      project: project || projects[0] || t('tasks.project'),
      priority,
      state,
      deadline: deadline
        ? new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(deadline))
        : '—',
      deadlineAt: deadline ? new Date(deadline).toISOString() : null,
    });
    setTitle('');
    setProject('');
    setPriority('P2');
    setDeadline('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('common.newTask')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" icon="plus" onClick={submit}>
            {t('common.newTask')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className={styles.form}>
        <label className={styles.field}>
          <span>{t('tasks.cTask')}</span>
          <input
            className={styles.inputCtl}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span>{t('tasks.cProject')}</span>
          <select
            className={styles.inputCtl}
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t('tasks.cPriority')}</span>
          <Segmented
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'P1', label: 'P1' },
              { value: 'P2', label: 'P2' },
              { value: 'P3', label: 'P3' },
            ]}
          />
        </label>
        <label className={styles.field}>
          <span>{t('tasks.cStatus')}</span>
          <Segmented
            value={state}
            onChange={setState}
            options={columns.map((c) => ({ value: c.id, label: c.label }))}
          />
        </label>
        <label className={styles.field}>
          <span>{t('tasks.cDeadline')}</span>
          <input
            type="datetime-local"
            className={styles.inputCtl}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  );
}

export function TasksPage() {
  const { tasks: taskService } = useServices();
  const toast = useToast();
  const { t, locale } = useT();
  const viewOptions = [
    { value: 'list', label: t('tasks.viewList'), icon: 'filter' },
    { value: 'board', label: t('tasks.viewBoard'), icon: 'cohort' },
    { value: 'calendar', label: t('tasks.viewCalendar'), icon: 'cal' },
  ];
  const [view, setView] = useState('board');
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [added, setAdded] = useState([]);
  const [modal, setModal] = useState(null); // null | { presetState }
  // Bumping this re-runs the loaders so the server truth reconciles after a write.
  const [reloadKey, setReloadKey] = useState(0);
  const pendingTransitions = useRef(new Set());
  const refetch = () => setReloadKey((k) => k + 1);

  const listState = useAsync(() => taskService.getList(), [locale, reloadKey]);
  const filtersState = useAsync(() => taskService.getFilters(), [locale, reloadKey]);

  const baseTasks = useMemo(
    () => [...added, ...(listState.data?.tasks ?? [])],
    [listState.data, added],
  );
  const projects = useMemo(() => [...new Set(baseTasks.map((t) => t.project))], [baseTasks]);

  const tasks = useMemo(() => {
    return baseTasks
      .map((task, index) => ({
        ...task,
        position: task.position ?? index,
        ...(overrides[task.id] ?? {}),
      }))
      .filter(PREDICATES[filter] ?? PREDICATES.all)
      .filter((t) => !projectFilter || t.project === projectFilter)
      .filter((t) => !priorityFilter || t.priority === priorityFilter)
      .sort((a, b) => a.position - b.position);
  }, [baseTasks, overrides, filter, projectFilter, priorityFilter]);
  const openTaskCount = baseTasks.filter((task) => task.state !== 'done').length;

  // Click cycles a task through the workflow states — optimistic locally, then persisted.
  const cycle = async (task) => {
    if (pendingTransitions.current.has(task.id)) return;
    pendingTransitions.current.add(task.id);
    const order = ['todo', 'doing', 'review', 'done'];
    const prev = task.state;
    const next = order[(order.indexOf(prev) + 1) % order.length];
    setOverrides((o) => ({ ...o, [task.id]: { ...(o[task.id] ?? {}), state: next } }));
    toast(`“${String(task.title).slice(0, 22)}…” → ${next}`);
    try {
      await taskService.setState(task.id, next);
      // Server truth now reflects the move; drop the scratch override and reload
      // so the board state AND the filter-chip counts reconcile.
      setOverrides((o) => {
        // eslint-disable-next-line no-unused-vars
        const { [task.id]: _drop, ...rest } = o;
        return rest;
      });
      refetch();
    } catch {
      // Roll the optimistic move back and surface the failure.
      setOverrides((o) => ({ ...o, [task.id]: { ...(o[task.id] ?? {}), state: prev } }));
      toast(t('common.error'), 'danger');
    } finally {
      pendingTransitions.current.delete(task.id);
    }
  };

  const moveTask = async (task, targetState, targetIndex) => {
    if (pendingTransitions.current.size > 0) return;
    pendingTransitions.current.add(task.id);
    const before = overrides;
    const effective = baseTasks.map((item, index) => ({
      ...item,
      position: item.position ?? index,
      ...(overrides[item.id] ?? {}),
    }));
    const moving = effective.find((item) => String(item.id) === String(task.id));
    if (!moving) {
      pendingTransitions.current.delete(task.id);
      return;
    }
    const sourceState = moving.state;
    const source = effective
      .filter((item) => item.state === sourceState && String(item.id) !== String(moving.id))
      .sort((a, b) => a.position - b.position);
    const target = (
      sourceState === targetState
        ? source
        : effective.filter(
            (item) => item.state === targetState && String(item.id) !== String(moving.id),
          )
    ).sort((a, b) => a.position - b.position);
    target.splice(Math.max(0, Math.min(target.length, targetIndex)), 0, {
      ...moving,
      state: targetState,
    });

    const next = { ...overrides };
    if (sourceState !== targetState) {
      source.forEach((item, position) => {
        next[item.id] = { ...(next[item.id] ?? {}), state: sourceState, position };
      });
    }
    target.forEach((item, position) => {
      next[item.id] = { ...(next[item.id] ?? {}), state: targetState, position };
    });
    setOverrides(next);
    toast(`“${String(moving.title).slice(0, 24)}” → ${targetState}`, 'success');
    try {
      await taskService.move(moving.id, targetState, targetIndex);
      setOverrides({});
      refetch();
    } catch {
      setOverrides(before);
      toast(t('common.error'), 'danger');
    } finally {
      pendingTransitions.current.delete(task.id);
    }
  };

  const createTask = async (draft) => {
    // Optimistic insert so the UI reacts instantly. `draft` carries the modal's
    // chosen column (`state`); the backend always creates in `todo`, so we move
    // it afterwards if a non-todo lane was picked.
    const tempId = `new-${Date.now()}`;
    setAdded((list) => [
      {
        id: tempId,
        urgent: false,
        fromMgmt: false,
        subtasks: null,
        assigner: t('common.me'),
        mine: true,
        projectColor: 'var(--sf-primary)',
        ...draft,
      },
      ...list,
    ]);
    toast(`+ ${draft.title}`, 'success');
    try {
      const created = await taskService.create({
        title: draft.title,
        priority: draft.priority,
        ...(draft.deadline && draft.deadline !== '—' ? { deadlineLabel: draft.deadline } : {}),
        ...(draft.deadlineAt ? { deadlineAt: draft.deadlineAt } : {}),
      });
      // If the modal targeted a non-todo column, move the just-created task there.
      if (created?.id != null && draft.state && draft.state !== 'todo') {
        await taskService.setState(created.id, draft.state);
      }
      // Reload so the persisted task (with its real id) replaces our scratch row,
      // and the filter-chip counts update. Clear the optimistic insert it now covers.
      setAdded((list) => list.filter((x) => x.id !== tempId));
      refetch();
    } catch {
      // Drop the optimistic row and surface the failure.
      setAdded((list) => list.filter((x) => x.id !== tempId));
      toast(t('common.error'), 'danger');
    }
  };

  // Cycle the priority filter P1 → P2 → P3 → off.
  const cyclePriority = () => {
    const order = [null, 'P1', 'P2', 'P3'];
    setPriorityFilter((p) => order[(order.indexOf(p) + 1) % order.length]);
  };
  // Cycle the project filter through known projects → off.
  const cycleProject = () => {
    const order = [null, ...projects];
    setProjectFilter((p) => order[(order.indexOf(p) + 1) % order.length]);
  };

  return (
    <>
      <PageHeader
        title={t('tasks.title')}
        subtitle={`${openTaskCount} ${t('tasks.openCount')}`}
        right={
          <>
            <ViewSwitcher options={viewOptions} value={view} onChange={setView} />
            <Button variant="primary" icon="plus" onClick={() => setModal({ presetState: 'todo' })}>
              {t('common.newTask')}
            </Button>
          </>
        }
      />

      <div className={styles.filterStrip}>
        {(filtersState.data ?? []).map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            count={f.count}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          />
        ))}
        <span style={{ flex: 1 }} />
        <FilterChip
          label={projectFilter || t('tasks.project')}
          icon="filter"
          active={Boolean(projectFilter)}
          onClick={cycleProject}
        />
        <FilterChip
          label={priorityFilter || t('tasks.priority')}
          icon="filter"
          active={Boolean(priorityFilter)}
          onClick={cyclePriority}
        />
      </div>

      <AsyncBoundary state={listState}>
        {(d) =>
          view === 'board' ? (
            <KanbanBoard
              columns={d.columns}
              tasks={tasks}
              onToggle={cycle}
              onAdd={(colId) => setModal({ presetState: colId })}
              onMove={moveTask}
            />
          ) : view === 'list' ? (
            <TaskListView columns={d.columns} tasks={tasks} onToggle={cycle} />
          ) : (
            <CalendarView tasks={tasks} onToggle={cycle} />
          )
        }
      </AsyncBoundary>

      <NewTaskModal
        open={modal !== null}
        onClose={() => setModal(null)}
        columns={listState.data?.columns ?? []}
        projects={projects}
        presetState={modal?.presetState}
        onCreate={createTask}
      />
    </>
  );
}
