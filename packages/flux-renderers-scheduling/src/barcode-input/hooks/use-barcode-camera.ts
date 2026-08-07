import { useRef, useState, useEffect, useCallback } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { checkCameraAvailability } from '../utils/camera-utils.js';

interface BarcodeCameraState {
  isActive: boolean;
  error: string | null;
}

interface UseBarcodeCameraOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  videoConstraints?: MediaTrackConstraints;
}

interface UseBarcodeCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useBarcodeCamera(options?: UseBarcodeCameraOptions): UseBarcodeCameraReturn {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = options?.videoRef ?? internalRef;
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  const [state, setState] = useState<BarcodeCameraState>({ isActive: false, error: null });

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- videoRef is a stable ref object; ref.current is null initially
  const stop = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      // eslint-disable-next-line react-compiler/react-compiler -- ref mutation is intentional
      videoRef.current.srcObject = null;
    }
    setState({ isActive: false, error: null });
  }, [videoRef]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- videoRef is a stable ref object; stop is stable
  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const session = sessionRef.current + 1;
    sessionRef.current = session;

    setState({ isActive: false, error: null });

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (signal.aborted) return;

      const currentOptions = optionsRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: currentOptions?.videoConstraints ?? {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (signal.aborted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (signal.aborted) {
        stop();
        return;
      }

      setState({ isActive: true, error: null });
    } catch (err: any) {
      if (signal.aborted) return;
      console.warn('[useBarcodeCamera] getUserMedia failed:', err.name, err.message);
      const message = err.name === 'NotAllowedError'
        ? t('flux.barcode.cameraPermissionDenied')
        : err.name === 'NotFoundError'
          ? t('flux.barcode.cameraNotFound')
          : t('flux.barcode.cameraError', { message: err.message });
      setState({ isActive: false, error: message });
    }
  }, [stop, videoRef]);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    checkCameraAvailability();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    return () => {
      sessionRef.current += 1;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (el) {
        el.srcObject = null;
      }
    };
  }, [videoRef]);

  return {
    videoRef,
    isActive: state.isActive,
    error: state.error,
    start,
    stop,
  };
}
