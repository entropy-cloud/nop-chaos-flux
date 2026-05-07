import { describe, expect, it, vi } from 'vitest';
import type {
  ActionScope,
  ComponentHandleRegistry,
  RendererHelpers,
  RendererRuntime,
  ScopeRef,
  SourceSchema,
} from '@nop-chaos/flux-core';
import {
  mergeActionContext,
  createNormalizedActionEvent,
  createHelpers,
  EMPTY_SCOPE_DATA,
} from '../helpers.js';

type DispatchWithMeta = RendererHelpers['dispatch'] & {
  __actionScope?: ActionScope;
  __componentRegistry?: ComponentHandleRegistry;
};

function makeScope(overrides: Partial<ScopeRef> = {}): ScopeRef {
  return {
    id: 'scope-1',
    path: '$',
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    value: {},
    update: vi.fn(),
    merge: vi.fn(),
    ...overrides,
  };
}

function makeBase(overrides: Record<string, unknown> = {}) {
  return {
    runtime: {
      dispatch: vi.fn(),
      evaluate: vi.fn(() => 'evaluated'),
      createChildScope: vi.fn(() => makeScope()),
      executeSource: vi.fn(async () => ({ ok: true })),
    } as unknown as RendererRuntime,
    scope: makeScope(),
    actionScope: { id: 'action-1' } as unknown as ActionScope,
    componentRegistry: { id: 'registry-1' } as unknown as ComponentHandleRegistry,
    form: undefined,
    page: undefined,
    surfaceRuntime: undefined,
    nodeInstance: undefined,
    dialogId: undefined,
    ...overrides,
  };
}

describe('EMPTY_SCOPE_DATA', () => {
  it('is an empty object', () => {
    expect(EMPTY_SCOPE_DATA).toEqual({});
  });
});

