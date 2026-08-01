import { z } from 'zod';

/**
 * Body for POST /surveys/:id/submit. `rating` is coerced to an integer and
 * constrained to the 1..5 scale the UI presents; `comment` is optional free
 * text. Skipping carries no body.
 */
const AnswerValueSchema = z.union([
  z.string().max(5000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(500)).max(50),
]);

export const SurveyAnswersSchema = z.record(z.string().min(1), AnswerValueSchema);

export const SubmitSurveySchema = z.object({
  answers: SurveyAnswersSchema.default({}),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
});
export type SubmitSurveyInput = z.infer<typeof SubmitSurveySchema>;

export const SaveSurveyDraftSchema = z.object({
  answers: SurveyAnswersSchema,
  progress: z.number().int().min(0).max(100),
});
export type SaveSurveyDraftInput = z.infer<typeof SaveSurveyDraftSchema>;
