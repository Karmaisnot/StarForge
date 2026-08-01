import { z } from 'zod';

export const CreateWorkRequestSchema = z.object({
  kind: z.enum(['other', 'expense', 'procurement', 'loan']),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  amount: z.number().finite().positive().max(1_000_000_000).nullable().optional(),
});
export type CreateWorkRequestInput = z.infer<typeof CreateWorkRequestSchema>;

export const MeetingResponseSchema = z.object({
  response: z.enum(['accepted', 'declined']),
});
export type MeetingResponseInput = z.infer<typeof MeetingResponseSchema>;

export const RequestCoverSchema = z.object({
  lessonId: z.string().trim().min(1),
  reason: z.string().trim().max(1000).optional(),
});
export type RequestCoverInput = z.infer<typeof RequestCoverSchema>;

export const CollectCashSchema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.number().finite().positive().max(1_000_000_000),
});
export type CollectCashInput = z.infer<typeof CollectCashSchema>;

export const RunReportSchema = z.object({
  reportKey: z.string().trim().min(1).max(80),
  format: z.enum(['pdf', 'csv', 'xlsx']).default('pdf'),
});
export type RunReportInput = z.infer<typeof RunReportSchema>;

export const ExportPeopleSchema = z.object({
  ids: z.array(z.string().trim().min(1)).max(10_000).default([]),
});
export type ExportPeopleInput = z.infer<typeof ExportPeopleSchema>;
