'use client';

import { fmtMoney } from '@/lib/format';
import type { FlowStep } from '@/lib/flows';

type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];

type Props = {
  payload: ApprovalPayload;
  state?: 'approved' | 'rejected' | null;
  onApprove: (batchId: string) => void;
  onReject: (batchId: string) => void;
};

export function ApprovalCard({ payload, state, onApprove, onReject }: Props) {
  const approved = state === 'approved';
  const rejected = state === 'rejected';
  return (
    <div className="approval">
      <div className="approval-head">
        {!approved && !rejected && (
          <>
            <span className="pulse" />Awaiting approval · payment batch
          </>
        )}
        {approved && (
          <>
            <span style={{ color: 'var(--pos)' }}>✓</span>Approved · {payload.batchId}
          </>
        )}
        {rejected && (
          <>
            <span style={{ color: 'var(--neg)' }}>×</span>Cancelled · {payload.batchId}
          </>
        )}
      </div>
      <div className="approval-body">
        <div className="approval-field">
          <div className="lbl">From</div>
          <div className="val">{payload.from}</div>
        </div>
        <div className="approval-field">
          <div className="lbl">Method</div>
          <div className="val">{payload.method}</div>
        </div>
        <div className="approval-field">
          <div className="lbl">Scheduled</div>
          <div className="val">{payload.scheduledFor}</div>
        </div>
        <div className="approval-field">
          <div className="lbl">Total</div>
          <div className="val amount">{fmtMoney(payload.total)}</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 10px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}
        >
          {payload.items.length} line items
        </div>
        {payload.items.map((it, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : '1px dashed var(--line-2)',
              fontSize: 12.5,
            }}
          >
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{it.vendor}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>{it.invoice}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>
              {fmtMoney(it.amount)}
            </span>
          </div>
        ))}
      </div>
      {!approved && !rejected && (
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => onApprove(payload.batchId)}>
            Approve &amp; submit <span className="kbd">⌘↵</span>
          </button>
          <button className="btn btn-ghost" onClick={() => onReject(payload.batchId)}>
            Cancel batch
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
            audit log: req_{payload.batchId}
          </span>
        </div>
      )}
    </div>
  );
}
