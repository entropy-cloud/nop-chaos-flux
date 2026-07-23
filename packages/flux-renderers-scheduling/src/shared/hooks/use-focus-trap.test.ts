import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './use-focus-trap.js';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button data-testid="first">First</button>
      <button data-testid="last">Last</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should do nothing when active is false', () => {
    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, false));
    const spy = vi.spyOn(container, 'addEventListener');
    unmount();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should do nothing when ref.current is null', () => {
    const ref = { current: null };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));
    expect(unmount).not.toThrow();
  });

  it('should focus first focusable element on activation', () => {
    const firstBtn = container.querySelector('[data-testid="first"]') as HTMLElement;
    const focusSpy = vi.spyOn(firstBtn, 'focus');
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it('should handle tab key trapping', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));
    const lastBtn = container.querySelector('[data-testid="last"]') as HTMLElement;
    lastBtn.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle shift+tab key trapping', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));
    const firstBtn = container.querySelector('[data-testid="first"]') as HTMLElement;
    firstBtn.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
