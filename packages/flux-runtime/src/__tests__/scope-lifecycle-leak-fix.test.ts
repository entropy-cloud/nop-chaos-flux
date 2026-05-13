import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime, createModuleCache } from '../index.js';
import { createHostProjectionScope } from '../runtime-host-projection-scope.js';
import { env } from './test-fixtures.js';

describe('createHostProjectionScope dispose', () => {
  it('marks scope as disposed and silently ignores writes after dispose', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const scope = createHostProjectionScope({
      parentScope: page.scope,
      projection: { host: { status: 'ready' } },
      path: '$.body[0]',
      scopeLabel: 'host',
      createChildScope: runtime.createChildScope,
    });

    scope.update('local.value', 1);
    expect(scope.get('local.value')).toBe(1);

    scope.dispose();

    scope.update('local.value', 2);
    expect(scope.get('local.value')).toBe(1);

    scope.merge({ other: true });
    expect(scope.readOwn().other).toBeUndefined();

    scope.replace?.({ host: { status: 'gone' } });
    expect(scope.readOwn().host).toEqual({ status: 'ready' });
  });
});

describe('runtime dispose clears internally-owned moduleCache', () => {
  it('clears moduleCache when it was created internally', () => {
    const cache = createModuleCache();
    const spyClear = vi.spyOn(cache, 'clear');
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      moduleCache: cache,
    });

    cache.set('test-module', { createNamespace: vi.fn() } as never);

    runtime.dispose();

    expect(spyClear).not.toHaveBeenCalled();
    expect(cache.has('test-module')).toBe(true);
  });

  it('does not clear externally-provided moduleCache on dispose', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
    });

    runtime.moduleCache.set('test-module', { createNamespace: vi.fn() } as never);

    runtime.dispose();

    expect(runtime.moduleCache.has('test-module')).toBe(false);
  });
});
