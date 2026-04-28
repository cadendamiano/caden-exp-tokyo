import { describe, it, expect } from 'vitest';
import {
  buildModelTools,
  buildRequirementsBlock,
  coerceArtifactKind,
} from '@/lib/chatSchema';
import { MODEL_TOOLS } from '@/lib/tools';

describe('buildModelTools', () => {
  it('returns the default MODEL_TOOLS when no forcedKind is set', () => {
    expect(buildModelTools()).toBe(MODEL_TOOLS);
  });

  it('narrows render_artifact.kind.enum to the forced kind only', () => {
    const tools = buildModelTools('spend-chart');
    const renderArtifact = tools.find(t => t.name === 'render_artifact')!;
    const kindEnum = (renderArtifact.parameters.properties as any).kind.enum;
    expect(kindEnum).toEqual(['spend-chart']);
  });

  it('does not mutate the shared MODEL_TOOLS array', () => {
    buildModelTools('spend-chart');
    const shared = MODEL_TOOLS.find(t => t.name === 'render_artifact')!;
    const sharedEnum = (shared.parameters.properties as any).kind.enum;
    expect(sharedEnum).toEqual(['spend-chart', 'rule-net15', 'crm-flow', 'liquidity-burndown', 'sweep-rule']);
  });

  it('leaves render_artifact untouched when forcedKind has its own typed tool', () => {
    // 'document' and 'slides' (and 'spreadsheet') aren't in render_artifact's
    // enum — buildModelTools should not narrow it to the empty set.
    const tools = buildModelTools('document');
    const renderArtifact = tools.find(t => t.name === 'render_artifact')!;
    const kindEnum = (renderArtifact.parameters.properties as any).kind.enum;
    expect(kindEnum).toEqual(['spend-chart', 'rule-net15', 'crm-flow', 'liquidity-burndown', 'sweep-rule']);
  });

  it('leaves every other tool definition untouched', () => {
    const narrowed = buildModelTools('rule-net15');
    for (const t of narrowed) {
      if (t.name !== 'render_artifact') {
        const orig = MODEL_TOOLS.find(o => o.name === t.name)!;
        expect(t).toBe(orig);
      }
    }
  });
});

describe('buildRequirementsBlock', () => {
  it('includes the command invocation line with forced kind', () => {
    const block = buildRequirementsBlock('dataviz', 'spend-chart', ['r1', 'r2']);
    expect(block).toContain('The user invoked /dataviz');
    expect(block).toContain('kind="spend-chart"');
  });

  it('renders each requirement as a bullet', () => {
    const block = buildRequirementsBlock('automation', 'rule-net15', [
      'Trigger event',
      'Conditions',
    ]);
    expect(block).toContain('- Trigger event');
    expect(block).toContain('- Conditions');
  });

  it('forces /doc to call the typed render_document_artifact tool', () => {
    const block = buildRequirementsBlock('doc', 'document', ['Title', 'Sections']);
    expect(block).toContain('render_document_artifact');
    expect(block).not.toContain('render_artifact (kind="document")');
  });

  it('runs /slides as a questionnaire and defers artifact generation', () => {
    const block = buildRequirementsBlock('slides', 'slides', ['Audience', 'Tone']);
    expect(block).toContain('DO NOT call render_slides_artifact yet');
    expect(block).toContain('Ready for me to generate the deck?');
    expect(block).toContain('- Audience');
  });
});

describe('coerceArtifactKind', () => {
  it('returns the model kind as-is when no forcedKind is set', () => {
    expect(coerceArtifactKind('spend-chart', undefined)).toBe('spend-chart');
  });

  it('returns the forced kind on match', () => {
    expect(coerceArtifactKind('ap-table', 'ap-table')).toBe('ap-table');
  });

  it('coerces to forcedKind on mismatch', () => {
    expect(coerceArtifactKind('ap-table', 'spend-chart')).toBe('spend-chart');
  });

  it('coerces to forcedKind when model emits non-string junk', () => {
    expect(coerceArtifactKind(undefined, 'crm-flow')).toBe('crm-flow');
    expect(coerceArtifactKind(null, 'crm-flow')).toBe('crm-flow');
  });
});
