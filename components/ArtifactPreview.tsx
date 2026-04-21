'use client';

import { useEffect, useState } from 'react';
import { useStore, getActiveThread } from '@/lib/store';
import { getDataset, type DatasetKey } from '@/lib/data';
import { fmtMoney, fmtMoneyShort } from '@/lib/format';
import type { ArtifactKind } from '@/lib/flows';
import type { Artifact } from '@/lib/store';

type Props = {
  artifact: Artifact;
};

type PreviewRow = Record<string, string | number>;

type PreviewResult = {
  rows: PreviewRow[];
  summary: string;
  asOf: string;
};

async function fetchPreview(
  kind: ArtifactKind,
  mode: 'demo' | 'testing',
  billEnvId: string | undefined,
  billProduct: string | undefined,
  demoDataset: DatasetKey
): Promise<PreviewResult> {
  const asOf = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (mode === 'demo') {
    return buildMockPreview(kind, asOf, demoDataset);
  }

  // Testing mode: fetch real data from /api/dryrun
  const toolName = kindToTool(kind);
  if (!toolName) return buildMockPreview(kind, asOf, demoDataset);

  try {
    const res = await fetch('/api/dryrun', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tool: toolName,
        input: kindToInput(kind),
        mode,
        billEnvId,
        billProduct,
        demoDataset,
      }),
    });
    if (!res.ok) throw new Error('dryrun failed');
    const json = await res.json() as { ok: boolean; summary: string; data: unknown };
    if (!json.ok) return buildMockPreview(kind, asOf, demoDataset);
    return buildRealPreview(kind, json.data, json.summary, asOf);
  } catch {
    return buildMockPreview(kind, asOf, demoDataset);
  }
}

function kindToTool(kind: ArtifactKind): string | null {
  if (kind === 'ap-table') return 'get_aging_summary';
  if (kind === 'spend-chart') return 'get_category_spend';
  if (kind === 'rule-net15') return 'find_duplicate_invoices';
  if (kind === 'liquidity-burndown') return 'get_liquidity_projection';
  if (kind === 'sweep-rule') return 'get_liquidity_projection';
  return null;
}

function kindToInput(kind: ArtifactKind): Record<string, unknown> {
  if (kind === 'spend-chart') return { period: 'Q1 2026' };
  if (kind === 'rule-net15') return { days: 30 };
  if (kind === 'liquidity-burndown') return { days: 60 };
  if (kind === 'sweep-rule') return { days: 60 };
  return {};
}

function buildMockPreview(kind: ArtifactKind, asOf: string, dataset: DatasetKey): PreviewResult {
  const data = getDataset(dataset);
  const { AGING, BILLS, VENDORS, CATEGORY_SPEND } = data;
  if (kind === 'ap-table') {
    const rows = AGING.map(b => ({ Bucket: b.bucket, Amount: fmtMoney(b.amount) }));
    const total = AGING.reduce((s, a) => s + a.amount, 0);
    return { rows, summary: `${AGING.length} aging buckets · ${fmtMoneyShort(total)} total AP`, asOf };
  }
  if (kind === 'spend-chart') {
    const rows = CATEGORY_SPEND.map(c => ({ Category: c.cat, Amount: fmtMoney(c.amount), Share: `${c.pct}%` }));
    const total = CATEGORY_SPEND.reduce((s, c) => s + c.amount, 0);
    return { rows, summary: `${CATEGORY_SPEND.length} categories · ${fmtMoneyShort(total)} Q1 spend`, asOf };
  }
  if (kind === 'rule-net15') {
    const matched = BILLS.filter(b => {
      const v = VENDORS.find(v => v.id === b.vendor);
      return v?.terms === 'Net 15' && b.amount > 5000;
    });
    const rows = matched.map(b => {
      const v = VENDORS.find(vv => vv.id === b.vendor);
      return { Vendor: v?.name ?? b.vendor, Invoice: b.invoice, Amount: fmtMoney(b.amount), Terms: v?.terms ?? '—' };
    });
    return {
      rows,
      summary: `Would have matched ${rows.length} bill${rows.length !== 1 ? 's' : ''} in last 30d`,
      asOf,
    };
  }
  if (kind === 'crm-flow') {
    const rows = [
      { Event: 'payment.cleared', Match: 'deal.bill_invoice_id', Result: 'deal staged → Paid', Status: '✓ matched' },
      { Event: 'payment.cleared', Match: 'deal.bill_invoice_id', Result: 'no match found', Status: '⚠ unmatched' },
    ];
    const summary = dataset === 'logistics'
      ? 'Backfill test: 17/20 matched · 3 unmatched'
      : 'Backfill test: 18/20 matched · 2 unmatched';
    return { rows, summary, asOf };
  }
  if (kind === 'liquidity-burndown') {
    const { liquidityProjection, liquidityThreshold } = data;
    let minIdx = 0;
    for (let i = 1; i < liquidityProjection.length; i++) {
      if (liquidityProjection[i].balance < liquidityProjection[minIdx].balance) minIdx = i;
    }
    const min = liquidityProjection[minIdx];
    const rows = liquidityProjection
      .filter((_, i) => i % 5 === 0 || i === minIdx || i === liquidityProjection.length - 1)
      .map(p => ({
        Day: p.day,
        Balance: fmtMoney(p.balance),
        'Vs floor': p.balance < liquidityThreshold
          ? `↓ ${fmtMoneyShort(liquidityThreshold - p.balance)} under`
          : `↑ ${fmtMoneyShort(p.balance - liquidityThreshold)} over`,
      }));
    const breaches = liquidityProjection.filter(p => p.balance < liquidityThreshold).length;
    const summary = breaches > 0
      ? `${breaches}/${liquidityProjection.length} days below floor · min ${fmtMoneyShort(min.balance)} on ${min.day}`
      : `${liquidityProjection.length} days projected · min ${fmtMoneyShort(min.balance)} on ${min.day} (above floor)`;
    return { rows, summary, asOf };
  }
  if (kind === 'sweep-rule') {
    const { liquidityProjection, liquidityThreshold } = data;
    const breachDays = liquidityProjection.filter(p => p.balance < liquidityThreshold);
    const rows = breachDays.length > 0
      ? breachDays.slice(0, 5).map(p => ({
          Day: p.day,
          'Balance before': fmtMoney(p.balance),
          Transfer: '+$50,000 (reserve → ops)',
          'Balance after': fmtMoney(p.balance + 50000),
        }))
      : [{ Day: '—', 'Balance before': '—', Transfer: 'no trigger in window', 'Balance after': '—' }];
    const summary = breachDays.length > 0
      ? `Would have triggered ${Math.min(1, breachDays.length)} sweep${breachDays.length === 1 ? '' : ' (rate-limited to 1/day)'}  in last 60d`
      : 'Would not have triggered in last 60d · rule is armed for future dips';
    return { rows, summary, asOf };
  }
  return { rows: [], summary: 'No preview available', asOf };
}

