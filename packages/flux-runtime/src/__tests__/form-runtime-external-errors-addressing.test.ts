import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';

function makeNode(path: string, opts: { parent?: string; children?: string[] } = {}): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules: [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: opts.children ?? [],
    parent: opts.parent ?? '',
  };
}

function makeFormModel(fields: Record<string, CompiledValidationNode>): CompiledFormValidationModel {
  const nodes: Record<string, CompiledValidationNode> = {
    '': { path: '', kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
    ...fields,
  };
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes,
    rootPath: '',
  })!;
}

function makeRuntime(validation: CompiledFormValidationModel | undefined, initialValues: Record<string, any> = {}) {
  const parentStore = createScopeStore(initialValues);
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
  return createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope,
    validation,
    validateRule: realValidateRule,
    executeValidationRule: vi.fn().mockResolvedValue(undefined),
  });
}

describe('applyExternalErrors: array row/leaf/cross-container addressing (B3.2 C5)', () => {
  it('attaches a row-level error to the row object root path', () => {
    const model = makeFormModel({ items: makeNode('items') });
    const runtime = makeRuntime(model, { items: [{ sku: 'a' }, { sku: 'b' }] });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'items.1', message: 'row conflict', rule: 'required' }],
    });

    const state = runtime.getFieldState('items.1');
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBe('row conflict');
    expect(state.errors[0].sourceKind).toBe('external');
  });

  it('attaches a leaf-level error to the indexed leaf path', () => {
    const model = makeFormModel({ items: makeNode('items') });
    const runtime = makeRuntime(model, { items: [{ sku: 'a' }] });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'items.0.sku', message: 'sku taken', rule: 'required' }],
    });

    const state = runtime.getFieldState('items.0.sku');
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBe('sku taken');
  });

  it('attaches an error that crosses container/tab segments to the deep leaf path', () => {
    const model = makeFormModel({ items: makeNode('items') });
    const runtime = makeRuntime(model, {
      items: [{}, {}, { tabs: { t: { sku: 'x' } } }],
    });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'items.2.tabs.t.sku', message: 'deep', rule: 'required' }],
    });

    const state = runtime.getFieldState('items.2.tabs.t.sku');
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBe('deep');
  });

  it('does not throw and still records an error for an undefined target path', () => {
    const model = makeFormModel({ items: makeNode('items') });
    const runtime = makeRuntime(model, { items: [{ sku: 'a' }] });

    expect(() =>
      runtime.applyExternalErrors({
        sourceId: 'server',
        errors: [{ path: 'items.999.unknown', message: 'ghost', rule: 'required' }],
      }),
    ).not.toThrow();

    // The error is keyed by path and attached to field state regardless of
    // whether the target field is registered.
    const state = runtime.getFieldState('items.999.unknown');
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBe('ghost');
  });

  it('remaps indexed external error paths after an array item is removed', () => {
    const model = makeFormModel({ items: makeNode('items') });
    const runtime = makeRuntime(model, { items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'items.2.name', message: 'after-remove', rule: 'required' }],
    });

    // Remove index 0; the former items.2 shifts down to items.1.
    runtime.removeValue('items', 0);

    const shifted = runtime.getFieldState('items.1.name');
    expect(shifted.errors.some((e) => e.message === 'after-remove')).toBe(true);
    expect(runtime.getFieldState('items.2.name').errors).toHaveLength(0);
  });
});
