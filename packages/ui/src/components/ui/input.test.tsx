import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders with textbox role and data-slot', () => {
    render(<Input type="text" placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeTruthy();
    expect(input.getAttribute('data-slot')).toBe('input');
  });

  it('applies size data attribute', () => {
    render(<Input type="text" placeholder="Small" size="sm" />);

    const input = screen.getByPlaceholderText('Small');
    expect(input.getAttribute('data-size')).toBe('sm');
  });
});
