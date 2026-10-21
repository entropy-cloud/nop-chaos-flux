import { afterEach, describe, expect, it, vi } from 'vitest';
import { suppressClickAfterDrag } from './click-suppression.js';

function fireTouch(target: EventTarget, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { touches: [{ clientX: x, clientY: y }] });
  target.dispatchEvent(event);
}

function fireClick(target: EventTarget, trusted: boolean) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  // happy-dom does not model isTrusted faithfully for dispatched events;
  // pin it explicitly on the instance for both branches.
  Object.defineProperty(event, 'isTrusted', { value: trusted });
  target.dispatchEvent(event);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('suppressClickAfterDrag', () => {
  it('lets clicks through when no drag happened', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    document.body.appendChild(container);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchend', 0, 0);
    fireClick(child, true);

    expect(onChildClick).toHaveBeenCalledTimes(1);
    cleanup();
    container.remove();
  });

  it('suppresses exactly one trusted click after a >6px drag', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    document.body.appendChild(container);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchmove', 10, 0);
    fireTouch(container, 'touchend', 10, 0);
    fireClick(child, true);
    expect(onChildClick).not.toHaveBeenCalled();

    // one-shot: the following click passes again
    fireClick(child, true);
    expect(onChildClick).toHaveBeenCalledTimes(1);

    cleanup();
    container.remove();
  });

  it('ignores sub-threshold drags (<=6px)', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchmove', 6, 0);
    fireTouch(container, 'touchend', 6, 0);
    fireClick(child, true);

    expect(onChildClick).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('exempts programmatic (isTrusted=false) clicks so overswipe still works', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchmove', 40, 0);
    fireTouch(container, 'touchend', 40, 0);
    fireClick(child, false);

    expect(onChildClick).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('stops suppressing after cleanup', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchmove', 30, 0);
    fireTouch(container, 'touchend', 30, 0);
    cleanup();

    fireClick(child, true);
    expect(onChildClick).toHaveBeenCalledTimes(1);
  });
});

describe('suppressClickAfterDrag allowNextClick bypass', () => {
  it('allowNextClick() lets exactly one trusted click through after a drag', () => {
    const container = document.createElement('div');
    const child = document.createElement('button');
    container.appendChild(child);
    const onChildClick = vi.fn();
    child.addEventListener('click', onChildClick);

    const { cleanup, allowNextClick } = suppressClickAfterDrag(container);
    fireTouch(container, 'touchstart', 0, 0);
    fireTouch(container, 'touchmove', 40, 0);
    fireTouch(container, 'touchend', 40, 0);

    // armed suppression would block this trusted click, but the explicit
    // bypass (overswipe trigger path) lets it through once
    allowNextClick();
    fireClick(child, true);
    expect(onChildClick).toHaveBeenCalledTimes(1);

    // one-shot: the next trusted click is suppressed again
    fireClick(child, true);
    expect(onChildClick).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
