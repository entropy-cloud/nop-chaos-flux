import { describe, it, expect, vi, afterEach } from 'vitest';
import { barcodeMediaIO, setBarcodeMediaIO, resetBarcodeMediaIO } from './barcode-media-io.js';
import { checkCameraAvailability } from './camera-utils.js';

// R1.4 / plan 722 discriminator: after the boundary migration, barcode-input
// consumers reach browser media APIs only through the injected BarcodeMediaIO —
// a counting probe on the globals must observe ZERO access while the spy sees
// the calls. On the pre-migration implementation the globals were touched
// directly, so the probe counter incremented and this spec went red.
describe('barcode-media-io boundary (R1.4 plan 722)', () => {
  afterEach(() => {
    resetBarcodeMediaIO();
    vi.restoreAllMocks();
  });

  it('routes camera availability probing through the injected IO with zero global access', async () => {
    let globalAccesses = 0;
    const probe = (target: object, key: string) => {
      Object.defineProperty(target, key, {
        configurable: true,
        get() {
          globalAccesses += 1;
          return undefined;
        },
      });
    };
    probe(window, 'isSecureContext');
    probe(navigator, 'mediaDevices');

    const enumerateDevices = vi.fn().mockResolvedValue([{ kind: 'videoinput' }]);
    setBarcodeMediaIO({
      ...barcodeMediaIO(),
      isSecureContext: () => true,
      supportsEnumerateDevices: () => true,
      enumerateDevices,
    });

    const result = await checkCameraAvailability();

    expect(result.isAvailable).toBe(true);
    expect(enumerateDevices).toHaveBeenCalledTimes(1);
    expect(globalAccesses).toBe(0);
  });
});
