/**
 * 画布覆盖层（S1 §5：选择/hover/DropHint 视觉全部由覆盖层按 token 绘制，
 * 不写进运行时样式）。覆盖层 `pointer-events: none`——事件全部由画布根
 * （bridge wrapper）接管后穿透给运行时；矩形每帧按锚点 `getBoundingClientRect`
 * 重算（相对画布根），滚动/布局位移免监听。
 *
 * ux-r5：空容器占位框（`emptyContainers`，0 尺寸时合成最小盒）与根回退提示
 * （`viaRootFallback` 的 inside hint → 底部插入线 + 标签，替代整页描边）。
 */

import { useEffect, useMemo, useState } from 'react';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { NODE_ANCHOR_ATTRIBUTE } from './constants.js';
import type { PixelRect } from './canvas-layout.js';
import type { DesignerDropHint } from './types.js';
import type { EmptyContainerInfo } from './empty-container-projection.js';

export interface CanvasOverlayProps {
  /** 画布根元素（矩形坐标系原点 + 锚点查询范围）。 */
  rootRef: React.RefObject<HTMLDivElement | null>;
  selection: readonly SessionNodeId[];
  hoverNodeId: SessionNodeId | null;
  dropHint: DesignerDropHint | null;
  /** 编辑态空容器清单（ux-r5）：渲染虚线占位框 + 类型标签。 */
  emptyContainers?: readonly EmptyContainerInfo[];
  /** false = 预览态：不绘制任何编辑 chrome（S1 §5.2）。 */
  visible: boolean;
}

interface AnchorBox {
  sid: string;
  /** frame 身份锚：目标元素 `data-cid` 优先，缺省回退 sid。 */
  anchor: string;
  rect: PixelRect;
}

type AnchoredRect = PixelRect & { anchor: string };

interface PlaceholderBox {
  sid: string;
  label: string;
  rect: PixelRect;
}

/** 合成最小可视盒：0 尺寸锚点（jsdom/未布局）也给占位框一个可读形状。 */
const PLACEHOLDER_MIN_WIDTH = 160;
const PLACEHOLDER_MIN_HEIGHT = 44;

function readAnchorBoxes(root: Element, sids: readonly string[]): Map<string, AnchoredRect> {
  const boxes = new Map<string, AnchoredRect>();
  const origin = root.getBoundingClientRect();
  for (const sid of sids) {
    const element = root.querySelector(`[${NODE_ANCHOR_ATTRIBUTE}="${CSS.escape(sid)}"]`);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    boxes.set(sid, {
      anchor: element.getAttribute('data-cid') || sid,
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
    });
  }
  return boxes;
}

