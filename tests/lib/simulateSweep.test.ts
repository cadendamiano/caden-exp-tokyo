import { describe, it, expect } from 'vitest';
import { simulateSweep, runSweepSimForDataset, SWEEP_START_DATE } from '@/lib/simulateSweep';
import { DEFAULT_DATA, LOGISTICS_DATA } from '@/lib/data';

describe('simulateSweep', () => {
  it('produces 61 series points for a 60-day window', () => {
    const sim = simulateSweep({
      startBalance: 100000,
      startDate: '2026-04-21',
      days: 60,
      bills: [],
      drivers: [],
      threshold: 50000,
      sweepAmount: 100000,
      reserveFloor: 0,
      reserveStartBalance: 500000,
    });
    expect(sim.series).toHaveLength(61);
  });

  it('triggers a sweep when an outflow pushes balance below the threshold', () => {
    const sim = simulateSweep({
      startBalance: 60000,
      startDate: '2026-04-21',
      days: 3,
      bills: [{ id: 'b', vendor: 'v', invoice: 'i', amount: 30000, due: '2026-04-22', status: 'open', poRef: '—' }],
      drivers: [],
      threshold: 50000,
      sweepAmount: 100000,
      reserveFloor: 0,
      reserveStartBalance: 500000,
    });
    expect(sim.sweeps).toHaveLength(1);
    expect(sim.sweeps[0].day).toBe('2026-04-22');
    expect(sim.sweeps[0].balanceBefore).toBe(30000);
    expect(sim.sweeps[0].balanceAfter).toBe(130000);
  });

  it('respects the reserve floor and skips sweep when reserve would go too low', () => {
    const sim = simulateSweep({
      startBalance: 40000,
      startDate: '2026-04-21',
      days: 1,
      bills: [],
      drivers: [],
      threshold: 50000,
      sweepAmount: 100000,
      reserveFloor: 500000,
      reserveStartBalance: 500000,
    });
    expect(sim.sweeps).toHaveLength(0);
  });

  it('collapses overdue bills onto the start date', () => {
    const sim = simulateSweep({
      startBalance: 100000,
      startDate: '2026-04-21',
      days: 1,
      bills: [
        { id: 'b1', vendor: 'v', invoice: 'i1', amount: 20000, due: '2026-04-10', status: 'overdue', poRef: '—' },
        { id: 'b2', vendor: 'v', invoice: 'i2', amount: 10000, due: '2026-04-15', status: 'overdue', poRef: '—' },
      ],
      drivers: [],
      threshold: 0,
      sweepAmount: 100000,
      reserveFloor: 0,
      reserveStartBalance: 500000,
    });
    expect(sim.series[0].balance).toBe(70000);
  });
});

describe('runSweepSimForDataset', () => {
  it('yields at least two sweep events on the default (Meridian) dataset', () => {
    const sim = runSweepSimForDataset(DEFAULT_DATA);
    expect(sim.sweeps.length).toBeGreaterThanOrEqual(2);
    expect(sim.series[0].day).toBe(SWEEP_START_DATE);
  });

  it('yields at least two sweep events on the logistics (Crestview) dataset', () => {
    const sim = runSweepSimForDataset(LOGISTICS_DATA);
    expect(sim.sweeps.length).toBeGreaterThanOrEqual(2);
    expect(sim.series[0].day).toBe(SWEEP_START_DATE);
  });

  it('records a minimum balance at or below the liquidity threshold for both datasets', () => {
    const defSim = runSweepSimForDataset(DEFAULT_DATA);
    const logSim = runSweepSimForDataset(LOGISTICS_DATA);
    expect(defSim.minBalance).toBeLessThan(DEFAULT_DATA.liquidityThreshold);
    expect(logSim.minBalance).toBeLessThan(LOGISTICS_DATA.liquidityThreshold);
  });
});
