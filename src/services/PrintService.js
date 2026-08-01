export class PrintService {
  /** @param {{ printRepo: import('@/data/repositories/interfaces.js').IPrintRepository }} deps */
  constructor({ printRepo }) {
    this.printRepo = printRepo;
  }
  getPrinters() {
    return this.printRepo.listPrinters();
  }
  getJobs() {
    return this.printRepo.listJobs();
  }
  getLibrary() {
    return this.printRepo.getLibrary();
  }
  /** @param {{printerId:string, doc:string, copies?:number, size?:string, libraryFileId?:string}} input @returns {Promise<object>} created job */
  createJob(input) {
    return this.printRepo.createJob(input);
  }
  /** @param {string} id @returns {Promise<object>} */
  cancelJob(id) {
    return this.printRepo.cancelJob(id);
  }
}
