'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Icon } from './primitives/Icon';
import { APTableArtifact } from './artifacts/APTableArtifact';
import { SpendChartArtifact } from './artifacts/SpendChartArtifact';
import { Net15RuleArtifact } from './artifacts/Net15RuleArtifact';
import { CRMFlowArtifact } from './artifacts/CRMFlowArtifact';
import { LiquidityBurndownArtifact } from './artifacts/LiquidityBurndownArtifact';
import { SweepRuleArtifact } from './artifacts/SweepRuleArtifact';
import { DocumentArtifact } from './artifacts/DocumentArtifact';
import { ArtifactPreview } from './ArtifactPreview';
import { ArtifactCode } from './ArtifactCode';
import type { ArtifactKind } from '@/lib/flows';
import type { ArtifactStatus } from '@/lib/store';

function glyphFor(kind: ArtifactKind) {
  if (kind === 'ap-table') return <Icon.Table />;
  if (kind === 'spend-chart') return <Icon.Chart />;
  if (kind === 'rule-net15') return <Icon.Rule />;
  if (kind === 'crm-flow') return <Icon.Flow />;
  if (kind === 'liquidity-burndown') return <Icon.Chart />;
  if (kind === 'sweep-rule') return <Icon.Rule />;
  return <Icon.Doc />;
}

type ViewTab = 'logic' | 'preview' | 'code';

function statusBadgeClass(status: ArtifactStatus | undefined): string {
  if (status === 'active') return 'artifact-status-badge active';
  if (status === 'paused') return 'artifact-status-badge paused';
  return 'artifact-status-badge draft';
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ArtifactPane() {
  const mode = useStore(s => s.mode);
  const showCodeView = useStore(s => s.tweaks.showCodeView);
  const demoArtifacts = useStore(s => s.artifacts);
  const threads = useStore(s => s.testingThreads);
  const activeThreadId = useStore(s => s.activeTestingThreadId);
  const setDemoArtifacts = useStore(s => s.setArtifacts);
  const setThreadArtifacts = useStore(s => s.setArtifactsInActiveThread);

  const active = useStore(s => s.activeArtifact);
  const setActive = useStore(s => s.setActiveArtifact);
  const selectedBills = useStore(s => s.selectedBills);
  const toggleBill = useStore(s => s.toggleBill);

  const [view, setView] = useState<ViewTab>('logic');

  const activeThread = threads.find(t => t.id === activeThreadId);
  const artifacts = mode === 'testing' ? (activeThread?.artifacts ?? []) : demoArtifacts;

  const cur = artifacts.find(a => a.id === active);
  const isOpen = !!active;

  // Reset to logic view whenever the open artifact changes
  useEffect(() => {
    setView('logic');
  }, [active]);

  const closeOne = (id: string) => {
    if (mode === 'testing') {
      setThreadArtifacts(prev => prev.filter(x => x.id !== id));
    } else {
      setDemoArtifacts(prev => prev.filter(x => x.id !== id));
    }
    if (active === id) setActive(null);
  };

  return (
    <>
      <div
        className={'artifact-scrim' + (isOpen ? ' open' : '')}
        onClick={() => setActive(null)}
      />
      <section className={'artifact-pane' + (isOpen ? ' open' : '')}>
        {/* Artifact selection tabs (top strip) */}
        <div className="artifact-tabs">
          {artifacts.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                color: 'var(--ink-4)',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
              }}
            >
              Artifacts · nothing open
            </div>
          ) : (
            artifacts.map(a => (
              <div
                key={a.id}
                className={'artifact-tab' + (active === a.id ? ' active' : '')}
                onClick={() => setActive(a.id)}
              >
                <span className="icn">{glyphFor(a.kind)}</span>
                <span>{a.label}</span>
                <span
                  className="close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeOne(a.id);
                  }}
                >
                  <Icon.Close />
                </span>
              </div>
            ))
          )}
          <div className="artifact-tabs-spacer" />
          <div className="artifact-tools">
            <button className="icon-btn" title="Copy as link">↗</button>
            <button className="icon-btn" title="Download">⤓</button>
          </div>
        </div>

        {/* Content area: view bar + body */}
        <div className="artifact-content">
          {cur ? (
            <>
              {/* View switcher + provenance */}
              <div className="artifact-view-bar">
                <div className="artifact-view-tabs">
                  {(['logic', 'preview', ...(showCodeView ? ['code'] : [])] as ViewTab[]).map(v => (
                    <button
                      key={v}
                      className={'artifact-view-tab' + (view === v ? ' active' : '')}
                      onClick={() => setView(v)}
                    >
                      {v === 'logic' ? 'Logic' : v === 'preview' ? (cur.kind === 'rule-net15' ? 'Pro forma ledger' : 'Ledger') : 'Code'}
                    </button>
                  ))}
                </div>
                <div className="artifact-provenance">
                  <span className={statusBadgeClass(cur.status)}>
                    {cur.status ?? 'draft'}
                  </span>
                  <span className="artifact-prov-version">
                    {cur.editedBy && <span className="artifact-prov-dot" title="Hand-edited — logic and code may differ" />}
                    v{cur.version ?? 1}
                  </span>
                  <span className="artifact-prov-sep">·</span>
                  <span className="artifact-prov-author">
                    {cur.createdBy ?? 'Coworker'}
                    {cur.editedBy ? ` · ${cur.editedBy} edited ${timeAgo(cur.editedAt)}` : ''}
                  </span>
                </div>
              </div>

              {/* Artifact body */}
              <div className="artifact-body">
                {view === 'preview' && <ArtifactPreview artifact={cur} />}
                {view === 'code' && <ArtifactCode artifact={cur} />}
                {view === 'logic' && cur.kind === 'ap-table' && (
                  <APTableArtifact selected={new Set(selectedBills)} onToggle={toggleBill} />
                )}
                {view === 'logic' && cur.kind === 'rule-net15' && <Net15RuleArtifact artifact={cur} />}
                {view === 'logic' && cur.kind === 'spend-chart' && <SpendChartArtifact />}
                {view === 'logic' && cur.kind === 'crm-flow' && <CRMFlowArtifact artifact={cur} />}
                {view === 'logic' && cur.kind === 'liquidity-burndown' && <LiquidityBurndownArtifact artifact={cur} />}
                {view === 'logic' && cur.kind === 'sweep-rule' && <SweepRuleArtifact artifact={cur} />}
                {view === 'logic' && cur.kind === 'document' && <DocumentArtifact />}
              </div>
            </>
          ) : (
            <EmptyArtifact />
          )}
        </div>
      </section>
    </>
  );
}

function EmptyArtifact() {
  return (
    <div className="artifact-empty">
      <div>
        <div className="glyph">◫</div>
        <div>
          Artifacts the coworker creates
          <br />
          open here side-by-side.
        </div>
        <div style={{ marginTop: 12, color: 'var(--ink-3)' }}>
          Tables · Charts · Rules · Flows · Docs · Code
        </div>
      </div>
    </div>
  );
}
