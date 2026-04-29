'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { MODELS } from '@/lib/models';
import { DEMO_SANDBOX_ENV_ID } from '@/lib/tools';
import { Icon } from './primitives/Icon';
import { CredentialsColumn } from './settings/CredentialsColumn';
import { BrainTrustColumn } from './settings/BrainTrustColumn';
import { ToolsColumn } from './settings/ToolsColumn';
import { UsageSparkline } from './settings/UsageSparkline';

type EnvView = {
  id: string;
  name: string;
  product: 'ap' | 'se' | 'both';
};

type Tab = 'configuration' | 'observability' | 'tools';

const HUES = [195, 170, 215, 245, 25, 145];

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'configuration', label: 'Configuration', icon: '⚙' },
  { id: 'observability', label: 'AI Observability', icon: '◎' },
  { id: 'tools', label: 'Prompts & Tools', icon: '⬡' },
];

function SandboxDefaultSection() {
  const tweaks = useStore(s => s.tweaks);
  const set = useStore(s => s.setTweak);
  const [envs, setEnvs] = useState<EnvView[] | null>(null);

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

  const isDemo = tweaks.defaultBillEnvId === DEMO_SANDBOX_ENV_ID;
  const selected = tweaks.defaultBillEnvId ?? '';
  const missing =
    !!tweaks.defaultBillEnvId &&
    !isDemo &&
    envs !== null &&
    !envs.some(e => e.id === tweaks.defaultBillEnvId);

  return (
    <section className="settings-section">
      <span className="settings-col-subtitle">Default Sandbox</span>
      <div className="tweak-row">
        <label>Sandbox</label>
        <select
          value={selected}
          onChange={(e) => {
            const next = e.target.value || undefined;
            set('defaultBillEnvId', next);
            if (next === DEMO_SANDBOX_ENV_ID) {
              set('defaultBillProduct', 'ap');
            }
          }}
        >
          <option value="">— none —</option>
          <option value={DEMO_SANDBOX_ENV_ID}>Demo Sandbox · fake data</option>
          {(envs ?? []).map(env => (
            <option key={env.id} value={env.id}>
              {env.name} · {env.product}
            </option>
          ))}
        </select>
      </div>
      {!isDemo && tweaks.defaultBillEnvId && (
        <div className="tweak-row">
          <label>Product</label>
          <div className="rail-product-toggle">
            {(['ap', 'se'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={
                  'rail-product-btn' +
                  (tweaks.defaultBillProduct === p ? ' active' : '')
                }
                onClick={() => set('defaultBillProduct', p)}
              >
                {p === 'ap' ? 'AP' : 'S&E'}
              </button>
            ))}
          </div>
        </div>
      )}
      {missing && (
        <div className="rail-empty" style={{ marginTop: 8 }}>
          The previously selected sandbox is no longer configured. Pick another or clear the default.
        </div>
      )}
    </section>
  );
}

function TweaksSection() {
  const tweaks = useStore(s => s.tweaks);
  const set = useStore(s => s.setTweak);
  const mode = useStore(s => s.mode);

  return (
    <div className="scol-body">
      {mode === 'testing' && <SandboxDefaultSection />}
      <section className="settings-section">
        <span className="settings-col-subtitle">App Tweaks</span>
        <div className="tweak-row">
          <label>Model</label>
          <select
            value={tweaks.modelId}
            onChange={(e) => set('modelId', e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.sub}
              </option>
            ))}
          </select>
        </div>
        <div className="tweak-row">
          <label>Accent <code>{tweaks.accentHue}°</code></label>
          <div className="tweak-swatches">
            {HUES.map(h => (
              <div
                key={h}
                className={'tweak-swatch' + (tweaks.accentHue === h ? ' sel' : '')}
                style={{ background: `oklch(0.62 0.10 ${h})` }}
                onClick={() => set('accentHue', h)}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Density</label>
          <select
            value={tweaks.density}
            onChange={(e) => set('density', e.target.value as 'comfortable' | 'compact')}
          >
            <option value="comfortable">comfortable</option>
            <option value="compact">compact</option>
          </select>
        </div>
        <div className="tweak-row">
          <label>Stream speed</label>
          <select
            value={tweaks.streamSpeed}
            onChange={(e) => set('streamSpeed', e.target.value as 'fast' | 'normal' | 'slow')}
          >
            <option value="fast">fast (demo)</option>
            <option value="normal">normal</option>
            <option value="slow">slow (teaching)</option>
          </select>
        </div>
        <label className="tweak-toggle">
          <input
            type="checkbox"
            checked={tweaks.showConnectors}
            onChange={(e) => set('showConnectors', e.target.checked)}
          />
          Show connectors in sidebar
        </label>
        <label className="tweak-toggle">
          <input
            type="checkbox"
            checked={tweaks.showCodeView}
            onChange={(e) => set('showCodeView', e.target.checked)}
          />
          Sidebar code review
        </label>
      </section>
    </div>
  );
}

export function DevConfigPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('configuration');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="dev-panel-overlay" role="dialog" aria-label="Dev Config">
      <div className="dev-panel">
        <nav className="dev-panel-nav">
          <div className="dev-panel-nav-header">
            <span>Dev Config</span>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon.Close />
            </button>
          </div>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={'dev-panel-tab' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              <span className="dev-panel-tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="dev-panel-content">
          {tab === 'configuration' && (
            <div className="dev-config-columns">
              <div className="scol-body">
                <CredentialsColumn />
              </div>
              <TweaksSection />
            </div>
          )}
          {tab === 'observability' && (
            <div className="scol-body">
              <UsageSparkline />
              <BrainTrustColumn />
            </div>
          )}
          {tab === 'tools' && <ToolsColumn />}
        </div>
      </div>
    </div>
  );
}
