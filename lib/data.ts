import type { Workspace } from './store';

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

export type BankAccount = {
  id: string;
  nickname: string;
  institution: string;
  last4: string;
  balance: number;
  role: 'operating' | 'reserve' | 'payroll';
  apy?: number;
};

export type ProjectionPoint = { day: string; balance: number };

export type LiquidityDriver = {
  date: string;
  label: string;
  amount: number;
  kind: 'inflow' | 'outflow';
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
  { id: 'bll_4196', vendor: 'vnd_01', invoice: 'INV-2026-04923', amount: 32000.00, due: '2026-05-18', status: 'scheduled',poRef: 'PO-44-245' },
  { id: 'bll_4197', vendor: 'vnd_12', invoice: 'PB-POL-Q2',      amount: 20000.00, due: '2026-05-26', status: 'scheduled',poRef: 'PO-44-250' },
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

// ─── New types ────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type Payment = {
  id: string;
  billId: string;
  vendorId: string;
  amount: number;
  method: 'ACH' | 'Check' | 'Wire';
  status: PaymentStatus;
  processedDate: string;
  confirmationId: string;
};

export type ApprovalPolicy = {
  id: string;
  name: string;
  type: 'amount' | 'always' | 'vendor';
  threshold?: number;
  approvers: string[];
  minApprovers: number;
};

export type CustomerStatus = 'active' | 'inactive';
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  terms: string;
  status: CustomerStatus;
};

export type LineItem = { description: string; quantity: number; unitPrice: number };

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type ArInvoice = {
  id: string;
  customerId: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: LineItem[];
};

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
export type Estimate = {
  id: string;
  customerId: string;
  amount: number;
  status: EstimateStatus;
  lineItems: LineItem[];
};

export type CardStatus = 'active' | 'frozen' | 'cancelled';
export type Card = {
  id: string;
  employeeId: string;
  last4: string;
  limit: number;
  spent: number;
  status: CardStatus;
  type: 'virtual' | 'physical';
};

export type Budget = {
  id: string;
  name: string;
  ownerId: string;
  limit: number;
  spent: number;
  resetInterval: 'monthly' | 'quarterly' | 'annually' | 'never';
  expiresAt?: string;
};

export type Transaction = {
  id: string;
  cardId: string;
  employeeId: string;
  amount: number;
  merchant: string;
  date: string;
  category: string;
  status: 'posted' | 'pending';
};

export type ReimbursementStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type Reimbursement = {
  id: string;
  employeeId: string;
  amount: number;
  description: string;
  status: ReimbursementStatus;
  submittedDate: string;
};

export type ChartOfAccount = {
  id: string;
  name: string;
  number: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  category: string;
  active: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
};

export type Role = {
  id: string;
  name: string;
  permissions: string[];
};

export type WebhookSubscription = {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
};

export type EventCatalogEntry = {
  id: string;
  name: string;
  description: string;
};

// ─── Shared org-level fixtures (same across datasets) ──────────────────

export const CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  { id: 'coa_1000', name: 'Cash and Cash Equivalents',  number: '1000', type: 'asset',     category: 'Current Assets',       active: true },
  { id: 'coa_1100', name: 'Accounts Receivable',         number: '1100', type: 'asset',     category: 'Current Assets',       active: true },
  { id: 'coa_1500', name: 'Prepaid Expenses',            number: '1500', type: 'asset',     category: 'Current Assets',       active: true },
  { id: 'coa_2000', name: 'Accounts Payable',            number: '2000', type: 'liability', category: 'Current Liabilities',  active: true },
  { id: 'coa_2100', name: 'Accrued Liabilities',         number: '2100', type: 'liability', category: 'Current Liabilities',  active: true },
  { id: 'coa_3000', name: 'Common Stock',                number: '3000', type: 'equity',    category: 'Equity',               active: true },
  { id: 'coa_3100', name: 'Retained Earnings',           number: '3100', type: 'equity',    category: 'Equity',               active: true },
  { id: 'coa_4000', name: 'Revenue',                     number: '4000', type: 'income',    category: 'Operating Revenue',    active: true },
  { id: 'coa_4100', name: 'Service Revenue',             number: '4100', type: 'income',    category: 'Operating Revenue',    active: true },
  { id: 'coa_5000', name: 'Cost of Goods Sold',          number: '5000', type: 'expense',   category: 'Cost of Revenue',      active: true },
  { id: 'coa_6000', name: 'Salaries & Wages',            number: '6000', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6100', name: 'Software & Subscriptions',    number: '6100', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6200', name: 'Marketing & Advertising',     number: '6200', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6300', name: 'Travel & Entertainment',      number: '6300', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6400', name: 'Professional Services',       number: '6400', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6500', name: 'Rent & Facilities',           number: '6500', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6600', name: 'Insurance',                   number: '6600', type: 'expense',   category: 'Operating Expenses',   active: true },
  { id: 'coa_6700', name: 'Utilities',                   number: '6700', type: 'expense',   category: 'Operating Expenses',   active: true },
];

export const ROLES: Role[] = [
  { id: 'role_admin',    name: 'Administrator', permissions: ['bills:read','bills:write','vendors:read','vendors:write','payments:read','payments:write','users:read','users:write','settings:write'] },
  { id: 'role_clerk',    name: 'Clerk',         permissions: ['bills:read','bills:write','vendors:read'] },
  { id: 'role_approver', name: 'Approver',      permissions: ['bills:read','bills:approve','payments:read'] },
  { id: 'role_viewer',   name: 'Viewer',        permissions: ['bills:read','vendors:read','payments:read','expenses:read'] },
];

