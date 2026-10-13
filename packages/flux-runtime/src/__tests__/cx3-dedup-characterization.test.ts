import { describe, expect, it, vi } from 'vitest';
import type {
  CompiledFormValidationModel,
  FieldState,
  FormStoreState,
  ScopeChange,
  ScopeRef,
  ValidationError,
} from '@nop-chaos/flux-core';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import {
  __setGlobalCascadeDepthForTests,
  registerReaction,
} from '../async-data/reaction-runtime.js';
import { createRuntimeSourceRegistry } from '../async-data/source-registry.js';
import { createFormStore } from '../form-store.js';
import { createOwnedFormStore } from '../form-store-owned.js';
import { buildFormStatusSummary } from '../form-runtime-status.js';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createManagedPageRuntime } from '../page-runtime.js';
import { applyFieldValuePatch } from '../form-runtime-field-ops.js';
import { syncRegisteredFieldValue } from '../form-runtime-registration.js';
import { executeSetValues } from '../form-runtime-values.js';
import { createAsyncGovernanceStore } from '../async-data/async-governance.js';
import { createScopeRef } from '../scope.js';
import type {
  CreateManagedFormRuntimeInput,
  FormRuntimeRegistrationState,
  ManagedFormRuntimeSharedState,
  RegisteredFieldEntry,
} from '../form-runtime-types.js';

type FormStoreSummaryState = {
  errorCount: number;
  dirtyCount: number;
  touchedCount: number;
  visitedCount: number;
  validatingCount: number;
};

const baseFormInput = {
  executeValidationRule: async () => undefined,
  validateRule: () => undefined,
};

function err(path: string, message: string): ValidationError {
  return { path, message, rule: 'required' };
}

function asSummary(state: unknown): FormStoreSummaryState {
  return (state as { summary?: FormStoreSummaryState }).summary as never;
}

describe('CX-3 characterization: summary counters (WA-runtime-002)', () => {
  it('form-store counts strictly ===true: non-boolean truthy flags contribute zero', () => {
    const store = createFormStore({});
    store.batchUpdate({
      fieldStates: {
        a: { dirty: 'yes', touched: 1, visited: 'x', validating: [] } as unknown as FieldState,
      },
    });
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
  });

  it('form-store counts boolean flags and error payloads exactly', () => {
    const store = createFormStore({});
    store.batchUpdate({
      fieldStates: {
        a: { dirty: true, touched: true, visited: true, validating: true },
        b: { errors: [err('b', 'e1'), err('b', 'e2')] },
        c: {},
      },
    });
    expect(asSummary(store.getState())).toEqual({
      errorCount: 2,
      dirtyCount: 1,
      touchedCount: 1,
      visitedCount: 1,
      validatingCount: 1,
    });
  });

  it('form-store maintains counters incrementally per write, including reclaim back to zero', () => {
    const store = createFormStore({});

    store.setTouched('a', true);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 1,
      visitedCount: 0,
      validatingCount: 0,
    });

    store.setPathErrors('a', [err('a', 'e1')]);
    expect(asSummary(store.getState()).errorCount).toBe(1);

    store.setDirty('a', true);
    expect(asSummary(store.getState()).dirtyCount).toBe(1);

    store.setVisited('a', true);
    store.setValidating('a', true);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 1,
      dirtyCount: 1,
      touchedCount: 1,
      visitedCount: 1,
      validatingCount: 1,
    });

    store.setTouched('a', false);
    store.setVisited('a', false);
    store.setValidating('a', false);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 1,
      dirtyCount: 1,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });

    store.setPathErrors('a', []);
    store.setDirty('a', false);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
    expect(store.getState().fieldStates['a']).toBeUndefined();
  });

  it('status fallback branch counts truthy (non-strict) flags when state.summary is absent', () => {
    const summary = buildFormStatusSummary(
      {
        values: {},
        submitting: false,
        submitAttempted: false,
        fieldStates: {
          a: { dirty: 'yes', touched: 1, validating: 'x', visited: 0 } as unknown as FieldState,
        },
      },
      'f1',
      undefined,
    );
    expect(summary.dirty).toBe(true);
    expect(summary.touched).toBe(true);
    expect(summary.validating).toBe(true);
    expect(summary.visited).toBe(false);
  });

  it('prefer-summary branch: a present summary wins even when all-zero and fieldStates disagree', () => {
    const state = {
      values: {},
      submitting: false,
      submitAttempted: false,
      fieldStates: { a: { dirty: true, touched: true } },
      summary: {
        errorCount: 0,
        dirtyCount: 0,
        touchedCount: 0,
        visitedCount: 0,
        validatingCount: 0,
      },
    } as FormStoreState;

    const summary = buildFormStatusSummary(state, 'f1', undefined);
    expect(summary.dirty).toBe(false);
    expect(summary.touched).toBe(false);
    expect(summary.errorCount).toBe(0);
  });

  it('owned store read path recomputes summary over owned-prefix field states only', () => {
    const base = createFormStore({});
    const owned = createOwnedFormStore(base, 'owner1');

    base.setPathErrors('owner1::a', [err('a', 'e1'), err('a', 'e2')]);
    base.setDirty('owner1::a', true);
    base.setTouched('unrelated', true);

    expect(owned.getState().fieldStates['a']).toEqual({
      dirty: true,
      errors: [err('a', 'e1'), err('a', 'e2')],
    });
    expect(asSummary(owned.getState())).toEqual({
      errorCount: 2,
      dirtyCount: 1,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
  });
});

