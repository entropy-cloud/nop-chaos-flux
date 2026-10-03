import React from 'react';
import { describe, it, beforeEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCurrentPage: vi.fn(),
  useCurrentSurfaceRuntime: vi.fn(),
  renderSurfaceNode: vi.fn((node: unknown) => (node == null ? null : <span>{String(node)}</span>)),
  useSurfaceScopeSnapshot: vi.fn(),
  resolveContainerElement: vi.fn((id?: string) => (id ? { id } : undefined)),
}));

vi.mock('../hooks', () => ({
  useCurrentPage: mocks.useCurrentPage,
  useCurrentSurfaceRuntime: mocks.useCurrentSurfaceRuntime,
}));

vi.mock('../dialog-host-surface', () => ({
  renderSurfaceNode: mocks.renderSurfaceNode,
  useSurfaceScopeSnapshot: mocks.useSurfaceScopeSnapshot,
  SurfaceScopeProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../container-hooks', () => ({
  resolveContainerElement: mocks.resolveContainerElement,
}));

function pickDomProps(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('data-') || key === 'className' || key === 'style') out[key] = value;
  }
  return out;
}

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  useIsMobile: () => false,
  Dialog: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  DialogContent: ({ children, ...rest }: any) => <div {...pickDomProps(rest)}>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  Drawer: ({ children }: any) => <div data-testid="drawer-root">{children}</div>,
  DrawerContent: ({ children, ...rest }: any) => <div {...pickDomProps(rest)}>{children}</div>,
  DrawerBody: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertAction: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { DialogHost } from '../dialog-host.js';
import { assertRendererRootAnchors } from '../dom-structure-testing.js';

function makeScope() {
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
  } as any;
}

function makeSurfaceRuntime(entries: any[]) {
  return {
    close: vi.fn(),
    store: {
      subscribe: () => () => undefined,
      getState: () => ({ entries }),
    },
  } as any;
}

describe('portal surface root anchors', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('stamps portal content roots with the full anchor triple (nop-* + data-renderer + data-cid)', () => {
    const scope = makeScope();
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'dialog-anchor',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'dialog-anchor-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'dialog-title',
        body: undefined,
        meta: { cid: 'cid-dialog' },
        surface: { body: 'dialog-anchor-body' },
      },
      {
        id: 'drawer-anchor',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-anchor-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: undefined,
        meta: { cid: 'cid-drawer' },
        surface: { body: 'drawer-anchor-body' },
      },
    ]);

    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    const dialogRoot = screen.getByTestId('dialog-root').querySelector('[data-slot="dialog-surface"]')!;
    assertRendererRootAnchors(dialogRoot, { type: 'dialog', cid: 'cid-dialog' });

    const drawerRoot = screen.getByTestId('drawer-root').querySelector('[data-slot="drawer-surface"]')!;
    assertRendererRootAnchors(drawerRoot, { type: 'drawer', cid: 'cid-drawer' });
  });
});
