export type BarcodeFormat =
  | 'aztec' | 'code_39' | 'code_93' | 'code_128'
  | 'data_matrix' | 'ean_8' | 'ean_13' | 'itf'
  | 'pdf_417' | 'qr_code' | 'upc_a' | 'upc_e';

export interface BarcodeDetectResult {
  barcode: string;
  format: string;
}

export function createBarcodeDetector(formats?: BarcodeFormat[]): {
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<BarcodeDetectResult[]>;
  supportsSkewRetry: boolean;
} {
  const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  if (hasNativeDetector) {
    const detector = new (window as any).BarcodeDetector({
      formats: formats ?? [
        'qr_code', 'code_128', 'code_39', 'code_93',
        'ean_8', 'ean_13', 'upc_a', 'upc_e',
        'data_matrix', 'aztec', 'itf', 'pdf_417',
      ],
    });

    return {
      detect: async (source) => {
        const results = await detector.detect(source);
        return results.map((r: any) => ({
          barcode: r.rawValue,
          format: r.format,
        }));
      },
      supportsSkewRetry: true,
    };
  }

  return {
    detect: async () => {
      throw new Error('This browser does not support barcode scanning. Please use Chrome, Edge, or a Chromium-based browser.');
    },
    supportsSkewRetry: false,
  };
}

export const SKEW_ANGLES = [-20, -15, -10, -5, 5, 10, 15, 20];

export async function detectWithSkewRetry(
  detect: (source: HTMLCanvasElement) => Promise<BarcodeDetectResult[]>,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  signal?: AbortSignal,
): Promise<BarcodeDetectResult | null> {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);
  if (signal?.aborted) return null;

  const results = await detect(canvas);
  if (results.length > 0) {
    return results[0];
  }

  for (const angle of SKEW_ANGLES) {
    if (signal?.aborted) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(video, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();

    const skewedResults = await detect(canvas);
    if (skewedResults.length > 0) {
      return skewedResults[0];
    }
  }

  return null;
}