describe('createNormalizedActionEvent', () => {
  it('returns undefined for null', () => {
    expect(createNormalizedActionEvent(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(createNormalizedActionEvent(undefined)).toBeUndefined();
  });

  it('returns undefined for non-object', () => {
    expect(createNormalizedActionEvent(42)).toBeUndefined();
  });

  it('returns undefined for object without type string', () => {
    expect(createNormalizedActionEvent({ type: 123 })).toBeUndefined();
  });

  it('normalizes a DOM Event (returned as-is since it has string type)', () => {
    const event = new Event('click', { bubbles: true });
    const result = createNormalizedActionEvent(event);
    expect(result).toBe(event);
  });

  it('normalizes a synthetic-like event with nativeEvent', () => {
    const nativeEvent = new Event('change');
    const target = document.createElement('input');
    const synthetic = {
      type: 'change',
      nativeEvent,
      currentTarget: target,
      target,
      preventDefault() {
        nativeEvent.preventDefault();
      },
      stopPropagation() {
        nativeEvent.stopPropagation();
      },
    };

    const result = createNormalizedActionEvent(synthetic);
    expect(result).toBe(synthetic);
  });

  it('normalizes a FluxActionEvent with string type', () => {
    const fluxEvent = { type: 'flux:action', action: 'doSomething' };
    const result = createNormalizedActionEvent(fluxEvent);
    expect(result).toBe(fluxEvent);
  });

  it('returns FluxActionEvent as-is for object with type string', () => {
    const fluxEvent = { type: 'custom', data: 42 };
    const result = createNormalizedActionEvent(fluxEvent);
    expect(result).toBe(fluxEvent);
  });
});

describe('mergeActionContext', () => {
  it('returns defaults from base when no partial', () => {
    const base = makeBase();
    const result = mergeActionContext(base);
    expect(result.runtime).toBe(base.runtime);
    expect(result.scope).toBe(base.scope);
    expect(result.actionScope).toBe(base.actionScope);
    expect(result.componentRegistry).toBe(base.componentRegistry);
    expect(result.form).toBeUndefined();
    expect(result.page).toBeUndefined();
    expect(result.event).toBeUndefined();
    expect(result.dialogId).toBeUndefined();
    expect(result.signal).toBeUndefined();
    expect(result.prevResult).toBeUndefined();
    expect(result.evaluationBindings).toBeUndefined();
  });

  it('overrides scope from partial', () => {
    const base = makeBase();
    const overrideScope = makeScope({ id: 'override' });
    const result = mergeActionContext(base, { scope: overrideScope });
    expect(result.scope).toBe(overrideScope);
  });

  it('overrides actionScope from partial', () => {
    const base = makeBase();
    const overrideScope = { id: 'override' } as unknown as ActionScope;
    const result = mergeActionContext(base, { actionScope: overrideScope });
    expect(result.actionScope).toBe(overrideScope);
  });

  it('overrides componentRegistry from partial', () => {
    const base = makeBase();
    const overrideReg = { id: 'override' } as unknown as ComponentHandleRegistry;
    const result = mergeActionContext(base, { componentRegistry: overrideReg });
    expect(result.componentRegistry).toBe(overrideReg);
  });

  it('overrides form from partial', () => {
    const base = makeBase();
    const form = { id: 'form-1' } as any;
    const result = mergeActionContext(base, { form });
    expect(result.form).toBe(form);
  });

  it('overrides page from partial', () => {
    const base = makeBase();
    const page = { id: 'page-1' } as any;
    const result = mergeActionContext(base, { page });
    expect(result.page).toBe(page);
  });

  it('overrides surfaceRuntime from partial', () => {
    const base = makeBase();
    const surface = { id: 'surface-1' } as any;
    const result = mergeActionContext(base, { surfaceRuntime: surface });
    expect(result.surfaceRuntime).toBe(surface);
  });

  it('overrides nodeInstance from partial and derives instancePath', () => {
    const base = makeBase();
    const nodeInstance = {
      instancePath: [{ templateNodeId: 1, instanceKey: 'a' }],
    } as any;
    const result = mergeActionContext(base, { nodeInstance });
    expect(result.nodeInstance).toBe(nodeInstance);
    expect(result.instancePath).toBe(nodeInstance.instancePath);
  });

  it('uses base nodeInstance for instancePath when partial has no nodeInstance', () => {
    const nodeInstance = {
      instancePath: [{ templateNodeId: 1, instanceKey: 'a' }],
    } as any;
    const base = makeBase({ nodeInstance });
    const result = mergeActionContext(base, {});
    expect(result.instancePath).toBe(nodeInstance.instancePath);
  });

  it('overrides dialogId from partial', () => {
    const base = makeBase();
    const result = mergeActionContext(base, { dialogId: 'dialog-1' });
    expect(result.dialogId).toBe('dialog-1');
  });

  it('passes signal through', () => {
    const base = makeBase();
    const signal = {} as AbortSignal;
    const result = mergeActionContext(base, { signal });
    expect(result.signal).toBe(signal);
  });

  it('passes prevResult through', () => {
    const base = makeBase();
    const prevResult = { ok: true };
    const result = mergeActionContext(base, { prevResult });
    expect(result.prevResult).toBe(prevResult);
  });

  it('passes evaluationBindings through', () => {
    const base = makeBase();
    const bindings = { x: 1 };
    const result = mergeActionContext(base, { evaluationBindings: bindings });
    expect(result.evaluationBindings).toBe(bindings);
  });

  it('normalizes event', () => {
    const base = makeBase();
    const result = mergeActionContext(base, { event: { type: 'click' } });
    expect(result.event).toMatchObject({ type: 'click' });
  });
});

describe('createHelpers', () => {
  it('returns helpers with render, evaluate, createScope, dispatch, executeSource', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    expect(typeof helpers.render).toBe('function');
    expect(typeof helpers.evaluate).toBe('function');
    expect(typeof helpers.createScope).toBe('function');
    expect(typeof helpers.dispatch).toBe('function');
    expect(typeof helpers.executeSource).toBe('function');
  });

  it('dispatch calls runtime.dispatch with merged context', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    helpers.dispatch({ action: 'test' });
    expect(base.runtime.dispatch).toHaveBeenCalledWith(
      { action: 'test' },
      expect.objectContaining({ runtime: base.runtime, scope: base.scope }),
    );
  });

  it('dispatch passes custom context', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    helpers.dispatch({ action: 'test' }, { dialogId: 'd1' });
    expect(base.runtime.dispatch).toHaveBeenCalledWith(
      { action: 'test' },
      expect.objectContaining({ dialogId: 'd1' }),
    );
  });

  it('dispatch carries __actionScope and __componentRegistry', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    expect((helpers.dispatch as DispatchWithMeta).__actionScope).toBe(base.actionScope);
    expect((helpers.dispatch as DispatchWithMeta).__componentRegistry).toBe(base.componentRegistry);
  });

  it('evaluate calls runtime.evaluate with provided scope', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    helpers.evaluate('expr', base.scope);
    expect(base.runtime.evaluate).toHaveBeenCalledWith('expr', base.scope);
  });

  it('evaluate falls back to input scope when no scope provided', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    helpers.evaluate('expr');
    expect(base.runtime.evaluate).toHaveBeenCalledWith('expr', base.scope);
  });

  it('createScope calls runtime.createChildScope', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    helpers.createScope({ key: 'value' });
    expect(base.runtime.createChildScope).toHaveBeenCalledWith(
      base.scope,
      { key: 'value' },
      undefined,
    );
  });

  it('executeSource calls runtime.executeSource', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    const source: SourceSchema = { type: 'source', action: 'ajax' };
    helpers.executeSource(source);
    expect(base.runtime.executeSource).toHaveBeenCalledWith(
      expect.objectContaining({ source, scope: base.scope }),
    );
  });

  it('executeSource uses custom scope from options', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    const customScope = makeScope({ id: 'custom' });
    const source: SourceSchema = { type: 'source', action: 'ajax' };
    helpers.executeSource(source, { scope: customScope });
    expect(base.runtime.executeSource).toHaveBeenCalledWith(
      expect.objectContaining({ source, scope: customScope }),
    );
  });

  it('render creates a React element with RenderNodes', () => {
    const base = makeBase();
    const helpers = createHelpers(base);
    const element = helpers.render({ type: 'text', text: 'hello' });
    expect(element).toBeTruthy();
    expect(element).toHaveProperty('type');
  });
});
