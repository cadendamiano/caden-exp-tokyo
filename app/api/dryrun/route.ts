import { NextRequest, NextResponse } from 'next/server';
import { runTool, type ToolContext } from '@/lib/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      tool: string;
      input?: Record<string, unknown>;
      mode?: 'demo' | 'testing';
      billEnvId?: string;
      billProduct?: 'ap' | 'se';
    };
    const ctx: ToolContext = {
      mode: body.mode ?? 'demo',
      billEnvId: body.billEnvId,
      billProduct: body.billProduct,
    };
    const result = await runTool(body.tool, body.input ?? {}, ctx);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, summary: e?.message ?? 'unknown error', data: null },
      { status: 500 }
    );
  }
}
