import type { ChangeEvent } from 'react';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentForm, useInputComponentHandle } from '@nop-chaos/flux-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, cn } from '@nop-chaos/ui';
import { ScanLine } from 'lucide-react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';
import { checkCameraAvailability } from './utils/camera-utils.js';
import { resetWasmPromise as resetWasm } from './utils/prepare-wasm.js';
import type { BarcodeInputSchema, BarcodeDetectResult } from './barcode-input.types.js';

export function BarcodeInputRenderer(props: RendererComponentProps<BarcodeInputSchema>) {
  const { props: resolved, meta, events } = props;
  const form = useCurrentForm();

  const name = String(resolved.name ?? '');
  const inputValue = useSyncExternalStore(
    form?.store?.subscribe ?? (() => () => {}),
    () => {
      if (!name || !form?.store) return '';
      const state = form.store.getState() as { values?: Record<string, unknown> };
      return (state.values?.[name] as string) ?? '';
    },
    () => '',
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    events.onMount?.({});
    return () => {
      events.onUnmount?.({});
    };
  }, [events]);

  const scanButton = resolved.scanButton !== false;
  const batchMode = resolved.batchMode === true;
  const scanInterval = typeof resolved.scanInterval === 'number' ? resolved.scanInterval : 300;
  const autoSubmit = resolved.autoSubmit === true;
  const scanOnFocus = resolved.scanOnFocus === true;

  const showScanButton = scanButton && (cameraAvailable !== false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scanOnFocusOpenedRef = useRef(false);

  const handleClear = () => {
    if (name && form) {
      form.setValue(name, '');
    }
  };

  const handleFocus = () => {
    if (!scanOnFocus || overlayOpen) return;
    scanOnFocusOpenedRef.current = true;
    if (cameraAvailable === null) {
      checkCameraAvailability().then((result) => {
        setCameraAvailable(result.isAvailable);
        if (result.isAvailable) setOverlayOpen(true);
      }).catch(() => {});
    } else if (cameraAvailable) {
      setOverlayOpen(true);
    }
  };

  const handleBlur = () => {
    if (!scanOnFocus) return;
    if (overlayOpen) return;
    scanOnFocusOpenedRef.current = false;
  };

  const handleScanClick = async () => {
    scanOnFocusOpenedRef.current = false;
    if (cameraAvailable === null) {
      const result = await checkCameraAvailability();
      setCameraAvailable(result.isAvailable);
      if (!result.isAvailable) return;
    }
    setOverlayOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (name && form) {
      form.setValue(name, val);
    }
  };

  const handleScanResult = (result: BarcodeDetectResult) => {
    const val = result.barcode;
    if (name && form) {
      form.setValue(name, val);
    }
    events.onScan?.({ barcode: result.barcode, format: result.format });
  };

  const handleScanError = (error: string) => {
    events.onScanError?.({ error: { message: error } });
  };

  const handleOverlayClose = () => {
    setOverlayOpen(false);
  };

  const handleSubmitForm = () => {
    form?.submit();
  };

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'barcode-input',
    cid: props.meta.cid,
    methods: ['clear', 'reset', 'focus', 'scanNow', 'stopScan', 'resetWasmPromise'],
    getFocusTarget: () => inputRef.current,
    isInteractive: () => !meta.disabled,
    isVisible: () => meta.visible !== false,
    clearValue: handleClear,
    resetValue: () => {
      if (name && form) {
        form.setValue(name, '');
      }
      return { fellBackToDefault: true };
    },
    scanNow: () => {
      scanOnFocusOpenedRef.current = false;
      if (cameraAvailable === null) {
        checkCameraAvailability().then((result) => {
          setCameraAvailable(result.isAvailable);
          if (result.isAvailable) setOverlayOpen(true);
        }).catch(() => {});
      } else if (cameraAvailable) {
        setOverlayOpen(true);
      }
    },
    stopScan: () => {
      setOverlayOpen(false);
    },
    resetWasmPromise: () => {
      resetWasm();
    },
  });

  if (!meta.visible) return null;

  const showClearButton = resolved.clearable && inputValue.length > 0;

  return (
    <div data-slot="barcode-input" className={cn('nop-barcode-input nop-input-text', meta.className)}>
      <InputGroup className="nop-input-group">
        <InputGroupInput
          ref={inputRef}
          type="text"
          name={name || undefined}
          value={inputValue}
          placeholder={resolved.placeholder ? String(resolved.placeholder) : undefined}
          disabled={meta.disabled}
          readOnly={resolved.readOnly}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
        autoSubmit={autoSubmit}
        onSubmitForm={handleSubmitForm}
      />
    </div>
  );
}
