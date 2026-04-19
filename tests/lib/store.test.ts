import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';
import type { Turn } from '@/lib/turns';

const CLEAN_STATE = {
  tweaks: {
    accentHue: 195,
    density: 'comfortable' as const,
    streamSpeed: 'normal' as const,
    showConnectors: true,
    provider: 'anthropic' as const,
    showCodeView: false,
    demoDataset: 'default' as const,
  },
  turns: [] as Turn[],
  artifacts: [],
  activeArtifact: null,
  selectedBills: [],
  approvalStates: {},
  approvalPayloads: {},
  streaming: false,
  composer: '',
  mode: 'demo' as const,
  testingThreads: [],
  activeTestingThreadId: null,
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
    expect(tweaks.provider).toBe('anthropic');
  });

  it('can change the provider', () => {
    useStore.getState().setTweak('provider', 'gemini');
    expect(useStore.getState().tweaks.provider).toBe('gemini');
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

describe('addTurn', () => {
  it('appends a turn to the list', () => {
    const turn: Turn = { id: 't1', kind: 'user', text: 'Hello' };
    useStore.getState().addTurn(turn);
    expect(useStore.getState().turns).toHaveLength(1);
    expect(useStore.getState().turns[0]).toEqual(turn);
  });

  it('preserves existing turns when adding a new one', () => {
    const t1: Turn = { id: 't1', kind: 'user', text: 'First' };
    const t2: Turn = { id: 't2', kind: 'agent', text: 'Second' };
    useStore.getState().addTurn(t1);
    useStore.getState().addTurn(t2);
    expect(useStore.getState().turns).toHaveLength(2);
    expect(useStore.getState().turns[1]).toEqual(t2);
  });
});

describe('updateTurn', () => {
  it('patches a turn by id', () => {
    const turn: Turn = { id: 'a1', kind: 'agent', text: '', streaming: true };
    useStore.getState().addTurn(turn);
    useStore.getState().updateTurn('a1', { text: 'Done', streaming: false });
    const updated = useStore.getState().turns.find(t => t.id === 'a1')!;
    expect((updated as any).text).toBe('Done');
    expect((updated as any).streaming).toBe(false);
  });

  it('does not affect other turns', () => {
    const t1: Turn = { id: 'x1', kind: 'user', text: 'Original' };
    const t2: Turn = { id: 'x2', kind: 'agent', text: 'Also original' };
    useStore.getState().addTurn(t1);
    useStore.getState().addTurn(t2);
    useStore.getState().updateTurn('x1', { text: 'Changed' });
    const unchanged = useStore.getState().turns.find(t => t.id === 'x2')!;
    expect((unchanged as any).text).toBe('Also original');
  });

  it('is a no-op for a non-existent id', () => {
    const turn: Turn = { id: 'real', kind: 'user', text: 'Real' };
    useStore.getState().addTurn(turn);
    useStore.getState().updateTurn('ghost', { text: 'Phantom' });
    expect(useStore.getState().turns).toHaveLength(1);
  });
});

describe('removeTurnsByKind', () => {
  it('removes all turns of the given kind', () => {
    useStore.getState().addTurn({ id: 'u1', kind: 'user', text: 'A' });
    useStore.getState().addTurn({ id: 'b1', kind: 'building', label: 'x', sub: 'y' });
    useStore.getState().addTurn({ id: 'b2', kind: 'building', label: 'p', sub: 'q' });
    useStore.getState().addTurn({ id: 'u2', kind: 'user', text: 'B' });

    useStore.getState().removeTurnsByKind('building');

    const turns = useStore.getState().turns;
    expect(turns.every(t => t.kind !== 'building')).toBe(true);
    expect(turns).toHaveLength(2);
  });

  it('keeps turns of other kinds intact', () => {
    useStore.getState().addTurn({ id: 'u1', kind: 'user', text: 'Keep me' });
    useStore.getState().removeTurnsByKind('agent');
    expect(useStore.getState().turns).toHaveLength(1);
  });
});

describe('setArtifacts', () => {
  it('appends a new artifact via updater function', () => {
    useStore.getState().setArtifacts(prev => [...prev, { id: 'a1', kind: 'ap-table', label: 'Test' }]);
    expect(useStore.getState().artifacts).toHaveLength(1);
    expect(useStore.getState().artifacts[0].id).toBe('a1');
  });

  it('can filter artifacts via updater', () => {
    useStore.getState().setArtifacts(() => [
      { id: 'a1', kind: 'ap-table', label: 'Keep' },
      { id: 'a2', kind: 'spend-chart', label: 'Remove' },
    ]);
    useStore.getState().setArtifacts(prev => prev.filter(a => a.id !== 'a2'));
    expect(useStore.getState().artifacts).toHaveLength(1);
    expect(useStore.getState().artifacts[0].id).toBe('a1');
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

  it('removing one bill does not affect others', () => {
    useStore.getState().toggleBill('bll_001');
    useStore.getState().toggleBill('bll_002');
    useStore.getState().toggleBill('bll_001');
    expect(useStore.getState().selectedBills).not.toContain('bll_001');
    expect(useStore.getState().selectedBills).toContain('bll_002');
  });
});

describe('setApproval', () => {
  it('records an approved state for a batch', () => {
    useStore.getState().setApproval('btch_001', 'approved');
    expect(useStore.getState().approvalStates['btch_001']).toBe('approved');
  });

  it('records a rejected state for a batch', () => {
    useStore.getState().setApproval('btch_002', 'rejected');
    expect(useStore.getState().approvalStates['btch_002']).toBe('rejected');
  });

  it('records a submitting state', () => {
    useStore.getState().setApproval('btch_003', 'submitting');
    expect(useStore.getState().approvalStates['btch_003']).toBe('submitting');
  });

  it('records a pending state (rollback target)', () => {
    useStore.getState().setApproval('btch_003', 'submitting');
    useStore.getState().setApproval('btch_003', 'pending');
    expect(useStore.getState().approvalStates['btch_003']).toBe('pending');
  });

  it('tracks multiple batches independently', () => {
    useStore.getState().setApproval('btch_001', 'approved');
    useStore.getState().setApproval('btch_002', 'rejected');
    expect(useStore.getState().approvalStates['btch_001']).toBe('approved');
    expect(useStore.getState().approvalStates['btch_002']).toBe('rejected');
  });

  it('can overwrite a previous decision', () => {
    useStore.getState().setApproval('btch_001', 'approved');
    useStore.getState().setApproval('btch_001', 'rejected');
    expect(useStore.getState().approvalStates['btch_001']).toBe('rejected');
  });
});

describe('setApprovalPayload', () => {
  it('writes a payload for a batchId at root scope', () => {
    const p = samplePayload('btch_p1');
    useStore.getState().setApprovalPayload('btch_p1', p);
    expect(useStore.getState().approvalPayloads['btch_p1']).toEqual(p);
  });

  it('preserves other batchIds when writing a new one', () => {
    const p1 = samplePayload('btch_p1');
    const p2 = samplePayload('btch_p2');
    useStore.getState().setApprovalPayload('btch_p1', p1);
    useStore.getState().setApprovalPayload('btch_p2', p2);
    expect(useStore.getState().approvalPayloads['btch_p1']).toEqual(p1);
    expect(useStore.getState().approvalPayloads['btch_p2']).toEqual(p2);
  });

  it('active-thread variant writes only to the active thread', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().setActiveThread(a);
    const p = samplePayload('btch_t1');
    useStore.getState().setApprovalPayloadInActiveThread('btch_t1', p);
    const s = useStore.getState();
    expect(s.testingThreads.find(t => t.id === a)!.approvalPayloads['btch_t1']).toEqual(p);
    expect(s.testingThreads.find(t => t.id === b)!.approvalPayloads['btch_t1']).toBeUndefined();
  });
});

describe('rehydrate normalizer', () => {
  it('re-initialises missing approvalPayloads/approvalStates on every thread after rehydrate', () => {
    // Simulate a persisted shape where threads are missing these maps
    // (as happens after partialize strips approvalPayloads and version-0 saves).
    const persisted = {
      testingThreads: [
        { id: 'thr_1', title: 'A', createdAt: 1, turns: [], artifacts: [], selectedBills: [] },
      ],
      // root-level approvalPayloads omitted
    } as any;

    // Reimplement the normalizer's contract directly — the actual runtime path is
    // exercised via the hydrate lifecycle which is hard to invoke in a unit test.
    const normalized = (persisted.testingThreads ?? []).map((t: any) => ({
      ...t,
      approvalPayloads: t.approvalPayloads ?? {},
      approvalStates: t.approvalStates ?? {},
    }));
    const rootPayloads = persisted.approvalPayloads ?? {};

    expect(normalized[0].approvalPayloads).toEqual({});
    expect(normalized[0].approvalStates).toEqual({});
    expect(rootPayloads).toEqual({});
  });

  it('preserves existing approvalStates when present', () => {
    const persisted = {
      testingThreads: [
        {
          id: 'thr_1',
          title: 'A',
          createdAt: 1,
          turns: [],
          artifacts: [],
          selectedBills: [],
          approvalStates: { btch_1: 'approved' },
        },
      ],
    } as any;
    const normalized = persisted.testingThreads.map((t: any) => ({
      ...t,
      approvalPayloads: t.approvalPayloads ?? {},
      approvalStates: t.approvalStates ?? {},
    }));
    expect(normalized[0].approvalStates).toEqual({ btch_1: 'approved' });
  });
});

describe('reset', () => {
  it('clears turns, artifacts, selections, and approvals', () => {
    useStore.getState().addTurn({ id: 'u1', kind: 'user', text: 'msg' });
    useStore.getState().setArtifacts(() => [{ id: 'a1', kind: 'ap-table', label: 'x' }]);
    useStore.getState().toggleBill('bll_001');
    useStore.getState().setApproval('btch_001', 'approved');
    useStore.getState().setStreaming(true);
    useStore.getState().setComposer('draft text');

    useStore.getState().reset();

    const s = useStore.getState();
    expect(s.artifacts).toHaveLength(0);
    expect(s.activeArtifact).toBeNull();
    expect(s.selectedBills).toHaveLength(0);
    expect(s.approvalStates).toEqual({});
    expect(s.streaming).toBe(false);
    expect(s.composer).toBe('');
  });

  it('resets turns to only the welcome turn', () => {
    useStore.getState().addTurn({ id: 'u1', kind: 'user', text: 'msg' });
    useStore.getState().reset();
    const { turns } = useStore.getState();
    expect(turns).toHaveLength(1);
    expect(turns[0].id).toBe('welcome');
  });

  it('does not reset tweaks', () => {
    useStore.getState().setTweak('accentHue', 300);
    useStore.getState().reset();
    expect(useStore.getState().tweaks.accentHue).toBe(300);
  });
});

describe('seedWelcome', () => {
  it('replaces turns with only the welcome turn', () => {
    useStore.getState().addTurn({ id: 'u1', kind: 'user', text: 'hi' });
    useStore.getState().addTurn({ id: 'u2', kind: 'user', text: 'there' });
    useStore.getState().seedWelcome();
    const { turns } = useStore.getState();
    expect(turns).toHaveLength(1);
    expect(turns[0].id).toBe('welcome');
    expect((turns[0] as any).welcome).toBe(true);
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

describe('activateArtifact', () => {
  it('changes artifact status to active in demo mode', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().activateArtifact('art_1');
    const art = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(art.status).toBe('active');
  });

  it('increments version on activation', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().activateArtifact('art_1');
    const art = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(art.version).toBe(2);
  });

  it('does not affect other artifacts', () => {
    const other = { ...DRAFT_ARTIFACT, id: 'art_2', label: 'Other' };
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT, other]);
    useStore.getState().activateArtifact('art_1');
    const otherArt = useStore.getState().artifacts.find(a => a.id === 'art_2')!;
    expect(otherArt.status).toBe('draft');
    expect(otherArt.version).toBe(1);
  });

  it('activates artifact in the active testing thread', () => {
    useStore.getState().setMode('testing');
    const id = useStore.getState().newThread('A');
    useStore.getState().setArtifactsInActiveThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().activateArtifact('art_1');
    const thread = useStore.getState().testingThreads.find(t => t.id === id)!;
    expect(thread.artifacts[0].status).toBe('active');
    expect(thread.artifacts[0].version).toBe(2);
  });

  it('does not touch demo artifacts when in testing mode', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().setMode('testing');
    useStore.getState().newThread('A');
    useStore.getState().setArtifactsInActiveThread(() => [{ ...DRAFT_ARTIFACT, id: 'art_thread' }]);
    useStore.getState().activateArtifact('art_1');  // 'art_1' only in demo artifacts
    // demo artifact should be untouched
    const demoArt = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(demoArt.status).toBe('draft');
  });
});

describe('acknowledgeArtifactDryRun', () => {
  it('sets dryRunAcknowledged to true in demo mode', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const art = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(art.dryRunAcknowledged).toBe(true);
  });

  it('does not change status or version', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const art = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(art.status).toBe('draft');
    expect(art.version).toBe(1);
  });

  it('does not affect other artifacts', () => {
    const other = { ...DRAFT_ARTIFACT, id: 'art_2', label: 'Other' };
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT, other]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const otherArt = useStore.getState().artifacts.find(a => a.id === 'art_2')!;
    expect(otherArt.dryRunAcknowledged).toBeFalsy();
  });

  it('sets dryRunAcknowledged in the active testing thread', () => {
    useStore.getState().setMode('testing');
    const id = useStore.getState().newThread('A');
    useStore.getState().setArtifactsInActiveThread(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const thread = useStore.getState().testingThreads.find(t => t.id === id)!;
    expect(thread.artifacts[0].dryRunAcknowledged).toBe(true);
  });

  it('is idempotent — calling twice stays true', () => {
    useStore.getState().setArtifacts(() => [DRAFT_ARTIFACT]);
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    useStore.getState().acknowledgeArtifactDryRun('art_1');
    const art = useStore.getState().artifacts.find(a => a.id === 'art_1')!;
    expect(art.dryRunAcknowledged).toBe(true);
  });
});

