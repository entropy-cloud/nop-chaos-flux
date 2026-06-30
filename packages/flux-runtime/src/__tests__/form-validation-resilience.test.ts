import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';

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

  it('routes a throwing field validation through the diagnostics seam and writes no field error (V18 convergence)', async () => {
    const parentStore = createScopeStore({ a: '', b: 'ok' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

    const syncCalls: string[] = [];
    const reportFailure = vi.fn();

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
      reportDependentRevalidationFailure: reportFailure,
    });

    const result = await runtime.validateForm();

    expect(syncCalls).toContain('a');
    expect(syncCalls).toContain('b');
    expect(result).toBeDefined();
    expect(result.ok).toBe(false);
    // V18: the throwing field no longer receives a misleading field-addressed error
    expect(result.fieldErrors['a']).toBeUndefined();
    expect(runtime.getFieldState('a').errors).toEqual([]);
    // the failure is routed through the owner diagnostics seam instead
    expect(reportFailure).toHaveBeenCalledWith('a', expect.any(Error));
    // the form-level internal-error is still carried so submit stays blocked
    expect(result.errors.some((e) => e.sourceKind === 'form' && e.rule === 'async')).toBe(true);
  });

  it('normalizes non-Error thrown values into Error instances', async () => {
    const parentStore = createScopeStore({ a: '' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const reportFailure = vi.fn();

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '' },
      parentScope,
      validation: makeFormModel({
        a: makeNode('a', true),
      }),
      validateRule(_compiledRule: any, _value: any, _field: any) {
        throw 'string-error-value';
      },
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      reportDependentRevalidationFailure: reportFailure,
    });

    const result = await runtime.validateForm();

    expect(result).toBeDefined();
    expect(result.ok).toBe(false);
    expect(result.fieldErrors['a']).toBeUndefined();
    // the non-Error thrown value is normalized to an Error (preserving the original
    // payload on `cause`) by validateCompiledField before reaching the owner catch
    expect(reportFailure).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ message: 'string-error-value', cause: 'string-error-value' }),
    );
  });
});

describe('M-09: applyChangesAndRevalidate converges dependent-revalidation failures on the diagnostics seam', () => {
  function makeDependentNode(path: string, dependencyPath: string): CompiledValidationNode {
    return {
      path,
      kind: 'field',
      controlType: 'input-text',
      rules: [
        { id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [dependencyPath] },
      ],
      behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
      children: [],
      parent: '',
    };
  }

  it('routes a throwing dependent revalidation through reportDependentRevalidationFailure and resolves (not rejects) with a form-level error', async () => {
    const parentStore = createScopeStore({ a: '', b: '' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const reportFailure = vi.fn();

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '', b: '' },
      parentScope,
      validation: makeFormModel({
        a: makeNode('a'),
        b: makeDependentNode('b', 'a'),
      }),
      validateRule(_compiledRule: any, _value: any, field: any) {
        if (field.path === 'b') {
          throw new Error('b validation crashed');
        }
        return undefined;
      },
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      reportDependentRevalidationFailure: reportFailure,
    });

    // `b` depends on `a`; changing `a` triggers revalidateDependents('a') which
    // validates `b` and throws. Before the M-09 fix this entry rejected bare.
    const result = await runtime.applyChangesAndRevalidate({
      writes: { a: 'filled' },
      changedPaths: ['a'],
      reason: 'change',
    });

    expect(result).toBeDefined();
    expect(result.ok).toBe(false);
    expect(reportFailure).toHaveBeenCalledWith('a', expect.any(Error));
    // the form-level internal error is carried so submit stays blocked
    expect(
      result.errors.some(
        (e) => e.sourceKind === 'form' && e.rule === 'async' && e.path === 'a',
      ),
    ).toBe(true);
  });
});