export const EVENT_CATALOG: EventCatalogEntry[] = [
  { id: 'vendor.created',           name: 'Vendor created',           description: 'Fired when a new vendor is added' },
  { id: 'vendor.updated',           name: 'Vendor updated',           description: 'Fired when vendor details change' },
  { id: 'vendor.deleted',           name: 'Vendor deleted',           description: 'Fired when a vendor is removed' },
  { id: 'bill.created',             name: 'Bill created',             description: 'Fired when a new bill is created' },
  { id: 'bill.updated',             name: 'Bill updated',             description: 'Fired when a bill is modified' },
  { id: 'bill.approved',            name: 'Bill approved',            description: 'Fired when a bill clears approval' },
  { id: 'bill.rejected',            name: 'Bill rejected',            description: 'Fired when a bill is rejected' },
  { id: 'bill.paid',                name: 'Bill paid',                description: 'Fired when payment for a bill is processed' },
  { id: 'payment.created',          name: 'Payment created',          description: 'Fired when a payment is initiated' },
  { id: 'payment.updated',          name: 'Payment updated',          description: 'Fired when a payment status changes' },
  { id: 'invoice.created',          name: 'Invoice created',          description: 'Fired when an AR invoice is created' },
  { id: 'invoice.sent',             name: 'Invoice sent',             description: 'Fired when an AR invoice is sent to a customer' },
  { id: 'invoice.paid',             name: 'Invoice paid',             description: 'Fired when an AR invoice is marked paid' },
  { id: 'spend.transaction',        name: 'Card transaction',         description: 'Fired when a card transaction posts' },
  { id: 'spend.reimbursement',      name: 'Reimbursement submitted',  description: 'Fired when an employee submits a reimbursement' },
  { id: 'spend.threeDsChallenge',   name: '3DS challenge',            description: 'Fired when a card transaction triggers a 3DS challenge' },
];

// ─── Default dataset: tech-startup fixtures ────────────────────────────

export const PAYMENTS: Payment[] = [
  { id: 'pmt_5001', billId: 'bll_4183', vendorId: 'vnd_02', amount:  3214.55, method: 'ACH',   status: 'paid',       processedDate: '2026-04-10', confirmationId: 'ACH-8821-A' },
  { id: 'pmt_5002', billId: 'bll_4188', vendorId: 'vnd_07', amount:   318.72, method: 'Check', status: 'paid',       processedDate: '2026-04-12', confirmationId: 'CHK-0041'   },
  { id: 'pmt_5003', billId: 'bll_4182', vendorId: 'vnd_01', amount: 14820.00, method: 'ACH',   status: 'processing', processedDate: '2026-04-23', confirmationId: 'ACH-8904-B' },
  { id: 'pmt_5004', billId: 'bll_4186', vendorId: 'vnd_05', amount: 12000.00, method: 'ACH',   status: 'pending',    processedDate: '2026-04-25', confirmationId: ''           },
  { id: 'pmt_5005', billId: 'bll_4190', vendorId: 'vnd_09', amount: 18240.00, method: 'ACH',   status: 'paid',       processedDate: '2026-04-03', confirmationId: 'ACH-8771-C' },
  { id: 'pmt_5006', billId: 'bll_4195', vendorId: 'vnd_06', amount:  2150.00, method: 'Check', status: 'failed',     processedDate: '2026-04-17', confirmationId: ''           },
];

export const APPROVAL_POLICIES: ApprovalPolicy[] = [
  { id: 'pol_01', name: 'Large payment review',  type: 'amount',  threshold: 25000, approvers: ['usr_01', 'usr_02'], minApprovers: 2 },
  { id: 'pol_02', name: 'All bills require approval', type: 'always', approvers: ['usr_01'], minApprovers: 1 },
  { id: 'pol_03', name: 'Legal vendor gate',     type: 'vendor',  approvers: ['usr_01', 'usr_03'], minApprovers: 1 },
];

export const CUSTOMERS: Customer[] = [
  { id: 'cust_01', name: 'Techflow Corp',       email: 'ap@techflow.com',      phone: '415-555-0101', terms: 'Net 30', status: 'active' },
  { id: 'cust_02', name: 'Beacon Health LLC',   email: 'billing@beaconh.com',  phone: '212-555-0184', terms: 'Net 45', status: 'active' },
  { id: 'cust_03', name: 'Vantage Analytics',   email: 'finance@vantage.io',   phone: '650-555-0122', terms: 'Net 30', status: 'active' },
  { id: 'cust_04', name: 'Orion Retail Group',  email: 'accounts@orionrg.com', phone: '312-555-0199', terms: 'Net 15', status: 'active' },
  { id: 'cust_05', name: 'Summit Labs Inc',     email: 'ap@summitlabs.com',    phone: '408-555-0177', terms: 'Net 30', status: 'inactive' },
];

export const AR_INVOICES: ArInvoice[] = [
  { id: 'inv_2001', customerId: 'cust_01', amount: 38000.00, dueDate: '2026-05-01', status: 'paid',    lineItems: [{ description: 'Platform license Q2', quantity: 1, unitPrice: 38000 }] },
  { id: 'inv_2002', customerId: 'cust_02', amount: 28000.00, dueDate: '2026-05-22', status: 'sent',    lineItems: [{ description: 'Implementation services', quantity: 4, unitPrice: 7000 }] },
  { id: 'inv_2003', customerId: 'cust_03', amount: 12500.00, dueDate: '2026-04-30', status: 'overdue', lineItems: [{ description: 'Data analytics module', quantity: 1, unitPrice: 12500 }] },
  { id: 'inv_2004', customerId: 'cust_04', amount:  6200.00, dueDate: '2026-05-10', status: 'sent',    lineItems: [{ description: 'Setup & onboarding', quantity: 2, unitPrice: 3100 }] },
  { id: 'inv_2005', customerId: 'cust_01', amount: 38000.00, dueDate: '2026-07-31', status: 'draft',   lineItems: [{ description: 'Platform license Q3', quantity: 1, unitPrice: 38000 }] },
  { id: 'inv_2006', customerId: 'cust_02', amount:  4500.00, dueDate: '2026-04-15', status: 'void',    lineItems: [{ description: 'Support retainer (cancelled)', quantity: 1, unitPrice: 4500 }] },
];

