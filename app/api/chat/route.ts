import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, Type } from '@google/genai';
import { TOOLS, runTool, SYSTEM_PROMPT } from '@/lib/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Event =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; id: string; name: string; input: any }
  | { type: 'tool-result'; id: string; name: string; input: any; ok: boolean; summary: string }
  | { type: 'artifact'; kind: string; title?: string; sub?: string; meta?: string; label?: string; icon?: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function sseEncode(ev: Event) {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { provider, userMessage } = (await req.json()) as {
    provider: 'anthropic' | 'gemini';
    userMessage: string;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: Event) => controller.enqueue(encoder.encode(sseEncode(ev)));
      try {
        if (provider === 'gemini') {
          await runGemini(userMessage, send);
        } else {
          await runAnthropic(userMessage, send);
        }
      } catch (e: any) {
        send({ type: 'error', message: e?.message ?? 'unknown error' });
      } finally {
        send({ type: 'done' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

// ── Anthropic ──────────────────────────────────────────────────────────
async function runAnthropic(userMessage: string, send: (ev: Event) => void) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in .env.local');

  const client = new Anthropic({ apiKey });
  const tools = TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as any,
  }));

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  for (let turn = 0; turn < 4; turn++) {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    const toolUses: { id: string; name: string; input: any }[] = [];
    let textAccum = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        textAccum += event.delta.text;
        send({ type: 'text', text: event.delta.text });
      }
    }

    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === 'tool_use') {
        toolUses.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    if (toolUses.length === 0) return;

    const toolResults: any[] = [];
    for (const tu of toolUses) {
      send({ type: 'tool-call', id: tu.id, name: tu.name, input: tu.input });
      const res = await runTool(tu.name, tu.input);
      send({ type: 'tool-result', id: tu.id, name: tu.name, input: tu.input, ok: res.ok, summary: res.summary });
      if (tu.name === 'render_artifact') {
        const inp = tu.input as any;
        send({
          type: 'artifact',
          kind: inp.kind,
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
        });
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify({ ok: res.ok, summary: res.summary, data: res.data }).slice(0, 8000),
      });
    }

    messages.push({ role: 'assistant', content: final.content });
    messages.push({ role: 'user', content: toolResults });
  }
}

// ── Gemini ─────────────────────────────────────────────────────────────
async function runGemini(userMessage: string, send: (ev: Event) => void) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env.local');

  const ai = new GoogleGenAI({ apiKey });

  const geminiTools = [
    {
      functionDeclarations: TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: jsonSchemaToGemini(t.parameters),
      })),
    },
  ];

  const contents: any[] = [{ role: 'user', parts: [{ text: userMessage }] }];

  for (let turn = 0; turn < 4; turn++) {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: geminiTools as any,
      },
    });

    const toolCalls: { id: string; name: string; input: any }[] = [];
    const modelParts: any[] = [];

    for await (const chunk of stream) {
      const cand = chunk.candidates?.[0];
      const parts = cand?.content?.parts ?? [];
      for (const part of parts) {
        if ((part as any).text) {
          send({ type: 'text', text: (part as any).text });
          modelParts.push({ text: (part as any).text });
        } else if ((part as any).functionCall) {
          const fc = (part as any).functionCall;
          const id = `fn_${toolCalls.length}_${Date.now()}`;
          toolCalls.push({ id, name: fc.name, input: fc.args ?? {} });
          modelParts.push({ functionCall: fc });
        }
      }
    }

    if (toolCalls.length === 0) return;

    contents.push({ role: 'model', parts: modelParts });

    const toolParts: any[] = [];
    for (const tc of toolCalls) {
      send({ type: 'tool-call', id: tc.id, name: tc.name, input: tc.input });
      const res = await runTool(tc.name, tc.input);
      send({ type: 'tool-result', id: tc.id, name: tc.name, input: tc.input, ok: res.ok, summary: res.summary });
      if (tc.name === 'render_artifact') {
        const inp = tc.input as any;
        send({
          type: 'artifact',
          kind: inp.kind,
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
        });
      }
      toolParts.push({
        functionResponse: {
          name: tc.name,
          response: { ok: res.ok, summary: res.summary, data: res.data },
        },
      });
    }
    contents.push({ role: 'user', parts: toolParts });
  }
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
