import { describe, it, expect } from 'vitest';
import { matchFlow, FLOWS, LOGISTICS_FLOWS, type Flow } from '@/lib/flows';

const FLOWS_BY_ID = FLOWS as Record<string, Flow>;
const LOGISTICS_FLOWS_BY_ID = LOGISTICS_FLOWS as Record<string, Flow>;

describe('matchFlow', () => {
  it('matches pay_batch when message mentions paying overdue invoices', () => {
    expect(matchFlow('Pay the 3 overdue invoices via ACH')).toBe('pay_batch');
  });

  it('matches pay_batch when message mentions ACH', () => {
    expect(matchFlow('Send ACH payments to vendors')).toBe('pay_batch');
  });

  it('matches ap_overdue when message mentions overdue', () => {
    expect(matchFlow('Show me all overdue AP')).toBe('ap_overdue');
  });

  it('matches ap_overdue when message says show AP', () => {
    expect(matchFlow('show me the AP list')).toBe('ap_overdue');
  });

  it('matches automate_net15 when message mentions automation', () => {
    expect(matchFlow('Create an automation for new bills')).toBe('automate_net15');
  });

  it('matches automate_net15 when message mentions net 15', () => {
    expect(matchFlow('Flag bills with Net 15 terms')).toBe('automate_net15');
  });

  it('matches automate_net15 when message mentions rule', () => {
    expect(matchFlow('Create a rule for large invoices')).toBe('automate_net15');
  });

  it('matches chart_spend when message mentions chart', () => {
    expect(matchFlow('Show a chart of spending')).toBe('chart_spend');
  });

  it('matches chart_spend when message mentions visualize', () => {
    expect(matchFlow('Visualize Q1 spend by vendor category')).toBe('chart_spend');
  });

  it('matches chart_spend when message mentions spend', () => {
    expect(matchFlow('Show me spend by category')).toBe('chart_spend');
  });

  it('matches crm_sync when message mentions CRM', () => {
    expect(matchFlow('sync payments with CRM')).toBe('crm_sync');
  });

  it('matches crm_sync when message mentions HubSpot', () => {
    expect(matchFlow('Update HubSpot deal when payment clears')).toBe('crm_sync');
  });

  it('matches crm_sync when message mentions deal', () => {
    expect(matchFlow('update the deal stage')).toBe('crm_sync');
  });

  it('matches dupe_sweep when message mentions duplicate', () => {
    expect(matchFlow('Scan for duplicate invoices')).toBe('dupe_sweep');
  });

  it('matches dupe_sweep when message mentions sweep', () => {
    expect(matchFlow('run a sweep for dupes')).toBe('dupe_sweep');
  });

  it('matches runway_projection when message mentions runway', () => {
    expect(matchFlow("what's our runway look like?")).toBe('runway_projection');
  });

  it('matches runway_projection when message mentions cash runway', () => {
    expect(matchFlow('show me cash runway')).toBe('runway_projection');
  });

  it('matches runway_projection when message mentions treasury', () => {
    expect(matchFlow('treasury projection')).toBe('runway_projection');
  });

  it('matches runway_drivers when message asks what is driving the dip', () => {
    expect(matchFlow("what's driving the dip?")).toBe('runway_drivers');
  });

  it('matches runway_drivers when message mentions "driver"', () => {
    expect(matchFlow('show me the drivers')).toBe('runway_drivers');
  });

  it('returns null for unrecognised messages', () => {
    expect(matchFlow('hello')).toBeNull();
    expect(matchFlow('what is the weather today')).toBeNull();
    expect(matchFlow('')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(matchFlow('OVERDUE BILLS')).toBe('ap_overdue');
    expect(matchFlow('HUBSPOT SYNC')).toBe('crm_sync');
  });
});

describe('FLOWS', () => {
  const flowIds = ['ap_overdue', 'pay_batch', 'pay_large', 'automate_net15', 'chart_spend', 'crm_sync', 'dupe_sweep', 'runway_projection', 'runway_drivers', 'sweep_rule_draft'];

  it('contains all expected flows', () => {
    for (const id of flowIds) {
      expect(FLOWS_BY_ID[id]).toBeDefined();
    }
  });

  it('every flow has an id, title, and steps array', () => {
    for (const id of flowIds) {
      const flow = FLOWS_BY_ID[id];
      expect(typeof flow.id).toBe('string');
      expect(typeof flow.title).toBe('string');
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it('every step has a kind', () => {
    for (const id of flowIds) {
      for (const step of FLOWS_BY_ID[id].steps) {
        expect(typeof step.kind).toBe('string');
      }
    }
  });

  it('pay_batch includes an approval step', () => {
    const steps = FLOWS.pay_batch.steps;
    const approvalStep = steps.find(s => s.kind === 'approval');
    expect(approvalStep).toBeDefined();
  });

  it('pay_batch approval payload has required fields', () => {
    const step = FLOWS.pay_batch.steps.find(s => s.kind === 'approval')!;
    const payload = (step as any).payload;
    expect(typeof payload.batchId).toBe('string');
    expect(typeof payload.total).toBe('number');
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
  });

  it('pay_batch approval has stake of "payment"', () => {
    const step = FLOWS.pay_batch.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.stake).toBe('payment');
  });

  it('flows with artifacts declare an artifact object', () => {
    expect(FLOWS.ap_overdue.artifact).toBeDefined();
    expect(FLOWS.chart_spend.artifact).toBeDefined();
    expect(FLOWS.automate_net15.artifact).toBeDefined();
    expect(FLOWS.crm_sync.artifact).toBeDefined();
  });
});

describe('pay_large flow', () => {
  it('exists in FLOWS', () => {
    expect(FLOWS.pay_large).toBeDefined();
  });

  it('has an approval step', () => {
    const step = FLOWS.pay_large.steps.find(s => s.kind === 'approval');
    expect(step).toBeDefined();
  });

  it('approval has stake of "large-payment"', () => {
    const step = FLOWS.pay_large.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.stake).toBe('large-payment');
  });

  it('approval has requiresSecondApprover: true', () => {
    const step = FLOWS.pay_large.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.requiresSecondApprover).toBe(true);
  });

  it('total exceeds 25000', () => {
    const step = FLOWS.pay_large.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.total).toBeGreaterThan(25000);
  });

  it('has at least 2 line items', () => {
    const step = FLOWS.pay_large.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.items.length).toBeGreaterThanOrEqual(2);
  });
});

