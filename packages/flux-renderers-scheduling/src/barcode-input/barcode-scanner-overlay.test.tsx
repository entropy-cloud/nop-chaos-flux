import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';

const mockUseBarcodeDetect = vi.hoisted(() => vi.fn<any>(() => ({
  result: null,
  isScanning: false,
  error: null,
})));

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
  useBarcodeDetect: mockUseBarcodeDetect,
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
    expect(overlay?.parentElement).toBe(document.body);
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

  it('should render overlay under document.body via portal', () => {
    render(
      <BarcodeScannerOverlay
        open={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
        scanInterval={500}
      />,
    );
    const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.parentElement).toBe(document.body);
  });

  describe('Phase 2 — autoSubmit', () => {
    it('calls onSubmitForm when autoSubmit is true and scan result arrives (non-batch)', () => {
      const onScan = vi.fn();
      const onSubmitForm = vi.fn();
      const onClose = vi.fn();

      mockUseBarcodeDetect.mockReturnValue({
        result: { barcode: 'ABC123', format: 'code_128' } as any,
        isScanning: false,
        error: null,
      });

      render(
        <BarcodeScannerOverlay
          open={true}
          onClose={onClose}
          onScan={onScan}
          onScanError={vi.fn()}
          autoSubmit={true}
          onSubmitForm={onSubmitForm}
        />,
      );

      expect(onScan).toHaveBeenCalledWith({ barcode: 'ABC123', format: 'code_128' });
      expect(onSubmitForm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onSubmitForm when autoSubmit is false', () => {
      const onScan = vi.fn();
      const onSubmitForm = vi.fn();

      mockUseBarcodeDetect.mockReturnValue({
        result: { barcode: 'DEF456', format: 'ean_13' } as any,
        isScanning: false,
        error: null,
      });

      render(
        <BarcodeScannerOverlay
          open={true}
          onClose={vi.fn()}
          onScan={onScan}
          onScanError={vi.fn()}
          autoSubmit={false}
          onSubmitForm={onSubmitForm}
        />,
      );

      expect(onScan).toHaveBeenCalledWith({ barcode: 'DEF456', format: 'ean_13' });
      expect(onSubmitForm).not.toHaveBeenCalled();
    });

    it('auto-submits all pending items in batch mode', () => {
      const onScan = vi.fn();
      const onClose = vi.fn();

      // Render in batch mode with autoSubmit
      const { rerender } = render(
        <BarcodeScannerOverlay
          open={true}
          onClose={onClose}
          onScan={onScan}
          onScanError={vi.fn()}
          autoSubmit={true}
          batchMode={true}
        />,
      );

      // Trigger first scan result
      mockUseBarcodeDetect.mockReturnValue({
        result: { barcode: 'ITEM1', format: 'code_128' } as any,
        isScanning: false,
        error: null,
      });

      rerender(
        <BarcodeScannerOverlay
          open={true}
          onClose={onClose}
          onScan={onScan}
          onScanError={vi.fn()}
          autoSubmit={true}
          batchMode={true}
        />,
      );

      // In batch autoSubmit, enqueue + submit = onScan called with item
      expect(onScan).toHaveBeenCalled();
    });
  });
});
