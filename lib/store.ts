'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Turn } from './turns';
import type { ArtifactKind } from './flows';

export type Provider = 'anthropic' | 'gemini';

export type Tweaks = {
  accentHue: number;
  density: 'comfortable' | 'compact';
  streamSpeed: 'fast' | 'normal' | 'slow';
  showConnectors: boolean;
  provider: Provider;
};

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  label: string;
  filter?: string;
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
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      tweaks: DEFAULT_TWEAKS,
      turns: [WELCOME_TURN],
      artifacts: [],
      activeArtifact: null,
      selectedBills: [],
      approvalStates: {},
      streaming: false,
      composer: '',

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
    }),
    {
      name: 'bcw:state',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tweaks: s.tweaks,
        artifacts: s.artifacts,
        activeArtifact: s.activeArtifact,
        approvalStates: s.approvalStates,
      }),
    }
  )
);
