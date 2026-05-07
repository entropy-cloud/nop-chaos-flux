import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from './separator.js';

describe('Separator', () => {
  it('renders with separator role and data-slot', () => {
    render(<Separator />);

    const separator = screen.getByRole('separator');
    expect(separator).toBeTruthy();
    expect(separator.getAttribute('data-slot')).toBe('separator');
  });

  it('renders with vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);

    const separator = container.querySelector('[data-slot="separator"]');
    if (!separator) {
      throw new Error('Expected separator to render');
    }
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
  });
});
