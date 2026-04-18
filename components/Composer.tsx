'use client';

import { useRef, useEffect } from 'react';
import { DEMO_PROMPTS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { runFlow, runLLM } from '@/lib/runtime';
import { matchFlow } from '@/lib/flows';

export function Composer() {
  const composer = useStore(s => s.composer);
  const setComposer = useStore(s => s.setComposer);
  const streaming = useStore(s => s.streaming);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!streaming) ref.current?.focus();
  }, [streaming]);

  const onSubmit = () => {
    const v = composer.trim();
    if (!v || streaming) return;
    const matched = matchFlow(v);
    setComposer('');
    if (matched) {
      runFlow(matched);
    } else {
      runLLM(v);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="composer">
      <div className="composer-shell">
        <textarea
          ref={ref}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Ask the coworker something — e.g. "show me all overdue AP" or "/" for commands`}
          rows={1}
          disabled={streaming}
          style={{ opacity: streaming ? 0.55 : 1 }}
        />
        <div className="composer-actions">
          {DEMO_PROMPTS.slice(0, 4).map(p => (
            <button
              key={p.label}
              className="composer-chip"
              onClick={() => setComposer(p.prompt)}
            >
              {p.label}
            </button>
          ))}
          <div className="composer-spacer" />
          <ProviderIndicator />
          <button className="send-btn" onClick={onSubmit} disabled={streaming}>
            Send <span className="kbd">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderIndicator() {
  const provider = useStore(s => s.tweaks.provider);
  return (
    <div className="composer-mode">
      <span className="dot" /> agent · {provider}
    </div>
  );
}
