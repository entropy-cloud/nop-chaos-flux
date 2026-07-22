import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffViewRenderer } from '../diff-view-renderer.js';

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
});
