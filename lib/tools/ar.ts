import { z } from 'zod';
import { defineTool } from './defineTool';

const CustomerId = z.string().regex(/^cust_[A-Za-z0-9]+$/, 'expected cust_XX');
const InvoiceId = z.string().regex(/^inv_[A-Za-z0-9]+$/, 'expected inv_XX');
const EstimateId = z.string().regex(/^est_[A-Za-z0-9]+$/, 'expected est_XX');

const InvoiceLineItem = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const listCustomers = defineTool({
  name: 'list_customers',
  label: 'List customers',
  domain: 'ar',
  description: 'List accounts-receivable customers in the BILL workspace.',
  schema: z.object({ status: z.enum(['active', 'inactive', 'all']).optional() }),
});

export const getCustomer = defineTool({
  name: 'get_customer',
  label: 'Get customer',
  domain: 'ar',
  description: 'Fetch full profile for a single AR customer by id.',
  schema: z.object({ customerId: CustomerId }),
});

export const listInvoices = defineTool({
  name: 'list_invoices',
  label: 'List invoices',
  domain: 'ar',
  description: 'List outgoing AR invoices. Optionally filter by customer, status, or date range.',
  schema: z.object({
    customerId: CustomerId.optional(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void', 'all']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const getInvoice = defineTool({
  name: 'get_invoice',
  label: 'Get invoice',
  domain: 'ar',
  description: 'Fetch full detail for a single AR invoice by id.',
  schema: z.object({ invoiceId: InvoiceId }),
});

export const listEstimates = defineTool({
  name: 'list_estimates',
  label: 'List estimates',
  domain: 'ar',
  description: 'List sales estimates. Optionally filter by customer or status.',
  schema: z.object({
    customerId: CustomerId.optional(),
    status: z.enum(['draft', 'sent', 'approved', 'rejected', 'converted', 'all']).optional(),
  }),
});

export const createCustomer = defineTool({
  name: 'create_customer',
  label: 'Create customer',
  domain: 'ar',
  description: 'Create a new accounts-receivable customer.',
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    terms: z.string().optional(),
  }),
});

export const updateCustomer = defineTool({
  name: 'update_customer',
  label: 'Update customer',
  domain: 'ar',
  description: 'Update contact info or payment terms for an existing AR customer.',
  schema: z.object({
    customerId: CustomerId,
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    terms: z.string().optional(),
  }),
});

export const createInvoice = defineTool({
  name: 'create_invoice',
  label: 'Create invoice',
  domain: 'ar',
  description: 'Create a new outgoing AR invoice for a customer.',
  schema: z.object({
    customerId: CustomerId,
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lineItems: z.array(InvoiceLineItem).min(1),
  }),
});

export const updateInvoice = defineTool({
  name: 'update_invoice',
  label: 'Update invoice',
  domain: 'ar',
  description: 'Update an existing AR invoice (e.g. due date, line items).',
  schema: z.object({
    invoiceId: InvoiceId,
    dueDate: z.string().optional(),
    lineItems: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
});

export const deleteInvoice = defineTool({
  name: 'delete_invoice',
  label: 'Delete invoice',
  domain: 'ar',
  description: 'Delete (void) an AR invoice by id.',
  schema: z.object({ invoiceId: InvoiceId }),
});

export const createEstimate = defineTool({
  name: 'create_estimate',
  label: 'Create estimate',
  domain: 'ar',
  description: 'Create a new itemized sales estimate for a customer.',
  schema: z.object({
    customerId: CustomerId,
    lineItems: z.array(InvoiceLineItem).min(1),
  }),
});

export const convertEstimateToInvoice = defineTool({
  name: 'convert_estimate_to_invoice',
  label: 'Convert estimate to invoice',
  domain: 'ar',
  description: 'Convert an approved estimate into an AR invoice.',
  schema: z.object({
    estimateId: EstimateId,
    dueDate: z.string().optional(),
  }),
});

export const AR_TOOLS = [
  listCustomers, getCustomer, listInvoices, getInvoice, listEstimates,
  createCustomer, updateCustomer, createInvoice, updateInvoice, deleteInvoice,
  createEstimate, convertEstimateToInvoice,
];
