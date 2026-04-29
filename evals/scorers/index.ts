import type { Event } from '@/lib/chatRouteHelpers';
import type { RunAgentResult } from '@/lib/agent/runAgentOnce';
import type { DemoCase } from '@/evals/datasets/demos';

export type ScorerArgs = {
  input: DemoCase['input'];
  expected: DemoCase['expected'];
  output: RunAgentResult;
};

export type Scorer = (args: ScorerArgs) => { name: string; score: number; metadata?: Record<string, unknown> };

// ─── helpers ─────────────────────────────────────────────────────────

function toolCallEvents(events: Event[]): Extract<Event, { type: 'tool-call' }>[] {
  return events.filter((e): e is Extract<Event, { type: 'tool-call' }> => e.type === 'tool-call');
}

function artifactEvents(events: Event[]): Extract<Event, { type: 'artifact' }>[] {
  return events.filter((e): e is Extract<Event, { type: 'artifact' }> => e.type === 'artifact');
}

function parseDataJsonFromInput(input: any): unknown | null {
  if (!input || typeof input !== 'object') return null;
  const dj = input.dataJson;
  if (typeof dj !== 'string') return null;
  try { return JSON.parse(dj); } catch { return null; }
}

// ─── scorers ─────────────────────────────────────────────────────────

/** Did the agent call the expected tool at least once? */
export const expectedToolCalled: Scorer = ({ expected, output }) => {
  if (!expected.toolName) return { name: 'expected_tool_called', score: 1 };
  const calls = toolCallEvents(output.events);
  const hit = calls.some(c => c.name === expected.toolName);
  return {
    name: 'expected_tool_called',
    score: hit ? 1 : 0,
    metadata: {
      expected: expected.toolName,
      observed: calls.map(c => c.name),
    },
  };
};

/** Did the agent AVOID calling a forbidden tool? Used for /slides turn-1 questionnaire. */
export const forbiddenToolNotCalled: Scorer = ({ expected, output }) => {
  if (!expected.forbiddenToolName) return { name: 'forbidden_tool_not_called', score: 1 };
  const calls = toolCallEvents(output.events);
  const hit = calls.some(c => c.name === expected.forbiddenToolName);
  return {
    name: 'forbidden_tool_not_called',
    score: hit ? 0 : 1,
    metadata: {
      forbidden: expected.forbiddenToolName,
      observed: calls.map(c => c.name),
    },
  };
};

/** Did an artifact of the expected kind appear? */
export const artifactKindMatches: Scorer = ({ expected, output }) => {
  if (!expected.artifactKind) return { name: 'artifact_kind_matches', score: 1 };
  const artifacts = artifactEvents(output.events);
  const hit = artifacts.some(a => a.kind === expected.artifactKind);
  return {
    name: 'artifact_kind_matches',
    score: hit ? 1 : 0,
    metadata: {
      expected: expected.artifactKind,
      observed: artifacts.map(a => a.kind),
    },
  };
};

/** For render-* tools, does the dataJson have the expected top-level keys? */
export const dataJsonShapeOk: Scorer = ({ expected, output }) => {
  if (!expected.dataJsonShape || expected.dataJsonShape.length === 0) {
    return { name: 'data_json_shape_ok', score: 1 };
  }
  const calls = toolCallEvents(output.events);
  const renderCalls = calls.filter(c => c.name.startsWith('render_') && c.name.endsWith('_artifact'));
  if (renderCalls.length === 0) {
    return {
      name: 'data_json_shape_ok',
      score: 0,
      metadata: { reason: 'no render_*_artifact tool calls observed' },
    };
  }
  for (const c of renderCalls) {
    const parsed = parseDataJsonFromInput(c.input);
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed);
      const allPresent = expected.dataJsonShape.every(k => keys.includes(k));
      if (allPresent) {
        return { name: 'data_json_shape_ok', score: 1, metadata: { keys } };
      }
    }
  }
  return {
    name: 'data_json_shape_ok',
    score: 0,
    metadata: { expected: expected.dataJsonShape, reason: 'no render call had all expected keys' },
  };
};

export const ALL_SCORERS: Scorer[] = [
  expectedToolCalled,
  forbiddenToolNotCalled,
  artifactKindMatches,
  dataJsonShapeOk,
];
