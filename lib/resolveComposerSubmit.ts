import { matchFlow } from './flows';
import type { DatasetKey } from './data';
import type { SlashCommand } from './slashCommands';
import type { ForcedArtifact } from './runtime';

export type ComposerSubmitState = {
  body: string;
  streaming: boolean;
  forcedCmd: SlashCommand | null;
  mode: 'demo' | 'testing';
  demoDataset: DatasetKey;
};

export type ComposerSubmitAction =
  | { kind: 'ignore' }
  | { kind: 'flow'; flowId: string }
  | { kind: 'llm'; body: string; opts?: ForcedArtifact };

const CUSTOM_CHART_HINTS = [
  'line', 'treemap', 'tree map', 'heatmap', 'heat map', 'sunburst',
  'sankey', 'scatter', 'radar', 'area', 'candlestick', 'funnel',
  'gauge', 'waterfall', 'histogram', 'stacked', 'combo', 'dashboard',
  'kpi', 'timeline', 'time series', 'over time',
];

function wantsCustomViz(body: string): boolean {
  const low = body.toLowerCase();
  return CUSTOM_CHART_HINTS.some(h => low.includes(h));
}

export function resolveComposerSubmit(s: ComposerSubmitState): ComposerSubmitAction {
  if (s.streaming) return { kind: 'ignore' };

  const body = s.body.trim();

  if (s.forcedCmd) {
    const forceLlm =
      s.forcedCmd.name === 'dataviz' && wantsCustomViz(body);
    if (s.mode === 'demo' && !forceLlm) {
      return { kind: 'flow', flowId: s.forcedCmd.demoFlowId };
    }
    return {
      kind: 'llm',
      body,
      opts: {
        forcedKind: s.forcedCmd.kind,
        requirements: s.forcedCmd.requirements,
        commandName: s.forcedCmd.name,
      },
    };
  }

  if (!body) return { kind: 'ignore' };

  if (s.mode === 'testing') {
    return { kind: 'llm', body };
  }

  // In demo mode, custom-viz asks should reach the LLM even without a slash command.
  if (wantsCustomViz(body)) {
    return { kind: 'llm', body };
  }

  const matched = matchFlow(body, s.demoDataset);
  if (matched) return { kind: 'flow', flowId: matched };
  return { kind: 'llm', body };
}
