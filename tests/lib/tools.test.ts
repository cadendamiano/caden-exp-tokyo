import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOLS, runTool } from '@/lib/tools';
import { BILLS, VENDORS, AGING, CATEGORY_SPEND } from '@/lib/data';
import { __clearBillSessionCacheForTests } from '@/lib/bill/auth';

vi.mock('@/lib/secrets', async () => {
  const actual = await vi.importActual<typeof import('@/lib/secrets')>('@/lib/secrets');
  return {
    ...actual,
    getBillEnvironment: vi.fn(async (id: string) => {
      if (id === 'env_test') {
        return {
          id: 'env_test',
          name: 'sbx',
          devKey: 'DEV',
          username: 'u',
          password: 'p',
          orgId: '001',
          product: 'ap' as const,
        };
      }
      if (id === 'env_se') {
        return {
          id: 'env_se',
          name: 'sbx-se',
          devKey: 'DEV',
          username: 'u',
          password: 'p',
          orgId: '001',
          product: 'se' as const,
        };
      }
      return undefined;
    }),
  };
});

describe('TOOLS definitions', () => {
  it('exports exactly 6 tools', () => {
    expect(TOOLS).toHaveLength(6);
  });

  it('every tool has a name, description, and parameters', () => {
    for (const tool of TOOLS) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters.type).toBe('object');
      expect(typeof tool.parameters.properties).toBe('object');
    }
  });

  it('tool names are the expected set', () => {
    const names = TOOLS.map(t => t.name);
    expect(names).toContain('list_bills');
    expect(names).toContain('list_vendors');
    expect(names).toContain('get_aging_summary');
    expect(names).toContain('get_category_spend');
    expect(names).toContain('find_duplicate_invoices');
    expect(names).toContain('render_artifact');
  });

  it('render_artifact requires kind and title', () => {
    const tool = TOOLS.find(t => t.name === 'render_artifact')!;
    expect(tool.parameters.required).toContain('kind');
    expect(tool.parameters.required).toContain('title');
  });

  it('render_artifact kind enum has exactly 4 values', () => {
    const tool = TOOLS.find(t => t.name === 'render_artifact')!;
    const kindEnum = tool.parameters.properties.kind.enum as string[];
    expect(kindEnum).toHaveLength(4);
    expect(kindEnum).toContain('ap-table');
    expect(kindEnum).toContain('spend-chart');
    expect(kindEnum).toContain('rule-net15');
    expect(kindEnum).toContain('crm-flow');
  });

  it('list_bills status enum includes all valid statuses', () => {
    const tool = TOOLS.find(t => t.name === 'list_bills')!;
    const statusEnum = tool.parameters.properties.status.enum as string[];
    expect(statusEnum).toContain('overdue');
    expect(statusEnum).toContain('due-soon');
    expect(statusEnum).toContain('open');
    expect(statusEnum).toContain('scheduled');
    expect(statusEnum).toContain('all');
  });
});

describe('runTool — list_bills', () => {
  it('returns all bills when no filters are applied', async () => {
    const result = await runTool('list_bills', {});
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(BILLS.length);
  });

  it('returns all bills when status is "all"', async () => {
    const result = await runTool('list_bills', { status: 'all' });
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(BILLS.length);
  });

  it('filters by status=overdue', async () => {
    const result = await runTool('list_bills', { status: 'overdue' });
    expect(result.ok).toBe(true);
    const bills = result.data as any[];
    expect(bills.length).toBeGreaterThan(0);
    for (const bill of bills) {
      expect(bill.status).toBe('overdue');
    }
  });

  it('filters by status=due-soon', async () => {
    const result = await runTool('list_bills', { status: 'due-soon' });
    const bills = result.data as any[];
    for (const bill of bills) {
      expect(bill.status).toBe('due-soon');
    }
  });

  it('filters by vendorId', async () => {
    const result = await runTool('list_bills', { vendorId: 'vnd_01' });
    expect(result.ok).toBe(true);
    const bills = result.data as any[];
    expect(bills.length).toBeGreaterThan(0);
    for (const bill of bills) {
      expect(bill.vendor).toBe('vnd_01');
    }
  });

  it('combines status and vendorId filters', async () => {
    const result = await runTool('list_bills', { status: 'due-soon', vendorId: 'vnd_01' });
    const bills = result.data as any[];
    for (const bill of bills) {
      expect(bill.status).toBe('due-soon');
      expect(bill.vendor).toBe('vnd_01');
    }
  });

  it('returns empty array for a vendorId with no bills', async () => {
    const result = await runTool('list_bills', { vendorId: 'vnd_nonexistent' });
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(0);
  });

  it('summary includes bill count and total', async () => {
    const result = await runTool('list_bills', { status: 'overdue' });
    expect(result.summary).toMatch(/\d+ bills/);
    expect(result.summary).toContain('$');
  });
});

describe('runTool — list_vendors', () => {
  it('returns all vendors', async () => {
    const result = await runTool('list_vendors', {});
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(VENDORS.length);
  });

  it('summary mentions vendor count', async () => {
    const result = await runTool('list_vendors', {});
    expect(result.summary).toContain(`${VENDORS.length} vendors`);
  });
});

