import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDialogDrag } from './use-dialog-drag.js';

afterEach(() => {
  cleanup();
  document.body.style.removeProperty('user-select');
  document.body.style.removeProperty('-webkit-user-select');
});

function DragHost({ onPointerDownHandler }: { onPointerDownHandler?: boolean }) {
  const { contentRef, handlePointerDown } = useDialogDrag();
  return (
    <div ref={contentRef} onPointerDown={onPointerDownHandler ? handlePointerDown : undefined}>
      <div data-slot="dialog-header">header</div>
    </div>
  );
}

describe('useDialogDrag body style (P1-2)', () => {
  it('locks body user-select on drag start and restores it on stopDrag', () => {
    document.body.style.userSelect = '';
    const { container, unmount } = render(<DragHost onPointerDownHandler />);
    const header = container.querySelector('[data-slot="dialog-header"]') as HTMLElement;

    fireEvent.pointerDown(header, { clientX: 0, clientY: 0 });
    expect(document.body.style.userSelect).toBe('none');

    unmount();
    expect(document.body.style.userSelect).toBe('');
  });

  it('restores body user-select when unmounted before a pointerup fires', () => {
    document.body.style.userSelect = '';
    const { container, unmount } = render(<DragHost onPointerDownHandler />);
    const header = container.querySelector('[data-slot="dialog-header"]') as HTMLElement;

    fireEvent.pointerDown(header, { clientX: 5, clientY: 5 });
    expect(document.body.style.userSelect).toBe('none');

    // Unmount mid-drag: no pointerup/pointercancel reaches stopDrag.
    unmount();
    expect(document.body.style.userSelect).toBe('');
  });
});
