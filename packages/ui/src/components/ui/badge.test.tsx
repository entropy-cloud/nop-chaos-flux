import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

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
