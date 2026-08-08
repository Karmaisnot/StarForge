// Adapters for the supplied Starforge EDU tenant API.  The UI was originally
// prototyped against a different Fastify service, so this module deliberately
// translates the stable UI ports into the API's /api/v1 resources and DTOs.
import { getLocale } from '@/i18n/locale.js';
import { ApiError } from '@/data/http/apiError.js';
import { httpClient } from '@/data/http/httpClient.js';
import { createStudentWorkbookPayload } from '@/data/spreadsheet.js';
import { canAccess, profilePermissions } from '@/domain/access.js';
import {
  IAccountRepository,
  ICohortRepository,
  ICardRepository,
  ITaskRepository,
  IDashboardRepository,
  IAiRepository,
  IPrintRepository,
  ISurveyRepository,
  IMgmtRepository,
  INotificationRepository,
  IMaterialRepository,
  IWorkRepository,
  IFinanceRepository,
  IPeopleRepository,
  IAcademicRepository,
  IOperationsRepository,
} from '../interfaces.js';

const UI_TASK_COLUMNS = [
  { id: 'todo', color: 'var(--sf-muted)' },
  { id: 'doing', color: 'var(--sf-primary)' },
  { id: 'review', color: 'var(--sf-accent)' },
  { id: 'done', color: 'var(--sf-success)' },
];

const COPY = {
  uz: {
    all: 'Barchasi',
    today: 'Bugun',
    yesterday: 'Kecha',
    todo: 'Boshlanmagan',
    doing: 'Jarayonda',
    review: 'Tekshirishda',
    done: 'Tugallangan',
    me: 'Men',
    teacher: 'O‘qituvchi',
    branch: 'Filial',
    group: 'guruh',
    student: 'o‘quvchi',
    parent: 'ota-ona',
    lesson: 'dars',
    pending: 'kutilmoqda',
    openTasks: 'Ochiq vazifalar',
    meetings: 'uchrashuvlar',
    openRequests: 'Ochiq so‘rovlar',
    unread: 'O‘qilmagan',
    noLessons: 'Rejalashtirilgan dars yo‘q',
    nextLesson: 'Keyingi dars',
    nextMeeting: 'Keyingi uchrashuv',
    noForms: 'Kutilayotgan so‘rovnomalar yo‘q',
    aiRequest: 'AI so‘rovi',
    thread: 'Suhbat',
    form: 'So‘rovnoma',
    files: 'fayl',
    queued: 'Navbatda',
  },
  ru: {
    all: 'Все',
    today: 'Сегодня',
    yesterday: 'Вчера',
    todo: 'Не начато',
    doing: 'В работе',
    review: 'На проверке',
    done: 'Готово',
    me: 'Я',
    teacher: 'Преподаватель',
    branch: 'Филиал',
    group: 'групп',
    student: 'учеников',
    parent: 'родитель',
    lesson: 'уроков',
    pending: 'ожидают',
    openTasks: 'Открытые задачи',
    meetings: 'встреч',
    openRequests: 'Открытые заявки',
    unread: 'Непрочитано',
    noLessons: 'Запланированных уроков нет',
    nextLesson: 'Следующий урок',
    nextMeeting: 'Следующая встреча',
    noForms: 'Нет ожидающих опросов',
    aiRequest: 'AI-запрос',
    thread: 'Диалог',
    form: 'Опрос',
    files: 'файлов',
    queued: 'В очереди',
  },
  en: {
    all: 'All',
    today: 'Today',
    yesterday: 'Yesterday',
    todo: 'To do',
    doing: 'In progress',
    review: 'In review',
    done: 'Done',
    me: 'Me',
    teacher: 'Teacher',
    branch: 'Branch',
    group: 'groups',
    student: 'students',
    parent: 'parent',
    lesson: 'lessons',
    pending: 'pending',
    openTasks: 'Open tasks',
    meetings: 'meetings',
    openRequests: 'Open requests',
    unread: 'Unread',
    noLessons: 'No lessons are scheduled',
    nextLesson: 'Next lesson',
    nextMeeting: 'Next meeting',
    noForms: 'No forms are waiting',
    aiRequest: 'AI request',
    thread: 'Thread',
    form: 'Form',
    files: 'files',
    queued: 'Queued',
  },
};

function copy() {
  return COPY[getLocale()] ?? COPY.en;
}

function localeTag() {
  return { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[getLocale()] ?? 'en-US';
}

/** The API uses both envelope pagination and a cursor feed for notifications. */
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDate(value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat(localeTag(), options).format(date) : '—';
}

function formatTime(value) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

function formatDeadline(value) {
  const date = validDate(value);
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month} · ${hour}:${minute}`;
}

function displayName(row) {
  return (
    row?.full_name ||
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') ||
    row?.username ||
    '—'
  );
}

function dateLabelForDay(value) {
  const date = validDate(value);
  if (!date) return '—';
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const theirs = new Date(date);
  theirs.setHours(0, 0, 0, 0);
  const offset = Math.round((start - theirs) / dayMs);
  if (offset === 0) return copy().today;
  if (offset === 1) return copy().yesterday;
  return formatDate(date, { day: '2-digit', month: 'short' });
}

function clientContractError(path, message) {
  return new ApiError(422, 'LOCAL', path, {
    code: 'frontend_contract_mismatch',
    message,
  });
}

async function optional(load, fallback) {
  try {
    return await load();
  } catch (error) {
    // A missing session must still reach SessionGate. Other optional panels can
    // remain empty when a role lacks a capability such as printing:read.
    if (error?.status === 401) throw error;
    if (error?.status === 403 || error?.status === 404) return fallback;
    throw error;
  }
}

function mapLegacyTeacher(user) {
  const membership = user?.role_memberships?.[0] ?? {};
  // The tenant API calls this `account_type_name` (for example, "Director"),
  // while older mock payloads used `role`. Accept both so staff never appears
  // as a teacher simply because the field name changed.
  const rawRole =
    membership.account_type_name ?? membership.role ?? membership.account_type_slug ?? null;
  const role = rawRole ? String(rawRole).replaceAll('_', ' ') : copy().teacher;
  return {
    id: user?.id,
    name: displayName(user),
    username: user?.username ?? '',
    // /users/me/ intentionally does not permit username changes.
    usernameEditable: false,
    role,
    roleKey: membership.role ?? membership.account_type_slug ?? membership.account_kind ?? 'staff',
    accountKind: membership.account_kind ?? 'staff',
    branchId: membership.branch ?? null,
    branch: membership.branch ? `${copy().branch} #${membership.branch}` : '—',
    preferredLanguage: user?.preferred_language ?? null,
    subjects: [],
  };
}

function hasTeacherMembership(user) {
  return asList(user?.role_memberships).some(
    (membership) => membership?.account_kind === 'teacher' || membership?.role === 'teacher',
  );
}

