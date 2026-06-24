// @vitest-environment happy-dom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QrCodeRenderer } from './qrcode.js';
import { createMockRendererProps } from './test-support.js';
import type { QrCodeSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function canvasOf(container: HTMLElement) {
  return container.querySelector('[data-slot="qrcode-canvas"]') as HTMLCanvasElement | null;
}

describe('QrCodeRenderer', () => {
  it('renders a canvas element for a string value', async () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'https://example.com' },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
    expect(container.querySelector('.nop-qrcode')).toBeTruthy();
  });

  it('coerces a numeric value to a string and renders the canvas', async () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 12345 },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
  });

  it('renders the empty state when value is empty', () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: {},
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    expect(container.querySelector('[data-slot="qrcode"][data-state="empty"]')).toBeTruthy();
    expect(canvasOf(container)).toBeNull();
  });

  it('renders the empty state for an empty string value', () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: '' },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    expect(container.querySelector('[data-slot="qrcode"][data-state="empty"]')).toBeTruthy();
  });

  it('still renders when the level is invalid (falls back to default)', async () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'hello', level: 'Z' as unknown as never },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
  });

  it('renders with valid levels L, M, Q, H', async () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      const props = createMockRendererProps<QrCodeSchema>({
        schema: { type: 'qrcode' },
        props: { value: 'level-test', level },
      });
      const { container } = render(<QrCodeRenderer {...props} />);
      await waitFor(() => {
        expect(canvasOf(container)).not.toBeNull();
      });
      cleanup();
    }
  });

  it('renders the label region when provided', async () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'label-test' },
      regions: { label: <span>Scan me</span> },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
    const label = container.querySelector('[data-slot="qrcode-label"]');
    expect(label?.textContent).toBe('Scan me');
  });

  it('uses the fallback size when size is invalid', () => {
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: {},
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    const fallback = container.querySelector('[data-slot="qrcode-fallback"]') as HTMLElement;
    expect(fallback).toBeTruthy();
    expect((fallback.style.width as unknown as string)).toBe('128px');
  });
});
