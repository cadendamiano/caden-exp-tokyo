import type { FlowStep, ToolRowSpec } from './flows';

export type Turn =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'agent'; text: string; streaming?: boolean; welcome?: boolean }
  | { id: string; kind: 'tools'; rows: ToolRowSpec[]; pending?: number }
  | { id: string; kind: 'libs'; items: { pkg: string; ver: string }[]; total: number }
  | { id: string; kind: 'building'; label: string; sub: string }
  | {
      id: string;
      kind: 'artifact-card';
      artifactId: string;
      title: string;
      sub: string;
      meta: string;
      icon?: string;
    }
  | {
      id: string;
      kind: 'approval';
      payload: Extract<FlowStep, { kind: 'approval' }>['payload'];
      simulated?: boolean;
    }
  | { id: string; kind: 'suggest'; items: string[] }
  | {
      id: string;
      kind: 'form-question';
      question: string;
      options: { id: string; label: string; description?: string }[];
      multiSelect?: boolean;
      freeText?: boolean;
      // runtime state
      answered?: boolean;
      selected?: string[];
      freeTextValue?: string;
    };

let seq = 0;
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(++seq).toString(36)}`;
