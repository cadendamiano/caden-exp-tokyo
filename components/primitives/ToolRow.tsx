import type { ToolRowSpec } from '@/lib/flows';

export function ToolRow({ row }: { row: ToolRowSpec }) {
  const isOk = !row.status || row.status === '200' || row.status === 'ok';
  return (
    <div className="tool-row">
      <span className="glyph">→</span>
      <span className="endpoint">
        <span className="verb">{row.verb}</span>
        <span className="path">{row.path}</span>
        {row.filter && <span className="filter"> {row.filter}</span>}
      </span>
      <span className="result">
        {row.status && <span className={isOk ? 'ok' : ''}>{row.status}</span>}
        {row.status && row.result ? ' · ' : ''}
        {row.result}
      </span>
    </div>
  );
}
