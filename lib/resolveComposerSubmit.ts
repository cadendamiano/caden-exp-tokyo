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

export function resolveComposerSubmit(s: ComposerSubmitState): ComposerSubmitAction {
  if (s.streaming) return { kind: 'ignore' };

  const body = s.body.trim();

  if (s.forcedCmd) {
    if (s.mode === 'demo') {
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

  const matched = matchFlow(body, s.demoDataset);
  if (matched) return { kind: 'flow', flowId: matched };
  return { kind: 'llm', body };
}
