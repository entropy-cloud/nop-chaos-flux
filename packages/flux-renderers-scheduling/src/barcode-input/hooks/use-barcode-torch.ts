import { useRef, useState, useEffect } from 'react';

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
  const getStream = options?.getStream;
  const onRestartStream = options?.onRestartStream;

  useEffect(() => {
    if (checkedRef.current) return;
    const stream = getStream?.() ?? null;
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
  }, [getStream]);

  const toggle = async () => {
    const stream = getStream?.() ?? null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const newState = !isOn;
    if (newState) {
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
      if (onRestartStream) {
        await onRestartStream();
        setIsOn(false);
      }
    }
  };

  return { isAvailable, isOn, toggle };
}
