import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet.js';

afterEach(() => {
  cleanup();
});

describe('Sheet', () => {
  it('renders open content with overlay, title, and description slots', () => {
    render(
      <Sheet modal={false} open>
        <SheetContent side="left" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the current results</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    const title = screen.getByText('Filters');
    expect(title.getAttribute('data-slot')).toBe('sheet-title');
    expect(screen.getByText('Narrow the current results').getAttribute('data-slot')).toBe(
      'sheet-description',
    );
    const content = title.closest('[data-slot="sheet-content"]');
    expect(content?.getAttribute('data-side')).toBe('left');
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
  });
});

// G6-视角8-01 (plan 489 Phase 1): the built-in Sheet close button must sit at
// the same 8px inset as Dialog/Drawer (top-2 right-2), not the historical 12px.
describe('Sheet close button placement', () => {
  it('positions the built-in close button at top-2 right-2 (dialog/drawer parity)', () => {
    render(
      <Sheet modal={false} open>
        <SheetContent>
          <div>Sheet body</div>
        </SheetContent>
      </Sheet>,
    );

    const close = document.querySelector('[data-slot="sheet-close"]');
    expect(close).toBeTruthy();
    expect(close?.className).toContain('top-2');
    expect(close?.className).toContain('right-2');
    expect(close?.className).not.toContain('top-3');
    expect(close?.className).not.toContain('right-3');
  });
});
