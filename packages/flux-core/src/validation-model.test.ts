import { describe, expect, it } from 'vitest';
import {
  buildCompiledFormValidationModel,
  buildCompiledValidationDependentMap,
  buildCompiledValidationOrder,
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationNode,
  getCompiledValidationNodeMap,
  getCompiledValidationRootPath,
  getCompiledValidationTraversalOrder,
  hasCompiledValidationNodes,
  resolveHiddenFieldPolicy,
  type CompiledValidationBehavior,
  type CompiledValidationNode,
} from './index';

const defaultBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit'],
};

function makeFieldNode(overrides: Partial<CompiledValidationNode> = {}): CompiledValidationNode {
  return {
    path: 'field',
    kind: 'field',
    controlType: 'input-text',
    rules: [],
    behavior: defaultBehavior,
    children: [],
    ...overrides,
  };
}

describe('validation-model', () => {
  describe('resolveHiddenFieldPolicy', () => {
    it('returns default when both policies are undefined', () => {
      expect(resolveHiddenFieldPolicy(undefined, undefined)).toEqual({
        validateWhenHidden: false,
        clearValueWhenHidden: false,
      });
    });

    it('merges form policy over defaults when field policy is undefined', () => {
      expect(resolveHiddenFieldPolicy(undefined, { validateWhenHidden: true })).toEqual({
        validateWhenHidden: true,
        clearValueWhenHidden: false,
      });
    });

    it('merges field over form over defaults when both provided', () => {
      expect(
        resolveHiddenFieldPolicy({ clearValueWhenHidden: true }, { validateWhenHidden: true }),
      ).toEqual({
        validateWhenHidden: true,
        clearValueWhenHidden: true,
      });
    });
  });

  describe('getCompiledValidationField', () => {
    it('returns undefined when model is undefined', () => {
      expect(getCompiledValidationField(undefined, 'x')).toBeUndefined();
    });

    it('returns undefined when path not found in nodes', () => {
      const model = buildCompiledFormValidationModel({
        behavior: defaultBehavior,
        nodes: { f: makeFieldNode({ path: 'f' }) },
      });
      expect(getCompiledValidationField(model, 'missing')).toBeUndefined();
    });

    it('returns undefined for form-kind nodes', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        form: { path: 'form', kind: 'form', rules: [], children: [] },
        f: makeFieldNode({ path: 'f' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationField(model, 'form')).toBeUndefined();
    });

    it('returns undefined for node without controlType string', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        f: { path: 'f', kind: 'field', rules: [], children: [] },
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationField(model, 'f')).toBeUndefined();
    });

    it('returns undefined for node without behavior', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        f: { path: 'f', kind: 'field', controlType: 'input-text', rules: [], children: [] },
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationField(model, 'f')).toBeUndefined();
    });

    it('returns compiled field snapshot with resolved hidden-field policy', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        f: makeFieldNode({
          path: 'f',
          label: 'Name',
          rules: [{ id: 'req', rule: { kind: 'required' }, dependencyPaths: [] }],
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        }),
      };
      const model = buildCompiledFormValidationModel({
        behavior: defaultBehavior,
        nodes,
        defaultHiddenFieldPolicy: { validateWhenHidden: true },
      });
      expect(getCompiledValidationField(model, 'f')).toEqual({
        path: 'f',
        controlType: 'input-text',
        label: 'Name',
        rules: [{ id: 'req', rule: { kind: 'required' }, dependencyPaths: [] }],
        behavior: defaultBehavior,
        hiddenFieldPolicy: { validateWhenHidden: true, clearValueWhenHidden: true },
      });
    });
  });

  describe('buildCompiledValidationDependentMap', () => {
    it('returns empty object when nodes is undefined', () => {
      expect(buildCompiledValidationDependentMap(undefined)).toEqual({});
    });

    it('builds dependent map from dependency paths', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({
          path: 'a',
          rules: [{ id: 'r1', rule: { kind: 'required' }, dependencyPaths: ['b', 'c'] }],
        }),
        b: makeFieldNode({ path: 'b' }),
        c: makeFieldNode({ path: 'c' }),
      };
      expect(buildCompiledValidationDependentMap(nodes)).toEqual({
        b: ['a'],
        c: ['a'],
      });
    });

    it('accumulates multiple dependents for the same path', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({
          path: 'a',
          rules: [{ id: 'r1', rule: { kind: 'required' }, dependencyPaths: ['x'] }],
        }),
        b: makeFieldNode({
          path: 'b',
          rules: [{ id: 'r2', rule: { kind: 'required' }, dependencyPaths: ['x'] }],
        }),
        x: makeFieldNode({ path: 'x' }),
      };
      const result = buildCompiledValidationDependentMap(nodes);
      expect(result.x).toHaveLength(2);
      expect(result.x).toContain('a');
      expect(result.x).toContain('b');
    });
  });

  describe('buildCompiledValidationOrder', () => {
    it('returns empty array when nodes is undefined', () => {
      expect(buildCompiledValidationOrder(undefined, 'root')).toEqual([]);
    });

    it('returns empty array when nodes is empty', () => {
      expect(buildCompiledValidationOrder({}, 'root')).toEqual([]);
    });

    it('falls back to iterating all keys when no rootPath', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a', children: [] }),
        b: makeFieldNode({ path: 'b', children: [] }),
      };
      const result = buildCompiledValidationOrder(nodes, undefined);
      expect(result).toHaveLength(2);
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('falls back when rootPath is not in nodeMap', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a', children: [] }),
      };
      const result = buildCompiledValidationOrder(nodes, 'missing-root');
      expect(result).toEqual(['a']);
    });

    it('skips form-kind nodes from order', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        form: { path: 'form', kind: 'form', rules: [], children: ['a'] },
        a: makeFieldNode({ path: 'a', children: [] }),
      };
      expect(buildCompiledValidationOrder(nodes, 'form')).toEqual(['a']);
    });

    it('skips already-seen paths (handles cycles)', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a', children: ['b'] }),
        b: makeFieldNode({ path: 'b', children: ['a'] }),
      };
      const result = buildCompiledValidationOrder(nodes, 'a');
      expect(result).toEqual(['a', 'b']);
    });

    it('visits children in order from root', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        root: makeFieldNode({ path: 'root', children: ['c1', 'c2'] }),
        c1: makeFieldNode({ path: 'c1', children: [] }),
        c2: makeFieldNode({ path: 'c2', children: [] }),
      };
      expect(buildCompiledValidationOrder(nodes, 'root')).toEqual(['root', 'c1', 'c2']);
    });

    it('handles child path not in nodeMap gracefully', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        root: makeFieldNode({ path: 'root', children: ['missing'] }),
      };
      expect(buildCompiledValidationOrder(nodes, 'root')).toEqual(['root']);
    });
  });

  describe('buildCompiledFormValidationModel', () => {
    it('returns undefined when nodes result in empty validation order', () => {
      expect(
        buildCompiledFormValidationModel({
          behavior: defaultBehavior,
          nodes: undefined,
        }),
      ).toBeUndefined();
    });

    it('returns undefined when all nodes are form kind', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        form: { path: 'form', kind: 'form', rules: [], children: [] },
      };
      expect(
        buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes }),
      ).toBeUndefined();
    });

    it('builds model with all fields populated', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        f: makeFieldNode({ path: 'f' }),
      };
      const model = buildCompiledFormValidationModel({
        behavior: defaultBehavior,
        nodes,
        rootPath: 'f',
        defaultHiddenFieldPolicy: { validateWhenHidden: true },
      });
      expect(model).toBeDefined();
      expect(model!.order).toEqual(['f']);
      expect(model!.validationOrder).toEqual(['f']);
      expect(model!.rootPath).toBe('f');
      expect(model!.behavior).toBe(defaultBehavior);
      expect(model!.defaultHiddenFieldPolicy).toEqual({ validateWhenHidden: true });
    });
  });

  describe('getCompiledValidationTraversalOrder', () => {
    it('returns empty array when model is undefined', () => {
      expect(getCompiledValidationTraversalOrder(undefined)).toEqual([]);
    });

    it('prefers validationOrder when present', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
        b: makeFieldNode({ path: 'b' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationTraversalOrder(model)).toEqual(['a', 'b']);
    });

    it('falls back to order when validationOrder is absent', () => {
      const model = {
        order: ['x', 'y'],
        behavior: defaultBehavior,
        dependents: {},
      };
      expect(getCompiledValidationTraversalOrder(model)).toEqual(['x', 'y']);
    });
  });

  describe('getCompiledValidationDependents', () => {
    it('returns empty array when model is undefined', () => {
      expect(getCompiledValidationDependents(undefined, 'x')).toEqual([]);
    });

    it('returns dependents for a path', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({
          path: 'a',
          rules: [{ id: 'r', rule: { kind: 'required' }, dependencyPaths: ['b'] }],
        }),
        b: makeFieldNode({ path: 'b' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationDependents(model, 'b')).toEqual(['a']);
    });

    it('returns empty array for path with no dependents', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationDependents(model, 'a')).toEqual([]);
    });
  });

  describe('getCompiledValidationNode', () => {
    it('returns undefined when model is undefined', () => {
      expect(getCompiledValidationNode(undefined, 'x')).toBeUndefined();
    });

    it('returns node at path', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationNode(model, 'a')).toBe(nodes.a);
    });

    it('returns undefined for missing path', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationNode(model, 'missing')).toBeUndefined();
    });
  });

  describe('getCompiledValidationNodeMap', () => {
    it('returns undefined when model is undefined', () => {
      expect(getCompiledValidationNodeMap(undefined)).toBeUndefined();
    });

    it('returns nodes map', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(getCompiledValidationNodeMap(model)).toBe(nodes);
    });
  });

  describe('getCompiledValidationRootPath', () => {
    it('returns undefined when model is undefined', () => {
      expect(getCompiledValidationRootPath(undefined)).toBeUndefined();
    });

    it('returns rootPath from model', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({
        behavior: defaultBehavior,
        nodes,
        rootPath: 'a',
      });
      expect(getCompiledValidationRootPath(model)).toBe('a');
    });
  });

  describe('hasCompiledValidationNodes', () => {
    it('returns false when model is undefined', () => {
      expect(hasCompiledValidationNodes(undefined)).toBe(false);
    });

    it('returns false when nodes is empty', () => {
      expect(
        hasCompiledValidationNodes({
          order: [],
          behavior: defaultBehavior,
          dependents: {},
          nodes: {},
        }),
      ).toBe(false);
    });

    it('returns true when nodes exist', () => {
      const nodes: Record<string, CompiledValidationNode> = {
        a: makeFieldNode({ path: 'a' }),
      };
      const model = buildCompiledFormValidationModel({ behavior: defaultBehavior, nodes });
      expect(hasCompiledValidationNodes(model)).toBe(true);
    });

    it('returns false when nodes is undefined', () => {
      expect(
        hasCompiledValidationNodes({ order: [], behavior: defaultBehavior, dependents: {} }),
      ).toBe(false);
    });
  });
});
