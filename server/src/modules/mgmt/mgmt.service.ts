import type { AuthContext } from '../../http/plugins/auth';
import { NotFoundError } from '../../shared/errors';
import type { MgmtRepository } from './mgmt.repository';
import { mapThread, mapMessage } from './mgmt.mapper';
import type { ArchiveThreadInput, CreateThreadInput, SendMessageInput } from './mgmt.schemas';

/** Management-chat read use-cases with computed thread previews. */
export class MgmtService {
  constructor(private readonly repo: MgmtRepository) {}

  /** Thread list with derived last-message / time / unread, tenant + teacher scoped. */
  async listThreads(ctx: AuthContext) {
    const threads = await this.repo.listThreads(ctx.academyId, ctx.teacherId);
    const activity = await this.repo.activityByThread(threads.map((t) => t.id));
    const now = new Date();
    return threads.map((t) =>
      mapThread(t, activity.get(t.id) ?? { last: null, unread: 0 }, now),
    );
  }

  /**
   * Ordered transcript for one thread. Returns `[]` for an unknown thread
   * (parity with the mock, which yields the empty fixture). The thread lookup is
   * scoped by tenant + teacher so cross-tenant ids never leak messages.
   */
  async getTranscript(ctx: AuthContext, threadId: string) {
    const thread = await this.repo.getThread(threadId, ctx.academyId, ctx.teacherId);
    if (!thread) return [];
    const messages = await this.repo.getMessages(thread.id);
    return messages.map(mapMessage);
  }

  /**
   * Append an outbound message to a thread the teacher owns. The thread lookup is
   * scoped by tenant + teacher, so a foreign/unknown thread 404s rather than
   * leaking that it exists. Returns the new message DTO for cache reconciliation.
   */
  async sendMessage(ctx: AuthContext, threadId: string, input: SendMessageInput) {
    const thread = await this.repo.getThread(threadId, ctx.academyId, ctx.teacherId);
    if (!thread) throw new NotFoundError('Thread');
    const message = await this.repo.createOutMessage(thread.id, input.text);
    return mapMessage(message);
  }

  /**
   * Compose a new thread for the current teacher plus its first outbound message,
   * atomically. Returns the thread DTO (preview derived from that first message)
   * so the list cache can prepend it without a refetch.
   */
  async createThread(ctx: AuthContext, input: CreateThreadInput) {
    const { thread, message } = await this.repo.createThreadWithMessage(
      ctx.academyId,
      ctx.teacherId,
      input.name,
      input.message,
    );
    return mapThread(thread, { last: message, unread: 0 }, new Date());
  }

  /**
   * Mark a thread's inbound messages read. Scoped by tenant + teacher; a
   * foreign/unknown thread 404s. Idempotent — re-marking an already-read thread
   * simply flips zero rows and still returns ok.
   */
  async markRead(ctx: AuthContext, threadId: string) {
    const thread = await this.repo.getThread(threadId, ctx.academyId, ctx.teacherId);
    if (!thread) throw new NotFoundError('Thread');
    await this.repo.markInboundRead(thread.id);
    return { ok: true as const };
  }

  /** Hide or restore a conversation without destroying its transcript. */
  async archiveThread(ctx: AuthContext, threadId: string, input: ArchiveThreadInput) {
    const thread = await this.repo.getThread(threadId, ctx.academyId, ctx.teacherId);
    if (!thread) throw new NotFoundError('Thread');
    await this.repo.setArchived(thread.id, input.archived);
    return { id: thread.id, archived: input.archived };
  }

  /** Soft-delete keeps audit data while removing the conversation from this teacher's workspace. */
  async deleteThread(ctx: AuthContext, threadId: string) {
    const thread = await this.repo.getThread(threadId, ctx.academyId, ctx.teacherId);
    if (!thread) throw new NotFoundError('Thread');
    await this.repo.softDelete(thread.id);
    return { id: thread.id, deleted: true as const };
  }
}
