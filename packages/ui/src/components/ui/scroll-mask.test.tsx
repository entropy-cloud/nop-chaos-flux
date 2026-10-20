import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScrollMask } from './scroll-mask.js';

afterEach(() => {
  cleanup();
});

describe('ScrollMask (plan 668 Phase 2)', () => {
  it('renders start and end mask elements with axis and data attributes', () => {
    const view = render(<ScrollMask state={{ startMask: true, endMask: false }} axis="x" />);
    const masks = view.container.querySelectorAll('[data-slot="scroll-mask"]');
    expect(masks).toHaveLength(2);
    expect(masks[0].getAttribute('data-start')).toBe('true');
    expect(masks[0].getAttribute('data-end')).toBeNull();
    expect(masks[1].getAttribute('data-end')).toBeNull();
    expect(masks[1].getAttribute('data-start')).toBeNull();
    expect(masks[0].getAttribute('data-axis')).toBe('x');
  });

  it('end mask activates via data-end when endMask is true', () => {
    const view = render(<ScrollMask state={{ startMask: false, endMask: true }} axis="y" />);
    const masks = view.container.querySelectorAll('[data-slot="scroll-mask"]');
    expect(masks[0].getAttribute('data-start')).toBeNull();
    expect(masks[1].getAttribute('data-end')).toBe('true');
    expect(masks[1].getAttribute('data-axis')).toBe('y');
  });
});
