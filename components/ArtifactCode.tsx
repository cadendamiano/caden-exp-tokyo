'use client';

import type { ArtifactKind } from '@/lib/flows';
import type { Artifact } from '@/lib/store';

type Props = {
  artifact: Artifact;
};

type CodeLine = { text: string; kind?: 'comment' | 'keyword' | 'string' | 'plain' };

function renderLines(lines: CodeLine[]) {
  return lines.map((line, i) => {
    const kind = line.kind;
    let color = 'var(--ink-3)';
    if (kind === 'comment') color = 'var(--ink-4)';
    else if (kind === 'keyword') color = 'oklch(0.78 0.10 195)';
    else if (kind === 'string') color = 'oklch(0.78 0.10 95)';
    return (
      <div key={i} className="code-line">
        <span className="code-ln">{i + 1}</span>
        <span className="code-ln-text" style={{ color }}>{line.text || '\u00A0'}</span>
      </div>
    );
  });
}

function codeForArtifact(artifact: Artifact): CodeLine[] {
  if (artifact.kind === 'html') {
    const sections: CodeLine[] = [
      { text: '# BILL Coworker · Custom HTML artifact', kind: 'comment' },
      { text: `# Title: ${artifact.title ?? artifact.label ?? 'Untitled'}`, kind: 'comment' },
      { text: '' },
    ];
    if (artifact.html) {
      sections.push({ text: '# --- html ---', kind: 'comment' });
      for (const line of (artifact.html ?? '').split('\n')) sections.push({ text: line, kind: 'plain' });
      sections.push({ text: '' });
    }
    if (artifact.css) {
      sections.push({ text: '# --- css ---', kind: 'comment' });
      for (const line of (artifact.css ?? '').split('\n')) sections.push({ text: line, kind: 'plain' });
      sections.push({ text: '' });
    }
    if (artifact.script) {
      sections.push({ text: '# --- script (runs in sandboxed iframe; ECharts/D3/Chart.js global) ---', kind: 'comment' });
      for (const line of (artifact.script ?? '').split('\n')) sections.push({ text: line, kind: 'plain' });
    }
    if (artifact.dataJson) {
      sections.push({ text: '' });
      sections.push({ text: '# --- window.__DATA ---', kind: 'comment' });
      for (const line of (artifact.dataJson ?? '').split('\n')) sections.push({ text: line, kind: 'string' });
    }
    return sections;
  }
  return codeForKind(artifact.kind);
}

