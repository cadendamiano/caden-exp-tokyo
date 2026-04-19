import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Source-level regression guard. See plan v5 Δ7: the component renders a
// "Request approval from Controller" button for unsimulated large-payment
// batches; its click must only advance the local requestSent flag, never
// directly call onApprove (the second-approver sign-off happens out of band).
//
// We assert this against the source text because the project doesn't have
// React Testing Library wired up; a behaviour-level test would add a
// dependency. This check is cheap and catches the specific regression the
// plan calls out: a refactor that accidentally wires onApprove to the
// large-payment !simulated branch.
const SRC = readFileSync(
  join(__dirname, '..', '..', 'components', 'primitives', 'ApprovalCard.tsx'),
  'utf8'
);

function extractBranch(src: string, marker: string): string {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  // Pick up the surrounding JSX block up to the next sibling branch marker
  // or the closing fragment — sufficient for regex checks below.
  const end = src.indexOf('{stake ===', start + marker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

describe('ApprovalCard source-level guards', () => {
  it('does not call onApprove in the large-payment + !simulated branch', () => {
    const branch = extractBranch(SRC, "{stake === 'large-payment' && !simulated");
    // The Request approval button should set local state, not submit directly.
    expect(branch).toMatch(/setRequestSent\(true\)/);
    expect(branch).not.toMatch(/onApprove\(/);
  });

  it('wires onApprove directly in the large-payment + simulated branch', () => {
    const branch = extractBranch(SRC, "{stake === 'large-payment' && simulated");
    expect(branch).toMatch(/onApprove\(payload\.batchId\)/);
  });

  it('wires onApprove directly in the regular payment branch', () => {
    const branch = extractBranch(SRC, "{stake === 'payment'");
    expect(branch).toMatch(/onApprove\(payload\.batchId\)/);
  });

  it('renders a simulated badge when the simulated prop is true', () => {
    expect(SRC).toMatch(/approval-simulated-badge/);
    expect(SRC).toMatch(/simulated \&\& !approved \&\& !rejected/);
  });

  it('disables the Approve button while state is submitting', () => {
    // The approve handler in payment / simulated-large branches respects submitting.
    expect(SRC).toMatch(/disabled=\{!confirmMatches \|\| submitting\}/);
    // The head label switches to "Submitting" when state === 'submitting'.
    expect(SRC).toMatch(/state === 'submitting'/);
  });
});
