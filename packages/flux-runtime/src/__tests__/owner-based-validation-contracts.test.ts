import { describe, expect, it, vi } from 'vitest';
import type { ChildValidationContractRegistration, ChildValidationMode, CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';
import { createScopeRef, createScopeStore } from '../scope';
import { validateRule as realValidateRule } from '../validation-runtime';

function makeMockChildContract(
  childOwnerId: string,
  mode: ChildValidationMode,
  active: boolean,
  overrides: Partial<ChildValidationContractRegistration> = {}
): ChildValidationContractRegistration {
  return {
    childOwnerId,
    mode,
    active,
    unregister: overrides.unregister ?? (() => {}),
    getState: overrides.getState ?? (() => ({ ready: true, validating: false, valid: true, hasErrors: false })),
    triggerValidation: overrides.triggerValidation ?? (() => Promise.resolve({ ok: true, errors: [] }))
  };
}

function makeNode(
  path: string,
  opts: {
    parent?: string;
    children?: string[];
    required?: boolean;
  } = {}
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
    parent: opts.parent ?? ''
  };
}

function makeFormModel(
  fields: Record<string, CompiledValidationNode>
): CompiledFormValidationModel {
  const nodes: Record<string, CompiledValidationNode> = {
    '': { path: '', kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
    ...fields
  };

  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes,
    rootPath: ''
  })!;
}

function makeRuntime(
  validation: CompiledFormValidationModel | undefined,
  initialValues: Record<string, any> = {}
) {
  const parentStore = createScopeStore(initialValues);
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

  const validateRule = vi.fn().mockReturnValue(undefined);
  const executeValidationRule = vi.fn().mockResolvedValue(undefined);
  const submitApi = vi.fn().mockResolvedValue({ ok: true });

  const runtime = createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope,
    validation,
    validateRule,
    executeValidationRule,
    submitApi
  });

  return { runtime, validateRule, executeValidationRule };
}

function makeRuntimeReal(
  validation: CompiledFormValidationModel | undefined,
  initialValues: Record<string, any> = {}
) {
  const parentStore = createScopeStore(initialValues);
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

  const executeValidationRule = vi.fn().mockResolvedValue(undefined);
  const submitApi = vi.fn().mockResolvedValue({ ok: true });

  const runtime = createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope,
    validation,
    validateRule: realValidateRule,
    executeValidationRule,
    submitApi
  });

  return { runtime, executeValidationRule };
}

describe('FieldRegistrationHandle - registrationId identity', () => {
  it('returns accepted:true and a registrationId for a new registration', () => {
    const { runtime } = makeRuntime(undefined);
    const handle = runtime.registerField({
      path: 'name',
      getValue() { return ''; }
    });

    expect(handle.accepted).toBe(true);
    expect(typeof handle.registrationId).toBe('string');
    expect(handle.registrationId.length).toBeGreaterThan(0);
  });

  it('unregister removes the field from the form', async () => {
    const validateRule = vi.fn().mockReturnValue({ path: 'name', rule: 'required', message: 'Required' });
    const parentStore = createScopeStore({});
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope,
      validateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      submitApi: vi.fn().mockResolvedValue({ ok: true })
    });

    const handle = runtime.registerField({
      path: 'name',
      getValue() { return ''; },
      validate() { return [{ path: 'name', rule: 'required', message: 'Required' }]; }
    });

    expect(handle.accepted).toBe(true);
    handle.unregister();

    const result = await runtime.validateForm();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('duplicate-path registration returns accepted:false', () => {
    const { runtime } = makeRuntime(undefined);

    const h1 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    const h2 = runtime.registerField({ path: 'name', getValue() { return ''; } });

    expect(h1.accepted).toBe(true);
    expect(h2.accepted).toBe(false);
    expect(h2.registrationId).toBe('');
  });

  it('duplicate-path after unregister is allowed', () => {
    const { runtime } = makeRuntime(undefined);

    const h1 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    h1.unregister();

    const h2 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(h2.accepted).toBe(true);
  });

  it('stale unregister does not affect a newer registration', () => {
    const { runtime } = makeRuntime(undefined);

    const h1 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    h1.unregister();

    const h2 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(h2.accepted).toBe(true);

    h1.unregister();
    const h3 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(h3.accepted).toBe(false);
  });
});

describe('updateFieldRegistration', () => {
  it('updates registration by registrationId', () => {
    const { runtime } = makeRuntime(undefined);

    const h = runtime.registerField({
      path: 'items',
      childPaths: ['items.0'],
      getValue() { return []; }
    });

    expect(h.accepted).toBe(true);
    runtime.updateFieldRegistration(h.registrationId, { childPaths: ['items.0', 'items.1'] });
  });

  it('ignores unknown registrationId', () => {
    const { runtime } = makeRuntime(undefined);
    expect(() => runtime.updateFieldRegistration('unknown-id', { childPaths: [] })).not.toThrow();
  });
});

