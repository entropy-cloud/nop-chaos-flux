import { describe, it, expect, vi } from 'vitest';
import { createBarcodeDetector, detectWithSkewRetry } from './barcode-detector-utils.js';

describe('createBarcodeDetector', () => {
  it('should return a detector object with detect function', () => {
    const detector = createBarcodeDetector();
    expect(detector).toHaveProperty('detect');
    expect(typeof detector.detect).toBe('function');
    expect(detector).toHaveProperty('supportsSkewRetry');
  });

  it('should return supportsSkewRetry as true', () => {
    const detector = createBarcodeDetector(['qr_code']);
    expect(detector.supportsSkewRetry).toBe(true);
  });

  it('should accept format filters', () => {
    const detector = createBarcodeDetector(['code_128', 'ean_13']);
    expect(detector.supportsSkewRetry).toBe(true);
  });

  it('should return empty array for invalid video element', async () => {
    const detector = createBarcodeDetector();
    const video = document.createElement('video');
    const results = await detector.detect(video);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('detectWithSkewRetry', () => {
  function createMockContext(): CanvasRenderingContext2D {
    return {
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }

  it('should return null when signal is aborted at entry', async () => {
    const controller = new AbortController();
    controller.abort();
    const canvas = document.createElement('canvas');
    const ctx = createMockContext();
    const video = document.createElement('video');
    const detect = vi.fn().mockResolvedValue([]);
    const result = await detectWithSkewRetry(detect, video, canvas, ctx, controller.signal);
    expect(result).toBeNull();
    expect(detect).not.toHaveBeenCalled();
  });

  it('should return null when signal is aborted during skew retry', async () => {
    const controller = new AbortController();
    const canvas = document.createElement('canvas');
    const ctx = createMockContext();
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 100 });
    Object.defineProperty(video, 'videoHeight', { value: 100 });
    const detect = vi.fn().mockResolvedValue([]);
    setTimeout(() => controller.abort(), 0);
    const result = await detectWithSkewRetry(detect, video, canvas, ctx, controller.signal);
    expect(result).toBeNull();
  });
});
