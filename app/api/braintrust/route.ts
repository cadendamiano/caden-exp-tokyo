import { NextRequest } from 'next/server';
import { readSecrets } from '@/lib/secrets';
import { getSpans, markPushed, clearBuffer } from '@/lib/spanBuffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BT_BASE = 'https://api.braintrust.dev/v1';

async function btFetch(path: string, apiKey: string, options?: RequestInit) {
  return fetch(`${BT_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

// GET /api/braintrust
// action=test  → validate key + return org/project list
// action=spans → return in-memory span buffer
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'spans';

  if (action === 'spans') {
    return Response.json({ spans: getSpans() });
  }

  if (action === 'test') {
    const secrets = await readSecrets();
    const apiKey = secrets.braintrustApiKey;
    if (!apiKey) return Response.json({ ok: false, error: 'No BrainTrust API key configured' });

    try {
      const res = await btFetch('/project?limit=50', apiKey);
      if (!res.ok) {
        const text = await res.text();
        return Response.json({ ok: false, error: `BrainTrust returned ${res.status}: ${text.slice(0, 200)}` });
      }
      const data = await res.json();
      const projects: { id: string; name: string }[] = (data.objects ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      return Response.json({ ok: true, projects });
    } catch (e: any) {
      return Response.json({ ok: false, error: e?.message ?? 'Network error' });
    }
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}

// POST /api/braintrust
// body: { action: 'push', spanIds: string[] }  → push selected spans as dataset rows
// body: { action: 'clear' }                     → clear the in-memory buffer
export async function POST(req: NextRequest) {
  let body: { action: string; spanIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  if (body.action === 'clear') {
    clearBuffer();
    return Response.json({ ok: true });
  }

  if (body.action === 'push') {
    const secrets = await readSecrets();
    const apiKey = secrets.braintrustApiKey;
    if (!apiKey) return Response.json({ ok: false, error: 'No BrainTrust API key configured' });

    const projectName = secrets.braintrustProjectName;
    if (!projectName) return Response.json({ ok: false, error: 'No BrainTrust project configured' });

    const allSpans = getSpans();
    const targets = body.spanIds?.length
      ? allSpans.filter(s => body.spanIds!.includes(s.id))
      : allSpans;

    if (targets.length === 0) return Response.json({ ok: false, error: 'No spans to push' });

    // Resolve or create the dataset
    let datasetId: string;
    try {
      const createRes = await btFetch('/dataset', apiKey, {
        method: 'POST',
        body: JSON.stringify({ name: 'coworker-traces', project_name: projectName }),
      });
      const createData = await createRes.json();
      datasetId = createData.id;
      if (!datasetId) throw new Error('Could not resolve dataset id');
    } catch (e: any) {
      return Response.json({ ok: false, error: `Dataset resolve failed: ${e?.message}` });
    }

    // Insert rows
    const rows = targets.map(span => ({
      input: {
        systemPrompt: span.systemPrompt,
        userMessage: span.userMessage,
        toolCalls: span.toolCalls,
      },
      expected: span.responseText,
      metadata: {
        model: span.model,
        inputTokens: span.inputTokens,
        outputTokens: span.outputTokens,
        timestamp: span.timestamp,
      },
    }));

    try {
      const insertRes = await btFetch(`/dataset/${datasetId}/insert`, apiKey, {
        method: 'POST',
        body: JSON.stringify({ events: rows }),
      });
      if (!insertRes.ok) {
        const text = await insertRes.text();
        return Response.json({ ok: false, error: `Insert failed (${insertRes.status}): ${text.slice(0, 200)}` });
      }
      targets.forEach(s => markPushed(s.id));
      return Response.json({ ok: true, pushed: targets.length });
    } catch (e: any) {
      return Response.json({ ok: false, error: e?.message ?? 'Insert failed' });
    }
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}
