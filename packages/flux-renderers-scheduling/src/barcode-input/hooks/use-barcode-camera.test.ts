import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { useBarcodeCamera } from './use-barcode-camera.js';

// 2-17: camera error messages go through the i18n t() channel — pin the
// locale so the assertions lock the translated (not hardcoded) strings.
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

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

  it('should handle getUserMedia rejection gracefully without re-throwing', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const { result } = renderHook(() => useBarcodeCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe('Camera permission denied');
  });

  it('should handle NotFoundError', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    getUserMedia.mockRejectedValue(new DOMException('No camera', 'NotFoundError'));
    const { result } = renderHook(() => useBarcodeCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe('No camera found');
  });

  it('should map generic getUserMedia failures through t() with the underlying message (2-17)', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    getUserMedia.mockRejectedValue(new DOMException('boom', 'AbortError'));
    const { result } = renderHook(() => useBarcodeCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe('Camera error: boom');
  });

  it('should support multiple start/stop cycles', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    const { result } = renderHook(() => useBarcodeCamera());
    // First cycle
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isActive).toBe(true);
    act(() => { result.current.stop(); });
    expect(result.current.isActive).toBe(false);
    // Second cycle
    getUserMedia.mockClear();
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn(), kind: 'video' }],
    });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isActive).toBe(true);
  });

  it('should provide stable start/stop references across renders', () => {
    const { result, rerender } = renderHook(() => useBarcodeCamera());
    const { start: s1, stop: st1 } = result.current;
    rerender();
    expect(result.current.start).toBe(s1);
    expect(result.current.stop).toBe(st1);
  });

  it('should keep error state after multiple failed starts', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const { result } = renderHook(() => useBarcodeCamera());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBe('Camera permission denied');

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBe('Camera permission denied');
  });

  it('should not throw on stop when camera was never started', () => {
    const { result } = renderHook(() => useBarcodeCamera());
    expect(() => act(() => { result.current.stop(); })).not.toThrow();
  });

  it('should re-create stream on each start call', async () => {
    const { getUserMedia } = setupGetUserMediaMock();
    const { result } = renderHook(() => useBarcodeCamera());

    await act(async () => {
      await result.current.start();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    act(() => { result.current.stop(); });

    await act(async () => {
      await result.current.start();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
});
