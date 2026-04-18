import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export type BillEnvironment = {
  id: string;
  name: string;
  devKey: string;
  username: string;
  password: string;
  orgId: string;
};

export type Secrets = {
  anthropicApiKey?: string;
  geminiApiKey?: string;
  billEnvironments: BillEnvironment[];
};

export type BillEnvironmentMasked = {
  id: string;
  name: string;
  devKey: string;
  username: string;
  orgId: string;
  passwordConfigured: boolean;
};

export type SecretsMasked = {
  anthropic: { configured: boolean; masked: string };
  gemini: { configured: boolean; masked: string };
  billEnvironments: BillEnvironmentMasked[];
};

const SECRETS_PATH = path.join(process.cwd(), '.secrets.local.json');

const EMPTY: Secrets = { billEnvironments: [] };

export async function readSecrets(): Promise<Secrets> {
  try {
    const raw = await fs.readFile(SECRETS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Secrets>;
    return {
      anthropicApiKey: parsed.anthropicApiKey,
      geminiApiKey: parsed.geminiApiKey,
      billEnvironments: Array.isArray(parsed.billEnvironments) ? parsed.billEnvironments : [],
    };
  } catch (err: any) {
    if (err?.code === 'ENOENT') return { ...EMPTY };
    throw err;
  }
}

export async function writeSecrets(next: Secrets): Promise<void> {
  const serialized = JSON.stringify(next, null, 2);
  await fs.writeFile(SECRETS_PATH, serialized, { encoding: 'utf8', mode: 0o600 });
  try {
    await fs.chmod(SECRETS_PATH, 0o600);
  } catch {
    // best-effort on platforms that reject chmod
  }
}

export async function getAnthropicKey(): Promise<string | undefined> {
  const s = await readSecrets();
  return s.anthropicApiKey || process.env.ANTHROPIC_API_KEY || undefined;
}

export async function getGeminiKey(): Promise<string | undefined> {
  const s = await readSecrets();
  return s.geminiApiKey || process.env.GEMINI_API_KEY || undefined;
}

export async function getBillEnvironment(id: string): Promise<BillEnvironment | undefined> {
  const s = await readSecrets();
  return s.billEnvironments.find(e => e.id === id);
}

export function maskSecret(value: string | undefined): string {
  if (!value) return '';
  const tail = value.slice(-4);
  return `••••${tail}`;
}

export function toMaskedView(s: Secrets): SecretsMasked {
  return {
    anthropic: {
      configured: Boolean(s.anthropicApiKey),
      masked: maskSecret(s.anthropicApiKey),
    },
    gemini: {
      configured: Boolean(s.geminiApiKey),
      masked: maskSecret(s.geminiApiKey),
    },
    billEnvironments: s.billEnvironments.map(e => ({
      id: e.id,
      name: e.name,
      devKey: maskSecret(e.devKey),
      username: e.username,
      orgId: e.orgId,
      passwordConfigured: Boolean(e.password),
    })),
  };
}

export function newEnvironmentId(): string {
  return `env_${randomBytes(6).toString('hex')}`;
}
