import { Eval } from 'braintrust';
import { readSecrets } from '@/lib/secrets';
import { runAgentOnce, type RunAgentResult } from '@/lib/agent/runAgentOnce';
import { DEMO_CASES, type DemoCase } from './datasets/demos';
import { ALL_SCORERS, type Scorer } from './scorers';

// Load Braintrust API key from .secrets.local.json if not in env, so
// `npm run eval` works without having to source env vars manually.
const secrets = await readSecrets();
if (!process.env.BRAINTRUST_API_KEY && secrets.braintrustApiKey) {
  process.env.BRAINTRUST_API_KEY = secrets.braintrustApiKey;
}

const PROJECT_NAME = process.env.BRAINTRUST_PROJECT
  ?? secrets.braintrustProjectName
  ?? 'coworker-evals';
const MODEL = process.env.EVAL_MODEL ?? 'claude-sonnet-4-5';

if (!process.env.BRAINTRUST_API_KEY) {
  console.warn(
    '[eval] No BRAINTRUST_API_KEY in env or .secrets.local.json. ' +
    'Eval will run but results will not be uploaded.'
  );
}

type Input = DemoCase['input'];
type Expected = DemoCase['expected'];

await Eval<Input, RunAgentResult, Expected>(PROJECT_NAME, {
  experimentName: `demos-${MODEL}-${new Date().toISOString().slice(0, 10)}`,
  data: () =>
    DEMO_CASES.map(c => ({
      input: c.input,
      expected: c.expected,
      tags: c.tags,
      metadata: { id: c.id },
    })),
  task: async (input) => {
    return runAgentOnce({
      ...input,
      model: MODEL,
      mode: 'demo',
      demoDataset: 'default',
    });
  },
  scores: ALL_SCORERS.map((s: Scorer) => {
    return ({ input, expected, output }) => {
      const r = s({ input, expected: expected ?? {}, output });
      return { name: r.name, score: r.score, metadata: r.metadata };
    };
  }),
  trialCount: 1,
  maxConcurrency: 4,
});
