// In-memory adapters. Each honours its interface and serves cloned fixtures
// behind simulated latency, so swapping in an Http* adapter changes nothing upstream.
// Fixtures may carry {uz,ru,en} leaves; `respond` resolves them to the active locale.
import { clone, respond as rawRespond } from '@/data/async.js';
import { deepLocalize, getLocale } from '@/i18n/locale.js';
import { createStudentWorkbookPayload } from '@/data/spreadsheet.js';

const respond = (value) => rawRespond(deepLocalize(value, getLocale()));
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

import { teacherFixture } from '@/data/fixtures/teacher.js';
import { peopleFixture } from '@/data/fixtures/people.js';
import { buildCohortWorkspace, cohortsFixture, rosterFixture } from '@/data/fixtures/cohorts.js';
import { recentCardsFixture, cardTypesFixture, cardStatsFixture } from '@/data/fixtures/cards.js';
import { tasksFixture, taskColumnsFixture, taskFiltersFixture } from '@/data/fixtures/tasks.js';
import {
  todayMetaFixture,
  surveyBannerFixture,
  todayStatsFixture,
  teacherPerformanceFixture,
  heroLessonFixture,
  scheduleFixture,
  aiInsightFixture,
  printQueueFixture,
  mgmtMentionFixture,
  spotlightFixture,
  activityFixture,
  pendingTasksFixture,
} from '@/data/fixtures/dashboard.js';
import {
  aiUsageFixture,
  aiConversationsFixture,
  aiPromptsFixture,
  aiContextFixture,
  aiAttentionFixture,
  aiTopicsFixture,
  aiTranscriptFixture,
} from '@/data/fixtures/ai.js';
import { printersFixture, printJobsFixture, printLibraryFixture } from '@/data/fixtures/print.js';
import {
  activeSurveysFixture,
  surveyDraftsFixture,
  surveyHistoryFixture,
  surveyQuestionsFixture,
} from '@/data/fixtures/surveys.js';
import { mgmtThreadsFixture, mgmtTranscriptFixture } from '@/data/fixtures/mgmt.js';
import {
  notificationGroupsFixture,
  notificationFiltersFixture,
} from '@/data/fixtures/notifications.js';
import {
  materialsFixture,
  materialStatsFixture,
  materialStorageFixture,
} from '@/data/fixtures/materials.js';
import { buildWorkFixture } from '@/data/fixtures/work.js';
import { buildFinanceFixture } from '@/data/fixtures/finance.js';
import { buildAcademicFixture } from '@/data/fixtures/academic.js';
import { operationsFixture } from '@/data/fixtures/operations.js';

