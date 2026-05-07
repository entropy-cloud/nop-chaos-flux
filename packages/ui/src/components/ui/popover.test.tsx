import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

describe('Popover', () => {
  it('renders trigger with data-slot', () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByText('Open popover');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('data-slot')).toBe('popover-trigger');
  });
});
