import { getDataset, type DatasetKey } from './data';
import { fmtMoneyShort } from './format';

import {
  apList,
  apAgingSummary,
  apCategorySpend,
  apFindDuplicateInvoices,
  apStagePaymentBatch,
  apSubmitPaymentBatch,
  apCreateAutomationRule,
  apReadBill,
  apReadVendor,
  apListPayments,
  apReadPayment,
  apGetPaymentOptions,
  apGetExchangeRate,
  apListApprovalPolicies,
  apCreateBill,
  apUpdateBill,
  apDeleteBill,
  apApproveBill,
  apRejectBill,
  apCreateVendor,
  apUpdateVendor,
  apCreateVendorBankAccount,
  apCreateApprovalPolicy,
  apUpdateApprovalPolicy,
  type ApFilter,
} from './bill/ap';
import {
  seRequest,
  seListExpenses,
  seGetEmployee,
  seListEmployees,
  seListCards,
  seGetCard,
  seListBudgets,
  seGetBudget,
  seListTransactions,
  seGetTransaction,
  seListReimbursements,
  seApproveExpense,
  seRejectExpense,
  seCreateCard,
  seUpdateCard,
  seCreateBudget,
  seUpdateBudget,
  seCreateReimbursement,
  seApproveReimbursement,
  type SeExpenseFilter,
} from './bill/se';
import {
  arListCustomers,
  arReadCustomer,
  arListInvoices,
  arReadInvoice,
  arListEstimates,
  arCreateCustomer,
  arUpdateCustomer,
  arCreateInvoice,
  arUpdateInvoice,
  arDeleteInvoice,
  arCreateEstimate,
  arConvertEstimateToInvoice,
} from './bill/ar';
import {
  orgListUsers,
  orgGetUser,
  orgListRoles,
  orgListFundingAccounts,
  orgGetFundingAccount,
  orgListChartOfAccounts,
  orgListWebhookSubscriptions,
  orgListEventCatalog,
  orgCreateChartOfAccount,
  orgCreateWebhookSubscription,
} from './bill/org';
import type { FlowStep } from './flows';

export type ToolDef = {
  name: string;
  label: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
};

export type ToolContext = {
  mode?: 'demo' | 'testing';
  billEnvId?: string;
  billProduct?: 'ap' | 'se';
  demoDataset?: DatasetKey;
};

type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];

export const DEMO_SANDBOX_ENV_ID = '__demo_sandbox__';

// ─── Tool definitions ─────────────────────────────────────────────────

export const READ_TOOLS: ToolDef[] = [
  {
    name: 'list_bills',
    label: 'List bills',
    description: 'List accounts-payable bills from the BILL workspace. Optionally filter by status or vendor.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['overdue', 'due-soon', 'open', 'scheduled', 'all'],
          description: 'Filter by bill status',
        },
        vendorId: { type: 'string', description: 'Filter by vendor id (vnd_XX)' },
      },
    },
  },
  {
    name: 'list_vendors',
    label: 'List vendors',
    description: 'List all active vendors in the BILL workspace.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_aging_summary',
    label: 'Get aging summary',
    description: 'Get an aging-bucket summary of open accounts payable.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_category_spend',
    label: 'Get category spend',
    description: 'Get total paid spend grouped by vendor category for a named period.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'e.g. "Q1 2026"', default: 'Q1 2026' },
      },
    },
  },
  {
    name: 'find_duplicate_invoices',
    label: 'Find duplicate invoices',
    description: 'Scan recent bills for likely duplicates using fuzzy invoice-number matching.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'integer', default: 60 },
      },
    },
  },
  {
    name: 'get_liquidity_projection',
    label: 'Get liquidity projection',
    description: 'Project operating-account cash balance forward using scheduled AP, payroll, and AR.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Projection horizon in days (default 60, max 120).' },
        threshold: { type: 'number', description: 'Low-balance floor in dollars (default from dataset).' },
      },
    },
  },
  {
    name: 'list_expenses',
    label: 'List expenses',
    description: 'List expense reports or card transactions from Bill Spend & Expense. Optionally filter by employee or status.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Filter by employee id' },
        status: { type: 'string', description: 'Filter by expense status (e.g. approved, pending)' },
      },
    },
  },
  {
    name: 'get_employee',
    label: 'Get employee',
    description: 'Get a single Bill Spend & Expense employee by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Employee id' },
      },
      required: ['id'],
    },
  },
  // ── AP — Bills detail & management ──
  {
    name: 'get_bill',
    label: 'Get bill',
    description: 'Fetch full detail for a single accounts-payable bill by id, including line items and approval history.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'Bill id (bll_XX)' },
      },
      required: ['billId'],
    },
  },
  {
    name: 'get_vendor',
    label: 'Get vendor',
    description: 'Fetch full profile for a single vendor by id.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id (vnd_XX)' },
      },
      required: ['vendorId'],
    },
  },
  {
    name: 'list_vendor_bank_accounts',
    label: 'List vendor bank accounts',
    description: 'List bank accounts on file for a vendor.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id (vnd_XX)' },
      },
      required: ['vendorId'],
    },
  },
  // ── AP — Payments ──
  {
    name: 'list_payments',
    label: 'List payments',
    description: 'List outgoing AP payments. Optionally filter by vendor, status, or date range.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Filter by vendor id' },
        status: { type: 'string', enum: ['pending', 'processing', 'paid', 'failed', 'all'], description: 'Filter by payment status' },
        startDate: { type: 'string', description: 'ISO date lower bound (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'ISO date upper bound (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'get_payment',
    label: 'Get payment',
    description: 'Fetch full detail for a single outgoing payment by id.',
    parameters: {
      type: 'object',
      properties: {
        paymentId: { type: 'string', description: 'Payment id' },
      },
      required: ['paymentId'],
    },
  },
  {
    name: 'get_payment_options',
    label: 'Get payment options',
    description: 'Get available payment methods and estimated delivery times for a vendor.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id' },
      },
      required: ['vendorId'],
    },
  },
  {
    name: 'get_exchange_rate',
    label: 'Get exchange rate',
    description: 'Get the current FX exchange rate for international vendor payments.',
    parameters: {
      type: 'object',
      properties: {
        currency: { type: 'string', description: 'ISO 4217 currency code, e.g. EUR, GBP, CAD' },
      },
      required: ['currency'],
    },
  },
  // ── AP — Approval policies ──
  {
    name: 'list_approval_policies',
    label: 'List approval policies',
    description: 'List bill approval policies configured in the BILL workspace.',
    parameters: { type: 'object', properties: {} },
  },
  // ── AR — Customers ──
  {
    name: 'list_customers',
    label: 'List customers',
    description: 'List accounts-receivable customers in the BILL workspace.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'all'], description: 'Filter by customer status' },
      },
    },
  },
  {
    name: 'get_customer',
    label: 'Get customer',
    description: 'Fetch full profile for a single AR customer by id.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer id (cust_XX)' },
      },
      required: ['customerId'],
    },
  },
  // ── AR — Invoices ──
  {
    name: 'list_invoices',
    label: 'List invoices',
    description: 'List outgoing AR invoices. Optionally filter by customer, status, or date range.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Filter by customer id' },
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'void', 'all'], description: 'Filter by invoice status' },
        startDate: { type: 'string', description: 'ISO date lower bound (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'ISO date upper bound (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'get_invoice',
    label: 'Get invoice',
    description: 'Fetch full detail for a single AR invoice by id.',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice id (inv_XX)' },
      },
      required: ['invoiceId'],
    },
  },
  // ── AR — Estimates ──
  {
    name: 'list_estimates',
    label: 'List estimates',
    description: 'List sales estimates. Optionally filter by customer or status.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Filter by customer id' },
        status: { type: 'string', enum: ['draft', 'sent', 'approved', 'rejected', 'converted', 'all'] },
      },
    },
  },
  // ── S&E — Employees, cards, budgets, transactions, reimbursements ──
  {
    name: 'list_employees',
    label: 'List employees',
    description: 'List all employees in Bill Spend & Expense. Optionally filter by department or status.',
    parameters: {
      type: 'object',
      properties: {
        department: { type: 'string', description: 'Filter by department name' },
        status: { type: 'string', enum: ['active', 'inactive', 'all'] },
      },
    },
  },
  {
    name: 'list_cards',
    label: 'List cards',
    description: 'List virtual and physical cards in Bill Spend & Expense. Optionally filter by employee or status.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Filter by employee id' },
        status: { type: 'string', enum: ['active', 'frozen', 'cancelled', 'all'] },
      },
    },
  },
  {
    name: 'get_card',
    label: 'Get card',
    description: 'Fetch full detail for a single card including limit, spend, and status.',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'Card id' },
      },
      required: ['cardId'],
    },
  },
  {
    name: 'list_budgets',
    label: 'List budgets',
    description: 'List spending budgets in Bill Spend & Expense.',
    parameters: {
      type: 'object',
      properties: {
        ownerId: { type: 'string', description: 'Filter by owner employee id' },
        status: { type: 'string', enum: ['active', 'expired', 'all'] },
      },
    },
  },
  {
    name: 'get_budget',
    label: 'Get budget',
    description: 'Fetch detail and utilization for a single spending budget.',
    parameters: {
      type: 'object',
      properties: {
        budgetId: { type: 'string', description: 'Budget id' },
      },
      required: ['budgetId'],
    },
  },
  {
    name: 'list_transactions',
    label: 'List transactions',
    description: 'List card transactions in Bill Spend & Expense. Optionally filter by employee, card, date range, or category.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Filter by employee id' },
        cardId: { type: 'string', description: 'Filter by card id' },
        startDate: { type: 'string', description: 'ISO date lower bound (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'ISO date upper bound (YYYY-MM-DD)' },
        category: { type: 'string', description: 'Filter by merchant category' },
      },
    },
  },
  {
    name: 'get_transaction',
    label: 'Get transaction',
    description: 'Fetch full detail for a single card transaction.',
    parameters: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'Transaction id' },
      },
      required: ['transactionId'],
    },
  },
  {
    name: 'list_reimbursements',
    label: 'List reimbursements',
    description: 'List out-of-pocket reimbursement requests. Optionally filter by employee or status.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Filter by employee id' },
        status: { type: 'string', enum: ['pending', 'approved', 'paid', 'rejected', 'all'] },
      },
    },
  },
  // ── Org / Infra ──
  {
    name: 'list_funding_accounts',
    label: 'List funding accounts',
    description: 'List connected bank funding accounts in the BILL workspace.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_funding_account',
    label: 'Get funding account',
    description: 'Fetch detail for a single funding account by id.',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Funding account id' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'list_users',
    label: 'List users',
    description: 'List users in the BILL organization. Optionally filter by role or status.',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Filter by role name (e.g. Administrator, Clerk)' },
        status: { type: 'string', enum: ['active', 'inactive', 'all'] },
      },
    },
  },
  {
    name: 'get_user',
    label: 'Get user',
    description: 'Fetch profile and permissions for a single BILL user.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User id' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'list_roles',
    label: 'List roles',
    description: 'List available user roles and their permission sets.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_chart_of_accounts',
    label: 'List chart of accounts',
    description: 'List general-ledger accounts in the chart of accounts. Optionally filter by type or active status.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['asset', 'liability', 'equity', 'income', 'expense', 'all'] },
        active: { type: 'boolean', description: 'If true, return only active accounts' },
      },
    },
  },
  {
    name: 'list_webhook_subscriptions',
    label: 'List webhook subscriptions',
    description: 'List active webhook subscriptions configured in the BILL workspace.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_event_catalog',
    label: 'List event catalog',
    description: 'List all event types available for webhook subscriptions.',
    parameters: { type: 'object', properties: {} },
  },
  // ── UI artifacts ──
  {
    name: 'render_artifact',
    label: 'Open artifact',
    description:
      'Open an interactive artifact card in the UI. Use when the user asks to visualize, list, or configure something that has a matching artifact kind.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['spend-chart', 'rule-net15', 'crm-flow', 'liquidity-burndown', 'sweep-rule'],
        },
        title: { type: 'string' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "TABLE · INTERACTIVE"' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
      },
      required: ['kind', 'title'],
    },
  },
  {
    name: 'render_html_artifact',
    label: 'Build custom artifact',
    description:
      'Open a custom HTML/CSS/JS artifact in the UI. Use this whenever the user asks for a visualization or layout that does not match one of the fixed kinds (spend-chart, rule-net15, crm-flow) — for example a line graph, treemap, heatmap, sankey, sunburst, scatter, KPI dashboard, or any freeform layout. The artifact renders inside a sandboxed iframe with ECharts v5, D3 v7, and Chart.js v4 available globally.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Display title for the artifact tab.' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "CHART · TREEMAP".' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
        html: {
          type: 'string',
          description: 'Body HTML. A root element with id="root" is provided; you may also write into it or add your own containers.',
        },
        css: { type: 'string', description: 'Optional extra CSS applied inside the sandbox.' },
        script: {
          type: 'string',
          description:
            'JS that runs after ECharts, D3, and Chart.js are loaded. Access the piped dataset via `window.__DATA`. Mount into `#root`.',
        },
        dataJson: {
          type: 'string',
          description:
            'JSON-serialized dataset to pipe in. Typically the data field from a prior read tool call (list_bills, get_category_spend, etc.), stringified. Exposed to the script as window.__DATA.',
        },
      },
      required: ['title', 'html'],
    },
  },
];

