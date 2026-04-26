import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, type Workspace } from '@/lib/store';
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
    streamSpeed: 'normal' as const,
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

function samplePayload(batchId: string) {
  return {
    batchId,
    stake: 'payment' as const,
    from: 'Ops Checking ••4821',
    method: 'ACH',
    scheduledFor: 'Today',
    items: [{ vendor: 'V', invoice: 'I', amount: 100 }],
    total: 100,
    requiresSecondApprover: false,
  };
}

beforeEach(() => {
  useStore.setState(CLEAN_STATE);
});

describe('setTweak', () => {
  it('updates a single tweak without touching others', () => {
    useStore.getState().setTweak('accentHue', 270);
    const { tweaks } = useStore.getState();
    expect(tweaks.accentHue).toBe(270);
    expect(tweaks.density).toBe('comfortable');
    expect(tweaks.modelId).toBe('claude-sonnet-4-5');
  });

  it('can change the model', () => {
    useStore.getState().setTweak('modelId', 'gemini-2.5-pro');
    expect(useStore.getState().tweaks.modelId).toBe('gemini-2.5-pro');
  });

  it('can switch density to compact', () => {
    useStore.getState().setTweak('density', 'compact');
    expect(useStore.getState().tweaks.density).toBe('compact');
  });

  it('can enable showCodeView', () => {
    useStore.getState().setTweak('showCodeView', true);
    expect(useStore.getState().tweaks.showCodeView).toBe(true);
  });

  it('can disable showCodeView after enabling', () => {
    useStore.getState().setTweak('showCodeView', true);
    useStore.getState().setTweak('showCodeView', false);
    expect(useStore.getState().tweaks.showCodeView).toBe(false);
  });

  it('showCodeView defaults to false', () => {
    expect(useStore.getState().tweaks.showCodeView).toBe(false);
  });
});

describe('setSettingsStatus auto-fallback', () => {
  it('switches Anthropic → Gemini when only Gemini is keyed', () => {
    useStore.setState({ ...CLEAN_STATE, tweaks: { ...CLEAN_STATE.tweaks, modelId: 'claude-sonnet-4-5' } });
    useStore.getState().setSettingsStatus({ anthropic: false, gemini: true });
    expect(useStore.getState().tweaks.modelId).toBe('gemini-2.5-pro');
    expect(useStore.getState().settingsStatus).toEqual({ anthropic: false, gemini: true });
  });

  it('switches Gemini → Anthropic when only Anthropic is keyed', () => {
    useStore.setState({ ...CLEAN_STATE, tweaks: { ...CLEAN_STATE.tweaks, modelId: 'gemini-2.5-pro' } });
    useStore.getState().setSettingsStatus({ anthropic: true, gemini: false });
    expect(useStore.getState().tweaks.modelId).toBe('claude-opus-4-5');
  });

  it('leaves the model alone when the current provider is keyed', () => {
    useStore.setState({ ...CLEAN_STATE, tweaks: { ...CLEAN_STATE.tweaks, modelId: 'claude-sonnet-4-5' } });
    useStore.getState().setSettingsStatus({ anthropic: true, gemini: true });
    expect(useStore.getState().tweaks.modelId).toBe('claude-sonnet-4-5');
  });

  it('leaves the model alone when neither provider is keyed', () => {
    useStore.setState({ ...CLEAN_STATE, tweaks: { ...CLEAN_STATE.tweaks, modelId: 'claude-sonnet-4-5' } });
    useStore.getState().setSettingsStatus({ anthropic: false, gemini: false });
    expect(useStore.getState().tweaks.modelId).toBe('claude-sonnet-4-5');
  });

  it('leaves the model alone when status is cleared to null', () => {
    useStore.setState({ ...CLEAN_STATE, tweaks: { ...CLEAN_STATE.tweaks, modelId: 'claude-sonnet-4-5' } });
    useStore.getState().setSettingsStatus(null);
    expect(useStore.getState().tweaks.modelId).toBe('claude-sonnet-4-5');
    expect(useStore.getState().settingsStatus).toBeNull();
  });
});

