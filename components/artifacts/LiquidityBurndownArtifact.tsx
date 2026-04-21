'use client';

import { useStore } from '@/lib/store';
import { getDataset } from '@/lib/data';
import { fmtMoneyShort, fmtDate } from '@/lib/format';
import { LineChart } from '../primitives/LineChart';
import type { Artifact } from '@/lib/store';

type Props = { artifact: Artifact };

export function LiquidityBurndownArtifact({ artifact }: Props) {
  const demoDataset = useStore(s => s.tweaks.demoDataset);
  const { liquidityProjection, liquidityDrivers, liquidityThreshold, bankAccounts } =
    getDataset(demoDataset);

  const showDrivers = artifact.filter === 'projection+drivers';

  let minIdx = 0;
  for (let i = 1; i < liquidityProjection.length; i++) {
    if (liquidityProjection[i].balance < liquidityProjection[minIdx].balance) minIdx = i;
  }
  const minPoint = liquidityProjection[minIdx];
  const startBalance = liquidityProjection[0].balance;
  const crossesFloor = minPoint.balance < liquidityThreshold;
  const gap = liquidityThreshold - minPoint.balance;

  const opsAccount = bankAccounts.find(a => a.role === 'operating');

  return (
    <div>
      <div className="artifact-title">
        <h2>Cash runway · 60 days</h2>
      </div>
      <div className="artifact-subtitle">
        <span>{opsAccount?.nickname ?? 'Operating account'}</span>
        <span className="sep">·</span>
        <span>floor {fmtMoneyShort(liquidityThreshold)}</span>
        <span className="sep">·</span>
        <span>start {fmtMoneyShort(startBalance)}</span>
        <span className="sep">·</span>
        <span style={{ color: crossesFloor ? 'var(--neg)' : 'var(--pos)' }}>
          {crossesFloor
            ? `min ${fmtMoneyShort(minPoint.balance)} on ${fmtDate(minPoint.day)} · below floor by ${fmtMoneyShort(gap)}`
            : `min ${fmtMoneyShort(minPoint.balance)} on ${fmtDate(minPoint.day)} · stays above floor`}
        </span>
      </div>

      <LineChart
        data={liquidityProjection}
        threshold={liquidityThreshold}
        title="Projected operating balance"
        accent="var(--teal)"
      />

      {showDrivers && (
        <div className="drivers-block">
          <div className="drivers-head">
            <h3>What&rsquo;s driving the dip</h3>
            <span className="drivers-hint">
              5 largest movements in the 60-day window · red = outflow, green = inflow
            </span>
          </div>
          <div className="drivers-grid">
            {liquidityDrivers.map((d, i) => (
              <div key={i} className="drivers-row">
                <span className="drivers-date">{fmtDate(d.date)}</span>
                <span className="drivers-label">{d.label}</span>
                <span
                  className="drivers-amt"
                  style={{ color: d.kind === 'outflow' ? 'var(--neg)' : 'var(--pos)' }}
                >
                  {d.kind === 'outflow' ? '−' : '+'}
                  {fmtMoneyShort(Math.abs(d.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
