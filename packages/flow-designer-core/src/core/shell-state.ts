import type { GraphDocument, GraphNode } from '../types';
import { cloneNode } from './clone';
import { normalizeViewport, normalizeViewportInput, viewportsEqual } from './viewport';

export interface DesignerShellState {
  clipboard: GraphNode | null;
  gridEnabled: boolean;
  paletteCollapsed: boolean;
  inspectorCollapsed: boolean;
  viewport: { x: number; y: number; zoom: number };
}

export function createDesignerShellState(doc: GraphDocument): DesignerShellState {
  return {
    clipboard: null,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: normalizeViewport(doc.viewport)
  };
}

export function setShellViewport(shell: DesignerShellState, viewport: { x: number; y: number; zoom: number }) {
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
