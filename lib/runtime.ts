'use client';

import { FLOWS, LOGISTICS_FLOWS, type ArtifactKind, type Flow, type FlowStep } from './flows';
import { newId, type Turn } from './turns';
import { useStore, getActiveWorkspaceThread, type ApprovalPayload } from './store';
import { MODEL_TOOLS, INTERNAL_TOOLS } from './tools';

const ALL_TOOLS = [...MODEL_TOOLS, ...INTERNAL_TOOLS];
function toolLabel(name: string): string {
  return ALL_TOOLS.find(t => t.name === name)?.label ?? name;
}

type HistoryTurn = { role: 'user' | 'assistant'; text: string };

function formatErrorText(message: string): string {
  const low = message.toLowerCase();
  if (low.includes('api key not set') || low.includes('api key') && low.includes('not')) {
    return `⚠ **${message}**\n\nOpen **Settings** (gear icon in the left rail) and paste a key — or switch models via the picker next to the Send button.`;
  }
  return `⚠ **Error:** ${message}`;
}

function buildHistory(turns: Turn[], maxTurns = 10): HistoryTurn[] {
  const out: HistoryTurn[] = [];
  for (const t of turns) {
    if (t.kind === 'user') out.push({ role: 'user', text: t.text });
    else if (t.kind === 'agent') {
      // Skip the welcome turn and empty-streaming placeholders.
      if ((t as any).welcome) continue;
      const text = t.text?.trim();
      if (text) out.push({ role: 'assistant', text });
    }
  }
  return out.slice(-maxTurns);
}

export type ForcedArtifact = {
  forcedKind?: ArtifactKind;
  requirements?: string[];
  commandName: string;
  shortcutAllowedTools?: string[];
  shortcutSystemPrompt?: string;
};

function speedMult(s: 'fast' | 'normal' | 'slow') {
  if (s === 'fast') return 0.3;
  if (s === 'slow') return 2;
  return 1;
}

export function runFlow(flowId: string) {
  const state = useStore.getState();
  if (state.streaming) return;
  const registry: Record<string, Flow> =
    state.tweaks.demoDataset === 'logistics' ? LOGISTICS_FLOWS : FLOWS;
  const flow: Flow | undefined = registry[flowId] ?? (FLOWS as Record<string, Flow>)[flowId];
  if (!flow) return;

  state.setStreaming(true);
  const mult = speedMult(state.tweaks.streamSpeed);

  let acc = 0;
  for (const step of flow.steps) {
    const d = (step.delay ?? 300) * mult;
    acc += d;
    setTimeout(() => executeStep(flow, step, mult), acc);
  }
  setTimeout(() => useStore.getState().setStreaming(false), acc + 400);
}

function getFlowActions(s: ReturnType<typeof useStore.getState>) {
  const wsThread = getActiveWorkspaceThread();
  return {
    addTurn: s.addTurnToActiveWorkspaceThread,
    updateTurn: s.updateTurnInActiveWorkspaceThread,
    removeTurnsByKind: s.removeTurnsByKindInActiveWorkspaceThread,
    setArtifacts: s.setArtifactsInActiveWorkspaceThread,
    setApprovalPayload: s.setApprovalPayloadInActiveWorkspaceThread,
    findTurn: (id: string) => wsThread?.turns.find(t => t.id === id),
  };
}

