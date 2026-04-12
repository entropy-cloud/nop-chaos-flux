import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';
import { isOwnerCompatible } from '../form-runtime-lifecycle';
import { createScopeRef, createScopeStore } from '../scope';
import { validateRule as realValidateRule } from '../validation-runtime';

function makeNode(
  path: string,
  opts: {
    parent?: string;
    children?: string[];
    required?: boolean;
    ownRuleId?: string;
  } = {}
): CompiledValidationNode {
  const ruleId = opts.ownRuleId ?? `${path}#0:required`;
  const rules = opts.required
    ? [{ id: ruleId, rule: { kind: 'required' as const }, dependencyPaths: [] }]
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
  fields: Record<string, CompiledValidationNode>,
  opts: { ownerId?: string; rootPath?: string } = {}
): CompiledFormValidationModel {
  const rootPath = opts.rootPath ?? '';
  const nodes: Record<string, CompiledValidationNode> = {
    [rootPath]: { path: rootPath, kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
    ...fields
  };

  return {
    ...buildCompiledFormValidationModel({
      behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
      nodes,
      rootPath
    })!,
    ownerId: opts.ownerId,
    rootPath
  };
}

function makeRuntime(
  validation: CompiledFormValidationModel | undefined,
  initialValues: Record<string, any> = {}
) {
  const parentStore = createScopeStore(initialValues);
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
  const submitApi = vi.fn().mockResolvedValue({ ok: true });

  const runtime = createManagedFormRuntime({
    id: 'test-form',
    initialValues,
    parentScope,
    validation,
    validateRule: realValidateRule,
    executeValidationRule: vi.fn().mockResolvedValue(undefined),
    submitApi
  });

  return { runtime, submitApi };
}

describe('isOwnerCompatible', () => {
  it('returns true when all identity dimensions match', () => {
    const m1 = makeFormModel({}, { ownerId: 'owner-1', rootPath: 'profile' });
    const m2 = makeFormModel({}, { ownerId: 'owner-1', rootPath: 'profile' });
    expect(isOwnerCompatible(m1, m2, 'create-owner', 'create-owner', 'slot-a', 'slot-a')).toBe(true);
  });

  it('returns false when ownerId differs', () => {
    const m1 = makeFormModel({}, { ownerId: 'owner-1', rootPath: 'profile' });
    const m2 = makeFormModel({}, { ownerId: 'owner-2', rootPath: 'profile' });
    expect(isOwnerCompatible(m1, m2, 'create-owner', 'create-owner', 'slot-a', 'slot-a')).toBe(false);
  });

  it('returns false when rootPath differs', () => {
    const m1 = makeFormModel({}, { ownerId: 'owner-1', rootPath: 'profile' });
    const m2 = makeFormModel({}, { ownerId: 'owner-1', rootPath: 'contact' });
    expect(isOwnerCompatible(m1, m2, 'create-owner', 'create-owner', 'slot-a', 'slot-a')).toBe(false);
  });

  it('returns false when boundaryKind differs', () => {
    const m1 = makeFormModel({}, { ownerId: 'owner-1', rootPath: '' });
    const m2 = makeFormModel({}, { ownerId: 'owner-1', rootPath: '' });
    expect(isOwnerCompatible(m1, m2, 'create-owner', 'inherit-owner', 'slot-a', 'slot-a')).toBe(false);
  });

  it('returns false when ownerSlotId differs', () => {
    const m1 = makeFormModel({}, { ownerId: 'owner-1', rootPath: '' });
    const m2 = makeFormModel({}, { ownerId: 'owner-1', rootPath: '' });
    expect(isOwnerCompatible(m1, m2, 'create-owner', 'create-owner', 'slot-a', 'slot-b')).toBe(false);
  });
});

describe('applyExternalErrors - sourceId-scoped clear-on-write', () => {
  it('clears only exact-path external errors on setValue, updating store', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'email', rule: 'email', message: 'Already taken' }]
    });

    expect(runtime.getFieldState('email').errors).toHaveLength(1);

    runtime.setValue('email', 'new@example.com');

    expect(runtime.getFieldState('email').errors).toHaveLength(0);
  });

  it('does not clear external errors for other paths when a different path is written', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [
        { path: 'email', rule: 'email', message: 'Taken' },
        { path: 'username', rule: 'required', message: 'Required' }
      ]
    });

    runtime.setValue('email', 'new@example.com');

    expect(runtime.getFieldState('email').errors).toHaveLength(0);
    expect(runtime.getFieldState('username').errors).toHaveLength(1);
    expect(runtime.getFieldState('username').errors[0].sourceKind).toBe('external');
  });

  it('replace:true removes previous errors from same sourceId only', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'email', rule: 'email', message: 'Taken' }]
    });
    runtime.applyExternalErrors({
      sourceId: 'other',
      errors: [{ path: 'name', rule: 'required', message: 'Required' }]
    });

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'username', rule: 'required', message: 'Reserved' }],
      replace: true
    });

    expect(runtime.getFieldState('email').errors.filter((e) => e.sourceKind === 'external')).toHaveLength(0);
    expect(runtime.getFieldState('username').errors).toHaveLength(1);
    expect(runtime.getFieldState('name').errors).toHaveLength(1);
  });

  it('clears descendant-path external errors when ancestor path is written', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.applyExternalErrors({
      sourceId: 'server',
      errors: [{ path: 'address.street', rule: 'required', message: 'Required' }]
    });

    runtime.setValue('address', { street: '123 Main St' });

    expect(runtime.getFieldState('address.street').errors).toHaveLength(0);
  });
});

