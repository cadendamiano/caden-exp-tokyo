import { z } from 'zod';
import { defineTool } from './defineTool';
import { BillId } from '@/lib/domain/invoice';
import { PaymentMethod, IdempotencyKey, BatchId } from '@/lib/domain/payment';
import { ApprovalToken } from '@/lib/domain/approval';

// Stage a payment batch — the LLM's authorized write. No money moves here;
// the batch is held for human approval. The token is minted by the UI when a
// human clicks Approve and is required by submit_payment_batch.
export const stagePaymentBatch = defineTool({
  name: 'stage_payment_batch',
  label: 'Stage payment batch',
  domain: 'treasury',
  description:
    'Stage a batch for human approval. The UI will render an approval card — do not fabricate one in text. Use billHints to supply amount/vendor for bill IDs not in the local dataset. Required: idempotencyKey (UUID v4 generated client-side).',
  schema: z.object({
    billIds: z.array(BillId).min(1),
    bankAccount: z.string().optional(),
    method: PaymentMethod.optional(),
    scheduledFor: z.string().optional(),
    idempotencyKey: IdempotencyKey,
    billHints: z.array(z.object({
      id: z.string(),
      amount: z.number().optional(),
      vendor: z.string().optional(),
      invoice: z.string().optional(),
    })).optional(),
  }),
});

// Submit an already-staked batch. NEVER moves money without a server-signed
// ApprovalToken whose claims match the batchId and idempotencyKey.
export const submitPaymentBatch = defineTool({
  name: 'submit_payment_batch',
  label: 'Submit payment batch',
  domain: 'treasury',
  description:
    'Submit an approved payment batch. Requires both batchId and an approvalToken minted by the UI after human approval. Without a valid token the call returns ok=false with code=E_NO_APPROVAL.',
  schema: z.object({
    batchId: BatchId,
    approvalToken: ApprovalToken.optional(),
  }),
});

// Read-only treasury tools (no writes; minimal schemas).
export const getLiquidityProjection = defineTool({
  name: 'get_liquidity_projection',
  label: 'Get liquidity projection',
  domain: 'treasury',
  description: 'Project operating-account cash balance forward using scheduled AP, payroll, and AR.',
  schema: z.object({
    days: z.number().int().min(1).max(120).optional(),
    threshold: z.number().optional(),
  }),
});

export const TREASURY_TOOLS = [
  stagePaymentBatch,
  submitPaymentBatch,
  getLiquidityProjection,
];
