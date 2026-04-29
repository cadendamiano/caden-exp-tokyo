/**
 * New per-domain tool registry. Each domain module declares tools via
 * `defineTool` with Zod schemas as the source of truth. The legacy file
 * `lib/tools.ts` still owns handler dispatch (runTool / runMockTool /
 * runRealTool); this registry replaces only the *definition* layer.
 *
 * Schema validation happens in lib/agent/runAgentOnce.ts via
 * validateToolInput — the seam this PR establishes.
 */
import type { DefinedTool } from './defineTool';
import {
  AP_TOOLS,
  // reads
  listBills, listVendors, getAgingSummary, getCategorySpend, findDuplicateInvoices,
  getBill, getVendor, listVendorBankAccounts,
  listPayments, getPayment, getPaymentOptions, getExchangeRate, listApprovalPolicies,
  // writes
  createBill, updateBill, deleteBill, approveBill, rejectBill,
  createVendor, updateVendor, createVendorBankAccount,
  createApprovalPolicy, updateApprovalPolicy, createAutomationRule,
} from './ap';
import {
  AR_TOOLS,
  listCustomers, getCustomer, listInvoices, getInvoice, listEstimates,
  createCustomer, updateCustomer, createInvoice, updateInvoice, deleteInvoice,
  createEstimate, convertEstimateToInvoice,
} from './ar';
import {
  SE_TOOLS,
  listExpenses, getEmployee, listEmployees,
  listCards, getCard, listBudgets, getBudget,
  listTransactions, getTransaction, listReimbursements,
  createCard, updateCard, createBudget, updateBudget,
  createReimbursement, approveReimbursement,
  approveExpense, rejectExpense,
} from './se';
import {
  ORG_TOOLS,
  listFundingAccounts, getFundingAccount,
  listUsers, getUser, listRoles,
  listChartOfAccounts, listWebhookSubscriptions, listEventCatalog,
  createChartOfAccount, createWebhookSubscription,
} from './org';
import {
  TREASURY_TOOLS,
  stagePaymentBatch, submitPaymentBatch, getLiquidityProjection,
} from './treasury';
import {
  RENDER_TOOLS,
  renderArtifact, renderHtmlArtifact, renderSpreadsheetArtifact,
  renderDocumentArtifact, renderSlidesArtifact, askQuestion,
} from './render';

// ── Public groupings (replicate legacy READ_TOOLS / FORM_TOOLS / WRITE_TOOLS) ──

/** Read-only tools + interactive (non-form) artifact openers. */
export const READ_TOOLS_V2: DefinedTool[] = [
  // AP reads (in legacy order)
  listBills, listVendors, getAgingSummary, getCategorySpend, findDuplicateInvoices,
  getLiquidityProjection,
  // SE reads
  listExpenses, getEmployee,
  // AP detail reads
  getBill, getVendor, listVendorBankAccounts,
  listPayments, getPayment, getPaymentOptions, getExchangeRate,
  listApprovalPolicies,
  // AR reads
  listCustomers, getCustomer, listInvoices, getInvoice, listEstimates,
  // SE catalog reads
  listEmployees, listCards, getCard, listBudgets, getBudget,
  listTransactions, getTransaction, listReimbursements,
  // Org reads
  listFundingAccounts, getFundingAccount, listUsers, getUser, listRoles,
  listChartOfAccounts, listWebhookSubscriptions, listEventCatalog,
  // UI render (interactive)
  renderArtifact, renderHtmlArtifact,
];

/** Form / questionnaire / typed render tools. */
export const FORM_TOOLS_V2: DefinedTool[] = [
  askQuestion,
  renderSpreadsheetArtifact,
  renderDocumentArtifact,
  renderSlidesArtifact,
];

/** Write-and-stage tools. submit_payment_batch is internal. */
export const WRITE_TOOLS_V2: DefinedTool[] = [
  stagePaymentBatch,
  // AP writes
  createBill, updateBill, deleteBill, approveBill, rejectBill,
  createVendor, updateVendor, createVendorBankAccount,
  createApprovalPolicy, updateApprovalPolicy,
  // AR writes
  createCustomer, updateCustomer,
  createInvoice, updateInvoice, deleteInvoice,
  createEstimate, convertEstimateToInvoice,
  // SE writes
  createCard, updateCard,
  createBudget, updateBudget,
  createReimbursement, approveReimbursement,
  // Org writes
  createChartOfAccount, createWebhookSubscription,
  // Existing inline-confirm writes
  createAutomationRule,
  approveExpense, rejectExpense,
];

/** Tools the LLM can call. */
export const DEFINED_MODEL_TOOLS: DefinedTool[] = [
  ...READ_TOOLS_V2,
  ...FORM_TOOLS_V2,
  ...WRITE_TOOLS_V2,
];

/** Internal dispatcher tools — never exposed to the LLM. */
export const DEFINED_INTERNAL_TOOLS: DefinedTool[] = [
  submitPaymentBatch,
];

const BY_NAME = new Map<string, DefinedTool>();
for (const t of [...DEFINED_MODEL_TOOLS, ...DEFINED_INTERNAL_TOOLS]) {
  if (BY_NAME.has(t.name)) {
    throw new Error(`tools/index: duplicate tool registered: ${t.name}`);
  }
  BY_NAME.set(t.name, t);
}

export function getDefinedTool(name: string): DefinedTool | undefined {
  return BY_NAME.get(name);
}

// Per-domain re-exports (for any consumer that wants them).
export { AP_TOOLS, AR_TOOLS, SE_TOOLS, ORG_TOOLS, TREASURY_TOOLS, RENDER_TOOLS };
export { defineTool, legacyTool, validateToolInput } from './defineTool';
export type { DefinedTool, ToolValidationResult } from './defineTool';
