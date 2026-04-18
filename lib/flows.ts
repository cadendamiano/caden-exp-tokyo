export type ArtifactKind = 'ap-table' | 'spend-chart' | 'rule-net15' | 'crm-flow';

export type ToolRowSpec = {
  verb: 'GET' | 'POST' | 'EXEC';
  path: string;
  filter?: string;
  status?: string;
  result?: string;
};

export type FlowStep =
  | { kind: 'user';          delay?: number; text: string }
  | { kind: 'agent-stream';  delay?: number; text: string }
  | { kind: 'tools';         delay?: number; rows: ToolRowSpec[] }
  | { kind: 'libs';          delay?: number; items: { pkg: string; ver: string }[] }
  | { kind: 'building';      delay?: number; label: string; sub: string }
  | {
      kind: 'artifact-card';
      delay?: number;
      artifactId: string;
      title: string;
      sub: string;
      meta: string;
      icon?: string;
    }
  | {
      kind: 'approval';
      delay?: number;
      payload: {
        batchId: string;
        from: string;
        method: string;
        scheduledFor: string;
        items: { vendor: string; invoice: string; amount: number }[];
        total: number;
      };
    }
  | { kind: 'suggest'; delay?: number; items: string[] };

export type Flow = {
  id: string;
  title: string;
  steps: FlowStep[];
  artifact?: { id: string; kind: ArtifactKind; label: string; filter?: string };
};

