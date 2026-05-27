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

  it('does not force grid layout classes when render overrides the host element', () => {
    render(
      <table>
        <RadioGroup render={<tbody />} value="b" aria-label="Row selection">
          <tr>
            <td>
              <RadioGroupItem value="a" aria-label="Row A" />
            </td>
          </tr>
          <tr>
            <td>
              <RadioGroupItem value="b" aria-label="Row B" />
            </td>
          </tr>
        </RadioGroup>
      </table>,
    );

    const group = screen.getByRole('radiogroup', { name: 'Row selection' });
    expect(group.tagName).toBe('TBODY');
    expect(group.className).not.toContain('grid');
    expect(group.className).not.toContain('gap-2');
  });
});
