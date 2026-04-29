import { z } from 'zod';
import { defineTool } from './defineTool';
import { BillId } from '@/lib/domain/invoice';
import { VendorId } from '@/lib/domain/vendor';

// ── AP reads ──────────────────────────────────────────────────────────

export const listBills = defineTool({
  name: 'list_bills',
  label: 'List bills',
  domain: 'ap',
  description: 'List accounts-payable bills from the BILL workspace. Optionally filter by status or vendor.',
  schema: z.object({
    status: z.enum(['overdue', 'due-soon', 'open', 'scheduled', 'all']).optional(),
    vendorId: VendorId.optional(),
  }),
});

export const listVendors = defineTool({
  name: 'list_vendors',
  label: 'List vendors',
  domain: 'ap',
  description: 'List all active vendors in the BILL workspace.',
  schema: z.object({}),
});

export const getAgingSummary = defineTool({
  name: 'get_aging_summary',
  label: 'Get aging summary',
  domain: 'ap',
  description: 'Get an aging-bucket summary of open accounts payable.',
  schema: z.object({}),
});

export const getCategorySpend = defineTool({
  name: 'get_category_spend',
  label: 'Get category spend',
  domain: 'ap',
  description: 'Get total paid spend grouped by vendor category for a named period.',
  schema: z.object({ period: z.string().optional() }),
});

export const findDuplicateInvoices = defineTool({
  name: 'find_duplicate_invoices',
  label: 'Find duplicate invoices',
  domain: 'ap',
  description: 'Scan recent bills for likely duplicates using fuzzy invoice-number matching.',
  schema: z.object({ days: z.number().int().min(1).max(365).optional() }),
});

export const getBill = defineTool({
  name: 'get_bill',
  label: 'Get bill',
  domain: 'ap',
  description: 'Fetch full detail for a single accounts-payable bill by id, including line items and approval history.',
  schema: z.object({ billId: BillId }),
});

export const getVendor = defineTool({
  name: 'get_vendor',
  label: 'Get vendor',
  domain: 'ap',
  description: 'Fetch full profile for a single vendor by id.',
  schema: z.object({ vendorId: VendorId }),
});

export const listVendorBankAccounts = defineTool({
  name: 'list_vendor_bank_accounts',
  label: 'List vendor bank accounts',
  domain: 'ap',
  description: 'List bank accounts on file for a vendor.',
  schema: z.object({ vendorId: VendorId }),
});

