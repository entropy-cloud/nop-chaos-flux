import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizeProgressValue, ProgressRenderer } from './progress.js';
import { createMockRendererProps } from './test-support.js';
import type { ProgressSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="progress"]') as HTMLElement;
}

describe('normalizeProgressValue', () => {
  it('clamps value above max to full without overflowing', () => {
    expect(normalizeProgressValue(150, 100)).toEqual({ value: 100, max: 100, ratio: 1, percent: 100 });
  });

  it('falls back to max=100 when max is missing or non-positive', () => {
    expect(normalizeProgressValue(30, undefined).max).toBe(100);
    expect(normalizeProgressValue(30, 0).max).toBe(100);
    expect(normalizeProgressValue(30, -5).max).toBe(100);
  });

  it('clamps negative value to zero', () => {
    expect(normalizeProgressValue(-10, 100)).toEqual({ value: 0, max: 100, ratio: 0, percent: 0 });
  });

  it('respects a custom max when computing the ratio', () => {
    const r = normalizeProgressValue(25, 200);
    expect(r).toEqual({ value: 25, max: 200, ratio: 0.125, percent: 13 });
  });

  it('treats non-finite value as zero', () => {
    expect(normalizeProgressValue(Number.NaN, 100).value).toBe(0);
    expect(normalizeProgressValue(undefined, 100).value).toBe(0);
  });
});

describe('ProgressRenderer', () => {
  it('renders the root marker and passes clamped value/max to ui Progress', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 50, max: 100 },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    const root = rootOf(container);
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-progress');
    // base-ui Progress.Root exposes aria-valuenow / aria-valuemax
    expect(root.getAttribute('aria-valuenow')).toBe('50');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
  });

  it('normalizes a value that exceeds max so it does not overflow', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 250, max: 100 },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('aria-valuenow')).toBe('100');
  });

  it('renders the numeric value when showValue is true', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 75, max: 100, showValue: true },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="progress-value"]')?.textContent).toBe('75');
  });

  it('shows the max value when progress is complete', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 100, max: 100, showValue: true },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="progress-value"]')?.textContent).toBe('100');
  });

  it('renders a label (value-or-region)', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 10, label: 'Uploading' },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    expect(rootOf(container).querySelector('[data-slot="progress-label"]')?.textContent).toBe(
      'Uploading',
    );
  });

  it('emits data-variant for theming', () => {
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 90, variant: 'danger' },
    });
    const { container } = render(<ProgressRenderer {...props} />);
    expect(rootOf(container).getAttribute('data-variant')).toBe('danger');
  });
});