describe('matchFlow — pay_large', () => {
  it('matches pay_large when prompt mentions Crestline', () => {
    expect(matchFlow('Pay the Crestline Legal invoice')).toBe('pay_large');
  });

  it('matches pay_large when prompt mentions Fulton', () => {
    expect(matchFlow('Pay the Fulton & Hart consulting invoice')).toBe('pay_large');
  });

  it('matches pay_large when prompt mentions professional services', () => {
    expect(matchFlow('Pay Q1 professional services invoices')).toBe('pay_large');
  });

  it('still matches pay_batch for ACH overdue (no large-payment keywords)', () => {
    expect(matchFlow('Pay the 3 overdue invoices via ACH')).toBe('pay_batch');
  });

  it('still matches pay_batch when prompt contains ACH and 3', () => {
    expect(matchFlow('Send 3 ACH payments')).toBe('pay_batch');
  });
});

describe('LOGISTICS_FLOWS', () => {
  const flowIds = ['ap_overdue', 'pay_batch', 'automate_net15', 'chart_spend', 'crm_sync', 'pay_large', 'dupe_sweep', 'runway_projection', 'runway_drivers', 'sweep_rule_draft'];

  it('contains all expected flow ids', () => {
    for (const id of flowIds) {
      expect(LOGISTICS_FLOWS_BY_ID[id]).toBeDefined();
    }
  });

  it('every flow has an id, title, and steps array', () => {
    for (const id of flowIds) {
      const flow = LOGISTICS_FLOWS_BY_ID[id];
      expect(typeof flow.id).toBe('string');
      expect(typeof flow.title).toBe('string');
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it('pay_large requires a second approver and exceeds 25k', () => {
    const step = LOGISTICS_FLOWS.pay_large.steps.find(s => s.kind === 'approval')!;
    expect((step as any).payload.requiresSecondApprover).toBe(true);
    expect((step as any).payload.total).toBeGreaterThan(25000);
  });
});

describe('liquidity flows', () => {
  it('runway_projection artifact is kind liquidity-burndown with filter projection', () => {
    const a = FLOWS.runway_projection.artifact;
    expect(a?.kind).toBe('liquidity-burndown');
    expect(a?.filter).toBe('projection');
  });

  it('runway_drivers contains an artifact-enrich step that flips the filter', () => {
    const enrich = FLOWS.runway_drivers.steps.find(s => s.kind === 'artifact-enrich');
    expect(enrich).toBeDefined();
    expect((enrich as any).artifactId).toBe('art_runway_60d');
    expect((enrich as any).patch.filter).toBe('projection+drivers');
  });

  it('sweep_rule_draft artifact is kind sweep-rule', () => {
    const a = FLOWS.sweep_rule_draft.artifact;
    expect(a?.kind).toBe('sweep-rule');
    expect(a?.id).toBe('art_sweep_rule');
  });

  it('logistics runway_projection uses the $75k threshold (not $50k)', () => {
    const tools = LOGISTICS_FLOWS.runway_projection.steps.find(s => s.kind === 'tools') as any;
    const projectStep = tools?.rows.find((it: any) => it.path === 'project_cash_runway');
    expect(projectStep.filter).toMatch(/75000/);
  });
});

describe('matchFlow — logistics dataset', () => {
  it("triggers pay_large on 'skylink'", () => {
    expect(matchFlow('Pay the SkyLink invoice', 'logistics')).toBe('pay_large');
  });

  it("triggers pay_large on 'air freight'", () => {
    expect(matchFlow('Pay the air freight bill', 'logistics')).toBe('pay_large');
  });

  it("default dataset does NOT treat 'skylink' as pay_large", () => {
    expect(matchFlow('Pay the SkyLink invoice')).not.toBe('pay_large');
  });

  it("logistics dataset does NOT treat 'crestline' as pay_large", () => {
    expect(matchFlow('Pay the Crestline invoice', 'logistics')).not.toBe('pay_large');
  });

  it('overdue still routes to ap_overdue for logistics', () => {
    expect(matchFlow('show overdue AP', 'logistics')).toBe('ap_overdue');
  });
});
