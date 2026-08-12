export class TaskService {
  /** @param {{ taskRepo: import('@/data/repositories/interfaces.js').ITaskRepository }} deps */
  constructor({ taskRepo }) {
    this.taskRepo = taskRepo;
  }
  async getList() {
    const [columns, tasks] = await Promise.all([
      this.taskRepo.listColumns(),
      this.taskRepo.list(),
    ]);
    return { columns, tasks };
  }
  getFilters() {
    return this.taskRepo.listFilters();
  }
  getTargets() {
    return this.taskRepo.listTargets();
  }
  setState(id, state) {
    return this.taskRepo.setState(id, state);
  }
  move(id, state, targetIndex) {
    return this.taskRepo.move(id, state, targetIndex);
  }
  /**
   * Persist a new task. The backend always creates in the `todo` column, so when
   * the caller wants a different column it must follow up with setState (the page
   * does this with the returned id). Returns the created task DTO.
   * @param {{title:string, priority?:string, projectId?:string, deadlineLabel?:string, deadlineAt?:string, urgent?:boolean, fromMgmt?:boolean}} draft
   */
  create(draft) {
    return this.taskRepo.create(draft);
  }
  createMany(draft) {
    return this.taskRepo.createMany(draft);
  }
}
