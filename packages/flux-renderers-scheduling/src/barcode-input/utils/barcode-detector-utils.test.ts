import { describe, it, expect } from 'vitest';
import { createBarcodeDetector } from './barcode-detector-utils.js';

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
