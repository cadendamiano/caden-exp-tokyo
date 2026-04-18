'use client';

import { useState } from 'react';
import { fmtMoney } from '@/lib/format';
import type { FlowStep } from '@/lib/flows';

type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];
type Stake = ApprovalPayload['stake'];

type Props = {
  payload: ApprovalPayload;
  state?: 'approved' | 'rejected' | null;
  onApprove: (batchId: string) => void;
  onReject: (batchId: string) => void;
};

function LineItems({ items }: { items: ApprovalPayload['items'] }) {
  return (
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
        {items.length} line items
      </div>
      {items.map((it, i) => (
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
  );
}

function headLabel(stake: Stake | undefined, approved: boolean, rejected: boolean, batchId: string) {
  if (approved) return <><span style={{ color: 'var(--pos)' }}>✓</span>Approved · {batchId}</>;
  if (rejected) return <><span style={{ color: 'var(--neg)' }}>×</span>Cancelled · {batchId}</>;
  if (stake === 'large-payment') {
    return <><span className="pulse" style={{ background: 'var(--warn)' }} />Awaiting approval · second approver required</>;
  }
  return <><span className="pulse" />Awaiting approval · payment batch</>;
}

export function ApprovalCard({ payload, state, onApprove, onReject }: Props) {
  const approved = state === 'approved';
  const rejected = state === 'rejected';
  const stake: Stake = (payload as any).stake ?? 'payment';

  // Typed confirmation state for payment / large-payment stakes
  const confirmCode = `APPROVE ${payload.batchId.slice(-4).toUpperCase()}`;
  const [confirmInput, setConfirmInput] = useState('');
  const confirmMatches = confirmInput.trim() === confirmCode;

  // Second-approver request state
  const [requestSent, setRequestSent] = useState(false);

  return (
    <div className="approval">
      <div className="approval-head">
        {headLabel(stake, approved, rejected, payload.batchId)}
        {stake === 'large-payment' && !approved && !rejected && (
          <span className="approval-second-badge">⚠ Requires second approver</span>
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

      <LineItems items={payload.items} />

      {!approved && !rejected && (
        <>
          {/* Typed confirmation for payment + large-payment */}
          <div className="approval-confirm-row">
            <label className="approval-confirm-label">
              Type <code className="approval-confirm-code">{confirmCode}</code> to continue
            </label>
            <input
              className="approval-confirm-input"
              placeholder={confirmCode}
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {stake === 'payment' && (
            <div className="approval-actions">
              <button
                className="btn btn-primary"
                disabled={!confirmMatches}
                onClick={() => { if (confirmMatches) onApprove(payload.batchId); }}
              >
                Approve &amp; submit <span className="kbd">⌘↵</span>
              </button>
              <button className="btn btn-ghost" onClick={() => onReject(payload.batchId)}>
                Cancel batch
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                Funds leave within 24h · audit: req_{payload.batchId}
              </span>
            </div>
          )}

          {stake === 'large-payment' && (
            <div className="approval-actions">
              {requestSent ? (
                <div className="approval-request-sent">
                  ✓ Approval request sent to Maria Chen (Controller) · awaiting sign-off
                </div>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    disabled={!confirmMatches}
                    onClick={() => { if (confirmMatches) setRequestSent(true); }}
                  >
                    Request approval from Controller
                  </button>
                  <button className="btn btn-ghost" onClick={() => onReject(payload.batchId)}>
                    Cancel batch
                  </button>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                    audit: req_{payload.batchId}
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
