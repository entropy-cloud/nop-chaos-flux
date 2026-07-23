import html2canvas from 'html2canvas';
import { useState, useRef } from 'react';

export interface UseCalendarExportResult {
  exportToPrint: () => void;
  exportToPNG: (element?: HTMLElement | null, fileName?: string, signal?: AbortSignal) => Promise<void>;
  exportError: string | null;
  clearExportError: () => void;
}

export function useCalendarExport(calendarRef?: React.RefObject<HTMLDivElement | null>): UseCalendarExportResult {
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);

  const clearExportError = () => setExportError(null);

  const exportToPrint = () => {
    window.print();
  };

  const exportToPNG = async (element?: HTMLElement | null, fileName = 'calendar-export.png', externalSignal?: AbortSignal) => {
    if (exportingRef.current) return;
    setExportError(null);
    const target = element ?? calendarRef?.current;
    if (!target) return;

    const effectiveSignal = externalSignal ?? AbortSignal.timeout(60000);
    const guardTimer = setTimeout(() => { exportingRef.current = false; }, 65000);
    exportingRef.current = true;

    const throwIfAborted = () => {
      if (effectiveSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    };

    try {
      throwIfAborted();

      const canvas: any = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      });

      throwIfAborted();

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        effectiveSignal.addEventListener('abort', onAbort, { once: true });
        canvas.toBlob((b: Blob | null) => {
          effectiveSignal.removeEventListener('abort', onAbort);
          resolve(b);
        }, 'image/png');
      });

      if (!blob) {
        setExportError('Failed to generate PNG image');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err) || 'PNG export failed';
      setExportError(msg);
      throw err;
    } finally {
      clearTimeout(guardTimer);
      exportingRef.current = false;
    }
  };

  return { exportToPrint, exportToPNG, exportError, clearExportError };
}
