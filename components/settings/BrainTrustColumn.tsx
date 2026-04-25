'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SpanRecord } from '@/lib/spanBuffer';

type BrainTrustView = {
  configured: boolean;
  masked: string;
  orgName: string;
  projectName: string;
  enabled: boolean;
};

type Project = { id: string; name: string };

function formatTs(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function tokenCount(n?: number) {
  if (!n) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function BrainTrustColumn() {
  const [btView, setBtView] = useState<BrainTrustView | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [orgInput, setOrgInput] = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [enabledInput, setEnabledInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  const [spans, setSpans] = useState<SpanRecord[]>([]);
  const [selectedSpans, setSelectedSpans] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [loadingSpans, setLoadingSpans] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const bt = data.braintrust as BrainTrustView;
        setBtView(bt);
        setOrgInput(bt?.orgName ?? '');
        setProjectInput(bt?.projectName ?? '');
        setEnabledInput(bt?.enabled ?? false);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadSpans = useCallback(async () => {
    setLoadingSpans(true);
    try {
      const res = await fetch('/api/braintrust?action=spans', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSpans(data.spans ?? []);
    } catch { /* ignore */ }
    finally { setLoadingSpans(false); }
  }, []);

  useEffect(() => {
    loadSpans();
    const id = setInterval(loadSpans, 8000);
    return () => clearInterval(id);
  }, [loadSpans]);

  async function saveBrainTrust() {
    setSaving(true);
    setSaveError(null);
    try {
      const patch: Record<string, unknown> = {
        braintrustOrgName: orgInput,
        braintrustProjectName: projectInput,
        braintrustEnabled: enabledInput,
      };
      if (apiKeyInput.length > 0) patch.braintrustApiKey = apiKeyInput;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setBtView(data.braintrust);
      setApiKeyInput('');
      setSavedAt(Date.now());
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTestStatus('testing');
    setTestError('');
    setProjects([]);
    try {
      const res = await fetch('/api/braintrust?action=test', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('ok');
        setProjects(data.projects ?? []);
      } else {
        setTestStatus('error');
        setTestError(data.error ?? 'Unknown error');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e?.message ?? 'Network error');
    }
  }

  function toggleSpan(id: string) {
    setSelectedSpans(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedSpans(new Set(spans.map(s => s.id)));
  }

  function clearSelection() {
    setSelectedSpans(new Set());
  }

  async function pushSelected() {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/braintrust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          spanIds: selectedSpans.size > 0 ? Array.from(selectedSpans) : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setPushResult(`Pushed ${data.pushed} span${data.pushed === 1 ? '' : 's'} to BrainTrust`);
        setSelectedSpans(new Set());
        loadSpans();
      } else {
        setPushResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setPushResult(`Error: ${e?.message}`);
    } finally {
      setPushing(false);
    }
  }

  async function clearSpans() {
    await fetch('/api/braintrust', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    });
    setSpans([]);
    setSelectedSpans(new Set());
  }

  return (
    <div className="scol-body">
      {/* Configuration */}
      <section className="settings-section">
        <div className="settings-section-head">
          <span>API key</span>
          {btView && (
            <span className={'status-pill' + (btView.configured ? ' ok' : '')}>
              {btView.configured ? btView.masked : 'missing'}
            </span>
          )}
        </div>
        <input
          type="password"
          className="settings-input"
          placeholder={btView?.configured ? '•••• configured' : 'bt_…'}
          value={apiKeyInput}
          onChange={e => setApiKeyInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><span>Organization</span></div>
        <input
          className="settings-input"
          placeholder="my-org"
          value={orgInput}
          onChange={e => setOrgInput(e.target.value)}
          autoComplete="off"
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><span>Project name</span></div>
        <input
          className="settings-input"
          placeholder="coworker-traces"
          value={projectInput}
          onChange={e => setProjectInput(e.target.value)}
          autoComplete="off"
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <span>Logging enabled</span>
          <span className={'status-pill' + (enabledInput ? ' ok' : '')}>{enabledInput ? 'on' : 'off'}</span>
        </div>
        <label className="tweak-toggle" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
          <input type="checkbox" checked={enabledInput} onChange={e => setEnabledInput(e.target.checked)} />
          Log LLM traces to BrainTrust dataset
        </label>
      </section>

      {saveError && <div className="settings-error">{saveError}</div>}

      <div className="settings-footer">
        <button className="settings-save" onClick={saveBrainTrust} disabled={saving}>
          {saving ? 'Saving…' : 'Save BrainTrust'}
        </button>
        <button
          className="settings-save"
          onClick={testConnection}
          disabled={testStatus === 'testing'}
          style={{ marginLeft: 8, background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >
          {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
        {savedAt && !saving && <span className="settings-saved">Saved</span>}
      </div>

      {testStatus === 'ok' && (
        <div className="bt-test-result ok">
          Connected. {projects.length} project{projects.length === 1 ? '' : 's'} found.
          {projects.length > 0 && (
            <ul className="bt-project-list">
              {projects.slice(0, 8).map(p => <li key={p.id}>{p.name}</li>)}
              {projects.length > 8 && <li>+{projects.length - 8} more</li>}
            </ul>
          )}
        </div>
      )}
      {testStatus === 'error' && (
        <div className="bt-test-result error">{testError}</div>
      )}

      {/* Staging area */}
      <div className="bt-staging-header">
        <span className="settings-col-subtitle">Trace staging area</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="settings-link" onClick={loadSpans} disabled={loadingSpans}>
            {loadingSpans ? 'Refreshing…' : 'Refresh'}
          </button>
          {spans.length > 0 && (
            <button className="settings-link" onClick={clearSpans}>Clear all</button>
          )}
        </div>
      </div>
      <div className="settings-help" style={{ marginBottom: 8 }}>
        Select traces from recent conversations to push to your BrainTrust dataset.
      </div>

      {spans.length === 0 && (
        <div className="settings-empty">
          No traces yet. Start a conversation to see spans here.
        </div>
      )}

      {spans.length > 0 && (
        <>
          <div className="bt-span-controls">
            <button className="settings-link" onClick={selectAll}>Select all</button>
            <button className="settings-link" onClick={clearSelection}>Clear</button>
            <span className="bt-span-count">{selectedSpans.size} selected</span>
          </div>

          <div className="bt-span-list">
            {spans.map(span => (
              <div
                key={span.id}
                className={'bt-span-row' + (selectedSpans.has(span.id) ? ' selected' : '') + (span.pushedToBraintrust ? ' pushed' : '')}
                onClick={() => toggleSpan(span.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedSpans.has(span.id)}
                  onChange={() => toggleSpan(span.id)}
                  onClick={e => e.stopPropagation()}
                  className="bt-span-check"
                />
                <div className="bt-span-body">
                  <div className="bt-span-model">
                    <span className="bt-span-model-name">{span.model}</span>
                    <span className="bt-span-ts">{formatTs(span.timestamp)}</span>
                    {span.pushedToBraintrust && <span className="bt-span-pushed">pushed</span>}
                  </div>
                  <div className="bt-span-msg">{span.userMessage.slice(0, 120)}{span.userMessage.length > 120 ? '…' : ''}</div>
                  {span.toolCalls.length > 0 && (
                    <div className="bt-span-tools">
                      {span.toolCalls.slice(0, 4).map((tc, i) => (
                        <span key={i} className="bt-tool-chip">{tc.name}</span>
                      ))}
                      {span.toolCalls.length > 4 && <span className="bt-tool-chip">+{span.toolCalls.length - 4}</span>}
                    </div>
                  )}
                  <div className="bt-span-meta">
                    in {tokenCount(span.inputTokens)} / out {tokenCount(span.outputTokens)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pushResult && (
            <div className={'settings-' + (pushResult.startsWith('Error') ? 'error' : 'saved')} style={{ marginTop: 8 }}>
              {pushResult}
            </div>
          )}

          <div className="settings-footer" style={{ marginTop: 12 }}>
            <button
              className="settings-save"
              onClick={pushSelected}
              disabled={pushing || (selectedSpans.size === 0)}
            >
              {pushing ? 'Pushing…' : selectedSpans.size > 0 ? `Push ${selectedSpans.size} to BrainTrust` : 'Push all to BrainTrust'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