function mapTeacher(user) {
  const memberships = asList(user?.role_memberships);
  if (!memberships.length && (user?.account_type_name || user?.account_type_slug)) {
    return mapLegacyTeacher(user);
  }
  const membership = memberships[0] ?? {};
  const roles = memberships
    .map((item) => item?.role ?? item?.account_type_slug ?? item?.account_type_name)
    .filter(Boolean)
    .map((role) => String(role).trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const roleKey = roles[0] ?? membership.account_kind ?? 'staff';
  const rawRole = membership.account_type_name ?? membership.role ?? membership.account_type_slug ?? roleKey;
  const profile = {
    id: user?.id,
    name: displayName(user),
    username: user?.username ?? user?.email ?? user?.phone ?? '',
    usernameEditable: false,
    role: rawRole ? String(rawRole).replaceAll('_', ' ') : copy().teacher,
    roleKey,
    roles,
    roleMemberships: memberships,
    accountKind:
      membership.account_kind ?? (roles.includes('teacher') ? 'teacher' : roles.length ? 'staff' : 'unknown'),
    branchId: membership.branch ?? null,
    branch: membership.branch ? `${copy().branch} #${membership.branch}` : '—',
    preferredLanguage: user?.preferred_language ?? null,
    subjects: [],
    permissionCodes: asList(user?.permissions ?? user?.permission_codes),
  };
  return { ...profile, permissionCodes: profilePermissions(profile) };
}

function mapDevice(device) {
  return {
    id: device.id,
    platform: device.platform,
    userAgent: device.user_agent,
    lastSeenAt: device.last_seen_at,
    createdAt: device.created_at,
  };
}

function mapCohort(cohort, details = {}) {
  return {
    id: String(cohort.id),
    name: cohort.name ?? '',
    level: cohort.level || '—',
    subject: cohort.department_name || '—',
    studentCount: toNumber(details.studentCount, 0),
    attendance: toNumber(details.attendance, 0),
    up: 0,
    down: 0,
    next: cohort.default_room_name || '—',
    color: cohort.is_archived ? 'var(--sf-muted)' : 'var(--sf-primary)',
    room: cohort.default_room_name || '—',
  };
}

function mapRosterMember(member, attendanceByStudent) {
  const attendance = attendanceByStudent.get(String(member.student));
  const percent = attendance ? toNumber(attendance.percent_present, 0) : 0;
  return {
    id: String(member.student),
    name: member.student_name || `${copy().student} #${member.student}`,
    studentId: attendance?.student_code || String(member.student),
    up: 0,
    down: 0,
    attendance: percent,
    flag: percent > 0 && percent < 75 ? 'warn' : percent >= 95 ? 'top' : null,
  };
}

function mapTask(task) {
  const status =
    {
      open: 'todo',
      in_progress: 'doing',
      blocked: 'review',
      done: 'done',
      cancelled: 'done',
    }[task.status] ?? 'todo';
  const priority =
    {
      urgent: 'P1',
      high: 'P2',
      normal: 'P2',
      low: 'P3',
    }[task.priority] ?? 'P3';
  return {
    id: task.id,
    title: task.title ?? '',
    priority,
    state: status,
    project:
      task.department_name ||
      (task.department ? `${copy().branch} #${task.department}` : copy().all),
    projectColor: task.priority === 'urgent' ? 'var(--sf-danger)' : 'var(--sf-primary)',
    deadline: formatDeadline(task.due_at),
    urgent: task.priority === 'urgent',
    fromMgmt: Boolean(task.created_by && task.assignee && task.created_by !== task.assignee),
    subtasks: null,
    assigner: task.assignee ? `#${task.assignee}` : copy().me,
    mine: false,
  };
}

function apiTaskStatus(state) {
  return (
    {
      todo: 'open',
      doing: 'in_progress',
      review: 'blocked',
      done: 'done',
    }[state] ?? 'open'
  );
}

function apiTaskPriority(priority) {
  return { P1: 'urgent', P2: 'normal', P3: 'low' }[priority] ?? 'normal';
}

function taskColumns() {
  const labels = copy();
  return UI_TASK_COLUMNS.map((column) => ({ ...column, label: labels[column.id] }));
}

function taskFilters(tasks) {
  const count = (predicate) => tasks.filter(predicate).length;
  return [
    { key: 'all', label: copy().all, count: tasks.length },
    { key: 'mine', label: copy().me, count: count((task) => task.mine) },
    { key: 'mgmt', label: 'Management', count: count((task) => task.fromMgmt) },
    { key: 'urgent', label: 'P1', count: count((task) => task.urgent) },
    { key: 'done', label: copy().done, count: count((task) => task.state === 'done') },
  ];
}

function notificationPresentation(eventType) {
  const key = String(eventType ?? '').toLowerCase();
  if (key.includes('ai')) return { tone: 'ai', icon: 'AI' };
  if (key.includes('print')) return { tone: 'success', icon: 'print' };
  if (key.includes('message') || key.includes('chat')) return { tone: 'accent', icon: 'chat' };
  if (key.includes('task')) return { tone: 'primary', icon: 'flag' };
  if (key.includes('attendance')) return { tone: 'success', icon: 'check' };
  if (key.includes('card')) return { tone: 'warn', icon: 'brand' };
  return { tone: 'neutral', icon: 'bell' };
}

function mapNotification(notification) {
  return {
    id: String(notification.id),
    ...notificationPresentation(notification.event_type),
    title: notification.title || notification.event_type || '—',
    body: notification.body || '',
    time: formatTime(notification.created_at),
    createdAt: notification.created_at,
    read: Boolean(notification.read_at),
  };
}

function notificationGroups(rows) {
  const groups = new Map();
  for (const row of rows.map(mapNotification)) {
    const source = row.createdAt;
    const label = dateLabelForDay(source);
    const group = groups.get(label) ?? { label, items: [] };
    group.items.push(row);
    groups.set(label, group);
  }
  return [...groups.values()];
}

function notificationFilters(rows) {
  const all = rows.map(mapNotification);
  const count = (predicate) => all.filter(predicate).length;
  return [
    { key: 'all', label: copy().all, count: all.length },
    { key: 'ai', label: 'AI', count: count((row) => row.tone === 'ai') },
    { key: 'print', label: 'Print', count: count((row) => row.icon === 'print') },
    { key: 'msg', label: 'Messages', count: count((row) => row.icon === 'chat') },
  ];
}

function inferCardKind(name) {
  const value = String(name ?? '').toLowerCase();
  return value.includes('down') ||
    value.includes('warn') ||
    value.includes('minus') ||
    value.includes('negative')
    ? 'down'
    : 'up';
}

function mapCardType(type, cards = []) {
  return {
    id: type.id,
    name: type.name ?? `#${type.id}`,
    subtitle: type.is_active ? 'Active' : 'Inactive',
    kind: inferCardKind(type.name),
    count: cards.filter((card) => card.card_type === type.id).length,
  };
}

function mapCard(card, typeById) {
  const type = typeById.get(String(card.card_type));
  const typeName = type?.name ?? `#${card.card_type}`;
  return {
    id: String(card.id),
    recipient: `${copy().student} #${card.student}`,
    cohort: '',
    typeName,
    kind: inferCardKind(typeName),
    reason: card.code ? `Code: ${card.code}` : '—',
    issuer: card.issued_by ? `#${card.issued_by}` : '',
    when: formatTime(card.issued_at),
  };
}

function mapPrinter(printer) {
  const capabilities =
    printer.capabilities && typeof printer.capabilities === 'object' ? printer.capabilities : {};
  const sizes = capabilities.paper_sizes ?? capabilities.sizes ?? capabilities.formats ?? '—';
  return {
    id: String(printer.id),
    name: [printer.name, printer.model_name].filter(Boolean).join(' · ') || `#${printer.id}`,
    location: printer.branch ? `${copy().branch} #${printer.branch}` : '—',
    status: printer.is_active ? 'free' : 'locked',
    eta: printer.is_active ? '—' : '—',
    queue: 0,
    color: Boolean(capabilities.color || capabilities.colour),
    sizes: Array.isArray(sizes) ? sizes.join(' · ') : String(sizes),
    accent: printer.is_active ? 'var(--sf-success)' : 'var(--sf-muted)',
  };
}

function mapPrintJob(job) {
  const now = job.status === 'printing';
  return {
    id: String(job.id),
    doc: job.source
      ? `${job.source}${job.source_id ? ` #${job.source_id}` : ''}`
      : `Job #${job.id}`,
    icon: 'doc',
    copies: toNumber(job.copies, 1),
    size: `${job.pages ?? '—'} pages${job.color ? ' · color' : ''}`,
    printer: job.printer ? `#${job.printer}` : '—',
    progress: job.pages
      ? Math.min(100, Math.round((toNumber(job.pages_printed) / job.pages) * 100))
      : 0,
    eta: job.last_error || (now ? 'Printing' : copy().queued),
    state: now ? 'now' : 'queued',
  };
}

function mapForm(form) {
  const questions = Array.isArray(form.form_fields) ? form.form_fields.length : 0;
  const deadline = formatDeadline(form.closes_at);
  const close = validDate(form.closes_at);
  const remainingMs = close ? close.getTime() - Date.now() : Number.POSITIVE_INFINITY;
  return {
    id: String(form.id),
    title: form.title || copy().form,
    issuer: form.created_by ? `#${form.created_by}` : '—',
    deadline,
    remaining: close ? formatDate(form.closes_at, { day: '2-digit', month: 'short' }) : '—',
    questions,
    estimate: '—',
    progress: 0,
    urgent: remainingMs >= 0 && remainingMs < 3 * 24 * 60 * 60 * 1000,
  };
}

function mapFormQuestion(field, index) {
  const rawKind = String(field.field_type ?? field.type ?? 'text').toLowerCase();
  const kind =
    rawKind.includes('rating') || rawKind.includes('scale')
      ? 'rating'
      : rawKind.includes('checkbox') || rawKind.includes('multi')
        ? 'multi'
        : rawKind.includes('radio') || rawKind.includes('select') || rawKind.includes('choice')
          ? 'single'
          : rawKind.includes('bool')
            ? 'boolean'
            : rawKind.includes('textarea') || rawKind.includes('long')
              ? 'longText'
              : 'text';
  const options = asList(field.options ?? field.choices).map((option, optionIndex) => ({
    value: String(option?.value ?? option?.id ?? optionIndex),
    label: option?.label ?? option?.name ?? option?.title ?? String(option),
  }));
  return {
    id: String(field.id ?? `field-${index}`),
    kind,
    prompt: field.label ?? field.question ?? field.title ?? `${copy().form} ${index + 1}`,
    description: field.help_text ?? field.description ?? '',
    required: Boolean(field.required ?? field.is_required),
    ...(options.length ? { options } : {}),
  };
}

function mapThread(thread) {
  return {
    id: String(thread.id),
    name: thread.subject || `${copy().thread} #${thread.id}`,
    lead: false,
    role: copy().thread,
    lastMessage: '',
    time: formatTime(thread.last_message_at ?? thread.created_at),
    unread: toNumber(thread.unread_count),
    online: false,
    pinned: false,
    channel: false,
  };
}

function mapMessage(message, currentUserId) {
  return {
    id: String(message.id),
    dir: String(message.sender) === String(currentUserId) ? 'out' : 'in',
    text: message.body ?? '',
    time: formatTime(message.created_at),
    read: false,
  };
}

function materialKind(contentType) {
  const value = String(contentType ?? '').toLowerCase();
  if (value.includes('pdf')) return 'pdf';
  if (value.includes('video')) return 'video';
  if (value.includes('word') || value.includes('document') || value.includes('text')) return 'doc';
  return 'doc';
}

function bytesLabel(value) {
  const bytes = toNumber(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function mapMaterial(file) {
  const kind = materialKind(file.content_type);
  const color = { pdf: 'var(--sf-danger)', video: 'var(--sf-primary)', doc: 'var(--sf-accent)' }[
    kind
  ];
  return {
    id: String(file.id),
    title: file.title || `File #${file.id}`,
    meta: bytesLabel(file.size_bytes),
    kind,
    color,
    views: toNumber(file.view_count),
    date: formatDate(file.created_at, { day: '2-digit', month: 'short' }),
    aiSummary: false,
  };
}

function emptyAiTranscript() {
  return {
    outgoing1: '',
    reply: {
      leadItalic: '',
      leadRest: '',
      stats: [],
      bar: [],
      focusStudents: [],
      recommendationItalic: '',
      recommendationRest: '',
      actions: [],
      meta: '',
    },
    outgoing2: '',
  };
}

export class HttpAccountRepository extends IAccountRepository {
  #settings = {};

  async getTeacher() {
    return mapTeacher(await httpClient.get('users/me/'));
  }

  async updateTeacher(patch) {
    if (patch && Object.keys(patch).length) {
      throw clientContractError(
        'users/me/',
        'The current tenant API exposes the staff profile as read-only. Ask an authorized registrar to update identity details.',
      );
    }
    return this.getTeacher();
  }

  async getSettings() {
    const user = await httpClient.get('users/me/');
    return { ...this.#settings, locale: user.preferred_language ?? getLocale() };
  }

  async patchSettings(patch) {
    const next = { ...this.#settings, ...patch };
    this.#settings = next;
    return { ...next };
  }

  async listSessions() {
    return asList(await httpClient.get('users/devices/')).map(mapDevice);
  }

  ejectSession(id) {
    return httpClient.delete(`users/devices/${id}/`);
  }
}

export class HttpCohortRepository extends ICohortRepository {
  async #details(cohort) {
    const [members, attendance] = await Promise.all([
      optional(() => httpClient.get(`cohorts/${cohort.id}/members/`), []),
      optional(() => httpClient.get(`attendance/cohorts/${cohort.id}/dashboard/`), null),
    ]);
    return mapCohort(cohort, {
      studentCount: asList(members).length,
      attendance: attendance?.rate,
    });
  }

  async list() {
    const rows = asList(await httpClient.get('cohorts/?page_size=100'));
    return Promise.all(rows.map((row) => this.#details(row)));
  }

  async getById(id) {
    return this.#details(await httpClient.get(`cohorts/${id}/`));
  }

  async getRoster(cohortId) {
    const [members, dashboard] = await Promise.all([
      httpClient.get(`cohorts/${cohortId}/members/`),
      optional(() => httpClient.get(`attendance/cohorts/${cohortId}/dashboard/`), null),
    ]);
    const attendanceByStudent = new Map(
      asList(dashboard?.students).map((student) => [String(student.student), student]),
    );
    return asList(members).map((member) => mapRosterMember(member, attendanceByStudent));
  }

  async getWorkspace(cohortId, { from, to } = {}) {
    const windowFrom = from || new Date(Date.now() - 45 * 86400000).toISOString();
    const windowTo = to || new Date(Date.now() + 45 * 86400000).toISOString();
    const [cohort, roster, lessonPayload] = await Promise.all([
      this.getById(cohortId),
      this.getRoster(cohortId),
      optional(
        () =>
          httpClient.get(
            `schedule/lessons/?cohort=${encodeURIComponent(cohortId)}&date_from=${encodeURIComponent(windowFrom)}&date_to=${encodeURIComponent(windowTo)}&page_size=100`,
          ),
        [],
      ),
    ]);
    const lessons = asList(lessonPayload)
      .filter((lesson) => lesson.status !== 'cancelled')
      .map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title || lesson.lesson_type_name || copy().lesson,
        startsAt: lesson.starts_at,
        endsAt: lesson.ends_at,
        type: lesson.lesson_type || lesson.mode || 'main',
        typeLabel: lesson.lesson_type_name || lesson.lesson_type || copy().lesson,
        teacherName: lesson.teacher_name || lesson.teacher_display_name || copy().teacher,
        room: lesson.room_name || '',
      }))
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    const now = Date.now();
    const upcomingLessons = lessons.filter((lesson) => new Date(lesson.startsAt).getTime() >= now);
    const lastLesson = [...lessons]
      .reverse()
      .find((lesson) => new Date(lesson.startsAt).getTime() < now);
    const instructors = [
      ...new Map(
        lessons.map((lesson) => [
          lesson.teacherName,
          {
            id: lesson.teacherName,
            name: lesson.teacherName,
            role: lesson.type,
            roleLabel: lesson.typeLabel,
            isYou: false,
            online: false,
          },
        ]),
      ).values(),
    ];
    return {
      revision: 1,
      instructors,
      nextLesson: upcomingLessons[0] ?? null,
      upcomingLessons: upcomingLessons.slice(0, 6),
      lastLesson: lastLesson
        ? { ...lastLesson, homework: null, attendance: cohort.attendance }
        : null,
      attendanceHistory: [],
      progression: {
        mode: 'level',
        current: cohort.level,
        next: cohort.level,
        startedAt: '',
        eligible: false,
        readiness: cohort.attendance,
      },
      rosterCount: roster.length,
    };
  }

  async create(draft) {
    const branch = Number(draft?.branch);
    const startDate = draft?.start_date ?? draft?.startDate;
    const endDate = draft?.end_date ?? draft?.endDate;
    if (!Number.isInteger(branch) || branch < 1 || !startDate || !endDate) {
      throw clientContractError(
        'cohorts/',
        'Creating a cohort requires a branch, start date, and end date. The current form must collect these fields first.',
      );
    }
    const created = await httpClient.post('cohorts/', {
      name: draft.name,
      level: draft.level ?? '',
      branch,
      start_date: startDate,
      end_date: endDate,
    });
    return this.#details(created);
  }

  async saveAttendance(cohortId, entries) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const lessons = asList(
      await httpClient.get(
        `schedule/lessons/?cohort=${encodeURIComponent(cohortId)}&date_from=${encodeURIComponent(start.toISOString())}&date_to=${encodeURIComponent(end.toISOString())}&page_size=20`,
      ),
    ).filter((lesson) => lesson.status !== 'cancelled');
    const now = Date.now();
    const lesson = lessons.sort((a, b) => {
      const aMid = (new Date(a.starts_at).getTime() + new Date(a.ends_at).getTime()) / 2;
      const bMid = (new Date(b.starts_at).getTime() + new Date(b.ends_at).getTime()) / 2;
      return Math.abs(aMid - now) - Math.abs(bMid - now);
    })[0];
    if (!lesson) {
      throw clientContractError(
        'attendance/lessons/{lesson_id}/mark/',
        'Attendance can only be recorded when this group has a scheduled lesson today.',
      );
    }
    const payload = asList(entries).map((entry) => ({
      student: Number(entry.studentId),
      status: entry.present ? 'present' : 'absent',
    }));
    return httpClient.post(`attendance/lessons/${lesson.id}/mark/`, payload);
  }

  async advance() {
    throw clientContractError(
      'cohorts/{id}/advance/',
      'The supplied API does not expose forced cohort progression.',
    );
  }
}

export class HttpCardRepository extends ICardRepository {
  #snapshot = null;

  async #loadSnapshot() {
    if (!this.#snapshot) {
      this.#snapshot = Promise.all([
        httpClient.get('cards/?page_size=100'),
        httpClient.get('cards/types/?page_size=100'),
      ]).then(([cards, types]) => ({ cards: asList(cards), types: asList(types) }));
    }
    return this.#snapshot;
  }

  async listRecent() {
    const { cards, types } = await this.#loadSnapshot();
    const typeById = new Map(types.map((type) => [String(type.id), type]));
    return [...cards]
      .sort((a, b) => String(b.issued_at ?? '').localeCompare(String(a.issued_at ?? '')))
      .slice(0, 10)
      .map((card) => mapCard(card, typeById));
  }

  async listTypes() {
    const { cards, types } = await this.#loadSnapshot();
    return types.map((type) => mapCardType(type, cards));
  }

  async getStats() {
    const { cards, types } = await this.#loadSnapshot();
    const typed = types.map((type) => mapCardType(type, cards));
    const up = cards.filter(
      (card) => inferCardKind(typed.find((type) => type.id === card.card_type)?.name) === 'up',
    ).length;
    const recipients = new Set(cards.map((card) => card.student)).size;
    return {
      upThisWeek: up,
      downThisWeek: cards.length - up,
      recipients,
      typeCount: types.length,
      typeVersion: '',
      upTrend: '',
    };
  }

  async issue(input) {
    const requestedStudent = input?.student ?? input?.studentId ?? input?.recipient;
    const directId = Number(requestedStudent);
    let student = directId;

    // The UI accepts a teacher-friendly student name, whereas POST /cards/
    // needs an id. Resolve a unique directory match before issuing instead of
    // making every non-numeric entry fail locally.
    if (!Number.isInteger(directId) || directId < 1) {
      const query = String(requestedStudent ?? '').trim();
      if (query) {
        const matches = asList(
          await httpClient.get(`students/?page_size=5&search=${encodeURIComponent(query)}`),
        );
        const normalized = query.toLocaleLowerCase();
        const exact = matches.find((candidate) => {
          const name = String(candidate.full_name ?? '')
            .trim()
            .toLocaleLowerCase();
          return name === normalized;
        });
        const match = exact ?? (matches.length === 1 ? matches[0] : null);
        student = Number(match?.id);
      }
    }

    if (!Number.isInteger(student) || student < 1) {
      throw clientContractError(
        'cards/',
        'No matching student was found. Enter the full name exactly as it appears in the student directory.',
      );
    }
    const { types } = await this.#loadSnapshot();
    const selectedType = types.find((type) => type.name === input?.typeName);
    if (!selectedType) {
      throw clientContractError(
        'cards/',
        'Choose an active card type from the tenant card catalogue.',
      );
    }
    const created = await httpClient.post('cards/', { student, card_type: selectedType.id });
    this.#snapshot = null;
    return created;
  }

  async scan(code) {
    const result = await httpClient.post('cards/scan/', { code: String(code ?? '').trim() });
    return {
      scanId: String(result.scan_id),
      valid: Boolean(result.valid),
      student: result.student_name || `${copy().student} #${result.student}`,
      cardType: result.card_type || '',
      scannedAt: result.scanned_at,
      attendanceLesson: result.attendance_lesson,
    };
  }
}

