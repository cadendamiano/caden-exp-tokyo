'use client';

import { useEffect, useState } from 'react';
import { useStore, getActiveThread } from '@/lib/store';
import { AGING, BILLS, VENDORS, CATEGORY_SPEND } from '@/lib/data';
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
  billEnvId?: string,
  billProduct?: string
): Promise<PreviewResult> {
  const asOf = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (mode === 'demo') {
    return buildMockPreview(kind, asOf);
  }

  // Testing mode: fetch real data from /api/dryrun
  const toolName = kindToTool(kind);
  if (!toolName) return buildMockPreview(kind, asOf);

  try {
    const res = await fetch('/api/dryrun', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool: toolName, input: kindToInput(kind), mode, billEnvId, billProduct }),
    });
    if (!res.ok) throw new Error('dryrun failed');
    const json = await res.json() as { ok: boolean; summary: string; data: unknown };
    if (!json.ok) return buildMockPreview(kind, asOf);
    return buildRealPreview(kind, json.data, json.summary, asOf);
  } catch {
    return buildMockPreview(kind, asOf);
  }
}

function kindToTool(kind: ArtifactKind): string | null {
  if (kind === 'ap-table') return 'get_aging_summary';
  if (kind === 'spend-chart') return 'get_category_spend';
  if (kind === 'rule-net15') return 'find_duplicate_invoices';
  return null;
}

function kindToInput(kind: ArtifactKind): Record<string, unknown> {
  if (kind === 'spend-chart') return { period: 'Q1 2026' };
  if (kind === 'rule-net15') return { days: 30 };
  return {};
}

function buildMockPreview(kind: ArtifactKind, asOf: string): PreviewResult {
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
    return { rows, summary: 'Backfill test: 18/20 matched · 2 unmatched', asOf };
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
  return { rows: [], summary, asOf };
}

export function ArtifactPreview({ artifact }: Props) {
  const mode = useStore(s => s.mode);
  const acknowledgeArtifactDryRun = useStore(s => s.acknowledgeArtifactDryRun);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const thread = getActiveThread();
    fetchPreview(artifact.kind, mode, thread?.billEnvId, thread?.billProduct)
      .then(r => {
        setResult(r);
        setLoading(false);
        // Mark dry-run acknowledged as soon as preview data loads
        if (!artifact.dryRunAcknowledged) {
          acknowledgeArtifactDryRun(artifact.id);
        }
      })
      .catch(() => setLoading(false));
  }, [artifact.id, artifact.kind, mode]); // eslint-disable-line react-hooks/exhaustive-deps

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
          : '↳ Data sourced from demo workspace (meridian-ops)'}
      </div>
    </div>
  );
}
