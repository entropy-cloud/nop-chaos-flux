import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { DiffFileMeta, DiffViewSchema } from '../../schemas.js';

const registerMock = vi.fn();
const mockRegistry = {
  register: registerMock,
} as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockRegistry,
  };
});

const { DiffViewRenderer } = await import('../diff-view-renderer.js');
const { createMockRendererProps } = await import('../../test-support.js');

function createMockProps(overrides: Record<string, unknown> = {}) {
  return createMockRendererProps<DiffViewSchema>({
    props: {
      oldContent: 'line1\nline2\nline3\nline4',
      newContent: 'line1\nchange\nline3\nline4\nline5',
      showLineNumbers: true,
      showInlineDiff: true,
      defaultCollapsedLines: 10,
      viewType: 'split' as const,
      ...overrides,
    },
  });
}

const crossFileFiles: DiffFileMeta[] = [
  { fileName: 'src/index.ts', oldContent: 'a', newContent: 'b', status: 'modified' },
  { fileName: 'src/utils.ts', oldContent: '', newContent: 'new code', status: 'added' },
  { fileName: 'old.ts', oldContent: 'old code', newContent: '', status: 'deleted' },
];

function lastHandle(): ComponentHandle {
  const last = registerMock.mock.calls.at(-1)?.[0] as ComponentHandle | undefined;
  if (!last) {
    throw new Error('no handle registered');
  }
  return last;
}

afterEach(() => {
  cleanup();
  registerMock.mockReset();
});

