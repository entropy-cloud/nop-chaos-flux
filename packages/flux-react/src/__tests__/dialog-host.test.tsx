import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  return {
    useCurrentPage: vi.fn(),
    useCurrentSurfaceRuntime: vi.fn(),
    renderSurfaceNode: vi.fn((node: unknown) => {
      if (node === 'dialog-title' || node === 'drawer-title') {
        return <span>{String(node)}</span>;
      }

      if (node === 'dialog-close-body') {
        return (
          <button type="button" data-slot="dialog-close">
            Close dialog
          </button>
        );
      }

      if (node === 'drawer-close-body') {
        return (
          <button type="button" data-slot="drawer-close">
            Close drawer
          </button>
        );
      }

      return node == null ? null : <span>{String(node)}</span>;
    }),
    useSurfaceScopeSnapshot: vi.fn(),
    resolveContainerElement: vi.fn((id?: string) => (id ? { id } : undefined)),
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
  Dialog: ({ children, onOpenChange, noOverlay }: any) => (
    <div data-testid="dialog-root" data-no-overlay={String(noOverlay)}>
      <button type="button" data-testid="dialog-open-change" onClick={() => onOpenChange(false)}>
        close dialog
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children, onClickCapture }: any) => (
    <div data-testid="dialog-content" onClickCapture={onClickCapture}>
      {children}
    </div>
  ),
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  Drawer: ({ children, onOpenChange, direction }: any) => (
    <div data-testid="drawer-root" data-direction={direction}>
      <button
        type="button"
        data-testid={`drawer-open-change-${direction}`}
        onClick={() => onOpenChange(false)}
      >
        close drawer
      </button>
      {children}
    </div>
  ),
  DrawerContent: ({ children, onClickCapture, showMask }: any) => (
    <div
      data-testid="drawer-content"
      data-show-mask={String(showMask)}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  ),
  DrawerBody: ({ children }: any) => <div data-testid="drawer-body">{children}</div>,
  DrawerHeader: ({ children }: any) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }: any) => <div data-testid="drawer-title">{children}</div>,
}));

import { DialogHost } from '../dialog-host.js';

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

describe('DialogHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when page or surfaces are unavailable', () => {
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useCurrentSurfaceRuntime.mockReturnValue(makeSurfaceRuntime([]));

    const { container, rerender } = render(<DialogHost />);
    expect(container.innerHTML).toBe('');

    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(undefined);
    rerender(<DialogHost />);
    expect(container.innerHTML).toBe('');

    mocks.useCurrentSurfaceRuntime.mockReturnValue(makeSurfaceRuntime([]));
    rerender(<DialogHost />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialogs, resolves containers, and closes through open-change and close targets', () => {
    const scope = makeScope();
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'dialog-1',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'dialog-1-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'dialog-title',
        body: 'dialog-close-body',
        surface: { body: 'fallback-dialog-body', showMask: false },
      },
      {
        id: 'dialog-2',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'dialog-2-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: undefined,
        surface: { body: 'fallback-dialog-body', container: 'surface-modal' },
      },
    ]);

    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    expect(screen.getAllByTestId('dialog-root')).toHaveLength(2);
    expect(screen.getByTestId('dialog-title').textContent).toBe('dialog-title');
    expect(screen.getByText('fallback-dialog-body')).toBeTruthy();
    expect(screen.getAllByTestId('dialog-body')).toHaveLength(2);
    expect(screen.getAllByTestId('dialog-root')[0]?.getAttribute('data-no-overlay')).toBe('true');
    expect(screen.getAllByTestId('dialog-root')[1]?.getAttribute('data-no-overlay')).toBe('false');
    expect(mocks.useSurfaceScopeSnapshot).not.toHaveBeenCalled();
    expect(mocks.resolveContainerElement).toHaveBeenNthCalledWith(1, 'page-modal', undefined);
    expect(mocks.resolveContainerElement).toHaveBeenNthCalledWith(2, 'surface-modal', undefined);

    fireEvent.click(screen.getByText('Close dialog'));
    fireEvent.click(screen.getAllByTestId('dialog-open-change')[1]!);

    expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-1');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-2');
  });

  it('renders drawers with each supported direction and closes them from close targets', () => {
    const scope = makeScope();
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'drawer-left',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-left-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'drawer-title',
        body: 'drawer-close-body',
        surface: { body: 'drawer-body', side: 'left', showMask: false },
      },
      {
        id: 'drawer-top',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-top-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: 'drawer-body',
        surface: { body: 'drawer-body', side: 'top' },
      },
      {
        id: 'drawer-bottom',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-bottom-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: 'drawer-body',
        surface: { body: 'drawer-body', side: 'bottom' },
      },
      {
        id: 'drawer-right',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-right-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: 'drawer-body',
        surface: { body: 'drawer-body' },
      },
    ]);

    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    const drawers = screen.getAllByTestId('drawer-root');
    expect(drawers.map((node) => node.getAttribute('data-direction'))).toEqual([
      'left',
      'top',
      'bottom',
      'right',
    ]);
    expect(screen.getAllByTestId('drawer-content')[0]?.getAttribute('data-show-mask')).toBe(
      'false',
    );
    expect(screen.getAllByTestId('drawer-content')[1]?.getAttribute('data-show-mask')).toBe('true');
    expect(screen.getAllByTestId('drawer-body')).toHaveLength(4);
    expect(screen.getByTestId('drawer-title').textContent).toBe('drawer-title');

    fireEvent.click(screen.getByText('Close drawer'));
    fireEvent.click(screen.getByTestId('drawer-open-change-right'));

    expect(surfaceRuntime.close).toHaveBeenCalledWith('drawer-left');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('drawer-right');
  });
});