function executeStep(flow: Flow, step: FlowStep, mult: number) {
  const s = useStore.getState();
  const a = getFlowActions(s);
  if (step.kind === 'user') {
    a.addTurn({ id: newId('u'), kind: 'user', text: step.text });
    return;
  }
  if (step.kind === 'agent-stream') {
    const id = newId('a');
    const turn: Turn = { id, kind: 'agent', text: '', streaming: true };
    a.addTurn(turn);
    const words = step.text.split(/(\s+)/);
    let i = 0;
    const iv = setInterval(() => {
      i += 2 + Math.floor(Math.random() * 3);
      const actions = getFlowActions(useStore.getState());
      if (i >= words.length) {
        clearInterval(iv);
        actions.updateTurn(id, { text: step.text, streaming: false });
      } else {
        actions.updateTurn(id, { text: words.slice(0, i).join(''), streaming: true });
      }
    }, 35 * mult);
    return;
  }
  if (step.kind === 'tools') {
    const id = newId('tl');
    a.addTurn({ id, kind: 'tools', rows: [], pending: step.rows.length });
    step.rows.forEach((r, idx) => {
      setTimeout(() => {
        const actions = getFlowActions(useStore.getState());
        const cur = actions.findTurn(id);
        if (!cur || cur.kind !== 'tools') return;
        actions.updateTurn(id, {
          rows: [...cur.rows, r],
          pending: step.rows.length - idx - 1,
        } as Partial<Turn>);
      }, (idx + 1) * 220 * mult);
    });
    return;
  }
  if (step.kind === 'libs') {
    const id = newId('lb');
    a.addTurn({ id, kind: 'libs', items: [], total: step.items.length });
    step.items.forEach((lib, idx) => {
      setTimeout(() => {
        const actions = getFlowActions(useStore.getState());
        const cur = actions.findTurn(id);
        if (!cur || cur.kind !== 'libs') return;
        actions.updateTurn(id, { items: [...cur.items, lib] } as Partial<Turn>);
      }, (idx + 1) * 160 * mult);
    });
    return;
  }
  if (step.kind === 'building') {
    a.addTurn({ id: newId('bl'), kind: 'building', label: step.label, sub: step.sub });
    return;
  }
  if (step.kind === 'artifact-card') {
    a.removeTurnsByKind('building');
    if (flow.artifact) {
      const art = flow.artifact;
      a.setArtifacts(prev => (prev.find(p => p.id === art.id) ? prev : [...prev, {
        ...art,
        status: 'draft' as const,
        version: 1,
        createdBy: 'Coworker',
      }]));
    }
    a.addTurn({
      id: newId('ac'),
      kind: 'artifact-card',
      artifactId: step.artifactId,
      title: step.title,
      sub: step.sub,
      meta: step.meta,
      icon: step.icon,
    });
    return;
  }
  if (step.kind === 'artifact-enrich') {
    a.setArtifacts(prev => {
      const exists = prev.find(a => a.id === step.artifactId);
      if (exists) {
        return prev.map(a => a.id === step.artifactId
          ? { ...a, ...step.patch, version: a.version + 1, editedBy: 'Coworker', editedAt: Date.now() }
          : a);
      }
      return [...prev, {
        id: step.artifactId,
        kind: 'liquidity-burndown' as ArtifactKind,
        label: step.patch.label ?? step.artifactId,
        filter: step.patch.filter,
        status: 'draft' as const,
        version: 1,
        createdBy: 'Coworker',
      }];
    });
    return;
  }
  if (step.kind === 'approval') {
    a.addTurn({ id: newId('ap'), kind: 'approval', payload: step.payload });
    a.setApprovalPayload(step.payload.batchId, step.payload);
    return;
  }
  if (step.kind === 'suggest') {
    a.addTurn({ id: newId('sg'), kind: 'suggest', items: step.items });
    return;
  }
}

// ─── Approval submission helpers ──────────────────────────────────────

type SubmitContext = {
  mode: 'demo' | 'testing';
  payload: ApprovalPayload | undefined;
  billEnvId?: string;
  billProduct?: 'ap' | 'se';
  demoDataset?: string;
};

function getSubmitContext(batchId: string): SubmitContext {
  const s = useStore.getState();
  const wsThread = getActiveWorkspaceThread();
  return {
    mode: s.mode,
    payload: wsThread?.approvalPayloads?.[batchId],
    billEnvId: wsThread?.billEnvId,
    billProduct: wsThread?.billProduct,
    demoDataset: s.tweaks.demoDataset,
  };
}

function getApprovalActions(s: ReturnType<typeof useStore.getState>) {
  return {
    addTurn: s.addTurnToActiveWorkspaceThread,
    setApproval: s.setApprovalInActiveWorkspaceThread,
  };
}

