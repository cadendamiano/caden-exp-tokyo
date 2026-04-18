import { useStore } from '@/lib/store';
import type { Artifact } from '@/lib/store';

const MAPS = [
  { src: 'bill.paymentStatus',   dst: 'deal.dealstage',      xf: 'map: "0" → "Paid"' },
  { src: 'payment.amount',       dst: 'deal.amount',         xf: 'copy' },
  { src: 'payment.processDate',  dst: 'deal.closedate',      xf: 'format: ISO-8601' },
  { src: 'vendor.name',          dst: 'deal.description',    xf: 'append: "Paid via BILL"' },
  { src: 'payment.confirmation', dst: 'deal.bill_payment_id',xf: 'copy' },
];

type Props = { artifact: Artifact };

export function CRMFlowArtifact({ artifact }: Props) {
  const activateArtifact = useStore(s => s.activateArtifact);
  const isActive = artifact.status === 'active';
  const canActivate = Boolean(artifact.dryRunAcknowledged);

  return (
    <div>
      <div className="artifact-title">
        <h2>Flow · Payment → HubSpot deal</h2>
      </div>
      <div className="artifact-subtitle">
        <span>tested on 20 events</span>
        <span className="sep">·</span>
        <span>18 matched</span>
        <span className="sep">·</span>
        <span>bidirectional: no</span>
      </div>
      <div className="flow-card">
        <div className="rule-name"><h3>When a BILL payment clears, mark the HubSpot deal Paid</h3></div>
        <div className="rule-desc">A transform that joins cleared payments to CRM deals by invoice number.</div>
        <div className="flow-row">
          <div className="flow-node">
            <div className="node-label">Trigger</div>
            <div className="node-title">BILL · payment.cleared</div>
            <div className="node-meta">webhook · real-time<br />payload: Payment, Bill, Vendor</div>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">
            <div className="node-label">Match</div>
            <div className="node-title">HubSpot Deal</div>
            <div className="node-meta">key: deal.properties.bill_invoice_id<br />== bill.invoiceNumber</div>
          </div>
        </div>

        <div className="field-map">
          {MAPS.map((r, i) => (
            <div key={i} className="field-map-row">
              <span className="src">{r.src}</span>
              <span className="arrow">→</span>
              <span className="dst">
                {r.dst}
                <span className="transform"> · {r.xf}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="rule-actions">
          {isActive ? (
            <span className="status-pill active" style={{ fontSize: 12 }}>
              <span className="dot" style={{ background: 'var(--pos)' }} />Flow active
            </span>
          ) : (
            <>
              <div
                title={canActivate ? undefined : 'View Preview first to activate'}
                style={{ display: 'inline-block' }}
              >
                <button
                  className="btn btn-primary"
                  disabled={!canActivate}
                  style={!canActivate ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  onClick={() => canActivate && activateArtifact(artifact.id)}
                >
                  Turn on (new events)
                </button>
              </div>
              {!canActivate && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginLeft: 8 }}>
                  View Preview first
                </span>
              )}
              <button className="btn btn-ghost" disabled={!canActivate}
                style={!canActivate ? { opacity: 0.4 } : undefined}
              >
                Turn on + backfill 18
              </button>
              <button className="btn btn-ghost">View 2 unmatched</button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="chart-head" style={{ marginBottom: 8 }}>
          <h3>Generated transform · view as code</h3>
          <div className="legend"><span style={{ color: 'var(--ink-4)' }}>editable</span></div>
        </div>
        <div className="code-block">
          <div><span className="c">// BILL Coworker · auto-generated transform</span></div>
          <div><span className="k">on</span>(<span className="s">&quot;bill.payment.cleared&quot;</span>, <span className="k">async</span> (evt) =&gt; {'{'}</div>
          <div>&nbsp;&nbsp;<span className="k">const</span> deal = <span className="k">await</span> hubspot.deals.findByProperty(</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="s">&quot;bill_invoice_id&quot;</span>, evt.bill.invoiceNumber</div>
          <div>&nbsp;&nbsp;);</div>
          <div>&nbsp;&nbsp;<span className="k">if</span> (!deal) <span className="k">return</span> log.warn(<span className="s">&quot;unmatched&quot;</span>, evt.bill.id);</div>
          <div>&nbsp;&nbsp;<span className="k">await</span> hubspot.deals.update(deal.id, {'{'}</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;dealstage: <span className="s">&quot;Paid&quot;</span>,</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;amount: evt.payment.amount,</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;closedate: evt.payment.processDate,</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;bill_payment_id: evt.payment.confirmation,</div>
          <div>&nbsp;&nbsp;{'}'});</div>
          <div>{'}'});</div>
        </div>
      </div>
    </div>
  );
}
