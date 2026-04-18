import { NextRequest } from 'next/server';
import {
  readSecrets,
  writeSecrets,
  toMaskedView,
  newEnvironmentId,
  type BillEnvironment,
  type Secrets,
} from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingBillEnv = {
  id?: string;
  name?: string;
  devKey?: string;
  username?: string;
  password?: string;
  orgId?: string;
  product?: 'ap' | 'se' | 'both';
};

type IncomingPatch = {
  anthropicApiKey?: string | null;
  geminiApiKey?: string | null;
  billEnvironments?: IncomingBillEnv[];
};

export async function GET() {
  const current = await readSecrets();
  return Response.json(toMaskedView(current));
}

export async function POST(req: NextRequest) {
  let patch: IncomingPatch;
  try {
    patch = (await req.json()) as IncomingPatch;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const current = await readSecrets();
  const next: Secrets = {
    anthropicApiKey: current.anthropicApiKey,
    geminiApiKey: current.geminiApiKey,
    billEnvironments: [...current.billEnvironments],
  };

  if (patch.anthropicApiKey !== undefined) {
    next.anthropicApiKey = patch.anthropicApiKey ? String(patch.anthropicApiKey) : undefined;
  }
  if (patch.geminiApiKey !== undefined) {
    next.geminiApiKey = patch.geminiApiKey ? String(patch.geminiApiKey) : undefined;
  }

  if (Array.isArray(patch.billEnvironments)) {
    const byId = new Map(current.billEnvironments.map(e => [e.id, e]));
    const merged: BillEnvironment[] = [];
    for (const incoming of patch.billEnvironments) {
      const prev = incoming.id ? byId.get(incoming.id) : undefined;
      const id = prev?.id ?? newEnvironmentId();
      const incomingProduct = incoming.product;
      const product: 'ap' | 'se' | 'both' =
        incomingProduct === 'se' || incomingProduct === 'both' || incomingProduct === 'ap'
          ? incomingProduct
          : (prev?.product ?? 'ap');
      merged.push({
        id,
        name: String(incoming.name ?? prev?.name ?? '').trim() || 'Sandbox',
        devKey: incoming.devKey !== undefined ? String(incoming.devKey) : (prev?.devKey ?? ''),
        username: incoming.username !== undefined ? String(incoming.username) : (prev?.username ?? ''),
        password: incoming.password !== undefined ? String(incoming.password) : (prev?.password ?? ''),
        orgId: incoming.orgId !== undefined ? String(incoming.orgId) : (prev?.orgId ?? ''),
        product,
      });
    }
    next.billEnvironments = merged;
  }

  await writeSecrets(next);
  return Response.json(toMaskedView(next));
}
