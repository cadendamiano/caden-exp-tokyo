import type { BillEnvironment } from '../secrets';

export const BILL_AP_SANDBOX_BASE = 'https://api-sandbox.bill.com';
const SESSION_TTL_MS = 30 * 60 * 1000;

type Session = { sessionId: string; fetchedAt: number };

const sessionCache = new Map<string, Session>();

export type BillApLoginResponse = {
  response_status: number;
  response_message: string;
  response_data: {
    sessionId: string;
    organizationId?: string;
    apiEndPoint?: string;
  };
};

function isFresh(s: Session | undefined): s is Session {
  return !!s && Date.now() - s.fetchedAt < SESSION_TTL_MS;
}

export async function loginAp(env: BillEnvironment): Promise<string> {
  const cached = sessionCache.get(env.id);
  if (isFresh(cached)) return cached.sessionId;

  if (!env.devKey || !env.username || !env.password || !env.orgId) {
    throw new Error(
      `Bill environment "${env.name || env.id}" is missing devKey, username, password, or orgId`
    );
  }

  const form = new URLSearchParams();
  form.set('userName', env.username);
  form.set('password', env.password);
  form.set('orgId', env.orgId);
  form.set('devKey', env.devKey);

  const res = await fetch(`${BILL_AP_SANDBOX_BASE}/api/v3/Login.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bill AP login failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as BillApLoginResponse;
  if (json.response_status !== 0 || !json.response_data?.sessionId) {
    throw new Error(
      `Bill AP login rejected: ${json.response_message || 'unknown reason'}`
    );
  }

  const next: Session = { sessionId: json.response_data.sessionId, fetchedAt: Date.now() };
  sessionCache.set(env.id, next);
  return next.sessionId;
}

export function logoutAp(envId: string): void {
  sessionCache.delete(envId);
}

export function __clearBillSessionCacheForTests(): void {
  sessionCache.clear();
}
