import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';

function makeNode(
  path: string,
  opts: { parent?: string; children?: string[]; required?: boolean } = {},
): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules: opts.required
      ? [{ id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [] }]
      : [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: opts.children ?? [],
    parent: opts.parent ?? '',
  };
}

function makeFormModel(
  fields: Record<string, CompiledValidationNode>,
  opts: { rootPath?: string } = {},
): CompiledFormValidationModel {
  const rootPath = opts.rootPath ?? '';
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes: {
      [rootPath]: {
        path: rootPath,
        kind: 'form',
        rules: [],
        children: Object.keys(fields),
        parent: undefined,
      },
      ...fields,
    },
    rootPath,
  })!;
}

function makeRuntime(rootPath = 'profile') {
  const parentStore = createScopeStore({ profile: { name: '' }, external: '' });
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

  return createManagedFormRuntime({
    id: 'test-form',
    initialValues: { profile: { name: '' }, external: '' },
    parentScope,
    validation: makeFormModel({ 'profile.name': makeNode('profile.name') }, { rootPath }),
    validateRule: vi.fn().mockReturnValue(undefined),
    executeValidationRule: vi.fn().mockResolvedValue(undefined),
  });
}

describe('owner registration containment contracts', () => {
  it('returns accepted:true and a registrationId for a new registration', () => {
    const runtime = makeRuntime('');
    const handle = runtime.registerField({
      path: 'name',
      getValue() {
        return '';
      },
    });

    expect(handle.accepted).toBe(true);
    expect(typeof handle.registrationId).toBe('string');
    expect(handle.registrationId.length).toBeGreaterThan(0);
  });

  it('duplicate-path registration returns accepted:false', () => {
    const runtime = makeRuntime('');
    const first = runtime.registerField({ path: 'name', getValue: () => '' });
    const second = runtime.registerField({ path: 'name', getValue: () => '' });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
  });

  it('rejects registration paths outside the owner subtree before mutating participation maps', async () => {
    const runtime = makeRuntime();
    const handle = runtime.registerField({
      path: 'external',
      getValue() {
        return '';
      },
      validate() {
        return [{ path: 'external', rule: 'required', message: 'foreign' }];
      },
    });

    expect(handle.accepted).toBe(false);

    const result = await runtime.validateForm();
    expect(result.fieldErrors.external).toBeUndefined();
    expect(runtime.getFieldState('external').errors).toEqual([]);
  });

  it('rejects registration childPaths outside the owner subtree', async () => {
    const runtime = makeRuntime();
    const handle = runtime.registerField({
      path: 'profile',
      childPaths: ['profile.name', 'external'],
      getValue() {
        return {};
      },
      validateChild(childPath) {
        return [{ path: childPath, rule: 'required', message: 'foreign child' }];
      },
    });

    expect(handle.accepted).toBe(false);

    const result = await runtime.validateForm();
    expect(result.fieldErrors.external).toBeUndefined();
  });

  it('ignores childPath updates that escape the owner subtree', async () => {
    const runtime = makeRuntime();
    const handle = runtime.registerField({
      path: 'profile',
      childPaths: ['profile.name'],
      getValue() {
        return {};
      },
      validateChild(childPath) {
        return [{ path: childPath, rule: 'required', message: 'child error' }];
      },
    });

    expect(handle.accepted).toBe(true);
    runtime.updateFieldRegistration(handle.registrationId, {
      childPaths: ['profile.name', 'external'],
    });

    const result = await runtime.validateForm();
    expect(result.fieldErrors['profile.name']).toMatchObject([
      expect.objectContaining({ path: 'profile.name' }),
    ]);
    expect(result.fieldErrors.external).toBeUndefined();
  });
});