export class HttpTaskRepository extends ITaskRepository {
  #listRequest = null;

  async list() {
    if (!this.#listRequest) {
      this.#listRequest = httpClient
        .get('tasks/?page_size=100')
        .then((payload) => asList(payload).map(mapTask))
        .finally(() => {
          this.#listRequest = null;
        });
    }
    return this.#listRequest;
  }

  listColumns() {
    return Promise.resolve(taskColumns());
  }

  async listFilters() {
    return taskFilters(await this.list());
  }

  async setState(id, state) {
    return mapTask(
      await httpClient.post(`tasks/${id}/transition/`, { status: apiTaskStatus(state) }),
    );
  }

  // The legacy remote API can change status but has no stable ordering contract.
  // Preserve the state move and let its server-defined order remain authoritative.
  async move(id, state, _targetIndex) {
    return this.setState(id, state);
  }

  async create(draft) {
    return mapTask(
      await httpClient.post('tasks/', {
        title: draft.title,
        priority: apiTaskPriority(draft.priority),
      }),
    );
  }
}

export class LegacyHttpDashboardRepository extends IDashboardRepository {
  async getToday() {
    const [me, rawTasks, rawMeetings, rawRequests, rawUnread] = await Promise.all([
      optional(() => httpClient.get('users/me/'), null),
      optional(() => httpClient.get('tasks/mine/?page_size=5'), []),
      optional(() => httpClient.get('meetings/upcoming/?page_size=20'), []),
      optional(() => httpClient.get('approvals/requests/?page_size=20'), []),
      optional(() => httpClient.get('notifications/unread-count/'), { count: 0 }),
    ]);
    // This endpoint is only installed for teacher account types. Staff such as a
    // Director receive a lean but complete dashboard instead of a 404 page.
    const dashboard = hasTeacherMembership(me)
      ? await optional(() => httpClient.get('teachers/dashboard/'), {})
      : {};
    const lessons = asList(dashboard.next_lessons);
    const next = lessons[0] ?? null;
    const tasks = asList(rawTasks)
      .map(mapTask)
      .filter((task) => task.state !== 'done');
    const form = asList(dashboard.pending_forms)[0] ?? null;
    const groups = toNumber(dashboard.groups_count);
    const students = toNumber(dashboard.students_count);
    const meeting = dashboard.next_meeting;
    const staffMeeting = asList(rawMeetings)[0] ?? null;
    const teacherMode = hasTeacherMembership(me);
    const name = displayName(me).split(' ')[0] || '';
    return {
      meta: {
        dateLabel: formatDate(new Date(), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        greetingName: name,
        summary: teacherMode
          ? `${groups} ${copy().group} · ${lessons.length} ${copy().lesson} · ${students} ${copy().student}`
          : `${tasks.length} ${copy().openTasks} · ${asList(rawMeetings).length} ${copy().meetings} · ${asList(rawRequests).filter((request) => request.status === 'pending').length} ${copy().pending}`,
      },
      surveyBanner: form
        ? {
            remaining: formatDeadline(form.closes_at),
            title: form.title,
            meta: `${toNumber(form.questions, 0)} ${copy().pending}`,
          }
        : null,
      stats: teacherMode
        ? [
            { value: String(groups), label: copy().group },
            { value: String(students), label: copy().student, color: 'var(--sf-success)' },
            { value: String(lessons.length), label: copy().lesson, color: 'var(--sf-primary)' },
            { value: String(tasks.length), label: copy().openTasks, color: 'var(--sf-accent)' },
          ]
        : [
            { value: String(tasks.length), label: copy().openTasks, color: 'var(--sf-primary)' },
            {
              value: String(asList(rawMeetings).length),
              label: copy().meetings,
              color: 'var(--sf-success)',
            },
            {
              value: String(
                asList(rawRequests).filter((request) => request.status === 'pending').length,
              ),
              label: copy().openRequests,
              color: 'var(--sf-accent)',
            },
            {
              value: String(toNumber(rawUnread?.count)),
              label: copy().unread,
              color: 'var(--sf-warn)',
            },
          ],
      workspaceMode: teacherMode ? 'teaching' : 'staff',
      performance: {
        rank: {
          position: toNumber(dashboard.teacher_rank?.position),
          total: toNumber(dashboard.teacher_rank?.total),
          score: toNumber(dashboard.teacher_rank?.score),
          change: toNumber(dashboard.teacher_rank?.change),
          percentile: dashboard.teacher_rank?.percentile ?? '',
          nextGap: toNumber(dashboard.teacher_rank?.next_gap),
        },
        attendanceTrend: asList(dashboard.attendance_trend).map((point) => ({
          label: String(point.label ?? point.date ?? ''),
          value: toNumber(point.value ?? point.attendance),
        })),
        weeklyLoad: asList(dashboard.weekly_load).map((point) => ({
          label: String(point.label ?? point.day ?? ''),
          value: toNumber(point.value ?? point.lessons),
        })),
        scoreBreakdown: asList(dashboard.score_breakdown).map((metric) => ({
          label: String(metric.label ?? ''),
          value: toNumber(metric.value),
          target: toNumber(metric.target),
        })),
        groupHealth: asList(dashboard.group_health).map((group) => ({
          name: String(group.name ?? ''),
          attendance: toNumber(group.attendance),
          up: toNumber(group.up_cards),
          down: toNumber(group.down_cards),
        })),
        updatedAt: dashboard.updated_at ? formatTime(dashboard.updated_at) : '',
      },
      heroLesson: next
        ? {
            available: true,
            kind: 'lesson',
            eyebrow: copy().nextLesson,
            title: next.title || next.cohort || copy().nextLesson,
            titleAccent: next.cohort || '',
            sub: next.lesson_type || next.cohort || '',
            start: formatTime(next.starts_at),
            end: next.ends_at ? `– ${formatTime(next.ends_at)}` : '',
          }
        : staffMeeting && !teacherMode
          ? {
              available: true,
              kind: 'meeting',
              eyebrow: copy().nextMeeting,
              title: staffMeeting.title || copy().thread,
              titleAccent: '',
              sub: staffMeeting.location || '',
              start: formatTime(staffMeeting.starts_at),
              end: staffMeeting.ends_at ? `– ${formatTime(staffMeeting.ends_at)}` : '',
            }
          : {
              available: false,
              kind: teacherMode ? 'lesson' : 'staff',
              eyebrow: copy().nextLesson,
              title: copy().noLessons,
              titleAccent: '',
              sub: '',
              start: '—',
              end: '',
            },
      schedule: lessons.map((lesson, index) => ({
        time: formatTime(lesson.starts_at),
        label: lesson.title || lesson.cohort || copy().nextLesson,
        room: lesson.cohort || '',
        state: index === 0 ? 'next' : 'planned',
      })),
      recentCards: [],
      pendingTasks: tasks,
      aiInsight: {
        eyebrow: 'AI',
        count: '',
        quote: '',
        chips: [],
      },
      printQueue: [],
      mgmtMention: (teacherMode ? meeting : staffMeeting)
        ? {
            name: (teacherMode ? meeting : staffMeeting).title || copy().thread,
            role: teacherMode ? copy().nextLesson : copy().meetings,
            message: (teacherMode ? meeting : staffMeeting).location || '',
            time: formatTime((teacherMode ? meeting : staffMeeting).starts_at),
          }
        : { name: copy().thread, role: '', message: '', time: '' },
      spotlight: {
        name: Object.keys(dashboard.level_groups ?? {})[0] || '—',
        sub: `${groups} ${copy().group}`,
        tone: 'neutral',
        toneLabel: '',
        stats: [],
      },
      activity: [],
    };
  }
}

const LIVE_DASHBOARD_SOURCES = [
  { id: 'students', endpoint: 'students/?page_size=100', permission: 'students', label: 'Students', path: '/students' },
  { id: 'staff', endpoint: 'users/?page_size=100', permission: 'users', label: 'Staff', path: '/staff' },
  { id: 'teachers', endpoint: 'teachers/?page_size=100', permission: 'teachers', label: 'Teachers', path: '/teachers' },
  { id: 'parents', endpoint: 'parents/?page_size=100', permission: 'parents', label: 'Parents', path: '/parents' },
  { id: 'cohorts', endpoint: 'cohorts/?page_size=100', permission: 'cohorts', label: 'Groups', path: '/cohorts' },
  { id: 'schedule', endpoint: 'schedule/?page_size=100', permission: 'schedule', label: 'Schedule', path: '/schedule' },
  { id: 'attendance', endpoint: 'attendance/?page_size=100', permission: 'attendance', label: 'Attendance', path: '/attendance' },
  { id: 'academics', endpoint: 'academics/?page_size=100', permission: 'academics', label: 'Academics', path: '/academics' },
  { id: 'assignments', endpoint: 'assignments/?page_size=100', permission: 'assignments', label: 'Assignments', path: '/assignments' },
  { id: 'content', endpoint: 'content/?page_size=100', permission: 'content', label: 'Content', path: '/content' },
  { id: 'finance', endpoint: 'finance/?page_size=100', permission: 'finance', label: 'Finance', path: '/finance' },
  { id: 'payments', endpoint: 'payments/?page_size=100', permission: 'payments', label: 'Payments', path: '/payments' },
  { id: 'printing', endpoint: 'printing/?page_size=100', permission: 'printing', label: 'Printing', path: '/printing' },
  { id: 'notifications', endpoint: 'notifications/?page_size=100', permission: 'notifications', label: 'Notifications', path: '/notifications' },
  { id: 'ai', endpoint: 'ai/?page_size=100', permission: 'ai_app', label: 'AI requests', path: '/ai' },
  { id: 'reports', endpoint: 'reports/?page_size=100', permission: 'reports', label: 'Reports', path: '/reports' },
  { id: 'audit', endpoint: 'audit/?page_size=100', permission: 'audit', label: 'Audit entries', path: '/audit' },
];

function liveRecordName(row, source) {
  return row?.name || row?.title || row?.full_name || row?.email || `${source.label} #${row?.id ?? '—'}`;
}

function recordTimestamp(row) {
  const value = row?.updated_at ?? row?.created_at ?? row?.starts_at ?? row?.date ?? null;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function activityTrend(rows, range) {
  const dated = rows.map(recordTimestamp).filter(Boolean);
  if (!dated.length) return [];
  const days = range === 'term' ? 84 : range === '30d' ? 30 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, value: 0 };
  });
  for (const date of dated) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const index = Math.round((day - start) / 86400000);
    if (index >= 0 && index < buckets.length) buckets[index].value += 1;
  }
  return buckets.map((bucket) => ({
    label: new Intl.DateTimeFormat(localeTag(), {
      day: 'numeric',
      month: days > 7 ? 'short' : undefined,
      weekday: days <= 7 ? 'short' : undefined,
    }).format(bucket.date),
    value: bucket.value,
    date: bucket.date.toISOString(),
  }));
}

