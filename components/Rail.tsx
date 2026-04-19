'use client';

import { useEffect, useState } from 'react';
import { CONNECTORS, SESSIONS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { runFlow } from '@/lib/runtime';
import { Icon } from './primitives/Icon';

const DEMO_SANDBOX_ENV_ID = '__demo_sandbox__';

const SESSION_MAP: Record<string, string> = {
  s1: 'pay_batch',
  s2: 'chart_spend',
  s3: 'automate_net15',
  s4: 'dupe_sweep',
  s5: 'chart_spend',
};

type Props = {
  onNewSession: () => void;
  onOpenSettings: () => void;
};

export function Rail({ onNewSession, onOpenSettings }: Props) {
  const mode = useStore(s => s.mode);

  return (
    <aside className="rail">
      <div className="rail-top">
        {mode === 'demo' ? (
          <DemoRailBody onNewSession={onNewSession} />
        ) : (
          <TestingRailBody />
        )}
      </div>

      <div className="rail-footer">
        <button className="rail-settings" onClick={onOpenSettings} type="button">
          <span className="rail-settings-icon"><Icon.Gear /></span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

function DemoRailBody({ onNewSession }: { onNewSession: () => void }) {
  const showConnectors = useStore(s => s.tweaks.showConnectors);
  return (
    <>
      <div className="new-session" onClick={onNewSession} style={{ cursor: 'pointer' }}>
        <span>New session</span>
        <span className="kbd">⌘N</span>
      </div>

      <div>
        <div className="rail-section-label">Recent</div>
        {SESSIONS.map(s => (
          <div
            key={s.id}
            className="rail-item"
            onClick={() => {
              const f = SESSION_MAP[s.id];
              if (f) runFlow(f);
            }}
          >
            <span className="rail-item-glyph">{s.glyph}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="rail-item-title">{s.title}</div>
              <div className="rail-item-meta">{s.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {showConnectors && (
        <div className="rail-mini">
          <div className="rail-section-label">Connected</div>
          {CONNECTORS.map(c => (
            <div key={c.name} className="connector-row">
              <span className={'dot' + (c.status === 'warn' ? ' warn' : '')} />
              <span>{c.name}</span>
              <span className="conn-meta">{c.meta}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

type EnvView = {
  id: string;
  name: string;
  product: 'ap' | 'se' | 'both';
};

function TestingRailBody() {
  const threads = useStore(s => s.testingThreads);
  const activeId = useStore(s => s.activeTestingThreadId);
  const newThread = useStore(s => s.newThread);
  const setActiveThread = useStore(s => s.setActiveThread);
  const deleteThread = useStore(s => s.deleteThread);
  const renameThread = useStore(s => s.renameThread);
  const setThreadBillEnv = useStore(s => s.setThreadBillEnv);

  const [envs, setEnvs] = useState<EnvView[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEnvs(
          (data.billEnvironments ?? []).map((e: any) => ({
            id: e.id,
            name: e.name,
            product: e.product ?? 'ap',
          }))
        );
      } catch {
        if (!cancelled) setEnvs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = threads.find(t => t.id === activeId);

  return (
    <>
      <div
        className="new-session"
        onClick={() => newThread()}
        style={{ cursor: 'pointer' }}
      >
        <span>+ New thread</span>
        <span className="kbd">⌘N</span>
      </div>

      <div>
        <div className="rail-section-label">Threads</div>
        {threads.length === 0 && (
          <div className="rail-empty">No threads yet. Click “+ New thread”.</div>
        )}
        {threads.map(t => {
          const isActive = t.id === activeId;
          const isRenaming = renaming === t.id;
          return (
            <div
              key={t.id}
              className={'rail-item' + (isActive ? ' active' : '')}
              onClick={() => !isRenaming && setActiveThread(t.id)}
              onDoubleClick={e => {
                e.stopPropagation();
                setRenaming(t.id);
                setRenameValue(t.title);
              }}
            >
              <span className="rail-item-glyph">◦</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                {isRenaming ? (
                  <input
                    className="rail-rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => {
                      renameThread(t.id, renameValue.trim());
                      setRenaming(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        renameThread(t.id, renameValue.trim());
                        setRenaming(null);
                      } else if (e.key === 'Escape') {
                        setRenaming(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <div className="rail-item-title">{t.title}</div>
                    <div className="rail-item-meta">
                      {t.turns.length} turn{t.turns.length === 1 ? '' : 's'}
                      {t.billEnvId ? ' · env set' : ' · no env'}
                    </div>
                  </>
                )}
              </div>
              <button
                className="icon-btn rail-item-del"
                aria-label="Delete thread"
                onClick={e => {
                  e.stopPropagation();
                  if (confirm(`Delete thread "${t.title}"?`)) {
                    deleteThread(t.id);
                  }
                }}
              >
                <Icon.Trash />
              </button>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="rail-mini">
          <div className="rail-section-label">Bill env for this thread</div>
          <select
            className="rail-env-select"
            value={active.billEnvId ?? ''}
            onChange={e => {
              const envId = e.target.value || undefined;
              if (envId === DEMO_SANDBOX_ENV_ID) {
                setThreadBillEnv(active.id, envId, 'ap');
              } else {
                setThreadBillEnv(active.id, envId, active.billProduct ?? 'ap');
              }
            }}
          >
            <option value="">— pick an env —</option>
            <option value={DEMO_SANDBOX_ENV_ID}>Demo Sandbox · fake data</option>
            {(envs ?? []).map(env => (
              <option key={env.id} value={env.id}>
                {env.name} · {env.product}
              </option>
            ))}
          </select>
          {active.billEnvId !== DEMO_SANDBOX_ENV_ID && (
            <div className="rail-product-toggle">
              {(['ap', 'se'] as const).map(p => (
                <button
                  key={p}
                  className={
                    'rail-product-btn' +
                    ((active.billProduct ?? 'ap') === p ? ' active' : '')
                  }
                  onClick={() =>
                    setThreadBillEnv(active.id, active.billEnvId, p)
                  }
                >
                  {p === 'ap' ? 'AP' : 'S&E'}
                </button>
              ))}
            </div>
          )}
          {envs && envs.length === 0 && active.billEnvId !== DEMO_SANDBOX_ENV_ID && (
            <div className="rail-empty" style={{ marginTop: 8 }}>
              No real sandbox envs configured. Pick Demo Sandbox above or add one in Settings.
            </div>
          )}
        </div>
      )}
    </>
  );
}
