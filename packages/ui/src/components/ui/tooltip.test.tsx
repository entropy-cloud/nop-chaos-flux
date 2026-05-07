import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js';

describe('Tooltip', () => {
  it('renders trigger with data-slot', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Hover me');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('data-slot')).toBe('tooltip-trigger');
  });
});
