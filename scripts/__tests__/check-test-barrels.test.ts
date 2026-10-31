import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'check-test-barrels.mjs');

function run(files: string[]): { code: number; stderr: string } {
  try {
    execFileSync('node', [scriptPath, ...files], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stderr?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? '' };
  }
}

function fixture(name: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'test-barrels-'));
  const file = path.join(dir, name);
  writeFileSync(file, content);
  return file;
}

describe('check-test-barrels', () => {
  it('fails on an aggregator that imports sibling test modules', () => {
    const barrel = fixture('index.test.tsx', "import './__tests__/a.test';\nimport './__tests__/b.test.tsx';\n");
    const result = run([barrel]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("imports test module './__tests__/a.test'");
    expect(result.stderr).toContain("imports test module './__tests__/b.test.tsx'");
  });

  it('accepts test files that import .test-support helpers and ordinary modules', () => {
    const file = fixture(
      'page.test.tsx',
      "import { setup } from './basic-page-layout.test-support.js';\nimport { thing } from '../thing.js';\n",
    );
    expect(run([file]).code).toBe(0);
  });

  it('passes on the repository test files', () => {
    expect(run([]).code).toBe(0);
  });
});
