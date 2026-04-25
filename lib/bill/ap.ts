import type { BillEnvironment } from '../secrets';
import { BILL_AP_SANDBOX_BASE, loginAp, logoutAp } from './auth';

export type ApListObject = 'Bill' | 'Vendor' | 'VendorBankAccount' | 'Payment' | 'Customer' | 'Invoice' | 'Estimate' | 'ChartOfAccount' | 'User';

export type ApFilter = { field: string; op: string; value: string | number };

type ApEnvelope<T> = {
  response_status: number;
  response_message: string;
  response_data: T;
};

export async function apPost<T>(
  env: BillEnvironment,
  path: string,
  payload: Record<string, unknown>,
  retry = true
): Promise<T> {
  const sessionId = await loginAp(env);
  const body = {
    devKey: env.devKey,
    sessionId,
    ...payload,
  };
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Bill AP ${path} failed (${res.status})`);
  }
  const json = (await res.json()) as ApEnvelope<T>;
  if (json.response_status !== 0) {
    if (retry && /session/i.test(json.response_message || '')) {
      logoutAp(env.id);
      return apPost<T>(env, path, payload, false);
    }
    throw new Error(`Bill AP ${path} error: ${json.response_message}`);
  }
  return json.response_data;
}

export async function apList(
  env: BillEnvironment,
  object: ApListObject,
  filters: ApFilter[] = [],
  max = 100
): Promise<any[]> {
  return apPost<any[]>(env, `/api/v3/List/${object}.json`, {
    start: 0,
    max,
    filters,
  });
}

export async function apReadBill(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/Bill.json', { id });
}

export async function apReadVendor(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/Vendor.json', { id });
}

export async function apListPayments(env: BillEnvironment, filters: ApFilter[] = []): Promise<any[]> {
  return apList(env, 'Payment', filters, 200);
}

export async function apReadPayment(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/Payment.json', { id });
}

export async function apGetPaymentOptions(env: BillEnvironment, vendorId: string): Promise<any> {
  return apPost<any>(env, '/api/v3/payments/options', { vendorId });
}

export async function apGetExchangeRate(env: BillEnvironment, currency: string): Promise<any> {
  const sessionId = await loginAp(env);
  const res = await fetch(
    `${BILL_AP_SANDBOX_BASE}/api/v3/payments/exchange-rate?currency=${encodeURIComponent(currency)}&devKey=${encodeURIComponent(env.devKey)}&sessionId=${encodeURIComponent(sessionId)}`
  );
  if (!res.ok) throw new Error(`Bill AP exchange-rate failed (${res.status})`);
  return res.json();
}

export async function apListApprovalPolicies(env: BillEnvironment): Promise<any[]> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/bill-approvals`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP bill-approvals failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.response_data ?? [];
}

export type AgingBucket = { bucket: string; amount: number; count: number };

export async function apAgingSummary(env: BillEnvironment): Promise<AgingBucket[]> {
  const bills = await apList(env, 'Bill', [
    { field: 'paymentStatus', op: '!=', value: '0' },
  ], 500);
  const today = new Date();
  const buckets: Record<string, AgingBucket> = {
    Current: { bucket: 'Current', amount: 0, count: 0 },
    '1–30 days': { bucket: '1–30 days', amount: 0, count: 0 },
    '31–60 days': { bucket: '31–60 days', amount: 0, count: 0 },
    '61–90 days': { bucket: '61–90 days', amount: 0, count: 0 },
    '90+ days': { bucket: '90+ days', amount: 0, count: 0 },
  };
  for (const b of bills) {
    const amount = Number(b.amount ?? 0);
    const due = b.dueDate ? new Date(String(b.dueDate)) : null;
    let key = 'Current';
    if (due) {
      const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) key = 'Current';
      else if (days <= 30) key = '1–30 days';
      else if (days <= 60) key = '31–60 days';
      else if (days <= 90) key = '61–90 days';
      else key = '90+ days';
    }
    buckets[key].amount += amount;
    buckets[key].count += 1;
  }
  return Object.values(buckets);
}

export type CategorySpendRow = { cat: string; amount: number; pct: number };

function periodRange(period: string | undefined): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  if (!period) return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  const m = /Q([1-4])\s*(\d{4})/i.exec(period);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    const start = new Date(y, (q - 1) * 3, 1);
    const end = new Date(y, q * 3, 0);
    return { start, end };
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}

