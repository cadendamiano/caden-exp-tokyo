'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { handleApprove, handleReject, handleFormAnswer } from '@/lib/runtime';
import { TopBar } from '@/components/TopBar';
import { Rail } from '@/components/Rail';
import { Composer } from '@/components/Composer';
import { Turn } from '@/components/Turn';
import { ArtifactPane } from '@/components/ArtifactPane';
import { ResizeHandle } from '@/components/ResizeHandle';
import { DevConfigPanel } from '@/components/DevConfigPanel';

export default function Page() {
  const mode = useStore(s => s.mode);
  const demoTurns = useStore(s => s.turns);
  const testingThreads = useStore(s => s.testingThreads);
  const activeTestingThreadId = useStore(s => s.activeTestingThreadId);
  const activeArtifact = useStore(s => s.activeArtifact);
  const setActiveArtifact = useStore(s => s.setActiveArtifact);
  const setComposer = useStore(s => s.setComposer);
  const demoApprovals = useStore(s => s.approvalStates);
  const accentHue = useStore(s => s.tweaks.accentHue);
  const reset = useStore(s => s.reset);
  const newThread = useStore(s => s.newThread);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [railW, setRailW] = useState(240);
  const [convoW, setConvoW] = useState(480);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(
    () => testingThreads.find(t => t.id === activeTestingThreadId),
    [testingThreads, activeTestingThreadId]
  );

  const turns = mode === 'testing' ? (activeThread?.turns ?? []) : demoTurns;
  const approvalStates =
    mode === 'testing' ? (activeThread?.approvalStates ?? {}) : demoApprovals;

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
        if (mode === 'testing') {
          newThread();
        } else {
          reset();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reset, mode, newThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  return (
    <div className="app" style={{ '--rail-w': railW + 'px', '--convo-w': convoW + 'px' } as React.CSSProperties}>
      <TopBar />

      <Rail
        onNewSession={mode === 'testing' ? () => newThread() : reset}
      />

      <ResizeHandle onDelta={d => setRailW(w => Math.max(160, w + d))} />

      <main className="convo">
        <div className="convo-stream">
          {mode === 'testing' && !activeThread && (
            <div className="testing-empty">
              <div>
                <div className="glyph" style={{ fontSize: 42, color: 'var(--ink-4)' }}>◦</div>
                <div style={{ marginTop: 10 }}>
                  Create a thread in the Rail to start testing against a real Bill sandbox.
                </div>
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
