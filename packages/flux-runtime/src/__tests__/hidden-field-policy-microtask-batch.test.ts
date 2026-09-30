import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createFormStore } from '../form-store.js';
import { createScopeRef, createScopeStore } from '../scope.js';

function makeNode(
  path: string,
  opts: {
    parent?: string;
    children?: string[];
    hiddenFieldPolicy?: CompiledValidationNode['hiddenFieldPolicy'];
    required?: boolean;
  } = {},
): CompiledValidationNode {
  const rules = opts.required
    ? [{ id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [] }]
    : [];

  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules,
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: opts.children ?? [],
    parent: opts.parent ?? '',
    hiddenFieldPolicy: opts.hiddenFieldPolicy,
  };
}

function makeFormModel(
  fields: Record<string, CompiledValidationNode>,
  defaultHiddenFieldPolicy?: CompiledFormValidationModel['defaultHiddenFieldPolicy'],
): CompiledFormValidationModel {
  const nodes: Record<string, CompiledValidationNode> = {
    '': { path: '', kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
    ...fields,
  };

  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes,
    rootPath: '',
    defaultHiddenFieldPolicy,
  })!;
}

function makeRuntime(
  validation: CompiledFormValidationModel | undefined,
  initialValues: Record<string, any> = {},
  options: { existingStore?: ReturnType<typeof createFormStore> } = {},
) {
  const parentStore = createScopeStore(initialValues);
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

  const validateRule = vi.fn().mockReturnValue(undefined);
  const executeValidationRule = vi.fn().mockResolvedValue(undefined);

  const runtime = createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope,
    validation,
    validateRule,
    executeValidationRule,
    ...(options.existingStore ? { existingStore: options.existingStore } : {}),
  });

  return { runtime, validateRule };
}

describe('notifyFieldHidden microtask batching', () => {
  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

  async function makeFieldsWithErrors(paths: string[]) {
    const fields = Object.fromEntries(
      paths.map((path) => [path, makeNode(path, { required: true })]),
    );
    const model = makeFormModel(fields);
    const baseStore = createFormStore({});
    const batchUpdateSpy = vi.spyOn(baseStore, 'batchUpdate');
    const { runtime, validateRule } = makeRuntime(model, {}, { existingStore: baseStore });

    validateRule.mockImplementation((compiledRule: { id: string }) => ({
      path: compiledRule.id.split('#')[0],
      message: 'Required',
      rule: 'required',
    }));

    for (const path of paths) {
      await runtime.validateField(path);
    }
    for (const path of paths) {
      expect(runtime.getError(path)).toBeTruthy();
    }

    return { runtime, batchUpdateSpy, validateRule };
  }

  it('merges same-frame hidden flips of multiple fields into one store commit', async () => {
    const { runtime, batchUpdateSpy } = await makeFieldsWithErrors(['a', 'b', 'c']);

    batchUpdateSpy.mockClear();
    runtime.notifyFieldHidden('a', true);
    runtime.notifyFieldHidden('b', true);
    runtime.notifyFieldHidden('c', true);
    await flushMicrotasks();

    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);
    for (const path of ['a', 'b', 'c']) {
      expect(runtime.getError(path)).toBeUndefined();
    }
  });

  it('batched terminal state equals sequential per-field flips', async () => {
    const sequential = await makeFieldsWithErrors(['x', 'y']);
    sequential.runtime.notifyFieldHidden('x', true);
    await flushMicrotasks();
    sequential.runtime.notifyFieldHidden('y', true);
    await flushMicrotasks();
    const sequentialState = {
      x: sequential.runtime.getFieldState('x'),
      y: sequential.runtime.getFieldState('y'),
    };

    const batched = await makeFieldsWithErrors(['x', 'y']);
    batched.runtime.notifyFieldHidden('x', true);
    batched.runtime.notifyFieldHidden('y', true);
    await flushMicrotasks();
    const batchedState = {
      x: batched.runtime.getFieldState('x'),
      y: batched.runtime.getFieldState('y'),
    };

    expect(batchedState).toEqual(sequentialState);
  });

  it('hide followed by unmount-cleanup unhide in the same frame converges to the sequential terminal state', async () => {
    const { runtime, validateRule } = await makeFieldsWithErrors(['a']);

    // Mirror the sequential flow: hide (deferred clear), unhide (triggers
    // revalidation), flush. With validation passing after unhide, the cleared
    // errors must not resurrect — same terminal state as hide → flush → unhide.
    validateRule.mockReturnValue(undefined);

    runtime.notifyFieldHidden('a', true);
    runtime.notifyFieldHidden('a', false);
    await flushMicrotasks();

    expect(runtime.getError('a')).toBeUndefined();
  });
});
