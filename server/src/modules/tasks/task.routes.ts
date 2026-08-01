import type { FastifyInstance } from 'fastify';
import type { TaskService } from './task.service';
import { CreateTaskSchema, MoveTaskSchema, SetTaskStateSchema } from './task.schemas';

/** Task board routes. All require authentication. */
export function taskRoutes(service: TaskService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/tasks', auth, (req) => service.list(req.auth));

    app.get('/tasks/columns', auth, (req) => service.listColumns(req.auth));

    app.get('/tasks/filters', auth, (req) => service.listFilters(req.auth));

    app.post('/tasks', auth, (req, reply) => {
      const body = CreateTaskSchema.parse(req.body);
      reply.code(201);
      return service.create(req.auth, body);
    });

    app.patch('/tasks/:id/state', auth, (req) => {
      const { id } = req.params as { id: string };
      const { state } = SetTaskStateSchema.parse(req.body);
      return service.setState(req.auth, id, state);
    });

    app.patch('/tasks/:id/move', auth, (req) => {
      const { id } = req.params as { id: string };
      const input = MoveTaskSchema.parse(req.body);
      return service.move(req.auth, id, input.state, input.targetIndex);
    });
  };
}
