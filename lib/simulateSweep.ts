import type { Bill, LiquidityDriver, ProjectionPoint } from './data';

export type SweepEvent = {
  day: string;
  balanceBefore: number;
  transfer: number;
  balanceAfter: number;
  cause?: string;
};

export type SweepSimulation = {
  series: ProjectionPoint[];
  sweeps: SweepEvent[];
  netOutflows: number;
  sweepTotal: number;
  minBalance: number;
  minDay: string;
};

export type SweepSimInput = {
  startBalance: number;
  startDate: string;
  days: number;
  bills: Bill[];
  drivers: LiquidityDriver[];
  threshold: number;
  sweepAmount: number;
  reserveFloor: number;
  reserveStartBalance: number;
  vendorName?: (vendorId: string) => string;
};

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function simulateSweep({
  startBalance,
  startDate,
  days,
  bills,
  drivers,
  threshold,
  sweepAmount,
  reserveFloor,
  reserveStartBalance,
  vendorName,
}: SweepSimInput): SweepSimulation {
  const series: ProjectionPoint[] = [];
  const sweeps: SweepEvent[] = [];
  let balance = startBalance;
  let reserve = reserveStartBalance;
  let netOutflows = 0;

  const label = (vendorId: string) => (vendorName ? vendorName(vendorId) : vendorId);
  const overdueBills = bills.filter(b => b.due < startDate);

  type Movement = { amount: number; label: string };

  for (let d = 0; d <= days; d++) {
    const day = addDays(startDate, d);
    const movements: Movement[] = [];

    if (d === 0) {
      for (const b of overdueBills) {
        movements.push({ amount: -b.amount, label: `${label(b.vendor)} (overdue)` });
      }
    }

    for (const b of bills) {
      if (b.due === day) movements.push({ amount: -b.amount, label: label(b.vendor) });
    }

    for (const dr of drivers) {
      if (dr.date === day) movements.push({ amount: dr.amount, label: dr.label });
    }

    for (const m of movements) {
      balance += m.amount;
      if (m.amount < 0) netOutflows += -m.amount;
    }

    series.push({ day, balance });

    if (balance < threshold && reserve - sweepAmount >= reserveFloor) {
      const balanceBefore = balance;
      const outflows = movements.filter(m => m.amount < 0);
      const biggest = outflows.reduce<Movement | null>(
        (max, cur) => (!max || cur.amount < max.amount ? cur : max),
        null,
      );
      const cause = biggest ? `post ${biggest.label} payment` : undefined;

      balance += sweepAmount;
      reserve -= sweepAmount;

      sweeps.push({
        day,
        balanceBefore,
        transfer: sweepAmount,
        balanceAfter: balance,
        cause,
      });
    }
  }

  let minIdx = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].balance < series[minIdx].balance) minIdx = i;
  }

  const sweepTotal = sweeps.reduce((s, ev) => s + ev.transfer, 0);

  return {
    series,
    sweeps,
    netOutflows,
    sweepTotal,
    minBalance: series[minIdx].balance,
    minDay: series[minIdx].day,
  };
}

export type SweepDataset = {
  bankAccounts: Array<{ role: string; balance: number }>;
  BILLS: Bill[];
  VENDORS: Array<{ id: string; name: string }>;
  liquidityDrivers: LiquidityDriver[];
  liquidityThreshold: number;
};

export const SWEEP_START_DATE = '2026-04-21';
export const SWEEP_DAYS = 60;
export const SWEEP_AMOUNT = 100000;
export const SWEEP_RESERVE_FLOOR = 200000;

export function runSweepSimForDataset(data: SweepDataset): SweepSimulation {
  const ops = data.bankAccounts.find(a => a.role === 'operating');
  const reserve = data.bankAccounts.find(a => a.role === 'reserve');
  const vendorName = (id: string) => data.VENDORS.find(v => v.id === id)?.name ?? id;

  return simulateSweep({
    startBalance: ops?.balance ?? 0,
    startDate: SWEEP_START_DATE,
    days: SWEEP_DAYS,
    bills: data.BILLS,
    drivers: data.liquidityDrivers,
    threshold: data.liquidityThreshold,
    sweepAmount: SWEEP_AMOUNT,
    reserveFloor: SWEEP_RESERVE_FLOOR,
    reserveStartBalance: reserve?.balance ?? 0,
    vendorName,
  });
}
