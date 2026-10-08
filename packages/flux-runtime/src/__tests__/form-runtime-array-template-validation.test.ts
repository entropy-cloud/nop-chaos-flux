import { describe, expect, it } from 'vitest';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef } from '../scope.js';
import { validateRule } from '../validation-runtime.js';
import type { CompiledFormValidationModel } from '@nop-chaos/flux-core';

// Plan 550 (IS-7a batch) / IS-combo-editor-001 + IS-business-document-002:
// array row child rules (combo items, input-table rows) compile under the
// TEMPLATE path (`lines.name`) because row instances only exist at runtime.
// Submit validation must expand the template to the current item instances —
// validating the template path directly reads a scope location that never
// exists and failed every submit with a false required error.
describe('plan550 array template child validation', () => {
  const model: CompiledFormValidationModel = {
    order: ['lines', 'lines.name'],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    dependents: {},
    nodes: {
      '': { path: '', kind: 'form', rules: [], children: ['lines'], parent: undefined },
      lines: {
        path: 'lines',
        kind: 'array',
        controlType: 'combo',
        rules: [],
        children: ['lines.name'],
        parent: '',
      },
      'lines.name': {
        path: 'lines.name',
        kind: 'field',
        controlType: 'input-text',
        label: 'Name',
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        rules: [
          {
            id: 'lines.name#0:required',
            rule: { kind: 'required', message: 'Name is required' },
            dependencyPaths: [],
            precompiled: undefined,
          },
        ],
        children: [],
        parent: 'lines',
      },
    },
    rootPath: '',
  };

  function createForm(initialValues: Record<string, unknown>) {
    const parentScope = createScopeRef({ id: 'parent', path: '$root', initialData: {} });
    const form = createManagedFormRuntime({
      id: 'f',
      initialValues,
      parentScope,
      validation: model,
      executeValidationRule: async () => undefined,
      validateRule,
    });
    return { form, parentScope };
  }

  it('valid rows pass submit validation', async () => {
    const { form } = createForm({ lines: [{ name: '张三' }, { name: '李四' }] });
    const result = await form.validateForm('submit');
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('an empty row child fails with an instance path', async () => {
    const { form } = createForm({ lines: [{ name: '张三' }, { name: '' }] });
    const result = await form.validateForm('submit');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.path).toBe('lines.1.name');
  });
});
