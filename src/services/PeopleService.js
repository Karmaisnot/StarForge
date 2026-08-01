export class PeopleService {
  /** @param {{ peopleRepo: import('@/data/repositories/interfaces.js').IPeopleRepository }} deps */
  constructor({ peopleRepo }) {
    this.peopleRepo = peopleRepo;
  }

  getDirectory() {
    return this.peopleRepo.getDirectory();
  }

  /** @param {{ids?:string[]}} filters */
  exportStudents(filters = {}) {
    return this.peopleRepo.exportStudents(filters);
  }
}
