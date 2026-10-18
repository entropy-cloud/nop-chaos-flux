import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { asReactNode,  useRendererRuntime } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { DashboardLayoutSchema, DashboardPanelSchema } from './schemas.js';
import {
  buildDashboardPanelFragment,
  panelToPixels,
  resolveCanvasHeight,
  resolveCols,
  resolveGapPx,
  resolveRowHeight,
  sanitizePanels,
  type PanelPixelRect,
} from './layout-math.js';
import { useCanvasWidth } from './use-canvas-width.js';

interface LayoutProps {
  cols: number;
  rowHeight: number;
  gap: number;
  height?: number;
}

// WA-dashboard-001 (plan 568): defaults resolve through the layout-math
// shared face (the editor side already consumed it; this hand-rolled copy
// kept 12/40/8 as a second source of truth). `height` has no shared resolver
// — it is renderer-local presentation state.
function resolveLayoutProps(schemaProps: {
  cols?: unknown;
  rowHeight?: unknown;
  gap?: unknown;
  height?: unknown;
}): LayoutProps {
  const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  const height = num(schemaProps.height);
  return {
    cols: resolveCols(num(schemaProps.cols)),
    rowHeight: resolveRowHeight(num(schemaProps.rowHeight)),
    gap: resolveGapPx(num(schemaProps.gap)),
    height: height !== undefined && height > 0 ? height : undefined,
  };
}

function panelChrome(panel: DashboardPanelSchema): React.ReactNode {
  if (panel.title === undefined || panel.title === '') {
    return null;
  }
  return (
    <div
      data-slot="dashboard-panel-title"
      className="border-b border-border px-3 py-1.5 text-sm font-medium text-foreground"
    >
      {panel.title}
    </div>
  );
}

/**
 * dashboard 运行态 renderer（design: docs/components/dashboard-editor/design.md）。
 *
 * 布局 JSON → 网格渲染：面板经 `panelToPixels` 绝对定位（编辑态坐标模型单一来源，
 * 编辑/运行同构零转换）；画布宽度经共享测量 hook 实测容器宽（回退 1200 兜底
 * jsdom/SSR/首帧），与编辑态同一测量模式。面板内容经 `helpers.render` 以 fragment
 * 编译求值（props/source 表达式在渲染时解析）；未注册面板类型忽略 + dev warn
 * （失败路径 dashboard-layout-invalid）。
 */
export function DashboardRenderer(props: RendererComponentProps<DashboardLayoutSchema>) {
  const schemaProps = props.props;
  const { helpers, regions } = props;
  const runtime = useRendererRuntime();
  const layout = resolveLayoutProps(schemaProps);
  const { canvasRef, canvasWidth } = useCanvasWidth();

  const rawPanels = Array.isArray(schemaProps.panels) ? (schemaProps.panels as unknown) : undefined;
  const panels = sanitizePanels(rawPanels, { cols: layout.cols });

  if (panels.length === 0) {
    const emptyContent = regions.empty ? asReactNode(regions.empty.render()) : null;
    return (
      <div
        className={cn('nop-dashboard', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="dashboard-root"
        data-empty=""
      >
        {emptyContent ?? (
          <div
            data-slot="dashboard-empty"
            className="flex min-h-[120px] h-full items-center justify-center text-sm text-muted-foreground"
          >
            {t('flux.dashboard.empty')}
          </div>
        )}
      </div>
    );
  }

  const renderPanelContent = (panel: DashboardPanelSchema): React.ReactNode => {
    if (!runtime.registry.has(panel.type)) {
      console.warn(`[dashboard] panel "${panel.id}" type "${panel.type}" is not registered, skipped`);
      return null;
    }
    return asReactNode(
      helpers.render(buildDashboardPanelFragment(panel), { pathSuffix: `panel.${panel.id}` }),
    );
  };

  const height = resolveCanvasHeight(panels, { ...layout, height: layout.height });

  return (
    <div
      className={cn('nop-dashboard', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="dashboard-root"
      data-panel-count={panels.length}
    >
      <div
        ref={canvasRef}
        data-slot="dashboard-canvas"
        className="relative"
        style={{ width: '100%', minWidth: 320, height: Math.max(height, 120) }}
      >
        {panels.map((panel) => {
          const rect = panelToPixels(panel, {
            cols: layout.cols,
            rowHeight: layout.rowHeight,
            gap: layout.gap,
            canvasWidth,
          });
          return (
            <DashboardPanelView
              key={panel.id}
              panel={panel}
              rect={rect}
              renderPanelContent={renderPanelContent}
            />
          );
        })}
      </div>
    </div>
  );
}

function DashboardPanelView({
  panel,
  rect,
  renderPanelContent,
}: {
  panel: DashboardPanelSchema;
  rect: PanelPixelRect;
  renderPanelContent: (panel: DashboardPanelSchema) => React.ReactNode;
}) {
  return (
    <div
      data-slot="dashboard-panel"
      data-panel-id={panel.id}
      data-panel-type={panel.type}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      {panelChrome(panel)}
      <div data-slot="dashboard-panel-body" className="min-h-0 flex-1 overflow-hidden p-2">
        {renderPanelContent(panel)}
      </div>
    </div>
  );
}
