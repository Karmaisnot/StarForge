export class WorkService {
  /** @param {{ workRepo: import('@/data/repositories/interfaces.js').IWorkRepository }} deps */
  constructor({ workRepo }) {
    this.workRepo = workRepo;
  }
  getWorkspace() {
    return this.workRepo.getWorkspace();
  }
  createRequest(input) {
    return this.workRepo.createRequest(input);
  }
  cancelRequest(id) {
    return this.workRepo.cancelRequest(id);
  }
  respondMeeting(id, response) {
    return this.workRepo.respondMeeting(id, response);
  }
  scheduleMeeting(input) {
    return this.workRepo.scheduleMeeting(input);
  }
  claimCover(id) {
    return this.workRepo.claimCover(id);
  }
  requestCover(input) {
    return this.workRepo.requestCover(input);
  }
}
