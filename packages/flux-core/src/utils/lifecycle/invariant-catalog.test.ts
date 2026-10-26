import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Table-completeness gate (plan 757): the invariant catalog and the contract
// test file must name exactly the same Test IDs. A row without a test, or a
// test without a row, is a red — the same mechanism docs/audits/ai-invariants uses.
// Any `XX-n` row id counts, so a new family cannot slip past the gate unnoticed.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..', '..');
const catalogPath = join(repoRoot, 'docs', 'audits', 'async-lifecycle', 'invariant-catalog.md');
const contractsPath = join(here, 'lifecycle-contracts.test.ts');

function catalogIds(markdown: string): string[] {
  const ids: string[] = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^\|\s*([A-Z]{2}-\d+)\s*\|/);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function contractIds(source: string): string[] {
  return [...source.matchAll(/\bit\(\s*'([A-Z]{2}-\d+) /g)].map((match) => match[1]);
}

describe('async lifecycle invariant catalog', () => {
  it('lists exactly the Test IDs implemented by lifecycle-contracts.test.ts (both directions)', () => {
    const fromCatalog = catalogIds(readFileSync(catalogPath, 'utf8'));
    const fromContracts = contractIds(readFileSync(contractsPath, 'utf8'));
    expect(new Set(fromCatalog).size, 'catalog has duplicate IDs').toBe(fromCatalog.length);
    expect(new Set(fromContracts).size, 'contracts have duplicate IDs').toBe(fromContracts.length);
    expect([...fromCatalog].sort()).toEqual([...fromContracts].sort());
    expect(fromCatalog.length).toBeGreaterThan(0);
  });
});
