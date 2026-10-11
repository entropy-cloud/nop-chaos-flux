// WA-scheduling-002 (plan 568) — DESIGN-RESERVE, UNWIRED. This module is a
// fully built tool layer (JSON/PNG snapshot + download helpers) whose
// product wiring (KanbanHandle saveSnapshot/loadSnapshot + toolbar entry +
// failure toast, per docs/components/kanban/design-export-snapshot.md,
// Status: final 2026-07-20) has never landed; design.md:446 defers export to
// P3. Its only importer is this module's own test suite. The html2canvas
// loader below is shared with the calendar export hook (one strategy, not
// three); if the P3 deferral stands, decide explicitly whether this layer
// moves out of src/ — do not let it silently persist.
import type { BoardData } from '../kanban.types.js';
import { loadHtml2canvas } from '../../shared/html2canvas-loader.js';

const exportInProgress = new WeakMap<HTMLElement, boolean>();

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

export async function exportBoardToPng(boardElement: HTMLElement, signal?: AbortSignal): Promise<Blob> {
  if (exportInProgress.get(boardElement)) {
    throw new Error('Export already in progress for this board');
  }
  exportInProgress.set(boardElement, true);
  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    // WA-scheduling-002: loader errors now propagate directly (the
    // soft-null path was unreachable on abort — the check above already
    // throws — and less observable on load failure).
    const html2canvas = await loadHtml2canvas();
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
  } finally {
    exportInProgress.set(boardElement, false);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
