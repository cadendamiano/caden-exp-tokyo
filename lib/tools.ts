import { BILLS, VENDORS, AGING, CATEGORY_SPEND } from './data';

export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
};

export const TOOLS: ToolDef[] = [
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
    name: 'render_artifact',
    description:
      'Open an interactive artifact card in the UI. Use when the user asks to visualize, list, or configure something that has a matching artifact kind.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['ap-table', 'spend-chart', 'rule-net15', 'crm-flow'],
        },
        title: { type: 'string' },
        sub: { type: 'string', description: 'Short uppercase subtitle, e.g. "TABLE · INTERACTIVE"' },
        meta: { type: 'string', description: 'Short summary with markdown bold supported.' },
      },
      required: ['kind', 'title'],
    },
  },
];

export async function runTool(name: string, input: any): Promise<{ ok: boolean; summary: string; data: unknown }> {
  try {
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
    if (name === 'find_duplicate_invoices') {
      const pairs = [
        {
          vendor: 'Brightline Marketing Co.',
          a: { invoice: 'BRT-5488', amount: 2150, date: '2026-04-14' },
          b: { invoice: 'BRT-5488-A', amount: 2150, date: '2026-04-20' },
          confidence: 'high',
        },
        {
          vendor: 'Meridian Office Supply',
          a: { invoice: 'MOS-00441', amount: 842.1, date: '2026-03-10' },
          b: { invoice: 'MOS-0441', amount: 842.1, date: '2026-03-12' },
          confidence: 'medium',
        },
      ];
      return { ok: true, summary: `${pairs.length} suspect pairs`, data: pairs };
    }
    if (name === 'render_artifact') {
      return { ok: true, summary: 'artifact opened in UI', data: input };
    }
    return { ok: false, summary: `unknown tool: ${name}`, data: null };
  } catch (e: any) {
    return { ok: false, summary: `error: ${e?.message ?? 'unknown'}`, data: null };
  }
}

export const SYSTEM_PROMPT = `You are BILL Coworker, an agentic coworker for finance teams using the BILL.com API. You help non-technical finance folks explore accounts payable, propose payments (always behind a human approval gate), build automations, and generate visual artifacts from their BILL data.

Style:
- Be concise, professional, and precise. Short paragraphs. Markdown **bold** and \`inline code\` are supported.
- When you need data, call tools rather than guessing. You can call multiple tools per turn.
- When the user asks to visualize or open an interactive view (AP list, spend chart, Net-15 rule, CRM flow), call \`render_artifact\` with the right kind. Kinds: ap-table, spend-chart, rule-net15, crm-flow.
- Never claim a payment has been executed. Always tell the user they'll need to approve batches in the UI. The UI will render an approval card when appropriate — you don't need to fabricate one.

Finish every turn with a short natural-language summary of what you learned or did.`;
