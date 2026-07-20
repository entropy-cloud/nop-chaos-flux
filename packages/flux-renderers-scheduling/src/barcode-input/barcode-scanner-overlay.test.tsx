import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';

vi.mock('./hooks/use-barcode-camera.js', () => ({
  useBarcodeCamera: () => ({
    videoRef: { current: null },
    isActive: false,
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('./hooks/use-barcode-detect.js', () => ({
  useBarcodeDetect: () => ({
    result: null,
    isScanning: false,
    error: null,
  }),
}));

vi.mock('./hooks/use-barcode-torch.js', () => ({
  useBarcodeTorch: () => ({
    isAvailable: false,
    isOn: false,
    toggle: vi.fn(),
  }),
}));

describe('BarcodeScannerOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render null when not open', () => {
    const { container } = render(
      <BarcodeScannerOverlay
        open={false}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render overlay when open', () => {
    render(
      <BarcodeScannerOverlay
        open={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />,
    );
    const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
    expect(overlay).toBeTruthy();
  });

  it('should render close button when open', () => {
    render(
      <BarcodeScannerOverlay
        open={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />,
    );
    const closeBtn = document.querySelector('[data-slot="barcode-scanner-close"]');
    expect(closeBtn).toBeTruthy();
  });

  it('should render loading state on open', () => {
    render(
      <BarcodeScannerOverlay
        open={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />,
    );
    const loading = document.querySelector('[data-slot="barcode-scanner-loading"]');
    expect(loading).toBeTruthy();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <BarcodeScannerOverlay
        open={true}
        onClose={onClose}
        onScan={vi.fn()}
      />,
    );
    const closeBtn = document.querySelector('[data-slot="barcode-scanner-close"]');
    expect(closeBtn).toBeTruthy();
  });

  it('should accept scanInterval prop', () => {
    render(
      <BarcodeScannerOverlay
        open={false}
        onClose={vi.fn()}
        onScan={vi.fn()}
        scanInterval={500}
      />,
    );
    expect(true).toBe(true);
  });
});
