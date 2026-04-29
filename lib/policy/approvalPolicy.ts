import type { Money } from '@/lib/domain/money';
import { toMajor } from '@/lib/domain/money';

/**
 * Approval policy classification for a payment batch.
 *
 * - 'auto-approvable': below the auto threshold AND no risk flags
 *                      (still rendered as an approval card today; reserved
 *                      for future low-risk autopay use)
 * - 'single-approver': default for amounts under the dual-control threshold
 * - 'requires-dual-control': amount >= dualControlThreshold OR any risk flag
 */
export type ApprovalPolicyResult =
  | 'auto-approvable'
  | 'single-approver'
  | 'requires-dual-control';

export type PolicyInput = {
  total: Money;
  hasDuplicateInvoice?: boolean;
  vendorRiskFlags?: string[];
  /** Hour-of-day in PT, 0-23. ACH cutoff is 14:00 PT. */
  hourOfDayPT?: number;
};

export type PolicyConfig = {
  /** Anything at or above this requires a second approver. Default: $25,000. */
  dualControlThreshold: Money;
  /** Below this amount and with no risk flags, classified as auto-approvable. Default: $1,000. */
  autoApproveThreshold: Money;
  /** Treat after-cutoff as risk-bearing. Default: true. */
  enforceCutoff: boolean;
};

export const DEFAULT_POLICY: PolicyConfig = {
  dualControlThreshold: { currency: 'USD', minorUnits: 25_000_00 },
  autoApproveThreshold: { currency: 'USD', minorUnits: 1_000_00 },
  enforceCutoff: true,
};

export type PolicyEvaluation = {
  policy: ApprovalPolicyResult;
  reasons: string[];
};

/**
 * Classify a payment batch against policy. Pure function, side-effect free.
 *
 * Currency mismatches are rejected by upgrading to dual-control with a reason —
 * we never silently compare across currencies.
 */
export function evaluatePolicy(
  input: PolicyInput,
  config: PolicyConfig = DEFAULT_POLICY,
): PolicyEvaluation {
  const reasons: string[] = [];
  let policy: ApprovalPolicyResult = 'single-approver';

  if (input.total.currency !== config.dualControlThreshold.currency) {
    reasons.push(`currency ${input.total.currency} not directly comparable to threshold; routing to dual control`);
    return { policy: 'requires-dual-control', reasons };
  }

  if (input.total.minorUnits >= config.dualControlThreshold.minorUnits) {
    reasons.push(`amount ${formatUSD(input.total)} ≥ dual-control threshold ${formatUSD(config.dualControlThreshold)}`);
    policy = 'requires-dual-control';
  }

  if (input.hasDuplicateInvoice) {
    reasons.push('duplicate-invoice signal detected');
    policy = 'requires-dual-control';
  }

  const flags = input.vendorRiskFlags ?? [];
  if (flags.length > 0) {
    reasons.push(`vendor risk flags: ${flags.join(', ')}`);
    policy = 'requires-dual-control';
  }

  if (config.enforceCutoff && typeof input.hourOfDayPT === 'number' && input.hourOfDayPT >= 14) {
    reasons.push(`after ACH cutoff (${input.hourOfDayPT}:00 PT ≥ 14:00 PT)`);
    if (policy === 'single-approver') policy = 'requires-dual-control';
  }

  if (policy === 'single-approver' && input.total.minorUnits < config.autoApproveThreshold.minorUnits) {
    policy = 'auto-approvable';
    reasons.push(`amount below auto-approve threshold ${formatUSD(config.autoApproveThreshold)}`);
  }

  if (reasons.length === 0) reasons.push('default single-approver path');
  return { policy, reasons };
}

function formatUSD(m: Money): string {
  return `$${toMajor(m).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
