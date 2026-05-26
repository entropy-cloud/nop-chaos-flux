import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RendererRuntime, ScopeRef, SourceObserver } from '@nop-chaos/flux-core';
import { RuntimeContext } from '../contexts.js';
import { hasSourcePropsInValue, useNodeSourceProps } from '../use-node-source-props.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createScope(): ScopeRef {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as ScopeRef;
}

function createObserver(label: string): SourceObserver {
  const listeners = new Set<() => void>();
  let snapshot = { value: { observerLabel: label, runs: 0 } as Record<string, unknown> };

  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    run: vi.fn((input) => {
      snapshot = {
        value: {
          ...(input.baseValue ?? {}),
          observerLabel: label,
          runs: ((snapshot.value.runs as number | undefined) ?? 0) + 1,
        },
      };

      for (const listener of listeners) {
        listener();
      }
    }),
    dispose: vi.fn(),
  };
}

function createRuntime(observers: SourceObserver[]): RendererRuntime {
  return {
    createSourceObserver: vi.fn(() => {
      const observer = observers.shift();
      if (!observer) {
        throw new Error('No observer prepared');
      }
      return observer;
    }),
  } as unknown as RendererRuntime;
}

function stringifyValue(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, current) => {
    if (!current || typeof current !== 'object') {
      return current;
    }

    if (seen.has(current)) {
      return '[Circular]';
    }

    seen.add(current);
    return current;
  });
}

function Probe(props: {
  node: { sourcePropKeys: string[]; sourceStatePropKeys: Record<string, string> };
  propsValue: Record<string, unknown>;
  scope: ScopeRef;
  ctx?: Record<string, unknown>;
}) {
  const value = useNodeSourceProps(props.node as any, props.propsValue, props.scope, props.ctx as any);
  return <pre data-testid="value">{stringifyValue(value)}</pre>;
}

describe('hasSourcePropsInValue', () => {
  it('returns false for cyclic graphs without source schemas', () => {
    const value: Record<string, unknown> = { nested: {} };
    value.self = value;
    (value.nested as Record<string, unknown>).parent = value;

    expect(hasSourcePropsInValue(value, [])).toBe(false);
  });

  it('still finds nested source schemas inside cyclic graphs', () => {
    const source = { type: 'source', action: 'loadItems' };
    const value: Record<string, unknown> = { nested: { source } };
    value.self = value;

    expect(hasSourcePropsInValue(value, [])).toBe(true);
  });
});

describe('useNodeSourceProps', () => {
  it('disposes the active controller when source props disable and recreates it on re-enable', () => {
    const firstObserver = createObserver('first');
    const secondObserver = createObserver('second');
    const runtime = createRuntime([firstObserver, secondObserver]);
    const scope = createScope();
    const node = {
      sourcePropKeys: ['items'],
      sourceStatePropKeys: { items: 'itemsState' },
    };

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'first' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    expect(firstObserver.run).toHaveBeenCalledTimes(1);
    expect(firstObserver.dispose).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId('value').textContent).toContain('observerLabel');
    expect(screen.getByTestId('value').textContent).toContain('first');

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe node={node} propsValue={{ plain: 'disabled' }} scope={scope} />
      </RuntimeContext.Provider>,
    );

    expect(firstObserver.dispose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value').textContent).toBe('{"plain":"disabled"}');

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'second' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    expect(secondObserver.run).toHaveBeenCalledTimes(1);
    expect(secondObserver.dispose).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId('value').textContent).toContain('second');
  });

  it('does not recreate the controller for ordinary enabled reruns', () => {
    const observer = createObserver('steady');
    const runtime = createRuntime([observer]);
    const scope = createScope();
    const node = {
      sourcePropKeys: ['items'],
      sourceStatePropKeys: { items: 'itemsState' },
    };

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'first' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'second' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    expect(runtime.createSourceObserver).toHaveBeenCalledTimes(1);
    expect(observer.run).toHaveBeenCalledTimes(2);
    expect(observer.dispose).toHaveBeenCalledTimes(0);
  });

  it('handles cyclic nested source schemas on the full live controller path', () => {
    const observer = createObserver('cyclic');
    const runtime = createRuntime([observer]);
    const scope = createScope();
    const node = {
      sourcePropKeys: [],
      sourceStatePropKeys: {},
    };
    const nested: Record<string, unknown> = {
      source: { type: 'source', action: 'loadItems' },
    };
    const propsValue: Record<string, unknown> = { nested, plain: 'kept' };
    nested.self = propsValue;
    propsValue.self = nested;

    render(
      <RuntimeContext.Provider value={runtime}>
        <Probe node={node} propsValue={propsValue} scope={scope} />
      </RuntimeContext.Provider>,
    );

    expect(observer.run).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value').textContent).toContain('observerLabel');
    expect(screen.getByTestId('value').textContent).toContain('cyclic');
  });

  it('re-runs sources when caller action context changes', () => {
    const observer = createObserver('ctx');
    const runtime = createRuntime([observer]);
    const scope = createScope();
    const node = {
      sourcePropKeys: ['items'],
      sourceStatePropKeys: { items: 'itemsState' },
    };
    const firstCtx = { actionScope: { id: 'action-a' } };
    const secondCtx = { actionScope: { id: 'action-b' } };

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' } }}
          scope={scope}
          ctx={firstCtx}
        />
      </RuntimeContext.Provider>,
    );

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' } }}
          scope={scope}
          ctx={secondCtx}
        />
      </RuntimeContext.Provider>,
    );

    expect(observer.run).toHaveBeenNthCalledWith(1, expect.objectContaining({ ctx: firstCtx }));
    expect(observer.run).toHaveBeenNthCalledWith(2, expect.objectContaining({ ctx: secondCtx }));
  });

  it('cleans up again after a false-to-true-to-false lifecycle cycle', () => {
    const firstObserver = createObserver('first');
    const secondObserver = createObserver('second');
    const runtime = createRuntime([firstObserver, secondObserver]);
    const scope = createScope();
    const node = {
      sourcePropKeys: ['items'],
      sourceStatePropKeys: { items: 'itemsState' },
    };

    const { rerender } = render(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'first' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe node={node} propsValue={{ plain: 'disabled' }} scope={scope} />
      </RuntimeContext.Provider>,
    );

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe
          node={node}
          propsValue={{ items: { type: 'source', action: 'loadItems' }, plain: 'second' }}
          scope={scope}
        />
      </RuntimeContext.Provider>,
    );

    rerender(
      <RuntimeContext.Provider value={runtime}>
        <Probe node={node} propsValue={{ plain: 'disabled-again' }} scope={scope} />
      </RuntimeContext.Provider>,
    );

    expect(firstObserver.dispose).toHaveBeenCalledTimes(1);
    expect(secondObserver.dispose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value').textContent).toBe('{"plain":"disabled-again"}');
  });
});
