'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Turn } from './turns';
import type { ArtifactKind, FlowStep } from './flows';
import type { DatasetKey } from './data';
import { SEED_WORKSPACES } from './data';
import type { Shortcut } from './shortcuts';
import {
  DEFAULT_MODEL_ID,
  MODELS,
  firstModelForProvider,
  providerOf,
  type ModelId,
  type Provider,
} from './models';

export type Mode = 'demo' | 'testing';
export type BillProduct = 'ap' | 'se';
export type WorkspaceView = 'workspaces' | 'history';

export type WorkspaceFile = {
  id: string;
  name: string;
  kind: 'spreadsheet' | 'document' | 'report' | 'analysis';
  createdAt: number;
  artifactId?: string;
};

export type Workspace = {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  threads: Thread[];
  files: WorkspaceFile[];
};

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
  defaultBillEnvId?: string;
  defaultBillProduct: BillProduct;
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
  html?: string;
  css?: string;
  script?: string;
  dataJson?: string;
  title?: string;
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
  activeArtifact: string | null;
  selectedBills: string[];
  streaming: boolean;
  composer: string;
  settingsStatus: SettingsStatus | null;

  mode: Mode;

  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspaceThreadId: string | null;
  workspaceView: WorkspaceView;
  expandedWorkspaceIds: string[];

  shortcuts: Shortcut[];
  addShortcut: (shortcut: Shortcut) => void;
  updateShortcut: (id: string, patch: Partial<Omit<Shortcut, 'id' | 'createdAt'>>) => void;
  deleteShortcut: (id: string) => void;

  setTweak: <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void;
  setSettingsStatus: (status: SettingsStatus | null) => void;
  setComposer: (s: string) => void;
  setStreaming: (b: boolean) => void;
  setActiveArtifact: (id: string | null) => void;
  toggleBill: (id: string) => void;

  setMode: (m: Mode) => void;
  activateArtifact: (id: string) => void;
  acknowledgeArtifactDryRun: (id: string) => void;

  setWorkspaceView: (v: WorkspaceView) => void;
  newWorkspace: (name?: string) => string;
  setActiveWorkspace: (id: string | null) => void;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  toggleWorkspaceExpanded: (id: string) => void;
  newWorkspaceThread: (workspaceId: string, title?: string) => string;
  setActiveWorkspaceThread: (workspaceId: string, threadId: string) => void;
  addTurnToActiveWorkspaceThread: (t: Turn) => void;
  updateTurnInActiveWorkspaceThread: (id: string, patch: Partial<Turn>) => void;
  removeTurnsByKindInActiveWorkspaceThread: (kind: Turn['kind']) => void;
  setArtifactsInActiveWorkspaceThread: (fn: (prev: Artifact[]) => Artifact[]) => void;
  setApprovalInActiveWorkspaceThread: (batchId: string, state: ApprovalState) => void;
  setApprovalPayloadInActiveWorkspaceThread: (batchId: string, payload: ApprovalPayload) => void;
  deleteWorkspaceThread: (workspaceId: string, threadId: string) => void;
  renameWorkspaceThread: (workspaceId: string, threadId: string, title: string) => void;
  setWorkspaceThreadBillEnv: (
    workspaceId: string,
    threadId: string,
    envId: string | undefined,
    product: BillProduct
  ) => void;
  openWorkspaceArtifact: (workspaceId: string, threadId: string, artifactId: string) => void;
  addWorkspaceFile: (workspaceId: string, file: WorkspaceFile) => void;
};

const DEFAULT_TWEAKS: Tweaks = {
  accentHue: 195,
  density: 'comfortable',
  streamSpeed: 'normal',
  showConnectors: true,
  modelId: DEFAULT_MODEL_ID,
  showCodeView: false,
  demoDataset: 'logistics',
  defaultBillEnvId: undefined,
  defaultBillProduct: 'ap',
};

