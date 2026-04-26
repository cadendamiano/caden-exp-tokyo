import { Type } from '@google/genai';

export type SseEvent =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; id: string; name: string; input: any }
  | { type: 'tool-result'; id: string; name: string; input: any; ok: boolean; summary: string }
  | { type: 'artifact'; kind: string; title?: string; sub?: string; meta?: string; label?: string; icon?: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function sseEncode(ev: SseEvent) {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

export function jsonSchemaToGemini(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const out: any = {};
  if (s.type === 'object') {
    out.type = Type.OBJECT;
    out.properties = {};
    for (const [k, v] of Object.entries(s.properties ?? {})) {
      out.properties[k] = jsonSchemaToGemini(v);
    }
    if (s.required) out.required = s.required;
  } else if (s.type === 'string') {
    out.type = Type.STRING;
    if (s.enum) out.enum = s.enum;
    if (s.description) out.description = s.description;
  } else if (s.type === 'integer') {
    out.type = Type.INTEGER;
    if (s.description) out.description = s.description;
  } else if (s.type === 'number') {
    out.type = Type.NUMBER;
  } else if (s.type === 'boolean') {
    out.type = Type.BOOLEAN;
  } else if (s.type === 'array') {
    out.type = Type.ARRAY;
    if (s.items) out.items = jsonSchemaToGemini(s.items);
  }
  if (s.description && !out.description) out.description = s.description;
  return out;
}
