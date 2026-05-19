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

  it('uses contained geometry when containerElement is provided', () => {
    cleanup();

    const container = document.createElement('div');
    container.setAttribute('data-testid', 'drawer-container');
    document.body.appendChild(container);

    const { unmount } = render(
      <Drawer open containerElement={container}>
        <DrawerContent>
          <DrawerHeader>Contained drawer</DrawerHeader>
          <div>Contained body</div>
        </DrawerContent>
      </Drawer>,
    );

    const overlay = container.querySelector('[data-slot="drawer-overlay"]');
    const containedRoot = container.querySelector('[data-slot="drawer-contained-root"]');
    const popup = container.querySelector('[data-slot="drawer-popup"]');
    const viewport = popup?.parentElement;

    expect(containedRoot?.className).toContain('relative');
    expect(overlay?.className).toContain('absolute inset-0');
    expect(overlay?.className).not.toContain('fixed inset-0');
    expect(viewport?.className).toContain('absolute');
    expect(viewport?.className).not.toContain('fixed');
    expect(popup?.className).toContain('absolute');
    expect(popup?.className).not.toContain('fixed');
    expect(container.textContent).toContain('Contained body');

    unmount();

    expect(container.querySelector('[data-slot="drawer-contained-root"]')).toBeNull();

    container.remove();
  });
});
