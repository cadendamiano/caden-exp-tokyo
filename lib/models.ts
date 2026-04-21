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
