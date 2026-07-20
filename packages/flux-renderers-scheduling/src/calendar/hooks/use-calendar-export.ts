import { useCallback } from 'react';

export interface UseCalendarExportResult {
  exportToPrint: () => void;
  exportToPNG: (element?: HTMLElement | null, fileName?: string) => Promise<void>;
}

export function useCalendarExport(calendarRef?: React.RefObject<HTMLDivElement | null>): UseCalendarExportResult {
  const exportToPrint = useCallback(() => {
    window.print();
  }, []);

  const exportToPNG = useCallback(async (element?: HTMLElement | null, fileName = 'calendar-export.png') => {
    const target = element ?? calendarRef?.current;
    if (!target) return;

    try {
      // html2canvas is optional - dynamic import with fallback
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
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      console.warn('[Calendar] PNG export failed: html2canvas not available');
    }
  }, [calendarRef]);

  return { exportToPrint, exportToPNG };
}
