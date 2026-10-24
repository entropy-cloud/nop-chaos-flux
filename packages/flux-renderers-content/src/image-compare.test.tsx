import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImageCompareRenderer } from './image-compare.js';
import { createMockRendererProps } from './test-support.js';
import type { ImageCompareSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function renderCompare(propsOverride: Partial<ImageCompareSchema> = {}) {
  const props = createMockRendererProps<ImageCompareSchema>({
    schema: { type: 'image-compare' },
    props: {
      before: '/before.png',
      after: '/after.png',
      alt: 'Cover',
      ...propsOverride,
    },
  });
  return render(<ImageCompareRenderer {...props} />);
}

function rootOf() {
  return document.querySelector('[data-slot="image-compare-root"]') as HTMLElement;
}

function handleOf() {
  return document.querySelector('[data-slot="image-compare-handle"]') as HTMLElement;
}

function beforeOf() {
  return document.querySelector('[data-slot="image-compare-before"]') as HTMLElement;
}

function stubRect(width = 200, height = 100) {
  const rect = { left: 0, top: 0, width, height, right: width, bottom: height } as DOMRect;
  vitestSanitizeRect(rootOf(), rect);
  return rect;
}

function vitestSanitizeRect(el: HTMLElement, rect: DOMRect) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

describe('ImageCompareRenderer (arc-component-gap G7I discriminant)', () => {
  it('renders root marker + five slots; handle carries slider a11y triple + label', () => {
    const { container } = renderCompare();
    expect(container.querySelector('.nop-image-compare')).toBeTruthy();
    for (const slot of [
      'image-compare-root',
      'image-compare-after',
      'image-compare-before',
      'image-compare-divider',
      'image-compare-handle',
    ]) {
      expect(document.querySelector(`[data-slot="${slot}"]`)).toBeTruthy();
    }
    expect(rootOf().getAttribute('data-orientation')).toBe('horizontal');
    const handle = handleOf();
    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('100');
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
    expect(handle.getAttribute('aria-label')).toBe('Cover divider');
    expect(handle.getAttribute('tabindex')).toBe('0');
  });

  it('seeds defaultPosition and clamps out-of-range seeds', () => {
    const { unmount } = renderCompare({ defaultPosition: 25 });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('25');
    unmount();
    cleanup();
    renderCompare({ defaultPosition: 240 });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('100');
    unmount();
    cleanup();
    renderCompare({ defaultPosition: -7 });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('0');
  });

  it('drives clip-path from position (horizontal shows before-left)', () => {
    renderCompare({ defaultPosition: 25 });
    expect(beforeOf().style.clipPath).toBe('inset(0 75% 0 0)');
  });

  it('pointer drag recomputes position from bounding rect (stubbed rect)', () => {
    renderCompare();
    stubRect(200, 100);
    const root = rootOf();
    const capture = viStubCapture(root);
    fireEvent.pointerDown(root, { clientX: 50, clientY: 0, pointerId: 1, buttons: 1 });
    expect(capture.captured).toBe(true);
    fireEvent.pointerMove(root, { clientX: 150, clientY: 0, pointerId: 1, buttons: 1 });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('75');
    // clamp beyond edges
    fireEvent.pointerMove(root, { clientX: 999, clientY: 0, pointerId: 1, buttons: 1 });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('100');
  });

  it('keyboard: horizontal Left/Right ±1, PageUp/Down ±10, Home/End; vertical pairs Up/Down', () => {
    renderCompare({ defaultPosition: 50 });
    const handle = handleOf();
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('51');
    fireEvent.keyDown(handle, { key: 'PageUp' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('61');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('0');
    cleanup();

    renderCompare({ defaultPosition: 50, orientation: 'vertical' });
    expect(rootOf().getAttribute('data-orientation')).toBe('vertical');
    fireEvent.keyDown(handleOf(), { key: 'ArrowUp' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('51');
    fireEvent.keyDown(handleOf(), { key: 'ArrowDown' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('50');
    fireEvent.keyDown(handleOf(), { key: 'ArrowLeft' });
    expect(handleOf().getAttribute('aria-valuenow')).toBe('50');
  });

  it('per-side load failure degrades with error slot; the other side stays an img', () => {
    renderCompare();
    const before = document.querySelector('img[data-slot="image-compare-before"]') as HTMLImageElement;
    const after = document.querySelector('img[data-slot="image-compare-after"]') as HTMLImageElement;
    fireEvent.error(before);
    expect(document.querySelector('[data-slot="image-compare-error"]')).toBeTruthy();
    expect(after.getAttribute('data-slot')).toBe('image-compare-after');
    expect(document.querySelectorAll('[data-slot="image-compare-error"]').length).toBe(1);
    fireEvent.error(after);
    expect(document.querySelectorAll('[data-slot="image-compare-error"]').length).toBe(2);
  });

  it('base layer uses object-fit contain', () => {
    renderCompare();
    const after = document.querySelector('[data-slot="image-compare-after"]') as HTMLElement;
    expect(after.className).toContain('object-contain');
  });
});

function viStubCapture(root: HTMLElement) {
  const state = { captured: false };
  root.setPointerCapture = () => {
    state.captured = true;
  };
  root.hasPointerCapture = () => true;
  root.releasePointerCapture = () => undefined;
  return state;
}
