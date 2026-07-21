import { useRef, useEffect, useState } from 'react';
import { createBarcodeDetector, detectWithSkewRetry, type BarcodeDetectResult, type BarcodeFormat } from '../utils/barcode-detector-utils.js';

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
  const interval = options?.interval ?? 300;
  const enabled = options?.enabled ?? true;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const detectorRef = useRef<ReturnType<typeof createBarcodeDetector> | null>(null);
  const [result, setResult] = useState<BarcodeDetectResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const video = getVideoElement();
    if (!video) return;

    if (!detectorRef.current) {
      detectorRef.current = createBarcodeDetector(options?.formats);
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      ctxRef.current = canvasRef.current.getContext('2d');
    }

    const detector = detectorRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    async function poll() {
      if (signal.aborted) return;

      const currentVideo = getVideoElement();
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

        const decoded = await detectWithSkewRetry(detectFn, currentVideo, canvas, ctx, signal);

        if (signal.aborted) return;

        if (decoded) {
          setResult(decoded);
        }
      } catch (err: any) {
        if (signal.aborted) return;
        setError(err.message ?? 'Decode error');
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
    };
  }, [enabled, interval, getVideoElement, options?.formats]);

  return { result, isScanning, error };
}
