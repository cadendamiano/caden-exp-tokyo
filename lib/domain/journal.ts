/**
 * Stubs for the reporting / GL boundary. Detailed shapes land in Phase 4.
 */
import { z } from 'zod';
import { Money } from './money';

export const JournalEntryLine = z.object({
  accountCode: z.string(),
  description: z.string().optional(),
  debit: Money.optional(),
  credit: Money.optional(),
});
export type JournalEntryLine = z.infer<typeof JournalEntryLine>;

export const JournalEntry = z.object({
  id: z.string(),
  postedAt: z.string(),
  lines: z.array(JournalEntryLine).min(2),
});
export type JournalEntry = z.infer<typeof JournalEntry>;

export const FinancialReport = z.object({
  title: z.string(),
  period: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    rows: z.array(z.object({
      label: z.string(),
      amount: Money.optional(),
      detail: z.string().optional(),
    })),
  })),
});
export type FinancialReport = z.infer<typeof FinancialReport>;