/** Live dashboard assembled only from the backend resources this role can read. */
export class HttpDashboardRepository extends IDashboardRepository {
  async getToday(range = '7d') {
    const rawProfile = await httpClient.get('users/me/');
    const profile = mapTeacher(rawProfile);
    const sources = LIVE_DASHBOARD_SOURCES.filter((source) => canAccess(profile, source.permission));
    const loaded = await Promise.all(
      sources.map(async (source) => ({
        ...source,
        rows: asList(await optional(() => httpClient.get(source.endpoint), [])),
      })),
    );
    const allRows = loaded.flatMap((source) => source.rows.map((row) => ({ row, source })));
    const total = loaded.reduce((sum, source) => sum + source.rows.length, 0);
    const teaching = profile.roles.includes('teacher');
    const populated = loaded.filter((source) => source.rows.length);
    const overview = (populated.length ? populated : loaded).slice(0, 4);
    const schedule = loaded.find((source) => source.id === 'schedule')?.rows ?? [];
    const upcoming = schedule
      .map((row) => ({ row, startsAt: row?.starts_at ? new Date(row.starts_at) : null }))
      .filter((item) => item.startsAt && !Number.isNaN(item.startsAt.getTime()) && item.startsAt.getTime() >= Date.now())
      .sort((a, b) => a.startsAt - b.startsAt)[0]?.row;
    const cohortRows = loaded.find((source) => source.id === 'cohorts')?.rows ?? [];
    const trend = activityTrend(allRows.map((item) => item.row), range);
    const distribution = loaded
      .filter((source) => source.rows.length)
      .slice(0, 8)
      .map((source) => ({ label: source.label, value: source.rows.length, path: source.path }));
    const breakdown = loaded
      .filter((source) => source.rows.length)
      .slice(0, 6)
      .map((source) => ({
        label: source.label,
        value: Math.round((source.rows.filter((row) => row?.is_active !== false).length / source.rows.length) * 100),
        target: 100,
        path: source.path,
      }));

    return {
      meta: {
        dateLabel: formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        greetingName: profile.name.split(' ')[0] || '',
        summary: `${total} live records across ${loaded.length} workspace${loaded.length === 1 ? '' : 's'}`,
      },
      surveyBanner: null,
      stats: overview.map((source) => ({
        value: String(source.rows.length),
        label: source.label,
        color: source.id === 'finance' ? 'var(--sf-success)' : 'var(--sf-primary)',
        path: source.path,
      })),
      workspaceMode: teaching ? 'teaching' : 'staff',
      analytics: {
        trendTitle: 'Activity trend',
        trendSubtitle: `New and updated API records over ${range === 'term' ? 'the term' : range.replace('d', ' days')}`,
        trendUnit: 'records',
        distributionTitle: 'Records by workspace',
        distributionSubtitle: 'Only authorized sources are included',
        breakdownTitle: 'Active record health',
        breakdownSubtitle: 'Share of active records in each workspace',
        groupTitle: 'Group availability',
        groupSubtitle: 'Live group records in your scope',
      },
      performance: {
        rank: { position: 0, total: 0, score: 0, change: 0, percentile: '', nextGap: 0 },
        attendanceTrend: trend,
        weeklyLoad: distribution,
        scoreBreakdown: breakdown,
        groupHealth: cohortRows.slice(0, 6).map((group) => ({
          id: String(group.id),
          name: liveRecordName(group, { label: 'Group' }),
          attendance: toNumber(group.attendance ?? group.rate),
          up: 0,
          down: 0,
        })),
        updatedAt: allRows.length
          ? formatTime(
              allRows
                .map((item) => recordTimestamp(item.row))
                .filter(Boolean)
                .sort((a, b) => b - a)[0],
            )
          : '',
      },
      heroLesson: upcoming
        ? {
            available: true,
            kind: 'lesson',
            eyebrow: 'Next scheduled item',
            title: liveRecordName(upcoming, { label: 'Schedule' }),
            titleAccent: '',
            sub: upcoming.notes || '',
            start: formatTime(upcoming.starts_at),
            end: upcoming.ends_at ? `– ${formatTime(upcoming.ends_at)}` : '',
          }
        : { available: false, kind: teaching ? 'lesson' : 'staff', title: '', titleAccent: '', sub: '', start: '—', end: '' },
      schedule: schedule.slice(0, 6).map((lesson) => ({
        time: formatTime(lesson.starts_at ?? lesson.created_at),
        label: liveRecordName(lesson, { label: 'Schedule' }),
        room: lesson.notes || '',
        state: 'planned',
      })),
      recentCards: [],
      pendingTasks: [],
      aiInsight: null,
      printQueue: [],
      mgmtMention: { name: '', role: '', message: '', time: '' },
      spotlight: cohortRows[0]
        ? { name: liveRecordName(cohortRows[0], { label: 'Group' }), sub: 'Live group record', tone: 'neutral', toneLabel: '', stats: [] }
        : null,
      activity: allRows
        .sort((a, b) => (recordTimestamp(b.row)?.getTime() ?? 0) - (recordTimestamp(a.row)?.getTime() ?? 0))
        .slice(0, 6)
        .map(({ row, source }) => ({
          icon: source.id === 'finance' || source.id === 'payments' ? 'pie' : 'doc',
          color: 'var(--sf-primary)',
          title: liveRecordName(row, source),
          body: source.label,
          time: formatTime(recordTimestamp(row)),
        })),
    };
  }
}

