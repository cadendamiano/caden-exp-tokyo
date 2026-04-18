import { AGING, CATEGORY_SPEND } from '@/lib/data';
import { DonutChart } from '../primitives/DonutChart';
import { BarChart } from '../primitives/BarChart';

export function SpendChartArtifact() {
  return (
    <div>
      <div className="artifact-title">
        <h2>Q1 2026 · spend by category</h2>
      </div>
      <div className="artifact-subtitle">
        <span>generated 16:44</span>
        <span className="sep">·</span>
        <span>87 paid bills · Jan 1 – Mar 31</span>
        <span className="sep">·</span>
        <span>41 vendors</span>
      </div>
      <DonutChart data={CATEGORY_SPEND as unknown as Record<string, number | string>[]} title="Spend by category" labelKey="cat" valueKey="amount" />
      <BarChart data={AGING as unknown as Record<string, number | string>[]} title="Aging buckets · open AP" valueKey="amount" labelKey="bucket" />
    </div>
  );
}
