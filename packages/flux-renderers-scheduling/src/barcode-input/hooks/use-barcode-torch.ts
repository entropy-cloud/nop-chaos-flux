import { useRef, useState, useEffect, useCallback } from 'react';

interface UseBarcodeTorchOptions {
  getStream?: () => MediaStream | null;
  onRestartStream?: () => Promise<void>;
}

interface UseBarcodeTorchReturn {
  isAvailable: boolean;
  isOn: boolean;
  toggle: () => Promise<void>;
}

export function useBarcodeTorch(options?: UseBarcodeTorchOptions): UseBarcodeTorchReturn {
  const [isOn, setIsOn] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const checkedRef = useRef(false);
  const isOnRef = useRef(isOn);
  const getStreamRef = useRef(options?.getStream);
  const onRestartStreamRef = useRef(options?.onRestartStream);

  useEffect(() => { isOnRef.current = isOn; });
  useEffect(() => { getStreamRef.current = options?.getStream; }, [options?.getStream]);
  useEffect(() => { onRestartStreamRef.current = options?.onRestartStream; }, [options?.onRestartStream]);

  useEffect(() => {
    if (checkedRef.current) return;
    const stream = getStreamRef.current?.() ?? null;
    if (!stream) return;
    checkedRef.current = true;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    let available = false;
    try {
      const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
      if (capabilities?.torch) {
        available = true;
      }
    } catch {
      /* torch not supported */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: one-time torch capability check, no cascading risk
    setIsAvailable(available);
  }, [getStreamRef]);

  const toggle = useCallback(async () => {
    const stream = getStreamRef.current?.() ?? null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    if (!isOnRef.current) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: true }] as any,
        });
        setIsOn(true);
      } catch (err) {
        console.error('[useBarcodeTorch] Torch toggle failed:', err);
        setIsOn(false);
      }
    } else {
      if (onRestartStreamRef.current) {
        try {
          await onRestartStreamRef.current();
        } catch {
          /* stream restart failed — torch is already transitioning off */
        }
        setIsOn(false);
      }
    }
  }, []);

  return { isAvailable, isOn, toggle };
}
