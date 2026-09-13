import type { PrintElementSchema } from '@nop-chaos/flux-print-core';
import { getRegionRect, mmToPx, PX_PER_MM } from '@nop-chaos/flux-print-core';
import { cn } from '@nop-chaos/ui';
import React, { useRef } from 'react';
import {
  getPrintElementRenderer,
  usePrintEditorSnapshot,
  type PrintEditorController,
  type ResizeHandle,
} from './index.js';
import { PRINT_ELEMENT_MIME } from './print-palette.js';
import {
  applyHandleDelta,
  computeRotateAngle,
  computeSnap,
  gridCandidates,
  screenToPaper,
  type Frame,
} from './editor/canvas-math.js';

export interface PrintDesignerCanvasProps {
  controller: PrintEditorController;
  className?: string;
}

interface DragState {
  mode: 'move' | 'resize' | 'rotate';
  id: string;
  handle?: ResizeHandle;
  /** 指针在所属区域坐标系（region 原点为原点，mm）——与元素 left/top 同一空间。 */
  startPointer: { left: number; top: number };
  startFrame: Frame;
  startAngle?: number;
  regionOrigin: { left: number; top: number };
  regionBounds: { width: number; height: number };
}

const SNAP_THRESHOLD_PX = 3;
const RULER_SIZE_PX = 20;
const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function PrintDesignerCanvas({ controller, className }: PrintDesignerCanvasProps) {
  const { state, zoom } = usePrintEditorSnapshot(controller);
  const template = state.working;
  const paper = template.page.paper;
  const dragRef = useRef<DragState | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  const widthPx = mmToPx(paper.width) * zoom;
  const heightPx = mmToPx(paper.height) * zoom;
  const gridSize = mmToPx(10) * zoom;
  const selected = new Set(state.selection);
  const contentRect = getRegionRect(template.page, 'body');
  const headerRect = getRegionRect(template.page, 'header');
  const footerRect = getRegionRect(template.page, 'footer');

  const paperPointFromEvent = (event: React.PointerEvent): { left: number; top: number } => {
    const rect = paperRef.current?.getBoundingClientRect();
    return screenToPaper(
      event.clientX,
      event.clientY,
      { left: rect?.left ?? 0, top: rect?.top ?? 0 },
      zoom,
    );
  };

  const regionPointFromEvent = (event: React.PointerEvent, regionOrigin: { left: number; top: number }) => {
    const paperPoint = paperPointFromEvent(event);
    return { left: paperPoint.left - regionOrigin.left, top: paperPoint.top - regionOrigin.top };
  };

  /** 吸附候选与移动 frame 同处区域坐标系：网格铺满 region，元素锚点取同区域元素。 */
  const buildSnapOptions = (dragId: string, region: { left: number; top: number; width: number; height: number }) => {
    const others = template.elements.filter(
      (element) => element.id !== dragId && element.region === template.elements.find((e) => e.id === dragId)?.region,
    );
    const xs = [...gridCandidates(region.width, 10)];
    const ys = [...gridCandidates(region.height, 10)];
    for (const other of others) {
      xs.push(other.left, other.left + other.width / 2, other.left + other.width);
      ys.push(other.top, other.top + other.height / 2, other.top + other.height);
    }
    return { gridSize: 10, verticalCandidates: xs, horizontalCandidates: ys, threshold: SNAP_THRESHOLD_PX / (PX_PER_MM * zoom) };
  };

  const handleElementPointerDown = (event: React.PointerEvent, element: PrintElementSchema, handle?: ResizeHandle) => {
    event.stopPropagation();
    controller.setSelection([element.id]);
    controller.beginDrag();
    const regionRect = getRegionRect(template.page, element.region);
    dragRef.current = {
      mode: handle ? 'resize' : 'move',
      id: element.id,
      handle,
      startPointer: regionPointFromEvent(event, { left: regionRect.left, top: regionRect.top }),
      startFrame: { left: element.left, top: element.top, width: element.width, height: element.height },
      regionOrigin: { left: regionRect.left, top: regionRect.top },
      regionBounds: { width: regionRect.width, height: regionRect.height },
    };
  };

  const handleRotatePointerDown = (event: React.PointerEvent, element: PrintElementSchema) => {
    event.stopPropagation();
    controller.setSelection([element.id]);
    controller.beginDrag();
    const regionRect = getRegionRect(template.page, element.region);
    dragRef.current = {
      mode: 'rotate',
      id: element.id,
      startPointer: regionPointFromEvent(event, { left: regionRect.left, top: regionRect.top }),
      startFrame: { left: element.left, top: element.top, width: element.width, height: element.height },
      startAngle: element.rotate ?? 0,
      regionOrigin: { left: regionRect.left, top: regionRect.top },
      regionBounds: { width: regionRect.width, height: regionRect.height },
    };
  };

  const handlePaperPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pointer = regionPointFromEvent(event, drag.regionOrigin);

    if (drag.mode === 'move') {
      const moved: Frame = {
        left: drag.startFrame.left + (pointer.left - drag.startPointer.left),
        top: drag.startFrame.top + (pointer.top - drag.startPointer.top),
        width: drag.startFrame.width,
        height: drag.startFrame.height,
      };
      const snapped = computeSnap(moved, buildSnapOptions(drag.id, { left: drag.regionOrigin.left, top: drag.regionOrigin.top, ...drag.regionBounds }));
      controller.moveFrame(drag.id, clampFrame(snapped.frame, drag.regionBounds.width, drag.regionBounds.height));
      return;
    }

    if (drag.mode === 'resize' && drag.handle) {
      const resized = applyHandleDelta(
        drag.handle,
        drag.startFrame,
        pointer.left - drag.startPointer.left,
        pointer.top - drag.startPointer.top,
      );
      controller.moveFrame(drag.id, clampFrame(resized, drag.regionBounds.width, drag.regionBounds.height));
      return;
    }

    const centerX = drag.startFrame.left + drag.startFrame.width / 2;
    const centerY = drag.startFrame.top + drag.startFrame.height / 2;
    const angle = computeRotateAngle({ left: centerX, top: centerY }, pointer, { free: event.altKey });
    controller.updateElement(drag.id, { rotate: angle } as Partial<PrintElementSchema>);
  };

  const handlePaperPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    controller.endDrag();
  };

  /** palette 拖入落位（design.md §8）：drop 点换算 body 区域坐标 + 网格吸附。 */
  const handlePaletteDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(PRINT_ELEMENT_MIME);
    if (!type) return;
    const paperPoint = paperPointFromEvent(event as unknown as React.PointerEvent);
    const bodyRect = getRegionRect(template.page, 'body');
    const local = {
      left: Math.max(0, paperPoint.left - bodyRect.left),
      top: Math.max(0, paperPoint.top - bodyRect.top),
    };
    const snapped = computeSnap(
      { ...local, width: 0, height: 0 },
      { gridSize: 10, verticalCandidates: gridCandidates(bodyRect.width, 10), horizontalCandidates: gridCandidates(bodyRect.height, 10), threshold: SNAP_THRESHOLD_PX / (PX_PER_MM * zoom) },
    );
    controller.addElement(type as never, { left: snapped.frame.left, top: snapped.frame.top });
  };

  const rulerTicks = buildRulerTicks(Math.max(paper.width, paper.height));

  return (
    <div className={cn('nop-print-canvas', className)} data-testid="print-designer-canvas">
      <div className="nop-print-canvas-ruler-corner" style={{ width: RULER_SIZE_PX, height: RULER_SIZE_PX }} />
      <div className="nop-print-canvas-ruler-top" style={{ height: RULER_SIZE_PX, marginLeft: RULER_SIZE_PX, width: widthPx }}>
        {rulerTicks.filter((tick) => tick <= paper.width).map((tick) => (
          <span key={tick} className="nop-print-canvas-ruler-tick" style={{ left: mmToPx(tick) * zoom }}>
            {tick}
          </span>
        ))}
      </div>
      <div className="nop-print-canvas-ruler-left" style={{ width: RULER_SIZE_PX, marginTop: -RULER_SIZE_PX, height: heightPx }}>
        {rulerTicks.filter((tick) => tick <= paper.height).map((tick) => (
          <span key={tick} className="nop-print-canvas-ruler-tick" style={{ top: mmToPx(tick) * zoom }}>
            {tick}
          </span>
        ))}
      </div>
      <div
        ref={paperRef}
        className="nop-print-paper"
        role="application"
        aria-roledescription="print paper canvas"
        data-paper-name={template.page.paperName ?? 'custom'}
        style={{
          width: widthPx,
          height: heightPx,
          marginLeft: RULER_SIZE_PX,
          marginTop: -heightPx,
          background: template.page.background,
          backgroundColor: template.page.background ?? '#ffffff',
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
        onPointerMove={handlePaperPointerMove}
        onPointerUp={handlePaperPointerUp}
        onPointerLeave={handlePaperPointerUp}
        onPointerDown={() => controller.setSelection([])}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handlePaletteDrop}
      >
        <div
          className="nop-print-region-body"
          style={{
            position: 'absolute',
            left: mmToPx(contentRect.left) * zoom,
            top: mmToPx(contentRect.top) * zoom,
            width: mmToPx(contentRect.width) * zoom,
            height: mmToPx(contentRect.height) * zoom,
          }}
        />
        {template.page.headerHeight ? (
          <div
            className="nop-print-region-header"
            style={{
              position: 'absolute',
              left: mmToPx(headerRect.left) * zoom,
              top: mmToPx(headerRect.top) * zoom,
              width: mmToPx(headerRect.width) * zoom,
              height: mmToPx(headerRect.height) * zoom,
            }}
          />
        ) : null}
        {template.page.footerHeight ? (
          <div
            className="nop-print-region-footer"
            style={{
              position: 'absolute',
              left: mmToPx(footerRect.left) * zoom,
              top: mmToPx(footerRect.top) * zoom,
              width: mmToPx(footerRect.width) * zoom,
              height: mmToPx(footerRect.height) * zoom,
            }}
          />
        ) : null}
        {template.elements.map((element) => {
          const Renderer = getPrintElementRenderer(element.type);
          const isSelected = selected.has(element.id);
          const elementRegion = getRegionRect(template.page, element.region);
          return (
            <div
              key={element.id}
              className={cn('nop-print-element', isSelected && 'nop-print-element-selected')}
              data-print-type={element.type}
              data-element-id={element.id}
              style={{
                position: 'absolute',
                left: mmToPx(elementRegion.left + element.left) * zoom,
                top: mmToPx(elementRegion.top + element.top) * zoom,
                width: mmToPx(element.width) * zoom,
                height: mmToPx(element.height) * zoom,
                transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
                zIndex: element.zIndex,
                cursor: 'move',
                fontSize: element.style.fontSize ? `${element.style.fontSize}px` : undefined,
                fontFamily: element.style.fontFamily,
                fontWeight: element.style.fontWeight,
                fontStyle: element.style.fontStyle,
                textAlign: element.style.textAlign,
                lineHeight: element.style.lineHeight,
                color: element.style.color,
                backgroundColor: element.style.backgroundColor,
                opacity: element.style.opacity,
              }}
              onPointerDown={(event) => handleElementPointerDown(event, element)}
            >
              <Renderer element={element} />
              {isSelected ? (
                <>
                  {HANDLES.map((handle) => (
                    <span
                      key={handle}
                      data-resize-handle={handle}
                      className="nop-print-element-handle"
                      style={handleStyle(handle, zoom)}
                      onPointerDown={(event) => handleElementPointerDown(event, element, handle)}
                    />
                  ))}
                  <span
                    data-rotate-handle
                    className="nop-print-element-rotate-handle"
                    style={{ position: 'absolute', left: '50%', top: -mmToPx(6) * zoom, width: 8, height: 8 }}
                    onPointerDown={(event) => handleRotatePointerDown(event, element)}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 区域坐标系 clamp（design.md §4：left/top 相对区域原点；Failure Path d-drag-out-of-paper）。 */
function clampFrame(frame: Frame, regionWidth: number, regionHeight: number): Frame {
  const width = Math.min(frame.width, regionWidth);
  const height = Math.min(frame.height, regionHeight);
  return {
    ...frame,
    width,
    height,
    left: Math.max(0, Math.min(frame.left, regionWidth - width)),
    top: Math.max(0, Math.min(frame.top, regionHeight - height)),
  };
}

function buildRulerTicks(pageSizeMax: number): number[] {
  const ticks: number[] = [];
  for (let position = 0; position <= pageSizeMax; position += 10) {
    ticks.push(position);
  }
  return ticks;
}

function handleStyle(handle: ResizeHandle, zoom: number): React.CSSProperties {
  const size = Math.max(6, mmToPx(2) * zoom);
  const offset = -size / 2;
  const positions: Record<ResizeHandle, React.CSSProperties> = {
    nw: { left: offset, top: offset },
    n: { left: '50%', top: offset, transform: 'translateX(-50%)' },
    ne: { right: offset, top: offset },
    e: { right: offset, top: '50%', transform: 'translateY(-50%)' },
    se: { right: offset, bottom: offset },
    s: { left: '50%', bottom: offset, transform: 'translateX(-50%)' },
    sw: { left: offset, bottom: offset },
    w: { left: offset, top: '50%', transform: 'translateY(-50%)' },
  };
  return { position: 'absolute', width: size, height: size, ...positions[handle] };
}
