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
  { label: '/pay large · 2nd approver', prompt: 'Pay the Q1 professional services invoices from Crestline Legal and Fulton & Hart.' },
  { label: '/pay batch',            prompt: 'Pay the 3 overdue invoices via ACH from our Ops Checking account.' },
  { label: '/automate net15-flag',  prompt: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
  { label: '/chart vendor-spend',   prompt: 'Visualize Q1 spend by vendor category.' },
  { label: '/crm sync paid→deal',   prompt: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
  { label: '/dupe sweep',           prompt: 'Scan the last 60 days of AP for likely duplicate invoices and list them.' },
];

// ─── Logistics dataset: Crestview Freight Solutions ─────────────────────────
// 100-employee 3PL/freight-forwarding company

export const LOGISTICS_VENDORS: Vendor[] = [
  { id: 'lvnd_01', name: 'Apex Carrier Network',       handle: 'apex-carrier',    terms: 'Net 30', category: 'Freight'    },
  { id: 'lvnd_02', name: 'MidWest Fuel Card Services', handle: 'midwest-fuel',    terms: 'Net 15', category: 'Fuel'       },
  { id: 'lvnd_03', name: 'Reliable Fleet Maintenance', handle: 'reliable-fleet',  terms: 'Net 30', category: 'Fleet'      },
  { id: 'lvnd_04', name: 'Landmark Properties LLC',    handle: 'landmark-props',  terms: 'Net 30', category: 'Facilities' },
  { id: 'lvnd_05', name: 'RouteLogic Systems',         handle: 'routelogic',      terms: 'Net 30', category: 'Software'   },
  { id: 'lvnd_06', name: 'FleetTrack GPS',             handle: 'fleettrack',      terms: 'Net 30', category: 'Software'   },
  { id: 'lvnd_07', name: 'Pinnacle Staffing Solutions',handle: 'pinnacle-staff',  terms: 'Net 15', category: 'Staffing'   },
  { id: 'lvnd_08', name: 'Ironhorse Insurance Group',  handle: 'ironhorse-ins',   terms: 'Net 30', category: 'Insurance'  },
  { id: 'lvnd_09', name: 'Compliance Dynamics LLC',    handle: 'compliance-dyn',  terms: 'Net 45', category: 'Professional'},
  { id: 'lvnd_10', name: 'Verizon Business',           handle: 'verizon-biz',     terms: 'Net 30', category: 'Telecom'    },
  { id: 'lvnd_11', name: 'National Dock Equipment',    handle: 'national-dock',   terms: 'Net 30', category: 'Facilities' },
  { id: 'lvnd_12', name: 'Premier Office Supply Co.',  handle: 'premier-office',  terms: 'Net 30', category: 'Office'     },
  { id: 'lvnd_13', name: 'Clearpath Analytics',        handle: 'clearpath',       terms: 'Net 30', category: 'Software'   },
  { id: 'lvnd_14', name: 'Harbor Customs Brokers',     handle: 'harbor-customs',  terms: 'Net 15', category: 'Professional'},
  { id: 'lvnd_15', name: 'SkyLink Air Freight',        handle: 'skylink-air',     terms: 'Net 15', category: 'Freight'    },
  { id: 'lvnd_16', name: 'Westcoast Pallet Supply',    handle: 'westcoast-pallet',terms: 'Net 30', category: 'Materials'  },
  { id: 'lvnd_17', name: 'Atlas Payroll Services',     handle: 'atlas-payroll',   terms: 'Net 30', category: 'Professional'},
  { id: 'lvnd_18', name: 'Summit Telecom & IoT',       handle: 'summit-telecom',  terms: 'Net 30', category: 'Telecom'    },
];

export const LOGISTICS_BILLS: Bill[] = [
  // Overdue (4)
  { id: 'lbl_001', vendor: 'lvnd_02', invoice: 'MFC-F-44921',    amount: 18240.00, due: '2026-04-08', status: 'overdue',  poRef: 'PO-CF-0812' },
  { id: 'lbl_002', vendor: 'lvnd_01', invoice: 'ACN-2026-0381',  amount: 14200.00, due: '2026-04-16', status: 'overdue',  poRef: 'PO-CF-0799' },
  { id: 'lbl_003', vendor: 'lvnd_16', invoice: 'WPS-20441',      amount:  2840.00, due: '2026-04-12', status: 'overdue',  poRef: '—'          },
  { id: 'lbl_004', vendor: 'lvnd_14', invoice: 'HCB-0412',       amount:  5820.00, due: '2026-04-14', status: 'overdue',  poRef: 'PO-CF-0801' },
  // Due-soon (5)
  { id: 'lbl_005', vendor: 'lvnd_07', invoice: 'PIN-99841',      amount: 22800.00, due: '2026-04-20', status: 'due-soon', poRef: 'PO-CF-0808' },
  { id: 'lbl_006', vendor: 'lvnd_15', invoice: 'SKY-4401',       amount: 28400.00, due: '2026-04-22', status: 'due-soon', poRef: 'PO-CF-0814' },
  { id: 'lbl_007', vendor: 'lvnd_03', invoice: 'RFM-2201',       amount:  8940.00, due: '2026-04-24', status: 'due-soon', poRef: 'PO-CF-0803' },
  { id: 'lbl_008', vendor: 'lvnd_08', invoice: 'IHI-RNW-04',     amount: 11200.00, due: '2026-04-25', status: 'due-soon', poRef: '—'          },
  { id: 'lbl_009', vendor: 'lvnd_05', invoice: 'RLS-Q2-2026',    amount:  4200.00, due: '2026-04-25', status: 'due-soon', poRef: 'PO-CF-0806' },
  // Open (9)
  { id: 'lbl_010', vendor: 'lvnd_04', invoice: 'LMP-APR-26',     amount: 14500.00, due: '2026-04-30', status: 'open',     poRef: '—'          },
  { id: 'lbl_011', vendor: 'lvnd_06', invoice: 'FTG-8821',       amount:  1800.00, due: '2026-05-02', status: 'open',     poRef: 'PO-CF-0807' },
  { id: 'lbl_012', vendor: 'lvnd_11', invoice: 'NDI-0088',       amount:  3200.00, due: '2026-05-06', status: 'open',     poRef: '—'          },
  { id: 'lbl_013', vendor: 'lvnd_12', invoice: 'POS-00441',      amount:   682.00, due: '2026-05-08', status: 'open',     poRef: '—'          },
  { id: 'lbl_014', vendor: 'lvnd_13', invoice: 'CPA-Q2-2026',    amount:  2500.00, due: '2026-05-10', status: 'open',     poRef: 'PO-CF-0811' },
  { id: 'lbl_015', vendor: 'lvnd_17', invoice: 'APY-APR-26',     amount:  1400.00, due: '2026-05-05', status: 'open',     poRef: '—'          },
  { id: 'lbl_016', vendor: 'lvnd_10', invoice: 'VBZ-3-22044',    amount:  2100.00, due: '2026-05-04', status: 'open',     poRef: '—'          },
  { id: 'lbl_017', vendor: 'lvnd_09', invoice: 'CDL-Q2-014',     amount:  3500.00, due: '2026-05-12', status: 'open',     poRef: 'PO-CF-0810' },
  // Duplicate-sweep bait: near-identical invoice number, same vendor + amount
  { id: 'lbl_018', vendor: 'lvnd_01', invoice: 'ACN-2026-381',   amount: 14200.00, due: '2026-04-28', status: 'open',     poRef: 'PO-CF-0799' },
  // Scheduled (4)
  { id: 'lbl_019', vendor: 'lvnd_01', invoice: 'ACN-2026-0392',  amount: 38400.00, due: '2026-05-15', status: 'scheduled',poRef: 'PO-CF-0820' },
  { id: 'lbl_020', vendor: 'lvnd_07', invoice: 'PIN-99902',      amount: 19200.00, due: '2026-05-10', status: 'scheduled',poRef: 'PO-CF-0821' },
  { id: 'lbl_021', vendor: 'lvnd_15', invoice: 'SKY-4418',       amount: 21400.00, due: '2026-05-20', status: 'scheduled',poRef: 'PO-CF-0822' },
  { id: 'lbl_022', vendor: 'lvnd_18', invoice: 'STI-0041',       amount:  2800.00, due: '2026-05-08', status: 'scheduled',poRef: '—'          },
];

export const LOGISTICS_AGING: AgingBucket[] = [
  { bucket: 'Current',    amount:  68400 },
  { bucket: '1–30 days',  amount:  94200 },
  { bucket: '31–60 days', amount:  38800 },
  { bucket: '61–90 days', amount:  12400 },
  { bucket: '90+ days',   amount:   4100 },
];

export const LOGISTICS_CATEGORY_SPEND: CategorySpend[] = [
  { cat: 'Freight/Carriers', amount: 142000, pct: 35 },
  { cat: 'Staffing/Labor',   amount:  88000, pct: 22 },
  { cat: 'Fleet/Fuel',       amount:  72000, pct: 18 },
  { cat: 'Facilities',       amount:  58000, pct: 14 },
  { cat: 'Technology',       amount:  26000, pct:  6 },
  { cat: 'Other',            amount:  20000, pct:  5 },
];

export const LOGISTICS_EMPLOYEES: Employee[] = [
  { id: 'emp_l01', name: 'Dana Kowalski', email: 'dana@crestviewfreight.com',   department: 'Finance',    role: 'Controller'          },
  { id: 'emp_l02', name: 'Marcus Webb',   email: 'marcus@crestviewfreight.com', department: 'Finance',    role: 'AP Specialist'       },
  { id: 'emp_l03', name: 'Priya Nair',    email: 'priya@crestviewfreight.com',  department: 'Operations', role: 'Dispatch Manager'    },
  { id: 'emp_l04', name: 'Tomas Reyes',   email: 'tomas@crestviewfreight.com',  department: 'Warehouse',  role: 'Warehouse Supervisor'},
  { id: 'emp_l05', name: 'Sienna Park',   email: 'sienna@crestviewfreight.com', department: 'Sales',      role: 'Regional Sales Mgr'  },
  { id: 'emp_l06', name: 'Devon Osei',    email: 'devon@crestviewfreight.com',  department: 'IT',         role: 'Systems Administrator'},
  { id: 'emp_l07', name: 'Aaliyah Brooks',email: 'aaliyah@crestviewfreight.com',department: 'HR',         role: 'Office Manager'      },
  { id: 'emp_l08', name: 'Craig Tillman', email: 'craig@crestviewfreight.com',  department: 'Operations', role: 'Driver Coordinator'  },
];

export const LOGISTICS_EXPENSES: Expense[] = [
  { id: 'lexp_01', employee: 'emp_l03', category: 'Travel',       amount:  842.00, date: '2026-04-02', status: 'approved' },
  { id: 'lexp_02', employee: 'emp_l03', category: 'Meals',        amount:  124.40, date: '2026-04-03', status: 'approved' },
  { id: 'lexp_03', employee: 'emp_l03', category: 'Conferences',  amount: 1299.00, date: '2026-04-04', status: 'approved' },
  { id: 'lexp_04', employee: 'emp_l01', category: 'Travel',       amount: 1180.00, date: '2026-04-07', status: 'approved' },
  { id: 'lexp_05', employee: 'emp_l08', category: 'Fuel',         amount:   88.50, date: '2026-04-08', status: 'approved' },
  { id: 'lexp_06', employee: 'emp_l08', category: 'Fuel',         amount:   94.20, date: '2026-04-10', status: 'approved' },
  { id: 'lexp_07', employee: 'emp_l05', category: 'Meals',        amount:  342.00, date: '2026-04-11', status: 'approved' },
  { id: 'lexp_08', employee: 'emp_l02', category: 'Software',     amount:   59.00, date: '2026-04-12', status: 'approved' },
  { id: 'lexp_09', employee: 'emp_l06', category: 'Software',     amount:  128.00, date: '2026-04-14', status: 'approved' },
  { id: 'lexp_10', employee: 'emp_l04', category: 'Materials',    amount:  215.00, date: '2026-04-15', status: 'pending'  },
  { id: 'lexp_11', employee: 'emp_l05', category: 'Travel',       amount: 2240.00, date: '2026-04-15', status: 'pending'  },
  { id: 'lexp_12', employee: 'emp_l08', category: 'Training',     amount:  450.00, date: '2026-04-16', status: 'pending'  },
  { id: 'lexp_13', employee: 'emp_l01', category: 'Conferences',  amount: 2800.00, date: '2026-04-17', status: 'rejected' },
  { id: 'lexp_14', employee: 'emp_l03', category: 'Meals',        amount:   98.10, date: '2026-04-18', status: 'pending'  },
];

export const LOGISTICS_DEMO_PROMPTS = [
  { label: '/ap show overdue',       prompt: 'Show me all overdue AP — carrier, fuel, and customs invoices.' },
  { label: '/pay large · SkyLink',   prompt: 'Pay the SkyLink Air Freight invoice — it needs a second approver.' },
  { label: '/pay overdue batch',     prompt: 'Pay the overdue fuel and pallet invoices via ACH from our Ops Checking account.' },
  { label: '/automate net15-flag',   prompt: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
  { label: '/chart freight-vs-fuel', prompt: 'Visualize Q1 spend by vendor category.' },
  { label: '/crm sync paid→deal',    prompt: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
  { label: '/dupe sweep apex',       prompt: 'Scan the last 60 days of AP for likely duplicate invoices — check Apex Carrier especially.' },
];

export type DatasetKey = 'default' | 'logistics';

export const DEFAULT_DATA = {
  VENDORS,
  BILLS,
  AGING,
  CATEGORY_SPEND,
  EMPLOYEES,
  EXPENSES,
};

export const LOGISTICS_DATA = {
  VENDORS: LOGISTICS_VENDORS,
  BILLS:   LOGISTICS_BILLS,
  AGING:   LOGISTICS_AGING,
  CATEGORY_SPEND: LOGISTICS_CATEGORY_SPEND,
  EMPLOYEES: LOGISTICS_EMPLOYEES,
  EXPENSES:  LOGISTICS_EXPENSES,
};

export function getDataset(d?: DatasetKey) {
  return d === 'logistics' ? LOGISTICS_DATA : DEFAULT_DATA;
}
