import { describe, it, expect } from 'vitest';
import { matchFlow, FLOWS } from '@/lib/flows';

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
  const flowIds = ['ap_overdue', 'pay_batch', 'automate_net15', 'chart_spend', 'crm_sync', 'dupe_sweep'];

  it('contains all expected flows', () => {
    for (const id of flowIds) {
      expect(FLOWS[id]).toBeDefined();
    }
  });

  it('every flow has an id, title, and steps array', () => {
    for (const id of flowIds) {
      const flow = FLOWS[id];
      expect(typeof flow.id).toBe('string');
      expect(typeof flow.title).toBe('string');
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it('every step has a kind', () => {
    for (const id of flowIds) {
      for (const step of FLOWS[id].steps) {
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

  it('flows with artifacts declare an artifact object', () => {
    expect(FLOWS.ap_overdue.artifact).toBeDefined();
    expect(FLOWS.chart_spend.artifact).toBeDefined();
    expect(FLOWS.automate_net15.artifact).toBeDefined();
    expect(FLOWS.crm_sync.artifact).toBeDefined();
  });
});
