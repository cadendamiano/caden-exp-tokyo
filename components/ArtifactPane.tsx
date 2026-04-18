'use client';

import { useStore } from '@/lib/store';
import { Icon } from './primitives/Icon';
import { APTableArtifact } from './artifacts/APTableArtifact';
import { SpendChartArtifact } from './artifacts/SpendChartArtifact';
import { Net15RuleArtifact } from './artifacts/Net15RuleArtifact';
import { CRMFlowArtifact } from './artifacts/CRMFlowArtifact';
import type { ArtifactKind } from '@/lib/flows';

function glyphFor(kind: ArtifactKind) {
  if (kind === 'ap-table') return <Icon.Table />;
  if (kind === 'spend-chart') return <Icon.Chart />;
  if (kind === 'rule-net15') return <Icon.Rule />;
  if (kind === 'crm-flow') return <Icon.Flow />;
  return <Icon.Doc />;
}

export function ArtifactPane() {
  const mode = useStore(s => s.mode);
  const demoArtifacts = useStore(s => s.artifacts);
  const threads = useStore(s => s.testingThreads);
  const activeThreadId = useStore(s => s.activeTestingThreadId);
  const setDemoArtifacts = useStore(s => s.setArtifacts);
  const setThreadArtifacts = useStore(s => s.setArtifactsInActiveThread);

  const active = useStore(s => s.activeArtifact);
  const setActive = useStore(s => s.setActiveArtifact);
  const selectedBills = useStore(s => s.selectedBills);
  const toggleBill = useStore(s => s.toggleBill);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const artifacts = mode === 'testing' ? (activeThread?.artifacts ?? []) : demoArtifacts;

  const cur = artifacts.find(a => a.id === active);
  const isOpen = !!active;

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

        <div className="artifact-body">
          {!cur && <EmptyArtifact />}
          {cur?.kind === 'ap-table' && (
            <APTableArtifact selected={new Set(selectedBills)} onToggle={toggleBill} />
          )}
          {cur?.kind === 'rule-net15' && <Net15RuleArtifact />}
          {cur?.kind === 'spend-chart' && <SpendChartArtifact />}
          {cur?.kind === 'crm-flow' && <CRMFlowArtifact />}
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
          Tables · Charts · Rules · Flows · Code
        </div>
      </div>
    </div>
  );
}