export class HttpAiRepository extends IAiRepository {
  #unavailable = false;

  #unavailableStatus = 503;

  #conversationsRequest = null;

  #usageRequest = null;

  #fallbackUsage() {
    return { used: 0, limit: 0, unavailable: true, status: this.#unavailableStatus };
  }

  #markUnavailable(error) {
    // A missing session must still reach SessionGate. A disabled or degraded AI
    // provider should not take down the rest of the teacher workspace.
    if (error?.status === 401) throw error;
    this.#unavailable = true;
    this.#unavailableStatus = Number.isInteger(error?.status) ? error.status : 503;
  }

  async listConversations() {
    if (this.#unavailable) return [];
    if (!this.#conversationsRequest) {
      this.#conversationsRequest = httpClient
        .get('ai/requests/?page_size=50', { retry: false })
        .then((payload) =>
          asList(payload).map((request, index) => ({
            id: String(request.id),
            name: `${copy().aiRequest} · ${request.feature ?? request.id}`,
            sub: request.status ?? '',
            time: formatTime(request.created_at),
            preview: '',
            pinned: false,
            active: index === 0,
            color: 'var(--sf-ai)',
            isAll: true,
          })),
        )
        .catch((error) => {
          this.#markUnavailable(error);
          return [];
        })
        .finally(() => {
          this.#conversationsRequest = null;
        });
    }
    return this.#conversationsRequest;
  }

  async getUsage() {
    if (this.#unavailable) return this.#fallbackUsage();
    if (!this.#usageRequest) {
      this.#usageRequest = httpClient
        .get('ai/budget/', { retry: false })
        .then((budget) => ({
          used: toNumber(budget.tokens_used_month),
          limit: toNumber(budget.monthly_token_limit),
          unavailable: false,
        }))
        .catch((error) => {
          this.#markUnavailable(error);
          return this.#fallbackUsage();
        })
        .finally(() => {
          this.#usageRequest = null;
        });
    }
    return this.#usageRequest;
  }

  getWorkspace() {
    return Promise.resolve({
      prompts: [],
      context: [],
      attention: [],
      topics: [],
      transcript: emptyAiTranscript(),
    });
  }

  async sendMessage() {
    throw clientContractError(
      'ai/requests/',
      'The supplied API exposes audited AI jobs, not a chat-conversation endpoint. Add a server chat endpoint before enabling chat messages.',
    );
  }

  async clearMessages() {
    throw clientContractError(
      'ai/requests/',
      'AI request history is append-only in the supplied API.',
    );
  }
}

export class HttpPrintRepository extends IPrintRepository {
  async listPrinters() {
    return asList(await httpClient.get('printing/printers/?page_size=100')).map(mapPrinter);
  }

  async listJobs() {
    return asList(await httpClient.get('printing/jobs/?page_size=100')).map(mapPrintJob);
  }

  getLibrary() {
    return Promise.resolve({ fileCount: 0 });
  }

  async createJob() {
    throw clientContractError(
      'printing/jobs/',
      'A print job needs a tenant S3 payload key, branch, source, source ID, and page count. The quick-print form must complete the signed-upload flow first.',
    );
  }

  async cancelJob() {
    throw clientContractError(
      'printing/jobs/{id}/',
      'The supplied API has no staff-side cancel-print-job endpoint.',
    );
  }
}

export class HttpSurveyRepository extends ISurveyRepository {
  #drafts = new Map();

  async listActive() {
    const forms = asList(await httpClient.get('forms/?status=published&page_size=100'));
    return forms.map(mapForm);
  }

  listHistory() {
    // The contract has no endpoint for a respondent's form history. Returning an
    // honest empty state is safer than displaying another user's responses.
    return Promise.resolve([]);
  }

  async getDetail(id) {
    const form = await httpClient.get(`forms/${id}/`);
    return {
      ...mapForm(form),
      questions: asList(form.form_fields).map(mapFormQuestion),
      draft: this.#drafts.get(String(id)) ?? { answers: {}, progress: 0 },
    };
  }

  saveDraft(id, input) {
    this.#drafts.set(String(id), input);
    return Promise.resolve({ id, ...input });
  }

  submit(id, input) {
    return httpClient.post(`forms/${id}/submit/`, { answers: input.answers ?? {} });
  }

  async skip() {
    throw clientContractError(
      'forms/{id}/',
      'The supplied forms API does not support skipping a form.',
    );
  }
}

export class HttpMgmtRepository extends IMgmtRepository {
  #currentUserId = null;

  async #getCurrentUserId() {
    if (this.#currentUserId == null) {
      const user = await httpClient.get('users/me/');
      this.#currentUserId = user.id;
    }
    return this.#currentUserId;
  }

  async listThreads() {
    return asList(await httpClient.get('messaging/threads/?page_size=100')).map(mapThread);
  }

  async getTranscript(threadId) {
    const [messages, currentUserId] = await Promise.all([
      httpClient.get(`messaging/threads/${threadId}/messages/?page_size=100`),
      this.#getCurrentUserId(),
    ]);
    return asList(messages).map((message) => mapMessage(message, currentUserId));
  }

  async sendMessage(threadId, text) {
    const currentUserId = await this.#getCurrentUserId();
    return mapMessage(
      await httpClient.post(`messaging/threads/${threadId}/messages/`, { body: text }),
      currentUserId,
    );
  }

  async createThread() {
    throw clientContractError(
      'messaging/threads/',
      'Starting a message requires selected numeric participant IDs. The current free-text recipient form must be connected to the user directory first.',
    );
  }

  markRead(threadId) {
    return httpClient.post(`messaging/threads/${threadId}/read/`, {});
  }

  async archiveThread() {
    throw clientContractError(
      'messaging/threads/{id}/',
      'The supplied messaging API does not expose thread archiving.',
    );
  }

  async deleteThread() {
    throw clientContractError(
      'messaging/threads/{id}/',
      'The supplied messaging API does not expose conversation deletion.',
    );
  }
}

