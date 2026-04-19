import type { BillEnvironment } from '../secrets';

export const BILL_SE_SANDBOX_BASE = 'https://gateway.stage.bill.com/connect/v1';
const TOKEN_TTL_MS = 30 * 60 * 1000;

type TokenEntry = { token: string; fetchedAt: number };

const tokenCache = new Map<string, TokenEntry>();

function isFresh(entry: TokenEntry | undefined): entry is TokenEntry {
  return !!entry && Date.now() - entry.fetchedAt < TOKEN_TTL_MS;
}

function requireSeCreds(env: BillEnvironment): { id: string; secret: string } {
  if (!env.seClientId || !env.seClientSecret) {
    throw new Error(
      `Bill S&E environment "${env.name || env.id}" is missing seClientId or seClientSecret`
    );
  }
  return { id: env.seClientId, secret: env.seClientSecret };
}

export async function loginSe(env: BillEnvironment): Promise<string> {
  const cached = tokenCache.get(env.id);
  if (isFresh(cached)) return cached.token;

  const { id, secret } = requireSeCreds(env);
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', id);
  form.set('client_secret', secret);

  const res = await fetch(`${BILL_SE_SANDBOX_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bill S&E token failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!json.access_token) {
    const reason = json.error_description || json.error || 'no access_token in response';
    throw new Error(`Bill S&E token rejected: ${reason}`);
  }

  const entry: TokenEntry = { token: json.access_token, fetchedAt: Date.now() };
  tokenCache.set(env.id, entry);
  return entry.token;
}

export function logoutSe(envId: string): void {
  tokenCache.delete(envId);
}

export function __clearSeTokenCacheForTests(): void {
  tokenCache.clear();
}

export async function seRequest<T = unknown>(
  env: BillEnvironment,
  path: string,
  init?: RequestInit,
  retry = true
): Promise<T> {
  requireSeCreds(env);
  const token = await loginSe(env);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('accept')) headers.set('accept', 'application/json');

  const res = await fetch(`${BILL_SE_SANDBOX_BASE}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 && retry) {
    logoutSe(env.id);
    return seRequest<T>(env, path, init, false);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bill S&E ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type SeExpenseFilter = { field: string; value: string | number };

function buildExpenseQuery(filters: SeExpenseFilter[] = [], max = 100): string {
  const params = new URLSearchParams();
  params.set('max', String(max));
  for (const f of filters) {
    params.set(f.field, String(f.value));
  }
  return params.toString();
}

export async function seListExpenses(
  env: BillEnvironment,
  filters: SeExpenseFilter[] = [],
  max = 100
): Promise<any[]> {
  const qs = buildExpenseQuery(filters, max);
  const res = await seRequest<{ results?: any[] } | any[]>(env, `/expenses?${qs}`);
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.results) ? res.results : [];
}

export async function seGetEmployee(env: BillEnvironment, id: string): Promise<any> {
  return seRequest<any>(env, `/employees/${encodeURIComponent(id)}`);
}

// ─── Write stubs ──────────────────────────────────────────────────────
// When real S&E write endpoints are wired, these can return the live response
// (without `simulated: true`) and the dispatcher will pass it through.

export async function seApproveExpense(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function seRejectExpense(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}
