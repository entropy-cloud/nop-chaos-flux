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

  it('contains validateChild throw failures into the diagnostics seam instead of rejecting validateForm (FM-2 P1-2)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reportFailure = vi.fn();
    const parentStore = createScopeStore({ profile: { name: '' }, external: '' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { profile: { name: '' }, external: '' },
      parentScope,
      validation: makeFormModel({ 'profile.name': makeNode('profile.name') }),
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      reportDependentRevalidationFailure: reportFailure,
    } as never);
    runtime.registerField({
      path: 'profile',
      childPaths: ['profile.name'],
      getValue() {
        return {};
      },
      validateChild() {
        throw new Error('validator exploded');
      },
    });

    // Old behavior: the bare `await validatePath` in validateRegisteredChildren
    // rejected validateForm outright — the fourth ungated entry breaking the
    // V18/M-09 three-entry convergence contract.
    const result = await runtime.validateForm();

    expect(reportFailure).toHaveBeenCalledWith('profile.name', expect.any(Error));
    expect(result.ok).toBe(false);
    // The same throwing validator is contained on both the child pass and the
    // owner pass, so the aggregate may carry more than one seam entry — the
    // contract is: resolve instead of reject, seam reported, form-level
    // internal error present so submit stays blocked.
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('internal error'),
        sourceKind: 'form',
      }),
    );
    consoleError.mockRestore();
  });

  it('surfaces runtime child validation errors for compiled array parents at child paths', async () => {
    const parentStore = createScopeStore({ tags: ['alpha', ''] });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { tags: ['alpha', ''] },
      parentScope,
      validation: makeFormModel(
        {
          tags: {
            path: 'tags',
            kind: 'array',
            controlType: 'array-field',
            rules: [],
            behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
            children: [],
            parent: '',
          },
        },
        { rootPath: '' },
      ),
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const handle = runtime.registerField({
      path: 'tags',
      childPaths: ['tags.0', 'tags.1'],
      getValue() {
        return runtime.scope.get('tags');
      },
      validateChild(childPath) {
        const value = runtime.scope.get(childPath);
        if (typeof value === 'string' && value.trim().length > 0) {
          return [];
        }

        return [{ path: childPath, rule: 'required', message: 'Tag is required' }];
      },
    });

    expect(handle.accepted).toBe(true);

    const result = await runtime.validateForm('submit');
    expect(result.ok).toBe(false);
    expect(result.fieldErrors['tags.1']).toMatchObject([
      expect.objectContaining({ path: 'tags.1', message: 'Tag is required' }),
    ]);
    expect(runtime.getFieldState('tags.1').errors).toMatchObject([
      expect.objectContaining({ path: 'tags.1', message: 'Tag is required' }),
    ]);
  });

  it('clears stale registration errors when a runtime field unregisters', async () => {
    const runtime = makeRuntime('');
    const handle = runtime.registerField({
      path: 'email',
      getValue() {
        return '';
      },
      validate() {
        return [{ path: 'email', rule: 'required', message: 'Email is invalid' }];
      },
    });

    const firstResult = await runtime.validateForm('submit');
    expect(firstResult.fieldErrors.email).toMatchObject([
      expect.objectContaining({ path: 'email', message: 'Email is invalid' }),
    ]);

    handle.unregister();

    expect(runtime.getFieldState('email').errors).toEqual([]);

    const secondResult = await runtime.validateForm('submit');
    expect(secondResult.fieldErrors.email).toBeUndefined();
    expect(secondResult.errors).not.toContainEqual(
      expect.objectContaining({ path: 'email', message: 'Email is invalid' }),
    );
  });
});

// FM-010: the fifth and sixth ungated validation-convergence entries. The
// change branch of applyChangesAndRevalidate awaited validateField bare, and
// notifyFieldHidden's show branch fired revalidateSubtree fire-and-forget —
// both reject the V18/M-09 seam contract when an async validator explodes.
describe('FM-010 convergence entries', () => {
  function makeSeamRuntime(reportFailure: ReturnType<typeof vi.fn>) {
    return createManagedFormRuntime({
      id: 'test-form',
      initialValues: { email: 'a@example.com' },
      parentScope: createScopeRef({
        id: 'parent',
        path: '$',
        store: createScopeStore({ email: 'a@example.com' }),
      }),
      validation: makeFormModel({ email: makeNode('email', { required: true }) }),
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      reportDependentRevalidationFailure: reportFailure,
    } as never);
  }

  it('contains a throwing change-branch validateField into the seam instead of rejecting applyChangesAndRevalidate', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reportFailure = vi.fn();
    const runtime = makeSeamRuntime(reportFailure);
    vi.spyOn(runtime, 'validateField').mockRejectedValue(new Error('field validator exploded'));

    const result = await runtime.applyChangesAndRevalidate({
      writes: { email: 'b@example.com' },
      changedPaths: ['email'],
      reason: 'change',
    });

    expect(reportFailure).toHaveBeenCalledWith('email', expect.any(Error));
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('internal error'),
        sourceKind: 'form',
      }),
    );
    consoleError.mockRestore();
  });

  it('still rethrows AbortError from the change-branch validateField', async () => {
    const reportFailure = vi.fn();
    const runtime = makeSeamRuntime(reportFailure);
    vi.spyOn(runtime, 'validateField').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );

    await expect(
      runtime.applyChangesAndRevalidate({
        writes: { email: 'b@example.com' },
        changedPaths: ['email'],
        reason: 'change',
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('routes notifyFieldHidden show-branch revalidation failures into the seam instead of an unhandled rejection', async () => {
    const reportFailure = vi.fn();
    const runtime = makeSeamRuntime(reportFailure);
    vi.spyOn(runtime, 'validateSubtree').mockRejectedValue(new Error('subtree exploded'));

    runtime.notifyFieldHidden('email', true);
    runtime.notifyFieldHidden('email', false);

    await vi.waitFor(() => {
      expect(reportFailure).toHaveBeenCalledWith('email', expect.any(Error));
    });
  });
});
