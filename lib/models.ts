export type ModelId = string;
export type Provider = 'anthropic' | 'gemini';
export type ModelEntry = { id: ModelId; provider: Provider; label: string; sub: string };

export const MODELS: ModelEntry[] = [
  { id: 'claude-opus-4-5', provider: 'anthropic', label: 'opus 4.5', sub: 'Anthropic · highest reasoning' },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', label: 'sonnet 4.5', sub: 'Anthropic · balanced (default)' },
  { id: 'claude-haiku-4-5', provider: 'anthropic', label: 'haiku 4.5', sub: 'Anthropic · fastest' },
  { id: 'gemini-2.5-pro', provider: 'gemini', label: 'gemini 2.5 pro', sub: 'Google · highest reasoning' },
  { id: 'gemini-2.5-flash', provider: 'gemini', label: 'gemini 2.5 flash', sub: 'Google · fastest' },
];

export const DEFAULT_MODEL_ID: ModelId = 'claude-sonnet-4-5';

export function getModel(id: ModelId): ModelEntry | undefined {
  return MODELS.find(m => m.id === id);
}

export function providerOf(id: ModelId): Provider {
  return getModel(id)?.provider ?? 'anthropic';
}

export function firstModelForProvider(provider: Provider): ModelId | undefined {
  return MODELS.find(m => m.provider === provider)?.id;
}

// Approximate USD cost per 1M tokens. Provider list prices change — these are
// for the in-app speedometer only, not billing.
export const MODEL_COST_PER_1M: Record<ModelId, { input: number; output: number }> = {
  'claude-opus-4-5':   { input: 15,   output: 75 },
  'claude-sonnet-4-5': { input: 3,    output: 15 },
  'claude-haiku-4-5':  { input: 0.80, output: 4 },
  'gemini-2.5-pro':    { input: 1.25, output: 10 },
  'gemini-2.5-flash':  { input: 0.15, output: 0.60 },
};

export function estimateCostUsd(modelId: ModelId, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COST_PER_1M[modelId];
  if (!rates) return 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}
