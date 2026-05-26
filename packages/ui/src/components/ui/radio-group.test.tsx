import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RadioGroup, RadioGroupItem } from './radio-group.js';

afterEach(() => {
  cleanup();
});

describe('RadioGroup', () => {
  it('renders radio items and updates checked state on selection', () => {
    render(
      <RadioGroup defaultValue="b" aria-label="View mode">
        <RadioGroupItem value="a" aria-label="List" />
        <RadioGroupItem value="b" aria-label="Board" />
      </RadioGroup>,
    );

    const group = screen.getByRole('radiogroup', { name: 'View mode' });
    expect(group.getAttribute('data-slot')).toBe('radio-group');

    const list = screen.getByRole('radio', { name: 'List' });
    const board = screen.getByRole('radio', { name: 'Board' });
    expect(board.getAttribute('data-slot')).toBe('radio-group-item');
    expect(list.getAttribute('aria-checked')).toBe('false');
    expect(board.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(list);
    expect(list.getAttribute('aria-checked')).toBe('true');
    expect(board.getAttribute('aria-checked')).toBe('false');
  });
});
