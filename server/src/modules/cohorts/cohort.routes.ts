import type { FastifyInstance } from 'fastify';
import type { CohortService } from './cohort.service';
import {
  CohortWorkspaceQuerySchema,
  CreateCohortSchema,
  TakeAttendanceSchema,
} from './cohort.schemas';

/** Cohort read + write routes. All require authentication. */
export function cohortRoutes(service: CohortService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/cohorts', auth, (req) => service.list(req.auth));

    app.post('/cohorts', auth, (req, reply) => {
      const body = CreateCohortSchema.parse(req.body);
      reply.code(201);
      return service.create(req.auth, body);
    });

    app.post('/cohorts/:cohortId/attendance', auth, (req, reply) => {
      const { cohortId } = req.params as { cohortId: string };
      const body = TakeAttendanceSchema.parse(req.body);
      reply.code(201);
      return service.takeAttendance(req.auth, cohortId, body);
    });

    app.get('/cohorts/:id', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.getById(req.auth, id);
    });

    app.get('/cohorts/:cohortId/roster', auth, (req) => {
      const { cohortId } = req.params as { cohortId: string };
      return service.getRoster(req.auth, cohortId);
    });

    app.get('/cohorts/:cohortId/workspace', auth, (req) => {
      const { cohortId } = req.params as { cohortId: string };
      return service.getWorkspace(req.auth, cohortId, CohortWorkspaceQuerySchema.parse(req.query));
    });

    app.post('/cohorts/:cohortId/advance', auth, (req) => {
      const { cohortId } = req.params as { cohortId: string };
      return service.advance(req.auth, cohortId);
    });
  };
}
