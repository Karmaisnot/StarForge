import { z } from 'zod';

/**
 * Body for issuing a card (POST /cards). The card's `kind` is NOT accepted from
 * the client — it is derived server-side from the (tenant-scoped) CardType, so
 * the denormalized `kind` column can never disagree with its type. `studentId`
 * and the optional `cohortId` are validated for tenancy in the service.
 */
export const IssueCardSchema = z
  .object({
    // id-based (precise) ...
    cardTypeId: z.string().trim().min(1).optional(),
    studentId: z.string().trim().min(1).optional(),
    cohortId: z.string().trim().min(1).optional(),
    // ... or name-based (the current Give-Card modal sends these).
    typeName: z.string().trim().min(1).optional(),
    kind: z.enum(['up', 'down']).optional(),
    recipient: z.string().trim().min(1).optional(),
    reason: z.string().trim().min(1).max(280).optional(),
  })
  .refine((v) => (v.cardTypeId && v.studentId) || (v.typeName && v.recipient), {
    message: 'Provide { cardTypeId, studentId } or { typeName, recipient }',
  });
export type IssueCardInput = z.infer<typeof IssueCardSchema>;

/** Security-desk barcode / student-code scan. */
export const ScanCardSchema = z.object({
  code: z.string().trim().min(1).max(160),
});
export type ScanCardInput = z.infer<typeof ScanCardSchema>;
