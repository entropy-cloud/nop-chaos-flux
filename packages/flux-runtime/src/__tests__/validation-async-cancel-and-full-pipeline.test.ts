import { describe, expect, it, vi } from 'vitest';
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

function makeAsyncNode(path: string): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules: [
      {
        id: `${path}#async`,
        rule: {
          kind: 'async',
          action: { action: 'ajax', args: { url: '/validate' } },
        },
        dependencyPaths: [],
      },
    ],
    behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched', 'submit'] },
    children: [],
    parent: '',
  };
}

function makePipelineNode(path: string): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules: [
      {
        id: `${path}#required`,
        rule: { kind: 'required', message: 'required' },
        dependencyPaths: [],
      },
      {
        id: `${path}#minLength`,
        rule: { kind: 'minLength', value: 3, message: 'minLength 3' },
        dependencyPaths: [],
      },
      {
        id: `${path}#pattern`,
        rule: { kind: 'pattern', value: '^\\d+$', message: 'digits only' },
        dependencyPaths: [],
      },
    ],
    behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched', 'submit'] },
    children: [],
    parent: '',
  };
}

function makeFormModel(fields: Record<string, CompiledValidationNode>): CompiledFormValidationModel {
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched', 'submit'] },
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

function errorRules(errors: { rule: string }[] | undefined): string[] {
  return (errors ?? []).map((e) => e.rule).sort();
}

describe('V16: stale async run does not publish; "cancelled" never appears as a user-visible field error', () => {
  it('drops a stale async error and never surfaces a "cancelled" string as a field error message', async () => {
    let resolveFirst: ((error: unknown) => void) | undefined;
    const form = createManagedFormRuntime({
      id: 'v16-form',
      parentScope: createStubScope({ name: 'alice' }),
      initialValues: { name: 'alice' },
      validation: makeFormModel({ name: makeAsyncNode('name') }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockImplementation(
        async () =>
          await new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      ),
    });

    const firstValidation = form.validateField('name', 'change');

    await vi.waitFor(() => {
      expect(resolveFirst).toBeTypeOf('function');
    });

    form.setValue('name', 'alice-2');

    resolveFirst?.({
      path: 'name',
      rule: 'async',
      message: 'stale error from the superseded run',
    });

    await expect(firstValidation).resolves.toMatchObject({ ok: true, errors: [] });
    expect(form.getError('name')).toBeUndefined();

    const snapshot = form.getAsyncOwnerDebugSnapshot?.();
    expect(snapshot).toMatchObject({
      owners: [
        expect.objectContaining({
          ownerKind: 'validation',
          ownerId: `validation:${form.scope.id}:name`,
          recentRuns: expect.arrayContaining([
            expect.objectContaining({
              outcome: expect.stringMatching(/cancelled|stale-dropped/),
            }),
          ]),
        }),
      ],
    });

    const fieldStates = form.store.getState().fieldStates;
    for (const fieldState of Object.values(fieldStates)) {
      for (const error of fieldState?.errors ?? []) {
        expect(error.message.toLowerCase()).not.toContain('cancel');
        expect(error.message.toLowerCase()).not.toContain('stale');
      }
    }
  });
});

describe('V22: required+minLength+pattern run as one full pipeline across all entries; no required-only weakening', () => {
  function makeForm(initial: Record<string, unknown>) {
    return createManagedFormRuntime({
      id: 'v22-form',
      parentScope: createStubScope(initial),
      initialValues: initial,
      validation: makeFormModel({ code: makePipelineNode('code') }),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });
  }

  it.each([
    ['validateAt(manual)', (form: ReturnType<typeof makeForm>) => form.validateAt('code', 'manual')],
    ['validateForm (owner-wide / action entry)', (form: ReturnType<typeof makeForm>) => form.validateForm()],
    ['submit', (form: ReturnType<typeof makeForm>) => form.submit()],
  ] as const)('%s runs every rule; a non-empty value still reports minLength+pattern (no required-only short-circuit)', async (_label, run) => {
    const form = makeForm({ code: 'ab' });
    await run(form);

    expect(errorRules(form.getFieldState('code').errors)).toEqual(['minLength', 'pattern']);
  });

  it.each([
    ['validateAt(manual)', (form: ReturnType<typeof makeForm>) => form.validateAt('code', 'manual')],
    ['validateForm (owner-wide / action entry)', (form: ReturnType<typeof makeForm>) => form.validateForm()],
    ['submit', (form: ReturnType<typeof makeForm>) => form.submit()],
  ] as const)('%s runs every rule; an empty value reports required+minLength (required does not suppress minLength)', async (_label, run) => {
    const form = makeForm({ code: '' });
    await run(form);

    expect(errorRules(form.getFieldState('code').errors)).toEqual(['minLength', 'required']);
  });

  it('a fully-valid value reports no errors through every entry', async () => {
    for (const run of [
      (form: ReturnType<typeof makeForm>) => form.validateAt('code', 'manual'),
      (form: ReturnType<typeof makeForm>) => form.validateForm(),
      (form: ReturnType<typeof makeForm>) => form.submit(),
    ] as const) {
      const form = makeForm({ code: '123' });
      await run(form);
      expect(form.getFieldState('code').errors).toEqual([]);
    }
  });
});
