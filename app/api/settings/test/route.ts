import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { getAnthropicKey, getGeminiKey } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Provider = 'anthropic' | 'gemini';

export async function POST(req: NextRequest) {
  let body: { provider?: Provider };
  try {
    body = (await req.json()) as { provider?: Provider };
  } catch {
    return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const provider = body.provider;
  if (provider !== 'anthropic' && provider !== 'gemini') {
    return Response.json({ ok: false, error: 'provider must be "anthropic" or "gemini"' }, { status: 400 });
  }

  try {
    if (provider === 'anthropic') {
      const apiKey = await getAnthropicKey();
      if (!apiKey) return Response.json({ ok: false, error: 'Anthropic API key not set' });
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } else {
      const apiKey = await getGeminiKey();
      if (!apiKey) return Response.json({ ok: false, error: 'Gemini API key not set' });
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? 'unknown error' });
  }
}
