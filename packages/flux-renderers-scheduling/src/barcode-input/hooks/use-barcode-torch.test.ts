import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeTorch } from './use-barcode-torch.js';

describe('useBarcodeTorch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with isAvailable false and isOn false', () => {
    const { result } = renderHook(() => useBarcodeTorch());
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isOn).toBe(false);
    expect(typeof result.current.toggle).toBe('function');
  });

  it('should detect torch capability when available', async () => {
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

  it('should turn torch on via applyConstraints', async () => {
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };
    const mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const getStream = () => mockStream;
    const { result } = renderHook(() => useBarcodeTorch({ getStream }));

    await act(async () => { await result.current.toggle(); });
    expect(mockTrack.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    expect(result.current.isOn).toBe(true);
  });

  it('should turn torch off via onRestartStream', async () => {
    const onRestartStream = vi.fn().mockResolvedValue(undefined);
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };
    const mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const getStream = () => mockStream;
    const { result } = renderHook(() => useBarcodeTorch({ getStream, onRestartStream }));

    // First turn on
    await act(async () => { await result.current.toggle(); });
    expect(result.current.isOn).toBe(true);

    // Then turn off — should call onRestartStream instead of applyConstraints
    mockTrack.applyConstraints.mockClear();
    await act(async () => { await result.current.toggle(); });
    expect(onRestartStream).toHaveBeenCalled();
    expect(mockTrack.applyConstraints).not.toHaveBeenCalledWith({ advanced: [{ torch: false }] });
    expect(result.current.isOn).toBe(false);
  });

  it('detects torch capability after the stream arrives asynchronously (1-6)', () => {
    vi.useFakeTimers();
    let stream: MediaStream | null = null;
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };

    const { result } = renderHook(() => useBarcodeTorch({ getStream: () => stream }));

    // 挂载瞬间无流：不得立即检查（假绿禁止）——isAvailable 保持 false
    expect(result.current.isAvailable).toBe(false);

    // 流异步就绪后，检查必须执行并置位
    stream = {
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isOn).toBe(false);
  });
});
