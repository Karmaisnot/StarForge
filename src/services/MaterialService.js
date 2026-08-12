export class MaterialService {
  /** @param {{ materialRepo: import('@/data/repositories/interfaces.js').IMaterialRepository }} deps */
  constructor({ materialRepo }) {
    this.materialRepo = materialRepo;
  }
  getList() {
    return this.materialRepo.list();
  }
  getStats() {
    return this.materialRepo.getStats();
  }
  getStorage() {
    return this.materialRepo.getStorage();
  }
  getTargets() {
    return this.materialRepo.listTargets();
  }
  /** @param {{title:string, kind:string, sizeBytes?:number, meta?:string}} input @returns {Promise<object>} created material */
  create(input) {
    return this.materialRepo.create(input);
  }
  download(id) {
    return this.materialRepo.download(id);
  }
  /** @param {string} id @returns {Promise<unknown>} */
  remove(id) {
    return this.materialRepo.remove(id);
  }
}
