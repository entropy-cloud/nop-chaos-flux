import type { ChangeEvent } from 'react';
import { useState, useEffect, useRef, useCallback, useId } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useInputComponentHandle } from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, cn } from '@nop-chaos/ui';
import { ScanLine } from 'lucide-react';
import { BarcodeScannerOverlay } from './barcode-scanner-overlay.js';
import { checkCameraAvailability } from './utils/camera-utils.js';
import { resetWasmPromise as resetWasm } from './utils/prepare-wasm-utils.js';
import type { BarcodeInputSchema, BarcodeDetectResult } from './barcode-input.types.js';

export function BarcodeInputRenderer(props: RendererComponentProps<BarcodeInputSchema>) {
  const { props: resolved, meta, events, helpers: _helpers } = props;
  const { t } = useFluxTranslation();
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const errorId = useId();

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

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const handleFocus = () => {
    if (resolved.readOnly) return;
    if (!scanOnFocus || overlayOpen) return;
    scanOnFocusOpenedRef.current = true;
    if (cameraAvailable === null) {
      checkCameraAvailability().then((result) => {
        if (!mountedRef.current) return;
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

  const scanAbortRef = useRef<AbortController | null>(null);

  const handleScanClick = async () => {
    if (resolved.readOnly) return;
    scanOnFocusOpenedRef.current = false;
    scanAbortRef.current?.abort();
    const ac = new AbortController();
    scanAbortRef.current = ac;
    try {
      if (cameraAvailable === null) {
        const result = await checkCameraAvailability();
        if (ac.signal.aborted || !mountedRef.current) return;
        setCameraAvailable(result.isAvailable);
        if (!result.isAvailable) return;
      }
      if (ac.signal.aborted || !mountedRef.current) return;
      setOverlayOpen(true);
    } catch (err) {
      if (ac.signal.aborted) return;
      console.warn('BarcodeInput: failed to open scanner', err);
      setCameraAvailable(false);
      setScannerError('Camera unavailable');
    }
  };

  useEffect(() => {
    return () => { scanAbortRef.current?.abort(); };
  }, []);

  const validateScanResult = useCallback((val: string): string | null => {
    if (resolved.required && (!val || val.length === 0)) {
      return resolved.required === true ? 'This field is required' : String(resolved.required);
    }
    const minL = resolved.minLength;
    if (typeof minL === 'number' && val.length < minL) {
      return `Minimum length is ${minL} characters`;
    }
    const maxL = resolved.maxLength;
    if (typeof maxL === 'number' && val.length > maxL) {
      return `Maximum length is ${maxL} characters`;
    }
    if (resolved.pattern) {
      try {
        const re = new RegExp(resolved.pattern);
        if (!re.test(val)) {
          return `Value does not match pattern: ${resolved.pattern}`;
        }
      } catch {
        return `Invalid pattern: ${resolved.pattern}`;
      }
    }
    if (resolved.validate?.message) {
      return resolved.validate.message;
    }
    return null;
  }, [resolved.required, resolved.minLength, resolved.maxLength, resolved.pattern, resolved.validate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (resolved.trimContents) {
      val = val.trim();
    }
    if (name && form) {
      form.setValue(name, val);
    }
    setValidationError(null);
  };

  const handleScanResult = (result: BarcodeDetectResult) => {
    if (resolved.readOnly) return;
    const val = result.barcode;
    const error = validateScanResult(val);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
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
          if (result.isAvailable) {
            setOverlayOpen(true);
          }
        }).catch((err) => {
          console.warn('BarcodeInput: camera check failed in scanNow', err);
        });
        return { success: false, pending: true };
      }
      if (cameraAvailable) {
        setOverlayOpen(true);
        return { success: true };
      }
      return { success: false, error: 'Camera unavailable' };
    },
    stopScan: () => {
      setOverlayOpen(false);
      return { success: true };
    },
    resetWasmPromise: () => {
      resetWasm(resolved.wasmUrl);
    },
  });

  if (!meta.visible) return null;

  const showClearButton = resolved.clearable && inputValue.length > 0;
  const inputId = `${props.id || name}-input`;

  return (
    <div data-slot="barcode-input" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-barcode-input nop-input-text', meta.className)}>
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
          aria-required={!!resolved.required || undefined}
          aria-describedby={validationError ? errorId : undefined}
        />
        <InputGroupAddon align="inline-end">
          {showClearButton ? (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label={t('flux.barcode.clearLabel')}
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
              aria-label={t('flux.barcode.scanBarcodeLabel')}
              className={resolved.scanButtonClassName}
              onClick={handleScanClick}
            >
              <ScanLine className="pointer-events-none w-4 h-4" />
            </InputGroupButton>
          ) : null}
        </InputGroupAddon>
      </InputGroup>

      {validationError && (
        <div id={errorId} data-slot="barcode-validation-error" className="text-xs text-destructive mt-1">{validationError}</div>
      )}

      {scannerError && (
        <div className="text-xs text-destructive mt-1">{scannerError}</div>
      )}

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
