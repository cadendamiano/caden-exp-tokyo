import { z } from 'zod';
import { Money } from './money';
import { VendorId } from './vendor';

export const BillId = z.string().regex(/^bll_[A-Za-z0-9]+$/, 'expected bll_XX');
export type BillId = z.infer<typeof BillId>;

export const InvoiceNumber = z.string().min(1).max(64);

export const Invoice = z.object({
  id: BillId,
  vendorId: VendorId,
  invoiceNumber: InvoiceNumber,
  amount: Money,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  status: z.enum(['open', 'scheduled', 'paid', 'voided']).default('open'),
  description: z.string().optional(),
});
export type Invoice = z.infer<typeof Invoice>;
