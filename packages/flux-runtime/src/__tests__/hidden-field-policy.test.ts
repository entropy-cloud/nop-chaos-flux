import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, CompiledValidationNode, ValidationError } from '@nop-chaos/flux-core';
import {
  buildCompiledFormValidationModel,
  createRendererRegistry,
  getCompiledValidationField,
  resolveHiddenFieldPolicy,
} from '@nop-chaos/flux-core';
import { createRendererRuntime } from '../index.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { env } from './test-fixtures.js';

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
  });

  return { runtime, validateRule };
}

describe('resolveHiddenFieldPolicy', () => {
  it('returns architecture defaults when no policy is set', () => {
    const policy = resolveHiddenFieldPolicy(undefined, undefined);
    expect(policy.validateWhenHidden).toBe(false);
    expect(policy.clearValueWhenHidden).toBe(false);
  });

  it('uses form-level default when field has no override', () => {
    const policy = resolveHiddenFieldPolicy(undefined, { validateWhenHidden: true });
    expect(policy.validateWhenHidden).toBe(true);
    expect(policy.clearValueWhenHidden).toBe(false);
  });

  it('field-level override wins over form-level default', () => {
    const policy = resolveHiddenFieldPolicy(
      { validateWhenHidden: false, clearValueWhenHidden: true },
      { validateWhenHidden: true, clearValueWhenHidden: false },
    );
    expect(policy.validateWhenHidden).toBe(false);
    expect(policy.clearValueWhenHidden).toBe(true);
  });
});

describe('getCompiledValidationField hiddenFieldPolicy resolution', () => {
  it('resolves default policy when neither form nor field declares one', () => {
    const model = makeFormModel({ username: makeNode('username', { required: true }) });
    const field = getCompiledValidationField(model, 'username');
    expect(field).toBeDefined();
    expect(field!.hiddenFieldPolicy.validateWhenHidden).toBe(false);
    expect(field!.hiddenFieldPolicy.clearValueWhenHidden).toBe(false);
  });

  it('applies form-level default policy to fields without override', () => {
    const model = makeFormModel(
      { email: makeNode('email', { required: true }) },
      { validateWhenHidden: true },
    );
    const field = getCompiledValidationField(model, 'email');
    expect(field!.hiddenFieldPolicy.validateWhenHidden).toBe(true);
  });

  it('field-level override supersedes form-level default', () => {
    const model = makeFormModel(
      {
        notes: makeNode('notes', {
          required: false,
          hiddenFieldPolicy: { validateWhenHidden: true, clearValueWhenHidden: true },
        }),
      },
      { validateWhenHidden: false, clearValueWhenHidden: false },
    );
    const field = getCompiledValidationField(model, 'notes');
    expect(field!.hiddenFieldPolicy.validateWhenHidden).toBe(true);
    expect(field!.hiddenFieldPolicy.clearValueWhenHidden).toBe(true);
  });
});

