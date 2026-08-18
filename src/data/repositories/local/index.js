// Adapters for the Fastify + Prisma API shipped in this repository. Its
// responses already follow the UI repository contracts, so this boundary only
// performs transport: no client-side fixtures or in-memory state live here.
import { httpClient } from '@/data/http/httpClient.js';
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

const segment = (value) => encodeURIComponent(String(value));

export class LocalAccountRepository extends IAccountRepository {
  getTeacher() {
    return httpClient.get('account/teacher');
  }
  updateTeacher(patch) {
    return httpClient.patch('account/teacher', patch);
  }
  getSettings() {
    return httpClient.get('account/settings');
  }
  patchSettings(patch) {
    return httpClient.patch('account/settings', patch);
  }
  listSessions() {
    return httpClient.get('account/sessions');
  }
  ejectSession(id) {
    return httpClient.delete(`account/sessions/${segment(id)}`);
  }
}

export class LocalCohortRepository extends ICohortRepository {
  list() {
    return httpClient.get('cohorts');
  }
  getById(id) {
    return httpClient.get(`cohorts/${segment(id)}`);
  }
  getRoster(cohortId) {
    return httpClient.get(`cohorts/${segment(cohortId)}/roster`);
  }
  getWorkspace(cohortId, filters = {}) {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    const suffix = query.size ? `?${query}` : '';
    return httpClient.get(`cohorts/${segment(cohortId)}/workspace${suffix}`);
  }
  create(draft) {
    return httpClient.post('cohorts', draft);
  }
  saveAttendance(cohortId, entries) {
    return httpClient.post(`cohorts/${segment(cohortId)}/attendance`, { entries });
  }
  advance(cohortId) {
    return httpClient.post(`cohorts/${segment(cohortId)}/advance`, {});
  }
}

export class LocalCardRepository extends ICardRepository {
  listRecent() {
    return httpClient.get('cards/recent');
  }
  listTypes() {
    return httpClient.get('cards/types');
  }
  getStats() {
    return httpClient.get('cards/stats');
  }
  issue(input) {
    return httpClient.post('cards', input);
  }
  scan(code) {
    return httpClient.post('cards/scan', { code });
  }
}

export class LocalTaskRepository extends ITaskRepository {
  list() {
    return httpClient.get('tasks');
  }
  listColumns() {
    return httpClient.get('tasks/columns');
  }
  listFilters() {
    return httpClient.get('tasks/filters');
  }
  listTargets() {
    return httpClient.get('tasks/targets');
  }
  setState(id, state) {
    return httpClient.patch(`tasks/${segment(id)}/state`, { state });
  }
  move(id, state, targetIndex) {
    return httpClient.patch(`tasks/${segment(id)}/move`, { state, targetIndex });
  }
  create(draft) {
    return httpClient.post('tasks', draft);
  }
  async createMany(draft) {
    const targets = Array.isArray(draft.targets) && draft.targets.length ? draft.targets : [null];
    return Promise.all(targets.map((target) => this.create({ ...draft, target })));
  }
}

export class LocalDashboardRepository extends IDashboardRepository {
  getToday(range = '7d') {
    return httpClient.get(`today?range=${encodeURIComponent(range)}`);
  }
}

export class LocalAiRepository extends IAiRepository {
  listConversations() {
    return httpClient.get('ai/conversations');
  }
  getUsage() {
    return httpClient.get('ai/usage');
  }
  getWorkspace() {
    return httpClient.get('ai/workspace');
  }
  sendMessage(conversationId, text) {
    return httpClient.post(`ai/conversations/${segment(conversationId)}/messages`, { text });
  }
  clearMessages(conversationId) {
    return httpClient.delete(`ai/conversations/${segment(conversationId)}/messages`);
  }
}

export class LocalPrintRepository extends IPrintRepository {
  listPrinters() {
    return httpClient.get('print/printers');
  }
  listJobs() {
    return httpClient.get('print/jobs');
  }
  getLibrary() {
    return httpClient.get('print/library');
  }
  createJob(input) {
    return httpClient.post('print/jobs', input);
  }
  cancelJob(id) {
    return httpClient.delete(`print/jobs/${segment(id)}`);
  }
}

export class LocalSurveyRepository extends ISurveyRepository {
  getCapabilities() {
    return Promise.resolve({ canCreate: false });
  }
  listActive() {
    return httpClient.get('surveys/active');
  }
  listHistory() {
    return httpClient.get('surveys/history');
  }
  listManaged() {
    return Promise.resolve([]);
  }
  getDetail(id) {
    return httpClient.get(`surveys/${segment(id)}`);
  }
  saveDraft(id, input) {
    return httpClient.patch(`surveys/${segment(id)}/draft`, input);
  }
  submit(id, input) {
    return httpClient.post(`surveys/${segment(id)}/submit`, input);
  }
  skip(id) {
    return httpClient.post(`surveys/${segment(id)}/skip`, {});
  }
  create(input) {
    return httpClient.post('surveys', input);
  }
  publish(id) {
    return httpClient.post(`surveys/${segment(id)}/publish`, {});
  }
  close(id) {
    return httpClient.post(`surveys/${segment(id)}/close`, {});
  }
  remove(id) {
    return httpClient.delete(`surveys/${segment(id)}`);
  }
  getResults(id) {
    return httpClient.get(`surveys/${segment(id)}/results`);
  }
}

