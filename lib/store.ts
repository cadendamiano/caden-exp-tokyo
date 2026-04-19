'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Turn } from './turns';
import type { ArtifactKind, FlowStep } from './flows';
import type { DatasetKey } from './data';
import { DEFAULT_MODEL_ID, MODELS, type ModelId, type Provider } from './models';

export type Mode = 'demo' | 'testing';
export type BillProduct = 'ap' | 'se';

// Shared approval state union. `undefined`/missing-key = no entry yet (pre-stage).
// `'pending'` is set explicitly on rollback from `'submitting'`.
export type ApprovalState = 'pending' | 'submitting' | 'approved' | 'rejected';

export type ApprovalPayload = Extract<FlowStep, { kind: 'approval' }>['payload'];

export type Tweaks = {
  accentHue: number;
  density: 'comfortable' | 'compact';
  streamSpeed: 'fast' | 'normal' | 'slow';
  showConnectors: boolean;
  modelId: ModelId;
  showCodeView: boolean;
  demoDataset: DatasetKey;
};

export type SettingsStatus = { anthropic: boolean; gemini: boolean };

export type ArtifactStatus = 'draft' | 'active' | 'paused';

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  label: string;
  filter?: string;
  status: ArtifactStatus;
  version: number;
  createdBy: string;
  editedBy?: string;
  editedAt?: number;
  dryRunAcknowledged?: boolean;
};

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  turns: Turn[];
  artifacts: Artifact[];
  selectedBills: string[];
  approvalStates: Record<string, ApprovalState>;
  approvalPayloads: Record<string, ApprovalPayload>;
  billEnvId?: string;
  billProduct?: BillProduct;
};

type State = {
  tweaks: Tweaks;
  turns: Turn[];
  artifacts: Artifact[];
  activeArtifact: string | null;
  selectedBills: string[];
  approvalStates: Record<string, ApprovalState>;
  approvalPayloads: Record<string, ApprovalPayload>;
  streaming: boolean;
  composer: string;
  settingsStatus: SettingsStatus | null;

  mode: Mode;
  testingThreads: Thread[];
  activeTestingThreadId: string | null;

  setTweak: <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void;
  setSettingsStatus: (status: SettingsStatus | null) => void;
  setComposer: (s: string) => void;
  setStreaming: (b: boolean) => void;
  addTurn: (t: Turn) => void;
  updateTurn: (id: string, patch: Partial<Turn>) => void;
  removeTurnsByKind: (kind: Turn['kind']) => void;
  setArtifacts: (fn: (prev: Artifact[]) => Artifact[]) => void;
  setActiveArtifact: (id: string | null) => void;
  toggleBill: (id: string) => void;
  setApproval: (batchId: string, state: ApprovalState) => void;
  setApprovalPayload: (batchId: string, payload: ApprovalPayload) => void;
  reset: () => void;
  seedWelcome: () => void;

  setMode: (m: Mode) => void;
  newThread: (title?: string) => string;
  setActiveThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  addTurnToActiveThread: (t: Turn) => void;
  updateTurnInActiveThread: (id: string, patch: Partial<Turn>) => void;
  setArtifactsInActiveThread: (fn: (prev: Artifact[]) => Artifact[]) => void;
  setApprovalInActiveThread: (batchId: string, state: ApprovalState) => void;
  setApprovalPayloadInActiveThread: (batchId: string, payload: ApprovalPayload) => void;
  setThreadBillEnv: (id: string, envId: string | undefined, product: BillProduct) => void;
  activateArtifact: (id: string) => void;
  acknowledgeArtifactDryRun: (id: string) => void;
};

const WELCOME_TURN: Turn = {
  id: 'welcome',
  kind: 'agent',
  text: `I'm connected to your BILL workspace (\`meridian-ops\`). I can read any AP/AR/Payment record, draft payments for your approval, build automations on BILL events, and generate artifacts from your data.

Every action that moves money requires a human approval gate. I'll never pay a bill or change a vendor record without showing you the exact payload first.

Try one of the demo prompts below, or type anything. Use \`/\` for slash commands.`,
  welcome: true,
};

