import { z } from 'zod';
import { LOCALES, Priority, TaskColumnId } from '../../domain/enums';

const stateValues = Object.values(TaskColumnId) as [string, ...string[]];
const priorityValues = Object.values(Priority) as [string, ...string[]];

/** A localized leaf: every locale key required, each a non-empty trimmed string. */
const LocalizedString = z.object(
  Object.fromEntries(LOCALES.map((l) => [l, z.string().trim().min(1).max(200)])) as Record<
    (typeof LOCALES)[number],
    z.ZodString
  >,
);

/** Title may arrive as a plain string (modal input) or a fully-localized object. */
const TitleSchema = z.union([z.string().trim().min(1).max(200), LocalizedString]);

/** PATCH /tasks/:id/state — move a task to one of the four board columns. */
export const SetTaskStateSchema = z.object({
  state: z.enum(stateValues),
});
export type SetTaskStateInput = z.infer<typeof SetTaskStateSchema>;

/** PATCH /tasks/:id/move — reorder inside a column or move across columns. */
export const MoveTaskSchema = z.object({
  state: z.enum(stateValues),
  targetIndex: z.number().int().min(0).max(10_000),
});
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

/** POST /tasks — create a task owned by the caller (so `mine` is true). */
export const CreateTaskSchema = z.object({
  title: TitleSchema,
  priority: z.enum(priorityValues).optional(),
  projectId: z.string().trim().min(1).optional(),
  deadlineLabel: z.union([z.string().trim().min(1).max(120), LocalizedString]).optional(),
  deadlineAt: z.string().datetime().optional(),
  urgent: z.boolean().optional(),
  fromMgmt: z.boolean().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
