export type Vendor = {
  id: string;
  name: string;
  handle: string;
  terms: string;
  category: string;
};

export type BillStatus = 'due-soon' | 'overdue' | 'open' | 'scheduled';

export type Bill = {
  id: string;
  vendor: string;
  invoice: string;
  amount: number;
  due: string;
  status: BillStatus;
  poRef: string;
};

export type AgingBucket = { bucket: string; amount: number };
export type CategorySpend = { cat: string; amount: number; pct: number };

export type ExpenseStatus = 'approved' | 'pending' | 'rejected';
export type Expense = {
  id: string;
  employee: string;
  category: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
};

export const VENDORS: Vendor[] = [
  { id: 'vnd_01', name: 'Acme Cloud Services', handle: 'acme-cloud', terms: 'Net 30', category: 'Software' },
  { id: 'vnd_02', name: 'Northwind Logistics', handle: 'northwind', terms: 'Net 15', category: 'Shipping' },
  { id: 'vnd_03', name: 'Meridian Office Supply', handle: 'meridian-office', terms: 'Net 30', category: 'Office' },
  { id: 'vnd_04', name: 'Crestline Legal LLP', handle: 'crestline-legal', terms: 'Net 45', category: 'Professional' },
  { id: 'vnd_05', name: 'Fulton & Hart Consulting', handle: 'fulton-hart', terms: 'Net 30', category: 'Professional' },
  { id: 'vnd_06', name: 'Brightline Marketing Co.', handle: 'brightline', terms: 'Net 30', category: 'Marketing' },
  { id: 'vnd_07', name: 'Harbor Print Works', handle: 'harbor-print', terms: 'Net 15', category: 'Office' },
  { id: 'vnd_08', name: 'Sequoia Utilities', handle: 'sequoia-utilities', terms: 'Net 20', category: 'Utilities' },
  { id: 'vnd_09', name: 'Parkline Staffing Group', handle: 'parkline', terms: 'Net 30', category: 'Staffing' },
  { id: 'vnd_10', name: 'Ironwood Maintenance', handle: 'ironwood', terms: 'Net 15', category: 'Facilities' },
  { id: 'vnd_11', name: 'Clearwater Analytics', handle: 'clearwater', terms: 'Net 30', category: 'Software' },
  { id: 'vnd_12', name: 'Pinebrook Insurance', handle: 'pinebrook', terms: 'Net 30', category: 'Insurance' },
];

export const BILLS: Bill[] = [
  { id: 'bll_4182', vendor: 'vnd_01', invoice: 'INV-2026-04811', amount: 14820.00, due: '2026-04-22', status: 'due-soon', poRef: 'PO-44-221' },
  { id: 'bll_4183', vendor: 'vnd_02', invoice: 'NW-88392',       amount:  3214.55, due: '2026-04-19', status: 'overdue',  poRef: 'PO-44-189' },
  { id: 'bll_4184', vendor: 'vnd_03', invoice: 'MOS-00441',      amount:   842.10, due: '2026-04-30', status: 'open',     poRef: '—' },
  { id: 'bll_4185', vendor: 'vnd_04', invoice: 'CL-22-0318',     amount: 28500.00, due: '2026-05-02', status: 'open',     poRef: 'PO-44-233' },
  { id: 'bll_4186', vendor: 'vnd_05', invoice: 'FH-Q2-014',      amount: 12000.00, due: '2026-04-25', status: 'due-soon', poRef: 'PO-44-218' },
  { id: 'bll_4187', vendor: 'vnd_06', invoice: 'BRT-5529',       amount:  6740.00, due: '2026-05-04', status: 'open',     poRef: 'PO-44-240' },
  { id: 'bll_4188', vendor: 'vnd_07', invoice: 'HPW-1044',       amount:   318.72, due: '2026-04-18', status: 'overdue',  poRef: '—' },
  { id: 'bll_4189', vendor: 'vnd_08', invoice: 'SU-3-22044',     amount:  2104.88, due: '2026-04-28', status: 'open',     poRef: '—' },
  { id: 'bll_4190', vendor: 'vnd_09', invoice: 'PKL-99214',      amount: 18240.00, due: '2026-04-21', status: 'due-soon', poRef: 'PO-44-212' },
  { id: 'bll_4191', vendor: 'vnd_10', invoice: 'IRN-0088',       amount:  1450.00, due: '2026-05-06', status: 'open',     poRef: '—' },
  { id: 'bll_4192', vendor: 'vnd_11', invoice: 'CW-Q2-2026',     amount:  9900.00, due: '2026-04-27', status: 'open',     poRef: 'PO-44-228' },
  { id: 'bll_4193', vendor: 'vnd_12', invoice: 'PB-RNW-04',      amount:  4210.00, due: '2026-05-09', status: 'open',     poRef: '—' },
  { id: 'bll_4194', vendor: 'vnd_01', invoice: 'INV-2026-04612', amount:  3900.00, due: '2026-04-20', status: 'due-soon', poRef: 'PO-44-196' },
  { id: 'bll_4195', vendor: 'vnd_06', invoice: 'BRT-5488',       amount:  2150.00, due: '2026-04-14', status: 'overdue',  poRef: '—' },
];

