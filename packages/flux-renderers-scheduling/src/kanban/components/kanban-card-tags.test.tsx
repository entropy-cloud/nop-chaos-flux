import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanCardTags } from './kanban-card-tags.js';
import type { KanbanTag, KanbanMember } from './kanban-card-tags.js';

afterEach(cleanup);

describe('KanbanCardTags', () => {
  it('renders color dot when color is provided', () => {
    const { container } = render(<KanbanCardTags color="#ff0000" />);
    const dot = container.querySelector('.nop-kanban-card-color-dot');
    expect(dot).toBeTruthy();
    expect((dot as HTMLElement).style.backgroundColor).toBe('#ff0000');
  });

  it('does not render color dot when color is not provided', () => {
    const { container } = render(<KanbanCardTags />);
    const dot = container.querySelector('.nop-kanban-card-color-dot');
    expect(dot).toBeNull();
  });

  it('renders tag pills', () => {
    const tags: KanbanTag[] = [
      { id: 't1', text: 'Bug', color: '#ef4444' },
      { id: 't2', text: 'Feature', color: '#3b82f6' },
    ];
    render(<KanbanCardTags tags={tags} />);
    expect(screen.getByText('Bug')).toBeTruthy();
    expect(screen.getByText('Feature')).toBeTruthy();
  });

  it('collapses tags beyond maxVisibleTags', () => {
    const tags: KanbanTag[] = [
      { id: 't1', text: 'A', color: '#aaa' },
      { id: 't2', text: 'B', color: '#bbb' },
      { id: 't3', text: 'C', color: '#ccc' },
      { id: 't4', text: 'D', color: '#ddd' },
    ];
    render(<KanbanCardTags tags={tags} maxVisibleTags={2} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('renders member avatars with initials from first name', () => {
    const members: KanbanMember[] = [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ];
    const { container } = render(<KanbanCardTags members={members} />);
    const memberEls = container.querySelectorAll('.nop-kanban-card-member');
    expect(memberEls.length).toBe(2);
    expect(memberEls[0].textContent).toBe('A');
    expect(memberEls[1].textContent).toBe('B');
  });

  it('shows multi-word member initials', () => {
    const members: KanbanMember[] = [
      { id: 'u1', name: 'Alice Li' },
    ];
    const { container } = render(<KanbanCardTags members={members} />);
    const memberEl = container.querySelector('.nop-kanban-card-member');
    expect(memberEl!.textContent).toBe('AL');
  });

  it('collapses members beyond maxVisibleMembers', () => {
    const members: KanbanMember[] = [
      { id: 'u1', name: 'A' },
      { id: 'u2', name: 'B' },
      { id: 'u3', name: 'C' },
      { id: 'u4', name: 'D' },
    ];
    render(<KanbanCardTags members={members} maxVisibleMembers={2} />);
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('renders nothing when no props provided', () => {
    const { container } = render(<KanbanCardTags />);
    const inner = container.firstChild as HTMLElement;
    expect(inner.children.length).toBe(0);
    expect(inner.className).toContain('nop-kanban-card-tags');
  });

  it('renders both tags and members together', () => {
    const tags: KanbanTag[] = [{ id: 't1', text: 'Bug', color: '#ef4444' }];
    const members: KanbanMember[] = [{ id: 'u1', name: 'Alice' }];
    const { container } = render(<KanbanCardTags tags={tags} members={members} />);
    const tagEl = container.querySelector('.nop-kanban-card-tag');
    expect(tagEl).toBeTruthy();
    expect(tagEl!.textContent).toBe('Bug');
    const memberEl = container.querySelector('.nop-kanban-card-member');
    expect(memberEl).toBeTruthy();
    expect(memberEl!.textContent).toBe('A');
  });
});
