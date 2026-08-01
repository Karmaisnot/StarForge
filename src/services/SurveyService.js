export class SurveyService {
  /** @param {{ surveyRepo: import('@/data/repositories/interfaces.js').ISurveyRepository }} deps */
  constructor({ surveyRepo }) {
    this.surveyRepo = surveyRepo;
  }
  getActive() {
    return this.surveyRepo.listActive();
  }
  getHistory() {
    return this.surveyRepo.listHistory();
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
}
