import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loginAp,
  logoutAp,
  __clearBillSessionCacheForTests,
  BILL_AP_SANDBOX_BASE,
} from '@/lib/bill/auth';
import type { BillEnvironment } from '@/lib/secrets';

const ENV: BillEnvironment = {
  id: 'env_test',
  name: 'sandbox',
  devKey: 'DEV_KEY',
  username: 'api@example.com',
  password: 'secret',
  orgId: '00901',
  product: 'ap',
};

function mockLoginResponse(sessionId = 'sess_abc') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      response_status: 0,
      response_message: 'success',
      response_data: { sessionId, organizationId: ENV.orgId },
    }),
    text: async () => '',
  } as unknown as Response;
}

describe('loginAp', () => {
  beforeEach(() => {
    __clearBillSessionCacheForTests();
    vi.restoreAllMocks();
  });

  it('POSTs form-encoded credentials to the sandbox Login endpoint', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockLoginResponse());
    await loginAp(ENV);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe(`${BILL_AP_SANDBOX_BASE}/api/v3/Login.json`);
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(String((init as RequestInit).body));
    expect(body.get('userName')).toBe(ENV.username);
    expect(body.get('password')).toBe(ENV.password);
    expect(body.get('orgId')).toBe(ENV.orgId);
    expect(body.get('devKey')).toBe(ENV.devKey);
  });

  it('returns the sessionId from the response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockLoginResponse('sess_123'));
    const id = await loginAp(ENV);
    expect(id).toBe('sess_123');
  });

  it('caches the session across calls for the same env', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockLoginResponse('sess_xy'));
    const a = await loginAp(ENV);
    const b = await loginAp(ENV);
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('refetches after logoutAp invalidates the cache', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockLoginResponse('sess_1'));
    await loginAp(ENV);
    logoutAp(ENV.id);
    await loginAp(ENV);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws when required fields are missing', async () => {
    const bad = { ...ENV, devKey: '' };
    await expect(loginAp(bad)).rejects.toThrow(/devKey|username|password|orgId/);
  });

  it('throws on non-ok HTTP response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'boom',
    } as unknown as Response);
    await expect(loginAp(ENV)).rejects.toThrow(/Bill AP login failed/);
  });

  it('throws when response_status is non-zero', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response_status: 1,
        response_message: 'BDC_1234: invalid credentials',
        response_data: {},
      }),
      text: async () => '',
    } as unknown as Response);
    await expect(loginAp(ENV)).rejects.toThrow(/invalid credentials/);
  });
});
