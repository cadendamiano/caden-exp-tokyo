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
  },
  turns: [] as Turn[],
  artifacts: [],
  activeArtifact: null,
  selectedBills: [],
  approvalStates: {},
  streaming: false,
  composer: '',
};

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