export const ESTIMATES: Estimate[] = [
  { id: 'est_101', customerId: 'cust_03', amount: 18000.00, status: 'approved',  lineItems: [{ description: 'Enterprise upgrade', quantity: 1, unitPrice: 18000 }] },
  { id: 'est_102', customerId: 'cust_04', amount:  9500.00, status: 'sent',      lineItems: [{ description: 'Custom integration work', quantity: 5, unitPrice: 1900 }] },
  { id: 'est_103', customerId: 'cust_05', amount: 22000.00, status: 'draft',     lineItems: [{ description: 'Annual enterprise plan', quantity: 1, unitPrice: 22000 }] },
];

export const CARDS: Card[] = [
  { id: 'card_01', employeeId: 'emp_01', last4: '4411', limit: 5000,  spent: 1284.00, status: 'active',  type: 'virtual'  },
  { id: 'card_02', employeeId: 'emp_02', last4: '8820', limit: 10000, spent: 4822.40, status: 'active',  type: 'virtual'  },
  { id: 'card_03', employeeId: 'emp_03', last4: '3319', limit: 3000,  spent:  892.10, status: 'active',  type: 'physical' },
  { id: 'card_04', employeeId: 'emp_04', last4: '7701', limit: 2000,  spent:    0.00, status: 'frozen',  type: 'virtual'  },
  { id: 'card_05', employeeId: 'emp_05', last4: '5544', limit: 8000,  spent: 2340.00, status: 'active',  type: 'physical' },
];

export const BUDGETS: Budget[] = [
  { id: 'bgt_01', name: 'Marketing Q2',     ownerId: 'emp_02', limit: 20000, spent: 8822,  resetInterval: 'quarterly' },
  { id: 'bgt_02', name: 'Engineering tools', ownerId: 'emp_01', limit:  5000, spent: 1284,  resetInterval: 'monthly'   },
  { id: 'bgt_03', name: 'Sales travel',      ownerId: 'emp_03', limit:  8000, spent: 2240,  resetInterval: 'quarterly' },
  { id: 'bgt_04', name: 'Executive T&E',     ownerId: 'emp_05', limit: 15000, spent: 3940,  resetInterval: 'annually'  },
];

export const TRANSACTIONS: Transaction[] = [
  { id: 'txn_001', cardId: 'card_01', employeeId: 'emp_01', amount:  128.00, merchant: 'GitHub',            date: '2026-04-02', category: 'Software',  status: 'posted'  },
  { id: 'txn_002', cardId: 'card_01', employeeId: 'emp_01', amount:  642.55, merchant: 'Delta Airlines',    date: '2026-04-08', category: 'Travel',    status: 'posted'  },
  { id: 'txn_003', cardId: 'card_02', employeeId: 'emp_02', amount: 2400.00, merchant: 'Google Ads',        date: '2026-04-09', category: 'Ads',       status: 'posted'  },
  { id: 'txn_004', cardId: 'card_03', employeeId: 'emp_03', amount:   88.40, merchant: 'Nobu Restaurant',   date: '2026-04-11', category: 'Meals',     status: 'posted'  },
  { id: 'txn_005', cardId: 'card_03', employeeId: 'emp_03', amount: 1125.00, merchant: 'Marriott Hotels',   date: '2026-04-13', category: 'Travel',    status: 'posted'  },
  { id: 'txn_006', cardId: 'card_01', employeeId: 'emp_01', amount:   59.00, merchant: 'Figma',             date: '2026-04-15', category: 'Software',  status: 'posted'  },
  { id: 'txn_007', cardId: 'card_02', employeeId: 'emp_02', amount:  142.10, merchant: 'Prospect Kitchen',  date: '2026-04-17', category: 'Meals',     status: 'posted'  },
  { id: 'txn_008', cardId: 'card_05', employeeId: 'emp_05', amount:  340.00, merchant: 'Hilton Hotels',     date: '2026-04-19', category: 'Travel',    status: 'pending' },
];

export const REIMBURSEMENTS: Reimbursement[] = [
  { id: 'rei_01', employeeId: 'emp_04', amount:  182.50, description: 'Client dinner — Orion Retail',  status: 'approved', submittedDate: '2026-04-10' },
  { id: 'rei_02', employeeId: 'emp_01', amount:   45.00, description: 'Home office supplies',           status: 'pending',  submittedDate: '2026-04-16' },
  { id: 'rei_03', employeeId: 'emp_03', amount:  520.00, description: 'Conference registration',        status: 'rejected', submittedDate: '2026-04-08' },
  { id: 'rei_04', employeeId: 'emp_05', amount: 1899.00, description: 'SaaStr Annual ticket',           status: 'pending',  submittedDate: '2026-04-18' },
];

export const USERS: User[] = [
  { id: 'usr_01', name: 'Morgan Hughes',  email: 'morgan@company.com',  role: 'Administrator', status: 'active'   },
  { id: 'usr_02', name: 'Avery Chen',     email: 'avery@company.com',   role: 'Approver',      status: 'active'   },
  { id: 'usr_03', name: 'Jordan Patel',   email: 'jordan@company.com',  role: 'Clerk',         status: 'active'   },
  { id: 'usr_04', name: 'Riley Nakamura', email: 'riley@company.com',   role: 'Viewer',        status: 'active'   },
  { id: 'usr_05', name: 'Sam Okafor',     email: 'sam@company.com',     role: 'Viewer',        status: 'inactive' },
];