export class HttpNotificationRepository extends INotificationRepository {
  #listRequest = null;

  async #list() {
    if (!this.#listRequest) {
      this.#listRequest = httpClient
        .get('notifications/?page_size=100')
        .then(asList)
        .finally(() => {
          this.#listRequest = null;
        });
    }
    return this.#listRequest;
  }

  async listGroups() {
    return notificationGroups(await this.#list());
  }

  async listFilters() {
    return notificationFilters(await this.#list());
  }

  markRead(id) {
    return httpClient.post(`notifications/${id}/read/`, {});
  }

  markAllRead() {
    return httpClient.post('notifications/read-all/', {});
  }
}

export class HttpMaterialRepository extends IMaterialRepository {
  #filesRequest = null;

  async #files() {
    if (!this.#filesRequest) {
      this.#filesRequest = httpClient
        .get('content/files/?page_size=100')
        .then(asList)
        .finally(() => {
          this.#filesRequest = null;
        });
    }
    return this.#filesRequest;
  }

  async list() {
    return (await this.#files()).map(mapMaterial);
  }

  async getStats() {
    const files = await this.#files();
    const count = (kind) => files.filter((file) => materialKind(file.content_type) === kind).length;
    return [
      { value: String(count('pdf')), label: 'PDF', color: 'var(--sf-danger)' },
      { value: String(count('video')), label: 'Video', color: 'var(--sf-primary)' },
      { value: String(count('doc')), label: 'Documents', color: 'var(--sf-accent)' },
    ];
  }

  async getStorage() {
    const files = await this.#files();
    const bytes = files.reduce((sum, file) => sum + toNumber(file.size_bytes), 0);
    return { used: bytesLabel(bytes), total: '—', fileCount: files.length };
  }

  async create() {
    throw clientContractError(
      'content/upload-url/',
      'Material upload must use the signed-upload workflow and choose a lesson or folder before it can be created.',
    );
  }

  async remove() {
    throw clientContractError(
      'content/files/{id}/',
      'The supplied API does not expose file deletion from this screen.',
    );
  }
}

async function capability(load) {
  try {
    return { available: true, data: await load() };
  } catch (error) {
    if (error?.status === 401) throw error;
    if (error?.status === 403 || error?.status === 404) {
      return { available: false, data: [] };
    }
    throw error;
  }
}

function workWindow() {
  const from = new Date();
  const weekday = from.getDay() || 7;
  from.setDate(from.getDate() - weekday - 13);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 42);
  return { from: from.toISOString(), to: to.toISOString() };
}

function mapWorkLesson(lesson, index = 0) {
  const colors = ['var(--sf-primary)', 'var(--sf-accent)', 'var(--sf-success)'];
  return {
    id: String(lesson.id),
    title: lesson.title || lesson.lesson_type_name || copy().nextLesson,
    cohort: lesson.cohort_name || '',
    type: lesson.lesson_type_name || copy().lesson,
    room: lesson.room_name || '',
    startsAt: lesson.starts_at,
    endsAt: lesson.ends_at,
    status: lesson.status || 'scheduled',
    color: colors[index % colors.length],
  };
}

function mapWorkMeeting(meeting, currentUserId) {
  const attendee = asList(meeting.attendees).find(
    (item) => String(item.user) === String(currentUserId),
  );
  return {
    id: String(meeting.id),
    title: meeting.title || '',
    agenda: meeting.agenda || '',
    location: meeting.location || '',
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    status: meeting.status || 'scheduled',
    response: attendee?.response || 'pending',
  };
}

function mapWorkRequest(request) {
  return {
    id: String(request.id),
    kind: request.kind || 'other',
    title: request.title || '',
    description: request.description || '',
    amount: request.amount_uzs == null ? null : toNumber(request.amount_uzs),
    outstanding: request.outstanding_uzs == null ? null : toNumber(request.outstanding_uzs),
    status: request.status || 'pending',
    createdAt: request.created_at,
  };
}

