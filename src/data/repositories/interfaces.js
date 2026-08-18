// Repository contracts (ports). Concrete adapters — Mock* and Http* — extend
// these and override every method. UI/services depend ONLY on these abstractions
// (DIP); the composition root is the single place that names a concrete.
import { NotImplementedError } from '@/domain/errors.js';

const ni = (m) => {
  throw new NotImplementedError(m);
};

export class IAccountRepository {
  /** @returns {Promise<import('@/domain/models/teacher.js').Teacher>} */
  getTeacher() {
    return ni('IAccountRepository.getTeacher');
  }
  /** @param {{name?:string, username?:string}} _patch @returns {Promise<object>} */
  updateTeacher(_patch) {
    return ni('IAccountRepository.updateTeacher');
  }
  /** @returns {Promise<object>} per-teacher settings (toggles + theme + locale) */
  getSettings() {
    return ni('IAccountRepository.getSettings');
  }
  /** @param {object} _patch @returns {Promise<object>} */
  patchSettings(_patch) {
    return ni('IAccountRepository.patchSettings');
  }
  /** @returns {Promise<object[]>} active device sessions */
  listSessions() {
    return ni('IAccountRepository.listSessions');
  }
  /** @param {string} _id @returns {Promise<object>} */
  ejectSession(_id) {
    return ni('IAccountRepository.ejectSession');
  }
}

export class ICohortRepository {
  /** @returns {Promise<import('@/domain/models/cohort.js').Cohort[]>} */
  list() {
    return ni('ICohortRepository.list');
  }
  /** @param {string} _id @returns {Promise<import('@/domain/models/cohort.js').Cohort|null>} */
  getById(_id) {
    return ni('ICohortRepository.getById');
  }
  /** @param {string} _cohortId @returns {Promise<import('@/domain/models/student.js').Student[]>} */
  getRoster(_cohortId) {
    return ni('ICohortRepository.getRoster');
  }
  /** @param {string} _cohortId @param {{from?:string,to?:string}} _filters */
  getWorkspace(_cohortId, _filters) {
    return ni('ICohortRepository.getWorkspace');
  }
  /** @param {object} _draft @returns {Promise<object>} */
  create(_draft) {
    return ni('ICohortRepository.create');
  }
  /** @param {string} _cohortId @param {Array<{studentId:string,present:boolean}>} _entries */
  saveAttendance(_cohortId, _entries) {
    return ni('ICohortRepository.saveAttendance');
  }
  /** @param {string} _cohortId */
  advance(_cohortId) {
    return ni('ICohortRepository.advance');
  }
}

export class ICardRepository {
  listRecent() {
    return ni('ICardRepository.listRecent');
  }
  listTypes() {
    return ni('ICardRepository.listTypes');
  }
  getStats() {
    return ni('ICardRepository.getStats');
  }
  /** @param {object} _input issue a card @returns {Promise<object>} created card */
  issue(_input) {
    return ni('ICardRepository.issue');
  }
  /** @param {string} _code scan an access card at the door */
  scan(_code) {
    return ni('ICardRepository.scan');
  }
}

export class ITaskRepository {
  list() {
    return ni('ITaskRepository.list');
  }
  listColumns() {
    return ni('ITaskRepository.listColumns');
  }
  listFilters() {
    return ni('ITaskRepository.listFilters');
  }
  listTargets() {
    return ni('ITaskRepository.listTargets');
  }
  /** @param {string|number} _id @param {string} _state */
  setState(_id, _state) {
    return ni('ITaskRepository.setState');
  }
  /** @param {string|number} _id @param {string} _state @param {number} _targetIndex */
  move(_id, _state, _targetIndex) {
    return ni('ITaskRepository.move');
  }
  /** @param {object} _draft @returns {Promise<object>} created task */
  create(_draft) {
    return ni('ITaskRepository.create');
  }
  /** @param {object} _draft @returns {Promise<object[]>} one task per selected target */
  createMany(_draft) {
    return ni('ITaskRepository.createMany');
  }
}

