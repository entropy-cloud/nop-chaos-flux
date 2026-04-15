import { describe, expect, it } from 'vitest';
import { createManagedFormRuntime } from '../form-runtime';
import { validateRule as realValidateRule } from '../validation-runtime';

function createStubScope() {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {}
  };
}

function createUniqueByForm() {
  return createManagedFormRuntime({
    id: 'test-form',
    initialValues: {
      contacts: [
        { email: 'a@example.com' },
        { email: 'a@example.com' }
      ]
    },
    parentScope: createStubScope(),
    validation: {
      nodes: {
        '': {
          path: '',
          kind: 'form',
          rules: [],
          children: ['contacts']
        },
        contacts: {
          path: 'contacts',
          kind: 'array',
          controlType: 'key-value',
          label: 'Contacts',
          behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
          rules: [
            {
              id: 'contacts#0:uniqueBy',
              rule: { kind: 'uniqueBy', itemPath: 'email', message: 'Emails must be unique' },
              dependencyPaths: []
            }
          ],
          children: [],
          parent: ''
        }
      },
      order: ['contacts'],
      behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
      dependents: {}
    },
    executeValidationRule: async () => undefined,
    validateRule: realValidateRule,
    submitApi: async () => ({ ok: true, data: {} })
  });
}

describe('applyChangesAndRevalidate deferred-aggregate policy', () => {
  it('does not trigger validateForm when reason is change — store commits are bounded', async () => {
    const form = createUniqueByForm();

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    await form.applyChangesAndRevalidate({
      writes: { 'contacts.0.email': 'b@example.com' },
      changedPaths: ['contacts.0.email'],
      reason: 'change'
    });

    unsubscribe();

    expect(commits).toBeLessThanOrEqual(2);
    expect(form.store.getState().fieldStates.contacts?.errors).toBeUndefined();
  });

  it('triggers full validateForm when reason is blur — uniqueBy aggregate error is published', async () => {
    const form = createUniqueByForm();

    const result = await form.applyChangesAndRevalidate({
      writes: { 'contacts.0.email': 'a@example.com' },
      changedPaths: ['contacts.0.email'],
      reason: 'blur'
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.contacts?.[0]?.rule).toBe('uniqueBy');
    expect(result.fieldErrors.contacts?.[0]?.message).toBe('Emails must be unique');
  });

  it('uniqueBy aggregate rule is not evaluated on rapid change — only on blur', async () => {
    const { vi } = await import('vitest');
    const form = createUniqueByForm();

    let validateFormCalls = 0;
    const originalValidateForm = form.validateForm.bind(form);
    vi.spyOn(form, 'validateForm').mockImplementation(async (reason) => {
      validateFormCalls += 1;
      return originalValidateForm(reason);
    });

    for (let i = 0; i < 10; i++) {
      await form.applyChangesAndRevalidate({
        writes: { 'contacts.0.email': `change${i}@example.com` },
        changedPaths: ['contacts.0.email'],
        reason: 'change'
      });
    }

    expect(validateFormCalls).toBe(0);
    expect(form.store.getState().fieldStates.contacts?.errors).toBeUndefined();

    const blurResult = await form.applyChangesAndRevalidate({
      writes: { 'contacts.0.email': 'a@example.com' },
      changedPaths: ['contacts.0.email'],
      reason: 'blur'
    });

    expect(validateFormCalls).toBe(1);
    expect(blurResult.ok).toBe(false);
    expect(blurResult.fieldErrors.contacts?.[0]?.rule).toBe('uniqueBy');
  });
});
