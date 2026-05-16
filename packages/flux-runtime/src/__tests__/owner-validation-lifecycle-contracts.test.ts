import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CompiledFormValidationModel,
  CompiledValidationNode,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';

function createStubScope(initialValues: Record<string, unknown> = {}): ScopeRef {
  const store = createScopeStore(initialValues);
  return createScopeRef({ id: 'parent', path: '$', store });
}

function makeNode(
  path: string,
  opts: { required?: boolean; async?: boolean; debounce?: number } = {},
): CompiledValidationNode {
  const rules = [] as CompiledValidationNode['rules'];

  if (opts.required) {
    rules.push({ id: `${path}#required`, rule: { kind: 'required' }, dependencyPaths: [] });
  }

  if (opts.async) {
    rules.push({
      id: `${path}#async`,
      rule: {
        kind: 'async',
        debounce: opts.debounce,
        action: { action: 'ajax', args: { url: '/validate' } },
      },
      dependencyPaths: [],
    });
  }

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
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes: {
      '': {
        path: '',
        kind: 'form',
        rules: [],
        children: Object.keys(fields),
        parent: undefined,
      },
      ...fields,
    },
    rootPath: '',
  })!;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('owner validation lifecycle contracts', () => {
  it('returns ready:false when lifecycle is transitional even without field errors', () => {
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope(),
      validation: makeFormModel({ name: makeNode('name') }),
      initialLifecycleState: 'bootstrapping',
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    expect(runtime.getScopeState()).toMatchObject({
      lifecycleState: 'bootstrapping',
      valid: true,
      ready: false,
    });
  });

  it('defers validation while lifecycle is bootstrapping until the owner becomes active', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const validateRule = vi.fn().mockReturnValue(undefined);
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: model,
      initialLifecycleState: 'bootstrapping',
      validateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const validationPromise = runtime.validateField('name');
    await Promise.resolve();
    expect(validateRule).not.toHaveBeenCalled();

    runtime.refreshCompiledModel(model);

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(validateRule).toHaveBeenCalledTimes(1);
  });

  it('returns a blocked result after disposal instead of a clean success', async () => {
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: makeFormModel({ name: makeNode('name', { required: true }) }),
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    runtime.dispose();

    await expect(runtime.validateField('name')).resolves.toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ message: expect.stringContaining('disposed') })],
    });
  });

  it('publishes sync validation errors before async validation settles', async () => {
    let resolveAsyncRule:
      | ((value: ReturnType<typeof realValidateRule> | undefined) => void)
      | undefined;
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: makeFormModel({ name: makeNode('name', { required: true, async: true }) }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockImplementation(
        async () =>
          await new Promise((resolve) => {
            resolveAsyncRule = resolve;
          }),
      ),
    });

    const validationPromise = runtime.validateField('name', 'change');

    await vi.waitFor(() => {
      expect(runtime.getFieldState('name').errors).toMatchObject([
        expect.objectContaining({ rule: 'required' }),
      ]);
      expect(runtime.getFieldState('name').validating).toBe(true);
    });

    resolveAsyncRule?.(undefined);

    await expect(validationPromise).resolves.toMatchObject({ ok: false });
    expect(runtime.getFieldState('name').errors).toMatchObject([
      expect.objectContaining({ rule: 'required' }),
    ]);
  });

  it('defers validateAll while lifecycle is bootstrapping until the owner becomes active', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const validateRule = vi.fn().mockReturnValue(undefined);
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: model,
      initialLifecycleState: 'bootstrapping',
      validateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const validationPromise = runtime.validateAll('submit');
    await Promise.resolve();
    expect(validateRule).not.toHaveBeenCalled();

    runtime.refreshCompiledModel(model);

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(validateRule).toHaveBeenCalledTimes(1);
  });

  it('defers validateSubtree while lifecycle is bootstrapping until the owner becomes active', async () => {
    const model = makeFormModel({ profile: makeNode('profile'), 'profile.name': makeNode('profile.name', { required: true }) });
    const validateRule = vi.fn().mockReturnValue(undefined);
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ profile: { name: '' } }),
      initialValues: { profile: { name: '' } },
      validation: model,
      initialLifecycleState: 'bootstrapping',
      validateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const validationPromise = runtime.validateSubtree('profile', 'commit');
    await Promise.resolve();
    expect(validateRule).not.toHaveBeenCalled();

    runtime.refreshCompiledModel(model);

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(validateRule).toHaveBeenCalledTimes(1);
  });

  it('re-reads the compiled validation model after activation before resolving validateSubtree', async () => {
    const initialModel = undefined;
    const refreshedModel = makeFormModel({
      profile: makeNode('profile'),
      'profile.name': makeNode('profile.name', { required: true }),
    });
    const validateRule = vi.fn().mockReturnValue(undefined);
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ profile: { name: '' } }),
      initialValues: { profile: { name: '' } },
      validation: initialModel,
      initialLifecycleState: 'bootstrapping',
      validateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const validationPromise = runtime.validateSubtree('profile', 'commit');
    await Promise.resolve();
    expect(validateRule).not.toHaveBeenCalled();

    runtime.refreshCompiledModel(refreshedModel);

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(validateRule).toHaveBeenCalledTimes(1);
  });

  it('treats scheduled debounced async validation as owner-level pending work', async () => {
    vi.useFakeTimers();

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: 'Alice' }),
      initialValues: { name: 'Alice' },
      validation: makeFormModel({ name: makeNode('name', { async: true, debounce: 50 }) }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const promise = runtime.validateField('name', 'blur');
    await Promise.resolve();

    expect(runtime.getScopeState()).toMatchObject({ validating: true, ready: false, valid: true });

    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(runtime.getScopeState()).toMatchObject({ validating: false, ready: true, valid: true });
  });

  it('submit supersedes lower-priority async validation and prevents stale publication', async () => {
    let releaseBlur: ((error: ReturnType<typeof realValidateRule> | undefined) => void) | undefined;
    let releaseSubmit: ((error: ReturnType<typeof realValidateRule> | undefined) => void) | undefined;
    const executeValidationRule = vi.fn().mockImplementation(async (_compiledRule, _rule, _field, _scope, signal) => {
      return await new Promise((resolve, reject) => {
        const release = (value: ReturnType<typeof realValidateRule> | undefined) => {
          if (signal?.aborted) {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
            return;
          }

          resolve(value);
        };

        if (!releaseBlur) {
          releaseBlur = release;
        } else {
          releaseSubmit = release;
        }
      });
    });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ name: 'Alice' }),
      initialValues: { name: 'Alice' },
      validation: makeFormModel({ name: makeNode('name', { async: true }) }),
      validateRule: realValidateRule,
      executeValidationRule,
      lifecycle: {
        submitAction: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }),
      },
    });

    const blurPromise = runtime.validateField('name', 'blur');
    await Promise.resolve();
    expect(runtime.getScopeState()).toMatchObject({ validating: true, ready: false });
    expect(executeValidationRule).toHaveBeenCalledTimes(1);

    const submitPromise = runtime.submit();
    await Promise.resolve();
    expect(executeValidationRule).toHaveBeenCalledTimes(2);

    releaseBlur?.({ path: 'name', rule: 'async', message: 'stale blur error' } as any);
    await Promise.resolve();

    expect(runtime.getFieldState('name').errors).toEqual([]);

    releaseSubmit?.(undefined);

    await expect(blurPromise).rejects.toMatchObject({ name: 'AbortError' });
    await expect(submitPromise).resolves.toMatchObject({ ok: true, data: { submitted: true } });
    expect(runtime.getFieldState('name').errors).toEqual([]);
    const getAsyncOwnerDebugSnapshot = runtime.getAsyncOwnerDebugSnapshot;
    expect(getAsyncOwnerDebugSnapshot).toBeTypeOf('function');
    const asyncDebugSnapshot = getAsyncOwnerDebugSnapshot?.();
    expect(asyncDebugSnapshot).toBeTruthy();
    expect(asyncDebugSnapshot).toMatchObject({
      owners: [
        expect.objectContaining({
          ownerId: 'validation:test-form:name',
          recentRuns: expect.arrayContaining([
            expect.objectContaining({ cause: 'submit' }),
            expect.objectContaining({ cause: 'blur', outcome: expect.stringMatching(/cancelled|stale-dropped/) }),
          ]),
        }),
      ],
    });
  });

  it('direct commit validateSubtree supersedes lower-priority async validation in the same subtree', async () => {
    let releaseBlur: ((error: ReturnType<typeof realValidateRule> | undefined) => void) | undefined;
    const executeValidationRule = vi.fn().mockImplementation(async (_compiledRule, _rule, field, _scope, signal) => {
      return await new Promise((resolve, reject) => {
        const release = (value: ReturnType<typeof realValidateRule> | undefined) => {
          if (signal?.aborted) {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
            return;
          }

          resolve(value);
        };

        if (field.path === 'profile.name' && !releaseBlur) {
          releaseBlur = release;
        } else {
          resolve(undefined);
        }
      });
    });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope: createStubScope({ profile: { name: 'Alice' } }),
      initialValues: { profile: { name: 'Alice' } },
      validation: makeFormModel({
        profile: makeNode('profile'),
        'profile.name': makeNode('profile.name', { async: true }),
      }),
      validateRule: realValidateRule,
      executeValidationRule,
    });

    const blurPromise = runtime.validateField('profile.name', 'blur');
    await Promise.resolve();
    expect(runtime.getScopeState()).toMatchObject({ validating: true, ready: false });

    const commitPromise = runtime.validateSubtree('profile', 'commit');
    await Promise.resolve();

    releaseBlur?.({ path: 'profile.name', rule: 'async', message: 'stale blur error' } as any);
    await Promise.resolve();

    expect(runtime.getFieldState('profile.name').errors).toEqual([]);

    await expect(blurPromise).rejects.toMatchObject({ name: 'AbortError' });
    await expect(commitPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(runtime.getFieldState('profile.name').errors).toEqual([]);
  });
});