export async function handleApprove(batchId: string) {
  const ctx = getSubmitContext(batchId);
  const s = useStore.getState();
  const { addTurn, setApproval } = getApprovalActions(s);

  if (!ctx.payload) {
    addTurn({
      id: newId('a'),
      kind: 'agent',
      text: 'Approved — but the staged payload was lost. Please re-stage the batch.',
    });
    return;
  }

  setApproval(batchId, 'submitting');

  try {
    const res = await fetch('/api/dryrun', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tool: 'submit_payment_batch',
        input: { batchId, payload: ctx.payload },
        mode: ctx.mode,
        billEnvId: ctx.billEnvId,
        billProduct: ctx.billProduct,
        demoDataset: ctx.demoDataset,
        allowInternal: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`submit request failed (${res.status})`);
    }
    const body = (await res.json()) as {
      ok: boolean;
      summary: string;
      data: { confirmationId?: string; simulated?: boolean } | null;
    };
    if (!body.ok) {
      throw new Error(body.summary || 'submission rejected');
    }

    const confirmationId = body.data?.confirmationId ?? `PMT-${batchId.slice(-6).toUpperCase()}`;
    const simulated = body.data?.simulated === true;

    setApproval(batchId, 'approved');
    addTurn({
      id: newId('a'),
      kind: 'agent',
      text: 'Approved. Submitting the batch to BILL Payments.',
    });
    addTurn({
      id: newId('tl'),
      kind: 'tools',
      rows: [
        {
          verb: 'POST',
          path: '/v3/api/PayBill/submit',
          filter: `batchId=${batchId}`,
          status: '200',
          result: `confirmation ${confirmationId}`,
        },
      ],
    });
    addTurn({
      id: newId('a'),
      kind: 'agent',
      text: simulated
        ? `**Batch ${confirmationId} submitted (simulated).** No real money moved — this is demo/sandbox mode.`
        : `**Batch ${confirmationId} submitted.** ACH funds will leave ${ctx.payload.from} today at 4:00 PT. Vendors will receive payment notice automatically. I'll post a summary to #ap in Slack when each line clears.`,
    });
  } catch (err: any) {
    setApproval(batchId, 'pending');
    addTurn({
      id: newId('a'),
      kind: 'agent',
      text: `Submission failed: ${err?.message ?? 'unknown error'} — you can retry approve or cancel.`,
    });
  }
}

export function handleReject(batchId: string) {
  const s = useStore.getState();
  const { addTurn, setApproval } = getApprovalActions(s);

  setApproval(batchId, 'rejected');
  addTurn({
    id: newId('a'),
    kind: 'agent',
    text: 'Batch cancelled — nothing was submitted to BILL.',
  });
}

// ─── Form question answer ────────────────────────────────────────────────
export function handleFormAnswer(
  turnId: string,
  selected: string[],
  labels: string[],
  freeText: string
) {
  const s = useStore.getState();

  const patch = { answered: true, selected, freeTextValue: freeText };
  s.updateTurnInActiveWorkspaceThread(turnId, patch as any);

  const parts = labels.filter(Boolean);
  let submission: string;
  if (freeText.trim() && parts.length) {
    submission = `${parts.join(', ')} — also: ${freeText.trim()}`;
  } else if (freeText.trim()) {
    submission = freeText.trim();
  } else {
    submission = parts.join(', ');
  }

  void runLLM(submission);
}

