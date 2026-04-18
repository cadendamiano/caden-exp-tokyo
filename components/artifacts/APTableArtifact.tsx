'use client';

import { BILLS, VENDORS } from '@/lib/data';
import { APTable } from '../primitives/APTable';

type Props = {
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export function APTableArtifact({ selected, onToggle }: Props) {
  return (
    <div>
      <div className="artifact-title">
        <h2>Open AP · all vendors</h2>
      </div>
      <div className="artifact-subtitle">
        <span>ran 16:42 · live</span>
        <span className="sep">·</span>
        <span>source: BILL /v3/api/list/Bill</span>
        <span className="sep">·</span>
        <span>14 records · $108,830 total</span>
      </div>
      <APTable bills={BILLS} vendors={VENDORS} selected={selected} onToggle={onToggle} filter="all" />
    </div>
  );
}
