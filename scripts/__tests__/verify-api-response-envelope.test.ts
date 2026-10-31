import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'verify-api-response-envelope.mjs');

function run(args: string[]): { code: number; stdout: string } {
  try {
    const stdout = execFileSync('node', [scriptPath, ...args], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    return { code: err.status ?? 1, stdout: err.stdout ?? '' };
  }
}

function fixtureRoot(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'envelope-gate-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const full = path.join(root, relativePath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

// Fixture sources are assembled at runtime so this file never matches the gate itself.
const okKey = ['o', 'k'].join('');

describe('verify-api-response-envelope', () => {
  it('CHK-1a flags a redundant ok next to status in an ApiResponse-shaped mock', () => {
    const root = fixtureRoot({ 'packages/x/src/mock.ts': `export const f = async () => ({ ${okKey}: true, status: 0, data: 1 });\n` });
    const result = run(['--root', root, '--only', 'CHK-1a']);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('CHK-1a');
  });

  it('CHK-1a ignores an ActionResult-shaped object (ok without a sibling status)', () => {
    const root = fixtureRoot({ 'packages/x/src/action.ts': `export const r = { ${okKey}: true, data: 1 };\n` });
    expect(run(['--root', root, '--only', 'CHK-1a']).code).toBe(0);
  });

  it('CHK-1b flags an HTTP success status that the runtime treats as failure', () => {
    const root = fixtureRoot({ 'packages/x/src/mock.ts': 'export const f = async () => ({ status: 200, data: null });\n' });
    const result = run(['--root', root, '--only', 'CHK-1b']);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('status 200');
  });

  it('CHK-1b accepts success 0 and non-zero failure statuses, and honours the allow marker', () => {
    const root = fixtureRoot({
      'packages/x/src/mock.ts': [
        'export const a = async () => ({ status: 0, data: 1 });',
        'export const b = async () => ({ status: -1, msg: "x" });',
        'export const c = async () => ({ status: 500, data: null });',
        'export const d = async () => ({ status: 204, data: null }); // envelope-gate: allow',
        '',
      ].join('\n'),
    });
    expect(run(['--root', root, '--only', 'CHK-1b']).code).toBe(0);
  });

  it('CHK-5 fails closed when the ApiResponse type file is missing', () => {
    const root = fixtureRoot({ 'packages/x/src/empty.ts': 'export {};\n' });
    const result = run(['--root', root, '--only', 'CHK-5']);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('门禁目标文件不存在');
  });

  it('CHK-5 flags an ApiResponse interface that declares ok', () => {
    const root = fixtureRoot({
      'packages/flux-core/src/types/renderer-api.ts': `export interface ApiResponse<T = unknown> {\n  status: number;\n  data: T | null;\n  code?: string;\n  msg?: string;\n  errors?: Record<string, string>;\n  ${okKey}?: boolean;\n}\n`,
    });
    const result = run(['--root', root, '--only', 'CHK-5']);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('redundant field');
  });

  it('passes on the repository', () => {
    expect(run([]).code).toBe(0);
  });
});
