'use client';

import { CONNECTORS, SESSIONS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { runFlow } from '@/lib/runtime';
import { Icon } from './primitives/Icon';

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
  const showConnectors = useStore(s => s.tweaks.showConnectors);

  return (
    <aside className="rail">
      <div className="rail-top">
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
