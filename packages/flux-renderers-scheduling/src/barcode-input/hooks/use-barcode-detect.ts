import { useRef, useEffect, useState } from 'react';
import { createBarcodeDetector, detectWithSkewRetry, SKEW_ANGLES, type BarcodeDetectResult, type BarcodeFormat } from '../utils/barcode-detector-utils.js';

interface UseBarcodeDetectOptions {
  interval?: number;
  formats?: BarcodeFormat[];
  enabled?: boolean;
}

interface UseBarcodeDetectReturn {
  result: BarcodeDetectResult | null;
  isScanning: boolean;
  error: string | null;
}

export function useBarcodeDetect(
  getVideoElement: () => HTMLVideoElement | null,
  options?: UseBarcodeDetectOptions,
): UseBarcodeDetectReturn {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);
  const getVideoRef = useRef(getVideoElement);
  useEffect(() => { getVideoRef.current = getVideoElement; }, [getVideoElement]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const detectorRef = useRef<ReturnType<typeof createBarcodeDetector> | null>(null);
  const skewIndexRef = useRef(0);
  const lastResultRef = useRef<string | null>(null);
  const [result, setResult] = useState<BarcodeDetectResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentOptions = optionsRef.current;
    const enabled = currentOptions?.enabled ?? true;
    const interval = currentOptions?.interval ?? 300;

    if (!enabled) {
      lastResultRef.current = null;
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const video = getVideoRef.current();
    if (!video) return;

    if (!detectorRef.current) {
      detectorRef.current = createBarcodeDetector(currentOptions?.formats);
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      ctxRef.current = canvasRef.current.getContext('2d');
    }

    const detector = detectorRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    lastResultRef.current = null;
    skewIndexRef.current = 0;

    async function poll() {
      if (signal.aborted) return;

      const currentVideo = getVideoRef.current();
      if (!currentVideo || !ctx) return;

      if (currentVideo.readyState < 2 || currentVideo.videoWidth === 0) {
        timerRef.current = setTimeout(poll, interval);
        return;
      }

      try {
        const detectFn = async (source: HTMLCanvasElement) => {
          const rawResults = await detector.detect(source);
          return rawResults;
        };

        const currentAngle = SKEW_ANGLES[skewIndexRef.current % SKEW_ANGLES.length];
        skewIndexRef.current += 1;

        const decoded = await detectWithSkewRetry(detectFn, currentVideo, canvas, ctx, currentAngle, signal);

        if (signal.aborted) return;

        if (decoded) {
          if (decoded.barcode !== lastResultRef.current) {
            lastResultRef.current = decoded.barcode;
            setResult(decoded);
          }
        }
      } catch (err: any) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : `Decode error: ${String(err)}`);
      }

      if (!signal.aborted) {
        timerRef.current = setTimeout(poll, interval);
      }
    }

    timerRef.current = setTimeout(() => {
      setIsScanning(true);
      setError(null);
      poll();
    }, interval);

    return () => {
      controller.abort();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsScanning(false);
      setResult(null);
      lastResultRef.current = null;
    };
  }, []);

  return { result, isScanning, error };
}
