import { MODEL_TOOLS, type ToolDef } from './tools';
import type { ArtifactKind } from './flows';

export function buildModelTools(forcedKind?: ArtifactKind): ToolDef[] {
  if (!forcedKind) return MODEL_TOOLS;
  return MODEL_TOOLS.map(t => {
    if (t.name !== 'render_artifact') return t;
    const kindProp = (t.parameters.properties as any)?.kind;
    if (!kindProp) return t;
    return {
      ...t,
      parameters: {
        ...t.parameters,
        properties: {
          ...t.parameters.properties,
          kind: { ...kindProp, enum: [forcedKind] },
        },
      },
    };
  });
}

export function buildRequirementsBlock(
  commandName: string,
  forcedKind: ArtifactKind,
  requirements: string[]
): string {
  const lines = requirements.map(r => `- ${r}`).join('\n');
  const dvExtra = commandName === 'dataviz'
    ? `

Dataviz routing:
- If the user asked for a standard spend donut+bar (Q1 spend by category), call render_artifact with kind="spend-chart".
- If the user asked for a non-standard visualization (line, treemap, heatmap, sunburst, sankey, scatter, radar, custom dashboard, or anything else), call \`render_html_artifact\` instead. Pipe the read-tool output as \`dataJson\`; write a short script that uses ECharts/D3/Chart.js to render into #root. Do not try to squeeze it into spend-chart.`
    : '';
  return `The user invoked /${commandName}. You MUST open exactly one artifact this turn — either via render_artifact (kind="${forcedKind}") or via render_html_artifact for requests that don't fit the curated kind. Before (or alongside) that call, produce a structured plan that covers EVERY requirement below. Use the read tools (list_bills, get_category_spend, list_vendors, get_aging_summary, find_duplicate_invoices) to ground concrete values.

Requirements:
${lines}${dvExtra}`;
}

export function filterToolsByAllowlist(tools: ToolDef[], allowlist: string[]): ToolDef[] {
  if (!allowlist.length) return tools;
  const allowed = new Set(allowlist);
  return tools.filter(t => allowed.has(t.name));
}

export function coerceArtifactKind(
  modelKind: unknown,
  forcedKind: ArtifactKind | undefined
): string {
  if (!forcedKind) return String(modelKind);
  // 'html' and 'spreadsheet' are legitimate escape hatches — never coerce them away.
  if (modelKind === 'html') return 'html';
  if (modelKind === 'spreadsheet') return 'spreadsheet';
  if (modelKind !== forcedKind) {
    console.warn(
      `[chat] model emitted artifact kind=${String(modelKind)} but forced kind=${forcedKind}; coercing`
    );
    return forcedKind;
  }
  return forcedKind;
}
