import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime, createFormComponentHandle } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('ComponentHandle factory', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
  const registry = createRendererRegistry([textRenderer]);

  it('creates a form ComponentHandle from a real FormRuntime', () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'handle-test-form',
      initialValues: { name: 'Alice', role: 'admin' },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    expect(handle.id).toBe('handle-test-form');
    expect(handle.type).toBe('form');
    expect(handle.capabilities?.hasMethod?.('submit')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('validate')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('reset')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('setValue')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('setValues')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('getValues')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('unknown')).toBe(false);
  });

  it('getValues returns current form values', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'get-values-form',
      initialValues: { email: 'a@example.com' },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('getValues', undefined, {} as any);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ email: 'a@example.com' });
  });

  it('setValue updates form values', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'set-value-form',
      initialValues: { name: 'old' },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('setValue', { name: 'name', value: 'new' }, {} as any);
    expect(result.ok).toBe(true);
    expect(result.data).toBe('new');
    expect(form.store.getState().values.name).toBe('new');
  });

  it('setValue fails without name', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'fail-form',
      initialValues: { x: 1 },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('setValue', { value: 'x' }, {} as any);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('setValues updates multiple form values at once', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'set-values-form',
      initialValues: { a: 1, b: 2 },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('setValues', { values: { a: 10, b: 20 } }, {} as any);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ a: 10, b: 20 });
    expect(form.store.getState().values).toMatchObject({ a: 10, b: 20 });
  });

  it('reset restores initial values', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'reset-form',
      initialValues: { count: 0 },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    form.setValue('count', 99);
    expect(form.store.getState().values.count).toBe(99);

    await handle.capabilities!.invoke('reset', { values: { count: 0 } }, {} as any);
    expect(form.store.getState().values.count).toBe(0);
  });

  it('submit via handle returns ok:true when validation passes', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'submit-form',
      initialValues: { email: 'a@example.com' },
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('submit', undefined, {} as any);
    expect(result.ok).toBe(true);
  });

  it('unknown method returns error', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'unknown-form',
      initialValues: {},
      parentScope: page.scope,
    });

    const handle = createFormComponentHandle(form);
    const result = await handle.capabilities!.invoke('nonexistent', undefined, {} as any);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('Unsupported form method');
  });

  it('can be registered in a component handle registry and resolved', () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'registry-form',
      initialValues: { val: 1 },
      parentScope: page.scope,
    });

    const handleRegistry = runtime.createComponentHandleRegistry({ id: 'test-reg' });
    const handle = createFormComponentHandle(form);
    const dispose = handleRegistry.register(handle);

    expect(handleRegistry.resolve({ componentId: 'registry-form' })).toBe(handle);
    dispose();
    expect(handleRegistry.resolve({ componentId: 'registry-form' })).toBeUndefined();
  });
});