function mapWorkCover(cover, lessonsById) {
  const lesson = lessonsById.get(String(cover.lesson));
  return {
    id: String(cover.id),
    lessonId: String(cover.lesson),
    lessonTitle: lesson?.title || `${copy().lesson} #${cover.lesson}`,
    time: lesson?.startsAt || cover.created_at,
    reason: cover.reason || '',
    status: cover.status || 'pending',
    pool: Boolean(cover.pool),
  };
}

export class HttpWorkRepository extends IWorkRepository {
  #currentUserId = null;

  async #me() {
    const me = await httpClient.get('users/me/');
    this.#currentUserId = me.id;
    return me;
  }

  async getWorkspace() {
    const { from, to } = workWindow();
    const [me, schedule, meetings, requests, loans, covers, pool] = await Promise.all([
      this.#me(),
      capability(() =>
        httpClient.get(
          `schedule/lessons/?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}&page_size=200`,
        ),
      ),
      capability(() => httpClient.get('meetings/upcoming/?page_size=100')),
      capability(() => httpClient.get('approvals/requests/?page_size=100')),
      capability(() => httpClient.get('loans/?page_size=100')),
      capability(() => httpClient.get('cover/?page_size=100')),
      capability(() => httpClient.get('cover/pool/?page_size=100')),
    ]);
    const lessons = asList(schedule.data).map(mapWorkLesson);
    const lessonsById = new Map(lessons.map((lesson) => [String(lesson.id), lesson]));
    const requestMap = new Map(
      [...asList(requests.data), ...asList(loans.data)].map((request) => [
        String(request.id),
        mapWorkRequest(request),
      ]),
    );
    const coverMap = new Map(
      [...asList(covers.data), ...asList(pool.data)].map((cover) => [
        String(cover.id),
        mapWorkCover(cover, lessonsById),
      ]),
    );
    return {
      profile: mapTeacher(me),
      capabilities: {
        schedule: schedule.available,
        meetings: meetings.available,
        requests: requests.available,
        loans: loans.available,
        cover: covers.available || pool.available,
      },
      lessons,
      meetings: asList(meetings.data).map((meeting) =>
        mapWorkMeeting(meeting, this.#currentUserId),
      ),
      requests: [...requestMap.values()],
      coverage: [...coverMap.values()],
    };
  }

  async createRequest(input) {
    if (input.kind === 'loan') {
      return mapWorkRequest(
        await httpClient.post('loans/', {
          title: input.title,
          description: input.description || '',
          amount_uzs: input.amount,
        }),
      );
    }
    return mapWorkRequest(
      await httpClient.post('approvals/requests/', {
        kind: input.kind,
        title: input.title,
        description: input.description || '',
        amount_uzs: input.amount || null,
        payload: {},
      }),
    );
  }

  async cancelRequest(id) {
    return mapWorkRequest(await httpClient.post(`approvals/requests/${id}/cancel/`, {}));
  }

  async respondMeeting(id, response) {
    return mapWorkMeeting(
      await httpClient.post(`meetings/${id}/respond/`, { response }),
      this.#currentUserId,
    );
  }

  async claimCover(id) {
    return httpClient.post(`cover/${id}/claim/`, {});
  }

  async requestCover(input) {
    return httpClient.post('cover/', {
      lesson: Number(input.lessonId),
      reason: input.reason || '',
    });
  }
}

function mapFinanceInvoice(invoice) {
  return {
    id: String(invoice.id),
    number: invoice.number || `#${invoice.id}`,
    student: invoice.student_name || `${copy().student} #${invoice.student}`,
    cohort: invoice.cohort_name || '',
    total: toNumber(invoice.total_uzs),
    allocated: asList(invoice.allocations).reduce(
      (sum, allocation) => sum + toNumber(allocation.amount_uzs),
      0,
    ),
    status: invoice.status || 'issued',
    dueDate: invoice.due_date,
  };
}

function mapFinancePayment(payment) {
  return {
    id: String(payment.id),
    provider: payment.provider || '',
    account: payment.account_ref || '',
    amount: toNumber(payment.amount_uzs),
    status: payment.status || 'pending',
    paidAt: payment.paid_at || payment.created_at,
  };
}

function mapFinanceExpense(expense) {
  return {
    id: String(expense.id),
    category: expense.category || '',
    description: expense.description || '',
    amount: toNumber(expense.amount_uzs),
    status: expense.status || 'pending',
    createdAt: expense.created_at,
  };
}

function mapFinanceShift(shift) {
  return {
    id: String(shift.id),
    cashier: shift.cashier_name || '',
    branch: shift.branch_name || '',
    status: shift.status || 'open',
    openedAt: shift.opened_at,
    openingCash: toNumber(shift.opening_cash_uzs),
    closingCash: shift.closing_cash_uzs == null ? null : toNumber(shift.closing_cash_uzs),
    discrepancy: shift.discrepancy_uzs == null ? null : toNumber(shift.discrepancy_uzs),
  };
}

export class HttpFinanceRepository extends IFinanceRepository {
  async getWorkspace() {
    const [me, invoices, payments, expenses, shifts] = await Promise.all([
      httpClient.get('users/me/'),
      capability(() => httpClient.get('finance/invoices/?page_size=100&ordering=-created_at')),
      capability(() => httpClient.get('payments/?page_size=100&ordering=-created_at')),
      capability(() => httpClient.get('finance/expenses/?page_size=100&ordering=-created_at')),
      capability(() => httpClient.get('finance/cashier-shifts/?page_size=30&ordering=-opened_at')),
    ]);
    const profile = mapTeacher(me);
    return {
      profile,
      capabilities: {
        invoices: invoices.available,
        payments: payments.available,
        expenses: expenses.available,
        shifts: shifts.available,
        collectCash: ['accountant', 'cashier'].includes(profile.roleKey),
      },
      invoices: asList(invoices.data).map(mapFinanceInvoice),
      payments: asList(payments.data).map(mapFinancePayment),
      expenses: asList(expenses.data).map(mapFinanceExpense),
      shifts: asList(shifts.data).map(mapFinanceShift),
    };
  }

  async collectCash(input) {
    const key = globalThis.crypto?.randomUUID?.() ?? `cash-${Date.now()}`;
    return mapFinancePayment(
      await httpClient.post(
        'payments/cash/',
        { invoice: Number(input.invoiceId), amount_uzs: Number(input.amount) },
        { headers: { 'Idempotency-Key': key } },
      ),
    );
  }
}

function mapDirectoryPerson(person, kind) {
  const membership = asList(person.role_memberships)[0] ?? {};
  const roleKey =
    kind === 'student'
      ? 'student'
      : kind === 'parent'
        ? 'parent'
        : kind === 'teacher'
          ? 'teacher'
          : membership.role || membership.account_type_slug || membership.account_kind || 'staff';
  const roleName =
    kind === 'student'
      ? copy().student
      : kind === 'parent'
        ? copy().parent
        : kind === 'teacher'
          ? copy().teacher
          : membership.account_type_name || String(roleKey).replaceAll('_', ' ');
  return {
    id: `${kind}-${person.id}`,
    sourceId: person.id,
    kind,
    name: displayName(person),
    role: roleName,
    roleKey,
    department: person.department_name || person.department || person.workplace || '',
    branch:
      person.branch_name || (membership.branch ? `${copy().branch} #${membership.branch}` : ''),
    phone: person.phone || person.phone_number || '',
    email: person.email || '',
    active: person.active ?? person.is_active ?? person.status === 'active',
    lastSeen: person.last_login_at || person.last_login || null,
    subjects: asList(person.subjects)
      .map((subject) => subject.name || subject.title || subject)
      .join(' · '),
    studentId: person.student_id || person.public_id || '',
    cohort:
      person.current_cohort_name ||
      person.cohort_name ||
      (person.current_cohort ? `#${person.current_cohort}` : ''),
    level: person.academic_level || '',
    blocked: Boolean(person.blocked || person.is_blocked),
  };
}

export class HttpPeopleRepository extends IPeopleRepository {
  async getDirectory() {
    const [students, parents] = await Promise.all([
      capability(() => httpClient.get('students/?page_size=100&ordering=first_name')),
      capability(() => httpClient.get('parents/?page_size=100&ordering=first_name')),
    ]);
    return {
      capabilities: {
        staff: false,
        teachers: false,
        students: students.available,
        parents: parents.available,
      },
      staff: [],
      teachers: [],
      students: asList(students.data).map((person) => mapDirectoryPerson(person, 'student')),
      parents: asList(parents.data).map((person) => mapDirectoryPerson(person, 'parent')),
    };
  }

  async exportStudents({ ids = [] } = {}) {
    const directory = await this.getDirectory();
    const allowed = new Set(ids.map(String));
    const students = allowed.size
      ? directory.students.filter((student) => allowed.has(String(student.id)))
      : directory.students;
    return createStudentWorkbookPayload(students);
  }
}

