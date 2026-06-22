import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js';
import {
  GLOBAL_Z_INDEX_BASELINE_VALUE,
  setGlobalZIndex,
} from '../../hooks/use-global-z-index.js';

function readInlineZIndex(el: Element | null | undefined): number {
  if (!el) return NaN;
  const inline = (el as HTMLElement).style?.zIndex;
  if (inline === '' || inline === undefined || inline === null) return NaN;
  return Number(inline);
}

describe('overlay components — z-index migration (M0.1d)', () => {
  const BASELINE = GLOBAL_Z_INDEX_BASELINE_VALUE;

  afterEach(() => {
    cleanup();
    setGlobalZIndex(BASELINE);
  });

  it('Popover positioner receives a value from the global counter (>= 2000)', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    const content = document.body.querySelector('[data-slot="popover-content"]');
    const positioner = content?.parentElement ?? null;
    const z = readInlineZIndex(positioner);
    expect(Number.isFinite(z)).toBe(true);
    expect(z).toBeGreaterThanOrEqual(BASELINE);
  });

  it('Two simultaneously-rendered overlays get increasing z-index values', () => {
    setGlobalZIndex(BASELINE);
    render(
      <div>
        <Popover open>
          <PopoverTrigger>A</PopoverTrigger>
          <PopoverContent>Body A</PopoverContent>
        </Popover>
        <Popover open>
          <PopoverTrigger>B</PopoverTrigger>
          <PopoverContent>Body B</PopoverContent>
        </Popover>
      </div>,
    );
    const contents = document.body.querySelectorAll('[data-slot="popover-content"]');
    expect(contents.length).toBe(2);
    const firstZ = readInlineZIndex(contents[0]?.parentElement);
    const secondZ = readInlineZIndex(contents[1]?.parentElement);
    expect(Number.isFinite(firstZ)).toBe(true);
    expect(Number.isFinite(secondZ)).toBe(true);
    expect(secondZ).toBeGreaterThan(firstZ);
  });

  it('Tooltip positioner receives a value from the global counter', () => {
    setGlobalZIndex(BASELINE);
    render(
      <TooltipProvider delay={0}>
        <Tooltip open>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const content = document.body.querySelector('[data-slot="tooltip-content"]');
    const positioner = content?.parentElement ?? null;
    const z = readInlineZIndex(positioner);
    expect(Number.isFinite(z)).toBe(true);
    expect(z).toBeGreaterThanOrEqual(BASELINE);
  });
});
