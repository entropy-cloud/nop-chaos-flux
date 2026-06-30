import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';

const registerMock = vi.fn();
const mockRegistry = {
  register: registerMock,
} as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockRegistry,
  };
});

const { CarouselRenderer } = await import('./carousel.js');
const { createMockRendererProps } = await import('./test-support.js');
import type { CarouselSchema } from './schemas.js';

afterEach(() => {
  cleanup();
  registerMock.mockReset();
});

function lastHandle(): ComponentHandle {
  const last = registerMock.mock.calls.at(-1)?.[0] as ComponentHandle | undefined;
  if (!last) {
    throw new Error('no handle registered');
  }
  return last;
}

describe('CarouselRenderer', () => {
  it('renders the nop-carousel marker and one slide per item', () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: {
        items: [
          { image: '/a.png', title: 'A' },
          { image: '/b.png', title: 'B' },
          { image: '/c.png', title: 'C' },
        ],
      },
    });
    const { container } = render(<CarouselRenderer {...props} />);
    const root = container.querySelector('[data-slot="carousel"]');
    expect(root).toBeTruthy();
    expect(root?.className).toContain('nop-carousel');
    expect(root?.querySelectorAll('[data-slot="carousel-item"]').length).toBe(3);
    expect(root?.querySelectorAll('img[data-slot="carousel-item-image"]').length).toBe(3);
  });

  it('renders the empty state when items is empty or absent', () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: {},
    });
    const { container } = render(<CarouselRenderer {...props} />);
    const root = container.querySelector('[data-slot="carousel"]');
    expect(root?.getAttribute('data-empty')).toBe('true');
    expect(root?.querySelector('[data-slot="carousel-empty"]')).toBeTruthy();
    expect(root?.querySelectorAll('[data-slot="carousel-item"]').length).toBe(0);
  });

  it('hides controls and indicators when disabled', () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: { items: [{ image: '/a.png' }], controls: false, indicators: false },
    });
    const { container } = render(<CarouselRenderer {...props} />);
    expect(container.querySelector('[data-slot="carousel-prev"]')).toBeNull();
    expect(container.querySelector('[data-slot="carousel-next"]')).toBeNull();
    expect(container.querySelector('[data-slot="carousel-indicators"]')).toBeNull();
  });

  it('renders indicators with one dot per item', () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: { items: [{ image: '/a.png' }, { image: '/b.png' }] },
    });
    const { container } = render(<CarouselRenderer {...props} />);
    const dots = container.querySelectorAll('[data-slot="carousel-indicator"]');
    expect(dots.length).toBe(2);
    expect(dots[0]?.getAttribute('data-active')).toBe('true');
  });

  it('registers a component handle exposing next/prev/setValue', () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: { items: [{ image: '/a.png' }, { image: '/b.png' }, { image: '/c.png' }] },
    });
    render(<CarouselRenderer {...props} />);
    const handle = lastHandle();
    expect(handle.type).toBe('carousel');
    expect(handle.capabilities.listMethods?.()).toEqual(['next', 'prev', 'setValue']);
    expect(handle.capabilities.hasMethod?.('next')).toBe(true);
    expect(handle.capabilities.hasMethod?.('prev')).toBe(true);
    expect(handle.capabilities.hasMethod?.('setValue')).toBe(true);
    expect(handle.capabilities.hasMethod?.('play')).toBe(false);
  });

  it('setValue clamps the index and rejects non-numeric values', async () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: { items: [{ image: '/a.png' }, { image: '/b.png' }] },
    });
    render(<CarouselRenderer {...props} />);
    const handle = lastHandle();
    const okResult = handle.capabilities.invoke('setValue', { value: 5 }, {} as never) as {
      ok: boolean;
      data?: { index: number };
    };
    expect(okResult.ok).toBe(true);
    expect(okResult.data?.index).toBe(1);
    const badResult = handle.capabilities.invoke('setValue', { value: 'abc' }, {} as never) as {
      ok: boolean;
    };
    expect(badResult.ok).toBe(false);
  });

  it('rejects unknown methods', async () => {
    const props = createMockRendererProps<CarouselSchema>({
      schema: { type: 'carousel' },
      props: { items: [{ image: '/a.png' }] },
    });
    render(<CarouselRenderer {...props} />);
    const handle = lastHandle();
    const result = handle.capabilities.invoke('play', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('emits a single canonical activeIndex key in the onChange payload (no redundant index)', () => {
    // S3 remediation: the published onChange payload must carry a single canonical key
    // (`activeIndex`, aligning with the schema/state field name) — not a redundant `index`
    // duplicate carrying the same value.
    const src = readFileSync('src/carousel.tsx', 'utf8');
    const changePayload = src.match(/type:\s*'change'[^}]*\}/)?.[0];
    expect(changePayload).toBeTruthy();
    expect(changePayload).toContain('activeIndex');
    // No redundant duplicate `index` key in the change payload.
    expect(changePayload).not.toMatch(/\bindex\s*:/);
  });

  it('keeps the component handle identity stable across slide changes (O-03)', () => {
    // O-03 / F6: activeIndex is read via a ref (updated inside the embla select
    // handler) so the handle stays identity-stable across slide changes → no
    // register/unregister churn. autoPlay / loop are direct reads in the now
    // effect-scoped, useMemo-free handle. The previously hand-written useMemo
    // and the no-deps ref-mirror effect are both gone.
    const src = readFileSync('src/carousel.tsx', 'utf8');
    expect(src).toMatch(/activeIndexRef\.current/);
    // The handle is no longer wrapped in a hand-written useMemo.
    expect(src).not.toMatch(/useMemo<ComponentHandle>/);
    // The previous (churn-causing) handle deps array must be gone.
    expect(src).not.toMatch(
      /\[api,\s*props\.id,\s*slotProps\.name,\s*activeIndex,\s*items\.length,\s*autoPlay,\s*loop\]/,
    );
  });

  it('gates autoplay on reduced-motion and pauses on hover/focus/offscreen (O-04)', () => {
    // WCAG 2.2 2.2.2: autoplay must honor prefers-reduced-motion and pause on
    // hover/focus and while offscreen. (jsdom cannot drive embla, so this guards
    // the presence of the contract; the runtime behavior is exercised in the
    // playground.)
    const src = readFileSync('src/carousel.tsx', 'utf8');
    expect(src).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(src).toMatch(/reducedMotion\.matches/);
    expect(src).toMatch(/'mouseenter'/);
    expect(src).toMatch(/'mouseleave'/);
    expect(src).toMatch(/'focusin'/);
    expect(src).toMatch(/'focusout'/);
    expect(src).toMatch(/IntersectionObserver/);
  });
});
