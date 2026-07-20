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
});
