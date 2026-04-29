import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleApprove, handleReject, runFlow } from '@/lib/runtime';
import { useStore, type ApprovalPayload, type Workspace } from '@/lib/store';
import type { Turn } from '@/lib/turns';

const SEED_WS_ID = 'ws_test_a';

function buildWorkspace(): Workspace {
  return {
    id: SEED_WS_ID,
    name: 'Test',
    icon: '📓',
    color: 'oklch(0.8 0.06 195)',
    createdAt: 0,
    threads: [],
    files: [],
  };
}

const CLEAN_STATE = {
  tweaks: {
    accentHue: 195,
    density: 'comfortable' as const,
    streamSpeed: 'fast' as const,
    showConnectors: true,
    modelId: 'claude-sonnet-4-5',
    showCodeView: false,
    demoDataset: 'default' as const,
    defaultBillProduct: 'ap' as const,
  },
  activeArtifact: null,
  selectedBills: [],
  streaming: false,
  composer: '',
  settingsStatus: null,
  mode: 'demo' as const,
  workspaces: [buildWorkspace()],
  activeWorkspaceId: null,
  activeWorkspaceThreadId: null,
  workspaceView: 'workspaces' as const,
  expandedWorkspaceIds: [],
};

function makePayload(batchId: string, total = 1000): ApprovalPayload {
  return {
    batchId,
    stake: 'payment',
    from: 'Ops Checking ••4821',
    method: 'ACH',
    scheduledFor: 'Today, 4:00 PM PT',
    items: [{ vendor: 'Test', invoice: 'INV-1', amount: total }],
    total,
    requiresSecondApprover: false,
  };
}

/**
 * handleApprove now makes two fetch calls:
 *   1. POST /api/approvals — mint a server-signed token
 *   2. POST /api/dryrun    — submit the batch with the token
 *
 * Test fetch mocks distinguish by URL.
 */
const FAKE_TOKEN = {
  claims: {
    batchId: 'btch_test1',
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    approverId: 'usr_current_session',
    issuedAt: 1700000000,
    expiresAt: 1700000900,
    nonce: 'aabbccdd11223344',
    policyAtIssue: 'single-approver' as const,
  },
  signature: 'a'.repeat(64),
};

function mockFetchOk(data: any = { confirmationId: 'PMT-ABC123', simulated: true }) {
  return vi.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.includes('/api/approvals')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: FAKE_TOKEN, policy: 'single-approver' }),
        text: async () => '',
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, summary: 'Batch submitted (simulated)', data }),
      text: async () => '',
    } as unknown as Response;
  });
}

function mockFetchFail() {
  return vi.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.includes('/api/approvals')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: FAKE_TOKEN, policy: 'single-approver' }),
        text: async () => '',
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: false, summary: 'network down', data: null }),
      text: async () => '',
    } as unknown as Response;
  });
}

function activeThreadTurns() {
  const s = useStore.getState();
  const ws = s.workspaces.find(w => w.id === s.activeWorkspaceId)!;
  const t = ws.threads.find(th => th.id === s.activeWorkspaceThreadId)!;
  return t.turns;
}

function activeApprovalStates() {
  const s = useStore.getState();
  const ws = s.workspaces.find(w => w.id === s.activeWorkspaceId)!;
  const t = ws.threads.find(th => th.id === s.activeWorkspaceThreadId)!;
  return t.approvalStates;
}

function activeArtifacts() {
  const s = useStore.getState();
  const ws = s.workspaces.find(w => w.id === s.activeWorkspaceId)!;
  const t = ws.threads.find(th => th.id === s.activeWorkspaceThreadId)!;
  return t.artifacts;
}

beforeEach(() => {
  useStore.setState(CLEAN_STATE);
  // Every test runs against a single active workspace thread.
  useStore.getState().newWorkspaceThread(SEED_WS_ID, 'T');
  vi.restoreAllMocks();
});

describe('handleApprove', () => {
  it('emits a "payload lost" recovery turn when no payload is staged', async () => {
    await handleApprove('btch_missing');
    const turns = activeThreadTurns();
    expect(turns).toHaveLength(1);
    expect((turns[0] as any).text).toMatch(/staged payload was lost/);
  });

  it('records the batch as approved in the active workspace thread', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_0041', makePayload('btch_0041'));
    mockFetchOk();
    await handleApprove('btch_0041');
    expect(activeApprovalStates()['btch_0041']).toBe('approved');
  });

  it('adds an agent turn confirming submission', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_0041', makePayload('btch_0041'));
    mockFetchOk();
    await handleApprove('btch_0041');
    const agentTurns = activeThreadTurns().filter(t => t.kind === 'agent');
    expect(agentTurns.length).toBeGreaterThanOrEqual(1);
    expect((agentTurns[0] as any).text).toContain('Submitting');
  });

  it('adds a tools turn with the PayBill API call', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_0041', makePayload('btch_0041'));
    mockFetchOk();
    await handleApprove('btch_0041');
    const toolTurns = activeThreadTurns().filter(t => t.kind === 'tools');
    expect(toolTurns.length).toBeGreaterThanOrEqual(1);
    const rows = (toolTurns[0] as any).rows as any[];
    expect(rows[0].path).toContain('PayBill');
    expect(rows[0].filter).toContain('btch_0041');
  });

  it('confirmation id matches PMT-<6 alnum> shape', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_abc123', makePayload('btch_abc123'));
    mockFetchOk({ confirmationId: 'PMT-ABC123', simulated: true });
    await handleApprove('btch_abc123');
    const agentTurns = activeThreadTurns().filter(t => t.kind === 'agent');
    expect((agentTurns[1] as any).text).toMatch(/PMT-[A-Z0-9]{6}/);
  });

  it('adds exactly 3 turns total on happy path (agent + tools + agent)', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_0041', makePayload('btch_0041'));
    mockFetchOk();
    await handleApprove('btch_0041');
    expect(activeThreadTurns()).toHaveLength(3);
  });

  it('rolls back approvalState from submitting to pending on failure', async () => {
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_fail', makePayload('btch_fail'));
    mockFetchFail();
    await handleApprove('btch_fail');
    expect(activeApprovalStates()['btch_fail']).toBe('pending');
    const turns = activeThreadTurns();
    const lastAgent = [...turns].reverse().find(t => t.kind === 'agent');
    expect((lastAgent as any).text).toMatch(/Submission failed/);
    expect((lastAgent as any).text).toMatch(/retry approve or cancel/);
  });
});

