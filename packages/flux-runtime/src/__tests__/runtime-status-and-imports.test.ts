import { describe, expect, it, vi } from 'vitest';
import type {
  ComponentHandleRegistry,
  CompiledFormValidationField,
  CompiledValidationRule,
  ImportStack,
  ModuleCache,
  NodeInstance,
  PreparedImportSpec,
  RendererEnv,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import type { ValidationRegistry } from '../validation';
import { createScopeRef } from '../scope';
import {
  buildFormStatusSummary,
  createFormScopeWithBinding,
  createInitialFormScopeChange,
  validationErrorsEqual,
} from '../form-runtime-status';
import { validateRule } from '../validation-runtime';
import { createImportManager } from '../imports';
import { createActionScope } from '../action-scope';

describe('form runtime status helpers', () => {
  it('builds form status summaries from aggregate field state flags', () => {
    const summary = buildFormStatusSummary(
      {
        values: {},
        submitting: true,
        submitAttempted: false,
        fieldStates: {
          name: {
            errors: [{ message: 'required' }],
            validating: false,
            dirty: true,
            touched: true,
            visited: false,
          },
          email: {
            errors: [{ message: 'invalid' }, { message: 'domain' }],
            validating: true,
            dirty: false,
            touched: false,
            visited: true,
          },
        },
      } as unknown as Parameters<typeof buildFormStatusSummary>[0],
      'form-1',
      'profile',
      0,
    );

    expect(summary).toEqual({
      id: 'form-1',
      name: 'profile',
      submitting: true,
      validating: true,
      dirty: true,
      touched: true,
      visited: true,
      hasErrors: true,
      errorCount: 3,
      valid: false,
      invalid: true,
    });
  });

  it('creates a $form-bound scope overlay and initial form scope changes', () => {
    const scope = createScopeRef({
      id: 'form-scope',
      path: '$form-scope',
      initialData: { title: 'Draft' },
    });
    const storeState = {
      values: {},
      submitting: false,
      submitAttempted: false,
      fieldStates: {
        title: { errors: [], validating: false, dirty: true, touched: true, visited: true },
      },
    } as unknown as Parameters<typeof buildFormStatusSummary>[0];
    const boundScope = createFormScopeWithBinding({
      scope,
      formId: 'form-1',
      formName: 'profile',
      getStoreState: () => storeState,
    });

    expect(boundScope.get('$form.valid')).toBe(true);
    expect(boundScope.get('$form.dirty')).toBe(true);
    expect(boundScope.get('title')).toBe('Draft');
    expect(boundScope.readVisible().$form).toEqual(
      expect.objectContaining({ id: 'form-1', name: 'profile' }),
    );
    expect(boundScope.value.$form.valid).toBe(true);
    expect(createInitialFormScopeChange('form-1')).toEqual({
      paths: ['*'],
      sourceScopeId: 'form-1',
      kind: 'replace',
      revision: 0,
    });
    expect(validationErrorsEqual([], [])).toBe(true);
  });

  it('treats pending debounces as validating in form status summaries', () => {
    const summary = buildFormStatusSummary(
      {
        values: {},
        submitting: false,
        submitAttempted: false,
        fieldStates: {},
      } as unknown as Parameters<typeof buildFormStatusSummary>[0],
      'form-1',
      'profile',
      1,
    );

    expect(summary.validating).toBe(true);
  });
});

describe('validation runtime helper', () => {
  it('returns undefined for async and unknown rules and delegates sync rules to the registry', () => {
    const field = { path: 'email', label: 'Email' } as CompiledFormValidationField;
    const scope = createScopeRef({ id: 'scope', path: '$scope', initialData: {} });
    const validator = vi.fn().mockReturnValue({ path: 'email', message: 'invalid' });
    const registry = {
      get: vi.fn((kind: string) => (kind === 'required' ? validator : undefined)),
    } as unknown as ValidationRegistry;

    expect(
      validateRule(
        { id: 'r1', rule: { kind: 'async' }, dependencyPaths: [] } as unknown as CompiledValidationRule,
        '',
        field,
        scope,
        registry,
      ),
    ).toBeUndefined();
    expect(
      validateRule(
        { id: 'r2', rule: { kind: 'missing' }, dependencyPaths: [] } as unknown as CompiledValidationRule,
        '',
        field,
        scope,
        registry,
      ),
    ).toBeUndefined();
    expect(
      validateRule(
        { id: 'r3', rule: { kind: 'required' }, dependencyPaths: [] } as CompiledValidationRule,
        '',
        field,
        scope,
        registry,
      ),
    ).toEqual({
      path: 'email',
      message: 'invalid',
    });
    expect(validator).toHaveBeenCalledWith(
      expect.objectContaining({ field, scope, value: '', rule: { kind: 'required' } }),
    );
  });
});

describe('import manager', () => {
  function createPreparedImport(from: string, as: string): PreparedImportSpec {
    return {
      schemaUrl: '/schema.json',
      resolvedSpec: { from, as, options: undefined },
      spec: { from, as },
    };
  }

  it('ref-counts prepared import frames, exposes bindings, and cleans up on release/dispose', async () => {
    const installPrepared = vi
      .fn()
      .mockImplementation(({ imports }: { imports: PreparedImportSpec[] }) => ({
        id: `frame:${imports[0].resolvedSpec.as}`,
      }));
    const currentBindings = vi.fn().mockReturnValue({ demo: { version: 1 } });
    const pop = vi.fn();
    const dispose = vi.fn();
    const importStack = { installPrepared, currentBindings, pop, dispose } as unknown as ImportStack;
    const actionScope = createActionScope({ id: 'scope-1' });
    const componentRegistry = { id: 'registry-1' } as unknown as ComponentHandleRegistry;
    const scope = createScopeRef({ id: 'page', path: '$page', initialData: {} });
    const manager = createImportManager({
      getLoader: () => undefined,
      getRuntime: () => ({}) as RendererRuntime,
      getEnv: () => ({}) as RendererEnv,
      moduleCache: {} as ModuleCache,
      importStack,
    });
    const imports = [createPreparedImport('demo-lib', 'demo')];

    await manager.ensureImportedNamespaces({
      imports,
      actionScope,
      componentRegistry,
      scope,
      schemaUrl: '/schema.json',
      nodeInstance: { templateNode: { id: 'node-1' } } as unknown as NodeInstance,
    });
    await manager.ensureImportedNamespaces({
      imports,
      actionScope,
      componentRegistry,
      scope,
      schemaUrl: '/schema.json',
    });

    expect(installPrepared).toHaveBeenCalledTimes(1);
    expect(
      manager.getImportedExpressionBindings({ imports, actionScope, schemaUrl: '/schema.json' }),
    ).toEqual({ demo: { version: 1 } });

    manager.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema.json' });
    expect(pop).not.toHaveBeenCalled();
    manager.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema.json' });
    expect(pop).toHaveBeenCalledWith('frame:demo');
    expect(
      manager.getImportedExpressionBindings({ imports, actionScope, schemaUrl: '/schema.json' }),
    ).toEqual({});

    manager.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema.json' });
    await manager.ensureImportedNamespaces({
      imports: [],
      actionScope,
      scope,
      schemaUrl: '/schema.json',
    });
    await manager.ensureImportedNamespaces({
      imports,
      actionScope: undefined,
      scope,
      schemaUrl: '/schema.json',
    });
    expect(installPrepared).toHaveBeenCalledTimes(1);

    manager.dispose({ actionScopes: [actionScope] });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('ignores installs that return no frame', async () => {
    const manager = createImportManager({
      getLoader: () => undefined,
      getRuntime: () => ({}) as RendererRuntime,
      getEnv: () => ({}) as RendererEnv,
      moduleCache: {} as ModuleCache,
      importStack: {
        installPrepared: vi.fn().mockReturnValue(undefined),
        currentBindings: vi.fn(),
        pop: vi.fn(),
        dispose: vi.fn(),
      } as unknown as ImportStack,
    });
    const scope = createScopeRef({ id: 'page', path: '$page', initialData: {} });
    const actionScope = createActionScope({ id: 'scope-1' });

    await manager.ensureImportedNamespaces({
      imports: [createPreparedImport('demo-lib', 'demo')],
      actionScope,
      scope,
      schemaUrl: '/schema.json',
    });
    expect(
      manager.getImportedExpressionBindings({
        imports: [createPreparedImport('demo-lib', 'demo')],
        actionScope,
        schemaUrl: '/schema.json',
      }),
    ).toEqual({});
  });
});