export const AGING: AgingBucket[] = [
  { bucket: 'Current',    amount: 38420 },
  { bucket: '1–30 days',  amount: 54800 },
  { bucket: '31–60 days', amount: 12400 },
  { bucket: '61–90 days', amount:  4210 },
  { bucket: '90+ days',   amount:   910 },
];

export const CATEGORY_SPEND: CategorySpend[] = [
  { cat: 'Software',     amount: 24720, pct: 22 },
  { cat: 'Professional', amount: 40500, pct: 36 },
  { cat: 'Staffing',     amount: 18240, pct: 16 },
  { cat: 'Marketing',    amount:  8890, pct:  8 },
  { cat: 'Shipping',     amount:  3214, pct:  3 },
  { cat: 'Other',        amount: 17000, pct: 15 },
];

export const EMPLOYEES: Employee[] = [
  { id: 'emp_01', name: 'Avery Chen',      email: 'avery@company.com',   department: 'Engineering', role: 'Staff engineer' },
  { id: 'emp_02', name: 'Jordan Patel',    email: 'jordan@company.com',  department: 'Marketing',   role: 'Growth lead' },
  { id: 'emp_03', name: 'Sam Okafor',      email: 'sam@company.com',     department: 'Sales',       role: 'AE' },
  { id: 'emp_04', name: 'Riley Nakamura',  email: 'riley@company.com',   department: 'Design',      role: 'Design manager' },
  { id: 'emp_05', name: 'Morgan Hughes',   email: 'morgan@company.com',  department: 'Finance',     role: 'Controller' },
];

export const EXPENSES: Expense[] = [
  { id: 'exp_1001', employee: 'emp_01', category: 'Software',    amount:  128.00, date: '2026-04-02', status: 'approved' },
  { id: 'exp_1002', employee: 'emp_01', category: 'Travel',      amount:  642.55, date: '2026-04-08', status: 'approved' },
  { id: 'exp_1003', employee: 'emp_02', category: 'Ads',         amount: 2400.00, date: '2026-04-09', status: 'pending'  },
  { id: 'exp_1004', employee: 'emp_03', category: 'Meals',       amount:   88.40, date: '2026-04-11', status: 'approved' },
  { id: 'exp_1005', employee: 'emp_03', category: 'Travel',      amount: 1125.00, date: '2026-04-13', status: 'pending'  },
  { id: 'exp_1006', employee: 'emp_04', category: 'Software',    amount:   59.00, date: '2026-04-15', status: 'approved' },
  { id: 'exp_1007', employee: 'emp_05', category: 'Conferences', amount: 1899.00, date: '2026-04-16', status: 'rejected' },
  { id: 'exp_1008', employee: 'emp_02', category: 'Meals',       amount:  142.10, date: '2026-04-17', status: 'approved' },
];

export const SESSIONS = [
  { id: 's1', title: 'Pay down April AP',       meta: '3 steps · approved',     glyph: '→' },
  { id: 's2', title: 'Weekly CFO digest',        meta: 'scheduled · Fri 07:00',  glyph: '◷' },
  { id: 's3', title: 'New vendor: Clearwater',   meta: 'draft',                  glyph: '·' },
  { id: 's4', title: 'Duplicate invoice sweep',  meta: '12 matches',             glyph: '⌕' },
  { id: 's5', title: 'Q1 vendor spend report',   meta: 'artifact · chart',       glyph: '▤' },
];

export const CONNECTORS: { name: string; status: 'ok' | 'warn'; meta: string }[] = [
  { name: 'BILL AP',       status: 'ok',   meta: 'v3 · 142 req today' },
  { name: 'BILL AR',       status: 'ok',   meta: 'v3 · 38 req' },
  { name: 'BILL Payments', status: 'ok',   meta: 'ACH + virtual card' },
  { name: 'HubSpot CRM',   status: 'ok',   meta: '2-way sync' },
  { name: 'NetSuite GL',   status: 'warn', meta: 'token expires 4d' },
];

export const DEMO_PROMPTS = [
  { label: '/ap show overdue',     prompt: 'Show me all overdue AP across every vendor, grouped by urgency.' },
  { label: '/pay batch',            prompt: 'Pay the 3 overdue invoices via ACH from our Ops Checking account.' },
  { label: '/automate net15-flag',  prompt: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
  { label: '/chart vendor-spend',   prompt: 'Visualize Q1 spend by vendor category.' },
  { label: '/crm sync paid→deal',   prompt: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
  { label: '/dupe sweep',           prompt: 'Scan the last 60 days of AP for likely duplicate invoices and list them.' },
];
