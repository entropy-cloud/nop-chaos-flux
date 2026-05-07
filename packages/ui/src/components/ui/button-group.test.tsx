import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from './button-group.js';

describe('ButtonGroup', () => {
  it('renders a stable group role and orientation contract', () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button type="button">First</Button>
        <Button type="button">Second</Button>
      </ButtonGroup>,
    );

    const group = screen.getByRole('group');
    expect(group.getAttribute('data-slot')).toBe('button-group');
    expect(group.getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders text and separator helper slots', () => {
    render(
      <ButtonGroup>
        <Button type="button">Prev</Button>
        <ButtonGroupSeparator />
        <ButtonGroupText>Page 1</ButtonGroupText>
      </ButtonGroup>,
    );

    expect(screen.getByText('Page 1').getAttribute('data-slot')).toBe('button-group-text');
    expect(
      screen
        .getByText('Page 1')
        .parentElement?.querySelector('[data-slot="button-group-separator"]'),
    ).toBeTruthy();
  });
});
