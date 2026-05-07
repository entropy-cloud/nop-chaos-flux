import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { ActionScopeContext, ComponentRegistryContext, ScopeContext } from '../contexts.js';
import {
  SurfaceScopeProviders,
  renderSurfaceNode,
  useSurfaceScopeSnapshot,
} from '../dialog-host-surface.js';

function makeScope(overrides: Record<string, unknown> = {}): ScopeRef {
  const data = { value: 'test' };
  const listeners = new Set<() => void>();
  return {
    id: 'scope-1',
    path: '$',
    get: () => undefined,
    has: () => false,
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    value: data,
    update: vi.fn(),
    merge: vi.fn(),
    store: {
      subscribe: (listener: (change: unknown) => void) => {
        listeners.add(listener as () => void);
        return () => listeners.delete(listener as () => void);
      },
      getSnapshot: () => data,
      getLastChange: () => undefined,
      setSnapshot: () => {},
    },
    ...overrides,
  } as ScopeRef;
}

describe('renderSurfaceNode', () => {
  const context = {
    scope: makeScope(),
    actionScope: undefined,
    componentRegistry: undefined,
    ownerNodeInstance: undefined,
  };

  it('returns null for null input', () => {
    expect(renderSurfaceNode(null, context)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(renderSurfaceNode(undefined, context)).toBeNull();
  });

  it('returns string as-is', () => {
    expect(renderSurfaceNode('Hello world', context)).toBe('Hello world');
  });

  it('returns null for unrecognized input type', () => {
    expect(renderSurfaceNode(42, context)).toBeNull();
  });

  it('returns null for plain object that is not a schema or template', () => {
    expect(renderSurfaceNode({ randomKey: true }, context)).toBeNull();
  });

  it('renders a schema object with type field', () => {
    const result = renderSurfaceNode({ type: 'text', text: 'Hello' }, context);
    expect(result).toBeTruthy();
  });

  it('renders a schema array', () => {
    const result = renderSurfaceNode([{ type: 'text', text: 'Hello' }], context);
    expect(result).toBeTruthy();
  });

  it('renders a template node', () => {
    const templateNode = {
      templateNodeId: 1,
      templatePath: '$.body[0]',
      type: 'text',
      component: () => null,
      schema: { type: 'text', text: 'hi' },
      regions: {},
      propsProgram: { kind: 'static', value: {} },
      metaProgram: {},
      eventPlans: {},
      scopePlan: { kind: 'inherit' },
      sourcePropKeys: [],
      sourceStatePropKeys: {},
    };
    const result = renderSurfaceNode(templateNode, context);
    expect(result).toBeTruthy();
  });

  it('renders an array of template nodes', () => {
    const templateNodes = [
      {
        templateNodeId: 1,
        templatePath: '$.body[0]',
        type: 'text',
        component: () => null,
        schema: { type: 'text', text: 'a' },
        regions: {},
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {},
      },
    ];
    const result = renderSurfaceNode(templateNodes, context);
    expect(result).toBeTruthy();
  });
});

describe('SurfaceScopeProviders', () => {
  it('provides scope, actionScope, and componentRegistry contexts', () => {
    const scope = makeScope();
    const actionScope = { id: 'action-1' } as any;
    const componentRegistry = { id: 'reg-1' } as any;

    function Probe() {
      return (
        <>
          <span data-testid="scope-id">{React.useContext(ScopeContext)?.id ?? 'none'}</span>
          <span data-testid="action-scope-id">
            {React.useContext(ActionScopeContext)?.id ?? 'none'}
          </span>
          <span data-testid="registry-id">
            {React.useContext(ComponentRegistryContext)?.id ?? 'none'}
          </span>
        </>
      );
    }

    render(
      <SurfaceScopeProviders
        scope={scope}
        actionScope={actionScope}
        componentRegistry={componentRegistry}
      >
        <Probe />
      </SurfaceScopeProviders>,
    );

    expect(screen.getByTestId('scope-id').textContent).toBe('scope-1');
    expect(screen.getByTestId('action-scope-id').textContent).toBe('action-1');
    expect(screen.getByTestId('registry-id').textContent).toBe('reg-1');
  });

  it('renders children', () => {
    render(
      <SurfaceScopeProviders scope={makeScope()}>
        <span data-testid="child">Hello</span>
      </SurfaceScopeProviders>,
    );
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });
});

describe('useSurfaceScopeSnapshot', () => {
  it('subscribes to scope store and renders', () => {
    function Probe() {
      useSurfaceScopeSnapshot(makeScope());
      return <span data-testid="probe">ok</span>;
    }

    const scope = makeScope();
    render(
      <ScopeContext.Provider value={scope}>
        <Probe />
      </ScopeContext.Provider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('ok');
  });

  it('maintains backward compatibility without paths parameter', () => {
    let currentData = { a: 1, b: 2 };
    const listeners = new Set<() => void>();
    const scope = {
      id: 'scope-bc',
      path: '$',
      get: () => undefined,
      has: () => false,
      readOwn: () => currentData,
      readVisible: () => currentData,
      materializeVisible: () => currentData,
      value: currentData,
      update: vi.fn(),
      merge: vi.fn(),
      store: {
        subscribe: (listener: (change: unknown) => void) => {
          listeners.add(listener as () => void);
          return () => listeners.delete(listener as () => void);
        },
        getSnapshot: () => currentData,
        getLastChange: () => undefined,
        setSnapshot: () => {},
      },
    };

    let renderCount = 0;
    function Probe() {
      renderCount++;
      useSurfaceScopeSnapshot(scope as ScopeRef);
      return <span data-testid="probe">{renderCount}</span>;
    }

    render(
      <ScopeContext.Provider value={scope as ScopeRef}>
        <Probe />
      </ScopeContext.Provider>,
    );
    expect(renderCount).toBe(1);

    currentData = { a: 1, b: 3 };
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(renderCount).toBe(2);
  });

  it('only re-renders when specified paths change', () => {
    let data: Record<string, unknown> = { a: 1, b: 2 };
    const listeners = new Set<() => void>();
    const scope = {
      id: 'scope-paths',
      path: '$',
      get: () => undefined,
      has: () => false,
      readOwn: () => data,
      readVisible: () => data,
      materializeVisible: () => data,
      value: data,
      update: vi.fn(),
      merge: vi.fn(),
      store: {
        subscribe: (listener: (change: unknown) => void) => {
          listeners.add(listener as () => void);
          return () => listeners.delete(listener as () => void);
        },
        getSnapshot: () => data,
        getLastChange: () => undefined,
        setSnapshot: () => {},
      },
    };

    let renderCount = 0;
    function Probe() {
      renderCount++;
      useSurfaceScopeSnapshot(scope as ScopeRef, ['a']);
      return <span data-testid="probe">{renderCount}</span>;
    }

    render(
      <ScopeContext.Provider value={scope as ScopeRef}>
        <Probe />
      </ScopeContext.Provider>,
    );
    expect(renderCount).toBe(1);

    data = { a: 1, b: 99 };
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(renderCount).toBe(1);

    data = { a: 42, b: 99 };
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(renderCount).toBe(2);
  });

  it('re-renders when multiple watched paths change', () => {
    let data: Record<string, unknown> = { x: 10, y: 20, z: 30 };
    const listeners = new Set<() => void>();
    const scope = {
      id: 'scope-multi',
      path: '$',
      get: () => undefined,
      has: () => false,
      readOwn: () => data,
      readVisible: () => data,
      materializeVisible: () => data,
      value: data,
      update: vi.fn(),
      merge: vi.fn(),
      store: {
        subscribe: (listener: (change: unknown) => void) => {
          listeners.add(listener as () => void);
          return () => listeners.delete(listener as () => void);
        },
        getSnapshot: () => data,
        getLastChange: () => undefined,
        setSnapshot: () => {},
      },
    };

    let renderCount = 0;
    function Probe() {
      renderCount++;
      useSurfaceScopeSnapshot(scope as ScopeRef, ['x', 'y']);
      return <span data-testid="probe">{renderCount}</span>;
    }

    render(
      <ScopeContext.Provider value={scope as ScopeRef}>
        <Probe />
      </ScopeContext.Provider>,
    );
    expect(renderCount).toBe(1);

    data = { x: 10, y: 20, z: 999 };
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(renderCount).toBe(1);

    data = { x: 11, y: 20, z: 999 };
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(renderCount).toBe(2);
  });
});
