import type { BillEnvironment } from '../secrets';
import { apList, apPost } from './ap';
import { BILL_AP_SANDBOX_BASE, loginAp } from './auth';

export async function orgListUsers(env: BillEnvironment): Promise<any[]> {
  return apList(env, 'User', [], 200);
}

export async function orgGetUser(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/User.json', { id });
}

export async function orgListRoles(env: BillEnvironment): Promise<any[]> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/partner/roles`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP /partner/roles failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.response_data ?? [];
}

export async function orgListFundingAccounts(env: BillEnvironment): Promise<any[]> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/funding-accounts`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP /funding-accounts failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.response_data ?? [];
}

export async function orgGetFundingAccount(env: BillEnvironment, id: string): Promise<any> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/funding-accounts/${encodeURIComponent(id)}`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP /funding-accounts/${id} failed (${res.status})`);
  return res.json();
}

export async function orgListChartOfAccounts(env: BillEnvironment): Promise<any[]> {
  return apList(env, 'ChartOfAccount', [], 500);
}

export async function orgListWebhookSubscriptions(env: BillEnvironment): Promise<any[]> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/subscriptions`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP /subscriptions failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.response_data ?? [];
}

export async function orgListEventCatalog(env: BillEnvironment): Promise<any[]> {
  const sessionId = await loginAp(env);
  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/events/catalog`, {
    headers: { devKey: env.devKey, sessionId },
  });
  if (!res.ok) throw new Error(`Bill AP /events/catalog failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.response_data ?? [];
}

// ─── Write stubs ──────────────────────────────────────────────────────

export async function orgCreateChartOfAccount(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function orgCreateWebhookSubscription(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}
