import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeDetect } from './use-barcode-detect.js';

const mockDecode = vi.hoisted(() => ({
  result: null as { barcode: string; format: string } | null,
}));

vi.mock('../utils/barcode-detector-utils.js', () => ({
  SKEW_ANGLES: [0],
  createBarcodeDetector: vi.fn(() => ({ detect: vi.fn(), supportsSkewRetry: true })),
  // Each detection returns a FRESH result object (a real decode produces a
  // new object per poll) — identity is what the hook's dedupe gate + the
  // overlay consume-once guard key on.
  detectWithSkewRetry: vi.fn(async () => (mockDecode.result ? { ...mockDecode.result } : null)),
}));

describe('useBarcodeDetect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDecode.result = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with result null, isScanning false, error null', () => {
    const getVideoElement = () => document.createElement('video');
    const { result } = renderHook(() => useBarcodeDetect(getVideoElement, { enabled: false }));
    expect(result.current.result).toBeNull();
    expect(result.current.isScanning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not scan when enabled is false', () => {
    const getVideoElement = () => document.createElement('video');
    const { result } = renderHook(() => useBarcodeDetect(getVideoElement, { enabled: false }));
    expect(result.current.isScanning).toBe(false);
  });

  it('should not scan when getVideoElement returns null', () => {
    const getVideoElement = () => null;
    const { result } = renderHook(() => useBarcodeDetect(getVideoElement, { enabled: true }));
    expect(result.current.isScanning).toBe(false);
  });

  it('should accept custom interval option', () => {
    const getVideoElement = () => document.createElement('video');
    const { result } = renderHook(() => useBarcodeDetect(getVideoElement, { interval: 500, enabled: false }));
    expect(result.current.result).toBeNull();
  });

  it('should accept formats option', () => {
    const getVideoElement = () => document.createElement('video');
    const { result } = renderHook(() => useBarcodeDetect(getVideoElement, {
      formats: ['code_128', 'ean_13'],
      enabled: false,
    }));
    expect(result.current.result).toBeNull();
  });

  it('should not scan when enabled transitions to false', () => {
    const getVideoElement = () => document.createElement('video');
    const { result, rerender } = renderHook(
      (opts) => useBarcodeDetect(getVideoElement, opts),
      { initialProps: { enabled: true, interval: 300 } },
    );
    expect(result.current.isScanning).toBe(false);

    rerender({ enabled: false, interval: 300 });
    expect(result.current.isScanning).toBe(false);
  });

  it('should accept different interval values', () => {
    const getVideoElement = () => document.createElement('video');
    const { result, rerender } = renderHook(
      (opts) => useBarcodeDetect(getVideoElement, opts),
      { initialProps: { enabled: false, interval: 300 } },
    );
    expect(result.current.result).toBeNull();

    rerender({ enabled: false, interval: 500 });
    expect(result.current.result).toBeNull();
  });

  it('should reset result when options change', () => {
    const getVideoElement = () => document.createElement('video');
    const { result, rerender } = renderHook(
      (opts) => useBarcodeDetect(getVideoElement, opts),
      { initialProps: { enabled: false, interval: 300 } },
    );
    rerender({ enabled: false, interval: 300 });
    expect(result.current.result).toBeNull();
  });

  it('should handle disabled state then enabled state changes gracefully', () => {
    const getVideoElement = () => document.createElement('video');
    const { result, rerender } = renderHook(
      (opts) => useBarcodeDetect(getVideoElement, opts),
      { initialProps: { enabled: false, interval: 300 } },
    );
    expect(result.current.isScanning).toBe(false);

    rerender({ enabled: true, interval: 300 });
    expect(result.current.isScanning).toBe(false);
  });

  describe('2-13 dedupe adjudication', () => {
    function makeReadyVideo(): HTMLVideoElement {
      const video = document.createElement('video');
      Object.defineProperty(video, 'readyState', { value: 2, configurable: true });
      Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
      return video;
    }

    beforeEach(() => {
      // happy-dom canvas has no 2d context — the hook treats a missing ctx as
      // "not ready" and would skip polling entirely.
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('non-batch mode (dedupe default) suppresses consecutive same-value detections (2-13)', async () => {
      mockDecode.result = { barcode: 'SAME', format: 'ean_13' };
      const { result } = renderHook(
        () => useBarcodeDetect(() => makeReadyVideo(), { enabled: true, interval: 300 }),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const first = result.current.result;
      expect(first?.barcode).toBe('SAME');

      // Second consecutive detection of the same value must be suppressed —
      // result stays the SAME object (no re-setResult → no double dispatch).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(result.current.result).toBe(first);
    });

    it('batch mode (dedupe:false) passes consecutive same-value detections through (2-13)', async () => {
      mockDecode.result = { barcode: 'SAME', format: 'ean_13' };
      const { result } = renderHook(
        () => useBarcodeDetect(() => makeReadyVideo(), { enabled: true, interval: 300, dedupe: false }),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const first = result.current.result;
      expect(first?.barcode).toBe('SAME');

      // Batch mode: each detection is a fresh result object so the overlay
      // consume-once guard can enqueue both scans as separate items.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(result.current.result).not.toBe(first);
      expect(result.current.result?.barcode).toBe('SAME');
    });
  });
});
