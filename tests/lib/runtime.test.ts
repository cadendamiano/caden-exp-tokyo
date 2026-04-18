import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleApprove, handleReject, runFlow } from '@/lib/runtime';
import { useStore } from '@/lib/store';
import type { Turn } from '@/lib/turns';

const CLEAN_STATE = {
  tweaks: {
    accentHue: 195,
    density: 'comfortable' as const,
    streamSpeed: 'fast' as const,
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
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('handleApprove', () => {
  it('records the batch as approved in the store', () => {
    handleApprove('btch_0041');
    expect(useStore.getState().approvalStates['btch_0041']).toBe('approved');
  });

  it('adds an agent turn confirming submission', () => {
    handleApprove('btch_0041');
    const agentTurns = useStore.getState().turns.filter(t => t.kind === 'agent');
    expect(agentTurns.length).toBeGreaterThanOrEqual(1);
    expect((agentTurns[0] as any).text).toContain('Submitting');
  });

  it('adds a tools turn with the PayBill API call', () => {
    handleApprove('btch_0041');
    const toolTurns = useStore.getState().turns.filter(t => t.kind === 'tools');
    expect(toolTurns.length).toBeGreaterThanOrEqual(1);
    const rows = (toolTurns[0] as any).rows as any[];
    expect(rows[0].path).toContain('PayBill');
    expect(rows[0].filter).toContain('btch_0041');
  });

  it('adds a follow-up agent turn with the batch confirmation number', () => {
    handleApprove('btch_0041');
    const agentTurns = useStore.getState().turns.filter(t => t.kind === 'agent');
    expect(agentTurns.length).toBe(2);
    expect((agentTurns[1] as any).text).toContain('PMT-9F48C2');
  });

  it('adds exactly 3 turns total (agent + tools + agent)', () => {
    handleApprove('btch_0041');
    expect(useStore.getState().turns).toHaveLength(3);
  });
});

describe('handleReject', () => {
  it('records the batch as rejected in the store', () => {
    handleReject('btch_0041');
    expect(useStore.getState().approvalStates['btch_0041']).toBe('rejected');
  });

  it('adds an agent turn confirming the cancellation', () => {
    handleReject('btch_0041');
    const turns = useStore.getState().turns;
    expect(turns).toHaveLength(1);
    expect(turns[0].kind).toBe('agent');
    expect((turns[0] as any).text).toContain('cancelled');
  });

  it('does not add a tools turn', () => {
    handleReject('btch_0041');
    const toolTurns = useStore.getState().turns.filter(t => t.kind === 'tools');
    expect(toolTurns).toHaveLength(0);
  });
});

describe('handleApprove + handleReject interaction', () => {
  it('each call sets its own batch id independently', () => {
    handleApprove('btch_A');
    useStore.setState({ turns: [], approvalStates: {} }, false);
    handleReject('btch_B');
    expect(useStore.getState().approvalStates['btch_B']).toBe('rejected');
    expect(useStore.getState().approvalStates['btch_A']).toBeUndefined();
  });
});

describe('runFlow', () => {
  it('does not start if already streaming', () => {
    useStore.setState({ streaming: true }, false);
    runFlow('ap_overdue');
    vi.runAllTimers();
    // Only the initial state — no turns added because streaming guard fired
    expect(useStore.getState().turns).toHaveLength(0);
  });

  it('does nothing for an unknown flow id', () => {
    runFlow('does_not_exist');
    vi.runAllTimers();
    expect(useStore.getState().turns).toHaveLength(0);
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
    const turns = useStore.getState().turns;
    const userTurns = turns.filter(t => t.kind === 'user');
    expect(userTurns.length).toBeGreaterThan(0);
    expect((userTurns[0] as any).text).toContain('overdue');
  });

  it('adds an approval turn when running pay_batch', () => {
    runFlow('pay_batch');
    vi.runAllTimers();
    const approvalTurns = useStore.getState().turns.filter(t => t.kind === 'approval');
    expect(approvalTurns.length).toBeGreaterThan(0);
  });

  it('pay_batch approval turn has the correct batchId', () => {
    runFlow('pay_batch');
    vi.runAllTimers();
    const approvalTurn = useStore.getState().turns.find(t => t.kind === 'approval')!;
    expect((approvalTurn as any).payload.batchId).toBe('btch_0041');
  });

  it('adds an artifact to the store when a flow declares one', () => {
    runFlow('chart_spend');
    vi.runAllTimers();
    const { artifacts } = useStore.getState();
    expect(artifacts.some(a => a.id === 'art_spend_chart')).toBe(true);
  });

  it('removes building turns once the artifact-card step fires', () => {
    runFlow('ap_overdue');
    vi.runAllTimers();
    const buildingTurns = useStore.getState().turns.filter(t => t.kind === 'building');
    expect(buildingTurns).toHaveLength(0);
  });
});
