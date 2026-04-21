import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOLS, MODEL_TOOLS, INTERNAL_TOOLS, runTool } from '@/lib/tools';
import { BILLS, VENDORS, AGING, CATEGORY_SPEND, EXPENSES, EMPLOYEES } from '@/lib/data';
import { __clearBillSessionCacheForTests } from '@/lib/bill/auth';
import { __clearSeTokenCacheForTests } from '@/lib/bill/se';

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
          seClientId: 'se_client',
          seClientSecret: 'se_secret',
        };
      }
      return undefined;
    }),
  };
});

describe('TOOLS definitions', () => {
  it('exports 14 tools total (13 model + 1 internal)', () => {
    expect(TOOLS).toHaveLength(14);
    expect(MODEL_TOOLS).toHaveLength(13);
    expect(INTERNAL_TOOLS).toHaveLength(1);
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
    expect(names).toContain('get_liquidity_projection');
    expect(names).toContain('list_expenses');
    expect(names).toContain('get_employee');
    expect(names).toContain('render_artifact');
    expect(names).toContain('stage_payment_batch');
    expect(names).toContain('submit_payment_batch');
    expect(names).toContain('create_automation_rule');
    expect(names).toContain('approve_expense');
    expect(names).toContain('reject_expense');
  });

  it('MODEL_TOOLS does not expose internal submit_payment_batch', () => {
    const names = MODEL_TOOLS.map(t => t.name);
    expect(names).not.toContain('submit_payment_batch');
  });

  it('render_artifact requires kind and title', () => {
    const tool = TOOLS.find(t => t.name === 'render_artifact')!;
    expect(tool.parameters.required).toContain('kind');
    expect(tool.parameters.required).toContain('title');
  });

  it('render_artifact kind enum has exactly 7 values', () => {
    const tool = TOOLS.find(t => t.name === 'render_artifact')!;
    const kindEnum = tool.parameters.properties.kind.enum as string[];
    expect(kindEnum).toHaveLength(7);
    expect(kindEnum).toContain('ap-table');
    expect(kindEnum).toContain('spend-chart');
    expect(kindEnum).toContain('rule-net15');
    expect(kindEnum).toContain('crm-flow');
    expect(kindEnum).toContain('document');
    expect(kindEnum).toContain('liquidity-burndown');
    expect(kindEnum).toContain('sweep-rule');
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

describe('runTool — get_liquidity_projection', () => {
  it('returns a series, threshold, and min point in mock mode', async () => {
    const result = await runTool('get_liquidity_projection', {});
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(Array.isArray(data.series)).toBe(true);
    expect(data.series.length).toBeGreaterThan(0);
    expect(Array.isArray(data.drivers)).toBe(true);
    expect(typeof data.threshold).toBe('number');
    expect(typeof data.minDay).toBe('string');
    expect(typeof data.minBalance).toBe('number');
    // Min is genuinely the minimum of the series
    const minFromSeries = Math.min(...data.series.map((p: any) => p.balance));
    expect(data.minBalance).toBe(minFromSeries);
  });

  it('honors a custom days parameter', async () => {
    const result = await runTool('get_liquidity_projection', { days: 10 });
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.series.length).toBe(11);  // days + 1 (inclusive endpoints)
  });

  it('summary mentions min balance and day', async () => {
    const result = await runTool('get_liquidity_projection', {});
    expect(result.summary).toMatch(/min \$/);
    expect(result.summary).toMatch(/points/);
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

  it('list_expenses (S&E) obtains an OAuth token then calls /expenses', async () => {
    __clearSeTokenCacheForTests();
    const tokenRes = { access_token: 'tok_se_1', token_type: 'Bearer', expires_in: 1800 };
    const expensesRes = {
      results: [
        { id: 'e1', amount: 50, employeeId: 'emp_01', status: 'approved' },
        { id: 'e2', amount: 125, employeeId: 'emp_02', status: 'pending' },
      ],
    };
    const fetchSpy = mockSequence(tokenRes, expensesRes);

    const result = await runTool(
      'list_expenses',
      {},
      { mode: 'testing', billEnvId: 'env_se', billProduct: 'se' }
    );

    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(2);
    expect(result.summary).toMatch(/2 expenses/);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenInit] = fetchSpy.mock.calls[0];
    expect(String(tokenUrl)).toMatch(/\/oauth\/token$/);
    const tokenBody = new URLSearchParams(String((tokenInit as RequestInit).body));
    expect(tokenBody.get('grant_type')).toBe('client_credentials');
    expect(tokenBody.get('client_id')).toBe('se_client');

    const [expUrl, expInit] = fetchSpy.mock.calls[1];
    expect(String(expUrl)).toMatch(/\/expenses\?/);
    const authHeader = new Headers((expInit as RequestInit).headers).get('authorization');
    expect(authHeader).toBe('Bearer tok_se_1');
  });

  it('get_employee (S&E) reuses cached token for subsequent calls', async () => {
    __clearSeTokenCacheForTests();
    const tokenRes = { access_token: 'tok_se_2', token_type: 'Bearer', expires_in: 1800 };
    const employeeRes = { id: 'emp_01', name: 'Avery Chen', email: 'avery@company.com' };
    const fetchSpy = mockSequence(tokenRes, employeeRes);

    const result = await runTool(
      'get_employee',
      { id: 'emp_01' },
      { mode: 'testing', billEnvId: 'env_se', billProduct: 'se' }
    );

    expect(result.ok).toBe(true);
    expect((result.data as any).id).toBe('emp_01');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1][0])).toMatch(/\/employees\/emp_01$/);
  });
});

describe('runTool — mock S&E (list_expenses, get_employee)', () => {
  it('list_expenses returns all mock expenses', async () => {
    const result = await runTool('list_expenses', {});
    expect(result.ok).toBe(true);
    expect((result.data as any[]).length).toBe(EXPENSES.length);
  });

  it('list_expenses filters by employeeId', async () => {
    const result = await runTool('list_expenses', { employeeId: 'emp_01' });
    const rows = result.data as any[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.employee).toBe('emp_01');
  });

  it('list_expenses filters by status', async () => {
    const result = await runTool('list_expenses', { status: 'pending' });
    const rows = result.data as any[];
    for (const r of rows) expect(r.status).toBe('pending');
  });

  it('get_employee returns a known employee', async () => {
    const result = await runTool('get_employee', { id: EMPLOYEES[0].id });
    expect(result.ok).toBe(true);
    expect((result.data as any).id).toBe(EMPLOYEES[0].id);
  });

  it('get_employee returns ok=false when id is missing', async () => {
    const result = await runTool('get_employee', {});
    expect(result.ok).toBe(false);
  });
});

describe('runTool — internal-tool guard', () => {
  it('refuses submit_payment_batch without allowInternal', async () => {
    const result = await runTool('submit_payment_batch', { batchId: 'btch_x' });
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/internal/i);
  });

  it('allows submit_payment_batch when allowInternal is true', async () => {
    const result = await runTool(
      'submit_payment_batch',
      { batchId: 'btch_abc123' },
      undefined,
      { allowInternal: true }
    );
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.confirmationId).toMatch(/^PMT-[A-Z0-9]{6}$/);
    expect(data.simulated).toBe(true);
  });
});

