import type { DatasetKey } from './data';

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
        stake: 'query' | 'automation' | 'payment' | 'large-payment';
        from: string;
        method: string;
        scheduledFor: string;
        items: { vendor: string; invoice: string; amount: number }[];
        total: number;
        requiresSecondApprover?: boolean;
      };
    }
  | { kind: 'suggest'; delay?: number; items: string[] };

export type Flow = {
  id: string;
  title: string;
  steps: FlowStep[];
  artifact?: { id: string; kind: ArtifactKind; label: string; filter?: string };
};

export const FLOWS = {
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
        stake: 'payment',
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

  pay_large: {
    id: 'pay_large',
    title: 'Pay large vendor batch',
    steps: [
      { kind: 'user', text: 'Pay the Q1 professional services invoices from Crestline Legal and Fulton & Hart.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll prepare a batch ACH payment for these two invoices totaling **$40,500**. Because this batch exceeds $25,000, it requires a second approver before submission. I'll need your review first, then route to your Controller.` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'GET',  path: '/v3/api/list/BankAccount', filter: "nickname='Ops Checking'", status: '200', result: '1 record' },
        { verb: 'POST', path: '/v3/api/PayBill/prepare',  filter: 'billIds=[4185,4186]', status: '200', result: 'batch staged · pending 2nd approval' },
      ] },
      { kind: 'agent-stream', delay: 400, text: 'Draft batch ready — requires Controller sign-off before execution:' },
      { kind: 'approval', payload: {
        batchId: 'btch_0042',
        stake: 'large-payment',
        requiresSecondApprover: true,
        from: 'Ops Checking ••4821',
        method: 'ACH',
        scheduledFor: 'Pending second approval',
        items: [
          { vendor: 'Crestline Legal LLP',       invoice: 'CL-22-0318', amount: 28500.00 },
          { vendor: 'Fulton & Hart Consulting',  invoice: 'FH-Q2-014',  amount: 12000.00 },
        ],
        total: 40500.00,
      } },
    ],
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
} satisfies Record<string, Flow>;

export type FlowId = keyof typeof FLOWS;

export const LOGISTICS_FLOWS = {
  ap_overdue: {
    id: 'ap_overdue',
    title: 'Overdue AP · Crestview Freight',
    steps: [
      { kind: 'user', text: 'Show me all overdue AP — carrier, fuel, and customs invoices.' },
      { kind: 'agent-stream', delay: 240, text:
`Pulling open payables from BILL for Crestview Freight Solutions. I'll filter to bills where \`status != 'paid'\` and \`dueDate <= today + 7d\`, grouped by urgency.` },
      { kind: 'tools', delay: 900, rows: [
        { verb: 'GET',  path: '/v3/api/list/Vendor',    filter: 'isActive=true', status: '200', result: '18 records · 92ms' },
        { verb: 'POST', path: '/v3/api/list/Bill',      filter: "filters=[status:'1',dueDate:<='2026-04-26']", status: '200', result: '13 records · 156ms' },
        { verb: 'GET',  path: '/v3/api/crud/read/Bill', filter: 'ids=[...13]', status: '200', result: 'enriched · 224ms' },
      ] },
      { kind: 'agent-stream', delay: 500, text:
`Found **13 open bills** totaling **$217.9k**. Click the artifact below to open it in the right pane — selection there carries into payment actions.

4 are **overdue**: MidWest Fuel (fuel card $18.2k, 11d late), Apex Carrier Network ($14.2k, 3d late), Westcoast Pallet Supply ($2.8k, 7d late), and Harbor Customs Brokers ($5.8k, 5d late). 5 more are due in the next 7 days including a **$28.4k SkyLink Air Freight** invoice that will need a second approver.

Want me to queue the four overdue bills for ACH payment from Ops Checking?` },
      { kind: 'libs', delay: 400, items: [
        { pkg: '@bill/artifact-runtime', ver: '0.4.1' },
        { pkg: '@tanstack/table', ver: '8.17.3' },
      ] },
      { kind: 'building', delay: 600, label: 'Open AP · Crestview Freight', sub: 'building interactive table' },
      { kind: 'artifact-card', delay: 1200, artifactId: 'art_ap_all',
        title: 'Open AP · 13 bills', sub: 'TABLE · INTERACTIVE',
        meta: '13 open bills · 18 vendors · **$217.9k** total · **4 overdue**, 5 due <7d',
        icon: '▤' },
      { kind: 'suggest', items: ['Pay the 4 overdue now', 'Schedule all due-in-7d', 'Export to CSV', 'Create rule for overdue bills'] },
    ],
    artifact: { id: 'art_ap_all', kind: 'ap-table', label: 'Open AP · 13 bills', filter: 'all' },
  },

  pay_batch: {
    id: 'pay_batch',
    title: 'Pay down overdue AP',
    steps: [
      { kind: 'user', text: 'Pay the overdue fuel and pallet invoices via ACH from our Ops Checking account.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll prepare a batch ACH payment for the three smaller overdue bills. I need your approval before anything hits the rails — payments always require a human gate in BILL Coworker.` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'GET',  path: '/v3/api/list/BankAccount', filter: "nickname='Ops Checking'", status: '200', result: '1 record' },
        { verb: 'POST', path: '/v3/api/PayBill/prepare',  filter: 'billIds=[lbl_001,lbl_003,lbl_004]', status: '200', result: 'batch staged' },
      ] },
      { kind: 'agent-stream', delay: 400, text: 'Draft batch ready. Review and approve:' },
      { kind: 'approval', payload: {
        batchId: 'btch_l041',
        stake: 'payment',
        from: 'Ops Checking ••4821',
        method: 'ACH',
        scheduledFor: 'Today, 4:00 PM PT',
        items: [
          { vendor: 'MidWest Fuel Card Services', invoice: 'MFC-F-44921', amount: 18240.00 },
          { vendor: 'Westcoast Pallet Supply',    invoice: 'WPS-20441',   amount:  2840.00 },
          { vendor: 'Harbor Customs Brokers',     invoice: 'HCB-0412',    amount:  5820.00 },
        ],
        total: 26900.00,
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
        meta: '3 conditions · 3 actions · dry-run: **5 matches** in last 30d (SkyLink, MidWest Fuel, Pinnacle × 2, Harbor Customs)',
        icon: '▦' },
      { kind: 'agent-stream', delay: 500, text:
`This will run on every new bill. Typical volume for Crestview: ~4 triggers/week (carrier and fuel spikes). No backfill. Want me to **turn it on**?` },
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
        { verb: 'POST', path: '/v3/api/list/Bill',   filter: "paymentStatus='0',paidDate:[2026-01-01..2026-03-31]", status: '200', result: '112 records · 184ms' },
        { verb: 'GET',  path: '/v3/api/list/Vendor', filter: 'ids=[...18]', status: '200', result: '18 records' },
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
        meta: '112 paid bills · 18 vendors · 6 buckets · **$406k** total · top: **Freight/Carriers** 35%',
        icon: '▤' },
      { kind: 'agent-stream', delay: 500, text:
`Artifact's ready — click the card to open it on the right. **Freight/Carriers** is the biggest Q1 spend at $142k (35%), driven by Apex Carrier Network and SkyLink Air Freight. Staffing/Labor is #2 at $88k (22%).

Want a YoY comparison, or a CFO one-pager?` },
      { kind: 'suggest', items: ['YoY comparison', 'Generate CFO one-pager', 'Break down Freight/Carriers', 'Export chart'] },
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
        { verb: 'GET', path: '/integrations/hubspot/pipelines',       filter: 'name=Freight',         status: '200', result: 'stage "Paid" found' },
      ] },
      { kind: 'libs', delay: 400, items: [
        { pkg: '@bill/flows', ver: '0.9.2' },
        { pkg: '@hubspot/api-client', ver: '10.1.0' },
      ] },
      { kind: 'building', delay: 600, label: 'Flow · Payment → HubSpot', sub: 'mapping fields' },
      { kind: 'artifact-card', delay: 1200, artifactId: 'art_crm_flow',
        title: 'Payment → HubSpot deal', sub: 'FLOW · TESTED',
        meta: '1 trigger → 5 field maps · **17/20** matched in backfill test',
        icon: '◇' },
      { kind: 'agent-stream', delay: 500, text:
`I tested the mapping against the last 20 cleared payments — **17 matched a deal**, 3 had no bill_invoice_id set (all small fuel-card reimbursements). Want me to turn this on for new events only, or also backfill the 17 matched ones?` },
      { kind: 'suggest', items: ['Turn on (new events)', 'Turn on + backfill 17', 'Show 3 unmatched', 'Change match key'] },
    ],
    artifact: { id: 'art_crm_flow', kind: 'crm-flow', label: 'Flow · Payment → HubSpot' },
  },

  pay_large: {
    id: 'pay_large',
    title: 'Pay SkyLink · large batch',
    steps: [
      { kind: 'user', text: 'Pay the SkyLink Air Freight invoice — it needs a second approver.' },
      { kind: 'agent-stream', delay: 220, text:
`I'll prepare a batch ACH payment for the SkyLink Air Freight invoice and the in-window Apex Carrier invoice totaling **$42,600**. Because this batch exceeds $25,000, it requires a second approver before submission. I'll need your review first, then route to Dana (Controller).` },
      { kind: 'tools', delay: 700, rows: [
        { verb: 'GET',  path: '/v3/api/list/BankAccount', filter: "nickname='Ops Checking'", status: '200', result: '1 record' },
        { verb: 'POST', path: '/v3/api/PayBill/prepare',  filter: 'billIds=[lbl_006,lbl_002]', status: '200', result: 'batch staged · pending 2nd approval' },
      ] },
      { kind: 'agent-stream', delay: 400, text: 'Draft batch ready — requires Controller sign-off before execution:' },
      { kind: 'approval', payload: {
        batchId: 'btch_l042',
        stake: 'large-payment',
        requiresSecondApprover: true,
        from: 'Ops Checking ••4821',
        method: 'ACH',
        scheduledFor: 'Pending second approval',
        items: [
          { vendor: 'SkyLink Air Freight',    invoice: 'SKY-4401',      amount: 28400.00 },
          { vendor: 'Apex Carrier Network',   invoice: 'ACN-2026-0381', amount: 14200.00 },
        ],
        total: 42600.00,
      } },
    ],
  },

  dupe_sweep: {
    id: 'dupe_sweep',
    title: 'Duplicate invoice sweep · Apex',
    steps: [
      { kind: 'user', text: 'Scan the last 60 days of AP for likely duplicate invoices — check Apex Carrier especially.' },
      { kind: 'agent-stream', delay: 220, text:
`Running a fuzzy-match against bills from Feb 18 – Apr 19. Matching on \`vendorId + roundedAmount + normalizedInvoiceNumber\` with a Levenshtein tolerance of 2 on the invoice number.` },
      { kind: 'tools', delay: 800, rows: [
        { verb: 'POST', path: '/v3/api/list/Bill',     filter: 'createdTime:[60d]', status: '200', result: '318 records' },
        { verb: 'EXEC', path: 'coworker.dedupe.scan',  filter: 'tolerance=2',        status: 'ok',  result: '1 suspect pair · 287ms' },
      ] },
      { kind: 'agent-stream', delay: 500, text:
`Flagged **1 high-confidence suspect pair** on Apex Carrier Network: two $14,200 invoices posted 12 days apart with near-identical invoice numbers (**ACN-2026-0381** vs **ACN-2026-381** — missing leading zero). Same PO ref (PO-CF-0799).

Open the artifact to review side-by-side. I won't void anything without approval.` },
      { kind: 'suggest', items: ['Open review queue', 'Void the duplicate', 'Tune matcher', 'Save as scheduled sweep'] },
    ],
  },
} satisfies Record<string, Flow>;

export function matchFlow(text: string, dataset: DatasetKey = 'default'): string | null {
  const low = text.toLowerCase();
  if (dataset === 'logistics') {
    if (low.includes('pay') && (low.includes('skylink') || low.includes('air freight') || low.includes('large') || low.includes('second approver'))) return 'pay_large';
  } else {
    if (low.includes('pay') && (low.includes('crestline') || low.includes('fulton') || low.includes('professional') || low.includes('large') || low.includes('q1'))) return 'pay_large';
  }
  if (low.includes('pay') && (low.includes('3') || low.includes('ach') || low.includes('overdue'))) return 'pay_batch';
  if (low.includes('overdue') || (low.includes('show') && low.includes('ap'))) return 'ap_overdue';
  if (low.includes('net 15') || low.includes('automation') || low.includes('rule')) return 'automate_net15';
  if (low.includes('chart') || low.includes('visualize') || low.includes('spend')) return 'chart_spend';
  if (low.includes('crm') || low.includes('hubspot') || low.includes('deal')) return 'crm_sync';
  if (low.includes('dup') || low.includes('sweep')) return 'dupe_sweep';
  return null;
}
