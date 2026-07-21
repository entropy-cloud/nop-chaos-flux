import type { BoardData } from '../kanban.types.js';

export function boardDataToJson(board: BoardData): string {
  return JSON.stringify(board, null, 2);
}

export function boardDataFromJson(json: string): BoardData {
  const parsed = JSON.parse(json);
  if (!parsed.root || typeof parsed.root !== 'object') {
    throw new Error('Invalid BoardData snapshot: missing root');
  }
  return parsed as BoardData;
}

type Html2CanvasFn = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

export async function exportBoardToPng(boardElement: HTMLElement, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const html2canvas = await tryLoadHtml2canvas(signal);
  if (!html2canvas) {
    throw new Error('html2canvas not available');
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (boardElement.scrollWidth > 4096 || boardElement.scrollHeight > 4096) {
    throw new Error('Board too large for PNG export');
  }
  const canvas = await html2canvas(boardElement, {
    useCORS: true,
    allowTaint: false,
    scale: 2,
    backgroundColor: '#ffffff',
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob: Blob | null) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function tryLoadHtml2canvas(signal?: AbortSignal): Promise<Html2CanvasFn | null> {
  try {
    if (signal?.aborted) return null;
    const mod = await import('html2canvas');
    return (mod.default || mod) as unknown as Html2CanvasFn;
  } catch (err) {
    console.warn('[kanban-export] Failed to load html2canvas:', err instanceof Error ? err.message : String(err) || 'Unknown error');
    return null;
  }
}
