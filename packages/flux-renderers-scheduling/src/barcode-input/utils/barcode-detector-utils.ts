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

export const BARCODE_FORMAT_TO_ZXING: Record<string, string> = {
  aztec: 'AZTEC',
  code_39: 'CODE_39',
  code_93: 'CODE_93',
  code_128: 'CODE_128',
  data_matrix: 'DATA_MATRIX',
  ean_8: 'EAN_8',
  ean_13: 'EAN_13',
  itf: 'ITF',
  pdf_417: 'PDF_417',
  qr_code: 'QR_CODE',
  upc_a: 'UPC_A',
  upc_e: 'UPC_E',
};

export async function detectWithSkewRetry(
  detect: (source: HTMLCanvasElement) => Promise<BarcodeDetectResult[]>,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  skewAngle?: number,
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

  if (skewAngle != null && skewAngle !== 0) {
    if (signal?.aborted) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((skewAngle * Math.PI) / 180);
    ctx.drawImage(video, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();

    const skewedResults = await detect(canvas);
    if (skewedResults.length > 0) {
      return skewedResults[0];
    }
  }

  return null;
}
