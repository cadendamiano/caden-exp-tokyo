import { describe, it, expect } from 'vitest';
import { resolveComposerSubmit } from '@/lib/resolveComposerSubmit';
import { SLASH_COMMANDS } from '@/lib/slashCommands';

const dataviz = SLASH_COMMANDS.find(c => c.name === 'dataviz')!;
const ap = SLASH_COMMANDS.find(c => c.name === 'ap')!;

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
});
