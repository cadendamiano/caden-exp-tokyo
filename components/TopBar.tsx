'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function TopBar() {
  const mode = useStore(s => s.mode);
  const demoDataset = useStore(s => s.tweaks.demoDataset);
  const childCompany = demoDataset === 'logistics'
    ? 'Crestview Freight Solutions'
    : 'Meridian Operations';

  const [userName, setUserName] = useState('Developer');
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.getAuthState) return;
    api.getAuthState().then((s: any) => {
      if (s?.user?.name) setUserName(s.user.name);
    });
  }, []);

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
        <span>{userName}</span>
      </div>
    </div>
  );
}
