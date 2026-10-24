// INV-1 in-case governance point (R1.4 / plan 722 segment 1): all four
// browser media channels used by barcode-input converge here. The
// `env.mediaDevices?` RendererEnv channel is PENDING HUMAN ADJUDICATION
// (INV-2 proposal: docs/discussions/2026-10-24-env-camera-channel-inv2-proposal.md,
// Cross-Cutting 8 gate). Until that channel is adjudicated, this module is
// the single governance point — outside this file's defaultBarcodeMediaIO,
// barcode-input must not touch navigator.mediaDevices / window.BarcodeDetector /
// navigator.onLine / window.isSecureContext directly. Once the env channel
// lands, consumers migrate to env.* and this default implementation retires.
// The ZXing ponyfill fallback keeps sourcing its wasmFetcher from env.fetcher
// (already compliant) — that flow does not move into this module.

export type NativeBarcodeDetectorCtor = new (options?: { formats?: string[] }) => unknown;

export interface BarcodeMediaIO {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  /** Feature detection only — the BarcodeDetector constructor or undefined. Factory/enum-mapping/ponyfill logic stays in barcode-detector-utils. */
  getNativeBarcodeDetectorCtor(): NativeBarcodeDetectorCtor | undefined;
  isOnline(): boolean;
  isSecureContext(): boolean;
  supportsEnumerateDevices(): boolean;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
}

const defaultBarcodeMediaIO: BarcodeMediaIO = {
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  getNativeBarcodeDetectorCtor: () =>
    typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined,
  isOnline: () => navigator.onLine,
  isSecureContext: () => typeof window !== 'undefined' && window.isSecureContext,
  supportsEnumerateDevices: () =>
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.enumerateDevices,
  enumerateDevices: () => navigator.mediaDevices.enumerateDevices(),
};

let current: BarcodeMediaIO = defaultBarcodeMediaIO;

/** Live IO accessor — consumers call this, never the globals directly. */
export function barcodeMediaIO(): BarcodeMediaIO {
  return current;
}

/** Test seam: inject a spy/controllable IO. Always pair with resetBarcodeMediaIO in afterEach. */
export function setBarcodeMediaIO(io: BarcodeMediaIO): void {
  current = io;
}

export function resetBarcodeMediaIO(): void {
  current = defaultBarcodeMediaIO;
}
