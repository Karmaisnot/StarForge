import type { FastifyInstance } from 'fastify';
import type { WorkspaceService } from './workspace.service';
import {
  CollectCashSchema,
  CreateWorkRequestSchema,
  ExportPeopleSchema,
  MeetingResponseSchema,
  RequestCoverSchema,
  RunReportSchema,
} from './workspace.schemas';

/** Routes for the persisted staff workspace modules. Every route is authenticated. */
export function workspaceRoutes(service: WorkspaceService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/work', auth, (req) => service.getWork(req.auth));
    app.post('/work/requests', auth, (req, reply) => {
      const body = CreateWorkRequestSchema.parse(req.body);
      reply.code(201);
      return service.createWorkRequest(req.auth, body);
    });
    app.patch('/work/requests/:id/cancel', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.cancelWorkRequest(req.auth, id);
    });
    app.patch('/work/meetings/:id/response', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.respondMeeting(req.auth, id, MeetingResponseSchema.parse(req.body));
    });
    app.post('/work/coverage/:id/claim', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.claimCover(req.auth, id);
    });
    app.post('/work/coverage', auth, (req, reply) => {
      const body = RequestCoverSchema.parse(req.body);
      reply.code(201);
      return service.requestCover(req.auth, body);
    });

    app.get('/finance', auth, (req) => service.getFinance(req.auth));
    app.post('/finance/collect-cash', auth, (req, reply) => {
      const body = CollectCashSchema.parse(req.body);
      reply.code(201);
      return service.collectCash(req.auth, body);
    });

    app.get('/people', auth, (req) => service.getPeople(req.auth));
    app.post('/people/export', auth, (req) =>
      service.exportPeople(req.auth, ExportPeopleSchema.parse(req.body)),
    );

    app.get('/academic', auth, (req) => service.getAcademic(req.auth));
    app.post('/academic/assignments/:id/publish', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.publishAssignment(req.auth, id);
    });
    app.post('/academic/exams/:id/publish', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.publishExam(req.auth, id);
    });
    app.post('/academic/reports/run', auth, (req, reply) => {
      const body = RunReportSchema.parse(req.body);
      reply.code(201);
      return service.runReport(req.auth, body);
    });

    app.get('/operations', auth, (req) => service.getOperations(req.auth));
    app.post('/operations/rules/:id/acknowledge', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.acknowledgeRule(req.auth, id);
    });
  };
}
