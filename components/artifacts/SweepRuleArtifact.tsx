'use client';

import { useStore } from '@/lib/store';
import { getDataset } from '@/lib/data';
import { fmtMoneyShort } from '@/lib/format';
import type { Artifact } from '@/lib/store';

type Props = { artifact: Artifact };

export function SweepRuleArtifact({ artifact }: Props) {
  const demoDataset = useStore(s => s.tweaks.demoDataset);
  const activateArtifact = useStore(s => s.activateArtifact);
  const { bankAccounts, liquidityThreshold } = getDataset(demoDataset);

  const ops = bankAccounts.find(a => a.role === 'operating');
  const reserve = bankAccounts.find(a => a.role === 'reserve');
  const transferAmount = 50000;
  const minReserve = 250000;

  const isActive = artifact.status === 'active';
  const canActivate = Boolean(artifact.dryRunAcknowledged);
  const statusLabel = artifact.status ?? 'draft';

  return (
    <div>
      <div className="artifact-title">
        <h2>Sweep rule</h2>
      </div>
      <div className="artifact-subtitle">
        <span>{statusLabel}</span>
        <span className="sep">·</span>
        <span>trigger: balance.threshold</span>
        <span className="sep">·</span>
        <span>scope: {ops?.nickname ?? 'Operating'}</span>
      </div>

      <div className="rule-desc" style={{ marginBottom: 14 }}>
        Auto-fund the operating account when the daily balance drops below{' '}
        <strong style={{ color: 'var(--ink)' }}>{fmtMoneyShort(liquidityThreshold)}</strong>.
        Pulls from the reserve account in fixed tranches so the coworker never needs to ask.
      </div>

      <div className="rule-card">
        <div className="rule-name">
          <h3>Low-balance auto-sweep → Operating</h3>
          <span className={'status-pill' + (isActive ? ' ok' : '')}>
            <span className="dot" />{statusLabel}
          </span>
        </div>
        <div className="rule-desc">
          Catches the late-May dip before it crosses the floor — no manual transfer needed.
        </div>

        <div className="rule-block">
          <div className="rule-block-label">When</div>
          <div>
            <div className="rule-condition">
              <span className="rule-token k">account.role</span>
              <span className="rule-token op">==</span>
              <span className="rule-token v">&quot;operating&quot;</span>
            </div>
            <div className="rule-condition">
              <span className="rule-token k">account.balance</span>
              <span className="rule-token op">&lt;</span>
              <span className="rule-token v">{fmtMoneyShort(liquidityThreshold)}</span>
            </div>
            <div className="rule-condition">
              <span className="rule-token k">check.frequency</span>
              <span className="rule-token op">=</span>
              <span className="rule-token v">daily @ 07:00 PT</span>
            </div>
          </div>
        </div>

        <div className="rule-block">
          <div className="rule-block-label">Then</div>
          <div>
            <div className="rule-action">
              <span className="rule-token k">BILL · Transfer.create</span>
              <span className="rule-token op">from</span>
              <span className="rule-token v">{reserve?.nickname ?? 'Reserve'} ··{reserve?.last4}</span>
            </div>
            <div className="rule-action">
              <span className="rule-token k">BILL · Transfer.create</span>
              <span className="rule-token op">to</span>
              <span className="rule-token v">{ops?.nickname ?? 'Operating'} ··{ops?.last4}</span>
            </div>
            <div className="rule-action">
              <span className="rule-token k">amount</span>
              <span className="rule-token op">=</span>
              <span className="rule-token v">{fmtMoneyShort(transferAmount)} per trigger</span>
            </div>
            <div className="rule-action">
              <span className="rule-token k">Slack · message</span>
              <span className="rule-token op">→</span>
              <span className="rule-token v">#finance</span>
              <span className="rule-token op">with</span>
              <span className="rule-token v">&quot;Swept {fmtMoneyShort(transferAmount)} → Ops · balance now {'{{'}newBalance{'}}'}&quot;</span>
            </div>
          </div>
        </div>

        <div className="rule-block">
          <div className="rule-block-label">Safety</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            · Rate-limit: max <strong style={{ color: 'var(--ink)' }}>1 sweep per day</strong><br />
            · Minimum reserve: pause if reserve &lt; {fmtMoneyShort(minReserve)}<br />
            · Dry-run window: last 60d projection would have triggered <strong style={{ color: 'var(--ink)' }}>1 sweep</strong> (May 24)<br />
            · Pause rule on any transfer error
          </div>
        </div>

        <div className="rule-actions">
          {isActive ? (
            <span className="status-pill active" style={{ fontSize: 12 }}>
              <span className="dot" style={{ background: 'var(--pos)' }} />Rule active
            </span>
          ) : (
            <>
              <div
                title={canActivate ? undefined : 'View Preview first to activate'}
                style={{ display: 'inline-block' }}
              >
                <button
                  className="btn btn-primary"
                  disabled={!canActivate}
                  style={!canActivate ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  onClick={() => canActivate && activateArtifact(artifact.id)}
                >
                  Activate sweep
                </button>
              </div>
              {!canActivate && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginLeft: 8 }}>
                  View Preview first
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
