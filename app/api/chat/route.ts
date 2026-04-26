import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { runTool, SYSTEM_PROMPT, TESTING_SYSTEM_PROMPT, type ToolContext, type ToolDef } from '@/lib/tools';
import type { DatasetKey } from '@/lib/data';
import type { ArtifactKind } from '@/lib/flows';
import { getAnthropicKey, getGeminiKey, readSecrets } from '@/lib/secrets';
import { providerOf } from '@/lib/models';
import { buildModelTools, buildRequirementsBlock, coerceArtifactKind, filterToolsByAllowlist } from '@/lib/chatSchema';
import { recordSpan, type ToolCallRecord } from '@/lib/spanBuffer';
import { sseEncode, jsonSchemaToGemini, type Event, type ChatHistoryTurn, type ApprovalPayload } from '@/lib/chatRouteHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    model: string;
    userMessage: string;
    mode?: 'demo' | 'testing';
    billEnvId?: string;
    billProduct?: 'ap' | 'se';
    demoDataset?: DatasetKey;
    forcedKind?: ArtifactKind;
    requirements?: string[];
    commandName?: string;
    shortcutAllowedTools?: string[];
    shortcutSystemPrompt?: string;
    history?: ChatHistoryTurn[];
  };
  const { model, userMessage } = body;
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const provider = providerOf(model);
  const ctx: ToolContext = {
    mode: body.mode ?? 'demo',
    billEnvId: body.billEnvId,
    billProduct: body.billProduct,
    demoDataset: body.demoDataset,
  };

  // Load overrides + disabled tools from secrets
  const secrets = await readSecrets();
  const demoOverride = secrets.systemPromptOverrideDemo;
  const testingOverride = secrets.systemPromptOverrideTesting;
  const disabledTools = new Set(secrets.disabledTools ?? []);

  const baseSystem =
    ctx.mode === 'testing'
      ? (testingOverride || TESTING_SYSTEM_PROMPT)
      : (demoOverride || SYSTEM_PROMPT);
  const withRequirements =
    body.forcedKind && body.commandName
      ? `${baseSystem}\n\n${buildRequirementsBlock(body.commandName, body.forcedKind, body.requirements ?? [])}`
      : baseSystem;
  const systemPrompt = body.shortcutSystemPrompt
    ? `${withRequirements}\n\n${body.shortcutSystemPrompt}`
    : withRequirements;
  const allTools = buildModelTools(body.forcedKind);
  const afterDisabled = disabledTools.size > 0
    ? allTools.filter(t => !disabledTools.has(t.name))
    : allTools;
  const tools = body.shortcutAllowedTools?.length
    ? filterToolsByAllowlist(afterDisabled, body.shortcutAllowedTools)
    : afterDisabled;

  // Span accumulator for observability
  const spanId = `span_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const spanToolCalls: ToolCallRecord[] = [];
  let spanResponseText = '';
  let spanInputTokens: number | undefined;
  let spanOutputTokens: number | undefined;
  const forcedKind = body.forcedKind;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: Event) => controller.enqueue(encoder.encode(sseEncode(ev)));
      try {
        if (provider === 'gemini') {
          await runGemini(model, userMessage, send, ctx, systemPrompt, tools, forcedKind, history, spanToolCalls, (t, it, ot) => { spanResponseText = t; spanInputTokens = it; spanOutputTokens = ot; });
        } else {
          await runAnthropic(model, userMessage, send, ctx, systemPrompt, tools, forcedKind, history, spanToolCalls, (t, it, ot) => { spanResponseText = t; spanInputTokens = it; spanOutputTokens = ot; });
        }
      } catch (e: any) {
        send({ type: 'error', message: e?.message ?? 'unknown error' });
      } finally {
        recordSpan({
          id: spanId,
          timestamp: Date.now(),
          model,
          systemPrompt,
          userMessage,
          toolCalls: spanToolCalls,
          responseText: spanResponseText,
          inputTokens: spanInputTokens,
          outputTokens: spanOutputTokens,
        });
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
  systemPrompt: string,
  modelTools: ToolDef[],
  forcedKind: ArtifactKind | undefined,
  history: ChatHistoryTurn[],
  spanToolCalls: ToolCallRecord[],
  onFinish: (text: string, inputTokens?: number, outputTokens?: number) => void
) {
  const apiKey = await getAnthropicKey();
  if (!apiKey) throw new Error('Anthropic API key not set. Configure it in Settings (or ANTHROPIC_API_KEY in .env.local).');

  const client = new Anthropic({ apiKey });
  const tools = modelTools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as any,
  }));

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map(h => ({
      role: h.role,
      content: h.text,
    })) as Anthropic.Messages.MessageParam[],
    { role: 'user', content: userMessage },
  ];

  let fullResponseText = '';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
    fullResponseText += textAccum;
    totalInputTokens += final.usage?.input_tokens ?? 0;
    totalOutputTokens += final.usage?.output_tokens ?? 0;

    for (const block of final.content) {
      if (block.type === 'tool_use') {
        toolUses.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    if (toolUses.length === 0) {
      onFinish(fullResponseText, totalInputTokens, totalOutputTokens);
      return;
    }

    const toolResults: any[] = [];
    for (const tu of toolUses) {
      send({ type: 'tool-call', id: tu.id, name: tu.name, input: tu.input });
      if (tu.name === 'ask_question') {
        const inp = tu.input as any;
        send({
          type: 'form-question',
          id: tu.id,
          question: inp.question ?? '',
          options: Array.isArray(inp.options) ? inp.options : [],
          multiSelect: inp.multi_select === true,
          freeText: inp.allow_free_text === true,
        });
        onFinish(fullResponseText, totalInputTokens, totalOutputTokens);
        return;
      }
      const res = await runTool(tu.name, tu.input, ctx);
      spanToolCalls.push({ name: tu.name, input: tu.input, result: res.summary, ok: res.ok });
      send({ type: 'tool-result', id: tu.id, name: tu.name, input: tu.input, ok: res.ok, summary: res.summary });
      if (tu.name === 'render_artifact') {
        const inp = tu.input as any;
        const kind = coerceArtifactKind(inp.kind, forcedKind);
        send({
          type: 'artifact',
          kind,
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
        });
      }
      if (tu.name === 'render_html_artifact') {
        const inp = tu.input as any;
        send({
          type: 'artifact',
          kind: 'html',
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
          html: inp.html,
          css: inp.css,
          script: inp.script,
          dataJson: inp.dataJson,
        });
      }
      if (tu.name === 'render_spreadsheet_artifact') {
        const inp = tu.input as any;
        send({
          type: 'artifact',
          kind: 'spreadsheet',
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
          dataJson: inp.dataJson,
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
  onFinish(fullResponseText, totalInputTokens, totalOutputTokens);
}

// ── Gemini ─────────────────────────────────────────────────────────────
async function runGemini(
  model: string,
  userMessage: string,
  send: (ev: Event) => void,
  ctx: ToolContext,
  systemPrompt: string,
  modelTools: ToolDef[],
  forcedKind: ArtifactKind | undefined,
  history: ChatHistoryTurn[],
  spanToolCalls: ToolCallRecord[],
  onFinish: (text: string, inputTokens?: number, outputTokens?: number) => void
) {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error('Gemini API key not set. Configure it in Settings (or GEMINI_API_KEY in .env.local).');

  const ai = new GoogleGenAI({ apiKey });

  const geminiTools = [
    {
      functionDeclarations: modelTools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: jsonSchemaToGemini(t.parameters),
      })),
    },
  ];

  const contents: any[] = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  let fullResponseText = '';

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
          fullResponseText += (part as any).text;
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

    if (toolCalls.length === 0) {
      onFinish(fullResponseText);
      return;
    }

    contents.push({ role: 'model', parts: modelParts });

    const toolParts: any[] = [];
    for (const tc of toolCalls) {
      send({ type: 'tool-call', id: tc.id, name: tc.name, input: tc.input });
      if (tc.name === 'ask_question') {
        const inp = tc.input as any;
        send({
          type: 'form-question',
          id: tc.id,
          question: inp.question ?? '',
          options: Array.isArray(inp.options) ? inp.options : [],
          multiSelect: inp.multi_select === true,
          freeText: inp.allow_free_text === true,
        });
        onFinish(fullResponseText);
        return;
      }
      const res = await runTool(tc.name, tc.input, ctx);
      spanToolCalls.push({ name: tc.name, input: tc.input, result: res.summary, ok: res.ok });
      send({ type: 'tool-result', id: tc.id, name: tc.name, input: tc.input, ok: res.ok, summary: res.summary });
      if (tc.name === 'render_artifact') {
        const inp = tc.input as any;
        const kind = coerceArtifactKind(inp.kind, forcedKind);
        send({
          type: 'artifact',
          kind,
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
        });
      }
      if (tc.name === 'render_html_artifact') {
        const inp = tc.input as any;
        send({
          type: 'artifact',
          kind: 'html',
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
          html: inp.html,
          css: inp.css,
          script: inp.script,
          dataJson: inp.dataJson,
        });
      }
      if (tc.name === 'render_spreadsheet_artifact') {
        const inp = tc.input as any;
        send({
          type: 'artifact',
          kind: 'spreadsheet',
          title: inp.title,
          sub: inp.sub,
          meta: inp.meta,
          label: inp.title,
          dataJson: inp.dataJson,
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
  onFinish(fullResponseText);
}
