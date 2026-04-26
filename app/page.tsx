'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { handleApprove, handleReject, handleFormAnswer, runFlow } from '@/lib/runtime';
import { SESSION_FLOW_MAP } from '@/lib/data';
import { TopBar } from '@/components/TopBar';
import { Rail } from '@/components/Rail';
import { Composer } from '@/components/Composer';
import { Turn } from '@/components/Turn';
import { ArtifactPane } from '@/components/ArtifactPane';
import { ResizeHandle } from '@/components/ResizeHandle';
import { DevConfigPanel } from '@/components/DevConfigPanel';

export default function Page() {
  const mode = useStore(s => s.mode);
  const workspaces = useStore(s => s.workspaces);
  const activeWorkspaceId = useStore(s => s.activeWorkspaceId);
  const activeWorkspaceThreadId = useStore(s => s.activeWorkspaceThreadId);
  const activeArtifact = useStore(s => s.activeArtifact);
  const setActiveArtifact = useStore(s => s.setActiveArtifact);
  const setComposer = useStore(s => s.setComposer);
  const accentHue = useStore(s => s.tweaks.accentHue);
  const newWorkspaceThread = useStore(s => s.newWorkspaceThread);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [railW, setRailW] = useState(240);
  const [convoW, setConvoW] = useState(480);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeWsThread = useMemo(() => {
    if (!activeWorkspaceId || !activeWorkspaceThreadId) return undefined;
    const ws = workspaces.find(w => w.id === activeWorkspaceId);
    return ws?.threads.find(t => t.id === activeWorkspaceThreadId);
  }, [workspaces, activeWorkspaceId, activeWorkspaceThreadId]);

  const turns = activeWsThread?.turns ?? [];
  const approvalStates = activeWsThread?.approvalStates ?? {};
  const starterFlowId =
    mode === 'demo' && activeWsThread && turns.length === 0
      ? SESSION_FLOW_MAP[activeWsThread.id]
      : undefined;

  useEffect(() => {
    document.documentElement.style.setProperty('--hue', String(accentHue));
  }, [accentHue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setTweaksOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (activeWorkspaceId) newWorkspaceThread(activeWorkspaceId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newWorkspaceThread, activeWorkspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  return (
    <div className="app" style={{ '--rail-w': railW + 'px', '--convo-w': convoW + 'px' } as React.CSSProperties}>
      <TopBar />

      <Rail />

      <ResizeHandle onDelta={d => setRailW(w => Math.max(160, w + d))} />

      <main className="convo">
        <div className="convo-stream">
          {!activeWsThread && (
            <div className="testing-empty">
              <div>
                <div className="glyph" style={{ fontSize: 42, color: 'var(--ink-4)' }}>◦</div>
                <div style={{ marginTop: 10 }}>
                  Pick a workspace thread to start, or create a new one.
                </div>
              </div>
            </div>
          )}
          {activeWsThread && turns.length === 0 && starterFlowId && (
            <div className="testing-empty">
              <div>
                <div className="glyph" style={{ fontSize: 42, color: 'var(--ink-4)' }}>◦</div>
                <div style={{ marginTop: 10 }}>
                  Starter thread for <em>{activeWsThread.title}</em>.
                </div>
                <button
                  className="mode-toggle-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => runFlow(starterFlowId)}
                >
                  Run starter flow
                </button>
              </div>
            </div>
          )}
          {turns.map(turn => (
            <Turn
              key={turn.id}
              turn={turn}
              approvalState={
                turn.kind === 'approval'
                  ? (approvalStates[turn.payload?.batchId] ?? null)
                  : null
              }
              onApprove={handleApprove}
              onReject={handleReject}
              activeArtifact={activeArtifact}
              onOpenArtifact={setActiveArtifact}
              onSuggestion={setComposer}
              onFormAnswer={handleFormAnswer}
            />
          ))}
          <div ref={bottomRef} />
        </div>
        <Composer />
      </main>

      <ResizeHandle onDelta={d => setConvoW(w => Math.max(280, w + d))} />

      <ArtifactPane />

      {tweaksOpen && <DevConfigPanel onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}