describe('handleReject', () => {
  it('records the batch as rejected in the active workspace thread', () => {
    handleReject('btch_0041');
    expect(activeApprovalStates()['btch_0041']).toBe('rejected');
  });

  it('adds an agent turn confirming the cancellation', () => {
    handleReject('btch_0041');
    const turns = activeThreadTurns();
    expect(turns).toHaveLength(1);
    expect(turns[0].kind).toBe('agent');
    expect((turns[0] as any).text).toContain('cancelled');
  });

  it('does not add a tools turn', () => {
    handleReject('btch_0041');
    const toolTurns = activeThreadTurns().filter(t => t.kind === 'tools');
    expect(toolTurns).toHaveLength(0);
  });
});

describe('runFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not start if already streaming', () => {
    useStore.setState({ streaming: true }, false);
    runFlow('ap_overdue');
    vi.runAllTimers();
    expect(activeThreadTurns()).toHaveLength(0);
  });

  it('does nothing for an unknown flow id', () => {
    runFlow('does_not_exist');
    vi.runAllTimers();
    expect(activeThreadTurns()).toHaveLength(0);
    expect(useStore.getState().streaming).toBe(false);
  });

  it('sets streaming to true immediately on start', () => {
    runFlow('ap_overdue');
    expect(useStore.getState().streaming).toBe(true);
  });

  it('sets streaming to false after all steps complete', () => {
    runFlow('ap_overdue');
    vi.runAllTimers();
    expect(useStore.getState().streaming).toBe(false);
  });

  it('adds a user turn as the first step of ap_overdue', () => {
    runFlow('ap_overdue');
    vi.runAllTimers();
    const userTurns = activeThreadTurns().filter(t => t.kind === 'user');
    expect(userTurns.length).toBeGreaterThan(0);
    expect((userTurns[0] as any).text).toContain('overdue');
  });

  it('adds an approval turn when running pay_batch', () => {
    runFlow('pay_batch');
    vi.runAllTimers();
    const approvalTurns = activeThreadTurns().filter(t => t.kind === 'approval');
    expect(approvalTurns.length).toBeGreaterThan(0);
  });

  it('pay_batch approval turn has the correct batchId', () => {
    runFlow('pay_batch');
    vi.runAllTimers();
    const approvalTurn = activeThreadTurns().find(t => t.kind === 'approval')!;
    expect((approvalTurn as any).payload.batchId).toBe('btch_0041');
  });

  it('pay_batch approval turn has stake "payment"', () => {
    runFlow('pay_batch');
    vi.runAllTimers();
    const approvalTurn = activeThreadTurns().find(t => t.kind === 'approval')!;
    expect((approvalTurn as any).payload.stake).toBe('payment');
  });

  it('pay_large adds an approval turn with stake "large-payment"', () => {
    runFlow('pay_large');
    vi.runAllTimers();
    const approvalTurn = activeThreadTurns().find(t => t.kind === 'approval')!;
    expect(approvalTurn).toBeDefined();
    expect((approvalTurn as any).payload.stake).toBe('large-payment');
    expect((approvalTurn as any).payload.requiresSecondApprover).toBe(true);
  });

  it('pay_large total exceeds 25000', () => {
    runFlow('pay_large');
    vi.runAllTimers();
    const approvalTurn = activeThreadTurns().find(t => t.kind === 'approval')!;
    expect((approvalTurn as any).payload.total).toBeGreaterThan(25000);
  });

  it('adds an artifact to the active thread when a flow declares one', () => {
    runFlow('chart_spend');
    vi.runAllTimers();
    expect(activeArtifacts().some(a => a.id === 'art_spend_chart')).toBe(true);
  });

  it('artifact created by a flow has status "draft"', () => {
    runFlow('chart_spend');
    vi.runAllTimers();
    const art = activeArtifacts().find(a => a.id === 'art_spend_chart')!;
    expect(art.status).toBe('draft');
  });

  it('artifact created by a flow has version 1', () => {
    runFlow('chart_spend');
    vi.runAllTimers();
    const art = activeArtifacts().find(a => a.id === 'art_spend_chart')!;
    expect(art.version).toBe(1);
  });

  it('artifact created by a flow has createdBy "Coworker"', () => {
    runFlow('chart_spend');
    vi.runAllTimers();
    const art = activeArtifacts().find(a => a.id === 'art_spend_chart')!;
    expect(art.createdBy).toBe('Coworker');
  });

  it('artifact created by automate_net15 starts as draft and has no dryRunAcknowledged', () => {
    runFlow('automate_net15');
    vi.runAllTimers();
    const art = activeArtifacts().find(a => a.id === 'art_rule_net15')!;
    expect(art.status).toBe('draft');
    expect(art.dryRunAcknowledged).toBeFalsy();
  });

  it('removes building turns once the artifact-card step fires', () => {
    runFlow('ap_overdue');
    vi.runAllTimers();
    const buildingTurns = activeThreadTurns().filter(t => t.kind === 'building');
    expect(buildingTurns).toHaveLength(0);
  });
});