function academicWindow() {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setDate(to.getDate() + 45);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function mapAcademicLesson(lesson) {
  return {
    id: String(lesson.id),
    title: lesson.title || lesson.lesson_type_name || copy().lesson,
    cohort: lesson.cohort_name || '',
    room: lesson.room_name || '',
    startsAt: lesson.starts_at,
    endsAt: lesson.ends_at,
    status: lesson.status || 'scheduled',
  };
}

function mapAttendanceRecord(record) {
  return {
    id: String(record.id),
    student: record.student_name || `${copy().student} #${record.student}`,
    cohort: record.cohort_name || '',
    lesson: record.lesson_title || copy().lesson,
    at: record.lesson_starts_at || record.marked_at || record.created_at,
    status: record.status || 'present',
  };
}

function mapAssignment(assignment) {
  return {
    id: String(assignment.id),
    title: assignment.title || '',
    cohort: assignment.cohort_name || '',
    dueAt: assignment.due_at,
    status: assignment.status || 'draft',
    maxScore: toNumber(assignment.max_score, 100),
  };
}

function mapExam(exam) {
  return {
    id: String(exam.id),
    title: exam.title || '',
    subject: exam.subject_name || '',
    cohort: exam.cohort_name || '',
    date: exam.exam_date,
    maxScore: toNumber(exam.max_score, 100),
    published: Boolean(exam.is_published),
  };
}

function mapGrade(grade) {
  return {
    id: String(grade.id),
    student: grade.student_name || `${copy().student} #${grade.student}`,
    subject: grade.subject_name || '',
    value: toNumber(grade.value_raw),
    display: grade.value_display || '—',
  };
}

function mapRisk(risk) {
  return {
    id: `risk-${risk.student}`,
    student: risk.name || `${copy().student} #${risk.student}`,
    cohort: risk.cohort ? `#${risk.cohort}` : '',
    level: risk.level || 'low',
    score: toNumber(risk.score),
    flags: asList(risk.flags).map((flag) => flag.code || flag.reason || String(flag)),
  };
}

function mapAchievement(achievement) {
  return {
    id: String(achievement.id),
    name: achievement.name || '',
    description: achievement.description || '',
    emoji: achievement.emoji || '★',
    scope: achievement.scope || 'global',
    status: achievement.status || 'active',
  };
}

function mapReport(report) {
  return {
    id: String(report.id),
    key: report.key,
    title: report.title || report.key || '',
    description: report.description || '',
    format: report.default_format || 'pdf',
  };
}

function mapPlacement(test) {
  return {
    id: String(test.id),
    title: test.title || '',
    description: test.description || '',
    status: test.status || 'draft',
    questions: asList(test.questions).length,
    minutes: toNumber(test.time_limit_minutes),
  };
}

export class HttpAcademicRepository extends IAcademicRepository {
  async getWorkspace() {
    const { from, to } = academicWindow();
    const [
      schedule,
      attendance,
      assignments,
      exams,
      grades,
      risks,
      achievements,
      reports,
      placement,
    ] = await Promise.all([
      capability(() =>
        httpClient.get(
          `schedule/lessons/?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}&page_size=200`,
        ),
      ),
      capability(() =>
        httpClient.get(
          `attendance/records/?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}&page_size=200&ordering=-marked_at`,
        ),
      ),
      capability(() => httpClient.get('assignments/?page_size=100&ordering=-due_at')),
      capability(() => httpClient.get('academics/exams/?page_size=100&ordering=-exam_date')),
      capability(() => httpClient.get('academics/grades/?page_size=100&ordering=-computed_at')),
      capability(() => httpClient.get('intelligence/risk/')),
      capability(() => httpClient.get('achievements/?page_size=100&ordering=-created_at')),
      capability(() => httpClient.get('reports/?page_size=100&ordering=key')),
      capability(() => httpClient.get('placement/tests/?page_size=100&ordering=-created_at')),
    ]);

    return {
      capabilities: {
        schedule: schedule.available,
        attendance: attendance.available,
        assignments: assignments.available,
        academics: exams.available || grades.available,
        intelligence: risks.available,
        achievements: achievements.available,
        reports: reports.available,
        placement: placement.available,
      },
      schedule: asList(schedule.data).map(mapAcademicLesson),
      attendance: asList(attendance.data).map(mapAttendanceRecord),
      assignments: asList(assignments.data).map(mapAssignment),
      exams: asList(exams.data).map(mapExam),
      grades: asList(grades.data).map(mapGrade),
      risks: asList(risks.data).map(mapRisk),
      achievements: asList(achievements.data).map(mapAchievement),
      reports: asList(reports.data).map(mapReport),
      placement: asList(placement.data).map(mapPlacement),
    };
  }

  async publishAssignment(assignmentId) {
    return mapAssignment(await httpClient.post(`assignments/${assignmentId}/publish/`, {}));
  }

  async publishExam(examId) {
    return mapExam(await httpClient.post(`academics/exams/${examId}/publish/`, {}));
  }

  runReport(reportKey, format = 'pdf') {
    return httpClient.post('reports/runs/', {
      report_key: reportKey,
      format,
      params: {},
    });
  }
}

function mapRewardType(reward) {
  return {
    id: String(reward.id),
    name: reward.name || '',
    description: reward.description || '',
    cash: Boolean(reward.is_cash),
    amount: toNumber(reward.default_amount_uzs),
  };
}

function mapRule(rule) {
  return {
    id: String(rule.id),
    title: rule.title || '',
    version: rule.version || '—',
    acknowledged: Boolean(rule.acknowledged),
    updatedAt: rule.updated_at || rule.created_at,
  };
}

function mapPurchaseOrder(order) {
  return {
    id: String(order.id),
    supplier: order.supplier || '—',
    amount: toNumber(order.amount_uzs),
    status: order.status || 'pending',
    items: asList(order.items).length,
    createdAt: order.created_at,
  };
}

function mapSale(sale) {
  return {
    id: String(sale.id),
    item: sale.item || '',
    quantity: toNumber(sale.quantity),
    amount: toNumber(sale.amount_uzs),
    status: sale.status || 'completed',
    createdAt: sale.created_at,
  };
}

function mapCampaign(campaign) {
  return {
    id: String(campaign.id),
    name: campaign.name || '',
    status: campaign.status || 'draft',
    total: toNumber(campaign.total),
    sent: toNumber(campaign.sent_count),
    failed: toNumber(campaign.failed_count),
    skipped: toNumber(campaign.skipped_count),
  };
}

function mapAudit(row) {
  return {
    id: String(row.id),
    actor: row.actor_username || row.actor_repr || 'system',
    action: row.action || '',
    resource: row.resource_type || '',
    createdAt: row.created_at,
  };
}

export class HttpOperationsRepository extends IOperationsRepository {
  async getWorkspace() {
    // Avoid probing endpoints that the static backend permission matrix denies.
    // Apart from being noisy, a disabled upstream module may return 503 before its
    // permission middleware runs. Role-gating here mirrors navigation while the API
    // remains the final authority for every request we do make.
    const profile = mapTeacher(await httpClient.get('users/me/'));
    const role = profile.roleKey;
    const forRoles = (roles, load) =>
      roles.includes(role) ? capability(load) : Promise.resolve({ available: false, data: [] });
    const allStaff = [
      'teacher',
      'accountant',
      'cashier',
      'librarian',
      'security',
      'it',
      'registrar',
      'support',
    ];
    const commerce = ['accountant', 'cashier', 'registrar'];
    const [rewards, rules, procurement, sales, campaigns, audit, roles, permissions, overrides] =
      await Promise.all([
        forRoles(allStaff, () => httpClient.get('rewards/types/?page_size=100&ordering=name')),
        forRoles(allStaff, () => httpClient.get('rulebook/rules/mine/?page_size=100')),
        forRoles(commerce, () => httpClient.get('procurement/?page_size=100&ordering=-created_at')),
        forRoles(commerce, () => httpClient.get('sales/?page_size=100&ordering=-created_at')),
        forRoles(['registrar'], () =>
          httpClient.get('campaigns/?page_size=100&ordering=-created_at'),
        ),
        forRoles(['it', 'support'], () =>
          httpClient.get('audit/?page_size=100&ordering=-created_at'),
        ),
        forRoles([], () => httpClient.get('access/roles/')),
        forRoles([], () => httpClient.get('access/permissions/')),
        forRoles([], () => httpClient.get('access/overrides/?page_size=100')),
      ]);

    const accessAvailable = roles.available || permissions.available || overrides.available;
    const roleMap = roles.data?.roles ?? {};
    const permissionList = asList(permissions.data?.permissions);
    return {
      capabilities: {
        rewards: rewards.available,
        rules: rules.available,
        procurement: procurement.available,
        sales: sales.available,
        campaigns: campaigns.available,
        audit: audit.available,
        access: accessAvailable,
      },
      rewards: asList(rewards.data).map(mapRewardType),
      rules: asList(rules.data).map(mapRule),
      procurement: asList(procurement.data).map(mapPurchaseOrder),
      sales: asList(sales.data).map(mapSale),
      campaigns: asList(campaigns.data).map(mapCampaign),
      audit: asList(audit.data).map(mapAudit),
      access: {
        roles: Object.keys(roleMap).length,
        permissions: permissionList.length,
        overrides: asList(overrides.data).length,
      },
    };
  }

  acknowledgeRule(ruleId) {
    return httpClient.post(`rulebook/rules/${ruleId}/acknowledge/`, {});
  }
}

/** Navigation badge counts, assembled from the endpoint-specific live sources. */
export class HttpNavigationRepository {
  async getBadges() {
    // The Django API exposes notifications as a generic resource, not an
    // unread-count feed. Avoid speculative calls; capability pages display
    // their live collection count once the user opens them.
    return {};
  }
}
