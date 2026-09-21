import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, badgeVariants } from './badge.js';

describe('Badge', () => {
  it('renders text content as a span element', () => {
    render(<Badge>Test Badge</Badge>);

    const badge = screen.getByText('Test Badge');
    expect(badge).toBeTruthy();
    expect(badge.tagName.toLowerCase()).toBe('span');
  });

  it('applies variant class', () => {
    render(<Badge variant="destructive">Error</Badge>);

    const badge = screen.getByText('Error');
    expect(badge.className).toContain('destructive');
  });
});

// G6-视角7-01 (plan 489 Phase 1): badge success/warning variants must resolve
// through the design tokens (--success/--warning), never the raw emerald/amber
// palette classes.
describe('Badge token variants', () => {
  it('success variant uses success token classes', () => {
    const classes = badgeVariants({ variant: 'success' });
    expect(classes).toContain('bg-success/15');
    expect(classes).toContain('text-success');
    expect(classes).toContain('dark:bg-success/20');
    expect(classes).not.toMatch(/emerald/);
  });

  it('warning variant uses warning token classes', () => {
    const classes = badgeVariants({ variant: 'warning' });
    expect(classes).toContain('bg-warning/15');
    expect(classes).toContain('text-warning');
    expect(classes).toContain('dark:bg-warning/20');
    expect(classes).not.toMatch(/amber/);
  });

  it('renders success/warning badges without palette literals in the class attribute', () => {
    render(
      <>
        <Badge variant="success">ok</Badge>
        <Badge variant="warning">warn</Badge>
      </>,
    );
    for (const badge of screen.getAllByText(/^(ok|warn)$/)) {
      expect(badge.className).not.toMatch(/emerald|amber/);
    }
  });
});