export const FORM_TOOLS: ToolDef[] = [
  {
    name: 'ask_question',
    label: 'Ask clarifying question',
    description:
      'Ask the user a structured question to collect context before proceeding. Use this when intent is ambiguous — especially for automation setup. Prefer multi_select when several options might apply simultaneously. Set allow_free_text when the option list may not be exhaustive.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to display to the user.' },
        options: {
          type: 'array',
          description: 'Choices to present. Each option needs an id (short slug) and a label.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string', description: 'Optional subtitle shown below the label.' },
            },
            required: ['id', 'label'],
          },
        },
        multi_select: {
          type: 'boolean',
          description: 'If true, render checkboxes so the user can pick multiple options.',
        },
        allow_free_text: {
          type: 'boolean',
          description: 'If true, show a free-text input below the options for custom answers.',
        },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'render_spreadsheet_artifact',
    label: 'Open spreadsheet',
    description:
      'Open an editable multi-sheet spreadsheet in the artifact panel. Use when the user asks to see data (bills, vendors, expenses, aging, spend), create a spreadsheet, or requests tabular data with formula editing. This is the primary way to surface tabular data — prefer it over any other table format.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Display title for the artifact tab.' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "SPREADSHEET · EDITABLE".' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
        dataJson: {
          type: 'string',
          description: 'JSON string describing the workbook. Shape: {"sheets":[{"name":"Tab label","headers":["Col A","Col B"],"rows":[["cell","cell"]]}]}. Include one sheet object per logical grouping. Use numbers (not strings) for amounts so currency formatting applies.',
        },
      },
      required: ['title', 'dataJson'],
    },
  },
  {
    name: 'render_document_artifact',
    label: 'Open document',
    description:
      'Open an editable rich-text document in the artifact panel. Use when the user asks for a report, one-pager, memo, narrative summary, or any prose-and-structured-content document. The user can edit the document inline; their edits are persisted automatically.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Display title for the artifact tab.' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "DOCUMENT · DRAFT".' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
        dataJson: {
          type: 'string',
          description: 'JSON string describing the document. Shape: {"title":"Report title","subtitle":"optional metadata line","sections":[{"heading":"Section heading","paragraphs":["A prose paragraph."],"bullets":["Bullet item"]}]}. Use one section per logical chunk. heading, paragraphs, bullets are all optional inside a section.',
        },
      },
      required: ['title', 'dataJson'],
    },
  },
  {
    name: 'render_slides_artifact',
    label: 'Open slide deck',
    description:
      'Open an editable slide-deck presentation in the artifact panel. Use ONLY when the user has invoked /slides AND has explicitly confirmed they are ready to generate the deck after the questionnaire. Do not call this tool to fulfil any other request.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Display title for the artifact tab.' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "DECK · DRAFT".' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
        dataJson: {
          type: 'string',
          description: 'JSON string describing the deck. Shape: {"title":"Deck title","slides":[{"title":"Slide title","layout":"title|bullets|two-col|image","bullets":["..."],"body":"...","rightColumn":["..."],"notes":"speaker notes"}]}. layout defaults to "bullets" when bullets are present, otherwise "title". Include one slide object per page.',
        },
      },
      required: ['title', 'dataJson'],
    },
  },
];

