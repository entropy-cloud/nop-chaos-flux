import { describe, expect, it } from 'vitest';
import { installTestDomPolyfills } from '../test-support.js';

describe('advanced form test DOM polyfills', () => {
  it('restores global DOM patches after uninstall', () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const originalPointerEvent = globalThis.PointerEvent;

    const restore = installTestDomPolyfills();

    expect(typeof Element.prototype.scrollIntoView).toBe('function');
    expect(typeof globalThis.PointerEvent).toBe('function');

    restore();

    expect(Element.prototype.scrollIntoView).toBe(originalScrollIntoView);
    expect(globalThis.PointerEvent).toBe(originalPointerEvent);
  });
});