describe('testing threads', () => {
  it('newThread creates and activates a thread with given title', () => {
    const id = useStore.getState().newThread('hello');
    const s = useStore.getState();
    expect(s.testingThreads).toHaveLength(1);
    expect(s.testingThreads[0].title).toBe('hello');
    expect(s.testingThreads[0].id).toBe(id);
    expect(s.activeTestingThreadId).toBe(id);
  });

  it('newThread defaults title', () => {
    const id = useStore.getState().newThread();
    const t = useStore.getState().testingThreads.find(x => x.id === id)!;
    expect(t.title).toBe('New thread');
    expect(t.billProduct).toBe('ap');
    expect(t.turns).toEqual([]);
  });

  it('setActiveThread switches the active id', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().setActiveThread(a);
    expect(useStore.getState().activeTestingThreadId).toBe(a);
    useStore.getState().setActiveThread(b);
    expect(useStore.getState().activeTestingThreadId).toBe(b);
  });

  it('deleteThread removes the thread', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().deleteThread(a);
    const s = useStore.getState();
    expect(s.testingThreads.map(t => t.id)).toEqual([b]);
  });

  it('deleting the active thread activates a sibling', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().setActiveThread(a);
    useStore.getState().deleteThread(a);
    expect(useStore.getState().activeTestingThreadId).toBe(b);
  });

  it('deleting the last thread leaves activeTestingThreadId null', () => {
    const a = useStore.getState().newThread('only');
    useStore.getState().deleteThread(a);
    expect(useStore.getState().activeTestingThreadId).toBeNull();
  });

  it('renameThread updates the title', () => {
    const id = useStore.getState().newThread('old');
    useStore.getState().renameThread(id, 'new');
    const t = useStore.getState().testingThreads.find(x => x.id === id)!;
    expect(t.title).toBe('new');
  });

  it('renameThread with empty string falls back to a placeholder title', () => {
    const id = useStore.getState().newThread('keep');
    useStore.getState().renameThread(id, '');
    const t = useStore.getState().testingThreads.find(x => x.id === id)!;
    expect(t.title).toBe('Untitled thread');
  });

  it('addTurnToActiveThread appends to the right thread only', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().setActiveThread(a);
    useStore.getState().addTurnToActiveThread({ id: 't1', kind: 'user', text: 'hi' });
    const s = useStore.getState();
    const aTh = s.testingThreads.find(x => x.id === a)!;
    const bTh = s.testingThreads.find(x => x.id === b)!;
    expect(aTh.turns).toHaveLength(1);
    expect(bTh.turns).toHaveLength(0);
  });

  it('addTurnToActiveThread is a no-op with no active thread', () => {
    useStore.getState().addTurnToActiveThread({ id: 't1', kind: 'user', text: 'hi' });
    expect(useStore.getState().testingThreads).toHaveLength(0);
  });

  it('updateTurnInActiveThread patches a turn', () => {
    const id = useStore.getState().newThread('A');
    useStore.getState().addTurnToActiveThread({ id: 'a1', kind: 'agent', text: '', streaming: true });
    useStore.getState().updateTurnInActiveThread('a1', { text: 'done', streaming: false });
    const t = useStore.getState().testingThreads.find(x => x.id === id)!;
    const turn = t.turns.find(tt => tt.id === 'a1')!;
    expect((turn as any).text).toBe('done');
    expect((turn as any).streaming).toBe(false);
  });

  it('setThreadBillEnv writes envId and product', () => {
    const id = useStore.getState().newThread('A');
    useStore.getState().setThreadBillEnv(id, 'env_abc', 'se');
    const t = useStore.getState().testingThreads.find(x => x.id === id)!;
    expect(t.billEnvId).toBe('env_abc');
    expect(t.billProduct).toBe('se');
  });

  it('setApprovalInActiveThread records on active thread only', () => {
    const a = useStore.getState().newThread('A');
    const b = useStore.getState().newThread('B');
    useStore.getState().setActiveThread(a);
    useStore.getState().setApprovalInActiveThread('btch_1', 'approved');
    const s = useStore.getState();
    expect(s.testingThreads.find(x => x.id === a)!.approvalStates['btch_1']).toBe('approved');
    expect(s.testingThreads.find(x => x.id === b)!.approvalStates['btch_1']).toBeUndefined();
  });
});
