import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu.js';

afterEach(() => {
  cleanup();
});

describe('DropdownMenu', () => {
  it('opens through the trigger and renders menu item/content slots', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Open menu</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger.getAttribute('data-slot')).toBe('dropdown-menu-trigger');

    fireEvent.click(trigger);

    const item = screen.getByRole('menuitem', { name: 'Rename' });
    expect(item.getAttribute('data-slot')).toBe('dropdown-menu-item');
    expect(item.closest('[data-slot="dropdown-menu-content"]')).toBeTruthy();
  });
});
