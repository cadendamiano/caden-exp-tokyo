import { z } from 'zod';

export const VendorId = z.string().regex(/^vnd_[A-Za-z0-9]+$/, 'expected vnd_XX');
export type VendorId = z.infer<typeof VendorId>;

export const Vendor = z.object({
  id: VendorId,
  name: z.string().min(1),
  email: z.string().email().optional(),
  terms: z.string().optional(),
  isActive: z.boolean().default(true),
  riskFlags: z.array(z.string()).default([]),
});
export type Vendor = z.infer<typeof Vendor>;

const masked = (full: string) => (full.length <= 4 ? '••••' : `••••${full.slice(-4)}`);

export const BankAccount = z.object({
  id: z.string(),
  nickname: z.string().optional(),
  routingNumber: z.string().regex(/^\d{9}$/, 'routing number must be 9 digits'),
  accountNumber: z.string().min(4),
  accountType: z.enum(['checking', 'savings']),
  ownerVendorId: VendorId.optional(),
});
export type BankAccount = z.infer<typeof BankAccount>;

export function maskAccount(b: Pick<BankAccount, 'accountNumber'>): string {
  return masked(b.accountNumber);
}

/** Serialize a bank account for any non-trusted boundary (LLM, log, span). */
export function safeBankAccount(b: BankAccount) {
  return {
    id: b.id,
    nickname: b.nickname,
    accountType: b.accountType,
    accountNumberMasked: maskAccount(b),
    routingNumberMasked: `•••${b.routingNumber.slice(-4)}`,
    ownerVendorId: b.ownerVendorId,
  };
}
