import type { ReactNode } from 'react';
import { useEffect, useState, useRef, useMemo, useSyncExternalStore } from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { X, Flashlight, FlashlightOff, ScanLine, Check, XCircle, Trash2 } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import { useBarcodeCamera } from './hooks/use-barcode-camera.js';
import { useBarcodeDetect } from './hooks/use-barcode-detect.js';
import { useBarcodeTorch } from './hooks/use-barcode-torch.js';
import { prepareWasm } from './utils/prepare-wasm.js';
import { BarcodeQueue } from './utils/barcode-queue.js';
import type { BarcodeFormat, BarcodeDetectResult, BarcodeQueueItem } from './barcode-input.types.js';

interface BarcodeScannerOverlayProps {
  open: boolean;
  onClose: () => void;
  onScan: (result: BarcodeDetectResult) => void;
  onScanError?: (error: string) => void;
  formats?: BarcodeFormat[];
  scanInterval?: number;
  torchButton?: boolean;
  wasmUrl?: string;
  batchMode?: boolean;
  children?: ReactNode;
}

export function BarcodeScannerOverlay(props: BarcodeScannerOverlayProps) {
  const {
    open,
    onClose,
    onScan,
    onScanError,
    formats,
    scanInterval,
    torchButton: showTorch,
    wasmUrl,
    batchMode,
  } = props;

  const queue = useMemo(() => new BarcodeQueue(), []);

  const [phase, setPhase] = useState<'loading' | 'scanning' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<BarcodeQueueItem[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isOnline = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('online', onStoreChange);
      window.addEventListener('offline', onStoreChange);
      return () => {
        window.removeEventListener('online', onStoreChange);
        window.removeEventListener('offline', onStoreChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  const camera = useBarcodeCamera({ videoRef });

  const getVideoElement = () => videoRef.current;

  const detect = useBarcodeDetect(getVideoElement, {
    enabled: open && camera.isActive,
    interval: scanInterval ?? 300,
    formats,
  });

  const { stop, start } = camera;

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!open) {
      stop();
      return;
    }

    const init = async () => {
      setPhase('loading');
      try {
        if (wasmUrl) {
          await prepareWasm(wasmUrl);
        }
        if (!mountedRef.current) return;
        await start();
        if (!mountedRef.current) return;
        setPhase('scanning');
      } catch (err: any) {
        if (!mountedRef.current) return;
        setPhase('error');
        const msg = err?.message ?? t('flux.cameraUnavailable');
        setErrorMessage(msg);
        onScanError?.(msg);
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [open, wasmUrl, onScanError, stop, start]);

  useEffect(() => {
    if (detect.result) {
      if (batchMode) {
        queue.enqueue(detect.result.barcode, detect.result.format);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync queue state when scan result arrives
        setQueueItems(queue.getAll());
      } else {
        onScan(detect.result);
        onClose();
      }
    }
  }, [detect.result, batchMode, onScan, onClose, queue]);

  useEffect(() => {
    if (detect.error) {
      onScanError?.(detect.error);
    }
  }, [detect.error, onScanError]);

  const getStream = () => videoRef.current?.srcObject as MediaStream | null;
  const torch = useBarcodeTorch({ getStream });

  function handleQueueSubmit() {
    const pending = queue.getPending();
    for (const item of pending) {
      onScan({ barcode: item.rawValue, format: item.format });
      queue.markSubmitted(item.id);
    }
    setQueueItems(queue.getAll());
  }

  function handleQueueDelete(id: string) {
    queue.dequeue(id);
    setQueueItems(queue.getAll());
  }

  function handleQueueClear() {
    queue.clear();
    setQueueItems([]);
  }

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !overlayRef.current) return;
    const overlay = overlayRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = overlay.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const firstFocusable = overlay.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();
    overlay.addEventListener('keydown', trapFocus);

    return () => {
      overlay.removeEventListener('keydown', trapFocus);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      data-slot="barcode-scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        'bg-black/80 backdrop-blur-sm',
        'animate-in fade-in duration-200',
      )}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {phase === 'scanning' ? 'Scanner is active' : phase === 'error' ? `Scanner error: ${errorMessage}` : 'Initializing scanner'}
      </div>
      <div className="relative flex-1 flex items-center justify-center">
        {phase === 'loading' && (
          <div data-slot="barcode-scanner-loading" className="flex flex-col items-center gap-3 text-white">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm text-white/70">{t('flux.openingCamera')}</span>
          </div>
        )}

        {phase === 'error' && (
          <div data-slot="barcode-scanner-status" className="flex flex-col items-center gap-3 text-white/70">
            <ScanLine className="w-12 h-12 opacity-40" />
            <span className="text-sm">{errorMessage ?? t('flux.cameraUnavailable')}</span>
          </div>
        )}

        {phase === 'scanning' && (
          <video
            ref={videoRef}
            data-slot="barcode-scanner-video"
            className="w-full h-full object-contain"
            playsInline
            muted
            aria-label="Camera feed for barcode scanning"
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          data-slot="barcode-scanner-close"
          className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>

        {showTorch && torch.isAvailable && phase === 'scanning' && (
          <Button
            variant="ghost"
            size="icon"
            data-slot="barcode-scanner-torch"
            className="absolute top-4 left-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
            onClick={torch.toggle}
          >
            {torch.isOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
          </Button>
        )}

        <div
          data-slot="barcode-scanner-status"
          className={cn(
            'absolute bottom-20 left-1/2 -translate-x-1/2 text-sm text-white/60',
            detect.isScanning ? 'opacity-100' : 'opacity-0',
          )}
        >
          {detect.isScanning ? t('flux.alignBarcode') : ''}
        </div>
      </div>

      {!isOnline && (
        <div className="px-4 py-2 bg-yellow-600/90 text-white text-sm text-center">
          {t('flux.offlineQueueMessage')}
        </div>
      )}

      {batchMode && queueItems.length > 0 && (
        <div
          data-slot="barcode-queue-panel"
          className="bg-black/70 backdrop-blur border-t border-white/10 px-4 pt-3 pb-4 max-h-48 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">{t('flux.itemsScanned', { count: queueItems.length })}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon-xs"
                data-slot="barcode-queue-submit"
                className="text-xs text-white/80 hover:text-white"
                onClick={handleQueueSubmit}
                disabled={queue.getPending().length === 0}
              >
                {t('flux.batchConfirm')}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-xs text-white/50 hover:text-white"
                onClick={handleQueueClear}
              >
                {t('flux.clear')}
              </Button>
            </div>
          </div>
          {queueItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 text-sm"
            >
              <span className="flex-1 text-white/80 truncate mr-2">{item.rawValue}</span>
              <span className="text-[10px] text-white/40 uppercase mr-2">{item.format}</span>
              {item.status === 'submitted' && <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />}
              {item.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              {item.status === 'duplicate' && <span className="text-[10px] text-yellow-400 shrink-0">dup</span>}
              {item.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-white/40 hover:text-white/80"
                  onClick={() => handleQueueDelete(item.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {props.children}
    </div>
  );
}
