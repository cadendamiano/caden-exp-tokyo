/**
 * Server-side record of staged batches.
 *
 * When `stage_payment_batch` runs, we persist the canonical batch (batchId,
 * idempotencyKey, total, policy classification, lines). The mint endpoint and
 * the submit gate both look the batch up here so they classify policy
 * identically and so the LLM can't tamper with the amount between stage and
 * submit.
 *
 * In-process Map for the prototype; same swappable interface as
 * lib/idempotency.ts.
 */
import type { Money } from '@/lib/domain/money';
import type { ApprovalPolicyResult } from '@/lib/policy/approvalPolicy';

export type StagedBatchLine = {
  vendor: string;
  invoice: string;
  amount: number; // major units; legacy approvalPayload still uses this
};

export type StagedBatch = {
  batchId: string;
  idempotencyKey: string;
  total: Money;
  policy: ApprovalPolicyResult;
  lines: StagedBatchLine[];
  fundingAccount: string;
  method: 'ACH' | 'Check' | 'Wire';
  createdAt: number;
  /** Submit-side: confirmationId once the batch is executed. */
  confirmationId?: string;
};

const STORE = new Map<string, StagedBatch>();
/** Reverse index: idempotencyKey for stage operation → batchId. */
const STAGE_KEY_INDEX = new Map<string, string>();

export function getStagedByKey(idempotencyKey: string): StagedBatch | undefined {
  const batchId = STAGE_KEY_INDEX.get(idempotencyKey);
  return batchId ? STORE.get(batchId) : undefined;
}

export function getStagedByBatchId(batchId: string): StagedBatch | undefined {
  return STORE.get(batchId);
}

export function putStaged(batch: StagedBatch): void {
  STORE.set(batch.batchId, batch);
  STAGE_KEY_INDEX.set(batch.idempotencyKey, batch.batchId);
}

export function recordConfirmation(batchId: string, confirmationId: string): void {
  const b = STORE.get(batchId);
  if (b) STORE.set(batchId, { ...b, confirmationId });
}

export function __clearStagedBatchStoreForTests(): void {
  STORE.clear();
  STAGE_KEY_INDEX.clear();
}