describe('DiffViewRenderer', () => {
  it('renders diff view with split pane structure', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
    expect(document.querySelector('.nop-diff-split-view')).toBeTruthy();
    expect(screen.getAllByText('line1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders unified view when viewType is unified', () => {
    render(<DiffViewRenderer {...createMockProps({ viewType: 'unified' })} />);
    const container = document.querySelector('[data-view="unified"]');
    expect(container).toBeTruthy();
  });

  it('renders three-column view when middleContent is provided', () => {
    render(
      <DiffViewRenderer
        {...createMockProps({
          middleContent: 'line1\nbase\nline3\nline4',
        })}
      />,
    );
    const view = document.querySelector('[data-view="three-column"]');
    expect(view).toBeTruthy();
  });

  it('renders nothing when meta.visible is false', () => {
    const { container } = render(
      <DiffViewRenderer
        {...createMockProps({})}
        meta={{ visible: false, hidden: true, disabled: false, changed: false }}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('R2.31: invokes onLineClick with the real payload when a diff line is clicked', () => {
    const onLineClick = vi.fn();
    render(<DiffViewRenderer {...createMockProps()} events={{ onLineClick }} />);
    const newPane = document.querySelector('.nop-diff-split-new');
    const addedLine = newPane?.querySelector('[data-diff-type="add"].nop-diff-line-clickable');
    expect(addedLine).toBeTruthy();
    fireEvent.click(addedLine as HTMLElement);
    expect(onLineClick.mock.calls[0][0]).toMatchObject({
      lineNumber: 3,
      side: 'new',
      type: 'add',
    });
  });

  it('dispatches onLineClick with event/evaluationBindings ctx for args resolution (P1-10)', () => {
    const onLineClick = vi.fn();
    render(<DiffViewRenderer {...createMockProps()} events={{ onLineClick }} />);
    const newPane = document.querySelector('.nop-diff-split-new');
    const addedLine = newPane?.querySelector('[data-diff-type="add"].nop-diff-line-clickable');
    fireEvent.click(addedLine as HTMLElement);
    const [, ctx] = onLineClick.mock.calls[0] as [unknown, unknown];
    const eventCtx = ctx as { event: unknown; evaluationBindings: unknown };
    expect(eventCtx.event).toMatchObject({ lineNumber: 3, side: 'new', type: 'add' });
    expect(eventCtx.evaluationBindings).toMatchObject({ lineNumber: 3, side: 'new', type: 'add' });
  });

  it('dispatches onHunkExpand with event/evaluationBindings ctx for args resolution (P1-10)', () => {
    const onHunkExpand = vi.fn();
    const { container } = render(
      <DiffViewRenderer
        {...createMockProps({ defaultCollapsedLines: 1 })}
        events={{ onHunkExpand }}
      />,
    );
    const expandButton = container.querySelector('.nop-diff-hunk-expand-btn');
    fireEvent.click(expandButton as HTMLElement);
    const [, ctx] = onHunkExpand.mock.calls[0] as [unknown, unknown];
    const eventCtx = ctx as { event: unknown; evaluationBindings: unknown };
    expect(eventCtx.event).toMatchObject({ hunkIndex: 0, expanded: true });
    expect(eventCtx.evaluationBindings).toMatchObject({ hunkIndex: 0, expanded: true });
  });

  it('R2.31: registers a component handle exposing the four capability methods (P1-8)', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    const handle = lastHandle();
    expect(handle.type).toBe('diff-view');
    expect(handle.capabilities.listMethods?.()).toEqual([
      'toggleViewType',
      'setViewType',
      'expandAll',
      'collapseAll',
    ]);
    expect(handle.capabilities.hasMethod?.('toggleViewType')).toBe(true);
    expect(handle.capabilities.hasMethod?.('setViewType')).toBe(true);
    expect(handle.capabilities.hasMethod?.('expandAll')).toBe(true);
    expect(handle.capabilities.hasMethod?.('collapseAll')).toBe(true);
    expect(handle.capabilities.hasMethod?.('play')).toBe(false);
  });

  it('R2.31: toggleViewType via the registered handle flips the view', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
    const handle = lastHandle();

    act(() => {
      const result = handle.capabilities.invoke('toggleViewType', {}, {} as never);
      expect(result).toMatchObject({ ok: true });
    });
    expect(document.querySelector('[data-view="unified"]')).toBeTruthy();

    act(() => {
      handle.capabilities.invoke('toggleViewType', {}, {} as never);
    });
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
  });

  it('R2.31: setViewType via the registered handle switches to unified', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
    const handle = lastHandle();

    act(() => {
      const result = handle.capabilities.invoke('setViewType', { viewType: 'unified' }, {} as never);
      expect(result).toMatchObject({ ok: true });
    });
    expect(document.querySelector('[data-view="unified"]')).toBeTruthy();
  });

  it('R2.31: setViewType rejects an invalid viewType value', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    const handle = lastHandle();
    const result = handle.capabilities.invoke('setViewType', { viewType: 'sideways' }, {} as never) as {
      ok: boolean;
    };
    expect(result.ok).toBe(false);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
  });

  it('R2.31: expandAll and collapseAll via the registered handle toggle expansion state', () => {
    const { container } = render(
      <DiffViewRenderer {...createMockProps({ defaultCollapsedLines: 1 })} />,
    );
    const handle = lastHandle();

    const collapsedBefore = container.querySelectorAll(
      '[data-slot="diff-hunk-header"][data-expanded="false"]',
    ).length;
    expect(collapsedBefore).toBeGreaterThan(0);

    act(() => {
      handle.capabilities.invoke('expandAll', {}, {} as never);
    });
    const collapsedAfterExpand = container.querySelectorAll(
      '[data-slot="diff-hunk-header"][data-expanded="false"]',
    ).length;
    expect(collapsedAfterExpand).toBe(0);

    act(() => {
      handle.capabilities.invoke('collapseAll', {}, {} as never);
    });
    const collapsedAfterCollapse = container.querySelectorAll(
      '[data-slot="diff-hunk-header"][data-expanded="false"]',
    ).length;
    expect(collapsedAfterCollapse).toBe(collapsedBefore);
  });

  it('R2.31: invokes onHunkExpand when the hunk expand button is clicked', () => {
    const onHunkExpand = vi.fn();
    const { container } = render(
      <DiffViewRenderer
        {...createMockProps({ defaultCollapsedLines: 1 })}
        events={{ onHunkExpand }}
      />,
    );
    const expandButton = container.querySelector('.nop-diff-hunk-expand-btn');
    expect(expandButton).toBeTruthy();
    fireEvent.click(expandButton as HTMLElement);
    expect(onHunkExpand.mock.calls[0][0]).toMatchObject({
      hunkIndex: 0,
      expanded: true,
    });
    expect(
      container.querySelector('[data-slot="diff-hunk-header"][data-expanded="true"]'),
    ).toBeTruthy();
  });

  it('activates schema-declared reaction handles via ready() (CX-9 wiring, P1-4)', () => {
    const readyFns = {
      toggleViewType: vi.fn(),
      setViewType: vi.fn(),
      expandAll: vi.fn(),
      collapseAll: vi.fn(),
    };
    const reactions = {
      toggleViewType: { ready: readyFns.toggleViewType, dispatch: vi.fn() },
      setViewType: { ready: readyFns.setViewType, dispatch: vi.fn() },
    };
    render(<DiffViewRenderer {...createMockProps()} reactions={reactions as never} />);
    expect(readyFns.toggleViewType).toHaveBeenCalledTimes(1);
    expect(readyFns.setViewType).toHaveBeenCalledTimes(1);
    expect(readyFns.expandAll).not.toHaveBeenCalled();
    expect(readyFns.collapseAll).not.toHaveBeenCalled();
  });

  it('clamps a negative activeFileIndex to the first file (P1-5)', () => {
    render(
      <DiffViewRenderer
        {...createMockProps({ files: crossFileFiles, activeFileIndex: -5 })}
      />,
    );
    const fileName = document.querySelector('.nop-diff-file-name')?.textContent;
    expect(fileName).toBe('src/index.ts');
  });

  it('clamps an out-of-range activeFileIndex to the last file', () => {
    render(
      <DiffViewRenderer
        {...createMockProps({ files: crossFileFiles, activeFileIndex: 99 })}
      />,
    );
    const fileName = document.querySelector('.nop-diff-file-name')?.textContent;
    expect(fileName).toBe('old.ts');
  });

  it('renders hunk headers with the data-diff-type="hunk" marker (P1-1)', () => {
    render(<DiffViewRenderer {...createMockProps()} />);
    const headers = document.querySelectorAll('[data-slot="diff-hunk-header"]');
    expect(headers.length).toBeGreaterThan(0);
    for (const header of Array.from(headers)) {
      expect(header.getAttribute('data-diff-type')).toBe('hunk');
    }
  });

  it('dispatches onLineClick from three-column panes with the correct side (P1-3)', () => {
    const onLineClick = vi.fn();
    render(
      <DiffViewRenderer
        {...createMockProps({ middleContent: 'line1\nbase\nline3\nline4' })}
        events={{ onLineClick }}
      />,
    );
    const midPane = document.querySelector('.nop-diff-three-col-mid');
    const conflictRow = midPane?.querySelector('[data-diff-type="conflict"]');
    expect(conflictRow).toBeTruthy();
    fireEvent.click(conflictRow as HTMLElement);
    expect(onLineClick.mock.calls[0][0]).toMatchObject({ side: 'middle', lineNumber: 2 });
  });
});