function readPlaceholderBoxes(
  root: Element,
  emptyContainers: readonly EmptyContainerInfo[],
): PlaceholderBox[] {
  const origin = root.getBoundingClientRect();
  const boxes: PlaceholderBox[] = [];
  for (const info of emptyContainers) {
    const element = root.querySelector(
      `[${NODE_ANCHOR_ATTRIBUTE}="${CSS.escape(info.sid)}"]`,
    );
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const width = Math.max(rect.width, PLACEHOLDER_MIN_WIDTH);
    const height = Math.max(rect.height, PLACEHOLDER_MIN_HEIGHT);
    boxes.push({
      sid: info.sid,
      label: element.getAttribute('data-pd-empty-label') ?? info.type,
      rect: {
        left: rect.left - origin.left,
        top: rect.top - origin.top,
        width,
        height,
      },
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
  /** 选中 frame 专属：`nop-frame-${anchor}` 身份（契约 Design-Time Frame Protocol）。 */
  frameFor?: string;
}) {
  return (
    <div
      data-page-designer-box={props.marker}
      data-drop-hint={props.dropHintKind}
      data-frame-for={props.frameFor}
      id={props.frameFor ? `nop-frame-${props.frameFor}` : undefined}
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
  const { rootRef, selection, hoverNodeId, dropHint, emptyContainers, visible } = props;
  // 锚点矩形在 rAF 回调中读取并写入 state（渲染期不触碰 ref；每帧重读，
  // 滚动/布局位移免监听）。
  const [boxes, setBoxes] = useState<Map<string, AnchoredRect>>(() => new Map());
  const [placeholderBoxes, setPlaceholderBoxes] = useState<PlaceholderBox[]>([]);
  const sidsKey = useMemo(() => {
    const sids = [...selection];
    if (hoverNodeId) sids.push(hoverNodeId);
    if (dropHint && dropHint.kind !== 'invalid') sids.push(dropHint.parentId);
    return sids.join('|');
  }, [selection, hoverNodeId, dropHint]);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      const root = rootRef.current;
      if (root) {
        const sids = sidsKey.length > 0 ? sidsKey.split('|') : [];
        setBoxes(readAnchorBoxes(root, sids));
        setPlaceholderBoxes(readPlaceholderBoxes(root, emptyContainers ?? []));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, sidsKey, emptyContainers, rootRef]);

  if (!visible) {
    return <div data-page-designer-overlay="" style={{ display: 'none' }} />;
  }

  const selectedBoxes: AnchorBox[] = selection
    .map((sid): AnchorBox | null =>
      boxes.has(sid) ? { sid, anchor: boxes.get(sid)!.anchor, rect: boxes.get(sid)! } : null,
    )
    .filter((box): box is AnchorBox => box !== null);
  const hoverBox =
    hoverNodeId && boxes.has(hoverNodeId) && !selection.includes(hoverNodeId)
      ? { sid: hoverNodeId, anchor: boxes.get(hoverNodeId)!.anchor, rect: boxes.get(hoverNodeId)! }
      : null;
  const dropParentBox =
    dropHint && dropHint.kind !== 'invalid' && boxes.has(dropHint.parentId)
      ? {
          sid: dropHint.parentId,
          anchor: boxes.get(dropHint.parentId)!.anchor,
          rect: boxes.get(dropHint.parentId)!,
        }
      : null;

  return (
    <div
      data-page-designer-overlay=""
      data-overlay-selection={selection.length > 0 ? 'true' : undefined}
      data-overlay-hover={hoverNodeId ?? undefined}
      data-overlay-placeholders={placeholderBoxes.length > 0 ? String(placeholderBoxes.length) : undefined}
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
      {placeholderBoxes.map((box) => (
        <div
          key={box.sid}
          data-page-designer-box="placeholder"
          data-placeholder-for={box.sid}
          style={{
            position: 'absolute',
            left: box.rect.left,
            top: box.rect.top,
            width: box.rect.width,
            height: box.rect.height,
            border: '1.5px dashed color-mix(in srgb, var(--nop-accent, #6366f1) 55%, transparent)',
            borderRadius: 6,
            background: 'color-mix(in srgb, var(--nop-accent, #6366f1) 4%, transparent)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 6,
              top: 4,
              fontSize: 10,
              lineHeight: '14px',
              padding: '0 6px',
              borderRadius: 999,
              color: 'var(--nop-text-strong, #1f2937)',
              background: 'color-mix(in srgb, var(--nop-accent, #6366f1) 14%, var(--nop-surface, #fff))',
              border: '1px solid color-mix(in srgb, var(--nop-accent, #6366f1) 30%, transparent)',
            }}
          >
            {box.label} · {t('flux.pageDesigner.emptyContainerHint')}
          </span>
        </div>
      ))}
      {dropParentBox && dropHint && dropHint.kind === 'inside' && dropHint.viaRootFallback ? (
        <div
          data-drop-hint="root-fallback"
          style={{
            position: 'absolute',
            left: dropParentBox.rect.left,
            top: dropParentBox.rect.top + dropParentBox.rect.height - 4,
            width: Math.max(dropParentBox.rect.width, 24),
            height: 4,
            background: 'var(--nop-accent, #6366f1)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: -22,
              fontSize: 11,
              lineHeight: '18px',
              padding: '0 8px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              color: '#fff',
              background: 'var(--nop-accent, #6366f1)',
            }}
          >
            {t('flux.pageDesigner.rootFallbackHint')}
          </span>
        </div>
      ) : null}
      {dropParentBox && dropHint && dropHint.kind === 'inside' && !dropHint.viaRootFallback ? (
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
          frameFor={box.anchor}
          className=""
          style={{ outline: '2px solid var(--nop-accent, #6366f1)' }}
        />
      ))}
    </div>
  );
}
