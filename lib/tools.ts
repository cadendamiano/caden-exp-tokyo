import { getDataset, type DatasetKey } from './data';
import { fmtMoneyShort } from './format';
import { getBillEnvironment } from './secrets';
import {
  apList,
  apAgingSummary,
  apCategorySpend,
  apFindDuplicateInvoices,
  apStagePaymentBatch,
  apSubmitPaymentBatch,
  apCreateAutomationRule,
  type ApFilter,
} from './bill/ap';
import {
  seRequest,
  seListExpenses,
  seGetEmployee,
  seApproveExpense,
  seRejectExpense,
  type SeExpenseFilter,
} from './bill/se';
import type { FlowStep } from './flows';

export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
};

export type ToolContext = {
  mode?: 'demo' | 'testing';
  billEnvId?: string;
  billProduct?: 'ap' | 'se';
  demoDataset?: DatasetKey;
};

type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];

export const DEMO_SANDBOX_ENV_ID = '__demo_sandbox__';

// ─── Tool definitions ─────────────────────────────────────────────────

const READ_TOOLS: ToolDef[] = [
  {
    name: 'list_bills',
    description: 'List accounts-payable bills from the BILL workspace. Optionally filter by status or vendor.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['overdue', 'due-soon', 'open', 'scheduled', 'all'],
          description: 'Filter by bill status',
        },
        vendorId: { type: 'string', description: 'Filter by vendor id (vnd_XX)' },
      },
    },
  },
  {
    name: 'list_vendors',
    description: 'List all active vendors in the BILL workspace.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_aging_summary',
    description: 'Get an aging-bucket summary of open accounts payable.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_category_spend',
    description: 'Get total paid spend grouped by vendor category for a named period.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'e.g. "Q1 2026"', default: 'Q1 2026' },
      },
    },
  },
  {
    name: 'find_duplicate_invoices',
    description: 'Scan recent bills for likely duplicates using fuzzy invoice-number matching.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'integer', default: 60 },
      },
    },
  },
  {
    name: 'get_liquidity_projection',
    description: 'Project operating-account cash balance forward using scheduled AP, payroll, and AR.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Projection horizon in days (default 60, max 120).' },
        threshold: { type: 'number', description: 'Low-balance floor in dollars (default from dataset).' },
      },
    },
  },
  {
    name: 'list_expenses',
    description: 'List expense reports or card transactions from Bill Spend & Expense. Optionally filter by employee or status.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Filter by employee id' },
        status: { type: 'string', description: 'Filter by expense status (e.g. approved, pending)' },
      },
    },
  },
  {
    name: 'get_employee',
    description: 'Get a single Bill Spend & Expense employee by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Employee id' },
      },
      required: ['id'],
    },
  },
  {
    name: 'render_artifact',
    description:
      'Open an interactive artifact card in the UI. Use when the user asks to visualize, list, or configure something that has a matching artifact kind.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['ap-table', 'spend-chart', 'rule-net15', 'crm-flow', 'document', 'liquidity-burndown', 'sweep-rule'],
        },
        title: { type: 'string' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "TABLE · INTERACTIVE"' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
      },
      required: ['kind', 'title'],
    },
  },
  {
    name: 'render_html_artifact',
    description:
      'Open a custom HTML/CSS/JS artifact in the UI. Use this whenever the user asks for a visualization or layout that does not match one of the fixed kinds (ap-table, spend-chart, rule-net15, crm-flow) — for example a line graph, treemap, heatmap, sankey, sunburst, scatter, custom table, KPI dashboard, or any freeform layout. The artifact renders inside a sandboxed iframe with ECharts v5, D3 v7, and Chart.js v4 available globally.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Display title for the artifact tab.' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "CHART · TREEMAP".' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
        html: {
          type: 'string',
          description: 'Body HTML. A root element with id="root" is provided; you may also write into it or add your own containers.',
        },
        css: { type: 'string', description: 'Optional extra CSS applied inside the sandbox.' },
        script: {
          type: 'string',
          description:
            'JS that runs after ECharts, D3, and Chart.js are loaded. Access the piped dataset via `window.__DATA`. Mount into `#root`.',
        },
        dataJson: {
          type: 'string',
          description:
            'JSON-serialized dataset to pipe in. Typically the data field from a prior read tool call (list_bills, get_category_spend, etc.), stringified. Exposed to the script as window.__DATA.',
        },
      },
      required: ['title', 'html'],
    },
  },
];

