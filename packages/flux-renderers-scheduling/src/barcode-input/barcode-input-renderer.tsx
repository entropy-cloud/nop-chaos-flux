import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentForm } from '@nop-chaos/flux-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, cn } from '@nop-chaos/ui';
import { ScanLine } from 'lucide-react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';
import { checkCameraAvailability } from './utils/camera-utils.js';
import type { BarcodeInputSchema, BarcodeDetectResult } from './barcode-input.types.js';

export function BarcodeInputRenderer(props: RendererComponentProps<BarcodeInputSchema>) {
  const { props: resolved, meta, events, helpers } = props;
  const form = useCurrentForm();

  const name = String(resolved.name ?? '');
  const [inputValue, setInputValue] = useState(() => {
    if (name && form && form.store) {
      const state = form.store.getState();
      return (state.values[name] as string) ?? '';
    }
    return '';
  });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    events.onMount?.({});
    return () => {
      events.onUnmount?.({});
    };
  }, [events]);

  useEffect(() => {
    if (!name || !form || !form.store) return;
    const unsub = form.store.subscribe(() => {
      const state = form.store.getState() as { values?: Record<string, unknown> };
      const newVal = (state.values?.[name] as string) ?? '';
      setInputValue((prev) => (prev !== newVal ? newVal : prev));
    });
    return unsub;
  }, [name, form]);

  const scanButton = resolved.scanButton !== false;
  const batchMode = resolved.batchMode === true;
  const scanInterval = typeof resolved.scanInterval === 'number' ? resolved.scanInterval : 300;

  const showScanButton = scanButton && (cameraAvailable !== false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (name && form) {
      form.setValue(name, val);
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (name && form) {
      form.setValue(name, '');
    }
  };

  const handleScanResult = (result: BarcodeDetectResult) => {
    const val = result.barcode;
    setInputValue(val);
    if (name && form) {
      form.setValue(name, val);
    }
    if (events.onScan) {
      helpers.dispatch(events.onScan as any, {
        ...(events.onScan as any)?.__ctx,
        barcode: result.barcode,
        format: result.format,
      });
    }
  };

  const handleScanError = (error: string) => {
    if (events.onScanError) {
      helpers.dispatch(events.onScanError as any, {
        ...(events.onScanError as any)?.__ctx,
        error: { message: error },
      });
    }
  };

  const handleScanClick = async () => {
    if (cameraAvailable === null) {
      const result = await checkCameraAvailability();
      setCameraAvailable(result.isAvailable);
      if (!result.isAvailable) return;
    }
    setOverlayOpen(true);
  };

  const handleOverlayClose = () => {
    setOverlayOpen(false);
  };

  if (!meta.visible) return null;

  const showClearButton = resolved.clearable && inputValue.length > 0;

  return (
    <div data-slot="barcode-input" className={cn('nop-barcode-input nop-input-text', meta.className)}>
      <InputGroup className="nop-input-group">
        <InputGroupInput
          type="text"
          name={name || undefined}
          value={inputValue}
          placeholder={resolved.placeholder ? String(resolved.placeholder) : undefined}
          disabled={meta.disabled}
          readOnly={resolved.readOnly}
          onChange={handleChange}
          aria-label={String(resolved.label ?? name ?? '') || undefined}
        />
        <InputGroupAddon align="inline-end">
          {showClearButton ? (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label="Clear"
              onClick={handleClear}
            >
              <span className="pointer-events-none text-muted-foreground">×</span>
            </InputGroupButton>
          ) : null}
          {showScanButton ? (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              data-slot="barcode-scan-button"
              aria-label="Scan barcode"
              className={resolved.scanButtonClassName}
              onClick={handleScanClick}
            >
              <ScanLine className="pointer-events-none w-4 h-4" />
            </InputGroupButton>
          ) : null}
        </InputGroupAddon>
      </InputGroup>

      <BarcodeScannerOverlay
        open={overlayOpen}
        onClose={handleOverlayClose}
        onScan={handleScanResult}
        onScanError={handleScanError}
        formats={resolved.formats}
        scanInterval={scanInterval}
        torchButton={resolved.torchButton}
        wasmUrl={resolved.wasmUrl}
        batchMode={batchMode}
      />
    </div>
  );
}
