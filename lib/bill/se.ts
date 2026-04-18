import type { BillEnvironment } from '../secrets';

// TODO: Wire up Bill Spend & Expense. The S&E API uses a different OAuth flow than
// Bill AP; we intentionally keep this as a scaffold so dispatch works end-to-end
// while we scope the auth flow. When implemented, this should cache an access
// token keyed by env.id and issue Authorization: Bearer <token> against the S&E
// base URL.

export async function seRequest(
  _env: BillEnvironment,
  _path: string,
  _init?: RequestInit
): Promise<never> {
  throw new Error('Bill S&E not yet wired — configure OAuth and implement seRequest');
}
