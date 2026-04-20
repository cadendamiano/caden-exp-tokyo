export function DocumentArtifact() {
  return (
    <div className="doc-artifact">
      <div className="artifact-title">
        <h2>Q1 2026 AP Report · CFO Summary</h2>
      </div>
      <div className="artifact-subtitle">
        <span>generated 16:44</span>
        <span className="sep">·</span>
        <span>87 paid bills · Jan 1 – Mar 31</span>
        <span className="sep">·</span>
        <span>41 vendors · 6 categories</span>
      </div>

      {/* Executive Summary */}
      <div className="doc-section">
        <h3>Executive Summary</h3>
        <p>
          Q1 2026 total accounts payable spend was <strong>$112,340</strong> across 87 paid invoices
          from 41 active vendors. Professional services drove the largest share at 36% ($40.5k),
          followed by Software/SaaS at 22% ($24.7k). Overdue exposure declined 18% quarter-over-quarter,
          with only 3 invoices currently past due totaling $5,683.
        </p>
        <div className="doc-kpi-row">
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Total Spend</span>
            <span className="doc-kpi-value">$112.3k</span>
          </div>
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Bills Paid</span>
            <span className="doc-kpi-value">87</span>
          </div>
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Overdue Count</span>
            <span className="doc-kpi-value">3</span>
          </div>
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Active Vendors</span>
            <span className="doc-kpi-value">41</span>
          </div>
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Avg Invoice</span>
            <span className="doc-kpi-value">$1,291</span>
          </div>
          <div className="doc-kpi-chip">
            <span className="doc-kpi-label">Overdue Exposure</span>
            <span className="doc-kpi-value">$5.7k</span>
          </div>
        </div>
      </div>

      {/* Vendor Breakdown */}
      <div className="doc-section">
        <h3>Vendor Breakdown · Top 5</h3>
        <table className="doc-vendor-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Category</th>
              <th>Q1 Spend</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Crestline Legal LLP</td>
              <td>Professional</td>
              <td>$28,500</td>
              <td>25.4%</td>
            </tr>
            <tr>
              <td>Clearwater SaaS Inc</td>
              <td>Software</td>
              <td>$18,240</td>
              <td>16.2%</td>
            </tr>
            <tr>
              <td>Parkline Staffing</td>
              <td>Staffing</td>
              <td>$14,800</td>
              <td>13.2%</td>
            </tr>
            <tr>
              <td>Fulton & Hart Consulting</td>
              <td>Professional</td>
              <td>$12,000</td>
              <td>10.7%</td>
            </tr>
            <tr>
              <td>Northwind Logistics</td>
              <td>Logistics</td>
              <td>$9,420</td>
              <td>8.4%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AP Aging */}
      <div className="doc-section">
        <h3>AP Aging</h3>
        <table className="doc-vendor-table">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Amount</th>
              <th>Bills</th>
              <th>% of Open</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Current</td>
              <td>$42,180</td>
              <td>6</td>
              <td>55%</td>
            </tr>
            <tr>
              <td>1–30 days</td>
              <td>$28,640</td>
              <td>5</td>
              <td>37%</td>
            </tr>
            <tr>
              <td>31–60 days</td>
              <td>$3,870</td>
              <td>2</td>
              <td>5%</td>
            </tr>
            <tr>
              <td>60+ days</td>
              <td>$1,813</td>
              <td>1</td>
              <td>2%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="doc-footer">
        Data sourced from BILL API · Bills, Vendors, Categories · Q1 2026 (Jan 1 – Mar 31)
      </div>
    </div>
  );
}