export const FLOWS: Record<string, Flow> = {
  ap_overdue: {
    id: 'ap_overdue',
    title: 'Overdue AP · by urgency',
    steps: [
      { kind: 'user', text: 'Show me all overdue AP across every vendor, grouped by urgency.' },
      { kind: 'agent-stream', delay: 240, text:
`Pulling open payables from BILL across all vendor records. I'll filter to bills where \`status != 'paid'\` and \`dueDate <= today + 7d\`, grouped by urgency.` },
      { kind: 'tools', delay: 900, rows: [
        { verb: 'GET',  path: '/v3/api/list/Vendor',    filter: 'isActive=true', status: '200', result: '12 records · 84ms' },
        { verb: 'POST', path: '/v3/api/list/Bill',      filter: "filters=[status:'1',dueDate:<='2026-04-24']", status: '200', result: '14 records · 142ms' },
        { verb: 'GET',  path: '/v3/api/crud/read/Bill', filter: 'ids=[...14]', status: '200', result: 'enriched · 211ms' },
      ] },
      { kind: 'agent-stream', delay: 500, text:
`Found **14 open bills** totaling **$108,830**. Click the artifact below to open it in the right pane — selection there carries into payment actions.

3 are **overdue** (Harbor Print, Brightline Marketing, Northwind Logistics — $5.7k combined). 5 more are due in the next 7 days including a **$18,240 Parkline Staffing** invoice.

Want me to queue the overdue three for ACH payment from Ops Checking?` },
      { kind: 'libs', delay: 400, items: [
        { pkg: '@bill/artifact-runtime', ver: '0.4.1' },
        { pkg: '@tanstack/table', ver: '8.17.3' },
      ] },
      { kind: 'building', delay: 600, label: 'Open AP · all vendors', sub: 'building interactive table' },
      { kind: 'artifact-card', delay: 1200, artifactId: 'art_ap_all',
        title: 'Open AP · 14 bills', sub: 'TABLE · INTERACTIVE',
        meta: '14 open bills · 12 vendors · **$108.8k** total · **3 overdue**, 5 due <7d',
        icon: '▤' },
      { kind: 'suggest', items: ['Pay the 3 overdue now', 'Schedule all due-in-7d', 'Export to CSV', 'Create rule for overdue bills'] },
    ],
    artifact: { id: 'art_ap_all', kind: 'ap-table', label: 'Open AP · 14 bills', filter: 'all' },
  },

  pay_batch: {
    id: 'pay_batch',
    title: 'Pay down April AP',
    steps: [
      { kind: 'user', text: 'Pay the 3 overdue invoices via ACH from our Ops Checking account.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll prepare a batch ACH payment for the three overdue bills. I need your approval before anything hits the rails — payments always require a human gate in BILL Coworker.` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'GET',  path: '/v3/api/list/BankAccount', filter: "nickname='Ops Checking'", status: '200', result: '1 record' },
        { verb: 'POST', path: '/v3/api/PayBill/prepare',  filter: 'billIds=[4183,4188,4195]', status: '200', result: 'batch staged' },
      ] },
      { kind: 'agent-stream', delay: 400, text: 'Draft batch ready. Review and approve:' },
      { kind: 'approval', payload: {
        batchId: 'btch_0041',
        from: 'Ops Checking ••4821',
        method: 'ACH',
        scheduledFor: 'Today, 4:00 PM PT',
        items: [
          { vendor: 'Northwind Logistics',   invoice: 'NW-88392', amount: 3214.55 },
          { vendor: 'Harbor Print Works',    invoice: 'HPW-1044', amount:  318.72 },
          { vendor: 'Brightline Marketing',  invoice: 'BRT-5488', amount: 2150.00 },
        ],
        total: 5683.27,
      } },
    ],
  },

  automate_net15: {
    id: 'automate_net15',
    title: 'Automation · flag Net-15 > $5k',
    steps: [
      { kind: 'user', text: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
      { kind: 'agent-stream', delay: 220, text:
`I can build that as a BILL Coworker automation. It'll subscribe to the \`bill.created\` webhook, filter on terms + amount, and fan out to two actions: set an internal review flag on the bill, and send a Slack message.

Here's the rule — review it before I turn it on:` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'GET', path: '/v3/api/list/CustomField',       filter: 'name=ReviewFlag', status: '200', result: 'field exists' },
        { verb: 'GET', path: '/integrations/slack/channels',   filter: 'name=ap', status: '200', result: '#ap (C0483D)' },
      ] },
      { kind: 'libs', delay: 400, items: [
        { pkg: '@bill/rules-engine', ver: '1.2.0' },
        { pkg: '@bill/artifact-runtime', ver: '0.4.1' },
      ] },
      { kind: 'building', delay: 600, label: 'Rule · Net-15 > $5k', sub: 'compiling conditions' },
      { kind: 'artifact-card', delay: 1200, artifactId: 'art_rule_net15',
        title: 'Flag large Net-15 bills', sub: 'AUTOMATION RULE · DRAFT',
        meta: '3 conditions · 3 actions · dry-run: **4 matches** in last 30d',
        icon: '▦' },
      { kind: 'agent-stream', delay: 500, text:
`This will run on every new bill. Typical volume for your workspace: ~3 triggers/week. No backfill. Want me to **turn it on**?` },
      { kind: 'suggest', items: ['Turn on rule', 'Dry-run on last 30 days', 'Add approval to action', 'Edit conditions'] },
    ],
    artifact: { id: 'art_rule_net15', kind: 'rule-net15', label: 'Rule · Net-15 > $5k' },
  },

  chart_spend: {
    id: 'chart_spend',
    title: 'Q1 spend by category',
    steps: [
      { kind: 'user', text: 'Visualize Q1 spend by vendor category.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll pull Q1 paid bills, join to vendor categories, and render an interactive chart. Spinning up a visualization sandbox.` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'POST', path: '/v3/api/list/Bill',   filter: "paymentStatus='0',paidDate:[2026-01-01..2026-03-31]", status: '200', result: '87 records · 168ms' },
        { verb: 'GET',  path: '/v3/api/list/Vendor', filter: 'ids=[...41]', status: '200', result: '41 records' },
        { verb: 'EXEC', path: 'coworker.aggregate',  filter: 'groupBy=category,sum(amount)', status: 'ok', result: '6 buckets' },
      ] },
      { kind: 'libs', delay: 500, items: [
        { pkg: 'recharts', ver: '2.12.0' },
        { pkg: 'd3-scale', ver: '4.0.2' },
        { pkg: '@bill/artifact-runtime', ver: '0.4.1' },
      ] },
      { kind: 'building', delay: 700, label: 'Q1 Spend · chart', sub: 'rendering donut + bar views' },
      { kind: 'artifact-card', delay: 1400, artifactId: 'art_spend_chart',
        title: 'Q1 Spend · by category', sub: 'CHART · INTERACTIVE',
        meta: '87 paid bills · 41 vendors · 6 buckets · **$112.3k** total · top: **Professional** 36%',
        icon: '▤' },
      { kind: 'agent-stream', delay: 500, text:
`Artifact's ready — click the card to open it on the right. **Professional services** is your biggest Q1 spend at $40.5k (36%), driven by Crestline Legal and Fulton & Hart. Software is #2, with Clearwater's new contract the biggest mover vs Q4.

Want a YoY comparison, or a CFO one-pager?` },
      { kind: 'suggest', items: ['YoY comparison', 'Generate CFO one-pager', 'Break down Professional services', 'Export chart'] },
    ],
    artifact: { id: 'art_spend_chart', kind: 'spend-chart', label: 'Q1 Spend · chart' },
  },

  crm_sync: {
    id: 'crm_sync',
    title: 'CRM · payment → deal',
    steps: [
      { kind: 'user', text: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll wire up a transform. BILL emits \`payment.cleared\`; I'll match each payment to a HubSpot deal by invoice number on the deal's custom property \`bill_invoice_id\`, then patch the deal.` },
      { kind: 'tools', delay: 800, rows: [
        { verb: 'GET', path: '/integrations/hubspot/properties/deal', filter: 'name=bill_invoice_id', status: '200', result: 'exists (string)' },
        { verb: 'GET', path: '/integrations/hubspot/pipelines',       filter: 'name=Sales',           status: '200', result: 'stage "Paid" found' },
      ] },
      { kind: 'libs', delay: 400, items: [
        { pkg: '@bill/flows', ver: '0.9.2' },
        { pkg: '@hubspot/api-client', ver: '10.1.0' },
      ] },
      { kind: 'building', delay: 600, label: 'Flow · Payment → HubSpot', sub: 'mapping fields' },
      { kind: 'artifact-card', delay: 1200, artifactId: 'art_crm_flow',
        title: 'Payment → HubSpot deal', sub: 'FLOW · TESTED',
        meta: '1 trigger → 5 field maps · **18/20** matched in backfill test',
        icon: '◇' },
      { kind: 'agent-stream', delay: 500, text:
`I tested the mapping against your last 20 cleared payments — **18 matched a deal**, 2 had no bill_invoice_id set. Want me to turn this on for new events only, or also backfill the 18 matched ones?` },
      { kind: 'suggest', items: ['Turn on (new events)', 'Turn on + backfill 18', 'Show 2 unmatched', 'Change match key'] },
    ],
    artifact: { id: 'art_crm_flow', kind: 'crm-flow', label: 'Flow · Payment → HubSpot' },
  },

  dupe_sweep: {
    id: 'dupe_sweep',
    title: 'Duplicate invoice sweep',
    steps: [
      { kind: 'user', text: 'Scan the last 60 days of AP for likely duplicate invoices and list them.' },
      { kind: 'agent-stream', delay: 220, text:
`Running a fuzzy-match against bills from Feb 16 – Apr 17. Matching on \`vendorId + roundedAmount + normalizedInvoiceNumber\` with a Levenshtein tolerance of 2 on the invoice number.` },
      { kind: 'tools', delay: 800, rows: [
        { verb: 'POST', path: '/v3/api/list/Bill',     filter: 'createdTime:[60d]', status: '200', result: '284 records' },
        { verb: 'EXEC', path: 'coworker.dedupe.scan',  filter: 'tolerance=2',        status: 'ok',  result: '4 suspect pairs · 312ms' },
      ] },
      { kind: 'agent-stream', delay: 500, text:
`Flagged **4 suspect pairs** (1 high-confidence, 3 needs-review). The highest-confidence match: two $2,150 invoices from Brightline Marketing posted 6 days apart, nearly identical invoice numbers (BRT-5488 vs BRT-5488-A).

Open the artifact to review each pair side-by-side. I won't void anything without approval.` },
      { kind: 'suggest', items: ['Open review queue', 'Void the high-confidence match', 'Tune matcher', 'Save as scheduled sweep'] },
    ],
  },
};

export function matchFlow(text: string): string | null {
  const low = text.toLowerCase();
  if (low.includes('pay') && (low.includes('3') || low.includes('ach') || low.includes('overdue'))) return 'pay_batch';
  if (low.includes('overdue') || (low.includes('show') && low.includes('ap'))) return 'ap_overdue';
  if (low.includes('net 15') || low.includes('automation') || low.includes('rule')) return 'automate_net15';
  if (low.includes('chart') || low.includes('visualize') || low.includes('spend')) return 'chart_spend';
  if (low.includes('crm') || low.includes('hubspot') || low.includes('deal')) return 'crm_sync';
  if (low.includes('dup') || low.includes('sweep')) return 'dupe_sweep';
  return null;
}
