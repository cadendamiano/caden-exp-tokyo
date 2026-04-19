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
  return `The user invoked /${commandName}. You MUST call render_artifact exactly once this turn with kind="${forcedKind}". Before (or alongside) that call, produce a structured plan that covers EVERY requirement below. Use the read tools (list_bills, get_category_spend, list_vendors, get_aging_summary, find_duplicate_invoices) to ground concrete values.

Requirements:
${lines}`;
}

export function coerceArtifactKind(
  modelKind: unknown,
  forcedKind: ArtifactKind | undefined
): string {
  if (!forcedKind) return String(modelKind);
  if (modelKind !== forcedKind) {
    console.warn(
      `[chat] model emitted artifact kind=${String(modelKind)} but forced kind=${forcedKind}; coercing`
    );
    return forcedKind;
  }
  return forcedKind;
}
