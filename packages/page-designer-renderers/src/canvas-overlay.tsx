/**
 * 画布覆盖层（S1 §5：选择/hover/DropHint 视觉全部由覆盖层按 token 绘制，
 * 不写进运行时样式）。覆盖层 `pointer-events: none`——事件全部由画布根
 * （bridge wrapper）接管后穿透给运行时；矩形每帧按锚点 `getBoundingClientRect`
 * 重算（相对画布根），滚动/布局位移免监听。
 */

import { useEffect, useMemo, useState } from 'react';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { NODE_ANCHOR_ATTRIBUTE } from './constants.js';
import type { PixelRect } from './canvas-layout.js';
import type { DesignerDropHint } from './types.js';

export interface CanvasOverlayProps {
  /** 画布根元素（矩形坐标系原点 + 锚点查询范围）。 */
  rootRef: React.RefObject<HTMLDivElement | null>;
  selection: readonly SessionNodeId[];
  hoverNodeId: SessionNodeId | null;
  dropHint: DesignerDropHint | null;
  /** false = 预览态：不绘制任何编辑 chrome（S1 §5.2）。 */
  visible: boolean;
}

interface AnchorBox {
  sid: string;
  rect: PixelRect;
}

function readAnchorBoxes(root: Element, sids: readonly string[]): Map<string, PixelRect> {
  const boxes = new Map<string, PixelRect>();
  const origin = root.getBoundingClientRect();
  for (const sid of sids) {
    const element = root.querySelector(`[${NODE_ANCHOR_ATTRIBUTE}="${CSS.escape(sid)}"]`);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    boxes.set(sid, {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
    });
  }
  return boxes;
}

function OverlayBox(props: {
  box: AnchorBox;
  className: string;
  style: React.CSSProperties;
  marker?: string;
  dropHintKind?: string;
}) {
  return (
    <div
      data-page-designer-box={props.marker}
      data-drop-hint={props.dropHintKind}
      className={props.className}
      style={{
        position: 'absolute',
        left: props.box.rect.left,
        top: props.box.rect.top,
        width: props.box.rect.width,
        height: props.box.rect.height,
        pointerEvents: 'none',
        ...props.style,
      }}
    />
  );
}

export function CanvasOverlay(props: CanvasOverlayProps) {
  const { rootRef, selection, hoverNodeId, dropHint, visible } = props;
  // 锚点矩形在 rAF 回调中读取并写入 state（渲染期不触碰 ref；每帧重读，
  // 滚动/布局位移免监听）。
  const [boxes, setBoxes] = useState<Map<string, PixelRect>>(() => new Map());
  const sidsKey = useMemo(() => {
    const sids = [...selection];
    if (hoverNodeId) sids.push(hoverNodeId);
    if (dropHint && dropHint.kind !== 'invalid') sids.push(dropHint.parentId);
    return sids.join('|');
  }, [selection, hoverNodeId, dropHint]);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const sids = sidsKey.length > 0 ? sidsKey.split('|') : [];
    const tick = () => {
      const root = rootRef.current;
      if (root) {
        setBoxes(readAnchorBoxes(root, sids));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, sidsKey, rootRef]);

  if (!visible) {
    return <div data-page-designer-overlay="" style={{ display: 'none' }} />;
  }

  const selectedBoxes: AnchorBox[] = selection
    .map((sid) => (boxes.has(sid) ? { sid, rect: boxes.get(sid)! } : null))
    .filter((box): box is AnchorBox => box !== null);
  const hoverBox =
    hoverNodeId && boxes.has(hoverNodeId) && !selection.includes(hoverNodeId)
      ? { sid: hoverNodeId, rect: boxes.get(hoverNodeId)! }
      : null;
  const dropParentBox =
    dropHint && dropHint.kind !== 'invalid' && boxes.has(dropHint.parentId)
      ? { sid: dropHint.parentId, rect: boxes.get(dropHint.parentId)! }
      : null;

  return (
    <div
      data-page-designer-overlay=""
      data-overlay-selection={selection.length > 0 ? 'true' : undefined}
      data-overlay-hover={hoverNodeId ?? undefined}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}
    >
      {dropHint?.kind === 'invalid' ? (
        <div
          data-drop-hint="invalid"
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px dashed var(--nop-destructive, #ef4444)',
            background: 'color-mix(in srgb, var(--nop-destructive, #ef4444) 8%, transparent)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {dropParentBox && dropHint && dropHint.kind === 'inside' ? (
        <OverlayBox
          box={dropParentBox}
          marker={dropHint.kind}
          dropHintKind="inside"
          className=""
          style={{
            border: '2px dashed var(--nop-accent, #6366f1)',
            background: 'color-mix(in srgb, var(--nop-accent, #6366f1) 8%, transparent)',
          }}
        />
      ) : null}
      {dropParentBox && dropHint && (dropHint.kind === 'before' || dropHint.kind === 'after') ? (
        <div
          data-drop-hint={dropHint.kind}
          style={{
            position: 'absolute',
            left: dropParentBox.rect.left,
            top:
              dropHint.kind === 'before'
                ? dropParentBox.rect.top - 2
                : dropParentBox.rect.top + dropParentBox.rect.height - 2,
            width: Math.max(dropParentBox.rect.width, 24),
            height: 4,
            background: 'var(--nop-accent, #6366f1)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {hoverBox ? (
        <OverlayBox
          box={hoverBox}
          marker="hover"
          className=""
          style={{ outline: '1px dashed color-mix(in srgb, var(--nop-accent, #6366f1) 60%, transparent)' }}
        />
      ) : null}
      {selectedBoxes.map((box) => (
        <OverlayBox
          key={box.sid}
          box={box}
          marker="selection"
          className=""
          style={{ outline: '2px solid var(--nop-accent, #6366f1)' }}
        />
      ))}
    </div>
  );
}
