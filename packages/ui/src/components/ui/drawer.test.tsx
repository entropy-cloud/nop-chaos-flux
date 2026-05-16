import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Drawer, DrawerContent, DrawerHeader } from './drawer.js';

describe('Drawer', () => {
  it('renders the top-facing drawer contract without rejecting the public top direction', () => {
    render(
      <Drawer open direction="top">
        <DrawerContent>
          <DrawerHeader>Drawer header</DrawerHeader>
          <div>Drawer body</div>
        </DrawerContent>
      </Drawer>,
    );

    const drawerPopup = document.body.querySelector('[data-slot="drawer-popup"]');
    const drawerContent = document.body.querySelector('[data-slot="drawer-content"]');
    const drawerHeader = document.body.querySelector('[data-slot="drawer-header"]');

    expect(drawerPopup).toBeTruthy();
    expect(drawerHeader?.getAttribute('data-direction')).toBe('top');
    expect(drawerContent?.textContent).toContain('Drawer body');
  });

  it('accepts the retained handleOnly prop without changing renderability', () => {
    cleanup();

    render(
      <Drawer open handleOnly>
        <DrawerContent>Handle-only drawer body</DrawerContent>
      </Drawer>,
    );

    expect(document.body.querySelector('[data-slot="drawer-content"]')?.textContent).toContain(
      'Handle-only drawer body',
    );
  });
});