export class IDashboardRepository {
  getToday(_range = '7d') {
    return ni('IDashboardRepository.getToday');
  }
}

export class IAiRepository {
  listConversations() {
    return ni('IAiRepository.listConversations');
  }
  getUsage() {
    return ni('IAiRepository.getUsage');
  }
  getWorkspace() {
    return ni('IAiRepository.getWorkspace');
  }
  /** @param {string} _conversationId @param {string} _text @returns {Promise<object>} {userMessage,aiMessage,usage} */
  sendMessage(_conversationId, _text) {
    return ni('IAiRepository.sendMessage');
  }
  /** @param {string} _conversationId */
  clearMessages(_conversationId) {
    return ni('IAiRepository.clearMessages');
  }
}

export class IPrintRepository {
  listPrinters() {
    return ni('IPrintRepository.listPrinters');
  }
  listJobs() {
    return ni('IPrintRepository.listJobs');
  }
  getLibrary() {
    return ni('IPrintRepository.getLibrary');
  }
  /** @param {object} _input {printerId,doc,copies?,size?,libraryFileId?} @returns {Promise<object>} created job */
  createJob(_input) {
    return ni('IPrintRepository.createJob');
  }
  /** @param {string} _id */
  cancelJob(_id) {
    return ni('IPrintRepository.cancelJob');
  }
}

export class ISurveyRepository {
  getCapabilities() {
    return ni('ISurveyRepository.getCapabilities');
  }
  listActive() {
    return ni('ISurveyRepository.listActive');
  }
  listHistory() {
    return ni('ISurveyRepository.listHistory');
  }
  listManaged() {
    return ni('ISurveyRepository.listManaged');
  }
  /** @param {string} _id */
  getDetail(_id) {
    return ni('ISurveyRepository.getDetail');
  }
  /** @param {string} _id @param {{answers:Record<string,unknown>,progress:number}} _input */
  saveDraft(_id, _input) {
    return ni('ISurveyRepository.saveDraft');
  }
  /** @param {string} _id @param {object} _input */
  submit(_id, _input) {
    return ni('ISurveyRepository.submit');
  }
  /** @param {string} _id */
  skip(_id) {
    return ni('ISurveyRepository.skip');
  }
  create(_input) {
    return ni('ISurveyRepository.create');
  }
  publish(_id) {
    return ni('ISurveyRepository.publish');
  }
  close(_id) {
    return ni('ISurveyRepository.close');
  }
  remove(_id) {
    return ni('ISurveyRepository.remove');
  }
  getResults(_id) {
    return ni('ISurveyRepository.getResults');
  }
}

export class IMgmtRepository {
  listContacts() {
    return ni('IMgmtRepository.listContacts');
  }
  listThreads() {
    return ni('IMgmtRepository.listThreads');
  }
  /** @param {number|string} _threadId */
  getTranscript(_threadId) {
    return ni('IMgmtRepository.getTranscript');
  }
  /** @param {number|string} _threadId @param {string} _text @returns {Promise<object>} created message */
  sendMessage(_threadId, _text) {
    return ni('IMgmtRepository.sendMessage');
  }
  /** Upload and send a real attachment in an existing thread. */
  sendAttachment(_threadId, _file, _body = '') {
    return ni('IMgmtRepository.sendAttachment');
  }
  /** Return a short-lived download URL for one scoped message attachment. */
  downloadAttachment(_threadId, _key) {
    return ni('IMgmtRepository.downloadAttachment');
  }
  /** @param {{name:string,message:string,participantIds:Array<number|string>,subject?:string}} _input @returns {Promise<object>} created thread */
  createThread(_input) {
    return ni('IMgmtRepository.createThread');
  }
  /** @param {number|string} _threadId */
  markRead(_threadId) {
    return ni('IMgmtRepository.markRead');
  }
  /** @param {number|string} _threadId @param {boolean} _archived */
  archiveThread(_threadId, _archived) {
    return ni('IMgmtRepository.archiveThread');
  }
  /** @param {number|string} _threadId */
  deleteThread(_threadId) {
    return ni('IMgmtRepository.deleteThread');
  }
}

