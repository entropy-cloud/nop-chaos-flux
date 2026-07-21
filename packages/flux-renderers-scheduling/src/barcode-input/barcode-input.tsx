import type { ChangeEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useInputComponentHandle, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Label, cn } from '@nop-chaos/ui';
import { ScanLine } from 'lucide-react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';
import { checkCameraAvailability } from './utils/camera-utils.js';
import { resetWasmPromise as resetWasm } from './utils/prepare-wasm.js';
import type { BarcodeInputSchema, BarcodeDetectResult } from './barcode-input.types.js';

export function BarcodeInputRenderer(props: RendererComponentProps<BarcodeInputSchema>) {
  const { props: resolved, meta, events, helpers: _helpers } = props;
  const _runtime = useRendererRuntime();
  const _scope = useRenderScope();
  const form = useCurrentForm();

  const name = String(resolved.name ?? '');
  const inputValue = useCurrentFormState(
    (state) => {
      if (!name) return '';
      const val = state.values?.[name];
      return val != null ? String(val) : '';
    },
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    void events.onMount?.({});
    return () => {
      void events.onUnmount?.({});
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
      }).catch((err) => {
        console.warn('BarcodeInput: camera check failed on focus', err);
      });
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
    try {
      if (cameraAvailable === null) {
        const result = await checkCameraAvailability();
        setCameraAvailable(result.isAvailable);
        if (!result.isAvailable) return;
      }
      setOverlayOpen(true);
    } catch (err) {
      console.warn('BarcodeInput: failed to open scanner', err);
      setCameraAvailable(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (resolved.trimContents) {
      val = val.trim();
    }
    if (name && form) {
      if (resolved.minLength != null && val.length < Number(resolved.minLength)) return;
      if (resolved.maxLength != null && val.length > Number(resolved.maxLength)) return;
      if (resolved.pattern && val) {
        try {
          const regex = new RegExp(String(resolved.pattern));
          if (!regex.test(val)) return;
        } catch { /* invalid regex, allow */ }
      }
      form.setValue(name, val);
    }
  };

  const handleScanResult = (result: BarcodeDetectResult) => {
    const val = result.barcode;
    if (name && form) {
      form.setValue(name, val);
    }
    void events.onScan?.({ barcode: result.barcode, format: result.format });
  };

  const handleScanError = (error: string) => {
    void events.onScanError?.({ error: { message: error } });
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
        }).catch((err) => {
          console.warn('BarcodeInput: camera check failed in scanNow', err);
        });
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
  const labelText = resolved.label ? String(resolved.label) : undefined;
  const inputId = `${props.id || name}-input`;

  return (
    <div data-slot="barcode-input" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-barcode-input nop-input-text', meta.className)}>
      {labelText && <Label htmlFor={inputId}>{labelText}</Label>}
      <InputGroup className="nop-input-group">
        <InputGroupInput
          ref={inputRef}
          id={inputId}
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
        continuousScan={resolved.continuousScan === true}
        autoSubmit={autoSubmit}
        onSubmitForm={handleSubmitForm}
      />
    </div>
  );
}
