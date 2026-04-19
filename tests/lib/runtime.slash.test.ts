import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runLLM, runLLMTesting } from '@/lib/runtime';
import { useStore } from '@/lib/store';
import type { Turn } from '@/lib/turns';

const CLEAN_STATE = {
  tweaks: {
    accentHue: 195,
    density: 'comfortable' as const,
    streamSpeed: 'fast' as const,
    showConnectors: true,
    modelId: 'claude-sonnet-4-5',
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
  settingsStatus: null,
  mode: 'demo' as const,
  testingThreads: [],
  activeTestingThreadId: null,
};

function mockEmptyStream() {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
      controller.close();
    },
  });
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    body,
  } as unknown as Response);
}

beforeEach(() => {
  useStore.setState(CLEAN_STATE);
  vi.restoreAllMocks();
});

describe('runLLM with ForcedArtifact opts', () => {
  it('adds forcedKind, requirements, and commandName to the POST body', async () => {
    const fetchSpy = mockEmptyStream();

    await runLLM('Q1 spend by vendor', {
      forcedKind: 'spend-chart',
      requirements: ['Data source', 'Chart type'],
      commandName: 'dataviz',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const posted = JSON.parse(String(init.body));
    expect(posted.forcedKind).toBe('spend-chart');
    expect(posted.requirements).toEqual(['Data source', 'Chart type']);
    expect(posted.commandName).toBe('dataviz');
    expect(posted.userMessage).toBe('Q1 spend by vendor');
  });

  it('renders the slash prefix in the user turn for context', async () => {
    mockEmptyStream();
    await runLLM('Q1 spend', {
      forcedKind: 'spend-chart',
      requirements: [],
      commandName: 'dataviz',
    });
    const userTurn = useStore.getState().turns.find(t => t.kind === 'user')!;
    expect((userTurn as any).text).toBe('/dataviz Q1 spend');
  });

  it('omits forced fields when no opts are supplied', async () => {
    const fetchSpy = mockEmptyStream();
    await runLLM('hello');
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const posted = JSON.parse(String(init.body));
    expect(posted.forcedKind).toBeUndefined();
    expect(posted.requirements).toBeUndefined();
    expect(posted.commandName).toBeUndefined();
  });
});

describe('runLLMTesting with ForcedArtifact opts', () => {
  it('posts forced fields when a testing thread has a bill env', async () => {
    const fetchSpy = mockEmptyStream();
    const s = useStore.getState();
    s.setMode('testing');
    const id = s.newThread('T');
    s.setThreadBillEnv(id, 'env_demo', 'ap');

    await runLLMTesting('', {
      forcedKind: 'ap-table',
      requirements: ['Bill status filter'],
      commandName: 'ap',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const posted = JSON.parse(String(init.body));
    expect(posted.forcedKind).toBe('ap-table');
    expect(posted.commandName).toBe('ap');
    expect(posted.userMessage).toBe('');
    expect(posted.mode).toBe('testing');
  });
});
