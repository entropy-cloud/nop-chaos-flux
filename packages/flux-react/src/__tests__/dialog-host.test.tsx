import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

function ThrowOnRender(props: { message: string }): never {
  throw new Error(props.message);
}

const mocks = vi.hoisted(() => {
  return {
    useCurrentPage: vi.fn(),
    useCurrentSurfaceRuntime: vi.fn(),
    renderSurfaceNode: vi.fn((node: unknown) => {
      if (node === 'dialog-title' || node === 'drawer-title') {
        return <span>{String(node)}</span>;
      }

      if (node === 'dialog-crash' || node === 'drawer-crash') {
        return <ThrowOnRender message={`boom:${String(node)}`} />;
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
  useIsMobile: () => false,
  Dialog: ({ children, onOpenChange, noOverlay }: any) => (
    <div data-testid="dialog-root" data-no-overlay={String(noOverlay)}>
      <button type="button" data-testid="dialog-open-change" onClick={() => onOpenChange(false)}>
        close dialog
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children, onClickCapture, size, topAnchored, style }: any) => (
    <div
      data-testid="dialog-content"
      data-size={size ?? ''}
      data-top-anchored={String(topAnchored)}
      data-style-top={style?.top ?? ''}
      onClickCapture={onClickCapture}
    >
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
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertAction: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
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
    cleanup();
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

  it('maps surface sizes to the --dialog-size-* scale and stacks dialogs with the top token', () => {
    const scope = makeScope();
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'd-xl',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'd-xl-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'dialog-xl',
        body: undefined,
        surface: { body: 'xl-body', size: 'lg' },
      },
      {
        id: 'd-md',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'd-md-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: undefined,
        surface: { body: 'md-body', size: 'md' },
      },
      {
        id: 'd-full',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'd-full-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: undefined,
        body: undefined,
        surface: { body: 'full-body', size: 'full' },
      },
    ]);

    mocks.useCurrentPage.mockReturnValue({});
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    const contents = screen.getAllByTestId('dialog-content');
    expect(contents).toHaveLength(3);
    const [xl, md, full] = contents;

    expect(xl?.getAttribute('data-size')).toBe('md');
    expect(xl?.getAttribute('data-top-anchored')).toBe('true');
    expect(xl?.getAttribute('data-style-top')).toBe(
      'calc(var(--dialog-top-offset) + 0 * var(--dialog-stack-step))',
    );

    expect(md?.getAttribute('data-size')).toBe('base');
    expect(md?.getAttribute('data-style-top')).toBe(
      'calc(var(--dialog-top-offset) + 1 * var(--dialog-stack-step))',
    );

    expect(full?.getAttribute('data-size')).toBe('');
    expect(full?.getAttribute('data-top-anchored')).toBe('false');
    expect(full?.getAttribute('data-style-top')).toBe('');
  });

  it('counts only dialogs when indexing stack offsets (drawers do not advance the step)', () => {
    const scope = makeScope();
    const surfaceRuntime = makeSurfaceRuntime([
      {
        id: 'drawer-a',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-a-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'drawer-a',
        body: undefined,
        surface: { body: 'da-body' },
      },
      {
        id: 'd-first',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'd-first-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'd-first',
        body: undefined,
        surface: { body: 'df-body' },
      },
      {
        id: 'drawer-b',
        kind: 'drawer',
        scope,
        validationOwner: { scopeId: 'drawer-b-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'drawer-b',
        body: undefined,
        surface: { body: 'db-body' },
      },
      {
        id: 'd-second',
        kind: 'dialog',
        scope,
        validationOwner: { scopeId: 'd-second-validation' },
        actionScope: undefined,
        componentRegistry: undefined,
        ownerNodeInstance: undefined,
        title: 'd-second',
        body: undefined,
        surface: { body: 'ds-body' },
      },
    ]);

    mocks.useCurrentPage.mockReturnValue({});
    mocks.useCurrentSurfaceRuntime.mockReturnValue(surfaceRuntime);

    render(<DialogHost />);

    const contents = screen
      .getAllByTestId('dialog-content')
      .filter((node) => node.getAttribute('data-size') === '');
    expect(contents).toHaveLength(2);
    expect(contents[0]?.getAttribute('data-style-top')).toBe(
      'calc(var(--dialog-top-offset) + 0 * var(--dialog-stack-step))',
    );
    expect(contents[1]?.getAttribute('data-style-top')).toBe(
      'calc(var(--dialog-top-offset) + 1 * var(--dialog-stack-step))',
    );
    expect(contents[0]?.getAttribute('data-top-anchored')).toBe('true');
    expect(contents[1]?.getAttribute('data-top-anchored')).toBe('true');
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

  it('contains dialog body render failures inside a local node boundary', () => {
    const scope = makeScope();
    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(
      makeSurfaceRuntime([
        {
          id: 'dialog-crash-surface',
          kind: 'dialog',
          scope,
          validationOwner: { scopeId: 'dialog-validation' },
          actionScope: undefined,
          componentRegistry: undefined,
          ownerNodeInstance: undefined,
          title: 'dialog-title',
          body: 'dialog-crash',
          surface: { body: 'dialog-crash' },
        },
      ]),
    );

    const { container } = render(<DialogHost />);

    expect(container.querySelector('[data-slot="node-error-message"]')?.textContent).toContain(
      'dialog-crash-surface:body',
    );
    expect(container.querySelector('[data-testid="dialog-title"]')?.textContent).toBe('dialog-title');
  });

  it('contains drawer body render failures inside a local node boundary', () => {
    const scope = makeScope();
    mocks.useCurrentPage.mockReturnValue({ modalContainer: 'page-modal' });
    mocks.useCurrentSurfaceRuntime.mockReturnValue(
      makeSurfaceRuntime([
        {
          id: 'drawer-crash-surface',
          kind: 'drawer',
          scope,
          validationOwner: { scopeId: 'drawer-validation' },
          actionScope: undefined,
          componentRegistry: undefined,
          ownerNodeInstance: undefined,
          title: 'drawer-title',
          body: 'drawer-crash',
          surface: { body: 'drawer-crash' },
        },
      ]),
    );

    const { container } = render(<DialogHost />);

    expect(container.querySelector('[data-slot="node-error-message"]')?.textContent).toContain(
      'drawer-crash-surface:body',
    );
    expect(container.querySelector('[data-testid="drawer-title"]')?.textContent).toBe('drawer-title');
  });
});
