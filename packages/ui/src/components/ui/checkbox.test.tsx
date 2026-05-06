import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';

afterEach(cleanup);

describe('Checkbox', () => {
  it('renders with checkbox role and data-slot', () => {
    render(<Checkbox />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.getAttribute('data-slot')).toBe('checkbox');
  });

  it('defaults to square shape', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox').getAttribute('data-shape')).toBe('square');
  });

  it('renders circle shape with data-shape attribute', () => {
    render(<Checkbox shape="circle" />);
    const el = screen.getByRole('checkbox');
    expect(el.getAttribute('data-shape')).toBe('circle');
    expect(el.className).toContain('rounded-full');
  });
});
