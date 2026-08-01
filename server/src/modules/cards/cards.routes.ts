import type { FastifyInstance } from 'fastify';
import type { CardsService } from './cards.service';
import { IssueCardSchema, ScanCardSchema } from './cards.schemas';

/** Cards routes (read + issue). All require authentication. */
export function cardsRoutes(service: CardsService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/cards/recent', auth, (req) => service.listRecent(req.auth));

    app.get('/cards/types', auth, (req) => service.listTypes(req.auth));

    app.get('/cards/stats', auth, (req) => service.getStats(req.auth));

    app.post('/cards', auth, (req, reply) => {
      const body = IssueCardSchema.parse(req.body);
      reply.code(201);
      return service.issue(req.auth, body);
    });

    app.post('/cards/scan', auth, (req) => {
      const { code } = ScanCardSchema.parse(req.body);
      return service.scan(req.auth, code);
    });
  };
}