export const WRITE_TOOLS: ToolDef[] = [
  {
    name: 'stage_payment_batch',
    label: 'Stage payment batch',
    description:
      'Stage a batch for human approval. The UI will render an approval card — do not fabricate one in text. Use billHints to supply amount/vendor for bill IDs not in the local dataset.',
    parameters: {
      type: 'object',
      properties: {
        billIds: { type: 'array', items: { type: 'string' } },
        bankAccount: { type: 'string' },
        method: { type: 'string', enum: ['ACH', 'Check', 'Wire'] },
        scheduledFor: { type: 'string' },
        billHints: {
          type: 'array',
          description: 'Optional per-bill hints for IDs not in the local fixture. amount required for correct stake classification.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              vendor: { type: 'string' },
              invoice: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      required: ['billIds'],
    },
  },
  // ── AP — Bill management writes ──
  {
    name: 'create_bill',
    label: 'Create bill',
    description: 'Create a new accounts-payable bill.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id (vnd_XX)' },
        invoiceNumber: { type: 'string', description: 'Vendor invoice number' },
        amount: { type: 'number', description: 'Total bill amount in USD' },
        dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        description: { type: 'string', description: 'Optional memo or description' },
        lineItems: {
          type: 'array',
          description: 'Optional line items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              amount: { type: 'number' },
              chartOfAccountId: { type: 'string' },
            },
          },
        },
      },
      required: ['vendorId', 'invoiceNumber', 'amount', 'dueDate'],
    },
  },
  {
    name: 'update_bill',
    label: 'Update bill',
    description: 'Update fields on an existing accounts-payable bill.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'Bill id (bll_XX)' },
        amount: { type: 'number' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['billId'],
    },
  },
  {
    name: 'delete_bill',
    label: 'Delete bill',
    description: 'Delete an accounts-payable bill by id.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'Bill id (bll_XX)' },
      },
      required: ['billId'],
    },
  },
  {
    name: 'approve_bill',
    label: 'Approve bill',
    description: 'Approve a bill in the BILL approval workflow.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'Bill id (bll_XX)' },
      },
      required: ['billId'],
    },
  },
  {
    name: 'reject_bill',
    label: 'Reject bill',
    description: 'Reject a bill in the BILL approval workflow with a reason.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'Bill id (bll_XX)' },
        reason: { type: 'string', description: 'Reason for rejection' },
      },
      required: ['billId', 'reason'],
    },
  },
  // ── AP — Vendor writes ──
  {
    name: 'create_vendor',
    label: 'Create vendor',
    description: 'Create a new vendor in the BILL workspace.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Vendor business name' },
        email: { type: 'string', description: 'Vendor contact email' },
        address: { type: 'string', description: 'Vendor mailing address' },
        terms: { type: 'string', description: 'Payment terms, e.g. Net30' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_vendor',
    label: 'Update vendor',
    description: 'Update contact info or payment terms for an existing vendor.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id (vnd_XX)' },
        name: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        terms: { type: 'string' },
      },
      required: ['vendorId'],
    },
  },
  {
    name: 'create_vendor_bank_account',
    label: 'Add vendor bank account',
    description: 'Add ACH bank account details for a vendor to enable electronic payments.',
    parameters: {
      type: 'object',
      properties: {
        vendorId: { type: 'string', description: 'Vendor id (vnd_XX)' },
        routingNumber: { type: 'string' },
        accountNumber: { type: 'string' },
        accountType: { type: 'string', enum: ['checking', 'savings'] },
      },
      required: ['vendorId', 'routingNumber', 'accountNumber', 'accountType'],
    },
  },
  // ── AP — Approval policy writes ──
  {
    name: 'create_approval_policy',
    label: 'Create approval policy',
    description: 'Create a new bill approval policy with amount thresholds and approver rules.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Policy name' },
        type: { type: 'string', enum: ['amount', 'always', 'vendor'] },
        threshold: { type: 'number', description: 'Dollar threshold for amount-based policies' },
        approvers: { type: 'array', items: { type: 'string' }, description: 'User ids of approvers' },
        minApprovers: { type: 'number', description: 'Minimum number of approvers required' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'update_approval_policy',
    label: 'Update approval policy',
    description: 'Update an existing bill approval policy.',
    parameters: {
      type: 'object',
      properties: {
        policyId: { type: 'string', description: 'Policy id' },
        name: { type: 'string' },
        threshold: { type: 'number' },
        approvers: { type: 'array', items: { type: 'string' } },
        minApprovers: { type: 'number' },
      },
      required: ['policyId'],
    },
  },
  // ── AR — Customer, invoice, estimate writes ──
  {
    name: 'create_customer',
    label: 'Create customer',
    description: 'Create a new accounts-receivable customer.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer business name' },
        email: { type: 'string', description: 'Customer contact email' },
        phone: { type: 'string' },
        terms: { type: 'string', description: 'Payment terms, e.g. Net30' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_customer',
    label: 'Update customer',
    description: 'Update contact info or payment terms for an existing AR customer.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer id (cust_XX)' },
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        terms: { type: 'string' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'create_invoice',
    label: 'Create invoice',
    description: 'Create a new outgoing AR invoice for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer id (cust_XX)' },
        dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
            },
            required: ['description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['customerId', 'dueDate', 'lineItems'],
    },
  },
  {
    name: 'update_invoice',
    label: 'Update invoice',
    description: 'Update an existing AR invoice (e.g. due date, line items).',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice id (inv_XX)' },
        dueDate: { type: 'string' },
        lineItems: { type: 'array', items: { type: 'object', properties: {} } },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'delete_invoice',
    label: 'Delete invoice',
    description: 'Delete (void) an AR invoice by id.',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice id (inv_XX)' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'create_estimate',
    label: 'Create estimate',
    description: 'Create a new itemized sales estimate for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer id (cust_XX)' },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
            },
            required: ['description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['customerId', 'lineItems'],
    },
  },
  {
    name: 'convert_estimate_to_invoice',
    label: 'Convert estimate to invoice',
    description: 'Convert an approved estimate into an AR invoice.',
    parameters: {
      type: 'object',
      properties: {
        estimateId: { type: 'string', description: 'Estimate id (est_XX)' },
        dueDate: { type: 'string', description: 'Due date for the resulting invoice (YYYY-MM-DD)' },
      },
      required: ['estimateId'],
    },
  },
  // ── S&E — Card, budget, reimbursement writes ──
  {
    name: 'create_card',
    label: 'Issue card',
    description: 'Issue a new virtual or physical card to an employee.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee id' },
        limit: { type: 'number', description: 'Spending limit in USD' },
        type: { type: 'string', enum: ['virtual', 'physical'], description: 'Card type' },
      },
      required: ['employeeId', 'limit', 'type'],
    },
  },
  {
    name: 'update_card',
    label: 'Update card',
    description: 'Update spending limit or freeze/unfreeze a card.',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'Card id' },
        limit: { type: 'number', description: 'New spending limit in USD' },
        status: { type: 'string', enum: ['active', 'frozen'], description: 'New card status' },
      },
      required: ['cardId'],
    },
  },
  {
    name: 'create_budget',
    label: 'Create budget',
    description: 'Create a new spending budget in Bill Spend & Expense.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Budget name' },
        limit: { type: 'number', description: 'Budget limit in USD' },
        resetInterval: { type: 'string', enum: ['monthly', 'quarterly', 'annually', 'never'], description: 'When the budget resets' },
        ownerId: { type: 'string', description: 'Employee id of the budget owner' },
      },
      required: ['name', 'limit'],
    },
  },
  {
    name: 'update_budget',
    label: 'Update budget',
    description: 'Update limit, reset interval, or owner of an existing budget.',
    parameters: {
      type: 'object',
      properties: {
        budgetId: { type: 'string', description: 'Budget id' },
        limit: { type: 'number' },
        resetInterval: { type: 'string', enum: ['monthly', 'quarterly', 'annually', 'never'] },
        ownerId: { type: 'string' },
      },
      required: ['budgetId'],
    },
  },
  {
    name: 'create_reimbursement',
    label: 'Submit reimbursement',
    description: 'Submit an out-of-pocket expense reimbursement request.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee id' },
        amount: { type: 'number', description: 'Amount in USD' },
        description: { type: 'string', description: 'Description of the expense' },
        receiptUrl: { type: 'string', description: 'Optional URL to receipt image' },
      },
      required: ['employeeId', 'amount', 'description'],
    },
  },
  {
    name: 'approve_reimbursement',
    label: 'Approve reimbursement',
    description: 'Approve an out-of-pocket reimbursement request.',
    parameters: {
      type: 'object',
      properties: {
        reimbursementId: { type: 'string', description: 'Reimbursement id' },
      },
      required: ['reimbursementId'],
    },
  },
  // ── Org / Infra writes ──
  {
    name: 'create_chart_of_account',
    label: 'Create chart of account',
    description: 'Create a new general-ledger account in the chart of accounts.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Account name' },
        number: { type: 'string', description: 'GL account number' },
        type: { type: 'string', enum: ['asset', 'liability', 'equity', 'income', 'expense'] },
        category: { type: 'string', description: 'Sub-category label' },
      },
      required: ['name', 'number', 'type'],
    },
  },
  {
    name: 'create_webhook_subscription',
    label: 'Create webhook subscription',
    description: 'Register a new webhook endpoint to receive BILL event notifications.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'HTTPS endpoint URL to deliver events to' },
        events: { type: 'array', items: { type: 'string' }, description: 'Event type slugs to subscribe to (from list_event_catalog)' },
      },
      required: ['url', 'events'],
    },
  },
  // ── Existing write tools ──
  // TODO: add 'automation' approval card UX — for now this tool returns inline success.
  {
    name: 'create_automation_rule',
    label: 'Create automation rule',
    description: 'Create a BILL automation rule. Returns inline confirmation; no approval card in this iteration.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        trigger: { type: 'string' },
        conditions: { type: 'array', items: { type: 'object', properties: {} } },
        actions: { type: 'array', items: { type: 'object', properties: {} } },
      },
      required: ['name', 'trigger'],
    },
  },
  {
    name: 'approve_expense',
    label: 'Approve expense',
    description: 'Approve a Bill Spend & Expense item by id.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'reject_expense',
    label: 'Reject expense',
    description: 'Reject a Bill Spend & Expense item by id, with a reason.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['expenseId', 'reason'],
    },
  },
];

// Tools the LLM can call.
export const MODEL_TOOLS: ToolDef[] = [...READ_TOOLS, ...FORM_TOOLS, ...WRITE_TOOLS];

// Internal dispatcher — not exposed to the LLM.
export const INTERNAL_TOOLS: ToolDef[] = [
  {
    name: 'submit_payment_batch',
    label: 'Submit payment batch',
    description: 'Submit an approved payment batch. Internal — called only by handleApprove after user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        batchId: { type: 'string' },
        payload: { type: 'object', properties: {} },
      },
      required: ['batchId'],
    },
  },
];

// Union kept for internal callers / tests.
export const TOOLS: ToolDef[] = [...MODEL_TOOLS, ...INTERNAL_TOOLS];

const INTERNAL_TOOL_NAMES = new Set(INTERNAL_TOOLS.map(t => t.name));

// ─── Dispatcher ───────────────────────────────────────────────────────

export async function runTool(
  name: string,
  input: any,
  ctx?: ToolContext,
  opts?: { allowInternal?: boolean }
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  if (INTERNAL_TOOL_NAMES.has(name) && !opts?.allowInternal) {
    return {
      ok: false,
      summary: `tool "${name}" is internal; call via /api/dryrun with allowInternal`,
      data: null,
    };
  }
  const useReal =
    ctx?.mode === 'testing' &&
    Boolean(ctx?.billEnvId) &&
    ctx?.billEnvId !== DEMO_SANDBOX_ENV_ID;
  if (useReal) {
    return runRealTool(name, input, ctx!);
  }
  return runMockTool(name, input, ctx?.demoDataset);
}

// ─── Real-mode dispatcher ─────────────────────────────────────────────

