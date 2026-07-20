import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanWipBadge } from './kanban-wip-badge.js';

afterEach(cleanup);

describe('KanbanWipBadge', () => {
  it('displays current/limit when under limit', () => {
    render(<KanbanWipBadge current={3} limit={5} />);
    expect(screen.getByText('3/5')).toBeTruthy();
  });

  it('displays current/limit when at limit', () => {
    render(<KanbanWipBadge current={5} limit={5} />);
    expect(screen.getByText('5/5')).toBeTruthy();
  });

  it('shows red badge with overflow count when over limit', () => {
    render(<KanbanWipBadge current={7} limit={5} />);
    expect(screen.getByText('7/5')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('shows alert icon in strict mode when over limit', () => {
    const { container } = render(<KanbanWipBadge current={6} limit={5} strict />);
    const alertIcon = container.querySelector('.lucide-triangle-alert');
    expect(alertIcon).toBeTruthy();
  });

  it('does not show overflow count when at limit', () => {
    render(<KanbanWipBadge current={5} limit={5} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('does not show overflow count when under limit', () => {
    render(<KanbanWipBadge current={3} limit={5} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('handles zero limit gracefully', () => {
    render(<KanbanWipBadge current={0} limit={0} />);
    expect(screen.getByText('0/0')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<KanbanWipBadge current={3} limit={5} className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });
});
