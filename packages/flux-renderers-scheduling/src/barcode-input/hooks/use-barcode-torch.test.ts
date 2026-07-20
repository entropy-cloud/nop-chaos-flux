import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBarcodeTorch } from './use-barcode-torch.js';

describe('useBarcodeTorch', () => {
  it('should initialize with isAvailable false and isOn false', () => {
    const { result } = renderHook(() => useBarcodeTorch());
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isOn).toBe(false);
    expect(typeof result.current.toggle).toBe('function');
  });

  it('should provide toggle function', () => {
    const { result } = renderHook(() => useBarcodeTorch());
    expect(typeof result.current.toggle).toBe('function');
  });

  it('should handle stream with torch capability', async () => {
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };
    const mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const getStream = () => mockStream;
    const { result } = renderHook(() => useBarcodeTorch({ getStream }));

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isOn).toBe(false);
  });

  it('should handle stream without torch capability', () => {
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({}),
      applyConstraints: vi.fn(),
    };
    const mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const getStream = () => mockStream;
    const { result } = renderHook(() => useBarcodeTorch({ getStream }));

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isOn).toBe(false);
  });
});
