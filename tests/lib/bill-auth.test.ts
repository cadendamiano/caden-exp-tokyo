import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loginAp,
  logoutAp,
  __clearBillSessionCacheForTests,
  BILL_AP_SANDBOX_BASE,
} from '@/lib/bill/auth';
import {
  loginSe,
  logoutSe,
  seRequest,
  __clearSeTokenCacheForTests,
  BILL_SE_SANDBOX_BASE,
} from '@/lib/bill/se';
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

const SE_ENV: BillEnvironment = {
  id: 'env_se_test',
  name: 'sandbox-se',
  devKey: '',
  username: '',
  password: '',
  orgId: '',
  product: 'se',
  seClientId: 'client_abc',
  seClientSecret: 'secret_xyz',
};

function mockTokenResponse(token = 'tok_abc') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: token, token_type: 'Bearer', expires_in: 1800 }),
    text: async () => '',
  } as unknown as Response;
}

describe('loginSe', () => {
  beforeEach(() => {
    __clearSeTokenCacheForTests();
    vi.restoreAllMocks();
  });

  it('POSTs client_credentials to the S&E token endpoint', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockTokenResponse());
    await loginSe(SE_ENV);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe(`${BILL_SE_SANDBOX_BASE}/oauth/token`);
    expect((init as RequestInit).method).toBe('POST');
    const body = new URLSearchParams(String((init as RequestInit).body));
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe(SE_ENV.seClientId);
    expect(body.get('client_secret')).toBe(SE_ENV.seClientSecret);
  });

  it('returns the access_token from the response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockTokenResponse('tok_1'));
    const t = await loginSe(SE_ENV);
    expect(t).toBe('tok_1');
  });

  it('caches the token across calls for the same env', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockTokenResponse('tok_cache'));
    const a = await loginSe(SE_ENV);
    const b = await loginSe(SE_ENV);
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('refetches after logoutSe invalidates the cache', async () => {
    const spy = vi.spyOn(global, 'fetch').mockResolvedValue(mockTokenResponse('tok_reset'));
    await loginSe(SE_ENV);
    logoutSe(SE_ENV.id);
    await loginSe(SE_ENV);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws when seClientId or seClientSecret is missing', async () => {
    const bad = { ...SE_ENV, seClientSecret: undefined };
    await expect(loginSe(bad)).rejects.toThrow(/seClientId|seClientSecret/);
  });

  it('throws on non-ok HTTP response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'boom',
    } as unknown as Response);
    await expect(loginSe(SE_ENV)).rejects.toThrow(/Bill S&E token failed/);
  });

  it('throws when response has no access_token', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: 'invalid_client', error_description: 'bad credentials' }),
      text: async () => '',
    } as unknown as Response);
    await expect(loginSe(SE_ENV)).rejects.toThrow(/bad credentials/);
  });
});

describe('seRequest', () => {
  beforeEach(() => {
    __clearSeTokenCacheForTests();
    vi.restoreAllMocks();
  });

  it('attaches Authorization: Bearer <token> to the request', async () => {
    const spy = vi.spyOn(global, 'fetch');
    spy.mockResolvedValueOnce(mockTokenResponse('tok_bearer'));
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => '',
    } as unknown as Response);

    await seRequest(SE_ENV, '/me');
    expect(spy).toHaveBeenCalledTimes(2);
    const [url, init] = spy.mock.calls[1];
    expect(String(url)).toBe(`${BILL_SE_SANDBOX_BASE}/me`);
    const auth = new Headers((init as RequestInit).headers).get('authorization');
    expect(auth).toBe('Bearer tok_bearer');
  });

  it('retries once with a fresh token on 401', async () => {
    const spy = vi.spyOn(global, 'fetch');
    spy.mockResolvedValueOnce(mockTokenResponse('tok_old'));
    spy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'unauthorized',
    } as unknown as Response);
    spy.mockResolvedValueOnce(mockTokenResponse('tok_new'));
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => '',
    } as unknown as Response);

    const result = await seRequest<{ ok: boolean }>(SE_ENV, '/me');
    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(4);
    const retryAuth = new Headers((spy.mock.calls[3][1] as RequestInit).headers).get('authorization');
    expect(retryAuth).toBe('Bearer tok_new');
  });
});
