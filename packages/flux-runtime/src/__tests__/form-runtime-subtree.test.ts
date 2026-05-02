import { describe, expect, it } from 'vitest';
import {
  collectSubtreePaths,
  collectSubtreeNodePaths,
  collectSubtreeValidationTargets,
} from '../form-runtime-subtree';
import type { CompiledFormValidationModel, RuntimeFieldRegistration } from '@nop-chaos/flux-core';

type SubtreeCollectionState = Parameters<typeof collectSubtreePaths>[0];

function createValidationModel(
  nodes: Record<string, { kind?: string; children?: string[] }> = {},
  traversalOrder: string[] = [],
  rootPath = '',
): CompiledFormValidationModel {
  const builtNodes: Record<string, { path: string; kind: string; children: string[] }> = {};
  for (const [path, node] of Object.entries(nodes)) {
    builtNodes[path] = {
      path,
      kind: node.kind ?? 'field',
      children: node.children ?? [],
    };
  }
  return {
    rootPath,
    fields: {},
    validationOrder: traversalOrder,
    order: traversalOrder,
    nodes: builtNodes,
    behavior: { triggers: ['blur'], showErrorOn: [] },
    dependents: {},
  } as unknown as CompiledFormValidationModel;
}

function createRegistration(path: string, childPaths?: string[]) {
  return {
    registrationId: `reg-${path}`,
    registration: { path, childPaths } as unknown as RuntimeFieldRegistration,
    modelGeneration: 1,
  };
}

function createSharedState(
  validation: CompiledFormValidationModel,
  registrations: Array<ReturnType<typeof createRegistration>> = [],
): SubtreeCollectionState {
  const runtimeFieldRegistrations = new Map<string, ReturnType<typeof createRegistration>>();
  for (const reg of registrations) {
    runtimeFieldRegistrations.set(reg.registrationId, reg);
  }
  return {
    inputValue: { validation },
    runtimeFieldRegistrations,
    pathToRegistrationId: new Map(),
    childPathToRegistrationId: new Map(),
    store: {} as any,
    scope: {} as any,
    initialFieldState: { initialValues: {}, dirty: {} },
  } as SubtreeCollectionState;
}

describe('collectSubtreePaths', () => {
  it('returns empty for no matching paths in traversal or registrations', () => {
    const validation = createValidationModel({}, ['a', 'b']);
    const state = createSharedState(validation);
    const paths = collectSubtreePaths(state, 'nonexistent');
    expect(paths).toEqual([]);
  });

  it('collects exact path and child paths from traversal order', () => {
    const validation = createValidationModel({}, [
      'parent',
      'parent.child1',
      'parent.child2',
      'other',
    ]);
    const state = createSharedState(validation);
    const paths = collectSubtreePaths(state, 'parent');
    expect(paths.sort()).toEqual(['parent', 'parent.child1', 'parent.child2']);
  });

  it('collects from runtime field registrations', () => {
    const validation = createValidationModel({}, []);
    const state = createSharedState(validation, [
      createRegistration('form.field1'),
      createRegistration('form.field1.subfield'),
      createRegistration('unrelated'),
    ]);
    const paths = collectSubtreePaths(state, 'form.field1');
    expect(paths.sort()).toEqual(['form.field1', 'form.field1.subfield']);
  });

  it('includes paths where registration is a prefix of the target', () => {
    const validation = createValidationModel({}, []);
    const state = createSharedState(validation, [createRegistration('form', ['form.a', 'form.b'])]);
    const paths = collectSubtreePaths(state, 'form.a');
    expect(paths).toContain('form');
    expect(paths).toContain('form.a');
  });

  it('includes childPaths from registrations', () => {
    const validation = createValidationModel({}, []);
    const state = createSharedState(validation, [
      createRegistration('container', ['container.item1', 'container.item2', 'other']),
    ]);
    const paths = collectSubtreePaths(state, 'container');
    expect(paths).toContain('container');
    expect(paths).toContain('container.item1');
    expect(paths).toContain('container.item2');
    expect(paths).not.toContain('other');
  });

  it('combines traversal and registration paths', () => {
    const validation = createValidationModel({}, ['parent.a', 'parent.b']);
    const state = createSharedState(validation, [createRegistration('parent.c')]);
    const paths = collectSubtreePaths(state, 'parent');
    expect(paths.sort()).toEqual(['parent.a', 'parent.b', 'parent.c']);
  });
});

describe('collectSubtreeNodePaths', () => {
  it('returns empty when no validation nodes exist', () => {
    const validation = createValidationModel();
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'anything');
    expect(paths).toEqual([]);
  });

  it('returns ordered node paths starting from target', () => {
    const validation = createValidationModel(
      {
        parent: { kind: 'container', children: ['parent.a', 'parent.b'] },
        'parent.a': { kind: 'field', children: [] },
        'parent.b': { kind: 'field', children: [] },
      },
      [],
      '',
    );
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'parent');
    expect(paths).toEqual(['parent', 'parent.a', 'parent.b']);
  });

  it('skips form-kind nodes and their children', () => {
    const validation = createValidationModel(
      {
        root: { kind: 'form', children: ['root.field'] },
        'root.field': { kind: 'field', children: [] },
      },
      [],
      'root',
    );
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'root');
    expect(paths).toEqual([]);
  });

  it('uses fallback traversal when direct node not found', () => {
    const validation = createValidationModel(
      {
        'group.field1': { kind: 'field', children: [] },
        'group.field2': { kind: 'field', children: [] },
      },
      ['group.field1', 'group.field2'],
      '',
    );
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'group');
    expect(paths.sort()).toEqual(['group.field1', 'group.field2']);
  });

  it('deduplicates via seen set', () => {
    const validation = createValidationModel(
      {
        root: { kind: 'container', children: ['root.a', 'root.a'] },
        'root.a': { kind: 'field', children: [] },
      },
      [],
      'root',
    );
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'root');
    expect(paths).toEqual(['root', 'root.a']);
  });

  it('returns empty for empty traversal and no direct node', () => {
    const validation = createValidationModel({}, [], '');
    const state = createSharedState(validation);
    const paths = collectSubtreeNodePaths(state, 'missing');
    expect(paths).toEqual([]);
  });
});

describe('collectSubtreeValidationTargets', () => {
  it('combines node paths and subtree paths', () => {
    const validation = createValidationModel(
      {
        parent: { kind: 'container', children: ['parent.a'] },
        'parent.a': { kind: 'field', children: [] },
      },
      ['parent', 'parent.a', 'parent.b'],
      'parent',
    );
    const state = createSharedState(validation);
    const targets = collectSubtreeValidationTargets(state, 'parent');
    expect(targets).toContain('parent');
    expect(targets).toContain('parent.a');
    expect(targets).toContain('parent.b');
  });

  it('deduplicates combined results', () => {
    const validation = createValidationModel(
      {
        'g.x': { kind: 'field', children: [] },
      },
      ['g.x'],
      '',
    );
    const state = createSharedState(validation);
    const targets = collectSubtreeValidationTargets(state, 'g');
    const count = targets.filter((t) => t === 'g.x').length;
    expect(count).toBe(1);
  });
});