describe('setComposer', () => {
  it('updates composer text', () => {
    useStore.getState().setComposer('hello world');
    expect(useStore.getState().composer).toBe('hello world');
  });

  it('can be cleared to empty string', () => {
    useStore.getState().setComposer('some text');
    useStore.getState().setComposer('');
    expect(useStore.getState().composer).toBe('');
  });
});

describe('setStreaming', () => {
  it('sets streaming to true', () => {
    useStore.getState().setStreaming(true);
    expect(useStore.getState().streaming).toBe(true);
  });

  it('sets streaming to false', () => {
    useStore.getState().setStreaming(true);
    useStore.getState().setStreaming(false);
    expect(useStore.getState().streaming).toBe(false);
  });
});

describe('setActiveArtifact', () => {
  it('sets the active artifact id', () => {
    useStore.getState().setActiveArtifact('art_123');
    expect(useStore.getState().activeArtifact).toBe('art_123');
  });

  it('can be cleared to null', () => {
    useStore.getState().setActiveArtifact('art_123');
    useStore.getState().setActiveArtifact(null);
    expect(useStore.getState().activeArtifact).toBeNull();
  });
});

describe('toggleBill', () => {
  it('adds a bill id when not selected', () => {
    useStore.getState().toggleBill('bll_001');
    expect(useStore.getState().selectedBills).toContain('bll_001');
  });

  it('removes a bill id when already selected', () => {
    useStore.getState().toggleBill('bll_001');
    useStore.getState().toggleBill('bll_001');
    expect(useStore.getState().selectedBills).not.toContain('bll_001');
  });

  it('can select multiple bills independently', () => {
    useStore.getState().toggleBill('bll_001');
    useStore.getState().toggleBill('bll_002');
    expect(useStore.getState().selectedBills).toContain('bll_001');
    expect(useStore.getState().selectedBills).toContain('bll_002');
  });
});

describe('mode', () => {
  it('defaults to demo', () => {
    expect(useStore.getState().mode).toBe('demo');
  });

  it('setMode switches to testing and back', () => {
    useStore.getState().setMode('testing');
    expect(useStore.getState().mode).toBe('testing');
    useStore.getState().setMode('demo');
    expect(useStore.getState().mode).toBe('demo');
  });

  it('setMode clears streaming, composer, and activeArtifact', () => {
    useStore.setState({ streaming: true, composer: 'x', activeArtifact: 'a1' });
    useStore.getState().setMode('testing');
    const s = useStore.getState();
    expect(s.streaming).toBe(false);
    expect(s.composer).toBe('');
    expect(s.activeArtifact).toBeNull();
  });
});

const DRAFT_ARTIFACT = {
  id: 'art_1',
  kind: 'rule-net15' as const,
  label: 'Net-15 rule',
  status: 'draft' as const,
  version: 1,
  createdBy: 'Coworker',
};

function activateThread() {
  const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
  return id;
}

describe('activateArtifact', () => {
  it('activates an artifact in the active workspace thread', () => {
    const tid = activateThread();
    useStore.getState().setArtifactsInActiveWorkspaceThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().activateArtifact('art_1');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(th => th.id === tid)!;
    expect(t.artifacts[0].status).toBe('active');
    expect(t.artifacts[0].version).toBe(2);
  });

  it('does not affect other artifacts in the same thread', () => {
    const tid = activateThread();
    const other = { ...DRAFT_ARTIFACT, id: 'art_2', label: 'Other' };
    useStore.getState().setArtifactsInActiveWorkspaceThread(() => [DRAFT_ARTIFACT, other]);
    useStore.getState().activateArtifact('art_1');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(th => th.id === tid)!;
    const otherArt = t.artifacts.find(a => a.id === 'art_2')!;
    expect(otherArt.status).toBe('draft');
    expect(otherArt.version).toBe(1);
  });

  it('is a no-op when no workspace thread is active', () => {
    useStore.getState().activateArtifact('art_1');
    // Nothing to assert — just making sure it doesn't throw.
    expect(useStore.getState().activeWorkspaceThreadId).toBeNull();
  });
});