export class INotificationRepository {
  listGroups() {
    return ni('INotificationRepository.listGroups');
  }
  listFilters() {
    return ni('INotificationRepository.listFilters');
  }
  /** @param {string} _id */
  markRead(_id) {
    return ni('INotificationRepository.markRead');
  }
  markAllRead() {
    return ni('INotificationRepository.markAllRead');
  }
}

export class IMaterialRepository {
  list() {
    return ni('IMaterialRepository.list');
  }
  getStats() {
    return ni('IMaterialRepository.getStats');
  }
  getStorage() {
    return ni('IMaterialRepository.getStorage');
  }
  listTargets() {
    return ni('IMaterialRepository.listTargets');
  }
  /** @param {object} _input {title,kind,sizeBytes?,meta?} @returns {Promise<object>} created material */
  create(_input) {
    return ni('IMaterialRepository.create');
  }
  /** @param {string} _id @returns {Promise<{url:string}>} */
  download(_id) {
    return ni('IMaterialRepository.download');
  }
  /** @param {string} _id @returns {Promise<{url:string}>} */
  preview(_id) {
    return ni('IMaterialRepository.preview');
  }
  /** Requeue a pending file safety check. */
  recheck(_id) {
    return ni('IMaterialRepository.recheck');
  }
  /** @param {string} _id */
  remove(_id) {
    return ni('IMaterialRepository.remove');
  }
}

export class IWorkRepository {
  getWorkspace() {
    return ni('IWorkRepository.getWorkspace');
  }
  /** @param {{kind:string,title:string,description?:string,amount?:number|null}} _input */
  createRequest(_input) {
    return ni('IWorkRepository.createRequest');
  }
  /** @param {string|number} _id */
  cancelRequest(_id) {
    return ni('IWorkRepository.cancelRequest');
  }
  /** @param {string|number} _id @param {'accepted'|'declined'} _response */
  respondMeeting(_id, _response) {
    return ni('IWorkRepository.respondMeeting');
  }
  /** @param {Record<string, unknown>} _input */
  scheduleMeeting(_input) {
    return ni('IWorkRepository.scheduleMeeting');
  }
  /** @param {string|number} _id */
  claimCover(_id) {
    return ni('IWorkRepository.claimCover');
  }
  /** @param {{lessonId:string|number,reason?:string}} _input */
  requestCover(_input) {
    return ni('IWorkRepository.requestCover');
  }
}

export class IFinanceRepository {
  getWorkspace() {
    return ni('IFinanceRepository.getWorkspace');
  }
  /** @param {{invoiceId:string|number,amount:number}} _input */
  collectCash(_input) {
    return ni('IFinanceRepository.collectCash');
  }
}

export class IPeopleRepository {
  getDirectory() {
    return ni('IPeopleRepository.getDirectory');
  }
  /** @param {{ids?:string[]}} _filters */
  exportStudents(_filters) {
    return ni('IPeopleRepository.exportStudents');
  }
}

export class IAcademicRepository {
  /** Role-scoped academic workspace assembled from the backend's domain modules. */
  getWorkspace() {
    return ni('IAcademicRepository.getWorkspace');
  }
  /** @param {string|number} _assignmentId */
  publishAssignment(_assignmentId) {
    return ni('IAcademicRepository.publishAssignment');
  }
  /** @param {string|number} _examId */
  publishExam(_examId) {
    return ni('IAcademicRepository.publishExam');
  }
  /** @param {string} _reportKey @param {'pdf'|'csv'|'xlsx'} _format */
  runReport(_reportKey, _format = 'pdf') {
    return ni('IAcademicRepository.runReport');
  }
}

export class IOperationsRepository {
  getWorkspace() {
    return ni('IOperationsRepository.getWorkspace');
  }
  /** @param {string|number} _ruleId */
  acknowledgeRule(_ruleId) {
    return ni('IOperationsRepository.acknowledgeRule');
  }
}
