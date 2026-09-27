/**
 * 画布桥（S1 §5.1 `PageCanvasBridgeProps` 的实现）。
 *
 * 职责切分（S1 §5）：canvas 层只做「手势 → 回调翻译」与 dropHint 几何计算，
 * 不产生任何文档变更；真渲染由 flux-react SchemaRenderer 承载（设计器自持
 * registry + 编辑装配插件，S1 §5.2）；锚点经 DOM data 属性投影
 * （`[data-testid^="psid-"]` → `data-psid`，设计器只读 DOM 投影 + 命令通道）。
 */

import { useMemo, useRef } from 'react';
import { useEffect } from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererPlugin } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { findNodeById, stripSessionIds } from '@nop-chaos/page-designer-core';
import {
  ANCHOR_TESTID_PREFIX,
  NODE_ANCHOR_ATTRIBUTE,
  PAGE_DESIGNER_CANVAS_CLASS,
  PAGE_DESIGNER_DRAG_MIME,
} from './constants.js';
import {
  buildCanvasLayoutModel,
  buildRootDropHint,
  computeDropHintAt,
  hitTestLayout,
  type AnchorLookup,
  type CanvasLayoutModel,
} from './canvas-layout.js';
import { createEditAssemblyPlugin } from './edit-assembly.js';
import { CanvasOverlay } from './canvas-overlay.js';
import type { PageCanvasBridgeProps } from './types.js';

/** 锚点投影：`[data-testid^="psid-"]` → `data-psid`（编辑装配层专属；失效锚点清扫，预览态收敛为零）。 */
export function syncAnchorAttributes(root: Element): number {
  let stamped = 0;
  for (const element of root.querySelectorAll(`[data-testid^="${ANCHOR_TESTID_PREFIX}"]`)) {
    const testid = element.getAttribute('data-testid');
    if (!testid?.startsWith(ANCHOR_TESTID_PREFIX)) continue;
    if (element.getAttribute(NODE_ANCHOR_ATTRIBUTE) !== testid) {
      element.setAttribute(NODE_ANCHOR_ATTRIBUTE, testid);
    }
    stamped += 1;
  }
  for (const element of root.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)) {
    const testid = element.getAttribute('data-testid');
    if (!testid?.startsWith(ANCHOR_TESTID_PREFIX)) {
      element.removeAttribute(NODE_ANCHOR_ATTRIBUTE);
    }
  }
  return stamped;
}

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();
const EDIT_ASSEMBLY_PLUGIN = createEditAssemblyPlugin();

