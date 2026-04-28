// Pre-baked dataJson payloads for the demo flows that produce
// document and slides artifacts. Kept here so flows.ts doesn't bloat
// further with content strings.

import type { DocumentData } from './documentData';
import type { SlidesData } from './slidesData';

const Q1_DOC: DocumentData = {
  title: 'Q1 2026 AP Report — CFO Summary',
  subtitle: '87 paid bills · Jan 1 – Mar 31 · 41 vendors · 6 categories',
  sections: [
    {
      heading: 'Executive Summary',
      paragraphs: [
        'Q1 2026 total accounts payable spend was $112,340 across 87 paid invoices from 41 active vendors. Professional services drove the largest share at 36% ($40.5k), followed by Software/SaaS at 22% ($24.7k).',
        'Overdue exposure declined 18% quarter-over-quarter, with only 3 invoices currently past due totaling $5,683.',
      ],
      bullets: [
        'Total Spend: $112.3k',
        'Bills Paid: 87',
        'Overdue Count: 3',
        'Active Vendors: 41',
        'Average Invoice: $1,291',
        'Overdue Exposure: $5.7k',
      ],
    },
    {
      heading: 'Vendor Breakdown — Top 5',
      bullets: [
        'Crestline Legal LLP — Professional — $28,500 (25.4%)',
        'Clearwater SaaS Inc — Software — $18,240 (16.2%)',
        'Parkline Staffing — Staffing — $14,800 (13.2%)',
        'Fulton & Hart Consulting — Professional — $12,000 (10.7%)',
        'Northwind Logistics — Logistics — $9,420 (8.4%)',
      ],
    },
    {
      heading: 'AP Aging',
      bullets: [
        'Current — $42,180 — 6 bills — 55% of open',
        '1–30 days — $28,640 — 5 bills — 37% of open',
        '31–60 days — $3,870 — 2 bills — 5% of open',
        '60+ days — $1,813 — 1 bill — 2% of open',
      ],
    },
    {
      paragraphs: [
        'Data sourced from BILL API · Bills, Vendors, Categories · Q1 2026 (Jan 1 – Mar 31).',
      ],
    },
  ],
};

const Q1_DOC_LOGISTICS: DocumentData = {
  title: 'Q1 2026 AP Report — Crestview Freight CFO Summary',
  subtitle: '112 paid bills · Jan 1 – Mar 31 · 18 vendors · 6 categories',
  sections: [
    {
      heading: 'Executive Summary',
      paragraphs: [
        'Q1 2026 total accounts payable spend was $406k across 112 paid invoices from 18 active vendors. Freight/Carriers drove the largest share at 35% ($142k), followed by Staffing/Labor at 22% ($88k).',
      ],
      bullets: [
        'Total Spend: $406k',
        'Bills Paid: 112',
        'Active Vendors: 18',
        'Top Category: Freight/Carriers ($142k, 35%)',
      ],
    },
    {
      heading: 'Vendor Breakdown — Top 5',
      bullets: [
        'Apex Carrier Network — Freight — $86k',
        'SkyLink Air Freight — Air freight — $58k',
        'MidWest Fuel Card Services — Fuel — $42k',
        'Pinnacle Staffing — Labor — $34k',
        'Harbor Customs Brokers — Customs — $22k',
      ],
    },
  ],
};

export const Q1_DOC_JSON = JSON.stringify(Q1_DOC);
export const Q1_DOC_LOGISTICS_JSON = JSON.stringify(Q1_DOC_LOGISTICS);

const SLIDES_DEMO: SlidesData = {
  title: 'BILL Coworker — Demo Deck',
  slides: [
    {
      title: 'BILL Coworker',
      layout: 'title',
      body: 'AI-native AP for finance teams — Q1 2026',
    },
    {
      title: 'What changed this quarter',
      layout: 'bullets',
      bullets: [
        '87 paid bills · $112.3k total spend',
        'Overdue exposure down 18% QoQ',
        '3 overdue invoices · $5.7k combined',
      ],
    },
    {
      title: 'Top spend categories',
      layout: 'bullets',
      bullets: [
        'Professional Services — 36% ($40.5k)',
        'Software/SaaS — 22% ($24.7k)',
        'Staffing — 14% ($15.8k)',
      ],
    },
    {
      title: 'Next quarter focus',
      layout: 'bullets',
      bullets: [
        'Auto-flag Net-15 invoices > $5k',
        'Tighten approval policy on large vendors',
        'Stand up cash sweep rule for Ops Checking',
      ],
    },
  ],
};

export const SLIDES_DEMO_JSON = JSON.stringify(SLIDES_DEMO);