describe('hidden field validation participation', () => {
  it('hidden field with default policy skips validation', async () => {
    const model = makeFormModel({
      email: makeNode('email', { required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    runtime.notifyFieldHidden('email', true);
    const result = await runtime.validateField('email');

    expect(result.ok).toBe(true);
    expect(validateRule).not.toHaveBeenCalled();
  });

  it('visible field with default policy runs validation', async () => {
    const model = makeFormModel({
      email: makeNode('email', { required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    validateRule.mockReturnValue({
      path: 'email',
      message: 'Required',
      rule: 'required',
    });

    runtime.notifyFieldHidden('email', false);
    const result = await runtime.validateField('email');

    expect(result.ok).toBe(false);
    expect(validateRule).toHaveBeenCalled();
  });

  it('hidden field with validateWhenHidden=true still runs validation', async () => {
    const model = makeFormModel({
      email: makeNode('email', {
        required: true,
        hiddenFieldPolicy: { validateWhenHidden: true },
      }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    validateRule.mockReturnValue({
      path: 'email',
      message: 'Required',
      rule: 'required',
    });

    runtime.notifyFieldHidden('email', true);
    const result = await runtime.validateField('email');

    expect(result.ok).toBe(false);
    expect(validateRule).toHaveBeenCalled();
  });

  it('runtime-registered hidden fields still validate when form defaultHiddenFieldPolicy enables it', async () => {
    const model = makeFormModel({ sentinel: makeNode('sentinel') }, { validateWhenHidden: true });
    const { runtime } = makeRuntime(model, { tags: [] });

    runtime.registerField({
      path: 'tags',
      getValue() {
        return runtime.scope.get('tags');
      },
      validate() {
        const currentTags = runtime.scope.get('tags');
        return Array.isArray(currentTags) && currentTags.length === 0
          ? [{ path: 'tags', message: 'Required', rule: 'required' }]
          : [];
      },
    });

    runtime.notifyFieldHidden('tags', true);
    const result = await runtime.validateField('tags');

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'tags', rule: 'required' }),
    ]);
  });

  it('runtime-registered hidden fields honor per-registration hiddenFieldPolicy overrides', async () => {
    const model = makeFormModel({ sentinel: makeNode('sentinel') }, { validateWhenHidden: false });
    const { runtime } = makeRuntime(model, { tags: [] });

    runtime.registerField({
      path: 'tags',
      hiddenFieldPolicy: { validateWhenHidden: true },
      getValue() {
        return runtime.scope.get('tags');
      },
      validate() {
        const currentTags = runtime.scope.get('tags');
        return Array.isArray(currentTags) && currentTags.length === 0
          ? [{ path: 'tags', message: 'Required', rule: 'required' }]
          : [];
      },
    });

    runtime.notifyFieldHidden('tags', true);
    const result = await runtime.validateField('tags');

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'tags', rule: 'required' }),
    ]);
  });

  it('runtime-registered hidden fields can opt out even when form defaultHiddenFieldPolicy enables validation', async () => {
    const model = makeFormModel({ sentinel: makeNode('sentinel') }, { validateWhenHidden: true });
    const { runtime } = makeRuntime(model, { tags: [] });

    const validate = vi.fn<() => ValidationError[]>(() => [
      { path: 'tags', message: 'Required', rule: 'required' },
    ]);
    runtime.registerField({
      path: 'tags',
      hiddenFieldPolicy: { validateWhenHidden: false },
      getValue() {
        return runtime.scope.get('tags');
      },
      validate,
    });

    runtime.notifyFieldHidden('tags', true);
    const result = await runtime.validateField('tags');

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(validate).not.toHaveBeenCalled();
  });

  it('validateForm skips hidden fields with default policy', async () => {
    const model = makeFormModel({
      name: makeNode('name', { required: true }),
      hidden_field: makeNode('hidden_field', { required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    validateRule.mockImplementation((compiledRule, value) => {
      if (compiledRule.rule.kind === 'required' && !value) {
        return { path: compiledRule.id.split('#')[0], message: 'Required', rule: 'required' };
      }
      return undefined;
    });

    runtime.notifyFieldHidden('hidden_field', true);

    const result = await runtime.validateForm();

    const errorPaths = Object.keys(result.fieldErrors);
    expect(errorPaths).toContain('name');
    expect(errorPaths).not.toContain('hidden_field');
  });

  it('hidden field errors are cleared when field becomes hidden', async () => {
    const model = makeFormModel({
      email: makeNode('email', { required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    validateRule.mockReturnValue({
      path: 'email',
      message: 'Required',
      rule: 'required',
    });

    const firstResult = await runtime.validateField('email');
    expect(firstResult.ok).toBe(false);

    validateRule.mockReturnValue(undefined);
    runtime.notifyFieldHidden('email', true);

    const afterHideResult = await runtime.validateField('email');
    expect(afterHideResult.ok).toBe(true);
    expect(runtime.getError('email')).toBeUndefined();
  });

  it('notifyFieldHidden clears existing field errors and validating state immediately', async () => {
    const model = makeFormModel({
      email: makeNode('email', { required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, {});

    validateRule.mockReturnValue({
      path: 'email',
      message: 'Required',
      rule: 'required',
    });

    await runtime.validateField('email');
    expect(runtime.getError('email')).toBeTruthy();

    runtime.notifyFieldHidden('email', true);

    expect(runtime.getError('email')).toBeUndefined();
    expect(runtime.getFieldState('email')?.validating).toBeFalsy();
  });

  it('hidden parent path excludes descendant compiled fields from validation', async () => {
    const model = makeFormModel({
      parent: {
        path: 'parent',
        kind: 'object',
        rules: [],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: ['parent.child'],
        parent: '',
      },
      'parent.child': makeNode('parent.child', { parent: 'parent', required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, { parent: { child: '' } });

    runtime.notifyFieldHidden('parent', true);
    const result = await runtime.validateField('parent.child');

    expect(result.ok).toBe(true);
    expect(validateRule).not.toHaveBeenCalled();
  });

  it('notifyFieldHidden clears descendant field errors for hidden parent paths', async () => {
    const model = makeFormModel({
      parent: {
        path: 'parent',
        kind: 'object',
        rules: [],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: ['parent.child'],
        parent: '',
      },
      'parent.child': makeNode('parent.child', { parent: 'parent', required: true }),
    });
    const { runtime, validateRule } = makeRuntime(model, { parent: { child: '' } });

    validateRule.mockReturnValue({
      path: 'parent.child',
      message: 'Required',
      rule: 'required',
    });

    await runtime.validateField('parent.child');
    expect(runtime.getError('parent.child')).toBeTruthy();

    runtime.notifyFieldHidden('parent', true);

    expect(runtime.getError('parent.child')).toBeUndefined();
  });

  it('notifyFieldHidden cancels descendant in-flight async validation for hidden parent paths', async () => {
    let resolveValidation: ((value: unknown) => void) | undefined;
    const model = makeFormModel({
      parent: {
        path: 'parent',
        kind: 'object',
        rules: [],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: ['parent.child'],
        parent: '',
      },
      'parent.child': {
        path: 'parent.child',
        kind: 'field',
        controlType: 'input-text',
        rules: [
          {
            id: 'parent.child#0:async',
            rule: { kind: 'async', action: { action: 'ajax' } },
            dependencyPaths: [],
          },
        ],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: [],
        parent: 'parent',
      },
    } as Record<string, CompiledValidationNode>);
    const parentStore = createScopeStore({ parent: { child: '' } });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { parent: { child: '' } },
      parentScope,
      validation: model,
      validateRule: vi.fn().mockReturnValue(undefined),
      executeValidationRule: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveValidation = resolve;
          }),
      ),
    });

    const validationPromise = runtime.validateField('parent.child');

    await vi.waitFor(() => {
      expect(resolveValidation).toBeTypeOf('function');
    });
    expect(runtime.isValidating('parent.child')).toBe(true);

    runtime.notifyFieldHidden('parent', true);
    resolveValidation?.({ path: 'parent.child', message: 'late error', rule: 'async' });

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(runtime.isValidating('parent.child')).toBe(false);
    expect(runtime.getError('parent.child')).toBeUndefined();
  });
});

describe('clearValueWhenHidden behavior', () => {
  it('clears field value when hidden and clearValueWhenHidden=true', () => {
    const model = makeFormModel({
      notes: makeNode('notes', {
        hiddenFieldPolicy: { clearValueWhenHidden: true },
      }),
    });
    const { runtime } = makeRuntime(model, { notes: 'some value' });

    expect(runtime.scope.get('notes')).toBe('some value');

    runtime.notifyFieldHidden('notes', true);

    expect(runtime.scope.get('notes')).toBeUndefined();
  });

  it('preserves field value when hidden and clearValueWhenHidden=false (default)', () => {
    const model = makeFormModel({
      notes: makeNode('notes', {}),
    });
    const { runtime } = makeRuntime(model, { notes: 'preserved' });

    expect(runtime.scope.get('notes')).toBe('preserved');

    runtime.notifyFieldHidden('notes', true);

    expect(runtime.scope.get('notes')).toBe('preserved');
  });

  it('does not clear value when field becomes visible', () => {
    const model = makeFormModel({
      notes: makeNode('notes', {
        hiddenFieldPolicy: { clearValueWhenHidden: true },
      }),
    });
    const { runtime } = makeRuntime(model, { notes: 'some value' });

    runtime.notifyFieldHidden('notes', true);
    runtime.notifyFieldHidden('notes', false);

    expect(runtime.scope.get('notes')).toBeUndefined();
  });

  it('cascades descendant clearValueWhenHidden policies when a parent path becomes hidden', () => {
    const model = makeFormModel({
      parent: {
        path: 'parent',
        kind: 'object',
        rules: [],
        behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
        children: ['parent.child'],
        parent: '',
      },
      'parent.child': makeNode('parent.child', {
        parent: 'parent',
        hiddenFieldPolicy: { clearValueWhenHidden: true },
      }),
    });
    const { runtime } = makeRuntime(model, { parent: { child: 'value' } });

    runtime.notifyFieldHidden('parent', true);

    expect(runtime.scope.get('parent.child')).toBeUndefined();
  });
});

describe('notifyFieldHidden idempotency', () => {
  it('calling notifyFieldHidden with same state twice does not trigger extra clears', () => {
    const model = makeFormModel({
      email: makeNode('email', {
        hiddenFieldPolicy: { clearValueWhenHidden: true },
      }),
    });
    const { runtime } = makeRuntime(model, { email: 'test@example.com' });

    runtime.notifyFieldHidden('email', true);
    expect(runtime.scope.get('email')).toBeUndefined();

    runtime.scope.update('email', 'restored@example.com');

    runtime.notifyFieldHidden('email', true);
    expect(runtime.scope.get('email')).toBe('restored@example.com');
  });

  it('validation-scope owners honor hidden-field participation without FormRuntime-specific APIs', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ email: '' });
    const validationModel = makeFormModel({
      email: makeNode('email', { required: true }),
    });
    const validationOwner = runtime.createValidationScopeRuntime({
      id: 'non-form-owner',
      parentScope: page.scope,
      initialValues: { email: '' },
      validation: validationModel,
    });

    const beforeHide = await validationOwner.validateAt('email');
    expect(beforeHide.ok).toBe(false);

    validationOwner.notifyFieldHidden('email', true);

    const afterHide = await validationOwner.validateAt('email');
    expect(afterHide.ok).toBe(true);
    expect(validationOwner.getFieldState('email').errors).toEqual([]);
  });
});
