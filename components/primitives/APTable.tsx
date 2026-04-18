'use client';

import { useMemo } from 'react';
import type { Bill, Vendor } from '@/lib/data';
import { fmtMoney, fmtMoneyShort, fmtDate } from '@/lib/format';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

type Props = {
  bills: Bill[];
  vendors: Vendor[];
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  filter?: 'all' | 'overdue' | 'due-soon';
};

export function APTable({ bills, vendors, selected, onToggle, filter = 'all' }: Props) {
  const byVendor = Object.fromEntries(vendors.map(v => [v.id, v]));
  const filtered = useMemo(() => {
    if (filter === 'overdue') return bills.filter(b => b.status === 'overdue');
    if (filter === 'due-soon') return bills.filter(b => b.status === 'overdue' || b.status === 'due-soon');
    return bills;
  }, [bills, filter]);

  const total = filtered.reduce((s, b) => s + b.amount, 0);
  const overdue = filtered.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0);
  const dueSoon = filtered.filter(b => b.status === 'due-soon').reduce((s, b) => s + b.amount, 0);
  const selAmount = filtered.filter(b => selected?.has(b.id)).reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <div className="kpi-row">
        <div className="kpi">
          <div className="lbl">Open AP</div>
          <div className="val">{fmtMoneyShort(total)}</div>
          <div className="delta">{filtered.length} invoices · {new Set(filtered.map(b => b.vendor)).size} vendors</div>
        </div>
        <div className="kpi">
          <div className="lbl">Overdue</div>
          <div className="val" style={{ color: 'var(--neg)' }}>{fmtMoneyShort(overdue)}</div>
          <div className="delta neg">{filtered.filter(b => b.status === 'overdue').length} invoices past due</div>
        </div>
        <div className="kpi">
          <div className="lbl">Due ≤ 7d</div>
          <div className="val" style={{ color: 'oklch(0.55 0.13 70)' }}>{fmtMoneyShort(dueSoon)}</div>
          <div className="delta">needs scheduling</div>
        </div>
        <div className="kpi">
          <div className="lbl">Selected</div>
          <div className="val" style={{ color: 'var(--teal-ink)' }}>{fmtMoneyShort(selAmount)}</div>
          <div className="delta">{selected?.size ?? 0} of {filtered.length}</div>
        </div>
      </div>

      <div className="table">
        <div className="table-head">
          <span />
          <span>Vendor</span>
          <span>Invoice / PO</span>
          <span>Status</span>
          <span>Due</span>
          <span>Terms</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
        </div>
        {filtered.map(b => {
          const v = byVendor[b.vendor];
          const isSel = selected?.has(b.id);
          return (
            <div
              className="table-row"
              key={b.id}
              onClick={() => onToggle?.(b.id)}
              style={{ cursor: 'pointer' }}
            >
              <span className={'check' + (isSel ? ' on' : '')}>{isSel && <Icon.Check />}</span>
              <span className="vendor">
                {v?.name}
                <span className="sub">{v?.handle} · {v?.category}</span>
              </span>
              <span className="invoice">
                {b.invoice}
                <br />
                <span style={{ color: 'var(--ink-4)' }}>{b.poRef}</span>
              </span>
              <span><StatusPill status={b.status} /></span>
              <span className="due">{fmtDate(b.due)}</span>
              <span className="due">{v?.terms}</span>
              <span className="amt">{fmtMoney(b.amount)}</span>
            </div>
          );
        })}
        <div className="table-foot">
          <span>filter: <strong>{filter}</strong></span>
          <span>·</span>
          <span>sorted: due-date ↑</span>
          <span className="spacer" />
          <span className="selected">{selected?.size ?? 0} selected · {fmtMoney(selAmount)}</span>
        </div>
      </div>
    </div>
  );
}
