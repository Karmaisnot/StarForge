import { z } from 'zod';

/** Body for posting a message into an existing thread. */
export const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

/** Body for composing a brand-new thread plus its opening outbound message. */
export const CreateThreadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
});
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;

/** Archive state is explicit so restoring a conversation stays idempotent. */
export const ArchiveThreadSchema = z.object({
  archived: z.boolean(),
});
export type ArchiveThreadInput = z.infer<typeof ArchiveThreadSchema>;