function createThread(title?: string, tweaks?: Tweaks): Thread {
  return {
    id: `thr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: title ?? 'New thread',
    createdAt: Date.now(),
    turns: [],
    artifacts: [],
    selectedBills: [],
    approvalStates: {},
    approvalPayloads: {},
    billEnvId: tweaks?.defaultBillEnvId,
    billProduct: tweaks?.defaultBillProduct ?? 'ap',
  };
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      tweaks: DEFAULT_TWEAKS,
      activeArtifact: null,
      selectedBills: [],
      streaming: false,
      composer: '',
      settingsStatus: null,

      mode: 'demo',

      workspaces: SEED_WORKSPACES,
      activeWorkspaceId: null,
      activeWorkspaceThreadId: null,
      workspaceView: 'workspaces',
      expandedWorkspaceIds: [],

      shortcuts: [],
      addShortcut: (shortcut) =>
        set(s => ({ shortcuts: [...s.shortcuts, shortcut] })),
      updateShortcut: (id, patch) =>
        set(s => ({
          shortcuts: s.shortcuts.map(sc =>
            sc.id === id ? { ...sc, ...patch, updatedAt: Date.now() } : sc
          ),
        })),
      deleteShortcut: (id) =>
        set(s => ({ shortcuts: s.shortcuts.filter(sc => sc.id !== id) })),

      setTweak: (k, v) => set(s => ({ tweaks: { ...s.tweaks, [k]: v } })),
      setSettingsStatus: (settingsStatus) =>
        set(s => {
          // If current model's provider has no key but the other provider does,
          // auto-switch to a working model so submits don't fail with "key not set".
          if (!settingsStatus) return { settingsStatus };
          const current = providerOf(s.tweaks.modelId);
          if (settingsStatus[current]) return { settingsStatus };
          const other: Provider = current === 'anthropic' ? 'gemini' : 'anthropic';
          if (!settingsStatus[other]) return { settingsStatus };
          const fallback = firstModelForProvider(other);
          if (!fallback) return { settingsStatus };
          return {
            settingsStatus,
            tweaks: { ...s.tweaks, modelId: fallback },
          };
        }),
      setComposer: (composer) => set({ composer }),
      setStreaming: (streaming) => set({ streaming }),
      setActiveArtifact: (id) => set({ activeArtifact: id }),
      toggleBill: (id) =>
        set(s => {
          const has = s.selectedBills.includes(id);
          return { selectedBills: has ? s.selectedBills.filter(x => x !== id) : [...s.selectedBills, id] };
        }),

      setMode: (mode) =>
        set({ mode, streaming: false, composer: '', activeArtifact: null }),

      activateArtifact: (id) =>
        set(s => {
          const patch = (a: Artifact) =>
            a.id === id ? { ...a, status: 'active' as ArtifactStatus, version: (a.version || 1) + 1 } : a;
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? { ...w, threads: w.threads.map(th =>
                    th.id === s.activeWorkspaceThreadId
                      ? { ...th, artifacts: th.artifacts.map(patch) }
                      : th
                  ) }
                : w
            ),
          };
        }),

      acknowledgeArtifactDryRun: (id) =>
        set(s => {
          const patch = (a: Artifact) =>
            a.id === id ? { ...a, dryRunAcknowledged: true } : a;
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? { ...w, threads: w.threads.map(th =>
                    th.id === s.activeWorkspaceThreadId
                      ? { ...th, artifacts: th.artifacts.map(patch) }
                      : th
                  ) }
                : w
            ),
          };
        }),

      setWorkspaceView: (workspaceView) => set({ workspaceView }),

      newWorkspace: (name) => {
        const id = `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const ws: Workspace = {
          id,
          name: name?.trim() || 'New workspace',
          icon: '📁',
          color: 'oklch(0.78 0.06 195)',
          createdAt: Date.now(),
          threads: [],
          files: [],
        };
        set(s => ({
          workspaces: [...s.workspaces, ws],
          activeWorkspaceId: id,
          expandedWorkspaceIds: [...s.expandedWorkspaceIds, id],
        }));
        return id;
      },

      setActiveWorkspace: (id) =>
        set({ activeWorkspaceId: id, activeWorkspaceThreadId: null, activeArtifact: null }),

      deleteWorkspace: (id) =>
        set(s => ({
          workspaces: s.workspaces.filter(w => w.id !== id),
          activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
          activeWorkspaceThreadId:
            s.activeWorkspaceId === id ? null : s.activeWorkspaceThreadId,
          expandedWorkspaceIds: s.expandedWorkspaceIds.filter(x => x !== id),
        })),

      renameWorkspace: (id, name) =>
        set(s => ({
          workspaces: s.workspaces.map(w =>
            w.id === id ? { ...w, name: name.trim() || 'Untitled workspace' } : w
          ),
        })),

      toggleWorkspaceExpanded: (id) =>
        set(s => {
          const has = s.expandedWorkspaceIds.includes(id);
          return {
            expandedWorkspaceIds: has
              ? s.expandedWorkspaceIds.filter(x => x !== id)
              : [...s.expandedWorkspaceIds, id],
          };
        }),

      newWorkspaceThread: (workspaceId, title) => {
        let threadId = '';
        set(s => {
          const thread = createThread(title, s.tweaks);
          threadId = thread.id;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === workspaceId ? { ...w, threads: [...w.threads, thread] } : w
            ),
            activeWorkspaceId: workspaceId,
            activeWorkspaceThreadId: thread.id,
            expandedWorkspaceIds: s.expandedWorkspaceIds.includes(workspaceId)
              ? s.expandedWorkspaceIds
              : [...s.expandedWorkspaceIds, workspaceId],
          };
        });
        return threadId;
      },

      setActiveWorkspaceThread: (workspaceId, threadId) =>
        set({
          activeWorkspaceId: workspaceId,
          activeWorkspaceThreadId: threadId,
          activeArtifact: null,
        }),

      addTurnToActiveWorkspaceThread: (t) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? { ...th, turns: [...th.turns, t] }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      updateTurnInActiveWorkspaceThread: (id, patch) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? {
                            ...th,
                            turns: th.turns.map(t =>
                              t.id === id ? ({ ...t, ...patch } as Turn) : t
                            ),
                          }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      removeTurnsByKindInActiveWorkspaceThread: (kind) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? { ...th, turns: th.turns.filter(t => t.kind !== kind) }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      setArtifactsInActiveWorkspaceThread: (fn) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? { ...th, artifacts: fn(th.artifacts) }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      setApprovalInActiveWorkspaceThread: (batchId, state) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? { ...th, approvalStates: { ...(th.approvalStates ?? {}), [batchId]: state } }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      setApprovalPayloadInActiveWorkspaceThread: (batchId, payload) =>
        set(s => {
          if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return s;
          return {
            workspaces: s.workspaces.map(w =>
              w.id === s.activeWorkspaceId
                ? {
                    ...w,
                    threads: w.threads.map(th =>
                      th.id === s.activeWorkspaceThreadId
                        ? { ...th, approvalPayloads: { ...(th.approvalPayloads ?? {}), [batchId]: payload } }
                        : th
                    ),
                  }
                : w
            ),
          };
        }),

      deleteWorkspaceThread: (workspaceId, threadId) =>
        set(s => ({
          workspaces: s.workspaces.map(w =>
            w.id === workspaceId
              ? { ...w, threads: w.threads.filter(t => t.id !== threadId) }
              : w
          ),
          activeWorkspaceThreadId:
            s.activeWorkspaceId === workspaceId && s.activeWorkspaceThreadId === threadId
              ? null
              : s.activeWorkspaceThreadId,
          activeArtifact:
            s.activeWorkspaceId === workspaceId && s.activeWorkspaceThreadId === threadId
              ? null
              : s.activeArtifact,
        })),

      renameWorkspaceThread: (workspaceId, threadId, title) =>
        set(s => ({
          workspaces: s.workspaces.map(w =>
            w.id === workspaceId
              ? {
                  ...w,
                  threads: w.threads.map(t =>
                    t.id === threadId ? { ...t, title: title.trim() || 'Untitled thread' } : t
                  ),
                }
              : w
          ),
        })),

      setWorkspaceThreadBillEnv: (workspaceId, threadId, envId, product) =>
        set(s => ({
          workspaces: s.workspaces.map(w =>
            w.id === workspaceId
              ? {
                  ...w,
                  threads: w.threads.map(t =>
                    t.id === threadId ? { ...t, billEnvId: envId, billProduct: product } : t
                  ),
                }
              : w
          ),
        })),

      openWorkspaceArtifact: (workspaceId, threadId, artifactId) =>
        set({ activeWorkspaceId: workspaceId, activeWorkspaceThreadId: threadId, activeArtifact: artifactId }),

      addWorkspaceFile: (workspaceId, file) =>
        set(s => ({
          workspaces: s.workspaces.map(w =>
            w.id === workspaceId ? { ...w, files: [...w.files, file] } : w
          ),
        })),
    }),
    {
      name: 'bcw:state',
      storage: createJSONStorage(() => localStorage),
      version: 8,
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
        if (persisted && fromVersion < 5) {
          persisted.workspaces = persisted.workspaces ?? [];
          persisted.activeWorkspaceId = null;
          persisted.activeWorkspaceThreadId = null;
          persisted.workspaceView = 'workspaces';
          persisted.expandedWorkspaceIds = [];
        }
        if (persisted && fromVersion < 6) {
          if (persisted.mode === 'workspace') persisted.mode = 'demo';
          if (persisted.mode !== 'demo' && persisted.mode !== 'testing') {
            persisted.mode = 'demo';
          }
          delete persisted.turns;
          delete persisted.artifacts;
          delete persisted.approvalStates;
          delete persisted.approvalPayloads;
          delete persisted.testingThreads;
          delete persisted.activeTestingThreadId;
          persisted.shortcuts = persisted.shortcuts ?? [];
        }
        if (persisted && fromVersion < 7) {
          if (persisted.tweaks) {
            persisted.tweaks.defaultBillEnvId = persisted.tweaks.defaultBillEnvId ?? undefined;
            persisted.tweaks.defaultBillProduct = persisted.tweaks.defaultBillProduct ?? 'ap';
          }
        }
        if (persisted && fromVersion < 8) {
          // The 'document' kind switched from a static-HTML component to a
          // Univer-backed editor that needs dataJson. Legacy persisted
          // documents have no dataJson — drop the empty shells so the user
          // can regenerate via /doc instead of seeing a blank editor.
          for (const w of persisted.workspaces ?? []) {
            for (const t of w.threads ?? []) {
              t.artifacts = (t.artifacts ?? []).filter(
                (a: any) => !(a?.kind === 'document' && !a?.dataJson)
              );
            }
          }
        }
        return persisted;
      },
      partialize: (s) => ({
        tweaks: s.tweaks,
        activeArtifact: s.activeArtifact,
        mode: s.mode,
        workspaces: s.workspaces.map(w => ({
          ...w,
          threads: w.threads.map(t => {
            const { approvalPayloads: _strip, ...rest } = t;
            return rest;
          }),
        })),
        activeWorkspaceId: s.activeWorkspaceId,
        activeWorkspaceThreadId: s.activeWorkspaceThreadId,
        workspaceView: s.workspaceView,
        expandedWorkspaceIds: s.expandedWorkspaceIds,
        shortcuts: s.shortcuts,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Workspaces: rehydrate approvalPayloads on each thread, seed if empty.
        const workspaces = (state.workspaces ?? []).map((w: any) => ({
          ...w,
          files: w.files ?? [],
          threads: (w.threads ?? []).map((t: any) => ({
            ...t,
            approvalPayloads: t.approvalPayloads ?? {},
            approvalStates: t.approvalStates ?? {},
          })),
        }));
        state.workspaces = workspaces.length > 0 ? workspaces : SEED_WORKSPACES;
        state.expandedWorkspaceIds = state.expandedWorkspaceIds ?? [];
        state.workspaceView = state.workspaceView ?? 'workspaces';
        state.shortcuts = state.shortcuts ?? [];
      },
    }
  )
);

export function getActiveWorkspace(): Workspace | undefined {
  const s = useStore.getState();
  if (!s.activeWorkspaceId) return undefined;
  return s.workspaces.find(w => w.id === s.activeWorkspaceId);
}

export function getActiveWorkspaceThread(): Thread | undefined {
  const s = useStore.getState();
  if (!s.activeWorkspaceId || !s.activeWorkspaceThreadId) return undefined;
  const ws = s.workspaces.find(w => w.id === s.activeWorkspaceId);
  return ws?.threads.find(t => t.id === s.activeWorkspaceThreadId);
}
