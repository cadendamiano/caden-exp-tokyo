'use client';

import { FLOWS, LOGISTICS_FLOWS, type ArtifactKind, type Flow, type FlowStep } from './flows';
import { newId, type Turn } from './turns';
import { useStore, getActiveThread, type ApprovalPayload } from './store';

export type ForcedArtifact = {
  forcedKind: ArtifactKind;
  requirements: string[];
  commandName: string;
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

function executeStep(flow: Flow, step: FlowStep, mult: number) {
  const s = useStore.getState();
  if (step.kind === 'user') {
    s.addTurn({ id: newId('u'), kind: 'user', text: step.text });
    return;
  }
  if (step.kind === 'agent-stream') {
    const id = newId('a');
    const turn: Turn = { id, kind: 'agent', text: '', streaming: true };
    s.addTurn(turn);
    const words = step.text.split(/(\s+)/);
    let i = 0;
    const iv = setInterval(() => {
      i += 2 + Math.floor(Math.random() * 3);
      if (i >= words.length) {
        clearInterval(iv);
        useStore.getState().updateTurn(id, { text: step.text, streaming: false });
      } else {
        useStore.getState().updateTurn(id, { text: words.slice(0, i).join(''), streaming: true });
      }
    }, 35 * mult);
    return;
  }
  if (step.kind === 'tools') {
    const id = newId('tl');
    s.addTurn({ id, kind: 'tools', rows: [], pending: step.rows.length });
    step.rows.forEach((r, idx) => {
      setTimeout(() => {
        const cur = useStore.getState().turns.find(t => t.id === id);
        if (!cur || cur.kind !== 'tools') return;
        useStore.getState().updateTurn(id, {
          rows: [...cur.rows, r],
          pending: step.rows.length - idx - 1,
        } as Partial<Turn>);
      }, (idx + 1) * 220 * mult);
    });
    return;
  }
  if (step.kind === 'libs') {
    const id = newId('lb');
    s.addTurn({ id, kind: 'libs', items: [], total: step.items.length });
    step.items.forEach((lib, idx) => {
      setTimeout(() => {
        const cur = useStore.getState().turns.find(t => t.id === id);
        if (!cur || cur.kind !== 'libs') return;
        useStore.getState().updateTurn(id, { items: [...cur.items, lib] } as Partial<Turn>);
      }, (idx + 1) * 160 * mult);
    });
    return;
  }
  if (step.kind === 'building') {
    s.addTurn({ id: newId('bl'), kind: 'building', label: step.label, sub: step.sub });
    return;
  }
  if (step.kind === 'artifact-card') {
    s.removeTurnsByKind('building');
    if (flow.artifact) {
      const art = flow.artifact;
      s.setArtifacts(prev => (prev.find(p => p.id === art.id) ? prev : [...prev, {
        ...art,
        status: 'draft' as const,
        version: 1,
        createdBy: 'Coworker',
      }]));
    }
    s.addTurn({
      id: newId('ac'),
      kind: 'artifact-card',
      artifactId: step.artifactId,
      title: step.title,
      sub: step.sub,
      meta: step.meta,
      icon: step.icon,
    });
    // Seed approval payload for any approval step in this flow so handleApprove
    // can find it via getSubmitContext.
    return;
  }
  if (step.kind === 'approval') {
    s.addTurn({ id: newId('ap'), kind: 'approval', payload: step.payload });
    s.setApprovalPayload(step.payload.batchId, step.payload);
    return;
  }
  if (step.kind === 'suggest') {
    s.addTurn({ id: newId('sg'), kind: 'suggest', items: step.items });
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
  if (s.mode === 'testing') {
    const thread = getActiveThread();
    return {
      mode: 'testing',
      payload: thread?.approvalPayloads?.[batchId],
      billEnvId: thread?.billEnvId,
      billProduct: thread?.billProduct,
      demoDataset: s.tweaks.demoDataset,
    };
  }
  return {
    mode: 'demo',
    payload: s.approvalPayloads[batchId],
    demoDataset: s.tweaks.demoDataset,
  };
}

export async function handleApprove(batchId: string) {
  const ctx = getSubmitContext(batchId);
  const s = useStore.getState();
  const addTurn = ctx.mode === 'testing' ? s.addTurnToActiveThread : s.addTurn;
  const setApproval = ctx.mode === 'testing' ? s.setApprovalInActiveThread : s.setApproval;

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
  const ctx = getSubmitContext(batchId);
  const s = useStore.getState();
  const addTurn = ctx.mode === 'testing' ? s.addTurnToActiveThread : s.addTurn;
  const setApproval = ctx.mode === 'testing' ? s.setApprovalInActiveThread : s.setApproval;

  setApproval(batchId, 'rejected');
  addTurn({
    id: newId('a'),
    kind: 'agent',
    text: 'Batch cancelled — nothing was submitted to BILL.',
  });
}

// ─── Free-text LLM path ─────────────────────────────────────────────────
export async function runLLM(userText: string, opts?: ForcedArtifact) {
  const s = useStore.getState();
  if (s.streaming) return;

  const displayText = opts
    ? `/${opts.commandName}${userText ? ' ' + userText : ''}`
    : userText;
  s.addTurn({ id: newId('u'), kind: 'user', text: displayText });
  s.setStreaming(true);

  const agentId = newId('a');
  s.addTurn({ id: agentId, kind: 'agent', text: '', streaming: true });

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
        ...(opts ? {
          forcedKind: opts.forcedKind,
          requirements: opts.requirements,
          commandName: opts.commandName,
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
          useStore.getState().updateTurn(agentId, { text: acc, streaming: true });
        } else if (ev.type === 'tool-call') {
          const tid = newId('tl');
          toolTurnIds[ev.id] = tid;
          useStore.getState().addTurn({
            id: tid,
            kind: 'tools',
            rows: [{ verb: 'EXEC', path: ev.name, filter: JSON.stringify(ev.input), status: '…', result: 'running' }],
            pending: 0,
          });
        } else if (ev.type === 'tool-result') {
          const tid = toolTurnIds[ev.id];
          if (tid) {
            useStore.getState().updateTurn(tid, {
              rows: [{
                verb: 'EXEC',
                path: ev.name,
                filter: JSON.stringify(ev.input),
                status: ev.ok ? 'ok' : 'err',
                result: ev.summary,
              }],
            } as Partial<Turn>);
          }
        } else if (ev.type === 'artifact') {
          const artId = `art_${ev.kind.replace('-', '_')}`;
          useStore.getState().setArtifacts(prev =>
            prev.find(p => p.id === artId) ? prev : [...prev, {
              id: artId,
              kind: ev.kind,
              label: ev.label ?? ev.kind,
              status: 'draft' as const,
              version: 1,
              createdBy: 'Coworker',
            }]
          );
          useStore.getState().addTurn({
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
          useStore.getState().setApprovalPayload(payload.batchId, payload);
          useStore.getState().addTurn({
            id: newId('ap'),
            kind: 'approval',
            payload,
            simulated: ev.simulated === true,
          });
        } else if (ev.type === 'done') {
          useStore.getState().updateTurn(agentId, { text: acc || ev.text || '', streaming: false });
        } else if (ev.type === 'error') {
          useStore.getState().updateTurn(agentId, {
            text: (acc ? acc + '\n\n' : '') + `_error: ${ev.message}_`,
            streaming: false,
          });
        }
      }
    }
  } catch (e: any) {
    useStore.getState().updateTurn(agentId, {
      text: `_Couldn't reach the model. ${e?.message ?? 'unknown error'}. Set ANTHROPIC_API_KEY / GEMINI_API_KEY in .env.local and restart._`,
      streaming: false,
    });
  } finally {
    useStore.getState().setStreaming(false);
  }
}

// ─── Testing mode: real Bill sandbox ────────────────────────────────────
export async function runLLMTesting(userText: string, opts?: ForcedArtifact) {
  const s = useStore.getState();
  if (s.streaming) return;

  const thread = getActiveThread();
  if (!thread) {
    // Seed a thread on the fly so "first send" just works.
    const id = s.newThread('New thread');
    void id;
  }

  const active = getActiveThread();
  if (!active) return;

  const displayText = opts
    ? `/${opts.commandName}${userText ? ' ' + userText : ''}`
    : userText;

  if (!active.billEnvId) {
    s.addTurnToActiveThread({ id: newId('u'), kind: 'user', text: displayText });
    s.addTurnToActiveThread({
      id: newId('a'),
      kind: 'agent',
      text: 'Pick a Bill environment for this thread in the Rail before sending a prompt.',
    });
    return;
  }

  s.addTurnToActiveThread({ id: newId('u'), kind: 'user', text: displayText });
  s.setStreaming(true);

  const agentId = newId('a');
  s.addTurnToActiveThread({ id: agentId, kind: 'agent', text: '', streaming: true });

  let acc = '';
  const toolTurnIds: Record<string, string> = {};

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: s.tweaks.modelId,
        userMessage: userText,
        mode: 'testing',
        billEnvId: active.billEnvId,
        billProduct: active.billProduct ?? 'ap',
        demoDataset: s.tweaks.demoDataset,
        ...(opts ? {
          forcedKind: opts.forcedKind,
          requirements: opts.requirements,
          commandName: opts.commandName,
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
          useStore.getState().updateTurnInActiveThread(agentId, { text: acc, streaming: true });
        } else if (ev.type === 'tool-call') {
          const tid = newId('tl');
          toolTurnIds[ev.id] = tid;
          useStore.getState().addTurnToActiveThread({
            id: tid,
            kind: 'tools',
            rows: [{ verb: 'EXEC', path: ev.name, filter: JSON.stringify(ev.input), status: '…', result: 'running' }],
            pending: 0,
          });
        } else if (ev.type === 'tool-result') {
          const tid = toolTurnIds[ev.id];
          if (tid) {
            useStore.getState().updateTurnInActiveThread(tid, {
              rows: [{
                verb: 'EXEC',
                path: ev.name,
                filter: JSON.stringify(ev.input),
                status: ev.ok ? 'ok' : 'err',
                result: ev.summary,
              }],
            } as Partial<Turn>);
          }
        } else if (ev.type === 'artifact') {
          const artId = `art_${ev.kind.replace('-', '_')}`;
          useStore.getState().setArtifactsInActiveThread(prev =>
            prev.find(p => p.id === artId) ? prev : [...prev, {
              id: artId,
              kind: ev.kind,
              label: ev.label ?? ev.kind,
              status: 'draft' as const,
              version: 1,
              createdBy: 'Coworker',
            }]
          );
          useStore.getState().addTurnToActiveThread({
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
          useStore.getState().setApprovalPayloadInActiveThread(payload.batchId, payload);
          useStore.getState().addTurnToActiveThread({
            id: newId('ap'),
            kind: 'approval',
            payload,
            simulated: ev.simulated === true,
          });
        } else if (ev.type === 'done') {
          useStore.getState().updateTurnInActiveThread(agentId, { text: acc || ev.text || '', streaming: false });
        } else if (ev.type === 'error') {
          useStore.getState().updateTurnInActiveThread(agentId, {
            text: (acc ? acc + '\n\n' : '') + `_error: ${ev.message}_`,
            streaming: false,
          });
        }
      }
    }
  } catch (e: any) {
    useStore.getState().updateTurnInActiveThread(agentId, {
      text: `_Couldn't reach the model. ${e?.message ?? 'unknown error'}._`,
      streaming: false,
    });
  } finally {
    useStore.getState().setStreaming(false);
  }
}
