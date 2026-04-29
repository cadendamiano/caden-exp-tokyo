import { z } from 'zod';
import { BatchId, IdempotencyKey } from './payment';

export const ApproverId = z.string().min(1);
export type ApproverId = z.infer<typeof ApproverId>;

/** The signed payload inside an ApprovalToken. */
export const ApprovalClaims = z.object({
  batchId: BatchId,
  idempotencyKey: IdempotencyKey,
  approverId: ApproverId,
  secondApproverId: ApproverId.optional(),
  issuedAt: z.number().int().describe('Unix epoch seconds'),
  expiresAt: z.number().int(),
  nonce: z.string().min(8),
  policyAtIssue: z.enum(['auto-approvable', 'single-approver', 'requires-dual-control']),
});
export type ApprovalClaims = z.infer<typeof ApprovalClaims>;

/** A signed approval token: claims + HMAC-SHA256 signature. */
export const ApprovalToken = z.object({
  claims: ApprovalClaims,
  signature: z.string().regex(/^[a-f0-9]{64}$/, 'expected 64-char lowercase hex'),
});
export type ApprovalToken = z.infer<typeof ApprovalToken>;

/** What submit_payment_batch's tool input looks like once approval is required. */
export const SubmitPaymentBatchInput = z.object({
  batchId: BatchId,
  approvalToken: ApprovalToken.optional().describe('Server-minted approval token. Required.'),
});
export type SubmitPaymentBatchInput = z.infer<typeof SubmitPaymentBatchInput>;
