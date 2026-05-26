import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './sheet.js';

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
    expect(screen.getByText('Narrow the current results').getAttribute('data-slot')).toBe('sheet-description');
    const content = title.closest('[data-slot="sheet-content"]');
    expect(content?.getAttribute('data-side')).toBe('left');
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
  });
});
