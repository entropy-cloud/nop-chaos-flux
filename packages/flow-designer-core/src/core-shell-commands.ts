import type { GraphDocument, DesignerEvent } from './types';
import {
  setShellClipboard,
  setShellViewport,
  type DesignerShellState,
} from './core/shell-state';
import type { DesignerTransaction } from './core/transactions';

export interface ShellCommandContext {
  get shellState(): DesignerShellState;
  get transactionStack(): DesignerTransaction[];
  emit(event: DesignerEvent): void;
  emitMutation(event: DesignerEvent): void;
  setDocument(nextDoc: GraphDocument): boolean;
  pushHistory(): void;
  updateDirtyState(): void;
  getDoc(): GraphDocument;
  addNodeFn(type: string, position: { x: number; y: number }, data?: Record<string, unknown>): unknown;
  getSelectedNodeId(): string | null;
}

export function copySelectionCommand(ctx: ShellCommandContext): void {
  const activeNodeId = ctx.getSelectedNodeId();
  if (!activeNodeId) {
    return;
  }

  const node = ctx.getDoc().nodes.find((n) => n.id === activeNodeId);
  if (node) {
    setShellClipboard(ctx.shellState, node);
  }
}

export function pasteClipboardCommand(ctx: ShellCommandContext): void {
  if (!ctx.shellState.clipboard) {
    return;
  }

  const { clipboard } = ctx.shellState;
  ctx.addNodeFn(clipboard.type, { x: clipboard.position.x + 48, y: clipboard.position.y + 48 }, clipboard.data);
}

export function toggleGridCommand(ctx: ShellCommandContext): void {
  ctx.shellState.gridEnabled = !ctx.shellState.gridEnabled;
  ctx.emit({ type: 'gridToggled', enabled: ctx.shellState.gridEnabled });
}

export function setGridCommand(ctx: ShellCommandContext, enabled: boolean): void {
  if (ctx.shellState.gridEnabled === enabled) {
    return;
  }

  ctx.shellState.gridEnabled = enabled;
  ctx.emit({ type: 'gridToggled', enabled: ctx.shellState.gridEnabled });
}

export function togglePaletteCommand(ctx: ShellCommandContext): void {
  ctx.shellState.paletteCollapsed = !ctx.shellState.paletteCollapsed;
  ctx.emit({ type: 'paletteCollapseChanged', collapsed: ctx.shellState.paletteCollapsed });
}

export function setPaletteCollapsedCommand(ctx: ShellCommandContext, collapsed: boolean): void {
  if (ctx.shellState.paletteCollapsed === collapsed) {
    return;
  }

  ctx.shellState.paletteCollapsed = collapsed;
  ctx.emit({ type: 'paletteCollapseChanged', collapsed: ctx.shellState.paletteCollapsed });
}

export function toggleInspectorCommand(ctx: ShellCommandContext): void {
  ctx.shellState.inspectorCollapsed = !ctx.shellState.inspectorCollapsed;
  ctx.emit({ type: 'inspectorCollapseChanged', collapsed: ctx.shellState.inspectorCollapsed });
}

export function setInspectorCollapsedCommand(ctx: ShellCommandContext, collapsed: boolean): void {
  if (ctx.shellState.inspectorCollapsed === collapsed) {
    return;
  }

  ctx.shellState.inspectorCollapsed = collapsed;
  ctx.emit({ type: 'inspectorCollapseChanged', collapsed: ctx.shellState.inspectorCollapsed });
}

export function setViewportCommand(ctx: ShellCommandContext, newViewport: { x: number; y: number; zoom: number }): void {
  if (!setShellViewport(ctx.shellState, newViewport)) {
    return;
  }

  ctx.setDocument({ ...ctx.getDoc(), viewport: ctx.shellState.viewport });
  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emit({ type: 'viewportChanged', viewport: ctx.shellState.viewport });
  ctx.emit({ type: 'documentChanged', doc: ctx.getDoc() });
  ctx.updateDirtyState();
}
