'use client';

import { ToolRow } from './primitives/ToolRow';
import { ApprovalCard } from './primitives/ApprovalCard';
import { Icon } from './primitives/Icon';
import { Markdown } from './primitives/Markdown';
import { ArtifactThumb } from './ArtifactThumb';
import type { Turn as TurnType } from '@/lib/turns';
import type { ApprovalState } from '@/lib/store';

type Props = {
  turn: TurnType;
  approvalState: ApprovalState | null;
  onApprove: (batchId: string) => void;
  onReject: (batchId: string) => void;
  activeArtifact: string | null;
  onOpenArtifact: (id: string) => void;
  onSuggestion: (text: string) => void;
};

export function Turn({
  turn,
  approvalState,
  onApprove,
  onReject,
  activeArtifact,
  onOpenArtifact,
  onSuggestion,
}: Props) {
  if (turn.kind === 'user') {
    return (
      <div className="msg user fade-in">
        <span className="msg-gutter user">›</span>
        <div className="msg-body">
          <span className="prompt-prefix">you</span>
          {turn.text}
        </div>
      </div>
    );
  }

  if (turn.kind === 'agent') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent">⏵</span>
        <div className="msg-body">
          <Markdown text={turn.text} />
          {turn.streaming && <span className="caret" />}
        </div>
      </div>
    );
  }

  if (turn.kind === 'tools') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent" style={{ color: 'var(--ink-4)' }}>∙</span>
        <div className="msg-body">
          <div className="tool-call">
            {turn.rows.map((r, i) => <ToolRow key={i} row={r} />)}
            {turn.pending != null && turn.pending > 0 && (
              <div className="tool-row" style={{ color: 'var(--ink-4)' }}>
                <span className="glyph"><Icon.Spinner /></span>
                <span className="endpoint"><span className="path">resolving…</span></span>
                <span className="result">{turn.pending} pending</span>
              </div>
            )}
          </div>
          <div className="tool-summary">
            {turn.rows.length} tool call{turn.rows.length === 1 ? '' : 's'} to BILL API · all succeeded
          </div>
        </div>
      </div>
    );
  }

  if (turn.kind === 'approval') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent" style={{ color: 'oklch(0.70 0.13 70)' }}>!</span>
        <div className="msg-body" style={{ minWidth: 0 }}>
          <ApprovalCard
            payload={turn.payload}
            state={approvalState}
            simulated={turn.simulated ?? false}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      </div>
    );
  }

  if (turn.kind === 'libs') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent" style={{ color: 'var(--ink-4)' }}>∙</span>
        <div className="msg-body">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            loaded libraries
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {turn.items.map((lib, i) => (
              <span key={i} className="library-pull">
                <span className="pkg">{lib.pkg}</span>
                <span className="ver">@{lib.ver}</span>
                <span className="status">✓</span>
              </span>
            ))}
            {turn.items.length < turn.total && (
              <span className="library-pull" style={{ color: 'var(--ink-4)' }}>
                <Icon.Spinner /> <span>resolving…</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (turn.kind === 'building') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent">⏵</span>
        <div className="msg-body">
          <div className="artifact-building">
            <div className="skel" />
            <div>
              <div className="title">
                Building artifact ·{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--ink-2)' }}>{turn.label}</em>
              </div>
              <div style={{ color: 'var(--ink-4)', marginTop: 2 }}>
                {turn.sub}<span className="caret" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (turn.kind === 'artifact-card') {
    const isActive = activeArtifact === turn.artifactId;
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent">⏵</span>
        <div className="msg-body">
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
            Artifact ready.
          </div>
          <div
            className={'artifact-card' + (isActive ? ' active' : '')}
            onClick={() => onOpenArtifact(turn.artifactId)}
            role="button"
          >
            <div className="artifact-card-hero">
              <div className="artifact-card-kind">
                <span className="dot" />{turn.sub}
              </div>
              <div className="artifact-card-right-pill">{turn.icon ?? '◫'}</div>
              <ArtifactThumb kind={turn.artifactId} />
            </div>
            <div className="artifact-card-body">
              <div className="artifact-card-title">{turn.title}</div>
              <div className="artifact-card-meta"><Markdown text={turn.meta} /></div>
            </div>
            <div className="artifact-card-foot">
              <span className="source">
                <span className="src-dot" />source: BILL workspace
              </span>
              <span className="spacer" />
              <span className="cta">View <Icon.Arrow /></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (turn.kind === 'suggest') {
    return (
      <div className="msg agent fade-in">
        <span className="msg-gutter agent" style={{ color: 'var(--ink-4)' }}>↳</span>
        <div className="msg-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {turn.items.map(s => (
            <button key={s} className="composer-chip" onClick={() => onSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
