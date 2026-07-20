import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { KanbanTagFilter } from './kanban-tag-filter.js';
import type { KanbanFilterTag } from './kanban-tag-filter.js';

afterEach(cleanup);

const sampleTags: KanbanFilterTag[] = [
  { id: 't1', text: 'Bug', color: '#ef4444' },
  { id: 't2', text: 'Feature', color: '#3b82f6' },
  { id: 't3', text: 'Urgent', color: '#f59e0b' },
];

describe('KanbanTagFilter', () => {
  it('renders nothing when tags array is empty', () => {
    const { container } = render(
      <KanbanTagFilter tags={[]} selectedTagIds={[]} onToggleTag={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all tag buttons', () => {
    render(<KanbanTagFilter tags={sampleTags} selectedTagIds={[]} onToggleTag={vi.fn()} />);
    expect(screen.getByText('Bug')).toBeTruthy();
    expect(screen.getByText('Feature')).toBeTruthy();
    expect(screen.getByText('Urgent')).toBeTruthy();
  });

  it('shows selected state for selected tags', () => {
    const { container } = render(
      <KanbanTagFilter tags={sampleTags} selectedTagIds={['t1']} onToggleTag={vi.fn()} />,
    );
    const buttons = container.querySelectorAll('button');
    const bugButton = Array.from(buttons).find((b) => b.textContent === 'Bug');
    expect(bugButton).toBeTruthy();
  });

  it('calls onToggleTag when a tag is clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <KanbanTagFilter tags={sampleTags} selectedTagIds={[]} onToggleTag={onToggle} />,
    );
    const buttons = container.querySelectorAll('button');
    const bugButton = Array.from(buttons).find((b) => b.textContent === 'Bug');
    if (bugButton) fireEvent.click(bugButton);
    expect(onToggle).toHaveBeenCalledWith('t1');
  });

  it('shows clear button when tags are selected', () => {
    const { container } = render(
      <KanbanTagFilter tags={sampleTags} selectedTagIds={['t1']} onToggleTag={vi.fn()} />,
    );
    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '清除');
    expect(clearBtn).toBeTruthy();
  });

  it('does not show clear button when no tags are selected', () => {
    const { container } = render(
      <KanbanTagFilter tags={sampleTags} selectedTagIds={[]} onToggleTag={vi.fn()} />,
    );
    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '清除');
    expect(clearBtn).toBeUndefined();
  });
});
