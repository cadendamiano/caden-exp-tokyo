# BILL Coworker — Demo Scripts

Demo scenarios with exact test prompts, ordered by impact. Each script chains flows via the suggestion chips that appear after each response, or you can re-type the prompts directly.

## Dataset Selection

Switch between datasets in the UI before starting:

| Dataset | Company | AP volume | Best for |
|---------|---------|-----------|----------|
| `default` | Generic tech company | $108.8k, 14 bills | General audiences |
| `logistics` | Crestview Freight Solutions | $217.9k, 22 bills | Supply chain / logistics audiences |

The logistics dataset has more dramatic numbers and industry-specific vendors (SkyLink, Apex Carrier, MidWest Fuel) and is generally the stronger demo choice.

---

## Script A — AP Triage to Payment
**Duration: ~5 min | Audience: AP teams, controllers**

The core arc: surface a problem → inspect it → take action → get human approval.

### Step 1 — Surface overdue AP

**Default:**
```
Show me all overdue AP across every vendor, grouped by urgency.
```

**Logistics:**
```
Show me all overdue AP — carrier, fuel, and customs invoices.
```

What happens: 3 live API calls visible, interactive AP table artifact opens in the right pane. Default shows 14 bills / $108.8k (3 overdue). Logistics shows 13 bills / $217.9k (4 overdue).

### Step 2 — Pay the overdue batch

**Default:**
```
Pay the 3 overdue invoices via ACH from our Ops Checking account.
```

**Logistics:**
```
Pay the overdue fuel and pallet invoices via ACH from our Ops Checking account.
```

What happens: Stages an ACH batch and surfaces the approval card. Demo the Approve / Reject buttons — this is the human-in-the-loop talking point. No payment hits the rails without explicit sign-off.

---

## Script B — Large Payment + Dual Approver
**Duration: ~3 min | Audience: CFOs, controllers, compliance**

Shows that payments above $25k automatically require a second approver — a key internal controls talking point.

**Default:**
```
Pay the Q1 professional services invoices from Crestline Legal and Fulton & Hart.
```
> $40,500 batch — Crestline Legal ($28,500) + Fulton & Hart ($12,000). Routes to Controller.

**Logistics:**
```
Pay the SkyLink Air Freight invoice — it needs a second approver.
```
> $42,600 batch — SkyLink ($28,400) + Apex Carrier ($14,200). Routes to Dana (Controller).

What happens: Approval card shows `requiresSecondApprover: true` and "Pending second approval" scheduled date — the payment is blocked until the controller signs off.

---

## Script C — Cash Runway + Drivers + Sweep Rule
**Duration: ~7 min | Audience: CFOs, treasurers**

The most complete arc: insight → root cause → automated fix. Three flows chain naturally.

### Step 1 — Project the runway

**Default:**
```
What's our cash runway look like?
```
> Ops Checking: $142k today → $48.2k minimum on May 24 (breaches $50k floor).

**Logistics:**
```
What's our cash runway?
```
> Operating Checking: $218k today → $84k minimum on May 20 (only $9k above $75k floor — "close call" framing).

### Step 2 — Drill into the drivers

Click the **"What's driving the dip?"** suggestion chip, or type:

```
What's driving the dip?
```

What happens: Ranks top outflows and inflows, annotates the burndown chart artifact in-place (no new card opened).

**Default drivers:** AWS Infrastructure -$42k (May 2), SaaS renewals -$32.8k (May 24), Bluestone Marketing retainer -$24.8k (Apr 28).

**Logistics drivers:** SkyLink Carriers invoice -$42k (May 7), Payroll top-up 102 FTE -$34k (May 15), Fleet lease 12 units -$24.6k (May 12).

### Step 3 — Draft the sweep rule

**Default:**
```
/liquidity — draft sweep rule for Ops Checking
```
> Auto-sweeps $75k from BILL Cash Reserve ($1.24M balance) when Ops Checking < $50k. Safety: 1/day rate limit, reserve floor $200k.

**Logistics:**
```
/liquidity — draft sweep rule for Operating Checking
```
> Auto-sweeps $100k from Reserve Savings ($890k balance) when Operating < $75k.

---

## Script D — Automation Rule
**Duration: ~3 min | Audience: AP teams, ops**

Demonstrates the rules engine and Slack integration.

```
Create an automation: when a new bill comes in with Net 15 terms and amount > $5k, flag it for review and ping #ap in Slack.
```

