import type { ArtifactKind } from '@/lib/flows';
import type { RunAgentArgs } from '@/lib/agent/runAgentOnce';

export type DemoCase = {
  id: string;
  tags: string[];
  /** What the user types / triggers. */
  input: Pick<
    RunAgentArgs,
    'userMessage' | 'forcedKind' | 'commandName' | 'requirements' | 'shortcutAllowedTools' | 'shortcutSystemPrompt'
  >;
  /** What we expect to observe in the run. All fields optional. */
  expected: {
    /** A tool that MUST be called at least once. */
    toolName?: string;
    /** A tool that MUST NOT be called (e.g. render_slides_artifact on /slides turn 1). */
    forbiddenToolName?: string;
    /** Artifact kind that should appear in events. */
    artifactKind?: ArtifactKind | 'html';
    /** Top-level keys we expect on a render-* tool's `dataJson` payload. */
    dataJsonShape?: string[];
    /** Plain-language gist used by the LLM-graded factuality scorer. */
    summaryGist?: string;
  };
};

const DATAVIZ_REQS = [
  'Data source (which tool + filter produces the rows)',
  'Chart type (bar, donut, line, combo)',
  'Dimensions (what is on each axis / segment)',
  'Measure (what is aggregated, e.g. sum(amount))',
  'Time range (explicit window, e.g. Q1 2026)',
  'Expected row / bucket count after aggregation',
];

const DOC_REQS = [
  'Report title and target audience (e.g. CFO, AP team)',
  'Time period covered (e.g. Q1 2026)',
  'Key metrics to surface (e.g. total spend, overdue count, top vendors)',
  'Sections to include (e.g. Executive Summary, Vendor Breakdown, Aging)',
  'Data sources (bills, vendors, categories — which filters apply)',
  'Tone: narrative prose vs. bullet-heavy',
];

const SLIDES_REQS = [
  'Audience and purpose (who is the deck for, what decision are they making)',
  'Core message / narrative arc (3–5 sentence storyline)',
  'Slide count target (rough — e.g. 6–10 slides)',
  'Format preferences (title-heavy, bullet-heavy, two-column, image placeholders)',
  'Tone (executive, technical, persuasive, narrative)',
  'Source data to ground the deck (bills, spend, runway, custom)',
  'Branding constraints (colors, footer text, anything to include verbatim)',
];

