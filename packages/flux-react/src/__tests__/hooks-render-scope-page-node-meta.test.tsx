import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RendererRuntime, PageRuntime, ScopeRef, RenderNodeMeta } from '@nop-chaos/flux-core';
import {
  RuntimeContext,
  PageContext,
  ScopeContext,
  NodeMetaContext,
  ActionScopeContext,
  ComponentRegistryContext,
  SurfaceContext,
  ValidationContext,
} from '../contexts.js';
import {
  useRenderScope,
  useCurrentPage,
  useCurrentNodeMeta,
} from '../hooks.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createMockRuntime(): RendererRuntime {
  return {
    runtimeId: 'test-runtime',
  } as unknown as RendererRuntime;
}

function createMockPage(): PageRuntime {
  return {
    store: { getState: () => ({ data: {} }) } as any,
  } as unknown as PageRuntime;
}

function createMockScope(): ScopeRef {
  return {
    id: 'test-scope',
    path: '$',
    get: vi.fn(),
    has: vi.fn(),
    readOwn: vi.fn(() => ({})),
    readVisible: vi.fn(() => ({})),
    materializeVisible: vi.fn(() => ({})),
    value: {},
    store: {
      subscribe: vi.fn(() => vi.fn()),
      getSnapshot: vi.fn(() => ({})),
      getLastChange: vi.fn(),
      setSnapshot: vi.fn(),
    },
  } as unknown as ScopeRef;
}

function createMockNodeMeta(overrides?: Partial<RenderNodeMeta>): RenderNodeMeta {
  return {
    templateNode: {
      type: 'text',
      templatePath: 'mock-path',
    } as any,
    node: {} as any,
    ...overrides,
  } as RenderNodeMeta;
}

function ProviderShell({
  runtime,
  page,
  scope,
  nodeMeta,
  children,
}: {
  runtime: RendererRuntime;
  page: PageRuntime;
  scope: ScopeRef;
  nodeMeta: RenderNodeMeta;
  children: React.ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <ActionScopeContext.Provider value={undefined as any}>
        <ComponentRegistryContext.Provider value={undefined as any}>
          <ScopeContext.Provider value={scope}>
            <PageContext.Provider value={page}>
              <ValidationContext.Provider value={undefined as any}>
                <SurfaceContext.Provider value={undefined as any}>
                  <NodeMetaContext.Provider value={nodeMeta}>
                    {children}
                  </NodeMetaContext.Provider>
                </SurfaceContext.Provider>
              </ValidationContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

describe('useRenderScope', () => {
  it('returns the scope from ScopeContext', () => {
    const scope = createMockScope();
    function Probe() {
      const s = useRenderScope();
      return <span data-testid="scope-id">{s?.id}</span>;
    }

    render(
      <ScopeContext.Provider value={scope}>
        <Probe />
      </ScopeContext.Provider>,
    );

    expect(screen.getByTestId('scope-id').textContent).toBe('test-scope');
  });
});

describe('useCurrentPage', () => {
  it('returns the page from PageContext', () => {
    const page = createMockPage();
    const runtime = createMockRuntime();
    const scope = createMockScope();
    const nodeMeta = createMockNodeMeta();

    function Probe() {
      const p = useCurrentPage();
      return <span data-testid="page-val">{String(p ? 'has-page' : 'undefined')}</span>;
    }

    render(
      <ProviderShell runtime={runtime} page={page} scope={scope} nodeMeta={nodeMeta}>
        <Probe />
      </ProviderShell>,
    );

    expect(screen.getByTestId('page-val').textContent).toBe('has-page');
  });

  it('returns undefined when no PageContext is provided', () => {
    function Probe() {
      const p = useCurrentPage();
      return <span data-testid="page-val">{String(p ?? 'undefined')}</span>;
    }

    render(<Probe />);
    expect(screen.getByTestId('page-val').textContent).toBe('undefined');
  });
});

describe('useCurrentNodeMeta', () => {
  it('returns the node meta from NodeMetaContext', () => {
    const nodeMeta = createMockNodeMeta({ templateNode: { type: 'input-text', templatePath: 'form/0' } as any });
    const runtime = createMockRuntime();
    const page = createMockPage();
    const scope = createMockScope();

    function Probe() {
      const nm = useCurrentNodeMeta();
      return (
        <div>
          <span data-testid="nm-type">{nm.templateNode.type}</span>
          <span data-testid="nm-path">{nm.templateNode.templatePath}</span>
        </div>
      );
    }

    render(
      <ProviderShell runtime={runtime} page={page} scope={scope} nodeMeta={nodeMeta}>
        <Probe />
      </ProviderShell>,
    );

    expect(screen.getByTestId('nm-type').textContent).toBe('input-text');
    expect(screen.getByTestId('nm-path').textContent).toBe('form/0');
  });

  it('throws when no NodeMetaContext is provided', () => {
    function Probe() {
      useCurrentNodeMeta();
      return null;
    }

    expect(() => render(<Probe />)).toThrow('NodeMeta');
  });
});

describe('all three hooks together', () => {
  it('work together in the same component', () => {
    const page = createMockPage();
    const scope = createMockScope();
    const runtime = createMockRuntime();
    const nodeMeta = createMockNodeMeta({ templateNode: { type: 'button', templatePath: 'root/btn' } as any });

    function Probe() {
      const s = useRenderScope();
      const p = useCurrentPage();
      const nm = useCurrentNodeMeta();
      return (
        <div>
          <span data-testid="all-scope">{s?.id}</span>
          <span data-testid="all-page">{p ? 'present' : 'absent'}</span>
          <span data-testid="all-type">{nm.templateNode.type}</span>
        </div>
      );
    }

    render(
      <ProviderShell runtime={runtime} page={page} scope={scope} nodeMeta={nodeMeta}>
        <Probe />
      </ProviderShell>,
    );

    expect(screen.getByTestId('all-scope').textContent).toBe('test-scope');
    expect(screen.getByTestId('all-page').textContent).toBe('present');
    expect(screen.getByTestId('all-type').textContent).toBe('button');
  });
});
