import React from 'react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  return {
    useCurrentPage: vi.fn(),
    useCurrentSurfaceRuntime: vi.fn(),
    renderSurfaceNode: vi.fn((node: unknown) => (node == null ? null : <span>{String(node)}</span>)),
    useSurfaceScopeSnapshot: vi.fn(),
    resolveContainerElement: vi.fn(() => undefined),
    isMobile: false,
    dialogContentProps: [] as Array<Record<string, unknown>>,
    drawerContentProps: [] as Array<Record<string, unknown>>,
    drawerDirections: [] as Array<unknown>,
  };
});

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

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  useIsMobile: () => mocks.isMobile,
  Dialog: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  DialogContent: ({ children, ...props }: any) => {
    mocks.dialogContentProps.push(props);
    return <div data-testid="dialog-content" data-size={props.size} data-mobile-fullscreen={props['data-mobile-fullscreen']}>{children}</div>;
  },
  DialogBody: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  Drawer: ({ children, direction }: any) => {
    mocks.drawerDirections.push(direction);
    return <div data-testid="drawer-root" data-direction={direction}>{children}</div>;
  },
  DrawerContent: ({ children, ...props }: any) => {
    mocks.drawerContentProps.push(props);
    return <div data-testid="drawer-content" data-mobile-side-overridden={props['data-mobile-side-overridden']}>{children}</div>;
  },
  DrawerBody: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
  DrawerFooter: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { DialogHost } from '../dialog-host.js';

function makeSurfaceRuntime(entries: any[]) {
  return {
    close: vi.fn(),
    store: {
      subscribe: () => () => undefined,
      getState: () => ({ entries }),
    },
  } as any;
}

function makeScope() {
  return { id: 'scope-1', path: '$', value: {} } as any;
}

function seedPageAndRuntime(entries: any[]) {
  mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
  mocks.useCurrentSurfaceRuntime.mockReturnValue(makeSurfaceRuntime(entries));
}

describe('DialogHost responsive behavior (M1c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMobile = false;
    mocks.dialogContentProps = [];
    mocks.drawerContentProps = [];
    mocks.drawerDirections = [];
  });

  it('forces dialog fullscreen on mobile when no explicit size is set', () => {
    mocks.isMobile = true;
    seedPageAndRuntime([
      {
        id: 'dialog-mobile',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'dialog-body', showMask: true },
      },
    ]);

    render(<DialogHost />);

    expect(mocks.dialogContentProps).toHaveLength(1);
    const props = mocks.dialogContentProps[0]!;
    expect(props.style).toMatchObject({ width: '100vw', height: '100vh' });
    expect(props['data-mobile-fullscreen']).toBe('true');
  });

  it('keeps dialog at schema size on mobile when size is explicitly set', () => {
    mocks.isMobile = true;
    seedPageAndRuntime([
      {
        id: 'dialog-sized',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'dialog-body', size: 'sm' },
      },
    ]);

    render(<DialogHost />);

    const props = mocks.dialogContentProps[0]!;
    expect(props['data-mobile-fullscreen']).toBeUndefined();
    expect(props.style).toMatchObject({});
    expect(props.size).toBe('default');
  });

  it('does not force fullscreen on desktop', () => {
    mocks.isMobile = false;
    seedPageAndRuntime([
      {
        id: 'dialog-desktop',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'dialog-body' },
      },
    ]);

    render(<DialogHost />);

    const props = mocks.dialogContentProps[0]!;
    expect(props['data-mobile-fullscreen']).toBeUndefined();
    expect(props.style).toMatchObject({});
  });

  it('overrides drawer direction to bottom on mobile when schema side is not bottom', () => {
    mocks.isMobile = true;
    seedPageAndRuntime([
      {
        id: 'drawer-mobile',
        kind: 'drawer',
        scope: makeScope(),
        surface: { body: 'drawer-body', side: 'right' },
      },
    ]);

    render(<DialogHost />);

    expect(mocks.drawerDirections).toEqual(['bottom']);
    expect(mocks.drawerContentProps[0]!['data-mobile-side-overridden']).toBe('true');
  });

  it('keeps drawer schema side on desktop', () => {
    mocks.isMobile = false;
    seedPageAndRuntime([
      {
        id: 'drawer-desktop',
        kind: 'drawer',
        scope: makeScope(),
        surface: { body: 'drawer-body', side: 'right' },
      },
    ]);

    render(<DialogHost />);

    expect(mocks.drawerDirections).toEqual(['right']);
    expect(mocks.drawerContentProps[0]!['data-mobile-side-overridden']).toBeUndefined();
  });

  it('does not override drawer direction on mobile when schema side is already bottom', () => {
    mocks.isMobile = true;
    seedPageAndRuntime([
      {
        id: 'drawer-bottom',
        kind: 'drawer',
        scope: makeScope(),
        surface: { body: 'drawer-body', side: 'bottom' },
      },
    ]);

    render(<DialogHost />);

    expect(mocks.drawerDirections).toEqual(['bottom']);
    expect(mocks.drawerContentProps[0]!['data-mobile-side-overridden']).toBeUndefined();
  });

  // L6 regression anchor: inner overlays (Base UI Popover/Select) portal to the
  // document root independently. The flux surface host must NEVER write a
  // `position` (or any overlay geometry) into DrawerContent's inline style —
  // otherwise opening an inner popover would corrupt the drawer host geometry.
  // This invariant is satisfied by construction (buildSurfaceInlineStyle only
  // emits width/height), and this anchor locks it.
  it('never writes position into DrawerContent inline style regardless of size/width/height (L6)', () => {
    for (const surface of [
      { body: 'drawer-body', side: 'right' },
      { body: 'drawer-body', side: 'right', size: 'full' as const },
      { body: 'drawer-body', side: 'left', width: 320 },
      { body: 'drawer-body', side: 'bottom', height: 200 },
      { body: 'drawer-body', side: 'right', width: '50%', height: '100%' },
    ]) {
      mocks.drawerContentProps = [];
      seedPageAndRuntime([
        { id: 'drawer-geom', kind: 'drawer', scope: makeScope(), surface },
      ]);

      render(<DialogHost />);

      expect(mocks.drawerContentProps).toHaveLength(1);
      const style = mocks.drawerContentProps[0]!.style as Record<string, unknown> | undefined;
      expect(style).toBeTruthy();
      expect(style).not.toHaveProperty('position');
      expect(style).not.toHaveProperty('top');
      expect(style).not.toHaveProperty('left');
      expect(style).not.toHaveProperty('right');
      expect(style).not.toHaveProperty('bottom');
      expect(style).not.toHaveProperty('zIndex');
      cleanup();
    }
  });

  afterEach(() => {
    cleanup();
  });
});
