'use client';

import { useStore } from '@/lib/store';

type Props = { onOpenTweaks: () => void };

export function TopBar({ onOpenTweaks }: Props) {
  const mode = useStore(s => s.mode);
  const demoDataset = useStore(s => s.tweaks.demoDataset);
  const childCompany = demoDataset === 'logistics'
    ? 'Crestview Freight Solutions'
    : 'Meridian Operations';

  return (
    <div className="topbar">
      <div className="topbar-crumbs">
        <span className="topbar-product">BILL Coworker</span>
        <span className="topbar-sep">/</span>
        <span className="topbar-chip">ACME Holdings</span>
        <span className="topbar-sep">/</span>
        <span className="topbar-chip topbar-chip-entity">
          <span className="topbar-entity-dot" />
          {childCompany}
        </span>
        <span className="topbar-sep">/</span>
        <span className={'topbar-env' + (mode === 'testing' ? ' testing' : '')}>
          {mode}
        </span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-meta">
        <span>Riya Shah · Controller</span>
        <button className="kbd" onClick={onOpenTweaks} title="Open tweaks">⌘K</button>
      </div>
    </div>
  );
}