describe('acknowledgeArtifactDryRun', () => {
  it('sets dryRunAcknowledged in the active workspace thread', () => {
    const tid = activateThread();
    useStore.getState().setArtifactsInActiveWorkspaceThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(th => th.id === tid)!;
    expect(t.artifacts[0].dryRunAcknowledged).toBe(true);
  });

  it('does not change status or version', () => {
    activateThread();
    useStore.getState().setArtifactsInActiveWorkspaceThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads[0];
    expect(t.artifacts[0].status).toBe('draft');
    expect(t.artifacts[0].version).toBe(1);
  });

  it('is idempotent — calling twice stays true', () => {
    activateThread();
    useStore.getState().setArtifactsInActiveWorkspaceThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    expect(ws.threads[0].artifacts[0].dryRunAcknowledged).toBe(true);
  });
});

describe('workspace threads', () => {
  it('newWorkspaceThread creates a thread and sets it active', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'hello');
    const s = useStore.getState();
    const ws = s.workspaces.find(w => w.id === SEED_WS_ID)!;
    expect(ws.threads).toHaveLength(1);
    expect(ws.threads[0].id).toBe(id);
    expect(ws.threads[0].title).toBe('hello');
    expect(s.activeWorkspaceId).toBe(SEED_WS_ID);
    expect(s.activeWorkspaceThreadId).toBe(id);
  });

  it('newWorkspaceThread defaults the title and ap product', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID);
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    expect(t.title).toBe('New thread');
    expect(t.billProduct).toBe('ap');
    expect(t.turns).toEqual([]);
  });

  it('setActiveWorkspaceThread switches the active id', () => {
    const a = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    const b = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'B');
    useStore.getState().setActiveWorkspaceThread(SEED_WS_ID, a);
    expect(useStore.getState().activeWorkspaceThreadId).toBe(a);
    useStore.getState().setActiveWorkspaceThread(SEED_WS_ID, b);
    expect(useStore.getState().activeWorkspaceThreadId).toBe(b);
  });

  it('deleteWorkspaceThread removes the thread', () => {
    const a = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    const b = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'B');
    useStore.getState().deleteWorkspaceThread(SEED_WS_ID, a);
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    expect(ws.threads.map(t => t.id)).toEqual([b]);
  });

  it('renameWorkspaceThread updates the title', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'old');
    useStore.getState().renameWorkspaceThread(SEED_WS_ID, id, 'new');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    expect(t.title).toBe('new');
  });

  it('renameWorkspaceThread with empty string falls back to a placeholder title', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'keep');
    useStore.getState().renameWorkspaceThread(SEED_WS_ID, id, '');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    expect(t.title).toBe('Untitled thread');
  });

  it('addTurnToActiveWorkspaceThread appends to the right thread only', () => {
    const a = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    const b = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'B');
    useStore.getState().setActiveWorkspaceThread(SEED_WS_ID, a);
    const turn: Turn = { id: 't1', kind: 'user', text: 'hi' };
    useStore.getState().addTurnToActiveWorkspaceThread(turn);
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const aTh = ws.threads.find(x => x.id === a)!;
    const bTh = ws.threads.find(x => x.id === b)!;
    expect(aTh.turns).toHaveLength(1);
    expect(bTh.turns).toHaveLength(0);
  });

  it('addTurnToActiveWorkspaceThread is a no-op with no active thread', () => {
    useStore.getState().addTurnToActiveWorkspaceThread({ id: 't1', kind: 'user', text: 'hi' });
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    expect(ws.threads).toHaveLength(0);
  });

  it('updateTurnInActiveWorkspaceThread patches a turn', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    useStore.getState().addTurnToActiveWorkspaceThread({ id: 'a1', kind: 'agent', text: '', streaming: true });
    useStore.getState().updateTurnInActiveWorkspaceThread('a1', { text: 'done', streaming: false });
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    const turn = t.turns.find(tt => tt.id === 'a1')!;
    expect((turn as any).text).toBe('done');
    expect((turn as any).streaming).toBe(false);
  });

  it('setWorkspaceThreadBillEnv writes envId and product on the targeted thread', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    useStore.getState().setWorkspaceThreadBillEnv(SEED_WS_ID, id, 'env_abc', 'se');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    expect(t.billEnvId).toBe('env_abc');
    expect(t.billProduct).toBe('se');
  });

  it('setApprovalInActiveWorkspaceThread records on active thread only', () => {
    const a = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    const b = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'B');
    useStore.getState().setActiveWorkspaceThread(SEED_WS_ID, a);
    useStore.getState().setApprovalInActiveWorkspaceThread('btch_1', 'approved');
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    expect(ws.threads.find(x => x.id === a)!.approvalStates['btch_1']).toBe('approved');
    expect(ws.threads.find(x => x.id === b)!.approvalStates['btch_1']).toBeUndefined();
  });

  it('setApprovalPayloadInActiveWorkspaceThread writes payload to the active thread', () => {
    const id = useStore.getState().newWorkspaceThread(SEED_WS_ID, 'A');
    const p = samplePayload('btch_p1');
    useStore.getState().setApprovalPayloadInActiveWorkspaceThread('btch_p1', p);
    const ws = useStore.getState().workspaces.find(w => w.id === SEED_WS_ID)!;
    const t = ws.threads.find(x => x.id === id)!;
    expect(t.approvalPayloads['btch_p1']).toEqual(p);
  });
});

