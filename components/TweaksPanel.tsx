'use client';

import { useStore } from '@/lib/store';
import { MODELS } from '@/lib/models';
import { Icon } from './primitives/Icon';

const HUES = [195, 170, 215, 245, 25, 145];

export function TweaksPanel({ onClose }: { onClose: () => void }) {
  const tweaks = useStore(s => s.tweaks);
  const set = useStore(s => s.setTweak);

  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <button className="icon-btn" onClick={onClose}><Icon.Close /></button>
      </div>
      <div className="tweaks-body">
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
      </div>
    </div>
  );
}