export const WEBHOOK_SUBSCRIPTIONS: WebhookSubscription[] = [
  { id: 'sub_01', url: 'https://hooks.company.com/bill/payments', events: ['payment.created', 'payment.updated', 'bill.paid'], createdAt: '2026-01-15' },
  { id: 'sub_02', url: 'https://hooks.company.com/bill/invoices', events: ['invoice.created', 'invoice.paid'], createdAt: '2026-02-08' },
];

// ─── Logistics dataset: new fixtures ──────────────────────────────────

export const LOGISTICS_PAYMENTS: Payment[] = [
  { id: 'lpmt_01', billId: 'lbl_001', vendorId: 'lvnd_02', amount: 18240.00, method: 'ACH',   status: 'paid',       processedDate: '2026-04-06', confirmationId: 'ACH-CF-9901' },
  { id: 'lpmt_02', billId: 'lbl_003', vendorId: 'lvnd_16', amount:  2840.00, method: 'Check', status: 'paid',       processedDate: '2026-04-10', confirmationId: 'CHK-CF-0021' },
  { id: 'lpmt_03', billId: 'lbl_004', vendorId: 'lvnd_14', amount:  5820.00, method: 'ACH',   status: 'processing', processedDate: '2026-04-20', confirmationId: 'ACH-CF-9944' },
  { id: 'lpmt_04', billId: 'lbl_005', vendorId: 'lvnd_07', amount: 22800.00, method: 'ACH',   status: 'pending',    processedDate: '2026-04-21', confirmationId: ''            },
  { id: 'lpmt_05', billId: 'lbl_006', vendorId: 'lvnd_15', amount: 28400.00, method: 'Wire',  status: 'paid',       processedDate: '2026-03-20', confirmationId: 'WIR-CF-0018' },
  { id: 'lpmt_06', billId: 'lbl_002', vendorId: 'lvnd_01', amount: 14200.00, method: 'ACH',   status: 'failed',     processedDate: '2026-04-18', confirmationId: ''            },
];

export const LOGISTICS_APPROVAL_POLICIES: ApprovalPolicy[] = [
  { id: 'lpol_01', name: 'Large carrier payment', type: 'amount',  threshold: 20000, approvers: ['lusr_01', 'lusr_02'], minApprovers: 2 },
  { id: 'lpol_02', name: 'All AP bills',           type: 'always',                   approvers: ['lusr_01'],            minApprovers: 1 },
  { id: 'lpol_03', name: 'International freight',  type: 'vendor',                   approvers: ['lusr_01', 'lusr_03'], minApprovers: 1 },
];

export const LOGISTICS_CUSTOMERS: Customer[] = [
  { id: 'lcust_01', name: 'Beacon Health LLC',     email: 'logistics@beaconh.com',   phone: '212-555-0184', terms: 'Net 30', status: 'active' },
  { id: 'lcust_02', name: 'Northgate Retail Corp', email: 'ap@northgateretail.com',  phone: '773-555-0141', terms: 'Net 30', status: 'active' },
  { id: 'lcust_03', name: 'Horizon Manufacturing', email: 'finance@horizonmfg.com',  phone: '313-555-0188', terms: 'Net 45', status: 'active' },
  { id: 'lcust_04', name: 'Pacific Distributors',  email: 'billing@pacdist.com',     phone: '206-555-0122', terms: 'Net 15', status: 'active' },
  { id: 'lcust_05', name: 'Atlas Grocery Chain',   email: 'ap@atlasgrocery.com',     phone: '602-555-0199', terms: 'Net 30', status: 'inactive' },
];

export const LOGISTICS_AR_INVOICES: ArInvoice[] = [
  { id: 'linv_01', customerId: 'lcust_01', amount: 42000.00, dueDate: '2026-05-01', status: 'sent',    lineItems: [{ description: 'LTL freight services April', quantity: 1, unitPrice: 42000 }] },
  { id: 'linv_02', customerId: 'lcust_02', amount: 28500.00, dueDate: '2026-04-28', status: 'overdue', lineItems: [{ description: 'Warehouse storage March', quantity: 3, unitPrice: 9500 }] },
  { id: 'linv_03', customerId: 'lcust_03', amount: 61000.00, dueDate: '2026-05-15', status: 'sent',    lineItems: [{ description: 'Dedicated fleet Q2', quantity: 1, unitPrice: 61000 }] },
  { id: 'linv_04', customerId: 'lcust_04', amount: 18200.00, dueDate: '2026-05-10', status: 'draft',   lineItems: [{ description: 'Last-mile delivery batch', quantity: 20, unitPrice: 910 }] },
  { id: 'linv_05', customerId: 'lcust_01', amount: 38000.00, dueDate: '2026-03-15', status: 'paid',    lineItems: [{ description: 'LTL freight services March', quantity: 1, unitPrice: 38000 }] },
];

export const LOGISTICS_ESTIMATES: Estimate[] = [
  { id: 'lest_01', customerId: 'lcust_03', amount: 74000.00, status: 'sent',     lineItems: [{ description: 'Dedicated fleet contract Q3', quantity: 1, unitPrice: 74000 }] },
  { id: 'lest_02', customerId: 'lcust_02', amount: 32000.00, status: 'approved', lineItems: [{ description: 'Warehousing expansion — 6 months', quantity: 6, unitPrice: 5333 }] },
  { id: 'lest_03', customerId: 'lcust_05', amount: 15000.00, status: 'draft',    lineItems: [{ description: 'Last-mile pilot program', quantity: 1, unitPrice: 15000 }] },
];

