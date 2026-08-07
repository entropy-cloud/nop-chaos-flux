import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QrCodeRenderer } from './qrcode.js';
import { t } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from './test-support.js';
import type { QrCodeSchema } from './schemas.js';

// Controllable qrcode module mock: by default delegates to the real implementation
// (so existing canvas-rendering tests stay green); flipping `failGeneration` makes
// `toCanvas` reject so the onLoadError path can be exercised deterministically.
// `renderedValues` records every value passed to toCanvas so value-change redraw
// echoes can be asserted behaviorally. `resolveSilently` bypasses the real draw
// (happy-dom's canvas getContext('2d') is null, so the real lib rejects) for the
// redraw tests, which assert the CALL sequence rather than the drawn pixels.
const qrMock = vi.hoisted(() => ({
  failGeneration: false,
  resolveSilently: false,
  renderedValues: [] as string[],
}));

vi.mock('qrcode', async (importOriginal) => {
  const actual = (await importOriginal()) as {
    default: { toCanvas: (...args: never[]) => Promise<unknown> };
  };
  return {
    default: {
      ...actual.default,
      toCanvas: vi.fn((...args: never[]) => {
        qrMock.renderedValues.push(String(args[1]));
        if (qrMock.failGeneration) {
          return Promise.reject(new Error('encode failed'));
        }
        if (qrMock.resolveSilently) {
          return Promise.resolve();
        }
        return actual.default.toCanvas(...args);
      }),
    },
  };
});

afterEach(() => {
  cleanup();
  qrMock.failGeneration = false;
  qrMock.resolveSilently = false;
  qrMock.renderedValues = [];
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

  it('falls back to the flux.qrcode.ariaLabel translated label when no label content is set (2-18)', async () => {
    qrMock.resolveSilently = true;
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'QR-2-18' },
    });
    const { container } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
    expect(canvasOf(container)?.getAttribute('aria-label')).toBe(
      t('flux.qrcode.ariaLabel', { value: 'QR-2-18' }),
    );
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
      t('flux.common.loadFailed'),
    );
  });

  it('re-renders the canvas when the value changes (value echo redraw)', async () => {
    // C6.4 P2-3: the canvas draw effect depends on valueStr, so a scope-driven
    // value update must re-render the QR matrix with the new payload. The draw
    // is bypassed (resolveSilently) because happy-dom's canvas 2d context is
    // null — this test asserts the toCanvas CALL sequence, not the pixels.
    qrMock.resolveSilently = true;
    const props = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'first-value' },
    });
    const { container, rerender } = render(<QrCodeRenderer {...props} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
    expect(qrMock.renderedValues).toEqual(['first-value']);

    const next = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'second-value' },
    });
    rerender(<QrCodeRenderer {...next} />);
    await waitFor(() => {
      expect(qrMock.renderedValues).toEqual(['first-value', 'second-value']);
    });
  });

  it('recovers from a failed render when the value changes', async () => {
    qrMock.failGeneration = true;
    qrMock.resolveSilently = true;
    const onLoadError = vi.fn(async () => ({ ok: true }));
    const first = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'fail-me' },
      events: { onLoadError: onLoadError as never },
    });
    const { container, rerender } = render(<QrCodeRenderer {...first} />);
    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalledTimes(1);
    });
    expect(container.querySelector('[data-slot="qrcode"][data-state="error"]')).toBeTruthy();

    qrMock.failGeneration = false;
    const second = createMockRendererProps<QrCodeSchema>({
      schema: { type: 'qrcode' },
      props: { value: 'fixed-value' },
      events: { onLoadError: onLoadError as never },
    });
    rerender(<QrCodeRenderer {...second} />);
    await waitFor(() => {
      expect(canvasOf(container)).not.toBeNull();
    });
    expect(container.querySelector('[data-slot="qrcode"][data-state="error"]')).toBeNull();
    expect(onLoadError).toHaveBeenCalledTimes(1);
  });
});
