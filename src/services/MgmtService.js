export class MgmtService {
  /** @param {{ mgmtRepo: import('@/data/repositories/interfaces.js').IMgmtRepository }} deps */
  constructor({ mgmtRepo }) {
    this.mgmtRepo = mgmtRepo;
  }
  getThreads() {
    return this.mgmtRepo.listThreads();
  }
  getContacts() {
    return this.mgmtRepo.listContacts();
  }
  getTranscript(threadId) {
    return this.mgmtRepo.getTranscript(threadId);
  }
  /** @param {number|string} threadId @param {string} text @returns {Promise<object>} created message */
  sendMessage(threadId, text) {
    return this.mgmtRepo.sendMessage(threadId, text);
  }
  sendAttachment(threadId, file, body = '') {
    return this.mgmtRepo.sendAttachment(threadId, file, body);
  }
  downloadAttachment(threadId, key) {
    return this.mgmtRepo.downloadAttachment(threadId, key);
  }
  /** @param {{name:string,message:string}} input @returns {Promise<object>} created thread */
  createThread(input) {
    return this.mgmtRepo.createThread(input);
  }
  /** @param {number|string} threadId @returns {Promise<object>} */
  markRead(threadId) {
    return this.mgmtRepo.markRead(threadId);
  }
  /** @param {number|string} threadId @param {boolean} archived */
  archiveThread(threadId, archived) {
    return this.mgmtRepo.archiveThread(threadId, archived);
  }
  /** @param {number|string} threadId */
  deleteThread(threadId) {
    return this.mgmtRepo.deleteThread(threadId);
  }
}
