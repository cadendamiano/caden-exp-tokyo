export function ArtifactThumb({ kind }: { kind: string }) {
  if (kind === 'art_spend_chart') {
    return (
      <svg viewBox="0 0 110 70" width="180" height="110">
        <circle cx="36" cy="35" r="22" fill="none" stroke="var(--teal)" strokeWidth="7" />
        <circle cx="36" cy="35" r="22" fill="none" stroke="var(--teal-ink)" strokeWidth="7" strokeDasharray="45 180" strokeDashoffset="-20" />
        <rect x="72" y="42" width="7" height="18" fill="var(--teal)" rx="1" />
        <rect x="82" y="32" width="7" height="28" fill="var(--teal-ink)" rx="1" />
        <rect x="92" y="22" width="7" height="38" fill="var(--teal)" rx="1" />
      </svg>
    );
  }
  if (kind === 'art_ap_all') {
    return (
      <svg viewBox="0 0 110 70" width="200" height="120">
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i}>
            <rect x="8" y={10 + i * 11} width="8" height="6" rx="1" fill={i < 2 ? 'var(--teal)' : 'var(--line)'} />
            <rect x="22" y={11 + i * 11} width="44" height="4" rx="1" fill="var(--ink-4)" opacity="0.4" />
            <rect x="72" y={11 + i * 11} width="28" height="4" rx="1" fill="var(--ink-2)" opacity="0.55" />
          </g>
        ))}
      </svg>
    );
  }
  if (kind === 'art_rule_net15') {
    const rows = [
      { label: 'GIVEN', op: '\u2192' },
      { label: 'WHEN',  op: '\u2192' },
      { label: 'THEN',  op: '=' },
    ];
    return (
      <div className="rule-chip-stack">
        {rows.map(({ label, op }) => (
          <div key={label} className="rule-chip-row">
            <span className="rule-chip-label">{label}</span>
            <span className="rule-chip-op">{op}</span>
            <span className="rule-chip-value" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'art_crm_flow') {
    return (
      <svg viewBox="0 0 110 70" width="200" height="120">
        <rect x="6" y="26" width="32" height="18" rx="3" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1" />
        <path d="M40 35 L68 35" stroke="var(--teal)" strokeWidth="1.2" />
        <path d="M64 32 L68 35 L64 38" stroke="var(--teal)" strokeWidth="1.2" fill="none" />
        <rect x="70" y="26" width="34" height="18" rx="3" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1" />
      </svg>
    );
  }
  return <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 11 }}>preview</span>;
}
