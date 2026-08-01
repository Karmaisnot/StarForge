import type { FastifyInstance } from 'fastify';
import type { MgmtService } from './mgmt.service';
import { ArchiveThreadSchema, CreateThreadSchema, SendMessageSchema } from './mgmt.schemas';

/** Management-chat read + write routes. All require authentication. */
export function mgmtRoutes(service: MgmtService) {
  return async function register(app: FastifyInstance) {
    const auth = { preHandler: [app.authenticate] };

    app.get('/mgmt/threads', auth, (req) => service.listThreads(req.auth));

    app.get('/mgmt/threads/:threadId/transcript', auth, (req) => {
      const { threadId } = req.params as { threadId: string };
      return service.getTranscript(req.auth, threadId);
    });

    app.post('/mgmt/threads', auth, (req) => {
      const body = CreateThreadSchema.parse(req.body);
      return service.createThread(req.auth, body);
    });

    app.post('/mgmt/threads/:threadId/messages', auth, (req) => {
      const { threadId } = req.params as { threadId: string };
      const body = SendMessageSchema.parse(req.body);
      return service.sendMessage(req.auth, threadId, body);
    });

    app.patch('/mgmt/threads/:threadId/read', auth, (req) => {
      const { threadId } = req.params as { threadId: string };
      return service.markRead(req.auth, threadId);
    });

    app.patch('/mgmt/threads/:threadId/archive', auth, (req) => {
      const { threadId } = req.params as { threadId: string };
      const body = ArchiveThreadSchema.parse(req.body);
      return service.archiveThread(req.auth, threadId, body);
    });

    app.delete('/mgmt/threads/:threadId', auth, (req) => {
      const { threadId } = req.params as { threadId: string };
      return service.deleteThread(req.auth, threadId);
    });
  };
}