describe('runTool — stage_payment_batch', () => {
  it('requires billIds', async () => {
    const result = await runTool('stage_payment_batch', {});
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/billIds/);
  });

  it('returns approvalPayload with stake=payment below $25k', async () => {
    // Pick a small bill from fixtures to keep total small
    const smallBill = BILLS.slice().sort((a, b) => a.amount - b.amount)[0];
    const result = await runTool('stage_payment_batch', { billIds: [smallBill.id] });
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.simulated).toBe(true);
    expect(data.approvalPayload.stake).toBe('payment');
    expect(data.approvalPayload.total).toBe(smallBill.amount);
    expect(data.approvalPayload.items).toHaveLength(1);
  });

  it('promotes stake to large-payment when total exceeds $25k via billHints', async () => {
    const result = await runTool('stage_payment_batch', {
      billIds: ['bll_unknown_xyz'],
      billHints: [{ id: 'bll_unknown_xyz', amount: 30000, vendor: 'Unknown LLP', invoice: 'INV-X' }],
    });
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.approvalPayload.stake).toBe('large-payment');
    expect(data.approvalPayload.requiresSecondApprover).toBe(true);
    expect(data.approvalPayload.items[0].amount).toBe(30000);
    expect(data.approvalPayload.items[0].vendor).toBe('Unknown LLP');
  });

  it('stake stays payment at boundary of $25k total', async () => {
    const result = await runTool('stage_payment_batch', {
      billIds: ['bll_boundary'],
      billHints: [{ id: 'bll_boundary', amount: 25000 }],
    });
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.approvalPayload.stake).toBe('payment');
  });

  it('falls back to hint-derived fields when bill id is not in the dataset', async () => {
    const result = await runTool('stage_payment_batch', {
      billIds: ['bll_zzz999'],
      billHints: [{ id: 'bll_zzz999', amount: 100 }],
    });
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.approvalPayload.items).toHaveLength(1);
    expect(data.approvalPayload.items[0].amount).toBe(100);
    // Falls back to hint vendor/invoice format even without explicit vendor
    expect(typeof data.approvalPayload.items[0].invoice).toBe('string');
    expect(typeof data.approvalPayload.items[0].vendor).toBe('string');
  });
});

describe('runTool — approve_expense / reject_expense', () => {
  it('approve_expense is tolerant of unknown expense id', async () => {
    const result = await runTool('approve_expense', { expenseId: 'exp_unknown_xyz' });
    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/simulated · unknown id/);
    const data = result.data as any;
    expect(data.simulated).toBe(true);
  });

  it('approve_expense resolves a known expense', async () => {
    const exp = EXPENSES[0];
    const result = await runTool('approve_expense', { expenseId: exp.id });
    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/\(simulated\)/);
    const data = result.data as any;
    expect(data.expenseId).toBe(exp.id);
    expect(data.simulated).toBe(true);
  });

  it('reject_expense is tolerant of unknown expense id', async () => {
    const result = await runTool('reject_expense', {
      expenseId: 'exp_unknown_xyz',
      reason: 'over budget',
    });
    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/simulated · unknown id/);
  });

  it('reject_expense requires expenseId', async () => {
    const result = await runTool('reject_expense', { reason: 'missing' });
    expect(result.ok).toBe(false);
  });
});

describe('runTool — create_automation_rule', () => {
  it('creates a simulated rule with an id', async () => {
    const result = await runTool('create_automation_rule', {
      name: 'Net-15 auto-flag',
      trigger: 'bill.created',
    });
    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/Net-15 auto-flag/);
    const data = result.data as any;
    expect(typeof data.ruleId).toBe('string');
    expect(data.simulated).toBe(true);
  });
});