async function runRealTool(
  name: string,
  input: any,
  ctx: ToolContext
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  try {
    if (name === 'render_artifact') {
      return { ok: true, summary: 'artifact opened in UI', data: input };
    }
    if (name === 'render_html_artifact') {
      return { ok: true, summary: 'html artifact opened in UI', data: input };
    }
    if (name === 'render_spreadsheet_artifact') {
      return { ok: true, summary: 'spreadsheet artifact opened in UI', data: input };
    }
    if (name === 'render_document_artifact') {
      return { ok: true, summary: 'document artifact opened in UI', data: input };
    }
    if (name === 'render_slides_artifact') {
      return { ok: true, summary: 'slides artifact opened in UI', data: input };
    }
    if (name === 'ask_question') {
      return { ok: true, summary: 'question presented to user', data: { __awaiting_input: true } };
    }
    const { getBillEnvironment } = await import('./secrets');
    const env = await getBillEnvironment(ctx.billEnvId!);
    if (!env) {
      return {
        ok: false,
        summary: `Bill environment ${ctx.billEnvId} not found`,
        data: null,
      };
    }

    // Write tools: delegate to stubs, fall back to mock on simulated.
    if (name === 'stage_payment_batch') {
      const stub = await apStagePaymentBatch(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Batch staged', data: stub };
    }
    if (name === 'submit_payment_batch') {
      const stub = await apSubmitPaymentBatch(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Batch submitted', data: stub };
    }
    if (name === 'create_automation_rule') {
      const stub = await apCreateAutomationRule(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Rule created', data: stub };
    }
    if (name === 'approve_expense') {
      const stub = await seApproveExpense(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Expense approved', data: stub };
    }
    if (name === 'reject_expense') {
      const stub = await seRejectExpense(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Expense rejected', data: stub };
    }

    if (ctx.billProduct === 'se') {
      if (name === 'list_expenses') {
        const filters: SeExpenseFilter[] = [];
        if (input?.employeeId) filters.push({ field: 'employeeId', value: String(input.employeeId) });
        if (input?.status) filters.push({ field: 'status', value: String(input.status) });
        const expenses = await seListExpenses(env, filters);
        const total = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
        return {
          ok: true,
          summary: `${expenses.length} expenses · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          data: expenses,
        };
      }
      if (name === 'get_employee') {
        if (!input?.id) return { ok: false, summary: 'employee id required', data: null };
        const employee = await seGetEmployee(env, String(input.id));
        return { ok: true, summary: `employee ${employee?.id ?? input.id}`, data: employee };
      }
      if (name === 'list_employees') {
        const filters: SeExpenseFilter[] = [];
        if (input?.department) filters.push({ field: 'department', value: String(input.department) });
        if (input?.status && input.status !== 'all') filters.push({ field: 'status', value: String(input.status) });
        const employees = await seListEmployees(env, filters);
        return { ok: true, summary: `${employees.length} employees`, data: employees };
      }
      if (name === 'list_cards') {
        const filters: SeExpenseFilter[] = [];
        if (input?.employeeId) filters.push({ field: 'employeeId', value: String(input.employeeId) });
        if (input?.status && input.status !== 'all') filters.push({ field: 'status', value: String(input.status) });
        const cards = await seListCards(env, filters);
        return { ok: true, summary: `${cards.length} cards`, data: cards };
      }
      if (name === 'get_card') {
        if (!input?.cardId) return { ok: false, summary: 'cardId required', data: null };
        const card = await seGetCard(env, String(input.cardId));
        return { ok: true, summary: `card ${input.cardId}`, data: card };
      }
      if (name === 'list_budgets') {
        const filters: SeExpenseFilter[] = [];
        if (input?.ownerId) filters.push({ field: 'ownerId', value: String(input.ownerId) });
        if (input?.status && input.status !== 'all') filters.push({ field: 'status', value: String(input.status) });
        const budgets = await seListBudgets(env, filters);
        return { ok: true, summary: `${budgets.length} budgets`, data: budgets };
      }
      if (name === 'get_budget') {
        if (!input?.budgetId) return { ok: false, summary: 'budgetId required', data: null };
        const budget = await seGetBudget(env, String(input.budgetId));
        return { ok: true, summary: `budget ${input.budgetId}`, data: budget };
      }
      if (name === 'list_transactions') {
        const filters: SeExpenseFilter[] = [];
        if (input?.employeeId) filters.push({ field: 'employeeId', value: String(input.employeeId) });
        if (input?.cardId) filters.push({ field: 'cardId', value: String(input.cardId) });
        if (input?.startDate) filters.push({ field: 'startDate', value: String(input.startDate) });
        if (input?.endDate) filters.push({ field: 'endDate', value: String(input.endDate) });
        if (input?.category) filters.push({ field: 'category', value: String(input.category) });
        const txns = await seListTransactions(env, filters);
        const total = txns.reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
        return { ok: true, summary: `${txns.length} transactions · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: txns };
      }
      if (name === 'get_transaction') {
        if (!input?.transactionId) return { ok: false, summary: 'transactionId required', data: null };
        const txn = await seGetTransaction(env, String(input.transactionId));
        return { ok: true, summary: `transaction ${input.transactionId}`, data: txn };
      }
      if (name === 'list_reimbursements') {
        const filters: SeExpenseFilter[] = [];
        if (input?.employeeId) filters.push({ field: 'employeeId', value: String(input.employeeId) });
        if (input?.status && input.status !== 'all') filters.push({ field: 'status', value: String(input.status) });
        const reimbursements = await seListReimbursements(env, filters);
        const total = reimbursements.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
        return { ok: true, summary: `${reimbursements.length} reimbursements · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: reimbursements };
      }
      // S&E write stubs
      for (const seWrite of ['create_card','update_card','create_budget','update_budget','create_reimbursement','approve_reimbursement']) {
        if (name === seWrite) {
          const fn = { create_card: seCreateCard, update_card: seUpdateCard, create_budget: seCreateBudget, update_budget: seUpdateBudget, create_reimbursement: seCreateReimbursement, approve_reimbursement: seApproveReimbursement }[seWrite]!;
          const stub = await fn(env, input);
          if (stub?.simulated) return runMockTool(name, input, ctx.demoDataset);
          return { ok: true, summary: `${seWrite} done`, data: stub };
        }
      }
      try {
        await seRequest(env, '/me');
      } catch (e: any) {
        return { ok: false, summary: e?.message ?? 'Bill S&E request failed', data: null };
      }
    }

    // AR tools
    if (name === 'list_customers') {
      const filters: ApFilter[] = [];
      if (input?.status && input.status !== 'all') filters.push({ field: 'isActive', op: '=', value: input.status === 'active' ? '1' : '0' });
      const customers = await arListCustomers(env, filters);
      return { ok: true, summary: `${customers.length} customers`, data: customers };
    }
    if (name === 'get_customer') {
      if (!input?.customerId) return { ok: false, summary: 'customerId required', data: null };
      const customer = await arReadCustomer(env, String(input.customerId));
      return { ok: true, summary: `customer ${input.customerId}`, data: customer };
    }
    if (name === 'list_invoices') {
      const filters: ApFilter[] = [];
      if (input?.customerId) filters.push({ field: 'customerId', op: '=', value: String(input.customerId) });
      if (input?.status && input.status !== 'all') filters.push({ field: 'invoiceStatus', op: '=', value: String(input.status) });
      if (input?.startDate) filters.push({ field: 'dueDate', op: '>=', value: String(input.startDate) });
      if (input?.endDate) filters.push({ field: 'dueDate', op: '<=', value: String(input.endDate) });
      const invoices = await arListInvoices(env, filters);
      const total = invoices.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
      return { ok: true, summary: `${invoices.length} invoices · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: invoices };
    }
    if (name === 'get_invoice') {
      if (!input?.invoiceId) return { ok: false, summary: 'invoiceId required', data: null };
      const invoice = await arReadInvoice(env, String(input.invoiceId));
      return { ok: true, summary: `invoice ${input.invoiceId}`, data: invoice };
    }
    if (name === 'list_estimates') {
      const filters: ApFilter[] = [];
      if (input?.customerId) filters.push({ field: 'customerId', op: '=', value: String(input.customerId) });
      if (input?.status && input.status !== 'all') filters.push({ field: 'estimateStatus', op: '=', value: String(input.status) });
      const estimates = await arListEstimates(env, filters);
      return { ok: true, summary: `${estimates.length} estimates`, data: estimates };
    }
    // AR write stubs
    for (const arWrite of ['create_customer','update_customer','create_invoice','update_invoice','delete_invoice','create_estimate','convert_estimate_to_invoice']) {
      if (name === arWrite) {
        const fn = { create_customer: arCreateCustomer, update_customer: arUpdateCustomer, create_invoice: arCreateInvoice, update_invoice: arUpdateInvoice, delete_invoice: arDeleteInvoice, create_estimate: arCreateEstimate, convert_estimate_to_invoice: arConvertEstimateToInvoice }[arWrite]!;
        const stub = await fn(env, input);
        if (stub?.simulated) return runMockTool(name, input, ctx.demoDataset);
        return { ok: true, summary: `${arWrite} done`, data: stub };
      }
    }

    // Org / Infra tools
    if (name === 'list_users') {
      const users = await orgListUsers(env);
      return { ok: true, summary: `${users.length} users`, data: users };
    }
    if (name === 'get_user') {
      if (!input?.userId) return { ok: false, summary: 'userId required', data: null };
      const user = await orgGetUser(env, String(input.userId));
      return { ok: true, summary: `user ${input.userId}`, data: user };
    }
    if (name === 'list_roles') {
      const roles = await orgListRoles(env);
      return { ok: true, summary: `${roles.length} roles`, data: roles };
    }
    if (name === 'list_funding_accounts') {
      const accounts = await orgListFundingAccounts(env);
      return { ok: true, summary: `${accounts.length} funding accounts`, data: accounts };
    }
    if (name === 'get_funding_account') {
      if (!input?.accountId) return { ok: false, summary: 'accountId required', data: null };
      const account = await orgGetFundingAccount(env, String(input.accountId));
      return { ok: true, summary: `account ${input.accountId}`, data: account };
    }
    if (name === 'list_chart_of_accounts') {
      const coa = await orgListChartOfAccounts(env);
      return { ok: true, summary: `${coa.length} GL accounts`, data: coa };
    }
    if (name === 'list_webhook_subscriptions') {
      const subs = await orgListWebhookSubscriptions(env);
      return { ok: true, summary: `${subs.length} subscriptions`, data: subs };
    }
    if (name === 'list_event_catalog') {
      const events = await orgListEventCatalog(env);
      return { ok: true, summary: `${events.length} event types`, data: events };
    }
    if (name === 'create_chart_of_account') {
      const stub = await orgCreateChartOfAccount(env, input);
      if (stub?.simulated) return runMockTool(name, input, ctx.demoDataset);
      return { ok: true, summary: 'Chart of account created', data: stub };
    }
    if (name === 'create_webhook_subscription') {
      const stub = await orgCreateWebhookSubscription(env, input);
      if (stub?.simulated) return runMockTool(name, input, ctx.demoDataset);
      return { ok: true, summary: 'Webhook subscription created', data: stub };
    }

    // AP tools
    if (name === 'list_bills') {
      const filters: ApFilter[] = [];
      const status = input?.status;
      if (status && status !== 'all') {
        if (status === 'scheduled') filters.push({ field: 'paymentStatus', op: '=', value: '4' });
        else filters.push({ field: 'paymentStatus', op: '=', value: '1' });
      }
      if (input?.vendorId) filters.push({ field: 'vendorId', op: '=', value: String(input.vendorId) });
      const bills = await apList(env, 'Bill', filters);
      const total = bills.reduce((s: number, b: any) => s + Number(b.amount ?? 0), 0);
      return {
        ok: true,
        summary: `${bills.length} bills · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: bills,
      };
    }
    if (name === 'get_bill') {
      if (!input?.billId) return { ok: false, summary: 'billId required', data: null };
      const bill = await apReadBill(env, String(input.billId));
      return { ok: true, summary: `bill ${input.billId}`, data: bill };
    }
    if (name === 'list_vendors') {
      const vendors = await apList(env, 'Vendor');
      return { ok: true, summary: `${vendors.length} vendors`, data: vendors };
    }
    if (name === 'get_vendor') {
      if (!input?.vendorId) return { ok: false, summary: 'vendorId required', data: null };
      const vendor = await apReadVendor(env, String(input.vendorId));
      return { ok: true, summary: `vendor ${input.vendorId}`, data: vendor };
    }
    if (name === 'list_vendor_bank_accounts') {
      if (!input?.vendorId) return { ok: false, summary: 'vendorId required', data: null };
      const accounts = await apList(env, 'VendorBankAccount', [{ field: 'vendorId', op: '=', value: String(input.vendorId) }]);
      return { ok: true, summary: `${accounts.length} bank accounts`, data: accounts };
    }
    if (name === 'list_payments') {
      const filters: ApFilter[] = [];
      if (input?.vendorId) filters.push({ field: 'vendorId', op: '=', value: String(input.vendorId) });
      if (input?.status && input.status !== 'all') filters.push({ field: 'status', op: '=', value: String(input.status) });
      if (input?.startDate) filters.push({ field: 'processDate', op: '>=', value: String(input.startDate) });
      if (input?.endDate) filters.push({ field: 'processDate', op: '<=', value: String(input.endDate) });
      const payments = await apListPayments(env, filters);
      const total = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
      return { ok: true, summary: `${payments.length} payments · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: payments };
    }
    if (name === 'get_payment') {
      if (!input?.paymentId) return { ok: false, summary: 'paymentId required', data: null };
      const payment = await apReadPayment(env, String(input.paymentId));
      return { ok: true, summary: `payment ${input.paymentId}`, data: payment };
    }
    if (name === 'get_payment_options') {
      if (!input?.vendorId) return { ok: false, summary: 'vendorId required', data: null };
      const options = await apGetPaymentOptions(env, String(input.vendorId));
      return { ok: true, summary: `payment options for ${input.vendorId}`, data: options };
    }
    if (name === 'get_exchange_rate') {
      if (!input?.currency) return { ok: false, summary: 'currency required', data: null };
      const rate = await apGetExchangeRate(env, String(input.currency));
      return { ok: true, summary: `exchange rate for ${input.currency}`, data: rate };
    }
    if (name === 'list_approval_policies') {
      const policies = await apListApprovalPolicies(env);
      return { ok: true, summary: `${policies.length} approval policies`, data: policies };
    }
    // AP write stubs
    for (const apWrite of ['create_bill','update_bill','delete_bill','approve_bill','reject_bill','create_vendor','update_vendor','create_vendor_bank_account','create_approval_policy','update_approval_policy']) {
      if (name === apWrite) {
        const fn = { create_bill: apCreateBill, update_bill: apUpdateBill, delete_bill: apDeleteBill, approve_bill: apApproveBill, reject_bill: apRejectBill, create_vendor: apCreateVendor, update_vendor: apUpdateVendor, create_vendor_bank_account: apCreateVendorBankAccount, create_approval_policy: apCreateApprovalPolicy, update_approval_policy: apUpdateApprovalPolicy }[apWrite]!;
        const stub = await fn(env, input);
        if (stub?.simulated) return runMockTool(name, input, ctx.demoDataset);
        return { ok: true, summary: `${apWrite} done`, data: stub };
      }
    }
    if (name === 'get_aging_summary') {
      const buckets = await apAgingSummary(env);
      const total = buckets.reduce((s, b) => s + b.amount, 0);
      return {
        ok: true,
        summary: `${buckets.length} buckets · $${total.toLocaleString()}`,
        data: buckets,
      };
    }
    if (name === 'get_category_spend') {
      const rows = await apCategorySpend(env, input?.period);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return {
        ok: true,
        summary: `${rows.length} categories · $${total.toLocaleString()}`,
        data: rows,
      };
    }
    if (name === 'find_duplicate_invoices') {
      const pairs = await apFindDuplicateInvoices(env, Number(input?.days ?? 60));
      return { ok: true, summary: `${pairs.length} suspect pairs`, data: pairs };
    }
    if (name === 'get_liquidity_projection') {
      return { ok: false, summary: 'not yet wired to Bill sandbox', data: null };
    }
    return { ok: false, summary: `unknown tool: ${name}`, data: null };
  } catch (e: any) {
    return { ok: false, summary: `error: ${e?.message ?? 'unknown'}`, data: null };
  }
}

// ─── Mock dispatcher ──────────────────────────────────────────────────

async function runMockTool(
  name: string,
  input: any,
  dataset?: DatasetKey
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  try {
    const data = getDataset(dataset);
    const { VENDORS, BILLS, AGING, CATEGORY_SPEND, EMPLOYEES, EXPENSES,
      PAYMENTS, APPROVAL_POLICIES, CUSTOMERS, AR_INVOICES, ESTIMATES,
      CARDS, BUDGETS, TRANSACTIONS, REIMBURSEMENTS, USERS,
      CHART_OF_ACCOUNTS, ROLES, WEBHOOK_SUBSCRIPTIONS, EVENT_CATALOG } = data;
    if (name === 'list_bills') {
      const status = input?.status ?? 'all';
      const vendorId = input?.vendorId;
      let bills = BILLS.slice();
      if (status !== 'all') bills = bills.filter(b => b.status === status);
      if (vendorId) bills = bills.filter(b => b.vendor === vendorId);
      const total = bills.reduce((s, b) => s + b.amount, 0);
      return {
        ok: true,
        summary: `${bills.length} bills · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: bills,
      };
    }
    if (name === 'list_vendors') {
      return { ok: true, summary: `${VENDORS.length} vendors`, data: VENDORS };
    }
    if (name === 'get_aging_summary') {
      const total = AGING.reduce((s, a) => s + a.amount, 0);
      return { ok: true, summary: `${AGING.length} buckets · $${total.toLocaleString()}`, data: AGING };
    }
    if (name === 'get_category_spend') {
      const total = CATEGORY_SPEND.reduce((s, c) => s + c.amount, 0);
      return { ok: true, summary: `${CATEGORY_SPEND.length} categories · $${total.toLocaleString()}`, data: CATEGORY_SPEND };
    }
    if (name === 'get_liquidity_projection') {
      const days = Math.min(Number(input?.days ?? 60), 120);
      const threshold = Number(input?.threshold ?? data.liquidityThreshold);
      const series = data.liquidityProjection.slice(0, days + 1);
      const minPoint = series.reduce((m, p) => (p.balance < m.balance ? p : m), series[0]);
      return {
        ok: true,
        summary: `min ${fmtMoneyShort(minPoint.balance)} on ${minPoint.day} · ${series.length} points`,
        data: {
          series,
          drivers: data.liquidityDrivers,
          accounts: data.bankAccounts,
          threshold,
          minDay: minPoint.day,
          minBalance: minPoint.balance,
        },
      };
    }
    if (name === 'find_duplicate_invoices') {
      const pairs = dataset === 'logistics'
        ? [
            {
              vendor: 'Apex Carrier Network',
              a: { invoice: 'ACN-2026-0381', amount: 14200, date: '2026-04-06' },
              b: { invoice: 'ACN-2026-381',  amount: 14200, date: '2026-04-18' },
              confidence: 'high',
            },
          ]
        : [
            {
              vendor: 'Brightline Marketing Co.',
              a: { invoice: 'BRT-5488',   amount: 2150, date: '2026-04-14' },
              b: { invoice: 'BRT-5488-A', amount: 2150, date: '2026-04-20' },
              confidence: 'high',
            },
            {
              vendor: 'Meridian Office Supply',
              a: { invoice: 'MOS-00441', amount: 842.1, date: '2026-03-10' },
              b: { invoice: 'MOS-0441',  amount: 842.1, date: '2026-03-12' },
              confidence: 'medium',
            },
          ];
      return { ok: true, summary: `${pairs.length} suspect pairs`, data: pairs };
    }
    if (name === 'list_expenses') {
      const employeeId = input?.employeeId;
      const status = input?.status;
      let expenses = EXPENSES.slice();
      if (employeeId) expenses = expenses.filter(e => e.employee === employeeId);
      if (status) expenses = expenses.filter(e => e.status === status);
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      return {
        ok: true,
        summary: `${expenses.length} expenses · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: expenses,
      };
    }
    if (name === 'get_employee') {
      if (!input?.id) return { ok: false, summary: 'employee id required', data: null };
      const employee = EMPLOYEES.find(e => e.id === String(input.id));
      if (!employee) return { ok: false, summary: `employee ${input.id} not found`, data: null };
      return { ok: true, summary: `employee ${employee.id}`, data: employee };
    }
    if (name === 'render_artifact') {
      return { ok: true, summary: 'artifact opened in UI', data: input };
    }
    if (name === 'render_html_artifact') {
      return { ok: true, summary: 'html artifact opened in UI', data: input };
    }
    if (name === 'render_spreadsheet_artifact') {
      return { ok: true, summary: 'spreadsheet artifact opened in UI', data: input };
    }
    if (name === 'render_document_artifact') {
      return { ok: true, summary: 'document artifact opened in UI', data: input };
    }
    if (name === 'render_slides_artifact') {
      return { ok: true, summary: 'slides artifact opened in UI', data: input };
    }
    if (name === 'ask_question') {
      return { ok: true, summary: 'question presented to user', data: { __awaiting_input: true } };
    }

    // ── Write tools ──
    if (name === 'stage_payment_batch') {
      const billIds: string[] = Array.isArray(input?.billIds) ? input.billIds : [];
      if (billIds.length === 0) {
        return { ok: false, summary: 'stage_payment_batch requires billIds', data: null };
      }
      const hints = new Map<string, any>(
        (Array.isArray(input?.billHints) ? input.billHints : []).map((h: any) => [String(h.id), h])
      );
      const vendorName: Record<string, string> = {};
      for (const v of VENDORS) vendorName[v.id] = v.name;
      const lineItems = billIds.map((id: string) => {
        const bill = BILLS.find(b => b.id === id);
        if (bill) {
          return {
            vendor: vendorName[bill.vendor] ?? bill.vendor,
            invoice: bill.invoice,
            amount: bill.amount,
          };
        }
        const hint = hints.get(id);
        return {
          vendor: hint?.vendor ?? `Vendor ${id.slice(-4)}`,
          invoice: hint?.invoice ?? `INV-${id.slice(-6).toUpperCase()}`,
          amount: Number(hint?.amount ?? 0),
        };
      });
      const total = lineItems.reduce((s, li) => s + li.amount, 0);
      const stake: ApprovalPayload['stake'] = total > 25000 ? 'large-payment' : 'payment';
      const batchId = `btch_${Date.now().toString(36).slice(-6)}`;
      const approvalPayload: ApprovalPayload = {
        batchId,
        stake,
        from: input?.bankAccount ?? 'Ops Checking ••4821',
        method: input?.method ?? 'ACH',
        scheduledFor:
          input?.scheduledFor ?? (stake === 'large-payment' ? 'Pending second approval' : 'Today, 4:00 PM PT'),
        items: lineItems,
        total,
        requiresSecondApprover: stake === 'large-payment',
      };
      return {
        ok: true,
        summary: `Batch staged · ${lineItems.length} items · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })} (simulated)`,
        data: { approvalPayload, simulated: true },
      };
    }
    if (name === 'submit_payment_batch') {
      const batchId = String(input?.batchId ?? '').trim();
      if (!batchId) {
        return { ok: false, summary: 'submit_payment_batch requires batchId', data: null };
      }
      const confirmationId = `PMT-${batchId.slice(-6).toUpperCase()}`;
      return {
        ok: true,
        summary: 'Batch submitted (simulated)',
        data: { confirmationId, simulated: true },
      };
    }
    if (name === 'create_automation_rule') {
      const ruleId = `rule_${Date.now().toString(36)}`;
      const nm = input?.name ? ` · ${input.name}` : '';
      return {
        ok: true,
        summary: `Rule created${nm} (simulated)`,
        data: { ruleId, simulated: true },
      };
    }
    if (name === 'approve_expense') {
      const expenseId = String(input?.expenseId ?? '').trim();
      if (!expenseId) {
        return { ok: false, summary: 'approve_expense requires expenseId', data: null };
      }
      const exp = EXPENSES.find(e => e.id === expenseId);
      if (!exp) {
        return {
          ok: true,
          summary: `Expense ${expenseId} approved (simulated · unknown id)`,
          data: { expenseId, simulated: true },
        };
      }
      return {
        ok: true,
        summary: `Expense ${exp.id} (${exp.category}) approved (simulated)`,
        data: { expenseId: exp.id, employee: exp.employee, category: exp.category, simulated: true },
      };
    }
    if (name === 'reject_expense') {
      const expenseId = String(input?.expenseId ?? '').trim();
      const reason = String(input?.reason ?? '').trim();
      if (!expenseId) {
        return { ok: false, summary: 'reject_expense requires expenseId', data: null };
      }
      const exp = EXPENSES.find(e => e.id === expenseId);
      if (!exp) {
        return {
          ok: true,
          summary: `Expense ${expenseId} rejected (simulated · unknown id)`,
          data: { expenseId, reason, simulated: true },
        };
      }
      return {
        ok: true,
        summary: `Expense ${exp.id} rejected (simulated): ${reason || 'no reason given'}`,
        data: { expenseId: exp.id, employee: exp.employee, reason, simulated: true },
      };
    }

    // ── AP read mocks ──
    if (name === 'get_bill') {
      if (!input?.billId) return { ok: false, summary: 'billId required', data: null };
      const bill = BILLS.find(b => b.id === String(input.billId));
      if (!bill) return { ok: false, summary: `bill ${input.billId} not found`, data: null };
      return { ok: true, summary: `bill ${bill.id} · $${bill.amount.toLocaleString()}`, data: bill };
    }
    if (name === 'get_vendor') {
      if (!input?.vendorId) return { ok: false, summary: 'vendorId required', data: null };
      const vendor = VENDORS.find(v => v.id === String(input.vendorId));
      if (!vendor) return { ok: false, summary: `vendor ${input.vendorId} not found`, data: null };
      return { ok: true, summary: `vendor ${vendor.name}`, data: vendor };
    }
    if (name === 'list_vendor_bank_accounts') {
      return { ok: true, summary: '0 bank accounts (simulated)', data: [] };
    }
    if (name === 'list_payments') {
      let payments = PAYMENTS.slice();
      if (input?.vendorId) payments = payments.filter(p => p.vendorId === input.vendorId);
      if (input?.status && input.status !== 'all') payments = payments.filter(p => p.status === input.status);
      if (input?.startDate) payments = payments.filter(p => p.processedDate >= input.startDate);
      if (input?.endDate) payments = payments.filter(p => p.processedDate <= input.endDate);
      const total = payments.reduce((s, p) => s + p.amount, 0);
      return { ok: true, summary: `${payments.length} payments · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: payments };
    }
    if (name === 'get_payment') {
      if (!input?.paymentId) return { ok: false, summary: 'paymentId required', data: null };
      const payment = PAYMENTS.find(p => p.id === String(input.paymentId));
      if (!payment) return { ok: false, summary: `payment ${input.paymentId} not found`, data: null };
      return { ok: true, summary: `payment ${payment.id} · $${payment.amount.toLocaleString()}`, data: payment };
    }
    if (name === 'get_payment_options') {
      return { ok: true, summary: 'ACH, Check, Wire available (simulated)', data: { methods: ['ACH', 'Check', 'Wire'], estimatedDelivery: { ACH: '2-3 business days', Check: '5-7 business days', Wire: '1 business day' } } };
    }
    if (name === 'get_exchange_rate') {
      const rates: Record<string, number> = { EUR: 0.92, GBP: 0.79, CAD: 1.37, MXN: 17.1, JPY: 154.2 };
      const currency = String(input?.currency ?? '').toUpperCase();
      const rate = rates[currency] ?? 1.0;
      return { ok: true, summary: `1 USD = ${rate} ${currency} (simulated)`, data: { currency, rate, asOf: new Date().toISOString().slice(0, 10) } };
    }
    if (name === 'list_approval_policies') {
      return { ok: true, summary: `${APPROVAL_POLICIES.length} approval policies`, data: APPROVAL_POLICIES };
    }
    // ── AR read mocks ──
    if (name === 'list_customers') {
      let customers = CUSTOMERS.slice();
      if (input?.status && input.status !== 'all') customers = customers.filter(c => c.status === input.status);
      return { ok: true, summary: `${customers.length} customers`, data: customers };
    }
    if (name === 'get_customer') {
      if (!input?.customerId) return { ok: false, summary: 'customerId required', data: null };
      const customer = CUSTOMERS.find(c => c.id === String(input.customerId));
      if (!customer) return { ok: false, summary: `customer ${input.customerId} not found`, data: null };
      return { ok: true, summary: `customer ${customer.name}`, data: customer };
    }
    if (name === 'list_invoices') {
      let invoices = AR_INVOICES.slice();
      if (input?.customerId) invoices = invoices.filter(i => i.customerId === input.customerId);
      if (input?.status && input.status !== 'all') invoices = invoices.filter(i => i.status === input.status);
      if (input?.startDate) invoices = invoices.filter(i => i.dueDate >= input.startDate);
      if (input?.endDate) invoices = invoices.filter(i => i.dueDate <= input.endDate);
      const total = invoices.reduce((s, i) => s + i.amount, 0);
      return { ok: true, summary: `${invoices.length} invoices · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: invoices };
    }
    if (name === 'get_invoice') {
      if (!input?.invoiceId) return { ok: false, summary: 'invoiceId required', data: null };
      const invoice = AR_INVOICES.find(i => i.id === String(input.invoiceId));
      if (!invoice) return { ok: false, summary: `invoice ${input.invoiceId} not found`, data: null };
      return { ok: true, summary: `invoice ${invoice.id} · $${invoice.amount.toLocaleString()}`, data: invoice };
    }
    if (name === 'list_estimates') {
      let estimates = ESTIMATES.slice();
      if (input?.customerId) estimates = estimates.filter(e => e.customerId === input.customerId);
      if (input?.status && input.status !== 'all') estimates = estimates.filter(e => e.status === input.status);
      return { ok: true, summary: `${estimates.length} estimates`, data: estimates };
    }
    // ── S&E read mocks ──
    if (name === 'list_employees') {
      let employees = EMPLOYEES.slice();
      if (input?.department) employees = employees.filter(e => e.department === input.department);
      return { ok: true, summary: `${employees.length} employees`, data: employees };
    }
    if (name === 'list_cards') {
      let cards = CARDS.slice();
      if (input?.employeeId) cards = cards.filter(c => c.employeeId === input.employeeId);
      if (input?.status && input.status !== 'all') cards = cards.filter(c => c.status === input.status);
      return { ok: true, summary: `${cards.length} cards`, data: cards };
    }
    if (name === 'get_card') {
      if (!input?.cardId) return { ok: false, summary: 'cardId required', data: null };
      const card = CARDS.find(c => c.id === String(input.cardId));
      if (!card) return { ok: false, summary: `card ${input.cardId} not found`, data: null };
      return { ok: true, summary: `card ••${card.last4} · $${card.spent.toLocaleString()} / $${card.limit.toLocaleString()}`, data: card };
    }
    if (name === 'list_budgets') {
      let budgets = BUDGETS.slice();
      if (input?.ownerId) budgets = budgets.filter(b => b.ownerId === input.ownerId);
      return { ok: true, summary: `${budgets.length} budgets`, data: budgets };
    }
    if (name === 'get_budget') {
      if (!input?.budgetId) return { ok: false, summary: 'budgetId required', data: null };
      const budget = BUDGETS.find(b => b.id === String(input.budgetId));
      if (!budget) return { ok: false, summary: `budget ${input.budgetId} not found`, data: null };
      return { ok: true, summary: `${budget.name} · $${budget.spent.toLocaleString()} / $${budget.limit.toLocaleString()}`, data: budget };
    }
    if (name === 'list_transactions') {
      let txns = TRANSACTIONS.slice();
      if (input?.employeeId) txns = txns.filter(t => t.employeeId === input.employeeId);
      if (input?.cardId) txns = txns.filter(t => t.cardId === input.cardId);
      if (input?.startDate) txns = txns.filter(t => t.date >= input.startDate);
      if (input?.endDate) txns = txns.filter(t => t.date <= input.endDate);
      if (input?.category) txns = txns.filter(t => t.category === input.category);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return { ok: true, summary: `${txns.length} transactions · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: txns };
    }
    if (name === 'get_transaction') {
      if (!input?.transactionId) return { ok: false, summary: 'transactionId required', data: null };
      const txn = TRANSACTIONS.find(t => t.id === String(input.transactionId));
      if (!txn) return { ok: false, summary: `transaction ${input.transactionId} not found`, data: null };
      return { ok: true, summary: `${txn.merchant} · $${txn.amount.toLocaleString()}`, data: txn };
    }
    if (name === 'list_reimbursements') {
      let reimbursements = REIMBURSEMENTS.slice();
      if (input?.employeeId) reimbursements = reimbursements.filter(r => r.employeeId === input.employeeId);
      if (input?.status && input.status !== 'all') reimbursements = reimbursements.filter(r => r.status === input.status);
      const total = reimbursements.reduce((s, r) => s + r.amount, 0);
      return { ok: true, summary: `${reimbursements.length} reimbursements · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, data: reimbursements };
    }
    // ── Org / Infra read mocks ──
    if (name === 'list_funding_accounts') {
      return { ok: true, summary: `${data.bankAccounts.length} funding accounts`, data: data.bankAccounts };
    }
    if (name === 'get_funding_account') {
      if (!input?.accountId) return { ok: false, summary: 'accountId required', data: null };
      const account = data.bankAccounts.find((a: any) => a.id === String(input.accountId));
      if (!account) return { ok: false, summary: `account ${input.accountId} not found`, data: null };
      return { ok: true, summary: `${account.nickname} ••${account.last4}`, data: account };
    }
    if (name === 'list_users') {
      let users = USERS.slice();
      if (input?.role) users = users.filter(u => u.role === input.role);
      if (input?.status && input.status !== 'all') users = users.filter(u => u.status === input.status);
      return { ok: true, summary: `${users.length} users`, data: users };
    }
    if (name === 'get_user') {
      if (!input?.userId) return { ok: false, summary: 'userId required', data: null };
      const user = USERS.find(u => u.id === String(input.userId));
      if (!user) return { ok: false, summary: `user ${input.userId} not found`, data: null };
      return { ok: true, summary: `${user.name} · ${user.role}`, data: user };
    }
    if (name === 'list_roles') {
      return { ok: true, summary: `${ROLES.length} roles`, data: ROLES };
    }
    if (name === 'list_chart_of_accounts') {
      let coa = CHART_OF_ACCOUNTS.slice();
      if (input?.type && input.type !== 'all') coa = coa.filter(c => c.type === input.type);
      if (input?.active !== undefined) coa = coa.filter(c => c.active === input.active);
      return { ok: true, summary: `${coa.length} GL accounts`, data: coa };
    }
    if (name === 'list_webhook_subscriptions') {
      return { ok: true, summary: `${WEBHOOK_SUBSCRIPTIONS.length} subscriptions`, data: WEBHOOK_SUBSCRIPTIONS };
    }
    if (name === 'list_event_catalog') {
      return { ok: true, summary: `${EVENT_CATALOG.length} event types`, data: EVENT_CATALOG };
    }
    // ── AP write mocks ──
    if (name === 'create_bill') {
      const id = `bll_${Date.now().toString(36).slice(-6)}`;
      return { ok: true, summary: `Bill created · ${input?.invoiceNumber ?? id} (simulated)`, data: { id, ...input, simulated: true } };
    }
    if (name === 'update_bill') {
      return { ok: true, summary: `Bill ${input?.billId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'delete_bill') {
      return { ok: true, summary: `Bill ${input?.billId ?? '?'} deleted (simulated)`, data: { billId: input?.billId, simulated: true } };
    }
    if (name === 'approve_bill') {
      return { ok: true, summary: `Bill ${input?.billId ?? '?'} approved (simulated)`, data: { billId: input?.billId, simulated: true } };
    }
    if (name === 'reject_bill') {
      return { ok: true, summary: `Bill ${input?.billId ?? '?'} rejected (simulated)`, data: { billId: input?.billId, reason: input?.reason, simulated: true } };
    }
    if (name === 'create_vendor') {
      const id = `vnd_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Vendor "${input?.name ?? id}" created (simulated)`, data: { id, ...input, simulated: true } };
    }
    if (name === 'update_vendor') {
      return { ok: true, summary: `Vendor ${input?.vendorId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'create_vendor_bank_account') {
      const id = `vba_${Date.now().toString(36).slice(-6)}`;
      return { ok: true, summary: `Bank account added for vendor ${input?.vendorId ?? '?'} (simulated)`, data: { id, ...input, simulated: true } };
    }
    if (name === 'create_approval_policy') {
      const id = `pol_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Policy "${input?.name ?? id}" created (simulated)`, data: { id, ...input, simulated: true } };
    }
    if (name === 'update_approval_policy') {
      return { ok: true, summary: `Policy ${input?.policyId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    // ── AR write mocks ──
    if (name === 'create_customer') {
      const id = `cust_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Customer "${input?.name ?? id}" created (simulated)`, data: { id, ...input, status: 'active', simulated: true } };
    }
    if (name === 'update_customer') {
      return { ok: true, summary: `Customer ${input?.customerId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'create_invoice') {
      const id = `inv_${Date.now().toString(36).slice(-4)}`;
      const total = (input?.lineItems ?? []).reduce((s: number, li: any) => s + Number(li.quantity ?? 1) * Number(li.unitPrice ?? 0), 0);
      return { ok: true, summary: `Invoice ${id} · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })} created (simulated)`, data: { id, ...input, amount: total, status: 'draft', simulated: true } };
    }
    if (name === 'update_invoice') {
      return { ok: true, summary: `Invoice ${input?.invoiceId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'delete_invoice') {
      return { ok: true, summary: `Invoice ${input?.invoiceId ?? '?'} deleted (simulated)`, data: { invoiceId: input?.invoiceId, simulated: true } };
    }
    if (name === 'create_estimate') {
      const id = `est_${Date.now().toString(36).slice(-4)}`;
      const total = (input?.lineItems ?? []).reduce((s: number, li: any) => s + Number(li.quantity ?? 1) * Number(li.unitPrice ?? 0), 0);
      return { ok: true, summary: `Estimate ${id} · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })} created (simulated)`, data: { id, ...input, amount: total, status: 'draft', simulated: true } };
    }
    if (name === 'convert_estimate_to_invoice') {
      const id = `inv_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Estimate ${input?.estimateId ?? '?'} converted to invoice ${id} (simulated)`, data: { invoiceId: id, estimateId: input?.estimateId, simulated: true } };
    }
    // ── S&E write mocks ──
    if (name === 'create_card') {
      const id = `card_${Date.now().toString(36).slice(-4)}`;
      const last4 = String(Math.floor(1000 + Math.random() * 9000));
      return { ok: true, summary: `${input?.type ?? 'virtual'} card ••${last4} issued (simulated)`, data: { id, last4, ...input, spent: 0, status: 'active', simulated: true } };
    }
    if (name === 'update_card') {
      return { ok: true, summary: `Card ${input?.cardId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'create_budget') {
      const id = `bgt_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Budget "${input?.name ?? id}" · $${Number(input?.limit ?? 0).toLocaleString()} created (simulated)`, data: { id, ...input, spent: 0, simulated: true } };
    }
    if (name === 'update_budget') {
      return { ok: true, summary: `Budget ${input?.budgetId ?? '?'} updated (simulated)`, data: { ...input, simulated: true } };
    }
    if (name === 'create_reimbursement') {
      const id = `rei_${Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `Reimbursement $${Number(input?.amount ?? 0).toLocaleString()} submitted (simulated)`, data: { id, ...input, status: 'pending', submittedDate: new Date().toISOString().slice(0, 10), simulated: true } };
    }
    if (name === 'approve_reimbursement') {
      return { ok: true, summary: `Reimbursement ${input?.reimbursementId ?? '?'} approved (simulated)`, data: { reimbursementId: input?.reimbursementId, simulated: true } };
    }
    // ── Org write mocks ──
    if (name === 'create_chart_of_account') {
      const id = `coa_${input?.number ?? Date.now().toString(36).slice(-4)}`;
      return { ok: true, summary: `GL account "${input?.name ?? id}" created (simulated)`, data: { id, ...input, active: true, simulated: true } };
    }
    if (name === 'create_webhook_subscription') {
      const id = `sub_${Date.now().toString(36).slice(-4)}`;
      const events: string[] = Array.isArray(input?.events) ? input.events : [];
      return { ok: true, summary: `Webhook subscription created · ${events.length} events (simulated)`, data: { id, ...input, createdAt: new Date().toISOString().slice(0, 10), simulated: true } };
    }

    return { ok: false, summary: `unknown tool: ${name}`, data: null };
  } catch (e: any) {
    return { ok: false, summary: `error: ${e?.message ?? 'unknown'}`, data: null };
  }
}

const DYNAMIC_ARTIFACT_GUIDANCE = `
Rendering artifacts:
- **Tabular data is always shown as a spreadsheet.** When the user asks to see data (bills, vendors, expenses, aging, spend breakdown, or any list), call \`render_spreadsheet_artifact\`. This is the primary artifact for all tabular output — do NOT use ap-table.
- **Data summary + nudge pattern:** Before calling \`render_spreadsheet_artifact\`, write a short prose summary in your reply (e.g. totals, top items, key trends — 2–4 sentences). End with a sentence nudging the user toward a visualization if the data has a trend or comparison angle, e.g. "Want me to chart this by category?" or "I can turn this into a bar chart comparing vendors."
- For prose reports / one-pagers / memos, call \`render_document_artifact\` with a structured \`dataJson\` body. Do NOT use \`render_artifact\` for documents.
- For slide decks / presentations, call \`render_slides_artifact\` — but ONLY after the user has invoked /slides AND confirmed they are ready to generate. Otherwise gather requirements through conversation first.
- For curated non-table kinds (Q1 spend donut+bar, Net-15 automation rule, CRM flow, cash runway, sweep rule), call \`render_artifact\` with kind spend-chart, rule-net15, crm-flow, liquidity-burndown, or sweep-rule.
- For ANYTHING else — line graphs, treemaps, heatmaps, sunburst, sankey, scatter, radar, custom dashboards, KPI cards, annotated layouts, or anything the user describes that does not exactly match one of those fixed kinds — call \`render_html_artifact\`. Do NOT try to fit a bespoke request into the fixed kinds.
- \`render_html_artifact\` renders inside a sandboxed iframe with three libraries preloaded as globals: \`echarts\` (v5), \`d3\` (v7), and \`Chart\` (Chart.js v4). Prefer ECharts for treemap / sunburst / sankey / heatmap / complex multi-series charts. D3 is available for bespoke work; Chart.js for quick line/bar/pie.
- Data flow: first call the appropriate read tool (e.g. \`get_category_spend\`, \`list_bills\`, \`get_aging_summary\`, \`list_expenses\`). Then pass the JSON-stringified \`data\` field as \`dataJson\`. Reference it in the script as \`window.__DATA\`.
- The iframe provides \`<div id="root"></div>\`. Mount charts into that element (or a child you create). Keep \`html\` minimal — most content should be produced by the script. Inline any extra CSS via the \`css\` field.
- Do NOT include \`<script>\` tags inside \`html\` — the sandbox already wires ECharts/D3/Chart.js and runs your \`script\` after they load.
- Example script pattern:
    var root = document.getElementById('root');
    var el = document.createElement('div');
    el.style.height = '360px';
    root.appendChild(el);
    var chart = echarts.init(el);
    chart.setOption({ series: [{ type: 'treemap', data: window.__DATA }] });`;

export const SYSTEM_PROMPT = `You are BILL Coworker, an agentic coworker for finance teams using the BILL.com API. You help non-technical finance folks explore accounts payable and receivable, manage spend, propose payments (always behind a human approval gate), build automations, and generate visual artifacts from their BILL data.

Style:
- Be concise, professional, and precise. Short paragraphs. Markdown **bold** and \`inline code\` are supported.
- When you need data, call tools rather than guessing. You can call multiple tools per turn.
- When the user asks to see any list or tabular data (AP, vendors, expenses, aging, spend breakdown), call \`render_spreadsheet_artifact\` — spreadsheet is the primary data artifact. First write a 2–4 sentence prose summary of what you found, then call \`render_spreadsheet_artifact\` with the data. End your reply with a one-sentence nudge offering a chart or visualization if the data has trends (e.g. "Want me to chart this by vendor?").
- When the user asks for a prose report, one-pager, memo, or narrative summary, call \`render_document_artifact\`. For slide decks call \`render_slides_artifact\` (only after /slides and an explicit user go-ahead).
- When the user asks to visualize or open an interactive view (spend chart, Net-15 rule, CRM flow, cash runway, sweep rule), call \`render_artifact\` with the right kind. Kinds: spend-chart, rule-net15, crm-flow, liquidity-burndown, sweep-rule.
- When the user asks to "create a spreadsheet", "turn this into a spreadsheet", "open as spreadsheet", or requests tabular data they can edit with formulas — call \`render_spreadsheet_artifact\`. First call the appropriate read tool (e.g. \`list_bills\`, \`get_category_spend\`) to get the data, then pass it as \`dataJson\` in the format \`{"sheets":[{"name":"Tab name","headers":[...],"rows":[[...]]}]}\`. Use one sheet per logical grouping. Use numbers (not strings) for currency amounts.
- To stage a payment, call \`stage_payment_batch\` with the bill IDs — the UI will render an approval card with a typed-confirmation gate. Do not fabricate approvals. Wait for the user's approve/reject before describing an outcome.

Tool groups available:
- **AP (Accounts Payable)**: \`list_bills\`, \`get_bill\`, \`create_bill\`, \`update_bill\`, \`delete_bill\`, \`approve_bill\`, \`reject_bill\`, \`list_vendors\`, \`get_vendor\`, \`create_vendor\`, \`update_vendor\`, \`list_vendor_bank_accounts\`, \`create_vendor_bank_account\`, \`list_payments\`, \`get_payment\`, \`get_payment_options\`, \`get_exchange_rate\`, \`list_approval_policies\`, \`create_approval_policy\`, \`update_approval_policy\`, \`get_aging_summary\`, \`get_category_spend\`, \`find_duplicate_invoices\`, \`get_liquidity_projection\`
- **AR (Accounts Receivable)**: \`list_customers\`, \`get_customer\`, \`create_customer\`, \`update_customer\`, \`list_invoices\`, \`get_invoice\`, \`create_invoice\`, \`update_invoice\`, \`delete_invoice\`, \`list_estimates\`, \`create_estimate\`, \`convert_estimate_to_invoice\`
- **Spend & Expense**: \`list_expenses\`, \`get_employee\`, \`list_employees\`, \`list_cards\`, \`get_card\`, \`create_card\`, \`update_card\`, \`list_budgets\`, \`get_budget\`, \`create_budget\`, \`update_budget\`, \`list_transactions\`, \`get_transaction\`, \`list_reimbursements\`, \`create_reimbursement\`, \`approve_expense\`, \`reject_expense\`, \`approve_reimbursement\`
- **Org / Infra**: \`list_funding_accounts\`, \`get_funding_account\`, \`list_users\`, \`get_user\`, \`list_roles\`, \`list_chart_of_accounts\`, \`create_chart_of_account\`, \`list_webhook_subscriptions\`, \`create_webhook_subscription\`, \`list_event_catalog\`
- **Payments**: \`stage_payment_batch\`, \`create_automation_rule\`

Cross-domain hints:
- For cash flow questions: combine \`list_payments\` + \`get_liquidity_projection\` + \`list_funding_accounts\`.
- For spend analysis: combine \`list_transactions\`, \`list_expenses\`, and \`get_category_spend\`.
- For AR/AP balance: combine \`list_invoices\` (AR outstanding) with \`get_aging_summary\` (AP outstanding).
- For vendor setup: \`create_vendor\` then \`create_vendor_bank_account\` to enable ACH.
- For GL coding: call \`list_chart_of_accounts\` first to get valid account IDs for bill line items.

Write tool guidance:
- \`create_bill\`, \`create_customer\`, \`create_vendor\`, \`create_invoice\`, \`create_estimate\`: inline confirmation, no approval card.
- \`approve_bill\`, \`reject_bill\`: consequential — confirm intent with the user if ambiguous.
- \`stage_payment_batch\`: always renders an approval card; never describe the outcome until the user approves.
- \`create_card\`, \`update_card\`: confirm employee and limit before issuing.

- When the user asks to set up an automation without specifying what it should do, call \`ask_question\` before proceeding. Offer 3–5 concrete options. Set \`allow_free_text: true\` so they can describe something custom.
- Use \`ask_question\` whenever you need to clarify ambiguous intent before taking a write action or building an artifact.
${DYNAMIC_ARTIFACT_GUIDANCE}

Finish every turn with a short natural-language summary of what you learned or did.`;

export const TESTING_SYSTEM_PROMPT = `You are BILL Coworker running in testing mode against a real Bill sandbox. Call tools to read live data from the configured sandbox environment — never guess or fabricate values.

Style:
- Concise, precise. Short paragraphs. Markdown **bold** and \`inline code\` are supported.
- Call tools for any data question. You can call multiple tools per turn.
- If a tool returns an error, surface the error message plainly so the user can diagnose.
- Write actions run as simulated writes against fixture data when the real endpoint isn't wired. Tool results include \`simulated: true\` in that case — always surface which mode you're in.
- If you stage bills whose IDs aren't in the local dataset, pass \`billHints[]\` with at least \`{id, amount}\` so the approval card totals are correct.

Tool groups available: AP (list_bills, get_bill, create_bill, update_bill, delete_bill, approve_bill, reject_bill, list_vendors, get_vendor, create_vendor, update_vendor, list_vendor_bank_accounts, create_vendor_bank_account, list_payments, get_payment, get_payment_options, get_exchange_rate, list_approval_policies, create_approval_policy, update_approval_policy, get_aging_summary, get_category_spend, find_duplicate_invoices, get_liquidity_projection), AR (list_customers, get_customer, create_customer, update_customer, list_invoices, get_invoice, create_invoice, update_invoice, delete_invoice, list_estimates, create_estimate, convert_estimate_to_invoice), Spend & Expense (list_expenses, get_employee, list_employees, list_cards, get_card, create_card, update_card, list_budgets, get_budget, create_budget, update_budget, list_transactions, get_transaction, list_reimbursements, create_reimbursement, approve_expense, reject_expense, approve_reimbursement), Org/Infra (list_funding_accounts, get_funding_account, list_users, get_user, list_roles, list_chart_of_accounts, create_chart_of_account, list_webhook_subscriptions, create_webhook_subscription, list_event_catalog).
${DYNAMIC_ARTIFACT_GUIDANCE}

Finish every turn with a short natural-language summary of what you learned or did.`;
