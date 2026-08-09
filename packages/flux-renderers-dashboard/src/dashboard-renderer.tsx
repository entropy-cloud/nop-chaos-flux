import React from 'react';
import type { BaseSchema, RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { useRendererRuntime } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { DashboardLayoutSchema, DashboardPanelSchema } from './schemas.js';
import {
  panelToPixels,
  resolveCanvasHeight,
  sanitizePanels,
  type PanelPixelRect,
} from './layout-math.js';

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

interface LayoutProps {
  cols: number;
  rowHeight: number;
  gap: number;
  height?: number;
}

function resolveLayoutProps(schemaProps: {
  cols?: unknown;
  rowHeight?: unknown;
  gap?: unknown;
  height?: unknown;
}): LayoutProps {
  return {
    cols: typeof schemaProps.cols === 'number' && schemaProps.cols > 0 ? Math.floor(schemaProps.cols) : 12,
    rowHeight:
      typeof schemaProps.rowHeight === 'number' && schemaProps.rowHeight > 0
        ? schemaProps.rowHeight
        : 40,
    gap: typeof schemaProps.gap === 'number' && schemaProps.gap >= 0 ? schemaProps.gap : 8,
    height: typeof schemaProps.height === 'number' && schemaProps.height > 0 ? schemaProps.height : undefined,
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

function buildPanelFragment(panel: DashboardPanelSchema): BaseSchema {
  return {
    type: panel.type,
    ...(panel.props !== undefined && panel.props !== null && typeof panel.props === 'object'
      ? (panel.props as object)
      : {}),
    ...(panel.source !== undefined ? { data: panel.source, source: panel.source } : {}),
  } as unknown as BaseSchema;
}

/**
 * dashboard 运行态 renderer（design: docs/components/dashboard-editor/design.md）。
 *
 * 布局 JSON → 网格渲染：面板经 `panelToPixels` 绝对定位（编辑态坐标模型单一来源，
 * 编辑/运行同构零转换）。面板内容经 `helpers.render` 以 fragment 编译求值（props/source
 * 表达式在渲染时解析）；未注册面板类型忽略 + dev warn（失败路径 dashboard-layout-invalid）。
 */
export function DashboardRenderer(props: RendererComponentProps<DashboardLayoutSchema>) {
  const schemaProps = props.props;
  const { helpers, regions } = props;
  const runtime = useRendererRuntime();
  const layout = resolveLayoutProps(schemaProps);

  const rawPanels = Array.isArray(schemaProps.panels) ? (schemaProps.panels as unknown) : undefined;
  const panels = sanitizePanels(rawPanels, { cols: layout.cols });
  const canvasWidth = 1200;

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
        {emptyContent}
      </div>
    );
  }

  const renderPanelContent = (panel: DashboardPanelSchema): React.ReactNode => {
    if (!runtime.registry.has(panel.type)) {
      console.warn(`[dashboard] panel "${panel.id}" type "${panel.type}" is not registered, skipped`);
      return null;
    }
    return asReactNode(
      helpers.render(buildPanelFragment(panel), { pathSuffix: `panel.${panel.id}` }),
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
