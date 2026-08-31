import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Button,
} from '../../index.js';

// [G6-R2-视角6-01] (R2 consistency audit, P1): DrawerBody had no scroll
// contract — long content overflowed the max-h-[80vh]/h-full drawer with no
// scrollbar, asymmetric with DialogBody's built-in overflow contract.
// [G6-R3-视角6-01]: the resizable drawer handle updated `--drawer-resize-size`
// but no CSS/geometry consumed the variable — dragging changed nothing.

afterEach(() => cleanup());

function openDrawer(overrides: { resizable?: boolean } = {}) {
  return render(
    <Drawer open onOpenChange={() => {}} {...overrides}>
      <DrawerContent data-testid="drawer-content">
        <DrawerHeader>
          <span>Title</span>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ height: 2000 }} data-testid="tall-body" />
        </DrawerBody>
        <DrawerFooter>
          <Button>Done</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>,
  );
}

describe('[G6-R2-视角6-01] DrawerBody scroll contract', () => {
  it('DrawerBody carries the flex/scroll body contract', () => {
    openDrawer();
    const body = document.querySelector('[data-slot="drawer-body"]')!;
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('flex-1');
  });
});

describe('[G6-R3-视角6-01] Drawer resize handle drives geometry', () => {
  it('pointer drag on the handle resizes a right-direction drawer', () => {
    render(
      <Drawer open direction="right" onOpenChange={() => {}}>
        <DrawerContent resizable data-testid="drawer-content">
          <DrawerBody>
            <div>Body</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>,
    );

    const handle = document.querySelector('[data-slot="drawer-resize-handle"]') as HTMLElement;
    expect(handle).toBeTruthy();

    // direction=right docks the drawer on the right edge — its handle sits on
    // the LEFT side, so growing means dragging towards negative clientX.
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(window, { clientX: -400, clientY: 0, pointerId: 1, buttons: 1 });
    fireEvent.pointerUp(window, { clientX: -400, clientY: 0, pointerId: 1 });

    const popup = document.querySelector('[data-slot="drawer-popup"]') as HTMLElement;
    expect(popup.style.width).toBe('400px');
    expect(popup.style.maxWidth).toBe('400px');
  });

  it('pointer drag on the handle resizes a bottom drawer height', () => {
    render(
      <Drawer open direction="bottom" onOpenChange={() => {}}>
        <DrawerContent resizable>
          <DrawerBody>
            <div>Body</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>,
    );

    const handle = document.querySelector('[data-slot="drawer-resize-handle"]') as HTMLElement;
    // direction=bottom docks at the bottom edge — its handle sits on TOP, so
    // growing means dragging towards negative clientY.
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(window, { clientX: 0, clientY: -300, pointerId: 1, buttons: 1 });
    fireEvent.pointerUp(window, { clientX: 0, clientY: -300, pointerId: 1 });

    const popup = document.querySelector('[data-slot="drawer-popup"]') as HTMLElement;
    expect(popup.style.height).toBe('300px');
    expect(popup.style.maxHeight).toBe('300px');
  });

  it('exposes the consumed size variable for consumers (marker for the resize channel)', () => {
    render(
      <Drawer open direction="right" onOpenChange={() => {}}>
        <DrawerContent resizable>
          <DrawerBody>
            <div>Body</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>,
    );

    const handle = document.querySelector('[data-slot="drawer-resize-handle"]') as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(window, { clientX: -250, clientY: 0, pointerId: 1, buttons: 1 });
    fireEvent.pointerUp(window, { clientX: -250, clientY: 0, pointerId: 1 });

    const popup = document.querySelector('[data-slot="drawer-popup"]') as HTMLElement;
    expect(popup.style.getPropertyValue('--drawer-resize-size')).toBe('250px');
  });

  it('pointercancel mid-drag stops resizing — later button-less moves do not ghost-resize', () => {
    render(
      <Drawer open direction="right" onOpenChange={() => {}}>
        <DrawerContent resizable>
          <DrawerBody>
            <div>Body</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>,
    );

    const handle = document.querySelector('[data-slot="drawer-resize-handle"]') as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(window, { clientX: -400, clientY: 0, pointerId: 1, buttons: 1 });

    const popup = document.querySelector('[data-slot="drawer-popup"]') as HTMLElement;
    expect(popup.style.width).toBe('400px');

    // The browser cancels the drag (touch gesture takeover, alt-tab, ...).
    fireEvent.pointerCancel(window, { clientX: -400, clientY: 0, pointerId: 1 });

    // After the cancel the press is gone: button-less moves must not resize.
    fireEvent.pointerMove(window, { clientX: -800, clientY: 0, pointerId: 1, buttons: 0 });
    expect(popup.style.width).toBe('400px');
  });
});
