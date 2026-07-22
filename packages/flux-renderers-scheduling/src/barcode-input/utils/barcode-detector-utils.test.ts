import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBarcodeDetector, detectWithSkewRetry } from './barcode-detector-utils.js';

const zxingMock = vi.hoisted(() => {
  let ctorThrow = false;
  let decodeFn: ((canvas: any) => any) | null = null;
  let ctorHints: any = undefined;
  return {
    setCtorThrow(v: boolean) { ctorThrow = v; },
    setDecodeFn(fn: ((canvas: any) => any) | null) { decodeFn = fn; },
    getCtorHints() { return ctorHints; },
    BrowserMultiFormatReader: class {
      constructor(hints?: any) { ctorHints = hints; if (ctorThrow) throw new Error('WASM init failed'); }
      decodeFromCanvas(_canvas: any) { return decodeFn?.(_canvas) ?? Promise.resolve({ getText: () => 'mock', getBarcodeFormat: () => 'QR_CODE' }); }
    },
  };
});

vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: zxingMock.BrowserMultiFormatReader,
  BarcodeFormat: { QR_CODE: 'QR_CODE', CODE_128: 'CODE_128' },
  DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS' },
}));

describe('createBarcodeDetector', () => {
  beforeEach(() => {
    zxingMock.setCtorThrow(false);
    zxingMock.setDecodeFn(null);
    vi.unstubAllGlobals();
  });

  it('should return a detector object with detect function', () => {
    const detector = createBarcodeDetector();
    expect(detector).toHaveProperty('detect');
    expect(typeof detector.detect).toBe('function');
    expect(detector).toHaveProperty('supportsSkewRetry');
  });

  it('should set supportsSkewRetry to true for zxing fallback', () => {
    const detector = createBarcodeDetector(['qr_code']);
    expect(detector.supportsSkewRetry).toBe(true);
  });

  it('should accept format filters', () => {
    const detector = createBarcodeDetector(['code_128', 'ean_13']);
    expect(detector.supportsSkewRetry).toBe(true);
  });

  it('should throw unsupported browser error when no native BarcodeDetector and zxing WASM init fails', async () => {
    zxingMock.setCtorThrow(true);
    const detector = createBarcodeDetector();
    const video = document.createElement('video');
    await expect(detector.detect(video)).rejects.toThrow('does not support barcode scanning');
  });

  it('should use native BarcodeDetector when available', async () => {
    const nativeDetect = vi.fn().mockResolvedValue([
      { rawValue: '12345', format: 'qr_code' },
    ]);
    vi.stubGlobal('BarcodeDetector', function BarcodeDetectorMock() {
      return { detect: nativeDetect };
    });

    const detector = createBarcodeDetector();
    expect(detector.supportsSkewRetry).toBe(true);

    const canvas = document.createElement('canvas');
    const result = await detector.detect(canvas);
    expect(result).toEqual([{ barcode: '12345', format: 'qr_code' }]);
  });
});

describe('zxing ponyfill fallback', () => {
  beforeEach(() => {
    zxingMock.setCtorThrow(false);
    zxingMock.setDecodeFn(null);
    vi.unstubAllGlobals();
  });

  it('should use zxing fallback when native BarcodeDetector is unavailable and zxing loads successfully', async () => {
    zxingMock.setDecodeFn(() => Promise.resolve({
      getText: () => 'scan-result',
      getBarcodeFormat: () => 'QR_CODE',
    }));

    const detector = createBarcodeDetector();
    expect(detector.supportsSkewRetry).toBe(true);

    const canvas = document.createElement('canvas');
    const result = await detector.detect(canvas);
    expect(result).toEqual([{ barcode: 'scan-result', format: 'qr_code' }]);
  });

  it('should return empty array when zxing decode throws (no barcode found)', async () => {
    zxingMock.setDecodeFn(() => Promise.reject(new Error('No barcode found')));

    const detector = createBarcodeDetector();
    const canvas = document.createElement('canvas');
    const result = await detector.detect(canvas);
    expect(result).toEqual([]);
  });

  it('should throw error stub when zxing reader construction fails', async () => {
    zxingMock.setCtorThrow(true);

    const detector = createBarcodeDetector();
    const canvas = document.createElement('canvas');
    await expect(detector.detect(canvas)).rejects.toThrow('does not support barcode scanning');
  });

  it('should wire BARCODE_FORMAT_TO_ZXING format hints to zxing reader', async () => {
    zxingMock.setDecodeFn(() => Promise.resolve({
      getText: () => 'formatted',
      getBarcodeFormat: () => 'QR_CODE',
    }));

    const detector = createBarcodeDetector(['qr_code', 'code_128']);
    const canvas = document.createElement('canvas');
    await detector.detect(canvas);

    const hints = zxingMock.getCtorHints();
    expect(hints).toBeInstanceOf(Map);
    expect(hints.get('POSSIBLE_FORMATS')).toBeDefined();
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
    const result = await detectWithSkewRetry(detect, video, canvas, ctx, undefined, controller.signal);
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
    const result = await detectWithSkewRetry(detect, video, canvas, ctx, undefined, controller.signal);
    expect(result).toBeNull();
  });
});
