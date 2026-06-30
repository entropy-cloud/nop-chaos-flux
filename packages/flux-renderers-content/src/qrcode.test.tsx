import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QrCodeRenderer } from './qrcode.js';
import { createMockRendererProps } from './test-support.js';
import type { QrCodeSchema } from './schemas.js';

// Controllable qrcode module mock: by default delegates to the real implementation
// (so existing canvas-rendering tests stay green); flipping `failGeneration` makes
// `toCanvas` reject so the onLoadError path can be exercised deterministically.
const qrMock = vi.hoisted(() => ({ failGeneration: false }));

vi.mock('qrcode', async (importOriginal) => {
  const actual = (await importOriginal()) as {
    default: { toCanvas: (...args: never[]) => Promise<unknown> };
  };
  return {
    default: {
      ...actual.default,
      toCanvas: vi.fn((...args: never[]) => {
        if (qrMock.failGeneration) {
          return Promise.reject(new Error('encode failed'));
        }
        return actual.default.toCanvas(...args);
      }),
    },
  };
});

afterEach(() => {
  cleanup();
  qrMock.failGeneration = false;
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

  it('fires onLoadError once and shows the error fallback when QR generation fails', async () => {
    qrMock.failGeneration = true;
    const onLoadError = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'fail-me' },
      events: { onLoadError: onLoadError as never },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalledTimes(1);
    });
    const fallback = container.querySelector('[data-slot="qrcode"][data-state="error"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.querySelector('[data-slot="qrcode-fallback"]')?.textContent).toBe(
      'QR code failed',
    );
  });
});