function useAnchorProjection(
  rootRef: React.RefObject<HTMLDivElement | null>,
  projectionKey: string,
): void {
  useEffect(() => {
    const root = rootRef.current;
    /* v8 ignore next -- effect 仅在挂载后运行（root 已就绪） */
    if (!root) return;
    syncAnchorAttributes(root);
    const observer = new MutationObserver(() => {
      observer.takeRecords();
      syncAnchorAttributes(root);
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-testid'] });
    return () => observer.disconnect();
  }, [projectionKey, rootRef]);
}

function readPointerAnchor(
  root: HTMLDivElement,
  x: number,
  y: number,
  model: CanvasLayoutModel,
  anchorOf: AnchorLookup,
): SessionNodeId | null {
  const stack =
    typeof document !== 'undefined' && typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(x, y)
      : [];
  for (const element of stack) {
    if (!root.contains(element)) continue;
    let current: Element | null = element;
    while (current && current !== root.parentElement) {
      const sid = current.getAttribute(NODE_ANCHOR_ATTRIBUTE);
      if (sid) return sid;
      current = current.parentElement;
    }
  }
  // elementsFromPoint 不可用（happy-dom）时的矩形回退。
  const hit = hitTestLayout(model, x, y);
    /* v8 ignore next -- hit 存在但锚点元素缺失：矩形模型与 DOM 短暂不一致的防御分支 */
  return hit && anchorOf(hit.sid) ? hit.sid : null;
}

export function PageDesignerCanvas(props: PageCanvasBridgeProps) {
  const {
    document: doc,
    registry,
    env,
    mode,
    selection,
    hoverNodeId,
    dropHint,
    onNodePointerDown,
    onNodeHover,
    onPaneClick,
    onDragOver,
    onDragLeave,
    onDrop,
  } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);

  const plugins = useMemo<RendererPlugin[]>(() => (mode === 'edit' ? [EDIT_ASSEMBLY_PLUGIN] : []), [mode]);

  const canvasDocument = useMemo(
    () => (mode === 'edit' ? doc : stripSessionIds(doc)),
    [doc, mode],
  );

  useAnchorProjection(rootRef, mode);

  const buildGeometry = () => {
    const root = rootRef.current;
    /* v8 ignore next -- 手势处理器仅在画布挂载后被调用 */
    if (!root) return null;
    const anchorOfLocal: AnchorLookup = (sid) =>
      root.querySelector(`[${NODE_ANCHOR_ATTRIBUTE}="${CSS.escape(sid)}"]`);
    const model = buildCanvasLayoutModel(doc, registry, {
      anchorOf: anchorOfLocal,
      resolveRect: (element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      },
    });
    return { model, anchorOf: anchorOfLocal };
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (mode !== 'edit') return;
    const root = rootRef.current;
    /* v8 ignore next -- handleDrop 的 buildGeometry 非空守卫（挂载后必非空） */
    if (!root) return;
    const geometry = buildGeometry();
    /* v8 ignore next */ if (!geometry) return;
    const sid = readPointerAnchor(root, event.clientX, event.clientY, geometry.model, geometry.anchorOf);
    if (sid) {
      onNodePointerDown(sid, event);
    } else {
      onPaneClick();
    }
  };

  const hoverFrameRef = useRef(0);
  const handlePointerMove = (event: React.PointerEvent) => {
    if (mode !== 'edit') return;
    const now = Date.now();
    if (now - hoverFrameRef.current < 50) return;
    hoverFrameRef.current = now;
    const root = rootRef.current;
    if (!root) return;
    const geometry = buildGeometry();
    /* v8 ignore next */ if (!geometry) return;
    const sid = readPointerAnchor(root, event.clientX, event.clientY, geometry.model, geometry.anchorOf);
    if (sid !== hoverNodeId) {
      onNodeHover(sid, event);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (mode !== 'edit') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const geometry = buildGeometry();
    /* v8 ignore next */ if (!geometry) return;
    const hint =
      computeDropHintAt({ model: geometry.model, registry, findNode: (sid) => findNodeById(doc, sid, registry) ?? null },
    /* v8 ignore next -- drop hint 最终回退：根容器恒为合法 region（防御分支） */
        event.clientX, event.clientY) ?? buildRootDropHint(doc, registry) ?? { kind: 'invalid' as const };
    onDragOver(hint);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (mode !== 'edit') return;
    event.preventDefault();
    const geometry = buildGeometry();
    /* v8 ignore next */ if (!geometry) return;
    const hint =
      computeDropHintAt({ model: geometry.model, registry, findNode: (sid) => findNodeById(doc, sid, registry) ?? null },
    /* v8 ignore next -- drop hint 最终回退：根容器恒为合法 region（防御分支） */
        event.clientX, event.clientY) ?? buildRootDropHint(doc, registry) ?? { kind: 'invalid' as const };
    let payload: Parameters<typeof onDrop>[0] = { source: 'palette', type: '' };
    const raw = event.dataTransfer.getData(PAGE_DESIGNER_DRAG_MIME);
    if (raw) {
      try {
        payload = JSON.parse(raw) as Parameters<typeof onDrop>[0];
      } catch {
        payload = { source: 'palette', type: '' };
      }
    }
    onDrop(payload, hint);
  };

  return (
    <div
      ref={rootRef}
      className={`${PAGE_DESIGNER_CANVAS_CLASS} relative flex-1 overflow-auto`}
      data-testid="page-designer-canvas"
      data-drop-active={dropHint ? dropHint.kind : undefined}
      data-mode={mode}
      role="presentation"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDragOver={handleDragOver}
      onDragLeave={mode === 'edit' ? onDragLeave : undefined}
      onDrop={handleDrop}
    >
      <SchemaRenderer
        key={mode}
        schema={canvasDocument}
        env={env}
        registry={registry}
        plugins={plugins}
        formulaCompiler={formulaCompiler}
        schemaUrl={`nop-page-designer://${mode}`}
      />
      <CanvasOverlay
        rootRef={rootRef}
        selection={selection}
        hoverNodeId={hoverNodeId}
        dropHint={dropHint}
        visible={mode === 'edit'}
      />
    </div>
  );
}