function codeForKind(kind: ArtifactKind): CodeLine[] {
  if (kind === 'rule-net15') {
    return [
      { text: '# BILL Coworker · Automation rule v1', kind: 'comment' },
      { text: '# Trigger: bill.created', kind: 'comment' },
      { text: '# Conditions: paymentTerms == "Net 15" AND amount > $5,000', kind: 'comment' },
      { text: '' },
      { text: 'on("bill.created", async (evt) => {', kind: 'plain' },
      { text: '  const bill = evt.bill;', kind: 'plain' },
      { text: '' },
      { text: '  # --- conditions ---', kind: 'comment' },
      { text: '  if (bill.paymentTerms !== "Net 15") return;', kind: 'plain' },
      { text: '  if (bill.amount <= 5000) return;', kind: 'plain' },
      { text: '' },
      { text: '  # --- actions ---', kind: 'comment' },
      { text: '  await bill.setCustomField({', kind: 'plain' },
      { text: '    field: "reviewFlag",', kind: 'plain' },
      { text: '    value: "urgent_net15",', kind: 'string' },
      { text: '  });', kind: 'plain' },
      { text: '' },
      { text: '  await slack.postMessage({', kind: 'plain' },
      { text: '    channel: "#ap",', kind: 'string' },
      { text: '    text: `🔔 ${bill.vendor.name} – $${bill.amount} · Net 15 · due ${bill.dueDate}`,', kind: 'string' },
      { text: '  });', kind: 'plain' },
      { text: '' },
      { text: '  await bill.addApprover({ userId: "riya.shah@company.com" });', kind: 'plain' },
      { text: '});', kind: 'plain' },
      { text: '' },
      { text: '# Safety: max 25 triggers/day · pause on >5 errors/h', kind: 'comment' },
    ];
  }

  if (kind === 'ap-table') {
    return [
      { text: '# BILL Coworker · AP table query', kind: 'comment' },
      { text: '' },
      { text: 'const bills = await apList(env, "Bill", [', kind: 'plain' },
      { text: '  { field: "paymentStatus", op: "=", value: "1" },  # open', kind: 'comment' },
      { text: '], max = 500);', kind: 'plain' },
      { text: '' },
      { text: 'const vendors = await apList(env, "Vendor", [], 500);', kind: 'plain' },
      { text: '' },
      { text: 'return bills.map(b => ({', kind: 'plain' },
      { text: '  id:      b.id,', kind: 'plain' },
      { text: '  vendor:  vendors.find(v => v.id === b.vendorId)?.name,', kind: 'plain' },
      { text: '  invoice: b.invoiceNumber,', kind: 'plain' },
      { text: '  amount:  b.amount,', kind: 'plain' },
      { text: '  due:     b.dueDate,', kind: 'plain' },
      { text: '  status:  paymentStatusLabel(b.paymentStatus),', kind: 'plain' },
      { text: '}));', kind: 'plain' },
    ];
  }

  if (kind === 'spend-chart') {
    return [
      { text: '# BILL Coworker · Category spend query', kind: 'comment' },
      { text: '# Period: Q1 2026 (2026-01-01 → 2026-03-31)', kind: 'comment' },
      { text: '' },
      { text: 'const bills = await apList(env, "Bill", [', kind: 'plain' },
      { text: '  { field: "paymentStatus", op: "=", value: "0" },  # paid', kind: 'comment' },
      { text: '], max = 500);', kind: 'plain' },
      { text: '' },
      { text: 'const vendors = await apList(env, "Vendor", [], 500);', kind: 'plain' },
      { text: '' },
      { text: 'const totals = {};', kind: 'plain' },
      { text: 'for (const b of bills) {', kind: 'plain' },
      { text: '  const paidDate = new Date(b.paidDate);', kind: 'plain' },
      { text: '  if (paidDate < start || paidDate > end) continue;', kind: 'plain' },
      { text: '  const cat = vendors.find(v => v.id === b.vendorId)?.category ?? "Other";', kind: 'plain' },
      { text: '  totals[cat] = (totals[cat] ?? 0) + b.amount;', kind: 'plain' },
      { text: '}', kind: 'plain' },
      { text: '' },
      { text: 'return Object.entries(totals).map(([cat, amount]) => ({', kind: 'plain' },
      { text: '  cat, amount, pct: Math.round(amount / grand * 100),', kind: 'plain' },
      { text: '}));', kind: 'plain' },
    ];
  }

  if (kind === 'crm-flow') {
    return [
      { text: '# BILL Coworker · Payment → HubSpot transform', kind: 'comment' },
      { text: '# Trigger: bill.payment.cleared', kind: 'comment' },
      { text: '# Match key: deal.properties.bill_invoice_id', kind: 'comment' },
      { text: '' },
      { text: 'on("bill.payment.cleared", async (evt) => {', kind: 'plain' },
      { text: '  const deal = await hubspot.deals.findByProperty(', kind: 'plain' },
      { text: '    "bill_invoice_id",', kind: 'string' },
      { text: '    evt.bill.invoiceNumber', kind: 'plain' },
      { text: '  );', kind: 'plain' },
      { text: '' },
      { text: '  if (!deal) {', kind: 'plain' },
      { text: '    log.warn("unmatched", evt.bill.id);', kind: 'plain' },
      { text: '    return;', kind: 'plain' },
      { text: '  }', kind: 'plain' },
      { text: '' },
      { text: '  await hubspot.deals.update(deal.id, {', kind: 'plain' },
      { text: '    dealstage:       "Paid",', kind: 'string' },
      { text: '    amount:          evt.payment.amount,', kind: 'plain' },
      { text: '    closedate:       evt.payment.processDate,', kind: 'plain' },
      { text: '    description:     `${evt.vendor.name} – Paid via BILL`,', kind: 'string' },
      { text: '    bill_payment_id: evt.payment.confirmation,', kind: 'plain' },
      { text: '  });', kind: 'plain' },
      { text: '});', kind: 'plain' },
    ];
  }

  if (kind === 'liquidity-burndown') {
    return [
      { text: '# BILL Coworker · 60-day cash runway projection', kind: 'comment' },
      { text: '# Source: operating balance + scheduled AP + expected AR', kind: 'comment' },
      { text: '' },
      { text: 'const opsAccount = await bill.accounts.find({ role: "operating" });', kind: 'plain' },
      { text: 'const horizon = 60;  # days', kind: 'comment' },
      { text: 'const floor = opsAccount.floorThreshold;', kind: 'plain' },
      { text: '' },
      { text: 'const scheduled = await bill.bills.list({', kind: 'plain' },
      { text: '  status: ["scheduled", "due-soon"],', kind: 'string' },
      { text: '  dueBefore: addDays(today, horizon),', kind: 'plain' },
      { text: '});', kind: 'plain' },
      { text: '' },
      { text: 'const expectedAR = await bill.ar.list({', kind: 'plain' },
      { text: '  expectedBefore: addDays(today, horizon),', kind: 'plain' },
      { text: '});', kind: 'plain' },
      { text: '' },
      { text: 'const series = [];', kind: 'plain' },
      { text: 'let balance = opsAccount.balance;', kind: 'plain' },
      { text: 'for (let d = 0; d <= horizon; d++) {', kind: 'plain' },
      { text: '  const day = addDays(today, d);', kind: 'plain' },
      { text: '  balance -= sumDue(scheduled, day);', kind: 'plain' },
      { text: '  balance += sumExpected(expectedAR, day);', kind: 'plain' },
      { text: '  series.push({ day, balance });', kind: 'plain' },
      { text: '}', kind: 'plain' },
      { text: '' },
      { text: 'return { series, floor, min: minPoint(series) };', kind: 'plain' },
    ];
  }

  if (kind === 'sweep-rule') {
    return [
      { text: '# BILL Coworker · Low-balance auto-sweep rule', kind: 'comment' },
      { text: '# Trigger: daily balance check on operating account', kind: 'comment' },
      { text: '# Safety: 1 sweep/day max · reserve floor $250k', kind: 'comment' },
      { text: '' },
      { text: 'schedule("0 7 * * *", async () => {', kind: 'plain' },
      { text: '  const ops = await bill.accounts.find({ role: "operating" });', kind: 'plain' },
      { text: '  const reserve = await bill.accounts.find({ role: "reserve" });', kind: 'plain' },
      { text: '' },
      { text: '  # --- conditions ---', kind: 'comment' },
      { text: '  if (ops.balance >= 50000) return;', kind: 'plain' },
      { text: '  if (reserve.balance < 250000) {', kind: 'plain' },
      { text: '    await rule.pause("reserve below safety floor");', kind: 'string' },
      { text: '    return;', kind: 'plain' },
      { text: '  }', kind: 'plain' },
      { text: '  if (await rule.triggeredToday()) return;', kind: 'plain' },
      { text: '' },
      { text: '  # --- action ---', kind: 'comment' },
      { text: '  const transfer = await bill.transfers.create({', kind: 'plain' },
      { text: '    from: reserve.id,', kind: 'plain' },
      { text: '    to:   ops.id,', kind: 'plain' },
      { text: '    amount: 50000,', kind: 'plain' },
      { text: '    memo: "Auto-sweep · low-balance rule",', kind: 'string' },
      { text: '  });', kind: 'plain' },
      { text: '' },
      { text: '  await slack.postMessage({', kind: 'plain' },
      { text: '    channel: "#finance",', kind: 'string' },
      { text: '    text: `Swept $50k → Ops · balance now $${ops.balance + 50000}`,', kind: 'string' },
      { text: '  });', kind: 'plain' },
      { text: '});', kind: 'plain' },
    ];
  }

  return [{ text: '# No code template for this artifact kind', kind: 'comment' }];
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ArtifactCode({ artifact }: Props) {
  const lines = codeForArtifact(artifact);
  const editInfo = artifact.editedBy
    ? ` · ${artifact.editedBy} edited ${timeAgo(artifact.editedAt)}`
    : '';
  const hasHumanEdit = Boolean(artifact.editedBy);

  return (
    <div className="code-view">
      <div className="code-view-meta">
        <span className="code-view-version">
          {hasHumanEdit && <span className="code-view-edit-dot" title="Code edited — logic view may differ" />}
          v{artifact.version || 1}
        </span>
        <span className="code-view-author">
          by {artifact.createdBy || 'Coworker'}{editInfo}
        </span>
        <span className="code-view-badge">read-only</span>
      </div>
      {hasHumanEdit && (
        <div className="code-view-warning">
          ⚠ Code was hand-edited — logic view may not reflect these changes until re-synced.
        </div>
      )}
      <div className="code-block">
        {renderLines(lines)}
      </div>
    </div>
  );
}