describe('getScopeState', () => {
  it('returns lifecycleState:active by default', () => {
    const { runtime } = makeRuntime(undefined);
    const state = runtime.getScopeState();
    expect(state.lifecycleState).toBe('active');
  });

  it('returns valid:true when no errors', () => {
    const { runtime } = makeRuntime(undefined);
    const state = runtime.getScopeState();
    expect(state.valid).toBe(true);
    expect(state.hasErrors).toBe(false);
    expect(state.ready).toBe(true);
  });

  it('returns valid:false when errors exist', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const { runtime } = makeRuntimeReal(model, {});

    await runtime.validateField('name');
    const state = runtime.getScopeState();
    expect(state.valid).toBe(false);
    expect(state.hasErrors).toBe(true);
    expect(state.ready).toBe(false);
  });

  it('modelGeneration starts at 1', () => {
    const { runtime } = makeRuntime(undefined);
    expect(runtime.getScopeState().modelGeneration).toBe(1);
  });
});

describe('isPathOwned', () => {
  it('returns true for rootPath', () => {
    const { runtime } = makeRuntime(makeFormModel({ name: makeNode('name') }));
    expect(runtime.isPathOwned('')).toBe(true);
  });

  it('returns true for paths under root', () => {
    const { runtime } = makeRuntime(makeFormModel({ name: makeNode('name') }));
    expect(runtime.isPathOwned('name')).toBe(true);
    expect(runtime.isPathOwned('nested.path')).toBe(true);
  });
});

describe('getFieldState', () => {
  it('returns empty errors when no validation', () => {
    const { runtime } = makeRuntime(undefined);
    const state = runtime.getFieldState('name');
    expect(state.ownerId).toBe('test-form');
    expect(state.path).toBe('name');
    expect(state.errors).toHaveLength(0);
    expect(state.validating).toBe(false);
  });
});

describe('applyExternalErrors', () => {
  it('injects external errors into field state', () => {
    const { runtime } = makeRuntime(undefined);
    const snapshot = runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'email', rule: 'email', message: 'Email already taken' }]
    });

    expect(snapshot.hasErrors).toBe(true);
    expect(snapshot.valid).toBe(false);
    const fieldState = runtime.getFieldState('email');
    expect(fieldState.errors).toHaveLength(1);
    expect(fieldState.errors[0].sourceKind).toBe('external');
  });

  it('replace:true replaces previous external errors from same sourceId', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'email', rule: 'email', message: 'Email already taken' }]
    });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'username', rule: 'required', message: 'Username reserved' }],
      replace: true
    });

    const emailState = runtime.getFieldState('email');
    const usernameState = runtime.getFieldState('username');
    expect(usernameState.errors).toHaveLength(1);
    expect(emailState.errors.filter((e) => e.sourceKind === 'external')).toHaveLength(0);
  });

  it('clears external errors on value write for that path', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'email', rule: 'email', message: 'Already taken' }]
    });

    expect(runtime.getFieldState('email').errors).toHaveLength(1);

    runtime.setValue('email', 'new@example.com');

    expect(runtime.getFieldState('email').errors).toHaveLength(0);
  });
});

describe('canSubmit and allTouched', () => {
  it('canSubmit is true when no errors and not validating', () => {
    const { runtime } = makeRuntime(undefined);
    expect(runtime.canSubmit).toBe(true);
  });

  it('canSubmit is false when errors exist', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const { runtime } = makeRuntimeReal(model, {});
    await runtime.validateField('name');
    expect(runtime.canSubmit).toBe(false);
  });

  it('allTouched is true when no validation model', () => {
    const { runtime } = makeRuntime(undefined);
    expect(runtime.allTouched).toBe(true);
  });

  it('allTouched is false when fields not touched', () => {
    const model = makeFormModel({ name: makeNode('name') });
    const { runtime } = makeRuntime(model);
    expect(runtime.allTouched).toBe(false);
  });
});

describe('getScopeRootErrors', () => {
  it('returns empty by default', () => {
    const { runtime } = makeRuntime(undefined);
    expect(runtime.getScopeRootErrors()).toHaveLength(0);
  });
});

describe('child contract registration', () => {
  it('can register and unregister a child contract', () => {
    const { runtime } = makeRuntime(undefined);
    let unregistered = false;

    runtime.registerChildContract(
      makeMockChildContract('child-form-1', 'summary-gate', true, {
        unregister() {
          unregistered = true;
        }
      })
    );

    runtime.unregisterChildContract('child-form-1');
    expect(unregistered).toBe(false);
  });

  it('unregisterChildContract silently handles missing id', () => {
    const { runtime } = makeRuntime(undefined);
    expect(() => runtime.unregisterChildContract('nonexistent')).not.toThrow();
  });
});

