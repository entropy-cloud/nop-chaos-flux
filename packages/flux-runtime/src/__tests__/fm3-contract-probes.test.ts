import { describe, expect, it } from 'vitest';
import type { FormValidationResult, ScopeRef, ValidationError } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createFormComponentHandle } from '../index.js';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as never,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {},
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {},
  };
}

function err(
  path: string,
  message: string,
  rule: ValidationError['rule'] = 'required',
): ValidationError {
  return { path, message, rule };
}

function createRequiredNameForm(id: string) {
  return createManagedFormRuntime({
    id,
    initialValues: { name: '' },
    parentScope: createStubScope(),
    validation: {
      nodes: {
        name: {
          path: 'name',
          kind: 'field',
          controlType: 'input-text',
          rules: [
            {
              id: 'name#0:required',
              rule: { kind: 'required', message: 'Name is required' },
              dependencyPaths: [],
            },
          ],
          behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
          children: [],
          parent: '',
        },
      },
      order: ['name'],
      behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
      dependents: {},
    },
    executeValidationRule: async () => undefined,
    validateRule: (_compiledRule, value) => {
      if (value === '') {
        return err('name', 'Name is required');
      }
      return undefined;
    },
  });
}

// FM-3 Phase 2 (shard B GAP 6): the handle boundary must pass through the full
// FormValidationResult (V23 rule 5) so programmatic callers can branch on
// fieldErrors{path: [...]} without re-running validation. The factory test
// above only asserts hasMethod('validate') — these probes invoke it.
describe('FM-3 GAP6: componentHandle.validate() V23 fieldErrors contract', () => {
  it('invoke(validate) returns ok:false with fieldErrors keyed by path and the errors aggregate', async () => {
    const form = createRequiredNameForm('fm3-validate-invalid');
    const handle = createFormComponentHandle(form);

    const result = await handle.capabilities!.invoke('validate', undefined, {} as never);

    expect(result.ok).toBe(false);
    const data = result.data as FormValidationResult;
    expect(data.ok).toBe(false);
    expect(data.fieldErrors).toEqual({ name: [err('name', 'Name is required')] });
    expect(data.errors).toContainEqual(err('name', 'Name is required'));
    expect(result.error).toBe(data.errors);
    expect(form.store.getState().submitAttempted).toBe(true);
  });

  it('invoke(validate) returns ok:true with an empty fieldErrors map after the value is fixed', async () => {
    const form = createRequiredNameForm('fm3-validate-valid');
    const handle = createFormComponentHandle(form);

    await handle.capabilities!.invoke('validate', undefined, {} as never);
    form.setValue('name', 'Alice');
    const result = await handle.capabilities!.invoke('validate', undefined, {} as never);

    expect(result.ok).toBe(true);
    const data = result.data as FormValidationResult;
    expect(data.ok).toBe(true);
    expect(data.fieldErrors).toEqual({});
    expect(data.errors).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});