What happens: Verifies the `ReviewFlag` custom field and `#ap` Slack channel exist, compiles a rule with 3 conditions and 3 actions, renders the rule artifact, and reports a dry-run match count. Rule stays off until you click "Turn on."

Follow-up prompts (from suggestion chips or direct):
```
Dry-run on last 30 days
```
```
Add approval to action
```
```
Edit conditions
```

---

## Script E — Spend Visualization + CFO Report
**Duration: ~4 min | Audience: executives, board prep**

### Step 1 — Render the spend chart

```
Visualize Q1 spend by vendor category.
```

**Default:** 87 paid bills, $112.3k total, 6 buckets. Top: Professional 36% ($40.5k — Crestline Legal + Fulton & Hart).

**Logistics:** 112 paid bills, $406k total. Top: Freight/Carriers 35% ($142k — Apex + SkyLink). Much more dramatic.

### Step 2 — Generate the CFO one-pager

Click **"Generate CFO one-pager"** or type:
```
Generate a CFO Q1 spend one-pager
```

What happens: Pulls Q1 paid bills + aging summary, renders a document artifact with Executive Summary, Vendor Breakdown (top 5), and AP Aging buckets sections.

---

## Script F — Duplicate Invoice Sweep
**Duration: ~2 min | Audience: AP teams, auditors**

**Default:**
```
Scan the last 60 days of AP for likely duplicate invoices and list them.
```
> Fuzzy-matches 284 bills. Flags BRT-5488 vs BRT-5488-A from Brightline Marketing — two $2,150 invoices 6 days apart (1 high-confidence, 3 needs-review).

**Logistics (more dramatic — deliberate duplicate bait in dataset):**
```
Scan the last 60 days of AP for likely duplicate invoices — check Apex Carrier especially.
```
> 318 bills scanned. Flags ACN-2026-0381 vs ACN-2026-381 (missing leading zero in invoice number), same PO-CF-0799, both $14,200 — a real-world entry error scenario.

---

## Script G — CRM Sync
**Duration: ~2 min | Audience: RevOps, sales-finance bridge**

```
When a payment clears in BILL, update the matching HubSpot deal to "Paid" and sync the amount.
```

What happens: Verifies `bill_invoice_id` property and "Paid" stage exist in HubSpot, maps 5 fields, runs a backfill test against last 20 cleared payments (18/20 matched). The 2 unmatched are surfaced for investigation before activation.

---

## Recommended 15-Minute Live Demo

| Order | Prompt | Capability shown |
|-------|--------|-----------------|
| 1 | `Show me all overdue AP — carrier, fuel, and customs invoices.` | Data retrieval, interactive table artifact, tool call transparency |
| 2 | `Pay the overdue fuel and pallet invoices via ACH...` | Agent action with human approval gate |
| 3 | `Pay the SkyLink Air Freight invoice — it needs a second approver.` | Dual-approver escalation, internal controls |
| 4 | `What's our cash runway?` | Treasury intelligence, burndown chart |
| 5 | `What's driving the dip?` | Root cause drill-down, artifact enrichment |
| 6 | `/liquidity — draft sweep rule for Operating Checking` | Automated remediation, treasury rules |
| 7 | `Create an automation: when a new bill comes in with Net 15 terms and amount > $5k...` | Rules engine, Slack integration |

Use the **logistics dataset** for all steps — bigger numbers, industry-specific context, and the $75k floor near-miss on the runway chart is a better story than the default's actual breach.

---

## Flow Trigger Reference

The demo mode matches prompts to pre-built flows using keyword detection. If a prompt isn't triggering the right flow, use these keywords:

| Flow | Required keywords |
|------|-------------------|
| `ap_overdue` | "overdue" — or — "show" + "ap" |
| `pay_batch` | "pay" + ("3" or "ach" or "overdue") |
| `pay_large` | "pay" + ("crestline" or "fulton" or "skylink" or "large" or "second approver") |
| `runway_projection` | "runway" or "burndown" or "treasury" or "cash runway" |
| `runway_drivers` | "driving" or "driver" or — "why" + "dip" |
| `automate_net15` | "automation" or "rule" or "net 15" |
| `chart_spend` | "chart" or "visualize" or "spend" |
| `crm_sync` | "crm" or "hubspot" or "deal" |
| `dupe_sweep` | "dup" or "sweep" |
| `doc_q1_report` | "report" or "one-pager" or "cfo" or "doc" |