const WRITE_TOOLS: ToolDef[] = [
  {
    name: 'stage_payment_batch',
    description:
      'Stage a batch for human approval. The UI will render an approval card — do not fabricate one in text. Use billHints to supply amount/vendor for bill IDs not in the local dataset.',
    parameters: {
      type: 'object',
      properties: {
        billIds: { type: 'array', items: { type: 'string' } },
        bankAccount: { type: 'string' },
        method: { type: 'string', enum: ['ACH', 'Check', 'Wire'] },
        scheduledFor: { type: 'string' },
        billHints: {
          type: 'array',
          description: 'Optional per-bill hints for IDs not in the local fixture. amount required for correct stake classification.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              vendor: { type: 'string' },
              invoice: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      required: ['billIds'],
    },
  },
  // TODO: add 'automation' approval card UX — for now this tool returns inline success.
  {
    name: 'create_automation_rule',
    description: 'Create a BILL automation rule. Returns inline confirmation; no approval card in this iteration.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        trigger: { type: 'string' },
        conditions: { type: 'array', items: { type: 'object', properties: {} } },
        actions: { type: 'array', items: { type: 'object', properties: {} } },
      },
      required: ['name', 'trigger'],
    },
  },
  {
    name: 'approve_expense',
    description: 'Approve a Bill Spend & Expense item by id.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'reject_expense',
    description: 'Reject a Bill Spend & Expense item by id, with a reason.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['expenseId', 'reason'],
    },
  },
];

// Tools the LLM can call.
export const MODEL_TOOLS: ToolDef[] = [...READ_TOOLS, ...WRITE_TOOLS];

// Internal dispatcher — not exposed to the LLM.
export const INTERNAL_TOOLS: ToolDef[] = [
  {
    name: 'submit_payment_batch',
    description: 'Submit an approved payment batch. Internal — called only by handleApprove after user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        batchId: { type: 'string' },
        payload: { type: 'object', properties: {} },
      },
      required: ['batchId'],
    },
  },
];

// Union kept for internal callers / tests.
export const TOOLS: ToolDef[] = [...MODEL_TOOLS, ...INTERNAL_TOOLS];

const INTERNAL_TOOL_NAMES = new Set(INTERNAL_TOOLS.map(t => t.name));

// ─── Dispatcher ───────────────────────────────────────────────────────

export async function runTool(
  name: string,
  input: any,
  ctx?: ToolContext,
  opts?: { allowInternal?: boolean }
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  if (INTERNAL_TOOL_NAMES.has(name) && !opts?.allowInternal) {
    return {
      ok: false,
      summary: `tool "${name}" is internal; call via /api/dryrun with allowInternal`,
      data: null,
    };
  }
  const useReal =
    ctx?.mode === 'testing' &&
    Boolean(ctx?.billEnvId) &&
    ctx?.billEnvId !== DEMO_SANDBOX_ENV_ID;
  if (useReal) {
    return runRealTool(name, input, ctx!);
  }
  return runMockTool(name, input, ctx?.demoDataset);
}

// ─── Real-mode dispatcher ─────────────────────────────────────────────