describe('persist migration', () => {
  it('v3 → v6 maps legacy tweaks.provider: gemini to tweaks.modelId: gemini-2.5-pro', async () => {
    localStorage.setItem(
      'bcw:state',
      JSON.stringify({
        state: {
          tweaks: {
            accentHue: 195,
            density: 'comfortable',
            streamSpeed: 'normal',
            showConnectors: true,
            provider: 'gemini',
            showCodeView: false,
            demoDataset: 'default',
          },
          mode: 'demo',
        },
        version: 3,
      })
    );
    await (useStore as any).persist.rehydrate();
    const { tweaks } = useStore.getState();
    expect(tweaks.modelId).toBe('gemini-2.5-pro');
    expect((tweaks as any).provider).toBeUndefined();
  });

  it('v5 → v6 collapses legacy "workspace" mode to "demo" and drops thread-level state', async () => {
    localStorage.setItem(
      'bcw:state',
      JSON.stringify({
        state: {
          tweaks: {
            accentHue: 195,
            density: 'comfortable',
            streamSpeed: 'normal',
            showConnectors: true,
            modelId: 'claude-sonnet-4-5',
            showCodeView: false,
            demoDataset: 'default',
          },
          mode: 'workspace',
          turns: [{ id: 'old', kind: 'agent', text: 'gone' }],
          artifacts: [{ id: 'art_old', kind: 'ap-table', label: 'x', status: 'draft', version: 1, createdBy: 'agent' }],
          approvalStates: { btch_1: 'approved' },
          approvalPayloads: {},
          testingThreads: [{ id: 'thr_old', title: 'gone', createdAt: 0, turns: [], artifacts: [], selectedBills: [] }],
          activeTestingThreadId: 'thr_old',
          workspaces: [],
          activeWorkspaceId: null,
          activeWorkspaceThreadId: null,
          workspaceView: 'workspaces',
          expandedWorkspaceIds: [],
        },
        version: 5,
      })
    );
    await (useStore as any).persist.rehydrate();
    const s = useStore.getState();
    expect(s.mode).toBe('demo');
    expect((s as any).turns).toBeUndefined();
    expect((s as any).artifacts).toBeUndefined();
    expect((s as any).testingThreads).toBeUndefined();
    expect((s as any).activeTestingThreadId).toBeUndefined();
  });
});
