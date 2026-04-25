import type { BillEnvironment } from '../secrets';
import { apList, apPost } from './ap';
import type { ApFilter } from './ap';

export async function arListCustomers(env: BillEnvironment, filters: ApFilter[] = []): Promise<any[]> {
  return apList(env, 'Customer', filters, 200);
}

export async function arReadCustomer(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/Customer.json', { id });
}

export async function arListInvoices(env: BillEnvironment, filters: ApFilter[] = []): Promise<any[]> {
  return apList(env, 'Invoice', filters, 200);
}

export async function arReadInvoice(env: BillEnvironment, id: string): Promise<any> {
  return apPost<any>(env, '/api/v3/Crud/Read/Invoice.json', { id });
}

export async function arListEstimates(env: BillEnvironment, filters: ApFilter[] = []): Promise<any[]> {
  return apList(env, 'Estimate', filters, 100);
}

// ─── Write stubs ──────────────────────────────────────────────────────

export async function arCreateCustomer(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arUpdateCustomer(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arCreateInvoice(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arUpdateInvoice(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arDeleteInvoice(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arCreateEstimate(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}

export async function arConvertEstimateToInvoice(
  _env: BillEnvironment,
  _input: unknown
): Promise<{ simulated: true; note: string }> {
  return { simulated: true, note: 'real write endpoint not yet wired' };
}