const DEFAULT_TWEAKS: Tweaks = {
  accentHue: 195,
  density: 'comfortable',
  streamSpeed: 'normal',
  showConnectors: true,
  modelId: DEFAULT_MODEL_ID,
  showCodeView: false,
  demoDataset: 'logistics',
};

function createThread(title?: string): Thread {
  return {
    id: `thr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: title ?? 'New thread',
    createdAt: Date.now(),
    turns: [],
    artifacts: [],
    selectedBills: [],
    approvalStates: {},
    approvalPayloads: {},
    billProduct: 'ap',
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tweaks: DEFAULT_TWEAKS,
      turns: [WELCOME_TURN],
      artifacts: [],
      activeArtifact: null,
      selectedBills: [],
      approvalStates: {},
      approvalPayloads: {},
      streaming: false,
      composer: '',
      settingsStatus: null,

      mode: 'demo',
      testingThreads: [],
      activeTestingThreadId: null,

      setTweak: (k, v) => set(s => ({ tweaks: { ...s.tweaks, [k]: v } })),
      setSettingsStatus: (settingsStatus) => set({ settingsStatus }),
      setComposer: (composer) => set({ composer }),
      setStreaming: (streaming) => set({ streaming }),
      addTurn: (t) => set(s => ({ turns: [...s.turns, t] })),
      updateTurn: (id, patch) =>
        set(s => ({ turns: s.turns.map(t => (t.id === id ? ({ ...t, ...patch } as Turn) : t)) })),
      removeTurnsByKind: (kind) => set(s => ({ turns: s.turns.filter(t => t.kind !== kind) })),
      setArtifacts: (fn) => set(s => ({ artifacts: fn(s.artifacts) })),
      setActiveArtifact: (id) => set({ activeArtifact: id }),
      toggleBill: (id) =>
        set(s => {
          const has = s.selectedBills.includes(id);
          return { selectedBills: has ? s.selectedBills.filter(x => x !== id) : [...s.selectedBills, id] };
        }),
      setApproval: (batchId, state) =>
        set(s => ({ approvalStates: { ...s.approvalStates, [batchId]: state } })),
      setApprovalPayload: (batchId, payload) =>
        set(s => ({ approvalPayloads: { ...s.approvalPayloads, [batchId]: payload } })),
      reset: () =>
        set({
          turns: [WELCOME_TURN],
          artifacts: [],
          activeArtifact: null,
          selectedBills: [],
          approvalStates: {},
          approvalPayloads: {},
          streaming: false,
          composer: '',
        }),
      seedWelcome: () => set({ turns: [WELCOME_TURN] }),

      setMode: (mode) =>
        set({ mode, streaming: false, composer: '', activeArtifact: null }),

      newThread: (title) => {
        const thread = createThread(title);
        set(s => ({
          testingThreads: [...s.testingThreads, thread],
          activeTestingThreadId: thread.id,
        }));
        return thread.id;
      },

      setActiveThread: (id) => set({ activeTestingThreadId: id, activeArtifact: null }),

      deleteThread: (id) =>
        set(s => {
          const remaining = s.testingThreads.filter(t => t.id !== id);
          const stillActive = s.activeTestingThreadId === id
            ? (remaining[0]?.id ?? null)
            : s.activeTestingThreadId;
          return { testingThreads: remaining, activeTestingThreadId: stillActive };
        }),

      renameThread: (id, title) =>
        set(s => ({
          testingThreads: s.testingThreads.map(t =>
            t.id === id ? { ...t, title: title || 'Untitled thread' } : t
          ),
        })),

      addTurnToActiveThread: (t) =>
        set(s => {
          if (!s.activeTestingThreadId) return s;
          return {
            testingThreads: s.testingThreads.map(th =>
              th.id === s.activeTestingThreadId ? { ...th, turns: [...th.turns, t] } : th
            ),
          };
        }),

      updateTurnInActiveThread: (id, patch) =>
        set(s => {
          if (!s.activeTestingThreadId) return s;
          return {
            testingThreads: s.testingThreads.map(th =>
              th.id === s.activeTestingThreadId
                ? {
                    ...th,
                    turns: th.turns.map(t => (t.id === id ? ({ ...t, ...patch } as Turn) : t)),
                  }
                : th
            ),
          };
        }),

      setArtifactsInActiveThread: (fn) =>
        set(s => {
          if (!s.activeTestingThreadId) return s;
          return {
            testingThreads: s.testingThreads.map(th =>
              th.id === s.activeTestingThreadId ? { ...th, artifacts: fn(th.artifacts) } : th
            ),
          };
        }),

      setApprovalInActiveThread: (batchId, state) =>
        set(s => {
          if (!s.activeTestingThreadId) return s;
          return {
            testingThreads: s.testingThreads.map(th =>
              th.id === s.activeTestingThreadId
                ? { ...th, approvalStates: { ...(th.approvalStates ?? {}), [batchId]: state } }
                : th
            ),
          };
        }),

      setApprovalPayloadInActiveThread: (batchId, payload) =>
        set(s => {
          if (!s.activeTestingThreadId) return s;
          return {
            testingThreads: s.testingThreads.map(th =>
              th.id === s.activeTestingThreadId
                ? { ...th, approvalPayloads: { ...(th.approvalPayloads ?? {}), [batchId]: payload } }
                : th
            ),
          };
        }),

      setThreadBillEnv: (id, envId, product) =>
        set(s => ({
          testingThreads: s.testingThreads.map(t =>
            t.id === id ? { ...t, billEnvId: envId, billProduct: product } : t
          ),
        })),

      activateArtifact: (id) =>
        set(s => {
          const patch = (a: Artifact) =>
            a.id === id ? { ...a, status: 'active' as ArtifactStatus, version: (a.version || 1) + 1 } : a;
          if (s.mode === 'testing' && s.activeTestingThreadId) {
            return {
              testingThreads: s.testingThreads.map(th =>
                th.id === s.activeTestingThreadId
                  ? { ...th, artifacts: th.artifacts.map(patch) }
                  : th
              ),
            };
          }
          return { artifacts: s.artifacts.map(patch) };
        }),

      acknowledgeArtifactDryRun: (id) =>
        set(s => {
          const patch = (a: Artifact) =>
            a.id === id ? { ...a, dryRunAcknowledged: true } : a;
          if (s.mode === 'testing' && s.activeTestingThreadId) {
            return {
              testingThreads: s.testingThreads.map(th =>
                th.id === s.activeTestingThreadId
                  ? { ...th, artifacts: th.artifacts.map(patch) }
                  : th
              ),
            };
          }
          return { artifacts: s.artifacts.map(patch) };
        }),
    }),
    {
      name: 'bcw:state',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted: any, fromVersion: number) => {
        if (persisted && fromVersion < 2) {
          persisted.tweaks = { ...DEFAULT_TWEAKS, ...(persisted.tweaks ?? {}) };
        }
        if (persisted?.tweaks && fromVersion < 4) {
          const legacy = persisted.tweaks.provider as Provider | undefined;
          const firstGemini = MODELS.find(m => m.provider === 'gemini')?.id;
          persisted.tweaks.modelId =
            legacy === 'gemini' ? (firstGemini ?? DEFAULT_MODEL_ID) : DEFAULT_MODEL_ID;
          delete persisted.tweaks.provider;
        }
        return persisted;
      },
      partialize: (s) => ({
        tweaks: s.tweaks,
        artifacts: s.artifacts,
        activeArtifact: s.activeArtifact,
        approvalStates: s.approvalStates,
        // approvalPayloads (root): intentionally omitted — regenerate on next run.
        mode: s.mode,
        testingThreads: s.testingThreads.map(t => {
          const { approvalPayloads: _strip, ...rest } = t;
          return rest;
        }),
        activeTestingThreadId: s.activeTestingThreadId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Every load: ensure each thread has approvalPayloads, since partialize strips it.
        state.testingThreads = (state.testingThreads ?? []).map((t: any) => ({
          ...t,
          approvalPayloads: t.approvalPayloads ?? {},
          approvalStates: t.approvalStates ?? {},
        }));
        // Root approvalPayloads is intentionally not persisted — rehydrate empty.
        state.approvalPayloads = state.approvalPayloads ?? {};
      },
    }
  )
);

export function getActiveThread(): Thread | undefined {
  const s = useStore.getState();
  if (!s.activeTestingThreadId) return undefined;
  return s.testingThreads.find(t => t.id === s.activeTestingThreadId);
}
