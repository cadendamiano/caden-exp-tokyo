import { z } from 'zod';
import { Money } from './money';
import { BillId } from './invoice';
import { VendorId } from './vendor';

export const PaymentMethod = z.enum(['ACH', 'Check', 'Wire']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const IdempotencyKey = z
  .string()
  .uuid()
  .describe('Client-generated UUID v4. Required for stage and submit.');
export type IdempotencyKey = z.infer<typeof IdempotencyKey>;

export const BatchId = z.string().regex(/^btch_[A-Za-z0-9]+$/, 'expected btch_XX');
export type BatchId = z.infer<typeof BatchId>;

export const PaymentProposalLine = z.object({
  billId: BillId,
  vendorId: VendorId,
  vendorName: z.string(),
  invoiceNumber: z.string(),
  amount: Money,
});
export type PaymentProposalLine = z.infer<typeof PaymentProposalLine>;

export const PaymentProposal = z.object({
  lines: z.array(PaymentProposalLine).min(1),
  fundingAccount: z.string().describe('Funding account label, e.g. "Ops Checking ••4821"'),
  method: PaymentMethod.default('ACH'),
  scheduledFor: z.string().describe('ISO date or "Today, 4:00 PM PT"-style label'),
  total: Money,
});
export type PaymentProposal = z.infer<typeof PaymentProposal>;

export const PaymentBatch = z.object({
  batchId: BatchId,
  idempotencyKey: IdempotencyKey,
  proposal: PaymentProposal,
  staked: z.literal(true),
  policy: z.enum(['auto-approvable', 'single-approver', 'requires-dual-control']),
});
export type PaymentBatch = z.infer<typeof PaymentBatch>;

/** Verifies sum(lines.amount) === proposal.total. Returns null on success or an error message. */
export function verifyTotalReconciles(p: PaymentProposal): string | null {
  const sum = p.lines.reduce((acc, l) => {
    if (l.amount.currency !== p.total.currency) {
      return -Infinity;
    }
    return acc + l.amount.minorUnits;
  }, 0);
  if (sum === -Infinity) return 'currency mismatch between lines and total';
  if (sum !== p.total.minorUnits) {
    return `total drift: lines sum to ${sum}, declared total is ${p.total.minorUnits}`;
  }
  return null;
}
