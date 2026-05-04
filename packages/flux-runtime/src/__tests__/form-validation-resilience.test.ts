import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';
import { createScopeRef, createScopeStore } from '../scope';

function makeNode(path: string, required = false): CompiledValidationNode {
  const rules = required
    ? [{ id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [] }]
    : [];

  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules,
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: [],
    parent: '',
  };
}

function makeFormModel(
  fields: Record<string, CompiledValidationNode>,
): CompiledFormValidationModel {
  const nodes: Record<string, CompiledValidationNode> = {
    '': {
      path: '',
      kind: 'form',
      rules: [],
      children: Object.keys(fields),
      parent: undefined,
    },
    ...fields,
  };

  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes,
    rootPath: '',
  })!;
}

describe('Form validation resilience (Promise.allSettled)', () => {
  it('captures sync errors from fields that pass alongside fields that fail', async () => {
    const parentStore = createScopeStore({ a: '', b: '' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

    const syncCalls: string[] = [];

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '', b: '' },
      parentScope,
      validation: makeFormModel({
        a: makeNode('a', true),
        b: makeNode('b', true),
      }),
      validateRule(compiledRule: any, _value: any, field: any) {
        syncCalls.push(field.path);
        if (field.path === 'a') {
          return { path: 'a', rule: 'required', message: 'Required' };
        }
        return undefined;
      },
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runtime.validateForm();

    expect(syncCalls).toContain('a');
    expect(syncCalls).toContain('b');
    expect(result.ok).toBe(false);
    expect(result.fieldErrors['a']).toBeDefined();
  });

  it('does not throw when one field validation rejects inside Promise.allSettled', async () => {
    const parentStore = createScopeStore({ a: '', b: 'ok' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

    const syncCalls: string[] = [];

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '', b: 'ok' },
      parentScope,
      validation: makeFormModel({
        a: makeNode('a', true),
        b: makeNode('b', true),
      }),
      validateRule(compiledRule: any, _value: any, field: any) {
        syncCalls.push(field.path);
        if (field.path === 'a') {
          throw new Error('Sync validation crashed');
        }
        return undefined;
      },
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runtime.validateForm();

    expect(syncCalls).toContain('a');
    expect(syncCalls).toContain('b');
    expect(result).toBeDefined();
  });
});