describe('submit supersession', () => {
  it('submit bumps all validationRuns counters before validating', async () => {
    const model = makeFormModel({
      name: makeNode('name', { required: true }),
      email: makeNode('email', { required: true })
    });
    const { runtime } = makeRuntime(model);

    runtime.registerField({ path: 'name', getValue() { return ''; } });
    runtime.registerField({ path: 'email', getValue() { return ''; } });

    await runtime.validateField('name');
    expect(runtime.getFieldState('name').errors).toHaveLength(1);

    const submitResult = await runtime.submit();

    expect(submitResult.ok).toBe(false);
    expect(runtime.getFieldState('name').errors.length).toBeGreaterThan(0);
    expect(runtime.getFieldState('email').errors.length).toBeGreaterThan(0);
  });
});

describe('child contract gating - canSubmit', () => {
  it('canSubmit is false when a summary-gate child contract is active', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.registerChildContract({
      childOwnerId: 'child-form',
      mode: 'summary-gate',
      active: true,
      unregister() {}
    });

    expect(runtime.canSubmit).toBe(false);
  });

  it('canSubmit is true when a summary-gate child contract is inactive', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.registerChildContract({
      childOwnerId: 'child-form',
      mode: 'summary-gate',
      active: false,
      unregister() {}
    });

    expect(runtime.canSubmit).toBe(true);
  });

  it('canSubmit is not affected by recurse-submit mode contracts', () => {
    const { runtime } = makeRuntime(undefined);

    runtime.registerChildContract({
      childOwnerId: 'child-form',
      mode: 'recurse-submit',
      active: true,
      unregister() {}
    });

    expect(runtime.canSubmit).toBe(true);
  });
});

describe('refreshCompiledModel - rule-identity-set retention', () => {
  it('retains errors for paths with unchanged rule identity set', async () => {
    const model1 = makeFormModel({
      name: makeNode('name', { required: true })
    });
    const { runtime } = makeRuntime(model1);

    runtime.registerField({ path: 'name', getValue() { return ''; } });
    await runtime.validateField('name');

    expect(runtime.getFieldState('name').errors).toHaveLength(1);

    const model2 = makeFormModel({
      name: makeNode('name', { required: true }),
      email: makeNode('email')
    });

    runtime.refreshCompiledModel(model2);

    expect(runtime.getFieldState('name').errors).toHaveLength(1);
  });

  it('clears errors for paths whose rule identity set changed', async () => {
    const model1 = makeFormModel({
      name: makeNode('name', { required: true })
    });
    const { runtime } = makeRuntime(model1);

    runtime.registerField({ path: 'name', getValue() { return ''; } });
    await runtime.validateField('name');

    expect(runtime.getFieldState('name').errors).toHaveLength(1);

    const model2 = makeFormModel({
      name: makeNode('name', { required: false, ownRuleId: 'name#new-rule' })
    });

    runtime.refreshCompiledModel(model2);

    expect(runtime.getFieldState('name').errors).toHaveLength(0);
  });

  it('clears errors for paths not present in the new model', async () => {
    const model1 = makeFormModel({
      name: makeNode('name', { required: true }),
      email: makeNode('email', { required: true })
    });
    const { runtime } = makeRuntime(model1);

    runtime.registerField({ path: 'name', getValue() { return ''; } });
    runtime.registerField({ path: 'email', getValue() { return ''; } });
    await runtime.validateField('name');
    await runtime.validateField('email');

    expect(runtime.getFieldState('name').errors).toHaveLength(1);
    expect(runtime.getFieldState('email').errors).toHaveLength(1);

    const model2 = makeFormModel({
      name: makeNode('name', { required: true })
    });

    runtime.refreshCompiledModel(model2);

    expect(runtime.getFieldState('name').errors).toHaveLength(1);
    expect(runtime.getFieldState('email').errors).toHaveLength(0);
  });

  it('modelGeneration increments on refresh', () => {
    const model1 = makeFormModel({ name: makeNode('name') });
    const model2 = makeFormModel({ name: makeNode('name') });
    const { runtime } = makeRuntime(model1);

    expect(runtime.modelGeneration).toBe(1);
    runtime.refreshCompiledModel(model2);
    expect(runtime.modelGeneration).toBe(2);
  });

  it('lifecycleState returns to active after refresh', () => {
    const model1 = makeFormModel({ name: makeNode('name') });
    const model2 = makeFormModel({ name: makeNode('name') });
    const { runtime } = makeRuntime(model1);

    runtime.refreshCompiledModel(model2);
    expect(runtime.lifecycleState).toBe('active');
  });
});
