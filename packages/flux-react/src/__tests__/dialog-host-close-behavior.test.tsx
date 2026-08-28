import React from 'react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  return {
    useCurrentPage: vi.fn(),
    useCurrentSurfaceRuntime: vi.fn(),
    renderSurfaceNode: vi.fn((node: unknown) => (node == null ? null : <span>{String(node)}</span>)),
    useSurfaceScopeSnapshot: vi.fn(),
    resolveContainerElement: vi.fn(() => undefined),
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
  useIsMobile: () => false,
  Dialog: ({ children, onOpenChange }: any) => (
    <div data-testid="dialog-root">
      <button type="button" data-testid="dialog-outside-press" onClick={() => onOpenChange(false, { reason: 'outside-press' })}>
        outside
      </button>
      <button type="button" data-testid="dialog-escape-key" onClick={() => onOpenChange(false, { reason: 'escape-key' })}>
        esc
      </button>
      <button type="button" data-testid="dialog-close-press" onClick={() => onOpenChange(false, { reason: 'close-press' })}>
        close
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  Drawer: ({ children, onOpenChange }: any) => (
    <div data-testid="drawer-root">
      <button type="button" data-testid="drawer-outside-press" onClick={() => onOpenChange(false, { reason: 'outside-press' })}>
        outside
      </button>
      <button type="button" data-testid="drawer-escape-key" onClick={() => onOpenChange(false, { reason: 'escape-key' })}>
        esc
      </button>
      <button type="button" data-testid="drawer-close-press" onClick={() => onOpenChange(false, { reason: 'close-press' })}>
        close
      </button>
      {children}
    </div>
  ),
  DrawerContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DrawerBody: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
  DrawerFooter: ({ children }: any) => <div>{children}</div>,
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

describe('DialogHost stacked dialogs (E2f regression: nested dialog must not close parent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
  });

  afterEach(() => cleanup());

  // Bug fix: when an uncontrolled inner dialog (e.g. openDialog picker) is
  // opened on top of a controlled outer dialog, an outside-press or escape
  // triggered by Base UI on the OUTER should not close it. The user is
  // interacting with whatever is on top; the outer's close handlers must be
  // inert until the outer is topmost again.
  it('does NOT close a non-topmost dialog on outside-press', () => {
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'outer',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'outer-body' },
      },
      {
        id: 'inner',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'inner-body' },
      },
    ]);
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);
    // Both dialogs render in DOM. Their outside-press buttons fire
    // onOpenChange(false, { reason: 'outside-press' }) on each dialog.
    // The outer (non-topmost) must NOT close; the inner (topmost) MUST close.
    const outsideButtons = screen.getAllByTestId('dialog-outside-press');
    expect(outsideButtons).toHaveLength(2);

    // Simulate a click in the inner dialog — its own outside-press handler
    // fires first; in real Base UI the inner is the topmost. We simulate
    // the inner receiving the click event:
    fireEvent.click(outsideButtons[1]);

    expect(surfaceRuntime.close).toHaveBeenCalledWith('inner');
    expect(surfaceRuntime.close).not.toHaveBeenCalledWith('outer');
  });

  it('does NOT close a non-topmost dialog on escape-key', () => {
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'outer',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'outer-body' },
      },
      {
        id: 'inner',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'inner-body' },
      },
    ]);
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);
    const escButtons = screen.getAllByTestId('dialog-escape-key');
    expect(escButtons).toHaveLength(2);

    fireEvent.click(escButtons[1]);

    expect(surfaceRuntime.close).toHaveBeenCalledWith('inner');
    expect(surfaceRuntime.close).not.toHaveBeenCalledWith('outer');
  });

  it('still closes the topmost dialog on outside-press / esc', () => {
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'outer',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'outer-body' },
      },
      {
        id: 'inner',
        kind: 'dialog',
        scope: makeScope(),
        surface: { body: 'inner-body' },
      },
    ]);
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    fireEvent.click(screen.getAllByTestId('dialog-outside-press')[1]);
    expect(surfaceRuntime.close).toHaveBeenLastCalledWith('inner');
    expect(surfaceRuntime.close).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByTestId('dialog-escape-key')[1]);
    expect(surfaceRuntime.close).toHaveBeenLastCalledWith('inner');
    expect(surfaceRuntime.close).toHaveBeenCalledTimes(2);
  });
});

describe('DialogHost closeOnOutside / closeOnEsc reason inspection (E2f)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
  });

  afterEach(() => cleanup());

  describe('dialog', () => {
    it('closes on outside-press when closeOnOutsideClick is default (true)', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'dialog-1',
          kind: 'dialog',
          scope: makeScope(),
          surface: { body: 'dialog-body' },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('dialog-outside-press'));
      expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-1');
    });

    it('does not close on outside-press when closeOnOutsideClick is false', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'dialog-1',
          kind: 'dialog',
          scope: makeScope(),
          surface: { body: 'dialog-body', closeOnOutsideClick: false },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('dialog-outside-press'));
      expect(surfaceRuntime.close).not.toHaveBeenCalled();
    });

    it('does not close on escape-key when closeOnEsc is false', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'dialog-1',
          kind: 'dialog',
          scope: makeScope(),
          surface: { body: 'dialog-body', closeOnEsc: false },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('dialog-escape-key'));
      expect(surfaceRuntime.close).not.toHaveBeenCalled();
    });

    it('still closes on close-press when closeOnEsc and closeOnOutsideClick are both false', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'dialog-1',
          kind: 'dialog',
          scope: makeScope(),
          surface: { body: 'dialog-body', closeOnOutsideClick: false, closeOnEsc: false },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('dialog-close-press'));
      expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-1');
    });
  });

  describe('drawer', () => {
    it('closes on outside-press when closeOnOutside is default (true)', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'drawer-1',
          kind: 'drawer',
          scope: makeScope(),
          surface: { body: 'drawer-body' },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('drawer-outside-press'));
      expect(surfaceRuntime.close).toHaveBeenCalledWith('drawer-1');
    });

    it('does not close on outside-press when closeOnOutside is false (asymmetric-bug fix)', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'drawer-1',
          kind: 'drawer',
          scope: makeScope(),
          surface: { body: 'drawer-body', closeOnOutside: false },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('drawer-outside-press'));
      expect(surfaceRuntime.close).not.toHaveBeenCalled();
    });

    it('does not close on escape-key when closeOnEsc is false', () => {
      const surfaceRuntime = makeSurfaceRuntime([
        {
          id: 'drawer-1',
          kind: 'drawer',
          scope: makeScope(),
          surface: { body: 'drawer-body', closeOnEsc: false },
        },
      ]);
      mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

      render(<DialogHost />);
      fireEvent.click(screen.getByTestId('drawer-escape-key'));
      expect(surfaceRuntime.close).not.toHaveBeenCalled();
    });
  });
});
