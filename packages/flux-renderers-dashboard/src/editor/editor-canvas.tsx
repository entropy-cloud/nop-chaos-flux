import React, { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { EditorCore } from '@nop-chaos/editor-core';
import { cn } from '@nop-chaos/ui';
import { GripVertical, X } from 'lucide-react';
import type { DashboardDocument } from './dashboard-domain-adapter.js';
import { buildPalettePanel } from './editor-palette.js';
import type { DashboardPanelSchema } from '../schemas.js';
import {
  dragPanel,
  panelToPixels,
  resizePanel,
  snapToGrid,
  type ResizeHandle,
} from '../layout-math.js';

export interface EditorCanvasProps {
  core: EditorCore<DashboardDocument, unknown>;
  selection: readonly string[];
  cols: number;
  rowHeight: number;
  gap: number;
  height?: number;
  renderPanelContent: (panel: DashboardPanelSchema) => React.ReactNode;
}

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const HANDLE_POSITION: Record<ResizeHandle, string> = {
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
};

function useCanvasWidth(): { canvasRef: React.RefObject<HTMLDivElement | null>; canvasWidth: number } {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setCanvasWidth(width);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { canvasRef, canvasWidth };
}

/**
 * dashboard 编辑态画布（DOM pointer 拖拽 + resize 八向句柄 + 网格吸附 + 选中高亮）。
 *
 * 交互坐标全部经纯函数（dragPanel/resizePanel/snapToGrid/clamp）计算后写入 editor-core 会话：
 * pointerdown 开事务 → pointermove 逐帧 update（不入栈）→ pointerup endTransaction 单 undo 步。
 */
export function EditorCanvas({
  core,
  selection,
  cols,
  rowHeight,
  gap,
  height,
  renderPanelContent,
}: EditorCanvasProps) {
  const { canvasRef, canvasWidth } = useCanvasWidth();
  const working = core.getState().working;
  const dragRef = useRef<{
    panelId: string;
    startClientX: number;
    startClientY: number;
    canvasRect: DOMRect;
    handle?: ResizeHandle;
  } | null>(null);
  const draggedRef = useRef(false);

  const gridOptions = { cols, rowHeight, gap, canvasWidth, maxY: 30 };

  const canvasHeight = height ?? 600;

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    draggedRef.current = true;
    const x = event.clientX - drag.canvasRect.left;
    const y = event.clientY - drag.canvasRect.top;
    if (drag.handle) {
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      core.update((doc) => ({
        panels: resizePanel(doc.panels, drag.panelId, drag.handle as ResizeHandle, dx, dy, {
          ...gridOptions,
          minW: 1,
          minH: 1,
        }),
      }));
    } else {
      core.update((doc) => ({ panels: dragPanel(doc.panels, drag.panelId, x, y, gridOptions) }));
    }
  };

  const handleCanvasPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    draggedRef.current = false;
    core.endTransaction();
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    panelId: string,
    handle?: ResizeHandle,
  ) => {
    if (event.button === 2) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    core.setSelection([panelId]);
    core.beginTransaction();
    dragRef.current = {
      panelId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasRect: canvas.getBoundingClientRect(),
      handle,
    };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture may be unsupported in some test hosts
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
      return;
    }
    const sel = selection;
    if ((event.key === 'Delete' || event.key === 'Backspace') && sel.length > 0) {
      event.preventDefault();
      const removed = new Set(sel);
      core.update((doc) => ({ panels: doc.panels.filter((p) => !removed.has(p.id)) }));
      core.setSelection([]);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      core.undo();
    } else if (
      (event.metaKey || event.ctrlKey) &&
      (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))
    ) {
      event.preventDefault();
      core.redo();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected(core, sel);
    } else if (event.key === 'Escape') {
      core.setSelection([]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-dashboard-panel-type');
    if (!type) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = clientToGrid(event.clientX, event.clientY, canvas, { cols, rowHeight, gap });
    const panel = buildPalettePanel(working, type, { x, y }, { cols });
    core.update((doc) => ({ panels: [...doc.panels, panel] }));
    core.setSelection([panel.id]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div
      ref={canvasRef}
      data-slot="dashboard-editor-canvas"
      className="relative h-full min-h-0 w-full touch-none overflow-auto bg-muted/30"
      style={{ minWidth: 320 }}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
    >
      <div
        data-slot="dashboard-editor-canvas-body"
        role="region"
        aria-label="Dashboard editing canvas"
        className="relative"
        style={{ width: '100%', height: Math.max(canvasHeight, 120) }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerDown={() => {
          if (!draggedRef.current) core.setSelection([]);
        }}
      >
        {working.panels.map((panel) => {
          const rect = panelToPixels(panel, gridOptions);
          const selected = selection.includes(panel.id);
          return (
            <div
              key={panel.id}
              data-slot="dashboard-editor-panel"
              data-panel-id={panel.id}
              data-selected={selected ? 'true' : undefined}
              role="button"
              tabIndex={0}
              aria-label={`Dashboard panel ${panel.id}`}
              className={cn(
                'group absolute flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
                selected
                  ? 'border-primary ring-2 ring-primary/60'
                  : 'border-border hover:border-primary/50',
              )}
              style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              onPointerDown={(event) => startDrag(event, panel.id)}
              onKeyDown={handleKeyDown}
            >
              {selected && (
                <>
                  <div
                    data-slot="dashboard-editor-panel-remove"
                    className="absolute right-1 top-1 z-10 hidden group-hover:flex"
                  >
                    <button
                      type="button"
                      aria-label={`Remove ${panel.id}`}
                      className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        core.update((doc) => ({
                          panels: doc.panels.filter((p) => p.id !== panel.id),
                        }));
                        core.setSelection([]);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  <div
                    data-slot="dashboard-editor-panel-drag-icon"
                    className="pointer-events-none absolute left-1 top-1 z-10 text-muted-foreground"
                  >
                    <GripVertical className="size-3" />
                  </div>
                </>
              )}
              <div data-slot="dashboard-editor-panel-body" className="pointer-events-none min-h-0 flex-1 p-2 opacity-80">
                {renderPanelContent(panel)}
              </div>
              {panel.title !== undefined && panel.title !== '' && (
                <div
                  data-slot="dashboard-editor-panel-title"
                  className="pointer-events-none border-t border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                >
                  {panel.title}
                </div>
              )}
              {selected &&
                RESIZE_HANDLES.map((handle) => (
                  <div
                    key={handle}
                    data-slot="dashboard-editor-resize-handle"
                    data-handle={handle}
                    className={cn('absolute z-20 size-3 rounded-sm border border-border bg-background', HANDLE_POSITION[handle])}
                    onPointerDown={(event) => startDrag(event, panel.id, handle)}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function duplicateSelected(
  core: EditorCore<DashboardDocument, unknown>,
  selection: readonly string[],
): void {
  if (selection.length === 0) return;
  const working = core.getState().working;
  const byId = new Map(working.panels.map((p) => [p.id, p]));
  const taken = new Set(working.panels.map((p) => p.id));
  const newPanels: DashboardPanelSchema[] = [];
  for (const id of selection) {
    const original = byId.get(id);
    if (!original) continue;
    let suffix = 1;
    let candidate = `${original.id}-copy-${suffix}`;
    while (taken.has(candidate)) {
      suffix += 1;
      candidate = `${original.id}-copy-${suffix}`;
    }
    taken.add(candidate);
    newPanels.push({ ...original, id: candidate, x: original.x + 1, y: original.y + 1 });
  }
  core.update((doc) => ({ panels: [...doc.panels, ...newPanels] }));
  core.setSelection(newPanels.map((p) => p.id));
}

/** 从画布外（palette）落点网格坐标（供 palette drop 复用）。 */
export function clientToGrid(
  clientX: number,
  clientY: number,
  canvasElement: HTMLElement,
  options: { cols: number; rowHeight: number; gap: number },
): { x: number; y: number } {
  const rect = canvasElement.getBoundingClientRect();
  return snapToGrid(clientX - rect.left, clientY - rect.top, {
    ...options,
    canvasWidth: rect.width > 0 ? rect.width : 1200,
  });
}