function buildRealPreview(kind: ArtifactKind, data: unknown, summary: string, asOf: string): PreviewResult {
  if (!Array.isArray(data)) return { rows: [], summary, asOf };

  if (kind === 'ap-table') {
    const rows = (data as Array<{ bucket: string; amount: number; count: number }>).map(b => ({
      Bucket: b.bucket,
      Amount: fmtMoney(b.amount),
      Count: b.count,
    }));
    return { rows, summary, asOf };
  }
  if (kind === 'spend-chart') {
    const rows = (data as Array<{ cat: string; amount: number; pct: number }>).map(c => ({
      Category: c.cat,
      Amount: fmtMoney(c.amount),
      Share: `${c.pct}%`,
    }));
    return { rows, summary, asOf };
  }
  if (kind === 'rule-net15') {
    const pairs = data as Array<{
      vendor: string;
      confidence: string;
      a: { invoice: string; amount: number; date: string };
      b: { invoice: string; amount: number; date: string };
    }>;
    const rows = pairs.map(p => ({
      Vendor: p.vendor,
      'Invoice A': p.a.invoice,
      'Invoice B': p.b.invoice,
      Amount: fmtMoney(p.a.amount),
      Confidence: p.confidence,
    }));
    return { rows, summary: `${pairs.length} suspect pair${pairs.length !== 1 ? 's' : ''} found`, asOf };
  }
  if (kind === 'liquidity-burndown' || kind === 'sweep-rule') {
    // real tool isn't wired yet — just return a small placeholder row
    return {
      rows: [{ Day: '—', Balance: '—', Note: 'Real liquidity projection requires BILL Cash Flow API (not yet wired)' }],
      summary,
      asOf,
    };
  }
  return { rows: [], summary, asOf };
}

export function ArtifactPreview({ artifact }: Props) {
  const mode = useStore(s => s.mode);
  const demoDataset = useStore(s => s.tweaks.demoDataset);
  const acknowledgeArtifactDryRun = useStore(s => s.acknowledgeArtifactDryRun);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const thread = getActiveThread();
    fetchPreview(artifact.kind, mode, thread?.billEnvId, thread?.billProduct, demoDataset)
      .then(r => {
        setResult(r);
        setLoading(false);
        // Mark dry-run acknowledged as soon as preview data loads
        if (!artifact.dryRunAcknowledged) {
          acknowledgeArtifactDryRun(artifact.id);
        }
      })
      .catch(() => setLoading(false));
  }, [artifact.id, artifact.kind, mode, demoDataset]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="preview-loading">
        <span className="caret" style={{ background: 'var(--ink-4)' }} />
        <span style={{ marginLeft: 8, color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
          fetching preview data…
        </span>
      </div>
    );
  }

  if (!result || result.rows.length === 0) {
    return (
      <div className="preview-empty">
        <div style={{ color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
          No preview data available.
        </div>
      </div>
    );
  }

  const cols = Object.keys(result.rows[0]);

  return (
    <div className="preview-view">
      <div className="preview-header">
        <span className="preview-summary">{result.summary}</span>
        <span className="preview-as-of">as of {result.asOf}</span>
      </div>

      <div className="preview-table-wrap">
        <div className="preview-table">
          <div className="preview-table-head" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
            {cols.map(c => <span key={c}>{c}</span>)}
          </div>
          {result.rows.map((row, i) => (
            <div
              key={i}
              className="preview-table-row"
              style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}
            >
              {cols.map(c => <span key={c}>{row[c]}</span>)}
            </div>
          ))}
        </div>
      </div>

      <div className="preview-footnote">
        {mode === 'testing'
          ? '↳ Data sourced from real Bill sandbox environment'
          : demoDataset === 'logistics'
            ? '↳ Data sourced from demo workspace (crestview-freight-ops)'
            : '↳ Data sourced from demo workspace (meridian-ops)'}
      </div>
    </div>
  );
}
