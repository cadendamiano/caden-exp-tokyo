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
    buildModelTools('ap-table');
    const shared = MODEL_TOOLS.find(t => t.name === 'render_artifact')!;
    const sharedEnum = (shared.parameters.properties as any).kind.enum;
    expect(sharedEnum).toEqual(['ap-table', 'spend-chart', 'rule-net15', 'crm-flow']);
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
