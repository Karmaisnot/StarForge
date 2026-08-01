export class CohortService {
  /** @param {{ cohortRepo: import('@/data/repositories/interfaces.js').ICohortRepository }} deps */
  constructor({ cohortRepo }) {
    this.cohortRepo = cohortRepo;
  }
  list() {
    return this.cohortRepo.list();
  }
  getById(id) {
    return this.cohortRepo.getById(id);
  }
  getRoster(cohortId) {
    return this.cohortRepo.getRoster(cohortId);
  }
  /** @param {string} cohortId @param {{from?:string,to?:string}} filters */
  getWorkspace(cohortId, filters = {}) {
    return this.cohortRepo.getWorkspace(cohortId, filters);
  }
  /**
   * Persist a new cohort/group.
   * @param {{ name:string, level?:string, room?:string, color?:string, lessonsPerWeek?:number, subjectId?:string }} draft
   * @returns {Promise<object>} the created cohort
   */
  create(draft) {
    return this.cohortRepo.create(draft);
  }
  /**
   * Persist an attendance roll-call for a cohort.
   * @param {string} cohortId
   * @param {Array<{ studentId:string, present:boolean }>} entries
   */
  saveAttendance(cohortId, entries) {
    return this.cohortRepo.saveAttendance(cohortId, entries);
  }
  /** Force the configured level/month progression for a teacher-owned group. */
  advance(cohortId) {
    return this.cohortRepo.advance(cohortId);
  }
}
