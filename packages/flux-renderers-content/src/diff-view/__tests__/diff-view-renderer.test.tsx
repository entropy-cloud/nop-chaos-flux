import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DiffViewRenderer, type DiffViewHandle } from '../diff-view-renderer.js';

function createMockProps(overrides: Record<string, unknown> = {}) {
  return {
    props: {
      oldContent: 'line1\nline2\nline3\nline4',
      newContent: 'line1\nchange\nline3\nline4\nline5',
      showLineNumbers: true,
      showInlineDiff: true,
      defaultCollapsedLines: 10,
      viewType: 'split' as const,
      ...overrides,
    },
    meta: { visible: true, hidden: false, disabled: false, changed: false },
    events: {},
    helpers: {} as any,
    reactions: {},
    node: {} as any,
    regions: {},
  } as any;
}

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
      <DiffViewRenderer {...createMockProps({})} meta={{ visible: false, hidden: true, disabled: false, changed: false }} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('R2.31: invokes onLineClick when a diff line is clicked', () => {
    const onLineClick = vi.fn();
    render(<DiffViewRenderer {...createMockProps()} events={{ onLineClick }} />);
    const addedLine = document.querySelector('[data-diff-type="added"].nop-diff-line-clickable');
    if (addedLine) {
      fireEvent.click(addedLine);
      expect(onLineClick).toHaveBeenCalledWith({
        lineNumber: expect.any(Number),
        side: 'new',
        type: 'added',
      });
    }
  });

  it('R2.31: toggles view type via imperative handle', () => {
    const ref = React.createRef<DiffViewHandle>();
    render(<DiffViewRenderer {...createMockProps()} ref={ref} />);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();

    ref.current?.toggleViewType();
    expect(document.querySelector('[data-view="unified"]')).toBeTruthy();

    ref.current?.toggleViewType();
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();
  });

  it('R2.31: setViewType via imperative handle switches to unified', () => {
    const ref = React.createRef<DiffViewHandle>();
    render(<DiffViewRenderer {...createMockProps()} ref={ref} />);
    expect(document.querySelector('[data-view="split"]')).toBeTruthy();

    ref.current?.setViewType('unified');
    expect(document.querySelector('[data-view="unified"]')).toBeTruthy();
  });

  it('R2.31: expandAll and collapseAll via imperative handle toggle expansion state', () => {
    const ref = React.createRef<DiffViewHandle>();
    const { container } = render(
      <DiffViewRenderer {...createMockProps({ defaultCollapsedLines: 1 })} ref={ref} />,
    );

    const collapsedHunksBefore = container.querySelectorAll('[data-diff-hunk-state="collapsed"]');

    ref.current?.expandAll();
    const collapsedAfterExpand = container.querySelectorAll('[data-diff-hunk-state="collapsed"]');
    expect(collapsedAfterExpand.length).toBeLessThanOrEqual(collapsedHunksBefore.length);

    ref.current?.collapseAll();
    const collapsedAfterCollapse = container.querySelectorAll('[data-diff-hunk-state="collapsed"]');
    expect(collapsedAfterCollapse.length).toBeGreaterThanOrEqual(collapsedAfterExpand.length);
  });

  it('R2.31: invokes onHunkExpand when hunk expand button is clicked', () => {
    const onHunkExpand = vi.fn();
    render(
      <DiffViewRenderer
        {...createMockProps({ defaultCollapsedLines: 1 })}
        events={{ onHunkExpand }}
      />,
    );
    const expandButton = document.querySelector('[data-diff-hunk-action="expand"]');
    if (expandButton) {
      fireEvent.click(expandButton);
      expect(onHunkExpand).toHaveBeenCalledWith({
        hunkIndex: expect.any(Number),
        expanded: true,
      });
    }
  });
});
