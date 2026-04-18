'use client';

import { FLOWS, type Flow, type FlowStep } from './flows';
import { newId, type Turn } from './turns';
import { useStore, getActiveThread } from './store';

function speedMult(s: 'fast' | 'normal' | 'slow') {
  if (s === 'fast') return 0.3;
  if (s === 'slow') return 2;
  return 1;
}

export function runFlow(flowId: string) {
  const state = useStore.getState();
  if (state.streaming) return;
  const flow: Flow | undefined = FLOWS[flowId];
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
      s.setArtifacts(prev => (prev.find(p => p.id === art.id) ? prev : [...prev, art]));
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
    return;
  }
  if (step.kind === 'approval') {
    s.addTurn({ id: newId('ap'), kind: 'approval', payload: step.payload });
    return;
  }
  if (step.kind === 'suggest') {
    s.addTurn({ id: newId('sg'), kind: 'suggest', items: step.items });
    return;
  }
}

export function handleApprove(batchId: string) {
  const s = useStore.getState();
  if (s.mode === 'testing') {
    s.setApprovalInActiveThread(batchId, 'approved');
    s.addTurnToActiveThread({
      id: newId('a'),
      kind: 'agent',
      text: 'Approved — but no real payment was submitted (testing mode is read-only).',
    });
    return;
  }
  s.setApproval(batchId, 'approved');
  s.addTurn({
    id: newId('a'),
    kind: 'agent',
    text: 'Approved. Submitting the batch to BILL Payments.',
  });
  s.addTurn({
    id: newId('tl'),
    kind: 'tools',
    rows: [
      {
        verb: 'POST',
        path: '/v3/api/PayBill/submit',
        filter: `batchId=${batchId}`,
        status: '200',
        result: 'confirmation PMT-9F48C2',
      },
    ],
  });
  s.addTurn({
    id: newId('a'),
    kind: 'agent',
    text: `**Batch PMT-9F48C2 submitted.** ACH funds will leave Ops Checking today at 4:00 PT. Vendors will receive payment notice automatically. I'll post a summary to #ap in Slack when each line clears.`,
  });
}

export function handleReject(batchId: string) {
  const s = useStore.getState();
  if (s.mode === 'testing') {
    s.setApprovalInActiveThread(batchId, 'rejected');
    s.addTurnToActiveThread({
      id: newId('a'),
      kind: 'agent',
      text: 'Batch cancelled — nothing was submitted to BILL.',
    });
    return;
  }
  s.setApproval(batchId, 'rejected');
  s.addTurn({
    id: newId('a'),
    kind: 'agent',
    text: 'Batch cancelled — nothing was submitted to BILL.',
  });
}

// ─── Free-text LLM path ─────────────────────────────────────────────────
export async function runLLM(userText: string) {
  const s = useStore.getState();
  if (s.streaming) return;

  s.addTurn({ id: newId('u'), kind: 'user', text: userText });
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
        provider: s.tweaks.provider,
        userMessage: userText,
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
            prev.find(p => p.id === artId) ? prev : [...prev, { id: artId, kind: ev.kind, label: ev.label ?? ev.kind }]
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
export async function runLLMTesting(userText: string) {
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

  if (!active.billEnvId) {
    s.addTurnToActiveThread({ id: newId('u'), kind: 'user', text: userText });
    s.addTurnToActiveThread({
      id: newId('a'),
      kind: 'agent',
      text: 'Pick a Bill environment for this thread in the Rail before sending a prompt.',
    });
    return;
  }

  s.addTurnToActiveThread({ id: newId('u'), kind: 'user', text: userText });
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
        provider: s.tweaks.provider,
        userMessage: userText,
        mode: 'testing',
        billEnvId: active.billEnvId,
        billProduct: active.billProduct ?? 'ap',
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
            prev.find(p => p.id === artId) ? prev : [...prev, { id: artId, kind: ev.kind, label: ev.label ?? ev.kind }]
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
