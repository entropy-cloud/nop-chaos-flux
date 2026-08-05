import type {
  DesignerShellConfig,
  DesignerShellPanelConfig,
  GraphDocument,
  GraphNode,
} from '../types.js';
import { cloneNode } from './clone.js';
import { normalizeViewport, normalizeViewportInput, viewportsEqual } from './viewport.js';

export interface DesignerShellState {
  clipboard: GraphNode | null;
  gridEnabled: boolean;
  paletteCollapsed: boolean;
  inspectorCollapsed: boolean;
  paletteWidth: number;
  inspectorWidth: number;
  viewport: { x: number; y: number; zoom: number };
}

export const DEFAULT_PALETTE_WIDTH = 240;
export const DEFAULT_INSPECTOR_WIDTH = 352;
export const DEFAULT_SHELL_MIN_WIDTH = 200;
export const DEFAULT_SHELL_MAX_WIDTH = 600;

function resolveShellWidth(
  panel: DesignerShellPanelConfig | undefined,
  fallbackWidth: number,
): number {
  const width = panel?.width ?? fallbackWidth;
  const min = panel?.minWidth ?? DEFAULT_SHELL_MIN_WIDTH;
  const max = panel?.maxWidth ?? DEFAULT_SHELL_MAX_WIDTH;
  return Math.min(Math.max(width, min), max);
}

export function createDesignerShellState(
  doc: GraphDocument,
  shellConfig?: DesignerShellConfig,
): DesignerShellState {
  return {
    clipboard: null,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    paletteWidth: resolveShellWidth(shellConfig?.palette, DEFAULT_PALETTE_WIDTH),
    inspectorWidth: resolveShellWidth(shellConfig?.inspector, DEFAULT_INSPECTOR_WIDTH),
    viewport: normalizeViewport(doc.viewport),
  };
}

export function setShellViewport(
  shell: DesignerShellState,
  viewport: { x: number; y: number; zoom: number },
) {
  const normalizedViewport = normalizeViewportInput(viewport);

  if (viewportsEqual(shell.viewport, normalizedViewport)) {
    return false;
  }

  shell.viewport = normalizedViewport;
  return true;
}

export function resetShellViewportFromDocument(shell: DesignerShellState, doc: GraphDocument) {
  shell.viewport = normalizeViewport(doc.viewport);
}

export function setShellClipboard(shell: DesignerShellState, node: GraphNode | null) {
  shell.clipboard = node ? cloneNode(node) : null;
}
