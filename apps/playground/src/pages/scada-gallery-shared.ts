import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';

/**
 * scada-gallery 共享基建（559 Phase 3）：暗色工况屏主题 + registry/env 单例 + 控制按钮组 helper。
 * 三场景 schema 构建器（water/power/filling）独立成文件，控制每文件行数。
 */

export const galleryTheme = {
  bg: '#0e1729',
  grid: '#1b2b45',
  titleBar: '#0a1322',
  accent: '#2dd4bf',
  zoneFill: '#152238',
  zoneStroke: '#2a3b58',
  pipe: '#41618c',
  pipeRun: '#3f7b5a',
  busbar: '#ffb300',
  textTitle: '#f1f6fd',
  textZone: '#8098b8',
  textLabel: '#c5d3e8',
  textTip: '#64789a',
  panelFace: '#101820',
  panelStroke: '#37474f',
  textColor: '#eaf1fb',
};

export function galleryZone(id: string, x: number, y: number, width: number, height: number, label: string) {
  return [
    { id, type: 'scada-round-rect', x, y, width, height, fill: galleryTheme.zoneFill, stroke: galleryTheme.zoneStroke, strokeWidth: 1 },
    { id: `${id}-label`, type: 'scada-text', x: x + width / 2, y: y + 8, text: label, textSize: 13, textColor: galleryTheme.textZone, align: 'center' as const },
  ];
}

export function galleryTitle(id: string, text: string) {
  return [
    { id, type: 'scada-round-rect', x: 0, y: 0, width: 960, height: 48, cornerRadius: 0, fill: galleryTheme.titleBar },
    { id: `${id}-accent`, type: 'scada-round-rect', x: 0, y: 45, width: 960, height: 3, cornerRadius: 0, fill: galleryTheme.accent },
    { id: `${id}-text`, type: 'scada-text', x: 480, y: 13, text, textSize: 20, textColor: galleryTheme.textTitle, fontWeight: 'bold', align: 'center' as const },
  ];
}

export function galleryNumeric(id: string, x: number, y: number, width: number, label: string, point: string, format: string, unit: string) {
  return [
    { id: `${id}-label`, type: 'scada-text', x, y, text: label, textSize: 11, textColor: galleryTheme.textLabel },
    {
      id,
      type: 'scada-instrument-numeric',
      x,
      y: y + 16,
      width,
      height: 44,
      stroke: galleryTheme.panelStroke,
      strokeWidth: 2,
      textColor: '#ffd54f',
      custom: { unit },
      bindings: { text: { point, format } },
    },
  ];
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerScadaRenderers(registry);

export const galleryRegistry = registry;
export const GallerySchemaRenderer = createSchemaRenderer();
export const galleryFormulaCompiler = createFormulaCompiler();

export function makeGalleryEnv(): RendererEnv {
  return {
    fetcher: async <T,>(api: ExecutableApiRequest) => {
      console.log('[scada-gallery] ajax', api.method ?? 'GET', api.url);
      return { status: 0, data: { ok: true } as T };
    },
    notify: (level, message) => console.log('[scada-gallery] notify', level, message),
  };
}

export interface GalleryCanvasSpec {
  canvasId: string;
  config: Record<string, unknown>;
}

/** 场景页通用 schema 骨架：控制按钮排 + scada-canvas 画布。 */
export function galleryPageSchema(canvasId: string, controls: unknown[], config: Record<string, unknown>, height = 520) {
  return {
    type: 'page',
    className: 'flex-1 min-h-0 flex flex-col',
    bodyClassName: 'flex-1 min-h-0',
    body: [
      { type: 'flex', direction: 'row', className: 'flex-wrap items-start gap-x-5 gap-y-2', body: controls },
      {
        type: 'scada-canvas',
        id: canvasId,
        width: 960,
        height,
        // 画布 flex-1 填充剩余高度:main 为 h-screen 有界链(scada-demo 同款),
        // 无界 min-h-screen 列里 flex-1 会把画布撑到千px 级致 fit 内容落到折叠线以下。
        className: 'flex-1 min-h-0',
        viewport: { fit: 'contain' },
        config: config as never,
        loading: { type: 'text', text: '场景加载中…' },
        empty: { type: 'text', text: '场景构建失败（config 非法）' },
      },
    ],
  };
}

export function controlGroup(title: string, buttons: unknown[]) {
  return {
    type: 'flex',
    direction: 'column',
    className: 'gap-1',
    body: [
      { type: 'text', tag: 'label', text: title },
      { type: 'flex', direction: 'row', className: 'flex-wrap gap-1.5', body: buttons },
    ],
  };
}

export function setPointButton(label: string, testid: string, canvasId: string, pointId: string, value: number, variant = 'outline') {
  return {
    type: 'button',
    label,
    variant,
    size: 'sm',
    testid,
    onClick: { action: 'component:setPointValue', componentId: canvasId, args: { pointId, value } },
  };
}