describe('runTool — get_aging_summary', () => {
  it('returns all aging buckets', async () => {
    const result = await runTool('get_aging_summary', {});
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(AGING.length);
  });

  it('summary mentions bucket count and total amount', async () => {
    const result = await runTool('get_aging_summary', {});
    expect(result.summary).toContain(`${AGING.length} buckets`);
    expect(result.summary).toContain('$');
  });
});

describe('runTool — get_category_spend', () => {
  it('returns all spend categories', async () => {
    const result = await runTool('get_category_spend', {});
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(CATEGORY_SPEND.length);
  });

  it('summary mentions category count and total', async () => {
    const result = await runTool('get_category_spend', {});
    expect(result.summary).toContain(`${CATEGORY_SPEND.length} categories`);
    expect(result.summary).toContain('$');
  });
});

describe('runTool — find_duplicate_invoices', () => {
  it('returns ok with duplicate pairs', async () => {
    const result = await runTool('find_duplicate_invoices', {});
    expect(result.ok).toBe(true);
    const pairs = result.data as any[];
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('each pair has vendor, a, b, and confidence', async () => {
    const result = await runTool('find_duplicate_invoices', {});
    const pairs = result.data as any[];
    for (const pair of pairs) {
      expect(typeof pair.vendor).toBe('string');
      expect(pair.a).toBeDefined();
      expect(pair.b).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(pair.confidence);
    }
  });

  it('includes at least one high-confidence pair', async () => {
    const result = await runTool('find_duplicate_invoices', {});
    const pairs = result.data as any[];
    const highConf = pairs.filter((p: any) => p.confidence === 'high');
    expect(highConf.length).toBeGreaterThan(0);
  });

  it('summary mentions suspect pairs', async () => {
    const result = await runTool('find_duplicate_invoices', {});
    expect(result.summary).toMatch(/\d+ suspect pairs/);
  });
});

describe('runTool — render_artifact', () => {
  it('returns ok and echoes the input as data', async () => {
    const input = { kind: 'ap-table', title: 'Open AP', sub: 'TABLE' };
    const result = await runTool('render_artifact', input);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(input);
    expect(result.summary).toBe('artifact opened in UI');
  });
});

describe('runTool — unknown tool', () => {
  it('returns ok=false for an unrecognised tool name', async () => {
    const result = await runTool('nonexistent_tool', {});
    expect(result.ok).toBe(false);
    expect(result.summary).toContain('unknown tool');
    expect(result.data).toBeNull();
  });
});

describe('runTool — testing mode (real Bill adapter, mocked fetch)', () => {
  beforeEach(() => {
    __clearBillSessionCacheForTests();
    vi.restoreAllMocks();
  });

  function mockSequence(...responses: any[]) {
    const fetchSpy = vi.spyOn(global, 'fetch');
    for (const res of responses) {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => res,
        text: async () => '',
      } as unknown as Response);
    }
    return fetchSpy;
  }

  it('list_bills calls Login then List/Bill and returns mapped data', async () => {
    const loginRes = {
      response_status: 0,
      response_message: 'ok',
      response_data: { sessionId: 'sess_1' },
    };
    const listRes = {
      response_status: 0,
      response_message: 'ok',
      response_data: [
        { id: 'b1', amount: 100, paymentStatus: '1', vendorId: 'v1', invoiceNumber: 'A-1', dueDate: '2026-01-01' },
        { id: 'b2', amount: 200, paymentStatus: '1', vendorId: 'v1', invoiceNumber: 'A-2', dueDate: '2026-02-01' },
      ],
    };
    const fetchSpy = mockSequence(loginRes, listRes);

    const result = await runTool(
      'list_bills',
      { status: 'overdue' },
      { mode: 'testing', billEnvId: 'env_test', billProduct: 'ap' }
    );

    expect(result.ok).toBe(true);
    expect((result.data as any[])).toHaveLength(2);
    expect(result.summary).toMatch(/2 bills/);
    expect(result.summary).toContain('$300');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const listCall = fetchSpy.mock.calls[1];
    expect(String(listCall[0])).toMatch(/\/api\/v3\/List\/Bill\.json$/);
    const body = JSON.parse(String((listCall[1] as RequestInit).body));
    expect(body.sessionId).toBe('sess_1');
    expect(Array.isArray(body.filters)).toBe(true);
    expect(body.filters[0]).toMatchObject({ field: 'paymentStatus' });
  });

  it('returns a clear error when the Bill env is not found', async () => {
    const result = await runTool(
      'list_vendors',
      {},
      { mode: 'testing', billEnvId: 'env_missing', billProduct: 'ap' }
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/not found/);
  });

  it('surfaces the Bill AP error message when login fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response_status: 1,
        response_message: 'BDC_1234 invalid credentials',
        response_data: {},
      }),
      text: async () => '',
    } as unknown as Response);

    const result = await runTool(
      'list_vendors',
      {},
      { mode: 'testing', billEnvId: 'env_test', billProduct: 'ap' }
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/invalid credentials/);
  });

  it('render_artifact in testing mode still returns ok without hitting Bill', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const result = await runTool(
      'render_artifact',
      { kind: 'ap-table', title: 'Open AP' },
      { mode: 'testing', billEnvId: 'env_test', billProduct: 'ap' }
    );
    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('S&E env surfaces "not yet wired" without calling fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const result = await runTool(
      'list_bills',
      {},
      { mode: 'testing', billEnvId: 'env_se', billProduct: 'se' }
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/S&E not yet wired/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
