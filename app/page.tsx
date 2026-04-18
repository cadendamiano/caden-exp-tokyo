'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { handleApprove, handleReject } from '@/lib/runtime';
import { TopBar } from '@/components/TopBar';
import { Rail } from '@/components/Rail';
import { Composer } from '@/components/Composer';
import { Turn } from '@/components/Turn';
import { ArtifactPane } from '@/components/ArtifactPane';
import { TweaksPanel } from '@/components/TweaksPanel';
import { SettingsPanel } from '@/components/SettingsPanel';

export default function Page() {
  const turns = useStore(s => s.turns);
  const activeArtifact = useStore(s => s.activeArtifact);
  const setActiveArtifact = useStore(s => s.setActiveArtifact);
  const setComposer = useStore(s => s.setComposer);
  const approvalStates = useStore(s => s.approvalStates);
  const accentHue = useStore(s => s.tweaks.accentHue);
  const reset = useStore(s => s.reset);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        reset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reset]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  return (
    <div className="app">
      <TopBar onOpenTweaks={() => setTweaksOpen(v => !v)} />

      <Rail onNewSession={reset} onOpenSettings={() => setSettingsOpen(v => !v)} />

      <main className="convo">
        <div className="convo-stream">
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
            />
          ))}
          <div ref={bottomRef} />
        </div>
        <Composer />
      </main>

      <ArtifactPane />

      {tweaksOpen && <TweaksPanel onClose={() => setTweaksOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
