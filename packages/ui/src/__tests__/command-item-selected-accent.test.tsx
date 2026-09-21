import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Command, CommandItem, CommandList } from '../components/ui/command.js';

afterEach(() => {
  cleanup();
});

// G6-R2-视角10-01 (plan 489 Phase 1): CommandItem's selected state must join
// the accent-highlight family (Select/Combobox use bg-accent), not bg-muted.
describe('CommandItem selected highlight family parity', () => {
  it('uses bg-accent for the selected state and never bg-muted', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem value="alpha">Alpha</CommandItem>
        </CommandList>
      </Command>,
    );

    const item = document.querySelector('[data-slot="command-item"]');
    expect(item).toBeTruthy();
    expect(item?.className).toContain('data-selected:bg-accent');
    expect(item?.className).not.toContain('data-selected:bg-muted');
  });
});