export class MockAccountRepository extends IAccountRepository {
  #teacher = clone(teacherFixture);
  #settings = {};
  #sessions = [
    {
      id: 'mock-web-session',
      platform: 'web',
      userAgent: 'StarForge EDU · this browser',
      lastSeenAt: new Date().toISOString(),
    },
  ];

  getTeacher() {
    // Mock mode can emulate another backend role for deterministic access tests.
    // This never affects live mode or real authorization.
    let role = null;
    try {
      role = localStorage.getItem('sf-mock-role');
    } catch {
      role = null;
    }
    const roleNames = {
      teacher: 'Teacher',
      accountant: 'Accountant',
      cashier: 'Cashier',
      librarian: 'Librarian',
      security: 'Security',
      it: 'IT specialist',
      registrar: 'Registrar',
      support: 'Support',
      director: 'Director',
      head_of_dept: 'Head of department',
    };
    const profile = roleNames[role]
      ? { ...this.#teacher, roleKey: role, role: roleNames[role] }
      : this.#teacher;
    return respond(profile);
  }
  updateTeacher(patch) {
    this.#teacher = { ...this.#teacher, ...patch };
    return respond(this.#teacher);
  }
  getSettings() {
    return respond(this.#settings);
  }
  patchSettings(patch) {
    this.#settings = { ...this.#settings, ...patch };
    return respond(this.#settings);
  }
  listSessions() {
    return respond(this.#sessions);
  }
  ejectSession(id) {
    const before = this.#sessions.length;
    this.#sessions = this.#sessions.filter((session) => session.id !== id);
    return respond({ removed: before !== this.#sessions.length });
  }
}

export class MockCohortRepository extends ICohortRepository {
  #cohorts = clone(cohortsFixture);
  #rosters = clone(rosterFixture);
  #workspaces = Object.fromEntries(
    this.#cohorts.map((cohort) => [
      cohort.id,
      buildCohortWorkspace(cohort, this.#rosters[cohort.id] ?? []),
    ]),
  );

  list() {
    return respond(this.#cohorts);
  }
  getById(id) {
    return respond(this.#cohorts.find((c) => c.id === id) ?? null);
  }
  getRoster(cohortId) {
    return respond(this.#rosters[cohortId] ?? []);
  }
  getWorkspace(cohortId, { from, to } = {}) {
    const workspace = clone(this.#workspaces[cohortId] ?? {});
    if (workspace.attendanceHistory) {
      workspace.attendanceHistory = workspace.attendanceHistory.filter(
        (entry) => (!from || entry.date >= from) && (!to || entry.date <= to),
      );
    }
    return respond(workspace);
  }
  create(draft) {
    const cohort = {
      id: `group-${Date.now()}`,
      color: 'var(--sf-primary)',
      studentCount: 0,
      attendance: 100,
      up: 0,
      down: 0,
      next: '—',
      subject: '—',
      ...draft,
    };
    this.#cohorts.unshift(cohort);
    this.#rosters[cohort.id] = [];
    this.#workspaces[cohort.id] = buildCohortWorkspace(cohort, []);
    return respond(cohort);
  }
  saveAttendance(cohortId, entries) {
    const roster = this.#rosters[cohortId] ?? [];
    const marked = new Map(entries.map((entry) => [String(entry.studentId), entry.present]));
    for (const student of roster) {
      if (marked.has(String(student.id)))
        student.attendance = marked.get(String(student.id)) ? 100 : 0;
    }
    const workspace = this.#workspaces[cohortId];
    if (workspace) {
      const today = new Date().toISOString().slice(0, 10);
      workspace.attendanceHistory = workspace.attendanceHistory.filter(
        (entry) => entry.date !== today,
      );
      workspace.attendanceHistory.push(
        ...entries.map((entry) => ({
          id: `${cohortId}-${entry.studentId}-${today}`,
          studentId: entry.studentId,
          date: today,
          status: entry.present ? 'present' : 'absent',
        })),
      );
      workspace.revision += 1;
    }
    return respond({ cohortId, saved: entries.length });
  }
  advance(cohortId) {
    const cohort = this.#cohorts.find((candidate) => candidate.id === cohortId);
    const workspace = this.#workspaces[cohortId];
    if (!cohort || !workspace) return respond(null);
    const progression = workspace.progression;
    progression.current = progression.next;
    if (progression.mode === 'month') progression.next = Number(progression.current) + 1;
    else {
      cohort.level = clone(progression.current);
      progression.next = { uz: 'Daraja IV', ru: 'Уровень IV', en: 'Level IV' };
    }
    progression.startedAt = new Date().toISOString().slice(0, 10);
    progression.readiness = 72;
    workspace.revision += 1;
    return respond({ cohortId, progression });
  }
}

export class MockCardRepository extends ICardRepository {
  #cards = clone(recentCardsFixture);
  #types = clone(cardTypesFixture);

  listRecent() {
    return respond(this.#cards);
  }
  listTypes() {
    return respond(this.#types);
  }
  getStats() {
    const up = this.#cards.filter((card) => card.kind === 'up').length;
    const down = this.#cards.filter((card) => card.kind === 'down').length;
    const recipients = new Set(this.#cards.map((card) => card.recipient)).size;
    return respond({
      ...cardStatsFixture,
      upThisWeek: up,
      downThisWeek: down,
      recipients,
      typeCount: this.#types.length,
    });
  }
  issue(input) {
    const card = {
      id: `card-${Date.now()}`,
      cohort: '',
      issuer: 'N.K.',
      when: 'now',
      ...input,
    };
    this.#cards.unshift(card);
    return respond(card);
  }
  scan(code) {
    return respond({
      scanId: `scan-${Date.now()}`,
      valid: code.trim().toLowerCase() !== 'revoked',
      student: 'Akbarov Akmal',
      cardType: 'Student access',
      scannedAt: new Date().toISOString(),
      attendanceLesson: code.trim().toLowerCase() === 'no-lesson' ? null : 'lesson-1',
    });
  }
}

export class MockTaskRepository extends ITaskRepository {
  #tasks = tasksFixture.map((t, position) => ({ ...t, position: t.position ?? position }));
  list() {
    return respond(this.#tasks);
  }
  listColumns() {
    return respond(taskColumnsFixture);
  }
  listFilters() {
    return respond(taskFiltersFixture);
  }
  listTargets() {
    return respond({
      people: [{ key: 'teacher:1', kind: 'teacher', id: 1, name: 'Me', role: 'Teacher', self: true }],
      departments: [],
      branches: [],
      canBroadAssign: false,
    });
  }
  setState(id, state) {
    const task = this.#tasks.find((t) => t.id === id);
    if (task) task.state = state;
    return respond(task ?? null);
  }
  move(id, state, targetIndex) {
    const task = this.#tasks.find((candidate) => String(candidate.id) === String(id));
    if (!task) return respond(null);
    const sourceState = task.state;
    const source = this.#tasks
      .filter((candidate) => candidate.state === sourceState && candidate !== task)
      .sort((a, b) => a.position - b.position);
    const target = (
      sourceState === state ? source : this.#tasks.filter((candidate) => candidate.state === state)
    )
      .filter((candidate) => candidate !== task)
      .sort((a, b) => a.position - b.position);
    task.state = state;
    target.splice(Math.max(0, Math.min(target.length, targetIndex)), 0, task);
    source.forEach((candidate, position) => {
      candidate.position = position;
    });
    target.forEach((candidate, position) => {
      candidate.position = position;
    });
    return respond(task);
  }
  create(draft) {
    const nextId = Math.max(0, ...this.#tasks.map((task) => Number(task.id) || 0)) + 1;
    const task = {
      id: nextId,
      state: 'todo',
      priority: 'P2',
      project: '—',
      projectColor: 'var(--sf-primary)',
      deadline: '—',
      urgent: false,
      fromMgmt: false,
      subtasks: null,
      assigner: 'Me',
      mine: true,
      position: this.#tasks.filter((candidate) => candidate.state === 'todo').length,
      ...draft,
    };
    this.#tasks.unshift(task);
    return respond(task);
  }
  async createMany(draft) {
    const targets = Array.isArray(draft.targets) && draft.targets.length ? draft.targets : [null];
    return Promise.all(targets.map((target) => this.create({ ...draft, target })));
  }
}

export class MockDashboardRepository extends IDashboardRepository {
  getToday(range = '7d') {
    const locale = getLocale();
    const code = locale === 'ru' ? 'ru-RU' : locale === 'uz' ? 'uz-UZ' : 'en-US';
    const dateLabel = new Intl.DateTimeFormat(code, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    let role = null;
    try {
      role = localStorage.getItem('sf-mock-role');
    } catch {
      role = null;
    }
    if (role && role !== 'teacher') {
      return respond({
        workspaceMode: 'staff',
        meta: {
          ...todayMetaFixture,
          dateLabel,
          summary: {
            uz: '3 ta ochiq vazifa · 2 ta uchrashuv · 1 ta so‘rov',
            ru: '3 открытые задачи · 2 встречи · 1 запрос',
            en: '3 open tasks · 2 meetings · 1 request',
          },
        },
        surveyBanner: null,
        stats: [
          { value: '3', label: { uz: 'Ochiq vazifalar', ru: 'Открытые задачи', en: 'Open tasks' } },
          { value: '2', label: { uz: 'Uchrashuvlar', ru: 'Встречи', en: 'Meetings' } },
          {
            value: '1',
            label: { uz: 'Ochiq so‘rovlar', ru: 'Открытые запросы', en: 'Open requests' },
          },
          { value: '4', label: { uz: 'O‘qilmagan', ru: 'Непрочитанные', en: 'Unread' } },
        ],
        performance: {},
        heroLesson: { available: false, kind: 'staff', start: '—' },
        schedule: [],
        recentCards: [],
        pendingTasks: pendingTasksFixture,
        aiInsight: null,
        printQueue: [],
        mgmtMention: mgmtMentionFixture,
        spotlight: null,
        activity: [],
      });
    }
    const performance = clone(teacherPerformanceFixture);
    if (range === '7d') {
      performance.attendanceTrend = performance.attendanceTrend.slice(-5);
    } else if (range === 'term') {
      performance.attendanceTrend = [
        { label: 'M1', value: 87 },
        { label: 'M2', value: 89 },
        { label: 'M3', value: 90 },
        { label: 'M4', value: 92 },
        { label: 'M5', value: 94 },
      ];
    }
    return respond({
      workspaceMode: 'teaching',
      meta: { ...todayMetaFixture, dateLabel },
      surveyBanner: surveyBannerFixture,
      stats: todayStatsFixture,
      performance,
      heroLesson: heroLessonFixture,
      schedule: scheduleFixture,
      recentCards: recentCardsFixture,
      pendingTasks: pendingTasksFixture,
      aiInsight: aiInsightFixture,
      printQueue: printQueueFixture,
      mgmtMention: mgmtMentionFixture,
      spotlight: spotlightFixture,
      activity: activityFixture,
    });
  }
}

export class MockAiRepository extends IAiRepository {
  #usage = clone(aiUsageFixture);

  listConversations() {
    return respond(aiConversationsFixture);
  }
  getUsage() {
    return respond(this.#usage);
  }
  getWorkspace() {
    return respond({
      prompts: aiPromptsFixture,
      context: aiContextFixture,
      attention: aiAttentionFixture,
      topics: aiTopicsFixture,
      transcript: aiTranscriptFixture,
    });
  }
  sendMessage(conversationId, text) {
    const words = String(text ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    this.#usage.used += Math.max(12, words * 8);
    return respond({
      userMessage: { id: `user-${Date.now()}`, conversationId, text },
      aiMessage: {
        id: `ai-${Date.now()}`,
        conversationId,
        text: 'AI is offline right now. Your question is saved for a later response.',
      },
      usage: this.#usage,
    });
  }
  clearMessages(conversationId) {
    return respond({ conversationId, cleared: true });
  }
}

export class MockPrintRepository extends IPrintRepository {
  #jobs = clone(printJobsFixture);

  listPrinters() {
    return respond(printersFixture);
  }
  listJobs() {
    return respond(this.#jobs);
  }
  getLibrary() {
    return respond(printLibraryFixture);
  }
  createJob(input) {
    const job = {
      id: `job-${Date.now()}`,
      state: 'queued',
      progress: 0,
      eta: 'Queued',
      icon: 'doc',
      printer: input.printer ?? 'Printer',
      ...input,
    };
    this.#jobs.unshift(job);
    return respond(job);
  }
  cancelJob(id) {
    const job = this.#jobs.find((candidate) => candidate.id === id) ?? null;
    this.#jobs = this.#jobs.filter((candidate) => candidate.id !== id);
    return respond(job);
  }
}

export class MockSurveyRepository extends ISurveyRepository {
  #active = clone(activeSurveysFixture);
  #history = clone(surveyHistoryFixture);
  #drafts = clone(surveyDraftsFixture);
  #managed = [];

  getCapabilities() {
    return respond({ canCreate: true });
  }

  listActive() {
    return respond(this.#active);
  }
  listHistory() {
    return respond(this.#history);
  }
  listManaged() {
    return respond(this.#managed);
  }
  getDetail(id) {
    const survey = this.#active.find((candidate) => String(candidate.id) === String(id));
    if (!survey) return respond(null);
    return respond({
      ...survey,
      questions: clone(surveyQuestionsFixture[id] ?? []),
      draft: clone(this.#drafts[id] ?? { answers: {}, progress: survey.progress ?? 0 }),
    });
  }
  saveDraft(id, input) {
    this.#drafts[id] = clone(input);
    const survey = this.#active.find((candidate) => String(candidate.id) === String(id));
    if (survey) survey.progress = Number(input.progress) || 0;
    return respond({ id, ...this.#drafts[id] });
  }
  submit(id, input) {
    const survey = this.#active.find((candidate) => candidate.id === id);
    this.#active = this.#active.filter((candidate) => candidate.id !== id);
    if (survey) {
      this.#history.unshift({
        title: survey.title,
        issuer: survey.issuer,
        status: 'Submitted',
        skipped: false,
        date: 'Now',
        answers: clone(input.answers ?? {}),
        rating: input.rating ?? firstAnswer(input.answers, 'number'),
        comment: input.comment ?? firstAnswer(input.answers, 'string') ?? '',
      });
    }
    delete this.#drafts[id];
    return respond({ id, submitted: true });
  }
  skip(id) {
    const survey = this.#active.find((candidate) => candidate.id === id);
    this.#active = this.#active.filter((candidate) => candidate.id !== id);
    if (survey) {
      this.#history.unshift({
        title: survey.title,
        issuer: survey.issuer,
        status: 'Skipped',
        skipped: true,
        date: 'Now',
        rating: null,
        comment: null,
      });
    }
    return respond({ id, skipped: true });
  }
  create(input) {
    const id = `form-${Date.now()}`;
    const form = {
      id,
      title: input.title,
      description: input.description ?? '',
      issuer: 'You',
      status: input.publishNow ? 'published' : 'draft',
      anonymous: Boolean(input.anonymous),
      allowMultiple: Boolean(input.allowMultiple),
      remaining: input.closesAt || '—',
      fields: clone(input.fields ?? []),
    };
    this.#managed.unshift(form);
    return respond(form);
  }
  publish(id) {
    const form = this.#managed.find((candidate) => String(candidate.id) === String(id));
    if (form) form.status = 'published';
    return respond(form);
  }
  close(id) {
    const form = this.#managed.find((candidate) => String(candidate.id) === String(id));
    if (form) form.status = 'closed';
    return respond(form);
  }
  remove(id) {
    this.#managed = this.#managed.filter((candidate) => String(candidate.id) !== String(id));
    return respond({ id, removed: true });
  }
  getResults(id) {
    const form = this.#managed.find((candidate) => String(candidate.id) === String(id));
    return respond({
      form,
      summary: {
        response_count: 0,
        fields: (form?.fields ?? []).map((field, index) => ({
          field: field.id ?? index,
          label: field.label,
          field_type: field.type,
          summary: { answered: 0 },
        })),
      },
      responses: [],
    });
  }
}

function firstAnswer(answers, type) {
  return Object.values(answers ?? {}).find((answer) => typeof answer === type) ?? null;
}

export class MockMgmtRepository extends IMgmtRepository {
  #threads = clone(mgmtThreadsFixture);
  #transcripts = clone(mgmtTranscriptFixture);

  listThreads() {
    return respond(this.#threads);
  }
  listContacts() {
    return respond(this.#threads.map((thread) => ({
      key: `person-${thread.id}`,
      threadId: thread.id,
      participantIds: [thread.id],
      name: thread.name,
      role: thread.role,
      kind: thread.channel ? 'group' : 'staff',
      online: thread.online,
    })));
  }
  getTranscript(threadId) {
    return respond(this.#transcripts[threadId] ?? []);
  }
  sendMessage(threadId, text) {
    const message = { id: `message-${Date.now()}`, dir: 'out', text, time: 'now', read: true };
    const key = String(threadId);
    this.#transcripts[key] = [...(this.#transcripts[key] ?? []), message];
    const thread = this.#threads.find((candidate) => String(candidate.id) === key);
    if (thread) {
      thread.lastMessage = text;
      thread.time = 'now';
    }
    return respond(message);
  }
  sendAttachment(threadId, file, body = '') {
    return this.sendMessage(threadId, body || `[${file?.name || 'Attachment'}]`);
  }
  downloadAttachment(_threadId, key) {
    return respond({ url: String(key || '') });
  }
  createThread({ name, message }) {
    const id = Math.max(0, ...this.#threads.map((thread) => Number(thread.id) || 0)) + 1;
    const thread = {
      id,
      name,
      role: 'New conversation',
      lastMessage: message,
      time: 'now',
      unread: 0,
      online: false,
      pinned: false,
      channel: false,
    };
    this.#threads.unshift(thread);
    this.#transcripts[id] = [
      { id: `message-${Date.now()}`, dir: 'out', text: message, time: 'now', read: true },
    ];
    return respond(thread);
  }
  markRead(threadId) {
    const thread = this.#threads.find((candidate) => String(candidate.id) === String(threadId));
    if (thread) thread.unread = 0;
    return respond({ id: threadId, read: true });
  }
  archiveThread(threadId, archived) {
    const thread = this.#threads.find((candidate) => String(candidate.id) === String(threadId));
    if (thread) thread.archived = Boolean(archived);
    return respond({ id: threadId, archived: Boolean(archived) });
  }
  deleteThread(threadId) {
    const key = String(threadId);
    this.#threads = this.#threads.filter((candidate) => String(candidate.id) !== key);
    delete this.#transcripts[key];
    return respond({ id: threadId, deleted: true });
  }
}

export class MockNotificationRepository extends INotificationRepository {
  #groups = clone(notificationGroupsFixture).map((group, groupIndex) => ({
    ...group,
    items: group.items.map((item, itemIndex) => ({
      id: `notification-${groupIndex}-${itemIndex}`,
      read: false,
      ...item,
    })),
  }));

  listGroups() {
    return respond(this.#groups);
  }
  listFilters() {
    return respond(notificationFiltersFixture);
  }
  markRead(id) {
    for (const group of this.#groups) {
      const item = group.items.find((candidate) => candidate.id === id);
      if (item) item.read = true;
    }
    return respond({ id, read: true });
  }
  markAllRead() {
    for (const group of this.#groups) {
      for (const item of group.items) item.read = true;
    }
    return respond({ read: true });
  }
}

export class MockMaterialRepository extends IMaterialRepository {
  #materials = clone(materialsFixture);

  list() {
    return respond(this.#materials);
  }
  getStats() {
    return respond(materialStatsFixture);
  }
  getStorage() {
    return respond(materialStorageFixture);
  }
  listTargets() {
    return respond([
      { key: 'group:1', label: 'My group', detail: 'Group library', folderIds: [1], audience: 'own_students' },
    ]);
  }
  create(input) {
    const material = {
      id: `material-${Date.now()}`,
      meta: input.meta ?? '—',
      color: 'var(--sf-accent)',
      views: 0,
      date: 'Now',
      aiSummary: false,
      ...input,
    };
    this.#materials.unshift(material);
    return respond(material);
  }
  download(id) {
    return respond({ id, url: '#mock-download' });
  }
  remove(id) {
    this.#materials = this.#materials.filter((material) => material.id !== id);
    return respond({ id, removed: true });
  }
}

export class MockWorkRepository extends IWorkRepository {
  #workspace = buildWorkFixture();

  getWorkspace() {
    return respond(this.#workspace);
  }
  createRequest(input) {
    const request = {
      id: `request-${Date.now()}`,
      kind: input.kind,
      title: input.title,
      description: input.description ?? '',
      amount: input.amount ?? null,
      outstanding: input.kind === 'loan' ? (input.amount ?? null) : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.#workspace.requests.unshift(request);
    return respond(request);
  }
  cancelRequest(id) {
    const request = this.#workspace.requests.find(
      (candidate) => String(candidate.id) === String(id),
    );
    if (request) request.status = 'cancelled';
    return respond(request);
  }
  respondMeeting(id, response) {
    const meeting = this.#workspace.meetings.find(
      (candidate) => String(candidate.id) === String(id),
    );
    if (meeting) meeting.response = response;
    return respond(meeting);
  }
  claimCover(id) {
    const cover = this.#workspace.coverage.find((candidate) => String(candidate.id) === String(id));
    if (cover) cover.status = 'assigned';
    return respond(cover);
  }
  requestCover(input) {
    const lesson = this.#workspace.lessons.find(
      (candidate) => String(candidate.id) === String(input.lessonId),
    );
    const cover = {
      id: `cover-${Date.now()}`,
      lessonId: input.lessonId,
      lessonTitle: lesson?.title ?? '',
      time: lesson?.startsAt ?? new Date().toISOString(),
      reason: input.reason ?? '',
      status: 'pending',
      pool: false,
    };
    this.#workspace.coverage.unshift(cover);
    return respond(cover);
  }
}

export class MockFinanceRepository extends IFinanceRepository {
  #workspace = buildFinanceFixture();

  getWorkspace() {
    return respond(this.#workspace);
  }
  collectCash(input) {
    const invoice = this.#workspace.invoices.find(
      (candidate) => String(candidate.id) === String(input.invoiceId),
    );
    if (invoice) {
      invoice.allocated = Math.min(invoice.total, invoice.allocated + Number(input.amount));
      invoice.status = invoice.allocated >= invoice.total ? 'paid' : 'partial';
    }
    const payment = {
      id: `pay-${Date.now()}`,
      provider: 'cash',
      account: invoice?.number ?? String(input.invoiceId),
      amount: Number(input.amount),
      status: 'succeeded',
      paidAt: new Date().toISOString(),
    };
    this.#workspace.payments.unshift(payment);
    return respond(payment);
  }
}

export class MockPeopleRepository extends IPeopleRepository {
  getDirectory() {
    return respond(peopleFixture);
  }
  exportStudents({ ids = [] } = {}) {
    const localized = deepLocalize(clone(peopleFixture), getLocale());
    const allowed = new Set(ids.map(String));
    const students = allowed.size
      ? localized.students.filter((student) => allowed.has(String(student.id)))
      : localized.students;
    return rawRespond(createStudentWorkbookPayload(students));
  }
}

export class MockAcademicRepository extends IAcademicRepository {
  #workspace = buildAcademicFixture();

  getWorkspace() {
    return respond(this.#workspace);
  }

  publishAssignment(assignmentId) {
    const assignment = this.#workspace.assignments.find(
      (candidate) => String(candidate.id) === String(assignmentId),
    );
    if (assignment) assignment.status = 'published';
    return respond(assignment);
  }

  publishExam(examId) {
    const exam = this.#workspace.exams.find((candidate) => String(candidate.id) === String(examId));
    if (exam) exam.published = true;
    return respond(exam);
  }

  runReport(reportKey, format = 'pdf') {
    return respond({
      id: `report-run-${Date.now()}`,
      reportKey,
      format,
      status: 'queued',
    });
  }
}

export class MockOperationsRepository extends IOperationsRepository {
  #workspace = clone(operationsFixture);

  getWorkspace() {
    return respond(this.#workspace);
  }

  acknowledgeRule(ruleId) {
    const rule = this.#workspace.rules.find((candidate) => String(candidate.id) === String(ruleId));
    if (rule) rule.acknowledged = true;
    return respond(rule);
  }
}