function createRegistrationHarness(
  values: Record<string, unknown> = {},
): FormRuntimeRegistrationState {
  const store = createFormStore(values);
  const scope = createScopeRef({
    id: 'cx3-registration-test',
    path: '$form',
    initialData: values,
  });

  return {
    store,
    scope,
    initialFieldState: {
      initialValues: { ...values },
      dirty: {},
    },
    runtimeFieldRegistrations: new Map(),
    pathToRegistrationId: new Map(),
    childPathToRegistrationId: new Map(),
  };
}

function createRegistrationEntry(
  path: string,
  overrides: Partial<RegisteredFieldEntry['registration']> = {},
): RegisteredFieldEntry {
  return {
    registrationId: `reg:${path}`,
    registration: {
      path,
      getValue: () => undefined,
      ...overrides,
    } as RegisteredFieldEntry['registration'],
    modelGeneration: 1,
  };
}

describe('CX-3 characterization: FieldState write shapes (WA-runtime-003)', () => {
  it('five-key merge in form-store: per-key presence semantics with empty-state reclaim', () => {
    const store = createFormStore({});

    store.setTouched('a', true);
    expect(store.getState().fieldStates['a']).toEqual({ touched: true });
    store.setVisited('a', true);
    expect(store.getState().fieldStates['a']).toEqual({ touched: true, visited: true });
    store.setTouched('a', false);
    expect(store.getState().fieldStates['a']).toEqual({ visited: true });
    store.setVisited('a', false);
    expect(store.getState().fieldStates['a']).toBeUndefined();

    store.setPathErrors('a', [err('a', 'e1')]);
    expect(store.getState().fieldStates['a']).toEqual({ errors: [err('a', 'e1')] });
    store.setValidating('a', true);
    expect(store.getState().fieldStates['a']).toEqual({
      errors: [err('a', 'e1')],
      validating: true,
    });
    store.setPathErrors('a', []);
    expect(store.getState().fieldStates['a']).toEqual({ validating: true });
    store.setValidating('a', false);
    expect(store.getState().fieldStates['a']).toBeUndefined();
  });

  it('field-ops twin write shape: applyFieldValuePatch pre-clears validating/errors then grafts dirty', () => {
    const store = createFormStore({});
    const scope = createScopeRef({ id: 'cx3-patch', path: '$form', initialData: {} });
    const sharedState: ManagedFormRuntimeSharedState = {
      inputValue: {
        executeValidationRule: async () => undefined,
        validateRule: () => undefined,
      } as CreateManagedFormRuntimeInput,
      store,
      scope,
      initialFieldState: { initialValues: {}, dirty: {} },
      validationRuns: new Map(),
      pendingValidationDebounces: new Map(),
      validationAbortControllers: new Map(),
      validationAsyncGovernance: createAsyncGovernanceStore(),
      runtimeFieldRegistrations: new Map(),
      pathToRegistrationId: new Map(),
      childPathToRegistrationId: new Map(),
      hiddenFields: new Set(),
      lifecycleState: 'active',
      lifecycleWaiters: new Set(),
      modelGeneration: 1,
      modelGenerationListeners: new Set(),
      externalErrors: new Map(),
      childContracts: new Map(),
    };

    const result = applyFieldValuePatch(
      sharedState,
      {
        values: {},
        fieldStates: {
          name: {
            validating: true,
            errors: [err('name', 'e1')],
            touched: true,
          },
        },
      },
      'name',
      'next',
      false,
    );
    expect(result.nextFieldStates['name']).toEqual({ touched: true });

    const forcedResult = applyFieldValuePatch(
      sharedState,
      {
        values: {},
        fieldStates: {
          name: {
            validating: true,
            errors: [err('name', 'e1')],
            touched: true,
          },
        },
      },
      'name',
      'next',
      true,
    );
    expect(forcedResult.nextFieldStates['name']).toEqual({ touched: true, dirty: true });

    const reclaimResult = applyFieldValuePatch(
      sharedState,
      { values: {}, fieldStates: { name: { errors: [err('name', 'e1')] } } },
      'name',
      'next',
      false,
    );
    expect(reclaimResult.nextFieldStates['name']).toBeUndefined();
  });

  it('AUDIT-15 at registration sync: validating is NOT pre-cleared while dirty is re-grafted', () => {
    const baselineState = createRegistrationHarness({ name: 'Alice' });
    baselineState.store.setFieldState('name', { validating: true, dirty: true, touched: true });
    const baselineEntry = createRegistrationEntry('name', { syncValue: () => 'Alice' });
    baselineState.runtimeFieldRegistrations.set(baselineEntry.registrationId, baselineEntry);
    baselineState.pathToRegistrationId.set('name', baselineEntry.registrationId);
    baselineState.scope.update('name', 'Bob');

    syncRegisteredFieldValue(baselineState, 'name');
    expect(baselineState.store.getState().fieldStates['name']).toEqual({
      validating: true,
      touched: true,
    });

    const dirtyState = createRegistrationHarness({ name: 'Alice' });
    dirtyState.store.setFieldState('name', { validating: true, touched: true });
    const dirtyEntry = createRegistrationEntry('name', { syncValue: () => 'Bob' });
    dirtyState.runtimeFieldRegistrations.set(dirtyEntry.registrationId, dirtyEntry);
    dirtyState.pathToRegistrationId.set('name', dirtyEntry.registrationId);
    dirtyState.scope.update('name', 'Stale');

    syncRegisteredFieldValue(dirtyState, 'name');
    expect(dirtyState.store.getState().fieldStates['name']).toEqual({
      validating: true,
      touched: true,
      dirty: true,
    });
    expect(dirtyState.store.getState().values.name).toBe('Bob');
  });

  it('AUDIT-15 at owner dependent revalidation: validating survives the dependent dirty re-graft', async () => {
    const validation: CompiledFormValidationModel = {
      behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
      nodes: {
        adminCode: {
          path: 'adminCode',
          kind: 'field',
          controlType: 'input-text',
          label: 'Admin Code',
          rules: [],
          behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
          children: [],
          parent: '',
        },
      },
      order: ['adminCode'],
      dependents: { role: ['adminCode'] },
      rootPath: '',
    };

    const buildForm = (initialValues: Record<string, unknown>) =>
      createManagedFormRuntime({ ...baseFormInput, id: 'owner-audit15', initialValues, validation });

    const trackedSequence = (form: ReturnType<typeof buildForm>, path: string) => {
      let lastFs = form.store.getState().fieldStates[path];
      const sequence: (FieldState | undefined)[] = [];
      form.store.subscribe(() => {
        const fs = form.store.getState().fieldStates[path];
        if (fs !== lastFs) {
          lastFs = fs;
          sequence.push(fs);
        }
      });
      return sequence;
    };

    const clearBranch = buildForm({ adminCode: 'keep' });
    clearBranch.store.setValidating('adminCode', true);
    const clearSequence = trackedSequence(clearBranch, 'adminCode');
    await clearBranch.applyChangesAndRevalidate({
      writes: { role: 'admin' },
      changedPaths: ['role'],
      reason: 'change',
    });
    expect(clearSequence).toEqual([{ validating: true }]);

    const dirtyBranch = buildForm({ adminCode: 'keep' });
    dirtyBranch.setValue('adminCode', 'changed');
    dirtyBranch.store.setValidating('adminCode', true);
    const dirtySequence = trackedSequence(dirtyBranch, 'adminCode');
    await dirtyBranch.applyChangesAndRevalidate({
      writes: { role: 'admin' },
      changedPaths: ['role'],
      reason: 'change',
    });
    expect(dirtySequence).toEqual([{ dirty: true, validating: true }]);
  });

  it('validation commit equal-guard: repeated equal errors keep the committed array identity', async () => {
    const form = createManagedFormRuntime({ ...baseFormInput, id: 'cx3-equal-guard', initialValues: {} });
    form.registerField({
      path: 'p1',
      getValue: () => undefined,
      validate: async () => [err('p1', 'v1')],
    });

    await form.validateField('p1');
    const first = form.getError('p1');
    expect(first).toHaveLength(1);

    await form.validateField('p1');
    expect(form.getError('p1')).toBe(first);
  });

  it('owner errors rebuild tail: equal re-validation performs no rewrite (changed-flag false)', async () => {
    const form = createManagedFormRuntime({
      ...baseFormInput,
      id: 'cx3-owner-tail',
      initialValues: {},
      validation: {
        nodes: {},
        order: [],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {},
      },
    });
    form.registerField({
      path: 'bad',
      getValue: () => undefined,
      validate: async () => [err('bad', 'v1')],
    });
    form.registerField({
      path: 'good',
      getValue: () => undefined,
      validate: async () => [],
    });

    const listener = vi.fn((_change: ScopeChange) => undefined);
    form.scope.store?.subscribe(listener);

    await form.validateForm();
    const firstErrors = form.getError('bad');
    const countAfterFirstRun = listener.mock.calls.length;

    await form.validateForm();
    const countAfterSecondRun = listener.mock.calls.length;
    await form.validateForm();
    const countAfterThirdRun = listener.mock.calls.length;

    expect(firstErrors).toHaveLength(1);
    expect(form.getError('bad')).toBe(firstErrors);
    const delta1 = countAfterFirstRun;
    const delta2 = countAfterSecondRun - countAfterFirstRun;
    const delta3 = countAfterThirdRun - countAfterSecondRun;
    expect(delta1).toBe(delta2);
    expect(delta2).toBe(delta3);
    expect(delta1).toBeGreaterThan(0);
  });

  it('setValues errors rebuild: stale external errors removed with metadata kept, rebuilt errors grafted verbatim', () => {
    const store = createFormStore({ x: 1 });
    const scope = createScopeRef({ id: 'cx3-setvalues', path: '$form', initialData: { x: 1 } });
    const sharedState: ManagedFormRuntimeSharedState = {
      inputValue: {
        executeValidationRule: async () => undefined,
        validateRule: () => undefined,
      } as CreateManagedFormRuntimeInput,
      store,
      scope,
      initialFieldState: { initialValues: { x: 1 }, dirty: {} },
      validationRuns: new Map(),
      pendingValidationDebounces: new Map(),
      validationAbortControllers: new Map(),
      validationAsyncGovernance: createAsyncGovernanceStore(),
      runtimeFieldRegistrations: new Map(),
      pathToRegistrationId: new Map(),
      childPathToRegistrationId: new Map(),
      hiddenFields: new Set(),
      lifecycleState: 'active',
      lifecycleWaiters: new Set(),
      modelGeneration: 1,
      modelGenerationListeners: new Set(),
      externalErrors: new Map(),
      childContracts: new Map(),
    };

    const baseCtx = {
      sharedState,
      formId: 'f1',
      setLastChange: () => {},
      clearExternalErrorsForPath: () => true,
      revalidateDependents: vi.fn(),
    };

    store.batchUpdate({
      fieldStates: {
        x: { touched: true, errors: [err('x', 'stale')] },
        y: { visited: true, errors: [err('y', 'stale')] },
        z: { errors: [err('z', 'stale')] },
      },
    });

    executeSetValues({ ...baseCtx, rebuildStoreErrorsFromExternal: () => ({}) }, { x: 2 });
    const afterRemoval = store.getState().fieldStates;
    expect(afterRemoval['x']).toEqual({ touched: true, dirty: true });
    expect(afterRemoval['y']).toEqual({ visited: true });
    expect(afterRemoval['z']).toBeUndefined();

    const rebuilt = [err('y', 'fresh')];
    executeSetValues(
      { ...baseCtx, rebuildStoreErrorsFromExternal: () => ({ y: rebuilt }) },
      { x: 3 },
    );
    const afterGraft = store.getState().fieldStates;
    expect(afterGraft['y']?.errors).toBe(rebuilt);
    expect(afterGraft['y']).toEqual({ visited: true, errors: rebuilt });
  });
});