// ─── Free-text LLM path ─────────────────────────────────────────────────
//
// Always writes turns/artifacts/approvals into the active workspace thread.
// In `testing` mode, the active thread's `billEnvId`/`billProduct` are sent
// to /api/chat so the backend hits a real Bill sandbox; if no env is picked,
// we short-circuit with an inline prompt to choose one in the rail.
export async function runLLM(userText: string, opts?: ForcedArtifact) {
  const s = useStore.getState();
  if (s.streaming) return;

  const wsThread = getActiveWorkspaceThread();
  if (!wsThread) return;

  const displayText = opts
    ? `/${opts.commandName}${userText ? ' ' + userText : ''}`
    : userText;

  if (s.mode === 'testing' && !wsThread.billEnvId) {
    s.addTurnToActiveWorkspaceThread({ id: newId('u'), kind: 'user', text: displayText });
    s.addTurnToActiveWorkspaceThread({
      id: newId('a'),
      kind: 'agent',
      text: 'Pick a Bill environment for this thread in the Rail before sending a prompt.',
    });
    return;
  }

  const history = buildHistory(wsThread.turns);
  s.addTurnToActiveWorkspaceThread({ id: newId('u'), kind: 'user', text: displayText });
  s.setStreaming(true);

  const agentId = newId('a');
  s.addTurnToActiveWorkspaceThread({ id: agentId, kind: 'agent', text: '', streaming: true });

  let acc = '';
  const toolTurnIds: Record<string, string> = {};

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: s.tweaks.modelId,
        userMessage: userText,
        demoDataset: s.tweaks.demoDataset,
        history,
        ...(s.mode === 'testing'
          ? {
              mode: 'testing',
              billEnvId: wsThread.billEnvId,
              billProduct: wsThread.billProduct ?? 'ap',
            }
          : {}),
        ...(opts ? {
          forcedKind: opts.forcedKind,
          requirements: opts.requirements,
          commandName: opts.commandName,
          shortcutAllowedTools: opts.shortcutAllowedTools,
          shortcutSystemPrompt: opts.shortcutSystemPrompt,
        } : {}),
      }),
    });
    if (!res.ok || !res.body) throw new Error('chat request failed');
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        let ev: any;
        try { ev = JSON.parse(json); } catch { continue; }
        if (ev.type === 'text') {
          acc += ev.text;
          useStore.getState().updateTurnInActiveWorkspaceThread(agentId, { text: acc, streaming: true });
        } else if (ev.type === 'tool-call') {
          const tid = newId('tl');
          toolTurnIds[ev.id] = tid;
          useStore.getState().addTurnToActiveWorkspaceThread({
            id: tid,
            kind: 'tools',
            rows: [{ verb: 'EXEC', path: toolLabel(ev.name), filter: JSON.stringify(ev.input), status: '…', result: 'running' }],
            pending: 0,
          });
        } else if (ev.type === 'tool-result') {
          const tid = toolTurnIds[ev.id];
          if (tid) {
            useStore.getState().updateTurnInActiveWorkspaceThread(tid, {
              rows: [{
                verb: 'EXEC',
                path: toolLabel(ev.name),
                filter: JSON.stringify(ev.input),
                status: ev.ok ? 'ok' : 'err',
                result: ev.summary,
              }],
            } as Partial<Turn>);
          }
        } else if (ev.type === 'artifact') {
          const artId = ev.kind === 'html'
            ? `art_html_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
            : `art_${ev.kind.replace('-', '_')}`;
          useStore.getState().setArtifactsInActiveWorkspaceThread(prev =>
            prev.find(p => p.id === artId) ? prev : [...prev, {
              id: artId,
              kind: ev.kind,
              label: ev.label ?? ev.kind,
              status: 'draft' as const,
              version: 1,
              createdBy: 'Coworker',
              ...(ev.title ? { title: ev.title } : {}),
              ...(ev.html ? { html: ev.html } : {}),
              ...(ev.css ? { css: ev.css } : {}),
              ...(ev.script ? { script: ev.script } : {}),
              ...(ev.dataJson ? { dataJson: ev.dataJson } : {}),
            }]
          );
          useStore.getState().setActiveArtifact(artId);
          useStore.getState().addTurnToActiveWorkspaceThread({
            id: newId('ac'),
            kind: 'artifact-card',
            artifactId: artId,
            title: ev.title ?? ev.label ?? 'Artifact',
            sub: (ev.sub ?? 'GENERATED').toUpperCase(),
            meta: ev.meta ?? '',
            icon: ev.icon ?? '◫',
          });
        } else if (ev.type === 'approval') {
          const payload = ev.payload as ApprovalPayload;
          useStore.getState().setApprovalPayloadInActiveWorkspaceThread(payload.batchId, payload);
          useStore.getState().addTurnToActiveWorkspaceThread({
            id: newId('ap'),
            kind: 'approval',
            payload,
            simulated: ev.simulated === true,
          });
        } else if (ev.type === 'form-question') {
          useStore.getState().updateTurnInActiveWorkspaceThread(agentId, { text: acc, streaming: false });
          useStore.getState().addTurnToActiveWorkspaceThread({
            id: newId('fq'),
            kind: 'form-question',
            question: ev.question,
            options: ev.options,
            multiSelect: ev.multiSelect,
            freeText: ev.freeText,
          });
        } else if (ev.type === 'done') {
          useStore.getState().updateTurnInActiveWorkspaceThread(agentId, { text: acc || ev.text || '', streaming: false });
        } else if (ev.type === 'error') {
          useStore.getState().updateTurnInActiveWorkspaceThread(agentId, {
            text: (acc ? acc + '\n\n' : '') + formatErrorText(ev.message),
            streaming: false,
          });
        }
      }
    }
  } catch (e: any) {
    useStore.getState().updateTurnInActiveWorkspaceThread(agentId, {
      text: `_Couldn't reach the model: ${e?.message ?? 'unknown error'}. Check your API key in Settings._`,
      streaming: false,
    });
  } finally {
    useStore.getState().setStreaming(false);
  }
}