export const LOGISTICS_CARDS: Card[] = [
  { id: 'lcard_01', employeeId: 'emp_l01', last4: '2291', limit: 10000, spent: 1180.00, status: 'active',  type: 'virtual'  },
  { id: 'lcard_02', employeeId: 'emp_l02', last4: '7714', limit:  5000, spent:   59.00, status: 'active',  type: 'virtual'  },
  { id: 'lcard_03', employeeId: 'emp_l03', last4: '3308', limit:  8000, spent: 2265.00, status: 'active',  type: 'physical' },
  { id: 'lcard_04', employeeId: 'emp_l05', last4: '9941', limit: 12000, spent: 2582.00, status: 'active',  type: 'physical' },
  { id: 'lcard_05', employeeId: 'emp_l08', last4: '6612', limit:  3000, spent:  182.70, status: 'active',  type: 'physical' },
  { id: 'lcard_06', employeeId: 'emp_l04', last4: '4420', limit:  2000, spent:    0.00, status: 'frozen',  type: 'virtual'  },
];

export const LOGISTICS_BUDGETS: Budget[] = [
  { id: 'lbgt_01', name: 'Driver fuel & expenses', ownerId: 'emp_l08', limit: 12000, spent: 1840,  resetInterval: 'monthly'   },
  { id: 'lbgt_02', name: 'Sales T&E',              ownerId: 'emp_l05', limit: 20000, spent: 4822,  resetInterval: 'quarterly' },
  { id: 'lbgt_03', name: 'IT & software',          ownerId: 'emp_l06', limit:  8000, spent: 1287,  resetInterval: 'annually'  },
  { id: 'lbgt_04', name: 'Operations misc',        ownerId: 'emp_l03', limit:  5000, spent:  342,  resetInterval: 'monthly'   },
];

export const LOGISTICS_TRANSACTIONS: Transaction[] = [
  { id: 'ltxn_01', cardId: 'lcard_01', employeeId: 'emp_l01', amount: 1180.00, merchant: 'United Airlines',  date: '2026-04-07', category: 'Travel',   status: 'posted'  },
  { id: 'ltxn_02', cardId: 'lcard_02', employeeId: 'emp_l02', amount:   59.00, merchant: 'Microsoft 365',    date: '2026-04-12', category: 'Software', status: 'posted'  },
  { id: 'ltxn_03', cardId: 'lcard_03', employeeId: 'emp_l03', amount:  842.00, merchant: 'Delta Airlines',   date: '2026-04-02', category: 'Travel',   status: 'posted'  },
  { id: 'ltxn_04', cardId: 'lcard_03', employeeId: 'emp_l03', amount:  124.40, merchant: 'Applebee\'s',      date: '2026-04-03', category: 'Meals',    status: 'posted'  },
  { id: 'ltxn_05', cardId: 'lcard_03', employeeId: 'emp_l03', amount: 1299.00, merchant: 'Manifest 2026',    date: '2026-04-04', category: 'Conferences', status: 'posted' },
  { id: 'ltxn_06', cardId: 'lcard_04', employeeId: 'emp_l05', amount:  342.00, merchant: 'Fleming\'s Steak', date: '2026-04-11', category: 'Meals',    status: 'posted'  },
  { id: 'ltxn_07', cardId: 'lcard_04', employeeId: 'emp_l05', amount: 2240.00, merchant: 'Hyatt Hotels',     date: '2026-04-15', category: 'Travel',   status: 'posted'  },
  { id: 'ltxn_08', cardId: 'lcard_05', employeeId: 'emp_l08', amount:   88.50, merchant: 'Pilot Flying J',   date: '2026-04-08', category: 'Fuel',     status: 'posted'  },
  { id: 'ltxn_09', cardId: 'lcard_05', employeeId: 'emp_l08', amount:   94.20, merchant: 'Love\'s Travel',   date: '2026-04-10', category: 'Fuel',     status: 'posted'  },
  { id: 'ltxn_10', cardId: 'lcard_04', employeeId: 'emp_l05', amount:  215.00, merchant: 'Home Depot',       date: '2026-04-15', category: 'Materials',status: 'pending' },
];

export const LOGISTICS_REIMBURSEMENTS: Reimbursement[] = [
  { id: 'lrei_01', employeeId: 'emp_l03', amount:  450.00, description: 'FreightWaves conference',          status: 'approved', submittedDate: '2026-04-06' },
  { id: 'lrei_02', employeeId: 'emp_l08', amount:   94.20, description: 'Fuel — personal card emergency',   status: 'pending',  submittedDate: '2026-04-10' },
  { id: 'lrei_03', employeeId: 'emp_l01', amount: 2800.00, description: 'Industry summit registration',     status: 'rejected', submittedDate: '2026-04-18' },
  { id: 'lrei_04', employeeId: 'emp_l05', amount:  185.00, description: 'Client dinner — Pacific Dist.',    status: 'pending',  submittedDate: '2026-04-19' },
];

export const LOGISTICS_USERS: User[] = [
  { id: 'lusr_01', name: 'Dana Kowalski',  email: 'dana@crestviewfreight.com',   role: 'Administrator', status: 'active'   },
  { id: 'lusr_02', name: 'Marcus Webb',    email: 'marcus@crestviewfreight.com', role: 'Approver',      status: 'active'   },
  { id: 'lusr_03', name: 'Priya Nair',     email: 'priya@crestviewfreight.com',  role: 'Approver',      status: 'active'   },
  { id: 'lusr_04', name: 'Devon Osei',     email: 'devon@crestviewfreight.com',  role: 'Clerk',         status: 'active'   },
  { id: 'lusr_05', name: 'Aaliyah Brooks', email: 'aaliyah@crestviewfreight.com',role: 'Viewer',        status: 'active'   },
];

