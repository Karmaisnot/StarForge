import type { MgmtThread, MgmtMessage } from '@prisma/client';
import type { Db } from '../../db/prisma';

/** The latest message in a thread plus its computed unread tally. */
export interface ThreadActivity {
  last: MgmtMessage | null;
  unread: number;
}

/**
 * Management-chat data access. Thread previews (last message / time / unread)
 * are DERIVED from the message rows with set-based aggregates — never per-thread
 * loops — so a list of any size stays a constant number of queries (no N+1).
 */
export class MgmtRepository {
  constructor(private readonly db: Db) {}

  listThreads(academyId: string, teacherId: string): Promise<MgmtThread[]> {
    return this.db.mgmtThread.findMany({
      where: { academyId, teacherId, deletedAt: null },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** Confirms a thread belongs to the tenant + teacher before exposing its transcript. */
  getThread(threadId: string, academyId: string, teacherId: string): Promise<MgmtThread | null> {
    return this.db.mgmtThread.findFirst({
      where: { id: threadId, academyId, teacherId, deletedAt: null },
    });
  }

  /** Append a single outbound message to a thread (read=true: the teacher authored it). */
  createOutMessage(threadId: string, text: string): Promise<MgmtMessage> {
    return this.db.mgmtMessage.create({
      data: { threadId, dir: 'out', text, read: true },
    });
  }

  /**
   * Compose a new thread plus its opening outbound message atomically, so a
   * partially-created thread (header with no transcript) can never be observed.
   * Returns the thread together with the activity needed to map its preview.
   */
  async createThreadWithMessage(
    academyId: string,
    teacherId: string,
    name: string,
    text: string,
  ): Promise<{ thread: MgmtThread; message: MgmtMessage }> {
    return this.db.$transaction(async (tx) => {
      const thread = await tx.mgmtThread.create({
        data: { academyId, teacherId, name },
      });
      const message = await tx.mgmtMessage.create({
        data: { threadId: thread.id, dir: 'out', text, read: true },
      });
      return { thread, message };
    });
  }

  /**
   * Mark a thread's inbound (dir = 'in') messages read. Returns the number of
   * rows flipped so the caller can treat a no-op (already read) idempotently.
   */
  async markInboundRead(threadId: string): Promise<number> {
    const { count } = await this.db.mgmtMessage.updateMany({
      where: { threadId, dir: 'in', read: false },
      data: { read: true },
    });
    return count;
  }

  async setArchived(threadId: string, archived: boolean): Promise<number> {
    const { count } = await this.db.mgmtThread.updateMany({
      where: { id: threadId, deletedAt: null },
      data: { archivedAt: archived ? new Date() : null },
    });
    return count;
  }

  async softDelete(threadId: string): Promise<number> {
    const { count } = await this.db.mgmtThread.updateMany({
      where: { id: threadId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count;
  }

  /** Ordered transcript for one thread (oldest first). */
  getMessages(threadId: string): Promise<MgmtMessage[]> {
    return this.db.mgmtMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Per-thread last message + unread count for a batch of threads, in two
   * set-based queries (one ordered scan for the latest row, one grouped count
   * for the unread inbound tally) — no N+1.
   */
  async activityByThread(threadIds: string[]): Promise<Map<string, ThreadActivity>> {
    const out = new Map<string, ThreadActivity>();
    if (!threadIds.length) return out;

    const [messages, unreadRows] = await Promise.all([
      // Newest first so the first row seen per thread is its last message.
      this.db.mgmtMessage.findMany({
        where: { threadId: { in: threadIds } },
        orderBy: { createdAt: 'desc' },
      }),
      // Inbound (dir = 'in') unread messages are what the badge counts.
      this.db.mgmtMessage.groupBy({
        by: ['threadId'],
        where: { threadId: { in: threadIds }, dir: 'in', read: false },
        _count: { _all: true },
      }),
    ]);

    const unreadMap = new Map(unreadRows.map((r) => [r.threadId, r._count._all]));
    for (const m of messages) {
      if (!out.has(m.threadId)) {
        out.set(m.threadId, { last: m, unread: unreadMap.get(m.threadId) ?? 0 });
      }
    }
    // Threads with zero messages still need an entry.
    for (const id of threadIds) {
      if (!out.has(id)) out.set(id, { last: null, unread: unreadMap.get(id) ?? 0 });
    }
    return out;
  }
}