export const listPayments = defineTool({
  name: 'list_payments',
  label: 'List payments',
  domain: 'ap',
  description: 'List outgoing AP payments. Optionally filter by vendor, status, or date range.',
  schema: z.object({
    vendorId: VendorId.optional(),
    status: z.enum(['pending', 'processing', 'paid', 'failed', 'all']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const getPayment = defineTool({
  name: 'get_payment',
  label: 'Get payment',
  domain: 'ap',
  description: 'Fetch full detail for a single outgoing payment by id.',
  schema: z.object({ paymentId: z.string() }),
});

export const getPaymentOptions = defineTool({
  name: 'get_payment_options',
  label: 'Get payment options',
  domain: 'ap',
  description: 'Get available payment methods and estimated delivery times for a vendor.',
  schema: z.object({ vendorId: VendorId }),
});

export const getExchangeRate = defineTool({
  name: 'get_exchange_rate',
  label: 'Get exchange rate',
  domain: 'ap',
  description: 'Get the current FX exchange rate for international vendor payments.',
  schema: z.object({ currency: z.string().length(3) }),
});

export const listApprovalPolicies = defineTool({
  name: 'list_approval_policies',
  label: 'List approval policies',
  domain: 'ap',
  description: 'List bill approval policies configured in the BILL workspace.',
  schema: z.object({}),
});

// ── AP writes (money-relevant; full Zod) ─────────────────────────────

export const createBill = defineTool({
  name: 'create_bill',
  label: 'Create bill',
  domain: 'ap',
  description: 'Create a new accounts-payable bill.',
  schema: z.object({
    vendorId: VendorId,
    invoiceNumber: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().optional(),
    lineItems: z.array(z.object({
      description: z.string().optional(),
      amount: z.number().optional(),
      chartOfAccountId: z.string().optional(),
    })).optional(),
  }),
});

export const updateBill = defineTool({
  name: 'update_bill',
  label: 'Update bill',
  domain: 'ap',
  description: 'Update fields on an existing accounts-payable bill.',
  schema: z.object({
    billId: BillId,
    amount: z.number().positive().optional(),
    dueDate: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const deleteBill = defineTool({
  name: 'delete_bill',
  label: 'Delete bill',
  domain: 'ap',
  description: 'Delete an accounts-payable bill by id.',
  schema: z.object({ billId: BillId }),
});

export const approveBill = defineTool({
  name: 'approve_bill',
  label: 'Approve bill',
  domain: 'ap',
  description: 'Approve a bill in the BILL approval workflow.',
  schema: z.object({ billId: BillId }),
});

export const rejectBill = defineTool({
  name: 'reject_bill',
  label: 'Reject bill',
  domain: 'ap',
  description: 'Reject a bill in the BILL approval workflow with a reason.',
  schema: z.object({ billId: BillId, reason: z.string().min(1) }),
});

export const createVendor = defineTool({
  name: 'create_vendor',
  label: 'Create vendor',
  domain: 'ap',
  description: 'Create a new vendor in the BILL workspace.',
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    address: z.string().optional(),
    terms: z.string().optional(),
  }),
});

export const updateVendor = defineTool({
  name: 'update_vendor',
  label: 'Update vendor',
  domain: 'ap',
  description: 'Update contact info or payment terms for an existing vendor.',
  schema: z.object({
    vendorId: VendorId,
    name: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    terms: z.string().optional(),
  }),
});

export const createVendorBankAccount = defineTool({
  name: 'create_vendor_bank_account',
  label: 'Add vendor bank account',
  domain: 'ap',
  description: 'Add ACH bank account details for a vendor to enable electronic payments.',
  schema: z.object({
    vendorId: VendorId,
    routingNumber: z.string().regex(/^\d{9}$/),
    accountNumber: z.string().min(4),
    accountType: z.enum(['checking', 'savings']),
  }),
});

export const createApprovalPolicy = defineTool({
  name: 'create_approval_policy',
  label: 'Create approval policy',
  domain: 'ap',
  description: 'Create a new bill approval policy with amount thresholds and approver rules.',
  schema: z.object({
    name: z.string().min(1),
    type: z.enum(['amount', 'always', 'vendor']),
    threshold: z.number().optional(),
    approvers: z.array(z.string()).optional(),
    minApprovers: z.number().int().min(1).optional(),
  }),
});

export const updateApprovalPolicy = defineTool({
  name: 'update_approval_policy',
  label: 'Update approval policy',
  domain: 'ap',
  description: 'Update an existing bill approval policy.',
  schema: z.object({
    policyId: z.string(),
    name: z.string().optional(),
    threshold: z.number().optional(),
    approvers: z.array(z.string()).optional(),
    minApprovers: z.number().int().min(1).optional(),
  }),
});

export const createAutomationRule = defineTool({
  name: 'create_automation_rule',
  label: 'Create automation rule',
  domain: 'ap',
  description: 'Create a BILL automation rule. Returns inline confirmation; no approval card in this iteration.',
  schema: z.object({
    name: z.string().min(1),
    trigger: z.string().min(1),
    conditions: z.array(z.record(z.string(), z.unknown())).optional(),
    actions: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
});

export const AP_TOOLS = [
  listBills, listVendors, getAgingSummary, getCategorySpend, findDuplicateInvoices,
  getBill, getVendor, listVendorBankAccounts,
  listPayments, getPayment, getPaymentOptions, getExchangeRate, listApprovalPolicies,
  createBill, updateBill, deleteBill, approveBill, rejectBill,
  createVendor, updateVendor, createVendorBankAccount,
  createApprovalPolicy, updateApprovalPolicy, createAutomationRule,
];
