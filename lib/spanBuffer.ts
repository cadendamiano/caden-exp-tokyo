export type ToolCallRecord = {
  name: string;
  input: Record<string, unknown>;
  result: string;
  ok: boolean;
};

export type SpanRecord = {
  id: string;
  timestamp: number;
  model: string;
  systemPrompt: string;
  userMessage: string;
  toolCalls: ToolCallRecord[];
  responseText: string;
  inputTokens?: number;
  outputTokens?: number;
  pushedToBraintrust?: boolean;
};

const MAX_SPANS = 30;
const buffer: SpanRecord[] = [];

export function recordSpan(span: SpanRecord): void {
  buffer.unshift(span);
  if (buffer.length > MAX_SPANS) buffer.splice(MAX_SPANS);
}

export function getSpans(): SpanRecord[] {
  return [...buffer];
}

export function markPushed(id: string): void {
  const span = buffer.find(s => s.id === id);
  if (span) span.pushedToBraintrust = true;
}

export function clearBuffer(): void {
  buffer.splice(0);
}
