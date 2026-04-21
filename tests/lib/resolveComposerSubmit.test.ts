import { describe, it, expect } from 'vitest';
import { resolveComposerSubmit } from '@/lib/resolveComposerSubmit';
import { SLASH_COMMANDS } from '@/lib/slashCommands';

const dataviz = SLASH_COMMANDS.find(c => c.name === 'dataviz')!;
const ap = SLASH_COMMANDS.find(c => c.name === 'ap')!;
const liquidity = SLASH_COMMANDS.find(c => c.name === 'liquidity')!;

describe('resolveComposerSubmit', () => {
  it('ignores submit when streaming', () => {
    const action = resolveComposerSubmit({
      body: 'hello',
      streaming: true,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action.kind).toBe('ignore');
  });

  it('ignores submit when body is empty and no forcedCmd', () => {
    const action = resolveComposerSubmit({
      body: '   ',
      streaming: false,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action.kind).toBe('ignore');
  });

  it('empty body + forcedCmd in demo mode → runs the forced flow', () => {
    const action = resolveComposerSubmit({
      body: '',
      streaming: false,
      forcedCmd: dataviz,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action).toEqual({ kind: 'flow', flowId: dataviz.demoFlowId });
  });

  it('empty body + forcedCmd in testing mode → LLM with forced opts', () => {
    const action = resolveComposerSubmit({
      body: '',
      streaming: false,
      forcedCmd: dataviz,
      mode: 'testing',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('');
    expect(action.opts?.forcedKind).toBe('spend-chart');
    expect(action.opts?.commandName).toBe('dataviz');
    expect(action.opts?.requirements).toEqual(dataviz.requirements);
  });

  it('body + forcedCmd in testing mode preserves the body', () => {
    const action = resolveComposerSubmit({
      body: 'Q1 spend by vendor',
      streaming: false,
      forcedCmd: ap,
      mode: 'testing',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('Q1 spend by vendor');
    expect(action.opts?.forcedKind).toBe('ap-table');
  });

  it('free text with matching keyword (demo) → routes to flow via matchFlow', () => {
    const action = resolveComposerSubmit({
      body: 'show me all overdue AP',
      streaming: false,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action).toEqual({ kind: 'flow', flowId: 'ap_overdue' });
  });

  it('free text in testing mode → LLM without forced opts', () => {
    const action = resolveComposerSubmit({
      body: 'show me all overdue AP',
      streaming: false,
      forcedCmd: null,
      mode: 'testing',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('show me all overdue AP');
    expect(action.opts).toBeUndefined();
  });

  it('free text in demo mode with no keyword match → LLM without forced opts', () => {
    const action = resolveComposerSubmit({
      body: 'what is the meaning of this',
      streaming: false,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('what is the meaning of this');
    expect(action.opts).toBeUndefined();
  });

  it('/dataviz in demo mode with treemap ask → routes to LLM with forced opts', () => {
    const action = resolveComposerSubmit({
      body: 'show Q1 spend as a treemap',
      streaming: false,
      forcedCmd: dataviz,
      mode: 'demo',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('show Q1 spend as a treemap');
    expect(action.opts?.commandName).toBe('dataviz');
  });

  it('/dataviz in demo mode with no custom-viz hints → still runs canned flow', () => {
    const action = resolveComposerSubmit({
      body: 'Q1 spend by category',
      streaming: false,
      forcedCmd: dataviz,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action).toEqual({ kind: 'flow', flowId: dataviz.demoFlowId });
  });

  it('demo mode free text with "treemap" → LLM (custom viz, skips flow match)', () => {
    const action = resolveComposerSubmit({
      body: 'show me a treemap of top vendors by spend',
      streaming: false,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.body).toBe('show me a treemap of top vendors by spend');
  });

  it('/liquidity in demo mode → runs sweep_rule_draft flow', () => {
    const action = resolveComposerSubmit({
      body: '',
      streaming: false,
      forcedCmd: liquidity,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action).toEqual({ kind: 'flow', flowId: 'sweep_rule_draft' });
  });

  it('/liquidity in testing mode → LLM with forced sweep-rule kind', () => {
    const action = resolveComposerSubmit({
      body: '',
      streaming: false,
      forcedCmd: liquidity,
      mode: 'testing',
      demoDataset: 'default',
    });
    if (action.kind !== 'llm') throw new Error('expected llm');
    expect(action.opts?.forcedKind).toBe('sweep-rule');
    expect(action.opts?.commandName).toBe('liquidity');
  });

  it('turn-2 recommendation chip click ("Recommend a sweep rule") → sweep_rule_draft flow', () => {
    // Mimics clicking the turn-2 suggestion chip: setComposer populates body,
    // forcedCmd stays null because onChange isn't fired by a programmatic store write.
    const action = resolveComposerSubmit({
      body: 'Recommend a sweep rule',
      streaming: false,
      forcedCmd: null,
      mode: 'demo',
      demoDataset: 'default',
    });
    expect(action).toEqual({ kind: 'flow', flowId: 'sweep_rule_draft' });
  });
});