async function runRealTool(
  name: string,
  input: any,
  ctx: ToolContext
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  try {
    if (name === 'render_artifact') {
      return { ok: true, summary: 'artifact opened in UI', data: input };
    }
    if (name === 'render_html_artifact') {
      return { ok: true, summary: 'html artifact opened in UI', data: input };
    }
    const env = await getBillEnvironment(ctx.billEnvId!);
    if (!env) {
      return {
        ok: false,
        summary: `Bill environment ${ctx.billEnvId} not found`,
        data: null,
      };
    }

    // Write tools: delegate to stubs, fall back to mock on simulated.
    if (name === 'stage_payment_batch') {
      const stub = await apStagePaymentBatch(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Batch staged', data: stub };
    }
    if (name === 'submit_payment_batch') {
      const stub = await apSubmitPaymentBatch(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Batch submitted', data: stub };
    }
    if (name === 'create_automation_rule') {
      const stub = await apCreateAutomationRule(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Rule created', data: stub };
    }
    if (name === 'approve_expense') {
      const stub = await seApproveExpense(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Expense approved', data: stub };
    }
    if (name === 'reject_expense') {
      const stub = await seRejectExpense(env, input);
      if (stub?.simulated) {
        return runMockTool(name, input, ctx.demoDataset);
      }
      return { ok: true, summary: 'Expense rejected', data: stub };
    }

    if (ctx.billProduct === 'se') {
      if (name === 'list_expenses') {
        const filters: SeExpenseFilter[] = [];
        if (input?.employeeId) filters.push({ field: 'employeeId', value: String(input.employeeId) });
        if (input?.status) filters.push({ field: 'status', value: String(input.status) });
        const expenses = await seListExpenses(env, filters);
        const total = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
        return {
          ok: true,
          summary: `${expenses.length} expenses · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          data: expenses,
        };
      }
      if (name === 'get_employee') {
        if (!input?.id) return { ok: false, summary: 'employee id required', data: null };
        const employee = await seGetEmployee(env, String(input.id));
        return {
          ok: true,
          summary: `employee ${employee?.id ?? input.id}`,
          data: employee,
        };
      }
      try {
        await seRequest(env, '/me');
      } catch (e: any) {
        return {
          ok: false,
          summary: e?.message ?? 'Bill S&E request failed',
          data: null,
        };
      }
    }

    if (name === 'list_bills') {
      const filters: ApFilter[] = [];
      const status = input?.status;
      if (status && status !== 'all') {
        if (status === 'scheduled') filters.push({ field: 'paymentStatus', op: '=', value: '4' });
        else filters.push({ field: 'paymentStatus', op: '=', value: '1' });
      }
      if (input?.vendorId) filters.push({ field: 'vendorId', op: '=', value: String(input.vendorId) });
      const bills = await apList(env, 'Bill', filters);
      const total = bills.reduce((s: number, b: any) => s + Number(b.amount ?? 0), 0);
      return {
        ok: true,
        summary: `${bills.length} bills · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: bills,
      };
    }
    if (name === 'list_vendors') {
      const vendors = await apList(env, 'Vendor');
      return { ok: true, summary: `${vendors.length} vendors`, data: vendors };
    }
    if (name === 'get_aging_summary') {
      const buckets = await apAgingSummary(env);
      const total = buckets.reduce((s, b) => s + b.amount, 0);
      return {
        ok: true,
        summary: `${buckets.length} buckets · $${total.toLocaleString()}`,
        data: buckets,
      };
    }
    if (name === 'get_category_spend') {
      const rows = await apCategorySpend(env, input?.period);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return {
        ok: true,
        summary: `${rows.length} categories · $${total.toLocaleString()}`,
        data: rows,
      };
    }
    if (name === 'find_duplicate_invoices') {
      const pairs = await apFindDuplicateInvoices(env, Number(input?.days ?? 60));
      return { ok: true, summary: `${pairs.length} suspect pairs`, data: pairs };
    }
    if (name === 'get_liquidity_projection') {
      return { ok: false, summary: 'not yet wired to Bill sandbox', data: null };
    }
    return { ok: false, summary: `unknown tool: ${name}`, data: null };
  } catch (e: any) {
    return { ok: false, summary: `error: ${e?.message ?? 'unknown'}`, data: null };
  }
}

// ─── Mock dispatcher ──────────────────────────────────────────────────

async function runMockTool(
  name: string,
  input: any,
  dataset?: DatasetKey
): Promise<{ ok: boolean; summary: string; data: unknown }> {
  try {
    const data = getDataset(dataset);
    const { VENDORS, BILLS, AGING, CATEGORY_SPEND, EMPLOYEES, EXPENSES } = data;
    if (name === 'list_bills') {
      const status = input?.status ?? 'all';
      const vendorId = input?.vendorId;
      let bills = BILLS.slice();
      if (status !== 'all') bills = bills.filter(b => b.status === status);
      if (vendorId) bills = bills.filter(b => b.vendor === vendorId);
      const total = bills.reduce((s, b) => s + b.amount, 0);
      return {
        ok: true,
        summary: `${bills.length} bills · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: bills,
      };
    }
    if (name === 'list_vendors') {
      return { ok: true, summary: `${VENDORS.length} vendors`, data: VENDORS };
    }
    if (name === 'get_aging_summary') {
      const total = AGING.reduce((s, a) => s + a.amount, 0);
      return { ok: true, summary: `${AGING.length} buckets · $${total.toLocaleString()}`, data: AGING };
    }
    if (name === 'get_category_spend') {
      const total = CATEGORY_SPEND.reduce((s, c) => s + c.amount, 0);
      return { ok: true, summary: `${CATEGORY_SPEND.length} categories · $${total.toLocaleString()}`, data: CATEGORY_SPEND };
    }
    if (name === 'get_liquidity_projection') {
      const days = Math.min(Number(input?.days ?? 60), 120);
      const threshold = Number(input?.threshold ?? data.liquidityThreshold);
      const series = data.liquidityProjection.slice(0, days + 1);
      const minPoint = series.reduce((m, p) => (p.balance < m.balance ? p : m), series[0]);
      return {
        ok: true,
        summary: `min ${fmtMoneyShort(minPoint.balance)} on ${minPoint.day} · ${series.length} points`,
        data: {
          series,
          drivers: data.liquidityDrivers,
          accounts: data.bankAccounts,
          threshold,
          minDay: minPoint.day,
          minBalance: minPoint.balance,
        },
      };
    }
    if (name === 'find_duplicate_invoices') {
      const pairs = dataset === 'logistics'
        ? [
            {
              vendor: 'Apex Carrier Network',
              a: { invoice: 'ACN-2026-0381', amount: 14200, date: '2026-04-06' },
              b: { invoice: 'ACN-2026-381',  amount: 14200, date: '2026-04-18' },
              confidence: 'high',
            },
          ]
        : [
            {
              vendor: 'Brightline Marketing Co.',
              a: { invoice: 'BRT-5488',   amount: 2150, date: '2026-04-14' },
              b: { invoice: 'BRT-5488-A', amount: 2150, date: '2026-04-20' },
              confidence: 'high',
            },
            {
              vendor: 'Meridian Office Supply',
              a: { invoice: 'MOS-00441', amount: 842.1, date: '2026-03-10' },
              b: { invoice: 'MOS-0441',  amount: 842.1, date: '2026-03-12' },
              confidence: 'medium',
            },
          ];
      return { ok: true, summary: `${pairs.length} suspect pairs`, data: pairs };
    }
    if (name === 'list_expenses') {
      const employeeId = input?.employeeId;
      const status = input?.status;
      let expenses = EXPENSES.slice();
      if (employeeId) expenses = expenses.filter(e => e.employee === employeeId);
      if (status) expenses = expenses.filter(e => e.status === status);
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      return {
        ok: true,
        summary: `${expenses.length} expenses · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        data: expenses,
      };
    }
    if (name === 'get_employee') {
      if (!input?.id) return { ok: false, summary: 'employee id required', data: null };
      const employee = EMPLOYEES.find(e => e.id === String(input.id));
      if (!employee) return { ok: false, summary: `employee ${input.id} not found`, data: null };
      return { ok: true, summary: `employee ${employee.id}`, data: employee };
    }
    if (name === 'render_artifact') {
      return { ok: true, summary: 'artifact opened in UI', data: input };
    }
    if (name === 'render_html_artifact') {
      return { ok: true, summary: 'html artifact opened in UI', data: input };
    }

    // ── Write tools ──
    if (name === 'stage_payment_batch') {
      const billIds: string[] = Array.isArray(input?.billIds) ? input.billIds : [];
      if (billIds.length === 0) {
        return { ok: false, summary: 'stage_payment_batch requires billIds', data: null };
      }
      const hints = new Map<string, any>(
        (Array.isArray(input?.billHints) ? input.billHints : []).map((h: any) => [String(h.id), h])
      );
      const vendorName: Record<string, string> = {};
      for (const v of VENDORS) vendorName[v.id] = v.name;
      const lineItems = billIds.map((id: string) => {
        const bill = BILLS.find(b => b.id === id);
        if (bill) {
          return {
            vendor: vendorName[bill.vendor] ?? bill.vendor,
            invoice: bill.invoice,
            amount: bill.amount,
          };
        }
        const hint = hints.get(id);
        return {
          vendor: hint?.vendor ?? `Vendor ${id.slice(-4)}`,
          invoice: hint?.invoice ?? `INV-${id.slice(-6).toUpperCase()}`,
          amount: Number(hint?.amount ?? 0),
        };
      });
      const total = lineItems.reduce((s, li) => s + li.amount, 0);
      const stake: ApprovalPayload['stake'] = total > 25000 ? 'large-payment' : 'payment';
      const batchId = `btch_${Date.now().toString(36).slice(-6)}`;
      const approvalPayload: ApprovalPayload = {
        batchId,
        stake,
        from: input?.bankAccount ?? 'Ops Checking ••4821',
        method: input?.method ?? 'ACH',
        scheduledFor:
          input?.scheduledFor ?? (stake === 'large-payment' ? 'Pending second approval' : 'Today, 4:00 PM PT'),
        items: lineItems,
        total,
        requiresSecondApprover: stake === 'large-payment',
      };
      return {
        ok: true,
        summary: `Batch staged · ${lineItems.length} items · $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })} (simulated)`,
        data: { approvalPayload, simulated: true },
      };
    }
    if (name === 'submit_payment_batch') {
      const batchId = String(input?.batchId ?? '').trim();
      if (!batchId) {
        return { ok: false, summary: 'submit_payment_batch requires batchId', data: null };
      }
      const confirmationId = `PMT-${batchId.slice(-6).toUpperCase()}`;
      return {
        ok: true,
        summary: 'Batch submitted (simulated)',
        data: { confirmationId, simulated: true },
      };
    }
    if (name === 'create_automation_rule') {
      const ruleId = `rule_${Date.now().toString(36)}`;
      const nm = input?.name ? ` · ${input.name}` : '';
      return {
        ok: true,
        summary: `Rule created${nm} (simulated)`,
        data: { ruleId, simulated: true },
      };
    }
    if (name === 'approve_expense') {
      const expenseId = String(input?.expenseId ?? '').trim();
      if (!expenseId) {
        return { ok: false, summary: 'approve_expense requires expenseId', data: null };
      }
      const exp = EXPENSES.find(e => e.id === expenseId);
      if (!exp) {
        return {
          ok: true,
          summary: `Expense ${expenseId} approved (simulated · unknown id)`,
          data: { expenseId, simulated: true },
        };
      }
      return {
        ok: true,
        summary: `Expense ${exp.id} (${exp.category}) approved (simulated)`,
        data: { expenseId: exp.id, employee: exp.employee, category: exp.category, simulated: true },
      };
    }
    if (name === 'reject_expense') {
      const expenseId = String(input?.expenseId ?? '').trim();
      const reason = String(input?.reason ?? '').trim();
      if (!expenseId) {
        return { ok: false, summary: 'reject_expense requires expenseId', data: null };
      }
      const exp = EXPENSES.find(e => e.id === expenseId);
      if (!exp) {
        return {
          ok: true,
          summary: `Expense ${expenseId} rejected (simulated · unknown id)`,
          data: { expenseId, reason, simulated: true },
        };
      }
      return {
        ok: true,
        summary: `Expense ${exp.id} rejected (simulated): ${reason || 'no reason given'}`,
        data: { expenseId: exp.id, employee: exp.employee, reason, simulated: true },
      };
    }

    return { ok: false, summary: `unknown tool: ${name}`, data: null };
  } catch (e: any) {
    return { ok: false, summary: `error: ${e?.message ?? 'unknown'}`, data: null };
  }
}

const DYNAMIC_ARTIFACT_GUIDANCE = `
Rendering artifacts:
- For the four curated kinds (AP bills table, Q1 spend donut+bar, Net-15 automation rule, CRM flow), call \`render_artifact\` with kind ap-table, spend-chart, rule-net15, or crm-flow.
- For ANYTHING else — line graphs, treemaps, heatmaps, sunburst, sankey, scatter, radar, custom dashboards, KPI cards, custom tables, annotated layouts, or anything the user describes that does not exactly match one of those four — call \`render_html_artifact\`. Do NOT try to fit a bespoke request into the fixed kinds.
- \`render_html_artifact\` renders inside a sandboxed iframe with three libraries preloaded as globals: \`echarts\` (v5), \`d3\` (v7), and \`Chart\` (Chart.js v4). Prefer ECharts for treemap / sunburst / sankey / heatmap / complex multi-series charts. D3 is available for bespoke work; Chart.js for quick line/bar/pie.
- Data flow: first call the appropriate read tool (e.g. \`get_category_spend\`, \`list_bills\`, \`get_aging_summary\`, \`list_expenses\`). Then pass the JSON-stringified \`data\` field as \`dataJson\`. Reference it in the script as \`window.__DATA\`.
- The iframe provides \`<div id="root"></div>\`. Mount charts into that element (or a child you create). Keep \`html\` minimal — most content should be produced by the script. Inline any extra CSS via the \`css\` field.
- Do NOT include \`<script>\` tags inside \`html\` — the sandbox already wires ECharts/D3/Chart.js and runs your \`script\` after they load.
- Example script pattern:
    var root = document.getElementById('root');
    var el = document.createElement('div');
    el.style.height = '360px';
    root.appendChild(el);
    var chart = echarts.init(el);
    chart.setOption({ series: [{ type: 'treemap', data: window.__DATA }] });`;

export const SYSTEM_PROMPT = `You are BILL Coworker, an agentic coworker for finance teams using the BILL.com API. You help non-technical finance folks explore accounts payable, propose payments (always behind a human approval gate), build automations, and generate visual artifacts from their BILL data.

Style:
- Be concise, professional, and precise. Short paragraphs. Markdown **bold** and \`inline code\` are supported.
- When you need data, call tools rather than guessing. You can call multiple tools per turn.
- When the user asks to visualize or open an interactive view (AP list, spend chart, Net-15 rule, CRM flow, cash runway, sweep rule, report/document), call \`render_artifact\` with the right kind. Kinds: ap-table, spend-chart, rule-net15, crm-flow, document, liquidity-burndown, sweep-rule.
- To stage a payment, call \`stage_payment_batch\` with the bill IDs — the UI will render an approval card with a typed-confirmation gate. Do not fabricate approvals. Wait for the user's approve/reject before describing an outcome.
- Write actions available: \`stage_payment_batch\`, \`create_automation_rule\`, \`approve_expense\`, \`reject_expense\`. Submission happens only after user approval.
${DYNAMIC_ARTIFACT_GUIDANCE}

Finish every turn with a short natural-language summary of what you learned or did.`;

export const TESTING_SYSTEM_PROMPT = `You are BILL Coworker running in testing mode against a real Bill sandbox. Call tools to read live data from the configured sandbox environment — never guess or fabricate values.

Style:
- Concise, precise. Short paragraphs. Markdown **bold** and \`inline code\` are supported.
- Call tools for any data question. You can call multiple tools per turn.
- If a tool returns an error, surface the error message plainly so the user can diagnose.
- Write actions run as simulated writes against fixture data when the real endpoint isn't wired. Tool results include \`simulated: true\` in that case — always surface which mode you're in.
- If you stage bills whose IDs aren't in the local dataset, pass \`billHints[]\` with at least \`{id, amount}\` so the approval card totals are correct.
${DYNAMIC_ARTIFACT_GUIDANCE}

Finish every turn with a short natural-language summary of what you learned or did.`;
