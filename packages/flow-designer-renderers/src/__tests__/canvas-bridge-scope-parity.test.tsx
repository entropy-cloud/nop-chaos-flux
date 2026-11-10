import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import './canvas-bridge-test-support.js';
import { createMockChildScope } from './canvas-bridge-test-support.js';

// Plan 863 T7: the canvas-bridge test harness hand-builds a child-scope shape
// inside the flux-react mock. ScopeRef itself is a TS interface (flux-core),
// and the real createScopeRef is not on the flux-runtime public entry — so
// the parity route extracts the interface member list from the flux-core type
// source at test runtime and asserts the mock scope's members stay a subset.
// Renaming/removing a ScopeRef member in flux-core turns this test red, so
// the mock cannot silently drift from the real contract.
const here = dirname(fileURLToPath(import.meta.url));
const scopeTypeSource = readFileSync(
  resolve(here, '..', '..', '..', 'flux-core', 'src', 'types', 'scope.ts'),
  'utf8',
);

function interfaceMembers(source: string, name: string): string[] {
  const header = `export interface ${name}`;
  const start = source.indexOf(header);
  expect(start, `${name} not found in flux-core types/scope.ts`).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  let depth = 0;
  const members: string[] = [];
  for (const rawLine of source.slice(open).split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    depth += (line.match(/\{/g) ?? []).length;
    if (depth > 1) {
      depth -= (line.match(/\}/g) ?? []).length;
      continue;
    }
    depth -= (line.match(/\}/g) ?? []).length;
    if (depth <= 0) break;
    const member = /^\s*(?:readonly\s+)?([A-Za-z_]\w*)\??\s*[:(]/.exec(line);
    if (member) members.push(member[1]);
  }
  return members;
}

describe('canvas-bridge mock scope ⊆ real ScopeRef contract (plan 863 T7)', () => {
  const scopeRefMembers = interfaceMembers(scopeTypeSource, 'ScopeRef');
  const scopeStoreMembers = interfaceMembers(scopeTypeSource, 'ScopeStore');

  it('extracts a non-empty ScopeRef member list from the flux-core type source', () => {
    expect(scopeRefMembers.length).toBeGreaterThan(5);
    expect(scopeRefMembers).toContain('id');
    expect(scopeRefMembers).toContain('get');
    expect(scopeRefMembers).toContain('update');
  });

  it('mock child scope members ⊆ ScopeRef runtime members', () => {
    const mockScope = createMockChildScope(null, { answer: 42 });
    const extra = Object.keys(mockScope).filter((key) => !scopeRefMembers.includes(key));

    expect(
      extra,
      `mock scope exposes members outside the real ScopeRef contract: ${extra.join(', ')}`,
    ).toEqual([]);
    expect(mockScope.value).toEqual({ answer: 42 });
  });

  it('mock scope store members ⊆ ScopeStore contract', () => {
    const mockScope = createMockChildScope(null, {});
    const store = (mockScope as { store?: Record<string, unknown> }).store ?? {};
    const extra = Object.keys(store).filter((key) => !scopeStoreMembers.includes(key));

    expect(
      extra,
      `mock scope store exposes members outside the ScopeStore contract: ${extra.join(', ')}`,
    ).toEqual([]);
  });
});
