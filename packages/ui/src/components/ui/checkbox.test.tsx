import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders with checkbox role and data-slot', () => {
    render(<Checkbox />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.getAttribute('data-slot')).toBe('checkbox');
  });
});
