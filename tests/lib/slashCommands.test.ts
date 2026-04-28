import { describe, it, expect } from 'vitest';
import {
  SLASH_COMMANDS,
  parseSlash,
  matchSlashPrefix,
  requirementsPrompt,
} from '@/lib/slashCommands';
import { FLOWS } from '@/lib/flows';

describe('parseSlash', () => {
  it('returns null for empty / non-slash text', () => {
    expect(parseSlash('')).toBeNull();
    expect(parseSlash('hello')).toBeNull();
  });

  it('returns null for slash mid-text', () => {
    expect(parseSlash('look at /ap')).toBeNull();
  });

  it('returns null for unknown slash commands', () => {
    expect(parseSlash('/foo')).toBeNull();
    expect(parseSlash('/foo bar')).toBeNull();
  });

  it('parses /dataviz with empty body', () => {
    const result = parseSlash('/dataviz');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('dataviz');
    expect(result!.body).toBe('');
  });

  it('parses /dataviz with body', () => {
    const result = parseSlash('/dataviz Q1 spend');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('dataviz');
    expect(result!.body).toBe('Q1 spend');
  });

  it('resolves aliases (chart → dataviz), case-insensitive', () => {
    const result = parseSlash('/CHART by vendor');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('dataviz');
    expect(result!.body).toBe('by vendor');
  });

  it('resolves /hubspot alias to crm command', () => {
    const result = parseSlash('/hubspot sync deal');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('crm');
  });

  it('parses /doc with body', () => {
    const result = parseSlash('/doc Generate a Q1 CFO report');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('doc');
    expect(result!.body).toBe('Generate a Q1 CFO report');
  });

  it('resolves /report alias to doc command', () => {
    const result = parseSlash('/report Q1 spend summary');
    expect(result).not.toBeNull();
    expect(result!.cmd.name).toBe('doc');
  });
});

describe('matchSlashPrefix', () => {
  it('includes dataviz and doc when prefix is "d"', () => {
    const matches = matchSlashPrefix('d');
    expect(matches.some(c => c.name === 'dataviz')).toBe(true);
    expect(matches.some(c => c.name === 'doc')).toBe(true);
  });

  it('returns no matches for an unknown prefix', () => {
    expect(matchSlashPrefix('xyz123')).toHaveLength(0);
  });

  it('returns all commands for an empty prefix', () => {
    const all = matchSlashPrefix('');
    expect(all).toHaveLength(SLASH_COMMANDS.length);
  });

  it('matches by alias', () => {
    const matches = matchSlashPrefix('hub');
    expect(matches.some(c => c.name === 'crm')).toBe(true);
  });
});

describe('SLASH_COMMANDS invariants', () => {
  it('every demoFlowId resolves to a real flow in FLOWS', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(FLOWS[cmd.demoFlowId as keyof typeof FLOWS]).toBeDefined();
    }
  });

  it('every command has a non-empty requirements list', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.requirements.length).toBeGreaterThan(0);
    }
  });

  it('command names are unique', () => {
    const names = SLASH_COMMANDS.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers all user-facing ArtifactKinds', () => {
    const kinds = [...new Set(SLASH_COMMANDS.map(c => c.kind))].sort();
    expect(kinds).toEqual([
      'ap-table',
      'crm-flow',
      'document',
      'rule-net15',
      'slides',
      'spend-chart',
      'sweep-rule',
    ]);
  });

  it('includes /liquidity mapped to sweep-rule and sweep_rule_draft', () => {
    const cmd = SLASH_COMMANDS.find(c => c.name === 'liquidity');
    expect(cmd).toBeDefined();
    expect(cmd!.kind).toBe('sweep-rule');
    expect(cmd!.demoFlowId).toBe('sweep_rule_draft');
    expect(cmd!.aliases).toContain('runway');
    expect(cmd!.aliases).toContain('treasury');
  });
});

describe('requirementsPrompt', () => {
  it('includes the command name, forced kind, and every requirement line', () => {
    const cmd = SLASH_COMMANDS.find(c => c.name === 'dataviz')!;
    const prompt = requirementsPrompt(cmd);
    expect(prompt).toContain('/dataviz');
    expect(prompt).toContain('kind="spend-chart"');
    for (const r of cmd.requirements) {
      expect(prompt).toContain(r);
    }
  });
});
