import type { DesignerEvent, GraphDocument } from '../types.js';
import { cloneDocument } from './clone.js';
import {
  resetShellViewportFromDocument,
  setShellClipboard,
  setShellViewport,
  type DesignerShellState,
} from './shell-state.js';

export function createShellControls(args: {
  getDocument: () => GraphDocument;
  setDocument: (nextDoc: GraphDocument) => boolean;
  pushHistory: () => void;
  replaceHistory: (nextDoc: GraphDocument) => void;
  markHostDocumentSaved: (nextDoc: GraphDocument) => void;
  emit: (event: DesignerEvent) => void;
  updateDirtyState: () => void;
  shellState: DesignerShellState;
  getTransactionDepth: () => number;
}) {
  function copySelection(activeNodeId: string | null) {
    if (!activeNodeId) {
      return;
    }

    const node = args.getDocument().nodes.find((entry) => entry.id === activeNodeId);
    if (node) {
      setShellClipboard(args.shellState, node);
    }
  }

  function pasteClipboard(
    addNode: (
      type: string,
      position: { x: number; y: number },
      data?: Record<string, unknown>,
    ) => unknown,
  ) {
    if (!args.shellState.clipboard) {
      return;
    }

    addNode(
      args.shellState.clipboard.type,
      {
        x: args.shellState.clipboard.position.x + 48,
        y: args.shellState.clipboard.position.y + 48,
      },
      args.shellState.clipboard.data,
    );
  }

  function toggleGrid() {
    args.shellState.gridEnabled = !args.shellState.gridEnabled;
    args.emit({ type: 'gridToggled', enabled: args.shellState.gridEnabled });
  }

  function setGrid(enabled: boolean) {
    if (args.shellState.gridEnabled === enabled) {
      return;
    }

    args.shellState.gridEnabled = enabled;
    args.emit({ type: 'gridToggled', enabled: args.shellState.gridEnabled });
  }

  function togglePalette() {
    args.shellState.paletteCollapsed = !args.shellState.paletteCollapsed;
    args.emit({ type: 'paletteCollapseChanged', collapsed: args.shellState.paletteCollapsed });
  }

  function setPaletteCollapsed(collapsed: boolean) {
    if (args.shellState.paletteCollapsed === collapsed) {
      return;
    }

    args.shellState.paletteCollapsed = collapsed;
    args.emit({ type: 'paletteCollapseChanged', collapsed: args.shellState.paletteCollapsed });
  }

  function toggleInspector() {
    args.shellState.inspectorCollapsed = !args.shellState.inspectorCollapsed;
    args.emit({ type: 'inspectorCollapseChanged', collapsed: args.shellState.inspectorCollapsed });
  }

  function setInspectorCollapsed(collapsed: boolean) {
    if (args.shellState.inspectorCollapsed === collapsed) {
      return;
    }

    args.shellState.inspectorCollapsed = collapsed;
    args.emit({ type: 'inspectorCollapseChanged', collapsed: args.shellState.inspectorCollapsed });
  }

  function setViewport(newViewport: { x: number; y: number; zoom: number }) {
    if (!setShellViewport(args.shellState, newViewport)) {
      return;
    }

    const currentDoc = args.getDocument();
    args.setDocument({ ...currentDoc, viewport: args.shellState.viewport });
    if (args.getTransactionDepth() === 0) args.pushHistory();
    args.emit({ type: 'viewportChanged', viewport: args.shellState.viewport });
    args.emit({ type: 'documentChanged', doc: args.getDocument() });
    args.updateDirtyState();
  }

  function replaceDocumentFromHost(nextDoc: GraphDocument) {
    const cloned = cloneDocument(nextDoc);
    args.setDocument(cloned);
    args.replaceHistory(cloned);
    args.markHostDocumentSaved(cloned);
    resetShellViewportFromDocument(args.shellState, args.getDocument());
    args.emit({ type: 'documentChanged', doc: args.getDocument() });
    args.emit({ type: 'viewportChanged', viewport: args.shellState.viewport });
    args.updateDirtyState();
  }

  return {
    copySelection,
    pasteClipboard,
    toggleGrid,
    setGrid,
    togglePalette,
    setPaletteCollapsed,
    toggleInspector,
    setInspectorCollapsed,
    setViewport,
    replaceDocumentFromHost,
  };
}