export const LOGISTICS_WEBHOOK_SUBSCRIPTIONS: WebhookSubscription[] = [
  { id: 'lsub_01', url: 'https://hooks.crestviewfreight.com/bill', events: ['payment.created', 'payment.updated', 'bill.paid', 'bill.approved'], createdAt: '2026-02-01' },
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

export const BANK_ACCOUNTS: BankAccount[] = [
  { id: 'acct_ops',     nickname: 'Ops Checking',       institution: 'Chase Business',  last4: '4821', balance: 142000,  role: 'operating' },
  { id: 'acct_reserve', nickname: 'Chase Reserve Savings', institution: 'Chase Business', last4: '7732', balance: 1240000, role: 'reserve', apy: 0.03 },
  { id: 'acct_payroll', nickname: 'Payroll Account',    institution: 'Chase Business',  last4: '9103', balance: 287500,  role: 'payroll' },
];

export const LIQUIDITY_THRESHOLD = 50000;

// 61 contiguous daily points: Apr 20 → Jun 19. Min = $48,200 on 2026-05-24 (below $50K floor by $1,800).
export const LIQUIDITY_PROJECTION: ProjectionPoint[] = [
  { day: '2026-04-20', balance: 142000 },
  { day: '2026-04-21', balance: 142000 },
  { day: '2026-04-22', balance: 142000 },
  { day: '2026-04-23', balance: 142000 },
  { day: '2026-04-24', balance: 109800 },
  { day: '2026-04-25', balance: 109800 },
  { day: '2026-04-26', balance: 109800 },
  { day: '2026-04-27', balance: 109800 },
  { day: '2026-04-28', balance: 85000  },
  { day: '2026-04-29', balance: 85000  },
  { day: '2026-04-30', balance: 85000  },
  { day: '2026-05-01', balance: 123000 },
  { day: '2026-05-02', balance: 81000  },
  { day: '2026-05-03', balance: 81000  },
  { day: '2026-05-04', balance: 81000  },
  { day: '2026-05-05', balance: 81000  },
  { day: '2026-05-06', balance: 81000  },
  { day: '2026-05-07', balance: 81000  },
  { day: '2026-05-08', balance: 69000  },
  { day: '2026-05-09', balance: 69000  },
  { day: '2026-05-10', balance: 69000  },
  { day: '2026-05-11', balance: 69000  },
  { day: '2026-05-12', balance: 69000  },
  { day: '2026-05-13', balance: 69000  },
  { day: '2026-05-14', balance: 69000  },
  { day: '2026-05-15', balance: 53000  },
  { day: '2026-05-16', balance: 53000  },
  { day: '2026-05-17', balance: 53000  },
  { day: '2026-05-18', balance: 53000  },
  { day: '2026-05-19', balance: 53000  },
  { day: '2026-05-20', balance: 53000  },
  { day: '2026-05-21', balance: 53000  },
  { day: '2026-05-22', balance: 81000  },
  { day: '2026-05-23', balance: 81000  },
  { day: '2026-05-24', balance: 48200  },
  { day: '2026-05-25', balance: 48200  },
  { day: '2026-05-26', balance: 48200  },
  { day: '2026-05-27', balance: 48200  },
  { day: '2026-05-28', balance: 48200  },
  { day: '2026-05-29', balance: 48200  },
  { day: '2026-05-30', balance: 48200  },
  { day: '2026-05-31', balance: 48200  },
  { day: '2026-06-01', balance: 48200  },
  { day: '2026-06-02', balance: 48200  },
  { day: '2026-06-03', balance: 72200  },
  { day: '2026-06-04', balance: 72200  },
  { day: '2026-06-05', balance: 72200  },
  { day: '2026-06-06', balance: 72200  },
  { day: '2026-06-07', balance: 72200  },
  { day: '2026-06-08', balance: 72200  },
  { day: '2026-06-09', balance: 72200  },
  { day: '2026-06-10', balance: 64200  },
  { day: '2026-06-11', balance: 64200  },
  { day: '2026-06-12', balance: 64200  },
  { day: '2026-06-13', balance: 64200  },
  { day: '2026-06-14', balance: 64200  },
  { day: '2026-06-15', balance: 76200  },
  { day: '2026-06-16', balance: 76200  },
  { day: '2026-06-17', balance: 74000  },
  { day: '2026-06-18', balance: 74000  },
  { day: '2026-06-19', balance: 74000  },
];

export const LIQUIDITY_DRIVERS: LiquidityDriver[] = [
  { date: '2026-05-02', label: 'AWS Infrastructure (Q2)',         amount: -42000, kind: 'outflow' },
  { date: '2026-05-24', label: 'SaaS renewal batch',              amount: -32800, kind: 'outflow' },
  { date: '2026-04-28', label: 'Bluestone Marketing (retainer)',  amount: -24800, kind: 'outflow' },
  { date: '2026-05-01', label: 'AR — Techflow Corp',              amount:  38000, kind: 'inflow'  },
  { date: '2026-05-22', label: 'AR — Beacon Health',              amount:  28000, kind: 'inflow'  },
];

export const DEMO_PROMPTS = [
  { label: '/ap show overdue',     prompt: 'Show me all overdue AP across every vendor, grouped by urgency.' },
  { label: '/pay large · 2nd approver', prompt: 'Pay the Q1 professional services invoices from Crestline Legal and Fulton & Hart.' },
  { label: '/pay batch',            prompt: 'Pay the 3 overdue invoices via ACH from our Ops Checking account.' },
  { label: '/automate net15-flag',  prompt: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
  { label: '/chart vendor-spend',   prompt: 'Visualize Q1 spend by vendor category.' },
  { label: '/crm sync paid→deal',   prompt: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
  { label: '/dupe sweep',           prompt: 'Scan the last 60 days of AP for likely duplicate invoices and list them.' },
  { label: 'Cash runway',           prompt: "What's our cash runway look like?" },
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

export const LOGISTICS_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'acct_ops',     nickname: 'BILL Cash Reserve Account',  institution: 'BILL Financial',  last4: '3317', balance: 218000, role: 'operating' },
  { id: 'acct_reserve', nickname: 'Chase Checking',     institution: 'Chase Business',  last4: '8841', balance: 890000, role: 'reserve', apy: 0.03 },
  { id: 'acct_payroll', nickname: 'Payroll Account',    institution: 'Bank of America', last4: '6604', balance: 312000, role: 'payroll' },
];

export const LOGISTICS_LIQUIDITY_THRESHOLD = 75000;

// 61 daily points. Min = $84K on May 20 (above $75K floor by $9K — close call).
export const LOGISTICS_LIQUIDITY_PROJECTION: ProjectionPoint[] = [
  { day: '2026-04-20', balance: 218000 },
  { day: '2026-04-21', balance: 218000 },
  { day: '2026-04-22', balance: 218000 },
  { day: '2026-04-23', balance: 218000 },
  { day: '2026-04-24', balance: 218000 },
  { day: '2026-04-25', balance: 218000 },
  { day: '2026-04-26', balance: 206000 },
  { day: '2026-04-27', balance: 206000 },
  { day: '2026-04-28', balance: 206000 },
  { day: '2026-04-29', balance: 206000 },
  { day: '2026-04-30', balance: 206000 },
  { day: '2026-05-01', balance: 244000 },
  { day: '2026-05-02', balance: 244000 },
  { day: '2026-05-03', balance: 244000 },
  { day: '2026-05-04', balance: 244000 },
  { day: '2026-05-05', balance: 244000 },
  { day: '2026-05-06', balance: 244000 },
  { day: '2026-05-07', balance: 202000 },
  { day: '2026-05-08', balance: 202000 },
  { day: '2026-05-09', balance: 202000 },
  { day: '2026-05-10', balance: 183800 },
  { day: '2026-05-11', balance: 183800 },
  { day: '2026-05-12', balance: 159200 },
  { day: '2026-05-13', balance: 159200 },
  { day: '2026-05-14', balance: 159200 },
  { day: '2026-05-15', balance: 125200 },
  { day: '2026-05-16', balance: 125200 },
  { day: '2026-05-17', balance: 125200 },
  { day: '2026-05-18', balance: 106200 },
  { day: '2026-05-19', balance: 106200 },
  { day: '2026-05-20', balance: 84000  },
  { day: '2026-05-21', balance: 84000  },
  { day: '2026-05-22', balance: 84000  },
  { day: '2026-05-23', balance: 84000  },
  { day: '2026-05-24', balance: 84000  },
  { day: '2026-05-25', balance: 84000  },
  { day: '2026-05-26', balance: 84000  },
  { day: '2026-05-27', balance: 84000  },
  { day: '2026-05-28', balance: 102000 },
  { day: '2026-05-29', balance: 102000 },
  { day: '2026-05-30', balance: 102000 },
  { day: '2026-05-31', balance: 102000 },
  { day: '2026-06-01', balance: 102000 },
  { day: '2026-06-02', balance: 102000 },
  { day: '2026-06-03', balance: 102000 },
  { day: '2026-06-04', balance: 102000 },
  { day: '2026-06-05', balance: 88000  },
  { day: '2026-06-06', balance: 88000  },
  { day: '2026-06-07', balance: 88000  },
  { day: '2026-06-08', balance: 88000  },
  { day: '2026-06-09', balance: 88000  },
  { day: '2026-06-10', balance: 88000  },
  { day: '2026-06-11', balance: 88000  },
  { day: '2026-06-12', balance: 96000  },
  { day: '2026-06-13', balance: 96000  },
  { day: '2026-06-14', balance: 96000  },
  { day: '2026-06-15', balance: 96000  },
  { day: '2026-06-16', balance: 96000  },
  { day: '2026-06-17', balance: 96000  },
  { day: '2026-06-18', balance: 96000  },
  { day: '2026-06-19', balance: 79000  },
];

export const LOGISTICS_LIQUIDITY_DRIVERS: LiquidityDriver[] = [
  { date: '2026-05-07', label: 'SkyLink Carriers invoice',  amount: -42000, kind: 'outflow' },
  { date: '2026-05-15', label: 'Payroll top-up (102 FTE)',  amount: -34000, kind: 'outflow' },
  { date: '2026-05-12', label: 'Fleet lease — 12 units',    amount: -24600, kind: 'outflow' },
  { date: '2026-05-01', label: 'AR — Beacon Health',        amount:  38000, kind: 'inflow'  },
  { date: '2026-05-10', label: 'MidWest Fuel (monthly)',    amount: -18200, kind: 'outflow' },
];

export const LOGISTICS_DEMO_PROMPTS = [
  { label: '/ap show overdue',       prompt: 'Show me all overdue AP — carrier, fuel, and customs invoices.' },
  { label: '/pay large · SkyLink',   prompt: 'Pay the SkyLink Air Freight invoice — it needs a second approver.' },
  { label: '/pay overdue batch',     prompt: 'Pay the overdue fuel and pallet invoices via ACH from our Ops Checking account.' },
  { label: '/automate net15-flag',   prompt: 'Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.' },
  { label: '/chart freight-vs-fuel', prompt: 'Visualize Q1 spend by vendor category.' },
  { label: '/crm sync paid→deal',    prompt: 'When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.' },
  { label: '/dupe sweep apex',       prompt: 'Scan the last 60 days of AP for likely duplicate invoices — check Apex Carrier especially.' },
  { label: 'Cash runway',            prompt: "What's our cash runway?" },
];

export type DatasetKey = 'default' | 'logistics';

export const DEFAULT_DATA = {
  VENDORS,
  BILLS,
  AGING,
  CATEGORY_SPEND,
  EMPLOYEES,
  EXPENSES,
  bankAccounts: BANK_ACCOUNTS,
  liquidityProjection: LIQUIDITY_PROJECTION,
  liquidityDrivers: LIQUIDITY_DRIVERS,
  liquidityThreshold: LIQUIDITY_THRESHOLD,
  PAYMENTS,
  APPROVAL_POLICIES,
  CUSTOMERS,
  AR_INVOICES,
  ESTIMATES,
  CARDS,
  BUDGETS,
  TRANSACTIONS,
  REIMBURSEMENTS,
  USERS,
  CHART_OF_ACCOUNTS,
  ROLES,
  WEBHOOK_SUBSCRIPTIONS,
  EVENT_CATALOG,
};

export const LOGISTICS_DATA = {
  VENDORS: LOGISTICS_VENDORS,
  BILLS:   LOGISTICS_BILLS,
  AGING:   LOGISTICS_AGING,
  CATEGORY_SPEND: LOGISTICS_CATEGORY_SPEND,
  EMPLOYEES: LOGISTICS_EMPLOYEES,
  EXPENSES:  LOGISTICS_EXPENSES,
  bankAccounts: LOGISTICS_BANK_ACCOUNTS,
  liquidityProjection: LOGISTICS_LIQUIDITY_PROJECTION,
  liquidityDrivers: LOGISTICS_LIQUIDITY_DRIVERS,
  liquidityThreshold: LOGISTICS_LIQUIDITY_THRESHOLD,
  PAYMENTS: LOGISTICS_PAYMENTS,
  APPROVAL_POLICIES: LOGISTICS_APPROVAL_POLICIES,
  CUSTOMERS: LOGISTICS_CUSTOMERS,
  AR_INVOICES: LOGISTICS_AR_INVOICES,
  ESTIMATES: LOGISTICS_ESTIMATES,
  CARDS: LOGISTICS_CARDS,
  BUDGETS: LOGISTICS_BUDGETS,
  TRANSACTIONS: LOGISTICS_TRANSACTIONS,
  REIMBURSEMENTS: LOGISTICS_REIMBURSEMENTS,
  USERS: LOGISTICS_USERS,
  CHART_OF_ACCOUNTS,
  ROLES,
  WEBHOOK_SUBSCRIPTIONS: LOGISTICS_WEBHOOK_SUBSCRIPTIONS,
  EVENT_CATALOG,
};

export function getDataset(d?: DatasetKey) {
  return d === 'logistics' ? LOGISTICS_DATA : DEFAULT_DATA;
}

const WS_SEED_BASE = 1714000000000;

export const SEED_WORKSPACES: Workspace[] = [
  {
    id: 'ws_seed_q1_budget',
    name: 'Q1 Budget Review',
    icon: '📊',
    color: 'oklch(0.78 0.10 195)',
    createdAt: WS_SEED_BASE,
    threads: [
      {
        id: 'thr_seed_q1_variance',
        title: 'March variance analysis',
        createdAt: WS_SEED_BASE + 1000,
        turns: [],
        artifacts: [{
          id: 'art_seed_q1_chart',
          kind: 'spend-chart',
          label: 'Q1 Variance by Dept',
          status: 'active',
          version: 1,
          createdBy: 'agent',
        }],
        selectedBills: [],
        approvalStates: {},
        approvalPayloads: {},
        billProduct: 'ap',
      },
      {
        id: 'thr_seed_q1_headcount',
        title: 'Headcount cost model',
        createdAt: WS_SEED_BASE + 2000,
        turns: [],
        artifacts: [],
        selectedBills: [],
        approvalStates: {},
        approvalPayloads: {},
        billProduct: 'ap',
      },
    ],
    files: [
      {
        id: 'wsf_seed_q1_workbook',
        name: 'Q1_Budget_Workbook.xlsx',
        kind: 'spreadsheet',
        createdAt: WS_SEED_BASE,
      },
    ],
  },
  {
    id: 'ws_seed_ap_march',
    name: 'AP – March Close',
    icon: '📋',
    color: 'oklch(0.80 0.08 70)',
    createdAt: WS_SEED_BASE + 3000,
    threads: [
      {
        id: 'thr_seed_ap_recon',
        title: 'Vendor reconciliation',
        createdAt: WS_SEED_BASE + 4000,
        turns: [],
        artifacts: [{
          id: 'art_seed_ap_aging',
          kind: 'ap-table',
          label: 'AP Aging Report',
          status: 'active',
          version: 1,
          createdBy: 'agent',
        }],
        selectedBills: [],
        approvalStates: {},
        approvalPayloads: {},
        billProduct: 'ap',
      },
      {
        id: 'thr_seed_ap_accruals',
        title: 'Accruals review',
        createdAt: WS_SEED_BASE + 5000,
        turns: [],
        artifacts: [],
        selectedBills: [],
        approvalStates: {},
        approvalPayloads: {},
        billProduct: 'ap',
      },
    ],
    files: [
      {
        id: 'wsf_seed_ap_close',
        name: 'March_AP_Close.xlsx',
        kind: 'spreadsheet',
        createdAt: WS_SEED_BASE + 3000,
      },
    ],
  },
  {
    id: 'ws_seed_fpa_monthly',
    name: 'FP&A Monthly',
    icon: '📈',
    color: 'oklch(0.80 0.10 155)',
    createdAt: WS_SEED_BASE + 6000,
    threads: [
      {
        id: 'thr_seed_fpa_revenue',
        title: 'Revenue forecast update',
        createdAt: WS_SEED_BASE + 7000,
        turns: [],
        artifacts: [],
        selectedBills: [],
        approvalStates: {},
        approvalPayloads: {},
        billProduct: 'ap',
      },
    ],
    files: [],
  },
];