export async function apCategorySpend(
  env: BillEnvironment,
  period: string | undefined
): Promise<CategorySpendRow[]> {
  const { start, end } = periodRange(period);
  const bills = await apList(env, 'Bill', [
    { field: 'paymentStatus', op: '=', value: '0' },
  ], 500);
  const vendors = await apList(env, 'Vendor', [], 500);
  const vendorCat: Record<string, string> = {};
  for (const v of vendors) {
    vendorCat[String(v.id)] = String(v.accountType ?? v.category ?? v.name ?? 'Uncategorized');
  }
  const totals: Record<string, number> = {};
  for (const b of bills) {
    const paid = b.paidDate || b.updatedTime;
    if (!paid) continue;
    const d = new Date(String(paid));
    if (d < start || d > end) continue;
    const cat = vendorCat[String(b.vendorId)] ?? 'Uncategorized';
    totals[cat] = (totals[cat] ?? 0) + Number(b.amount ?? 0);
  }
  const grand = Object.values(totals).reduce((s, n) => s + n, 0) || 1;
  return Object.entries(totals).map(([cat, amount]) => ({
    cat,
    amount,
    pct: Math.round((amount / grand) * 100),
  }));
}

export type DuplicatePair = {
  vendor: string;
  a: { invoice: string; amount: number; date: string };
  b: { invoice: string; amount: number; date: string };
  confidence: 'high' | 'medium' | 'low';
};

function normalizeInvoice(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let curPrev = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = prev[j];
      prev[j] =
        a[i - 1] === b[j - 1]
          ? curPrev
          : 1 + Math.min(curPrev, prev[j - 1], prev[j]);
      curPrev = temp;
    }
  }
  return prev[n];
}

// ─── Write stubs ──────────────────────────────────────────────────────
// Returned `{ simulated: true }` flips the dispatcher to the mock handler.
// When real AP write endpoints are wired, these can return the live response
// (without `simulated: true`) and the dispatcher will pass it through.

export async function apCreateBill(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apUpdateBill(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apDeleteBill(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apApproveBill(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apRejectBill(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apCreateVendor(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apUpdateVendor(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apCreateVendorBankAccount(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apCreateApprovalPolicy(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apUpdateApprovalPolicy(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apStagePaymentBatch(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apSubmitPaymentBatch(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apCreateAutomationRule(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function apFindDuplicateInvoices(
  env: BillEnvironment,
  days = 60
): Promise<DuplicatePair[]> {
  const bills = await apList(env, 'Bill', [], 500);
  const vendors = await apList(env, 'Vendor', [], 500);
  const vendorName: Record<string, string> = {};
  for (const v of vendors) vendorName[String(v.id)] = String(v.name ?? v.id);

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = bills.filter((b: any) => {
    const t = b.createdTime ? new Date(String(b.createdTime)).getTime() : Date.now();
    return t >= cutoff;
  });

  const pairs: DuplicatePair[] = [];
  const byVendor = new Map<string, any[]>();
  for (const b of recent) {
    const vid = String(b.vendorId);
    if (!byVendor.has(vid)) byVendor.set(vid, []);
    byVendor.get(vid)!.push(b);
  }
  for (const [vid, list] of byVendor) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (Math.round(Number(a.amount) * 100) !== Math.round(Number(b.amount) * 100)) continue;
        const na = normalizeInvoice(String(a.invoiceNumber ?? ''));
        const nb = normalizeInvoice(String(b.invoiceNumber ?? ''));
        if (!na || !nb) continue;
        const dist = levenshtein(na, nb);
        if (dist > 2) continue;
        const confidence: DuplicatePair['confidence'] =
          dist === 0 ? 'high' : dist === 1 ? 'high' : 'medium';
        pairs.push({
          vendor: vendorName[vid] ?? vid,
          a: { invoice: String(a.invoiceNumber), amount: Number(a.amount), date: String(a.invoiceDate ?? a.createdTime ?? '') },
          b: { invoice: String(b.invoiceNumber), amount: Number(b.amount), date: String(b.invoiceDate ?? b.createdTime ?? '') },
          confidence,
        });
      }
    }
  }
  return pairs;
}
