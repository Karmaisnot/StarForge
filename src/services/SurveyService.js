export class SurveyService {
  /** @param {{ surveyRepo: import('@/data/repositories/interfaces.js').ISurveyRepository }} deps */
  constructor({ surveyRepo }) {
    this.surveyRepo = surveyRepo;
  }
  getActive() {
    return this.surveyRepo.listActive();
  }
  getCapabilities() {
    return this.surveyRepo.getCapabilities();
  }
  getHistory() {
    return this.surveyRepo.listHistory();
  }
  getManaged() {
    return this.surveyRepo.listManaged();
  }
  getDetail(surveyId) {
    return this.surveyRepo.getDetail(surveyId);
  }
  /** @param {string} surveyId @param {{answers:Record<string,unknown>,progress:number}} input */
  saveDraft(surveyId, input) {
    return this.surveyRepo.saveDraft(surveyId, input);
  }
  /** @param {string} surveyId @param {object} input */
  submit(surveyId, input) {
    return this.surveyRepo.submit(surveyId, input);
  }
  /** @param {string} surveyId */
  skip(surveyId) {
    return this.surveyRepo.skip(surveyId);
  }
  create(input) {
    return this.surveyRepo.create(input);
  }
  publish(surveyId) {
    return this.surveyRepo.publish(surveyId);
  }
  close(surveyId) {
    return this.surveyRepo.close(surveyId);
  }
  remove(surveyId) {
    return this.surveyRepo.remove(surveyId);
  }
  getResults(surveyId) {
    return this.surveyRepo.getResults(surveyId);
  }
}