describe('CX-3 characterization: ScopeRef store adapter gates (WA-runtime-004)', () => {
  it('form gate (Plan 552): fieldStates-only change replays as a wildcard replace', () => {
    const form = createManagedFormRuntime({ ...baseFormInput, id: 'cx3-gate', initialValues: { a: 1 } });
    const listener = vi.fn((_change: ScopeChange) => undefined);
    form.scope.store?.subscribe(listener);

    form.setValue('a', 2);
    expect(listener).toHaveBeenCalledTimes(1);
    listener.mockClear();

    form.touchField('a');
    expect(listener).toHaveBeenCalledTimes(1);
    const gateChange = listener.mock.calls[0][0] as ScopeChange;
    expect(gateChange.paths).toEqual(['*']);
    expect(gateChange.kind).toBe('replace');
    expect(gateChange.sourceScopeId).toBe('cx3-gate');

    form.touchField('a');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('form gate: values change notifies once with the update change; inert store writes stay silent', () => {
    const form = createManagedFormRuntime({ ...baseFormInput, id: 'cx3-gate2', initialValues: { a: 1 } });
    const listener = vi.fn((_change: ScopeChange) => undefined);
    form.scope.store?.subscribe(listener);

    form.setValue('a', 2);
    expect(listener).toHaveBeenCalledTimes(1);
    const updateChange = listener.mock.calls[0][0] as ScopeChange;
    expect(updateChange.paths).toEqual(['a']);
    expect(updateChange.kind).toBe('update');
    expect(updateChange.sourceScopeId).toBe('cx3-gate2');

    form.store.batchUpdate({});
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('adapter reuse keys: existing scope is adopted; parent vs initialData stay mutually exclusive', () => {
    const parentScope = createScopeRef({ id: 'root', path: '$root', initialData: {} });
    const existingScope = createScopeRef({
      id: 'prebuilt',
      path: '$prebuilt',
      initialData: { q: 1 },
    });
    const adopted = createManagedFormRuntime({
      ...baseFormInput,
      id: 'cx3-reuse',
      existingScope,
      parentScope,
      scopeBinding: 'none',
    });
    expect(adopted.scope).toBe(existingScope);

    const derived = createManagedFormRuntime({
      ...baseFormInput,
      id: 'cx3-derived',
      parentScope,
      scopeBinding: 'none',
    });
    expect(derived.scope.parent).toBe(parentScope);

    const rt = createManagedPageRuntime({ data: { z: 9 } });
    expect(rt.scope.id).toBe('page');
    expect(rt.scope.parent).toBeUndefined();
    expect(rt.scope.get('z')).toBe(9);
  });
});

describe('CX-3 characterization: cascade depth guards (WA-runtime-005)', () => {
  it('reaction guard boundary: depth 199 still fires the reaction (limit is 200)', async () => {
    __setGlobalCascadeDepthForTests(199);

    const textRenderer = { type: 'text' as const, component: () => null };
    const env = {
      fetcher: async () => ({ status: 0, data: null }),
      notify: vi.fn(),
    } as unknown as RendererEnv;
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ count: 0 });
    const dispatch = vi.fn();

    const registration = registerReaction({
      id: 'cx3-cascade-199',
      runtime,
      scope: page.scope,
      compiledReaction: compileReaction(
        'cx3-cascade-199',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      helpers: { dispatch },
    });

    page.scope.update('count', 1);
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    __setGlobalCascadeDepthForTests(0);
    registration.dispose();
  });

  it('source guard boundary: per-registry depth blocks at 100 in-flight refreshes and re-enters after release', async () => {
    type Emit = (change: { paths: string[] }) => void;
    let emitChange: Emit | undefined;
    const resolvers: Array<(value: { skipped: boolean }) => void> = [];
    const refresh = vi.fn(
      () =>
        new Promise<{ skipped: boolean }>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const notify = vi.fn();

    const scope = {
      id: 'cx3-source-scope',
      store: {
        subscribe(listener: Emit) {
          emitChange = listener;
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const registry = createRuntimeSourceRegistry({
      runtime: {
        env: { notify } as never,
        expressionCompiler: {
          evaluateValue: (value: { value?: unknown }) => value.value,
          compileValue: (value: unknown) => ({ isStatic: true, value }),
        },
      } as unknown as Parameters<typeof createRuntimeSourceRegistry>[0]['runtime'],
      apiCache: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn(), has: vi.fn() },
      asyncGovernance: undefined,
    });

    const registration = registry.registerDataSource({
      id: 'cx3-source',
      scope,
      compiledSource: {
        kind: 'formula',
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as unknown as Parameters<typeof registry.registerDataSource>[0]['compiledSource'],
    });
    registration.controller.refresh = refresh as never;

    for (let i = 0; i < 100; i += 1) {
      emitChange?.({ paths: ['query'] });
    }
    expect(refresh).toHaveBeenCalledTimes(100);

    emitChange?.({ paths: ['query'] });
    expect(refresh).toHaveBeenCalledTimes(100);
    expect(notify).toHaveBeenCalledWith('error', 'Source cascade depth limit exceeded');

    resolvers[0]?.({ skipped: false });
    await Promise.resolve();
    await Promise.resolve();

    emitChange?.({ paths: ['query'] });
    expect(refresh).toHaveBeenCalledTimes(101);

    for (const resolve of resolvers) resolve({ skipped: false });
    registration.dispose();
  });
});
