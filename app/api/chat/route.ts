import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, Type } from '@google/genai';
import { MODEL_TOOLS, runTool, SYSTEM_PROMPT, TESTING_SYSTEM_PROMPT, type ToolContext } from '@/lib/tools';
import type { DatasetKey } from '@/lib/data';
import type { FlowStep } from '@/lib/flows';
import { getAnthropicKey, getGeminiKey } from '@/lib/secrets';
import { providerOf } from '@/lib/models';

type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Event =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; id: string; name: string; input: any }
  | { type: 'tool-result'; id: string; name: string; input: any; ok: boolean; summary: string }
  | { type: 'artifact'; kind: string; title?: string; sub?: string; meta?: string; label?: string; icon?: string }
  | { type: 'approval'; payload: ApprovalPayload; simulated: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function sseEncode(ev: Event) {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    model: string;
    userMessage: string;
    mode?: 'demo' | 'testing';
    billEnvId?: string;
    billProduct?: 'ap' | 'se';
    demoDataset?: DatasetKey;
  };
  const { model, userMessage } = body;
  const provider = providerOf(model);
  const ctx: ToolContext = {
    mode: body.mode ?? 'demo',
    billEnvId: body.billEnvId,
    billProduct: body.billProduct,
    demoDataset: body.demoDataset,
  };
  const systemPrompt = ctx.mode === 'testing' ? TESTING_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: Event) => controller.enqueue(encoder.encode(sseEncode(ev)));
      try {
        if (provider === 'gemini') {
          await runGemini(model, userMessage, send, ctx, systemPrompt);
        } else {
          await runAnthropic(model, userMessage, send, ctx, systemPrompt);
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
async function runAnthropic(
  model: string,
  userMessage: string,
  send: (ev: Event) => void,
  ctx: ToolContext,
  systemPrompt: string
) {
  const apiKey = await getAnthropicKey();
  if (!apiKey) throw new Error('Anthropic API key not set. Configure it in Settings (or ANTHROPIC_API_KEY in .env.local).');

  const client = new Anthropic({ apiKey });
  const tools = MODEL_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as any,
  }));

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  for (let turn = 0; turn < 4; turn++) {
    const stream = await client.messages.stream({
      model,
      max_tokens: 2048,
      system: systemPrompt,
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
      const res = await runTool(tu.name, tu.input, ctx);
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
      if (tu.name === 'stage_payment_batch' && res.data && (res.data as any).approvalPayload) {
        const d = res.data as { approvalPayload: ApprovalPayload; simulated?: boolean };
        send({ type: 'approval', payload: d.approvalPayload, simulated: d.simulated === true });
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
async function runGemini(
  model: string,
  userMessage: string,
  send: (ev: Event) => void,
  ctx: ToolContext,
  systemPrompt: string
) {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error('Gemini API key not set. Configure it in Settings (or GEMINI_API_KEY in .env.local).');

  const ai = new GoogleGenAI({ apiKey });

  const geminiTools = [
    {
      functionDeclarations: MODEL_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: jsonSchemaToGemini(t.parameters),
      })),
    },
  ];

  const contents: any[] = [{ role: 'user', parts: [{ text: userMessage }] }];

  for (let turn = 0; turn < 4; turn++) {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
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
      const res = await runTool(tc.name, tc.input, ctx);
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
      if (tc.name === 'stage_payment_batch' && res.data && (res.data as any).approvalPayload) {
        const d = res.data as { approvalPayload: ApprovalPayload; simulated?: boolean };
        send({ type: 'approval', payload: d.approvalPayload, simulated: d.simulated === true });
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
