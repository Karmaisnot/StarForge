import type { FastifyInstance } from 'fastify';
import type { SurveyService } from './survey.service';
import { SaveSurveyDraftSchema, SubmitSurveySchema } from './survey.schemas';

/** Survey read + finalise routes. All require authentication. */
export function surveyRoutes(service: SurveyService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/surveys/active', auth, (req) => service.listActive(req.auth));

    app.get('/surveys/history', auth, (req) => service.listHistory(req.auth));

    app.get('/surveys/:id', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.getDetail(req.auth, id);
    });

    app.patch('/surveys/:id/draft', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.saveDraft(req.auth, id, SaveSurveyDraftSchema.parse(req.body));
    });

    app.post('/surveys/:id/submit', auth, (req) => {
      const { id } = req.params as { id: string };
      const body = SubmitSurveySchema.parse(req.body);
      return service.submit(req.auth, id, body);
    });

    app.post('/surveys/:id/skip', auth, (req) => {
      const { id } = req.params as { id: string };
      return service.skip(req.auth, id);
    });
  };
}
