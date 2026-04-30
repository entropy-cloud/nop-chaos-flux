import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionScopeContext, ComponentRegistryContext, ScopeContext } from '../contexts';
import {
  SurfaceScopeProviders,
  renderSurfaceNode,
  useSurfaceScopeSnapshot,
} from '../dialog-host-surface';

function makeScope(overrides: Record<string, unknown> = {}) {
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
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getSnapshot: () => data,
    },
    ...overrides,
  };
}

describe('renderSurfaceNode', () => {
  const context = {
    scope: makeScope() as any,
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
        scope={scope as any}
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
      <SurfaceScopeProviders scope={makeScope() as any}>
        <span data-testid="child">Hello</span>
      </SurfaceScopeProviders>,
    );
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });
});

describe('useSurfaceScopeSnapshot', () => {
  it('subscribes to scope store and renders', () => {
    function Probe() {
      useSurfaceScopeSnapshot(makeScope() as any);
      return <span data-testid="probe">ok</span>;
    }

    const scope = makeScope();
    render(
      <ScopeContext.Provider value={scope as any}>
        <Probe />
      </ScopeContext.Provider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('ok');
  });
});
