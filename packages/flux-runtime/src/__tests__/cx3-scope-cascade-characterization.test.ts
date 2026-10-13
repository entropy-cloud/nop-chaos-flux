import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type ScopeChange, type ScopeRef, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { __setGlobalCascadeDepthForTests, registerReaction } from '../async-data/reaction-runtime.js';
import { createRuntimeSourceRegistry } from '../async-data/source-registry.js';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createManagedPageRuntime } from '../page-runtime.js';
import { createScopeRef } from '../scope.js';


const baseFormInput = {
  executeValidationRule: async () => undefined,
  validateRule: () => undefined,
};

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
