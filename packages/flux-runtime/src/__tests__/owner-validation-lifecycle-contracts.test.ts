import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CompiledFormValidationModel,
  CompiledValidationNode,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';
import { createScopeRef, createScopeStore } from '../scope';
import { validateRule as realValidateRule } from '../validation-runtime';

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
});