export const DEMO_CASES: DemoCase[] = [
  // ─── /dataviz ─────────────────────────────────────────────────────
  {
    id: 'dataviz.standard.q1-spend',
    tags: ['dataviz', 'standard'],
    input: {
      userMessage: 'Q1 spend by category',
      commandName: 'dataviz',
      forcedKind: 'spend-chart',
      requirements: DATAVIZ_REQS,
    },
    expected: {
      artifactKind: 'spend-chart',
      summaryGist: 'A spend-chart artifact grouping Q1 paid spend by vendor category.',
    },
  },
  {
    id: 'dataviz.html-fallback.treemap',
    tags: ['dataviz', 'html-fallback'],
    input: {
      userMessage: 'Show Q1 spend as a treemap',
      commandName: 'dataviz',
      forcedKind: 'spend-chart',
      requirements: DATAVIZ_REQS,
    },
    expected: {
      // Treemap is non-standard — model should escape to render_html_artifact
      toolName: 'render_html_artifact',
      artifactKind: 'html',
      summaryGist: 'A custom HTML/JS treemap visualization of Q1 spend by category.',
    },
  },
  {
    id: 'dataviz.html-fallback.sankey',
    tags: ['dataviz', 'html-fallback'],
    input: {
      userMessage: 'Build me a sankey diagram of payments by vendor',
      commandName: 'dataviz',
      forcedKind: 'spend-chart',
      requirements: DATAVIZ_REQS,
    },
    expected: {
      toolName: 'render_html_artifact',
      artifactKind: 'html',
      summaryGist: 'A sankey diagram showing payment flow from accounts to vendors.',
    },
  },

  // ─── /slides ──────────────────────────────────────────────────────
  {
    id: 'slides.questionnaire-first.cfo-update',
    tags: ['slides', 'questionnaire'],
    input: {
      userMessage: 'A short CFO update on Q1 spend',
      commandName: 'slides',
      forcedKind: 'slides',
      requirements: SLIDES_REQS,
    },
    expected: {
      // /slides MUST collect requirements before generating — never on turn 1.
      forbiddenToolName: 'render_slides_artifact',
      summaryGist: 'A questionnaire run that asks 2-4 focused questions before generating.',
    },
  },
  {
    id: 'slides.questionnaire-first.board-deck',
    tags: ['slides', 'questionnaire'],
    input: {
      userMessage: 'Board deck for the April meeting',
      commandName: 'slides',
      forcedKind: 'slides',
      requirements: SLIDES_REQS,
    },
    expected: {
      forbiddenToolName: 'render_slides_artifact',
      summaryGist: 'A questionnaire that gathers audience, narrative, slide count, and format before generating.',
    },
  },

  // ─── /doc ─────────────────────────────────────────────────────────
  {
    id: 'doc.q1-cfo-report',
    tags: ['doc'],
    input: {
      userMessage: 'Q1 spend report for the CFO',
      commandName: 'doc',
      forcedKind: 'document',
      requirements: DOC_REQS,
    },
    expected: {
      toolName: 'render_document_artifact',
      artifactKind: 'document',
      dataJsonShape: ['title', 'sections'],
      summaryGist: 'A structured Q1 spend report document with sections grounded in tool-read data.',
    },
  },
  {
    id: 'doc.aging-summary',
    tags: ['doc'],
    input: {
      userMessage: 'One-pager on overdue AP for the team',
      commandName: 'doc',
      forcedKind: 'document',
      requirements: DOC_REQS,
    },
    expected: {
      toolName: 'render_document_artifact',
      artifactKind: 'document',
      summaryGist: 'A one-page document summarizing overdue accounts payable with aging data.',
    },
  },

  // ─── Free-text reads → spreadsheet ────────────────────────────────
  {
    id: 'free.list-bills.overdue',
    tags: ['free-text', 'spreadsheet'],
    input: { userMessage: 'Show me all overdue bills' },
    expected: {
      toolName: 'list_bills',
      artifactKind: 'spreadsheet',
      dataJsonShape: ['sheets'],
      summaryGist: 'A spreadsheet listing overdue bills returned by list_bills with status=overdue.',
    },
  },
  {
    id: 'free.category-spend',
    tags: ['free-text', 'spreadsheet'],
    input: { userMessage: "What's our spend by category for Q1?" },
    expected: {
      toolName: 'get_category_spend',
      summaryGist: 'A summary of Q1 paid spend grouped by vendor category.',
    },
  },
  {
    id: 'free.list-vendors',
    tags: ['free-text', 'spreadsheet'],
    input: { userMessage: 'List all active vendors' },
    expected: {
      toolName: 'list_vendors',
      artifactKind: 'spreadsheet',
      summaryGist: 'A spreadsheet listing the active vendors in the workspace.',
    },
  },

  // ─── Approval flow ────────────────────────────────────────────────
  {
    id: 'approval.stage-overdue',
    tags: ['approval', 'write'],
    input: { userMessage: 'Stage payments for the three biggest overdue bills' },
    expected: {
      toolName: 'stage_payment_batch',
      summaryGist: 'A staged payment batch with the three largest overdue bills, presented behind an approval card.',
    },
  },
  {
    id: 'approval.no-fabricated-confirmation',
    tags: ['approval', 'write'],
    input: { userMessage: 'Pay the Acme bill that is overdue' },
    expected: {
      toolName: 'stage_payment_batch',
      summaryGist: 'Stages a payment for the Acme bill but does NOT describe a confirmation outcome — waits for user approval.',
    },
  },

  // ─── Ambiguity / ask_question ─────────────────────────────────────
  {
    id: 'free.automation-ambiguous',
    tags: ['free-text', 'ask'],
    input: { userMessage: 'Set up an automation' },
    expected: {
      toolName: 'ask_question',
      summaryGist: 'Asks a clarifying question with concrete options before creating any rule.',
    },
  },
];
