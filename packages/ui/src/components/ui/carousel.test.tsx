// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Carousel } from './carousel.js';

const emblaState = vi.hoisted(() => {
  const api = {
    canScrollPrev: vi.fn(() => false),
    canScrollNext: vi.fn(() => false),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return { api };
});

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), emblaState.api],
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Carousel', () => {
  it('cleans up both select and reInit subscriptions', () => {
    const view = render(
      <Carousel>
        <div>content</div>
      </Carousel>,
    );

    expect(emblaState.api.on).toHaveBeenCalledWith('reInit', expect.any(Function));
    expect(emblaState.api.on).toHaveBeenCalledWith('select', expect.any(Function));

    view.unmount();

    expect(emblaState.api.off).toHaveBeenCalledWith('reInit', expect.any(Function));
    expect(emblaState.api.off).toHaveBeenCalledWith('select', expect.any(Function));
  });
});
