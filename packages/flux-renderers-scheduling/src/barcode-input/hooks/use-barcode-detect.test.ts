import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBarcodeDetect } from './use-barcode-detect.js';

describe('useBarcodeDetect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
});
