'use client';

import { useStore } from '@/lib/store';

type Props = { onOpenTweaks: () => void };

export function TopBar({ onOpenTweaks }: Props) {
  const mode = useStore(s => s.mode);
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">B<span>·</span></div>
        <span>BILL Coworker</span>
        <span className="brand-divider">/</span>
        <span className={'topbar-mode-badge' + (mode === 'testing' ? ' testing' : '')}>
          {mode}
        </span>
      </div>
      <div className="topbar-spacer" />
      <div className="workspace-pill">
        <span className="workspace-dot" />
        <span>meridian-ops · ACME Holdings</span>
      </div>
      <div className="topbar-meta">
        <span>Riya Shah · Controller</span>
        <button className="kbd" onClick={onOpenTweaks} title="Open tweaks">⌘K</button>
      </div>
    </div>
  );
}
