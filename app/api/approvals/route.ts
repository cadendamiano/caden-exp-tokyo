import { NextRequest } from 'next/server';
import { z } from 'zod';
import { mintApprovalToken } from '@/lib/approvals/token';
import { evaluatePolicy } from '@/lib/policy/approvalPolicy';
import { BatchId } from '@/lib/domain/payment';
import { getStagedByBatchId } from '@/lib/payment/stagedBatchStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MintRequest = z.object({
  batchId: BatchId,
  approverId: z.string().min(1).describe('Placeholder identity until real auth lands.'),
  secondApproverId: z.string().min(1).optional(),
});

/**
 * POST /api/approvals
 *
 * Mints a server-signed ApprovalToken after the human clicks Approve in the
 * UI. The batch must have been staged first (its metadata lives in the
 * stagedBatchStore). Without a valid token, submit_payment_batch refuses.
 *
 * The LLM never sees, holds, or forges a token.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = MintRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: 'schema',
        issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const staged = getStagedByBatchId(data.batchId);
  if (!staged) {
    return Response.json(
      { ok: false, error: 'unknown_batch', message: `no staged batch ${data.batchId}` },
      { status: 404 },
    );
  }
  // Re-evaluate policy at mint time to catch tampering between stage and mint.
  const evalResult = evaluatePolicy({ total: staged.total });
  if (evalResult.policy === 'requires-dual-control' && !data.secondApproverId) {
    return Response.json(
      {
        ok: false,
        error: 'dual_control_required',
        policy: evalResult.policy,
        reasons: evalResult.reasons,
      },
      { status: 409 },
    );
  }
  try {
    const token = await mintApprovalToken({
      batchId: data.batchId,
      idempotencyKey: staged.idempotencyKey,
      approverId: data.approverId,
      secondApproverId: data.secondApproverId,
      policyAtIssue: evalResult.policy,
    });
    return Response.json({
      ok: true,
      token,
      policy: evalResult.policy,
      reasons: evalResult.reasons,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: 'mint_failed', message: e?.message ?? 'unknown' },
      { status: 500 },
    );
  }
}
