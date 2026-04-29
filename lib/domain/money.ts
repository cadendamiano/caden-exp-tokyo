import { z } from 'zod';

export const CurrencyCode = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'MXN', 'INR']);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

export const Money = z.object({
  currency: CurrencyCode,
  minorUnits: z.number().int().describe('Amount in minor units (e.g. cents). Reject floats.'),
});
export type Money = z.infer<typeof Money>;

export function fromUsd(dollars: number): Money {
  return { currency: 'USD', minorUnits: Math.round(dollars * 100) };
}

export function toMajor(m: Money): number {
  return m.minorUnits / 100;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`addMoney: currency mismatch ${a.currency} vs ${b.currency}`);
  }
  return { currency: a.currency, minorUnits: a.minorUnits + b.minorUnits };
}

export function sumMoney(items: Money[], fallbackCurrency: CurrencyCode = 'USD'): Money {
  if (items.length === 0) return { currency: fallbackCurrency, minorUnits: 0 };
  return items.reduce((acc, m) => addMoney(acc, m), { currency: items[0].currency, minorUnits: 0 });
}
