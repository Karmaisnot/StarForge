import { z } from 'zod';

/**
 * Create-cohort payload. The UI sends plain display strings for `level`/`room`
 * (already localized for the active locale); the service wraps them into the
 * `{uz,ru,en}` Json shape the schema stores. `lessonsPerWeek` feeds cadence.
 */
export const CreateCohortSchema = z.object({
  name: z.string().trim().min(1).max(120),
  level: z.string().trim().min(1).max(80).optional(),
  subjectId: z.string().trim().min(1).optional(),
  room: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(64).optional(),
  lessonsPerWeek: z.number().int().min(0).max(40).optional(),
});
export type CreateCohortInput = z.infer<typeof CreateCohortSchema>;

/**
 * Take-attendance payload. Each entry pairs a roster student with a present
 * flag; the record summary (present/total/percent) is derived server-side from
 * the entries that still belong to the cohort at save time.
 */
export const TakeAttendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        present: z.boolean(),
      }),
    )
    .max(500),
});
export type TakeAttendanceInput = z.infer<typeof TakeAttendanceSchema>;

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const CohortWorkspaceQuerySchema = z
  .object({
    from: DateOnlySchema.optional(),
    to: DateOnlySchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '`from` must be on or before `to`',
  });
export type CohortWorkspaceQuery = z.infer<typeof CohortWorkspaceQuerySchema>;
