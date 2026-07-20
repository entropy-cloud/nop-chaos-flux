import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeCamera } from './use-barcode-camera.js';

function setupGetUserMediaMock() {
  const mockStream = {
    getTracks: () => [{
      stop: vi.fn(),
      kind: 'video',
    }],
  };

  const getUserMedia = vi.fn().mockResolvedValue(mockStream);

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });

  return { getUserMedia, mockStream };
}

describe('useBarcodeCamera', () => {
  beforeEach(() => {
    setupGetUserMediaMock();
  });

  it('should initialize with isActive false and error null', () => {
    const { result } = renderHook(() => useBarcodeCamera());
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have a videoRef', () => {
    const { result } = renderHook(() => useBarcodeCamera());
    expect(result.current.videoRef).toBeDefined();
    expect(result.current.videoRef.current).toBeNull();
  });

  it('should provide start and stop functions', () => {
    const { result } = renderHook(() => useBarcodeCamera());
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });

  it('should set isActive on start', async () => {
    const { result } = renderHook(() => useBarcodeCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBeNull();
  });

  it('should stop camera on unmount and reset state', () => {
    const { result, unmount } = renderHook(() => useBarcodeCamera());
    unmount();
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
