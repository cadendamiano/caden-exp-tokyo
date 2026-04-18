'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Turn } from './turns';
import type { ArtifactKind } from './flows';

export type Provider = 'anthropic' | 'gemini';
export type Mode = 'demo' | 'testing';
export type BillProduct = 'ap' | 'se';

export type Tweaks = {
  accentHue: number;
  density: 'comfortable' | 'compact';
  streamSpeed: 'fast' | 'normal' | 'slow';
  showConnectors: boolean;
  provider: Provider;
  showCodeView: boolean;
};

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
  approvalStates: Record<string, 'approved' | 'rejected'>;
  billEnvId?: string;
  billProduct?: BillProduct;
};

type State = {
  tweaks: Tweaks;
  turns: Turn[];
  artifacts: Artifact[];
  activeArtifact: string | null;
  selectedBills: string[];
  approvalStates: Record<string, 'approved' | 'rejected'>;
  streaming: boolean;
  composer: string;

  mode: Mode;
  testingThreads: Thread[];
  activeTestingThreadId: string | null;

  setTweak: <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void;
  setComposer: (s: string) => void;
  setStreaming: (b: boolean) => void;
  addTurn: (t: Turn) => void;
  updateTurn: (id: string, patch: Partial<Turn>) => void;
  removeTurnsByKind: (kind: Turn['kind']) => void;
  setArtifacts: (fn: (prev: Artifact[]) => Artifact[]) => void;
  setActiveArtifact: (id: string | null) => void;
  toggleBill: (id: string) => void;
  setApproval: (batchId: string, state: 'approved' | 'rejected') => void;
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
  setApprovalInActiveThread: (batchId: string, state: 'approved' | 'rejected') => void;
  setThreadBillEnv: (id: string, envId: string | undefined, product: BillProduct) => void;
  activateArtifact: (id: string) => void;
  acknowledgeArtifactDryRun: (id: string) => void;
};

const WELCOME_TURN: Turn = {
  id: 'welcome',
  kind: 'agent',
  text: `Hi Riya — I'm connected to your BILL workspace (\`meridian-ops\`). I can read any AP/AR/Payment record, draft payments for your approval, build automations on BILL events, and generate artifacts from your data.

Every action that moves money requires a human approval gate. I'll never pay a bill or change a vendor record without showing you the exact payload first.

Try one of the demo prompts below, or type anything. Use \`/\` for slash commands.`,
  welcome: true,
};

const DEFAULT_TWEAKS: Tweaks = {
  accentHue: 195,
  density: 'comfortable',
  streamSpeed: 'normal',
  showConnectors: true,
  provider: 'anthropic',
  showCodeView: false,
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
      streaming: false,
      composer: '',

      mode: 'demo',
      testingThreads: [],
      activeTestingThreadId: null,

      setTweak: (k, v) => set(s => ({ tweaks: { ...s.tweaks, [k]: v } })),
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
      reset: () =>
        set({
          turns: [WELCOME_TURN],
          artifacts: [],
          activeArtifact: null,
          selectedBills: [],
          approvalStates: {},
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
                ? { ...th, approvalStates: { ...th.approvalStates, [batchId]: state } }
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
      partialize: (s) => ({
        tweaks: s.tweaks,
        artifacts: s.artifacts,
        activeArtifact: s.activeArtifact,
        approvalStates: s.approvalStates,
        mode: s.mode,
        testingThreads: s.testingThreads,
        activeTestingThreadId: s.activeTestingThreadId,
      }),
    }
  )
);

export function getActiveThread(): Thread | undefined {
  const s = useStore.getState();
  if (!s.activeTestingThreadId) return undefined;
  return s.testingThreads.find(t => t.id === s.activeTestingThreadId);
}
