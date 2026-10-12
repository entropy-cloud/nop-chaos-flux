import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLazyTreeHostEnv, orgTreeOptions } from './tree-lab-host';

const INPUT_TREE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/component-lab/renderers/input-tree-lab-page.tsx'),
  'utf8',
);
const TREE_SELECT_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/component-lab/renderers/tree-select-lab-page.tsx'),
  'utf8',
);

const LAZY_ENV_TWIN_MARKER = 'lazyFailCalls = new Map<string, number>()';
const ORG_TREE_TWIN_MARKER = "label: 'Engineering'";

describe('tree-lab-host single source (WA-clab-003)', () => {
  it('exposes one lazy-tree host factory; both tree labs reference it and keep no local twin', () => {
    expect(INPUT_TREE_SOURCE).toContain("from './tree-lab-host'");
    expect(TREE_SELECT_SOURCE).toContain("from './tree-lab-host'");
    expect(INPUT_TREE_SOURCE).not.toContain(LAZY_ENV_TWIN_MARKER);
    expect(TREE_SELECT_SOURCE).not.toContain(LAZY_ENV_TWIN_MARKER);
    expect(INPUT_TREE_SOURCE).not.toContain(ORG_TREE_TWIN_MARKER);
    expect(TREE_SELECT_SOURCE).not.toContain(ORG_TREE_TWIN_MARKER);
  });

  it('factory returns a fresh per-node fail counter per call so the two labs stay independent', async () => {
    const envInputTree = createLazyTreeHostEnv();
    const envTreeSelect = createLazyTreeHostEnv();

    expect(envInputTree.lazyFailCalls).not.toBe(envTreeSelect.lazyFailCalls);

    const ctx = { scope: { readOwn: () => ({ expandedNodeValue: 'n1' }) } };

    const firstFail = await envInputTree.fetcher({ url: '/api/lazy-fail' }, ctx);
    expect(firstFail.status).toBe(500);
    expect(firstFail).not.toHaveProperty('ok');
    expect(firstFail.data).toEqual({ message: 'Lazy load failed (first attempt)' });
    expect(envInputTree.lazyFailCalls.get('n1')).toBe(1);
    expect(envTreeSelect.lazyFailCalls.size).toBe(0);

    const retried = await envInputTree.fetcher({ url: '/api/lazy-fail' }, ctx);
    expect(retried.status).toBe(0);
    expect(retried.data).toEqual([{ label: 'Retried child of n1', value: 'n1-r' }]);

    const treeSelectFirstFail = await envTreeSelect.fetcher({ url: '/api/lazy-fail' }, ctx);
    expect(treeSelectFirstFail.status).toBe(500);
    expect(envTreeSelect.lazyFailCalls.get('n1')).toBe(1);
  });

  it('lazy-ok branch returns synthetic children for the expanded node', async () => {
    const env = createLazyTreeHostEnv();
    const ctx = { scope: { readOwn: () => ({ expandedNodeValue: 'n1' }) } };

    const ok = await env.fetcher({ url: '/api/lazy-ok' }, ctx);
    expect(ok.status).toBe(0);
    expect(ok.data).toEqual([
      { label: 'Sub A of n1', value: 'n1-a' },
      { label: 'Sub B of n1', value: 'n1-b' },
    ]);

    const unknownEndpoint = await env.fetcher({ url: '/api/other' }, ctx);
    expect(unknownEndpoint.status).toBe(0);
    expect(unknownEndpoint.data).toBeNull();
  });

  it('orgTreeOptions is the single-sourced fixture both tree labs render', () => {
    expect(orgTreeOptions).toHaveLength(3);
    expect(orgTreeOptions.map((group) => group.label)).toEqual([
      'Engineering',
      'Design',
      'Operations',
    ]);
    expect(orgTreeOptions.every((group) => Array.isArray(group.children))).toBe(true);
  });
});
