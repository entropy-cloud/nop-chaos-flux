import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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

  it('does not hijack arrow keys originating from editable controls (P1-4)', () => {
    const view = render(
      <Carousel>
        <input data-testid="editable" type="text" />
      </Carousel>,
    );
    const input = view.getByTestId('editable');

    fireEvent.keyDown(input, { key: 'ArrowRight' });
    fireEvent.keyDown(input, { key: 'ArrowLeft' });

    expect(emblaState.api.scrollNext).not.toHaveBeenCalled();
    expect(emblaState.api.scrollPrev).not.toHaveBeenCalled();
  });

  it('still scrolls on arrow keys from non-editable targets (P1-4)', () => {
    const { container } = render(
      <Carousel>
        <div data-testid="slide">slide</div>
      </Carousel>,
    );
    const carousel = container.querySelector('[data-slot="carousel"]') as HTMLElement;

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(emblaState.api.scrollPrev).toHaveBeenCalled();
  });
});
