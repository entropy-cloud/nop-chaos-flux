import type { GanttTask, GanttId } from '../gantt.types.js';

let exportingFlag = false;

export interface ExportOptions {
  fileName?: string;
  scale?: number;
}

function getFileName(prefix: string, ext: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export async function exportToPng(
  element: HTMLElement | null,
  options?: ExportOptions,
): Promise<void> {
  if (!element) return;
  if (exportingFlag) return;
  exportingFlag = true;
  const scale = options?.scale ?? 2;
  try {
    const html2canvasMod: any = await import('html2canvas');
    const h2c: (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement> = html2canvasMod.default ?? html2canvasMod;
    const canvas = await h2c(element, { scale, useCORS: true });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Failed to create PNG blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName(options?.fileName ?? 'gantt', 'png');
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('PNG export failed:', e);
    throw e;
  } finally {
    exportingFlag = false;
  }
}

export async function exportToPdf(
  element: HTMLElement | null,
  options?: ExportOptions,
): Promise<void> {
  if (!element) return;
  if (exportingFlag) return;
  exportingFlag = true;
  const scale = options?.scale ?? 2;
  try {
    const html2canvasMod: any = await import('html2canvas');
    const h2c = html2canvasMod.default ?? html2canvasMod;
    const jsPDFMod: any = await import('jspdf');
    const JSPDF = jsPDFMod.default ?? jsPDFMod;
    const canvas = await h2c(element, { scale, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new JSPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(getFileName(options?.fileName ?? 'gantt', 'pdf'));
  } catch (e) {
    console.error('PDF export failed:', e);
    throw e;
  } finally {
    exportingFlag = false;
  }
}

export async function exportToExcel(
  tasks: Map<GanttId, GanttTask>,
  options?: ExportOptions,
): Promise<void> {
  if (exportingFlag) return;
  exportingFlag = true;
  try {
    const XLSX: any = await import('xlsx');
    const data = Array.from(tasks.values()).map((task) => ({
      id: String(task.id),
      text: task.text,
      start: task.start,
      end: task.end,
      duration: task.duration ?? '',
      progress: task.progress ?? '',
      type: task.type ?? 'task',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, getFileName(options?.fileName ?? 'gantt', 'xlsx'));
  } catch (e) {
    console.error('Excel export failed:', e);
    throw e;
  } finally {
    exportingFlag = false;
  }
}