export class LocalMgmtRepository extends IMgmtRepository {
  listContacts() {
    return httpClient.get('mgmt/contacts');
  }
  listThreads() {
    return httpClient.get('mgmt/threads');
  }
  getTranscript(threadId) {
    return httpClient.get(`mgmt/threads/${segment(threadId)}/transcript`);
  }
  sendMessage(threadId, text) {
    return httpClient.post(`mgmt/threads/${segment(threadId)}/messages`, { text });
  }
  sendAttachment(threadId, file, body = '') {
    const upload = new FormData();
    upload.append('file', file);
    upload.append('body', body);
    return httpClient.post(`mgmt/threads/${segment(threadId)}/attachments`, upload);
  }
  downloadAttachment(threadId, key) {
    return httpClient.get(`mgmt/threads/${segment(threadId)}/attachments/${segment(key)}`);
  }
  createThread(input) {
    return httpClient.post('mgmt/threads', input);
  }
  markRead(threadId) {
    return httpClient.patch(`mgmt/threads/${segment(threadId)}/read`, {});
  }
  archiveThread(threadId, archived) {
    return httpClient.patch(`mgmt/threads/${segment(threadId)}/archive`, { archived });
  }
  deleteThread(threadId) {
    return httpClient.delete(`mgmt/threads/${segment(threadId)}`);
  }
}

export class LocalNotificationRepository extends INotificationRepository {
  listGroups() {
    return httpClient.get('notifications/groups');
  }
  listFilters() {
    return httpClient.get('notifications/filters');
  }
  markRead(id) {
    return httpClient.patch(`notifications/${segment(id)}/read`, {});
  }
  markAllRead() {
    return httpClient.patch('notifications/read-all', {});
  }
}

export class LocalMaterialRepository extends IMaterialRepository {
  list() {
    return httpClient.get('materials');
  }
  getStats() {
    return httpClient.get('materials/stats');
  }
  getStorage() {
    return httpClient.get('materials/storage');
  }
  listTargets() {
    return httpClient.get('materials/targets');
  }
  create(input) {
    return httpClient.post('materials', input);
  }
  download(id) {
    return httpClient.get(`materials/${segment(id)}/download`);
  }
  preview(id) {
    return this.download(id);
  }
  recheck(id) {
    return httpClient.patch(`materials/${segment(id)}/recheck`, {});
  }
  remove(id) {
    return httpClient.delete(`materials/${segment(id)}`);
  }
}

export class LocalWorkRepository extends IWorkRepository {
  getWorkspace() {
    return httpClient.get('work');
  }
  createRequest(input) {
    return httpClient.post('work/requests', input);
  }
  cancelRequest(id) {
    return httpClient.patch(`work/requests/${segment(id)}/cancel`, {});
  }
  respondMeeting(id, response) {
    return httpClient.patch(`work/meetings/${segment(id)}/response`, { response });
  }
  scheduleMeeting(input) {
    return httpClient.post('work/meetings', input);
  }
  claimCover(id) {
    return httpClient.post(`work/coverage/${segment(id)}/claim`, {});
  }
  requestCover(input) {
    return httpClient.post('work/coverage', input);
  }
}

export class LocalFinanceRepository extends IFinanceRepository {
  getWorkspace() {
    return httpClient.get('finance');
  }
  collectCash(input) {
    return httpClient.post('finance/collect-cash', input);
  }
}

export class LocalPeopleRepository extends IPeopleRepository {
  getDirectory() {
    return httpClient.get('people');
  }
  exportStudents(filters) {
    return httpClient.post('people/export', filters);
  }
}

export class LocalAcademicRepository extends IAcademicRepository {
  getWorkspace() {
    return httpClient.get('academic');
  }
  publishAssignment(assignmentId) {
    return httpClient.post(`academic/assignments/${segment(assignmentId)}/publish`, {});
  }
  publishExam(examId) {
    return httpClient.post(`academic/exams/${segment(examId)}/publish`, {});
  }
  runReport(reportKey, format = 'pdf') {
    return httpClient.post('academic/reports/run', { reportKey, format });
  }
}

export class LocalOperationsRepository extends IOperationsRepository {
  getWorkspace() {
    return httpClient.get('operations');
  }
  acknowledgeRule(ruleId) {
    return httpClient.post(`operations/rules/${segment(ruleId)}/acknowledge`, {});
  }
}

export class LocalNavigationRepository {
  getBadges() {
    return httpClient.get('nav/badges');
  }
}
