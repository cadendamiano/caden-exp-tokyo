import type { ArtifactKind, FlowId } from './flows';

export type SlashCommand = {
  name: string;
  aliases: string[];
  kind: ArtifactKind;
  label: string;
  hint: string;
  demoFlowId: FlowId;
  requirements: string[];
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    name: 'dataviz',
    aliases: ['chart', 'viz', 'spend'],
    kind: 'spend-chart',
    label: 'dataviz',
    hint: 'Render an interactive chart from AP data',
    demoFlowId: 'chart_spend',
    requirements: [
      'Data source (which tool + filter produces the rows)',
      'Chart type (bar, donut, line, combo)',
      'Dimensions (what is on each axis / segment)',
      'Measure (what is aggregated, e.g. sum(amount))',
      'Time range (explicit window, e.g. Q1 2026)',
      'Expected row / bucket count after aggregation',
    ],
  },
  {
    name: 'automation',
    aliases: ['rule', 'net15'],
    kind: 'rule-net15',
    label: 'automation',
    hint: 'Draft an automation rule with conditions + actions',
    demoFlowId: 'automate_net15',
    requirements: [
      'Trigger event (e.g. bill.created, payment.cleared)',
      'Conditions (field, operator, value — one per line)',
      'Actions (each action with its parameters)',
      'Approval policy (auto-run vs. human gate)',
      'Expected volume (triggers per day/week)',
      'Backfill? If yes, over what window',
    ],
  },
  {
    name: 'ap',
    aliases: ['bills', 'payables'],
    kind: 'ap-table',
    label: 'ap',
    hint: 'Interactive AP bills table',
    demoFlowId: 'ap_overdue',
    requirements: [
      'Bill status filter (overdue, due-soon, open, scheduled, all)',
      'Vendor scope (all vendors or a specific vendorId)',
      'Columns to display',
      'Sort order and any grouping',
      'Default selection (which rows are pre-checked, if any)',
    ],
  },
  {
    name: 'crm',
    aliases: ['hubspot', 'deal', 'sync'],
    kind: 'crm-flow',
    label: 'crm',
    hint: 'Draft a CRM sync flow (BILL → HubSpot/etc.)',
    demoFlowId: 'crm_sync',
    requirements: [
      'Trigger event (e.g. payment.cleared, bill.paid)',
      'Match key (which field links BILL to the target record)',
      'Target system + object (HubSpot deal, Salesforce opportunity, etc.)',
      'Field map (source → destination, with transforms)',
      'Backfill strategy (new events only vs. historical window)',
      'Error handling (retry policy, dead-letter destination)',
    ],
  },
  {
    name: 'liquidity',
    aliases: ['runway', 'treasury'],
    kind: 'sweep-rule',
    label: 'liquidity',
    hint: 'Draft a sweep rule for low-balance auto-funding',
    demoFlowId: 'sweep_rule_draft',
    requirements: [
      'Bank accounts in scope (source + destination for sweeps)',
      'Low-balance threshold ($ amount that triggers the sweep)',
      'Transfer amount per trigger event',
      'Rate limit (max triggers per day)',
      'Safety conditions (e.g. minimum reserve balance)',
    ],
  },
  {
    name: 'doc',
    aliases: ['report', 'onepager'],
    kind: 'document',
    label: 'doc',
    hint: 'Generate a structured AP/spend report document',
    demoFlowId: 'doc_q1_report',
    requirements: [
      'Report title and target audience (e.g. CFO, AP team)',
      'Time period covered (e.g. Q1 2026)',
      'Key metrics to surface (e.g. total spend, overdue count, top vendors)',
      'Sections to include (e.g. Executive Summary, Vendor Breakdown, Aging)',
      'Data sources (bills, vendors, categories — which filters apply)',
      'Tone: narrative prose vs. bullet-heavy',
    ],
  },
] as const;

const SLASH_REGEX = /^\/([a-z0-9]+)(?:\s+([\s\S]*))?$/i;

function findByNameOrAlias(token: string): SlashCommand | undefined {
  const low = token.toLowerCase();
  return SLASH_COMMANDS.find(
    c => c.name === low || c.aliases.includes(low)
  );
}

export function parseSlash(text: string): { cmd: SlashCommand; body: string } | null {
  if (!text) return null;
  const match = SLASH_REGEX.exec(text);
  if (!match) return null;
  const cmd = findByNameOrAlias(match[1]);
  if (!cmd) return null;
  const body = (match[2] ?? '').trim();
  return { cmd, body };
}

export function matchSlashPrefix(token: string): SlashCommand[] {
  const low = token.toLowerCase();
  if (!low) return [...SLASH_COMMANDS];
  return SLASH_COMMANDS.filter(
    c =>
      c.name.startsWith(low) ||
      c.aliases.some(a => a.startsWith(low))
  );
}

export function requirementsPrompt(cmd: SlashCommand): string {
  const lines = cmd.requirements.map(r => `- ${r}`).join('\n');
  return `The user invoked /${cmd.name}. You MUST call render_artifact exactly once this turn with kind="${cmd.kind}". Before (or alongside) that call, produce a structured plan that covers EVERY requirement below. Use the read tools (list_bills, get_category_spend, list_vendors, get_aging_summary, find_duplicate_invoices) to ground concrete values.

Requirements:
${lines}`;
}
