
import { useState } from 'react';

export interface UseCalendarExportResult {
  exportToPrint: () => void;
  exportToPNG: (element?: HTMLElement | null, fileName?: string) => Promise<void>;
  exportError: string | null;
  clearExportError: () => void;
}

export function useCalendarExport(calendarRef?: React.RefObject<HTMLDivElement | null>): UseCalendarExportResult {
  const [exportError, setExportError] = useState<string | null>(null);

  const clearExportError = () => setExportError(null);

  const exportToPrint = () => {
    window.print();
  };

  const exportToPNG = async (element?: HTMLElement | null, fileName = 'calendar-export.png') => {
    setExportError(null);
    const target = element ?? calendarRef?.current;
    if (!target) return;

    try {
      const html2canvas = (window as any).html2canvas;
      if (!html2canvas) {
        throw new Error('html2canvas not available');
      }
      const canvas: any = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob((blob: Blob | null) => {
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
      }, 'image/png');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PNG export failed';
      setExportError(msg);
    }
  };

  return { exportToPrint, exportToPNG, exportError, clearExportError };
}
