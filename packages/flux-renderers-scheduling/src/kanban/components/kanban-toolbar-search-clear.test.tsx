import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { KanbanToolbar } from './kanban-toolbar.js';

afterEach(cleanup);

function renderToolbar(overrides?: Partial<React.ComponentProps<typeof KanbanToolbar>>) {
  const handlers = {
    onFilterChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onToggleActivityLog: vi.fn(),
  };
  const props = { filterText: 'cards', canUndo: false, canRedo: false, ...handlers, ...overrides };
  const utils = render(<KanbanToolbar {...props} />);
  return { utils, handlers, props };
}

describe('KanbanToolbar search clear (G4-视角4-01)', () => {
  it('renders the clear affordance only when the search text is non-empty', () => {
    const { utils } = renderToolbar();
    expect(utils.container.querySelector('[data-slot="kanban-search-clear"]')).toBeTruthy();
    const { utils: emptyUtils } = renderToolbar({ filterText: '' });
    expect(emptyUtils.container.querySelector('[data-slot="kanban-search-clear"]')).toBeNull();
  });

  it('clear control is a link-pattern button carrying an XIcon (lucide svg)', () => {
    const { utils } = renderToolbar();
    const clear = utils.container.querySelector(
      '[data-slot="kanban-search-clear"]',
    ) as HTMLElement;
    expect(clear.tagName).toBe('BUTTON');
    expect(clear.querySelector('svg.lucide-x')).toBeTruthy();
  });

  it('clicking the clear control empties the search text and refocuses the input', () => {
    const { utils, handlers } = renderToolbar();
    const input = utils.container.querySelector('#kanban-search') as HTMLInputElement;
    const clear = utils.container.querySelector(
      '[data-slot="kanban-search-clear"]',
    ) as HTMLElement;
    fireEvent.click(clear);
    expect(handlers.onFilterChange).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(input);
  });

  it('controlled flow: applying the clear resets the input value to empty', () => {
    const { utils, handlers } = renderToolbar();
    const input = utils.container.querySelector('#kanban-search') as HTMLInputElement;
    expect(input.value).toBe('cards');
    fireEvent.click(
      utils.container.querySelector('[data-slot="kanban-search-clear"]') as HTMLElement,
    );
    utils.rerender(
      <KanbanToolbar
        filterText={String(handlers.onFilterChange.mock.calls[0]?.[0] ?? '')}
        canUndo={false}
        canRedo={false}
        onFilterChange={handlers.onFilterChange}
        onUndo={handlers.onUndo}
        onRedo={handlers.onRedo}
        onToggleActivityLog={handlers.onToggleActivityLog}
      />,
    );
    expect(input.value).toBe('');
  });
});
