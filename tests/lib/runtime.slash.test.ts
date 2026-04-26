import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runLLM } from '@/lib/runtime';
import { useStore, type Workspace } from '@/lib/store';

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

function activeThread() {
  const s = useStore.getState();
  const ws = s.workspaces.find(w => w.id === s.activeWorkspaceId)!;
  return ws.threads.find(t => t.id === s.activeWorkspaceThreadId)!;
}

beforeEach(() => {
  useStore.setState(CLEAN_STATE);
  useStore.getState().newWorkspaceThread(SEED_WS_ID, 'T');
  vi.restoreAllMocks();
});

describe('runLLM with ForcedArtifact opts (demo mode)', () => {
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
    expect(posted.mode).toBeUndefined();
  });

  it('renders the slash prefix in the user turn for context', async () => {
    mockEmptyStream();
    await runLLM('Q1 spend', {
      forcedKind: 'spend-chart',
      requirements: [],
      commandName: 'dataviz',
    });
    const userTurn = activeThread().turns.find(t => t.kind === 'user')!;
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

describe('runLLM in testing mode', () => {
  it('posts billEnvId/billProduct/mode when the active thread has a bill env', async () => {
    const fetchSpy = mockEmptyStream();
    const s = useStore.getState();
    s.setMode('testing');
    s.setWorkspaceThreadBillEnv(SEED_WS_ID, activeThread().id, 'env_demo', 'ap');

    await runLLM('', {
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
    expect(posted.billEnvId).toBe('env_demo');
    expect(posted.billProduct).toBe('ap');
  });

  it('does not call /api/chat when the active thread has no env — instead inlines a hint', async () => {
    const fetchSpy = mockEmptyStream();
    useStore.getState().setMode('testing');

    await runLLM('hi');

    expect(fetchSpy).not.toHaveBeenCalled();
    const turns = activeThread().turns;
    const lastAgent = [...turns].reverse().find(t => t.kind === 'agent');
    expect((lastAgent as any).text).toMatch(/Pick a Bill environment/);
  });
});
