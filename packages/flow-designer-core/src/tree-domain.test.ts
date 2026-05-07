import { describe, it, expect, afterEach } from 'vitest';
import type { TreeDocument } from './types.js';
import {
  registerTreeDomainAdapter,
  getTreeDomainAdapter,
  listTreeDomainAdapters,
  clearTreeDomainAdapters,
} from './tree-domain.js';

const sampleTree: TreeDocument = {
  id: 'test',
  kind: 'test',
  name: 'Test',
  version: '1.0',
  root: { id: 'r', type: 'start', data: {} },
};

afterEach(() => {
  clearTreeDomainAdapters();
});

describe('TreeDomainAdapter registry', () => {
  it('registers and retrieves an adapter', () => {
    const adapter = {
      kind: 'dingtalk',
      importToTree: () => sampleTree,
      exportFromTree: (tree: TreeDocument) => ({ converted: tree.id }),
    };
    registerTreeDomainAdapter(adapter);

    const retrieved = getTreeDomainAdapter('dingtalk');
    expect(retrieved).toBe(adapter);
    expect(retrieved?.kind).toBe('dingtalk');
  });

  it('returns undefined for unregistered kind', () => {
    expect(getTreeDomainAdapter('nonexistent')).toBeUndefined();
  });

  it('lists all registered adapter kinds', () => {
    registerTreeDomainAdapter({
      kind: 'dingtalk',
      importToTree: () => sampleTree,
      exportFromTree: () => ({}),
    });
    registerTreeDomainAdapter({
      kind: 'action-flow',
      importToTree: () => sampleTree,
      exportFromTree: () => ({}),
    });

    const kinds = listTreeDomainAdapters();
    expect(kinds).toHaveLength(2);
    expect(kinds).toContain('dingtalk');
    expect(kinds).toContain('action-flow');
  });

  it('throws on duplicate registration', () => {
    registerTreeDomainAdapter({
      kind: 'dingtalk',
      importToTree: () => sampleTree,
      exportFromTree: () => ({}),
    });

    expect(() => {
      registerTreeDomainAdapter({
        kind: 'dingtalk',
        importToTree: () => sampleTree,
        exportFromTree: () => ({}),
      });
    }).toThrow('already registered');
  });

  it('clears all adapters', () => {
    registerTreeDomainAdapter({
      kind: 'dingtalk',
      importToTree: () => sampleTree,
      exportFromTree: () => ({}),
    });
    clearTreeDomainAdapters();
    expect(getTreeDomainAdapter('dingtalk')).toBeUndefined();
    expect(listTreeDomainAdapters()).toHaveLength(0);
  });

  it('adapter can convert external to tree and back', () => {
    const adapter = {
      kind: 'test',
      importToTree: (external: Record<string, unknown>) => ({
        id: external.id as string,
        kind: 'test',
        name: external.name as string,
        version: '1.0',
        root: { id: 'root', type: 'start', data: external },
      }),
      exportFromTree: (tree: TreeDocument) => ({
        id: tree.id,
        name: tree.name,
        rootData: tree.root.data,
      }),
    };
    registerTreeDomainAdapter(adapter);

    const externalInput = { id: 'ext-1', name: 'External', foo: 'bar' };
    const tree = adapter.importToTree(externalInput);
    expect(tree.id).toBe('ext-1');
    expect(tree.root.data.foo).toBe('bar');

    const exported = adapter.exportFromTree(tree);
    expect(exported.id).toBe('ext-1');
    expect(exported.rootData).toEqual({ id: 'ext-1', name: 'External', foo: 'bar' });
  });
});