describe('lifecycleState transitions', () => {
  it('starts as active', () => {
    const { runtime } = makeRuntime(undefined);
    expect(runtime.lifecycleState).toBe('active');
  });

  it('transitions to disposed after dispose()', () => {
    const { runtime } = makeRuntime(undefined);
    runtime.dispose();
    expect(runtime.lifecycleState).toBe('disposed');
  });

  it('disposed runtime rejects new registrations', () => {
    const { runtime } = makeRuntime(undefined);
    runtime.dispose();
    const handle = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(handle.accepted).toBe(false);
  });

  it('disposed runtime does not accept validation calls', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const { runtime } = makeRuntime(model);
    runtime.dispose();
    const result = await runtime.validateField('name');
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('refreshCompiledModel', () => {
  it('increments modelGeneration', () => {
    const model1 = makeFormModel({ name: makeNode('name') });
    const model2 = makeFormModel({ name: makeNode('name'), email: makeNode('email') });
    const { runtime } = makeRuntime(model1);

    expect(runtime.modelGeneration).toBe(1);
    runtime.refreshCompiledModel(model2);
    expect(runtime.modelGeneration).toBe(2);
    runtime.refreshCompiledModel(model1);
    expect(runtime.modelGeneration).toBe(3);
  });

  it('clears all registrations after refresh', () => {
    const model1 = makeFormModel({ name: makeNode('name') });
    const { runtime } = makeRuntime(model1);

    const h1 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(h1.accepted).toBe(true);

    const model2 = makeFormModel({ name: makeNode('name'), email: makeNode('email') });
    runtime.refreshCompiledModel(model2);

    const h2 = runtime.registerField({ path: 'name', getValue() { return ''; } });
    expect(h2.accepted).toBe(true);
  });

  it('stale async run from old generation cannot publish after refresh', async () => {
    let resolveAsync: (value: { path: string; rule: string; message: string } | undefined) => void = () => {};
    const asyncRule = new Promise<{ path: string; rule: string; message: string } | undefined>((resolve) => {
      resolveAsync = resolve;
    });

    const parentStore = createScopeStore({});
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const executeValidationRule = vi.fn().mockReturnValue(asyncRule);
    const validateRule = vi.fn().mockReturnValue(undefined);

    const asyncModel = makeFormModel({
      email: {
        path: 'email',
        kind: 'field',
        controlType: 'input-text',
        rules: [{ id: 'email#async', rule: { kind: 'async', api: { url: '/check' } }, dependencyPaths: [] }],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: [],
        parent: ''
      }
    });

    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope,
      validation: asyncModel,
      validateRule,
      executeValidationRule,
      submitApi: vi.fn().mockResolvedValue({ ok: true })
    });

    const validatePromise = runtime.validateField('email');

    const model2 = makeFormModel({ email: makeNode('email') });
    runtime.refreshCompiledModel(model2);

    resolveAsync({ path: 'email', rule: 'async', message: 'Already taken' });
    await validatePromise;

    expect(runtime.getFieldState('email').errors).toHaveLength(0);
  });

  it('lifecycleState is active after refresh', () => {
    const model1 = makeFormModel({ name: makeNode('name') });
    const model2 = makeFormModel({ name: makeNode('name'), email: makeNode('email') });
    const { runtime } = makeRuntime(model1);

    runtime.refreshCompiledModel(model2);
    expect(runtime.lifecycleState).toBe('active');
  });
});

describe('applyChangesAndRevalidate', () => {
  it('writes values and returns validation result', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const { runtime } = makeRuntime(model);

    const result = await runtime.applyChangesAndRevalidate({
      writes: { name: '' },
      changedPaths: ['name'],
      reason: 'system'
    });

    expect(result).toBeDefined();
    expect(typeof result.ok).toBe('boolean');
  });

  it('keeps dependent system-validation errors in state for canSubmit gating', async () => {
    const model = makeFormModel({
      flag: makeNode('flag'),
      detail: {
        path: 'detail',
        kind: 'field',
        controlType: 'input-text',
        rules: [
          {
            id: 'detail#0:requiredWhen',
            rule: { kind: 'requiredWhen', path: 'flag', equals: true },
            dependencyPaths: ['flag']
          }
        ],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: [],
        parent: ''
      }
    });
    const { runtime } = makeRuntimeReal(model, { flag: false, detail: '' });

    await runtime.applyChangesAndRevalidate({
      writes: { flag: true },
      changedPaths: ['flag'],
      reason: 'system'
    });

    expect(runtime.getFieldState('detail').errors).toMatchObject([
      expect.objectContaining({ path: 'detail', rule: 'requiredWhen' })
    ]);
    expect(runtime.canSubmit).toBe(false);
  });
});

describe('validateAt alias', () => {
  it('delegates to validateField', async () => {
    const model = makeFormModel({ name: makeNode('name', { required: true }) });
    const { runtime } = makeRuntimeReal(model);

    const result = await runtime.validateAt('name');
    expect(result.ok).toBe(false);
    expect(result.errors[0].rule).toBe('required');
  });
});
