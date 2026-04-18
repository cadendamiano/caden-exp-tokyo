export function Net15RuleArtifact() {
  return (
    <div>
      <div className="artifact-title">
        <h2>Automation rule</h2>
      </div>
      <div className="artifact-subtitle">
        <span>draft</span>
        <span className="sep">·</span>
        <span>trigger: bill.created</span>
        <span className="sep">·</span>
        <span>runs in BILL Coworker</span>
      </div>
      <div className="rule-card">
        <div className="rule-name">
          <h3>Flag large Net-15 bills for review</h3>
          <span className="status-pill"><span className="dot" />draft</span>
        </div>
        <div className="rule-desc">
          Catch bills that will need urgent attention before they age — surface them to the AP team immediately.
        </div>

        <div className="rule-block">
          <div className="rule-block-label">When</div>
          <div>
            <div className="rule-condition">
              <span className="rule-token k">bill.event</span>
              <span className="rule-token op">is</span>
              <span className="rule-token v">created</span>
            </div>
            <div className="rule-condition">
              <span className="rule-token k">bill.paymentTerms</span>
              <span className="rule-token op">==</span>
              <span className="rule-token v">&quot;Net 15&quot;</span>
            </div>
            <div className="rule-condition">
              <span className="rule-token k">bill.amount</span>
              <span className="rule-token op">&gt;</span>
              <span className="rule-token v">$5,000</span>
            </div>
          </div>
        </div>

        <div className="rule-block">
          <div className="rule-block-label">Then</div>
          <div>
            <div className="rule-action">
              <span className="rule-token k">BILL · Bill.setCustomField</span>
              <span className="rule-token op">→</span>
              <span className="rule-token v">reviewFlag = &quot;urgent_net15&quot;</span>
            </div>
            <div className="rule-action">
              <span className="rule-token k">Slack · message</span>
              <span className="rule-token op">→</span>
              <span className="rule-token v">#ap</span>
              <span className="rule-token op">with</span>
              <span className="rule-token v">&quot;🔔 {'{{'}vendor.name{'}}'} – {'{{'}amount{'}}'} · Net 15 · due {'{{'}dueDate{'}}'}&quot;</span>
            </div>
            <div className="rule-action">
              <span className="rule-token k">BILL · Bill.addApprover</span>
              <span className="rule-token op">=</span>
              <span className="rule-token v">Riya Shah (Controller)</span>
            </div>
          </div>
        </div>

        <div className="rule-block">
          <div className="rule-block-label">Safety</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            · Dry-run before enabling (last 30d: <strong style={{ color: 'var(--ink)' }}>4 would have matched</strong>)<br />
            · Rate-limit: max 25 triggers/day<br />
            · Pause rule if &gt;5 errors in 1h
          </div>
        </div>

        <div className="rule-actions">
          <button className="btn btn-primary">Turn on rule</button>
          <button className="btn btn-ghost">Run dry-run (30d)</button>
          <button className="btn btn-ghost">Edit as code</button>
        </div>
      </div>
    </div>
  );
}
