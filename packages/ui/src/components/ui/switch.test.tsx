import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from './switch.js';

describe('Switch', () => {
  it('renders with switch role and data-slot', () => {
    render(<Switch />);

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeTruthy();
    expect(switchEl.getAttribute('data-slot')).toBe('switch');
  });
});
