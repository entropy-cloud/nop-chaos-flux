import type {
  ActionContext,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
  RendererEventHandler,
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';

// 加载默认 locale（en-US），使 dashboard i18n 键在测试中断言真实文案。
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
import React from 'react';
import type { DashboardEditorSchema } from './editor/dashboard-editor-renderer.js';
import type { DashboardLayoutSchema } from './schemas.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

/** 面板内容 stub：透出 type + data/source + 自定义 prop（断言面板 fragment 装配）。 */
export const panelContentRenderer: RendererDefinition = {
  type: 'panel-content',
  component: (props) => (
    <div
      data-testid="panel-content"
      data-data={props.props.data !== undefined ? JSON.stringify(props.props.data) : undefined}
      data-source={props.props.source !== undefined ? JSON.stringify(props.props.source) : undefined}
      data-custom={props.props.custom !== undefined ? String(props.props.custom) : undefined}
    >
      {String(props.props.text ?? '')}
    </div>
  ),
};

/** 面板内容 stub 族（chart/table/html/text —— 对齐 palette 默认类型清单，注册后入 palette）。 */
function contentStub(type: string, testId: string): RendererDefinition {
  return {
    type,
    component: (props) => (
      <div
        data-testid={testId}
        data-data={props.props.data !== undefined ? JSON.stringify(props.props.data) : undefined}
        data-sales={props.props.sales !== undefined ? String(props.props.sales) : undefined}
      >
        {String(props.props.text ?? '')}
      </div>
    ),
  };
}

export const chartStubRenderer = contentStub('chart', 'chart-stub');
export const tableStubRenderer = contentStub('table', 'table-stub');
export const htmlStubRenderer = contentStub('html', 'html-stub');
const dashboardEditorDefinitionForTest: RendererDefinition = {
  type: 'dashboard-editor',
  displayName: 'Dashboard Editor',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-dashboard',
  component: DashboardEditorRendererForTest,
  fields: [
    { key: 'layout', kind: 'prop' },
    { key: 'cols', kind: 'prop' },
    { key: 'rowHeight', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'height', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'commitPolicy', kind: 'prop' },
    { key: 'onSave', kind: 'event' },
    { key: 'onError', kind: 'event' },
  ],
};

export function createDashboardSchemaRenderer(
  extra: RendererDefinition[] = [],
  editorDefinition: RendererDefinition = dashboardEditorDefinitionForTest,
) {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    panelContentRenderer,
    chartStubRenderer,
    tableStubRenderer,
    htmlStubRenderer,
    ...extra,
    {
      type: 'dashboard',
      displayName: 'Dashboard',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-dashboard',
      component: DashboardRendererForTest,
      fields: [
        { key: 'panels', kind: 'prop' },
        { key: 'cols', kind: 'prop' },
        { key: 'rowHeight', kind: 'prop' },
        { key: 'gap', kind: 'prop' },
        { key: 'height', kind: 'prop' },
        { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      ],
    },
    editorDefinition,
  ]);
}

import { DashboardRenderer as DashboardRendererForTest } from './dashboard-renderer.js';
import { DashboardEditorRenderer as DashboardEditorRendererForTest } from './editor/dashboard-editor-renderer.js';

export { env };
export const formulaCompiler = createFormulaCompiler();

/**
 * 事件派发 spy 包裹（对齐 scada-editor-canvas-contract.test.tsx 模式）：
 * 编译后的 `props.events.<key>` 是 event handler 函数——spy 包裹 handler，记录
 * (handler, ctx)，可断言 dashboard-editor:save 等 schema 事件经 ctx.event 派发
 * （payload 校验，关 false-green），并透传真实 handler 执行。
 */
export function createSpiedEditorDefinition(
  dispatchSpy: (action: unknown, ctx?: Partial<ActionContext>) => void,
): RendererDefinition {
  function SpiedEditor(props: RendererComponentProps<DashboardEditorSchema>) {
    const spiedEvents = Object.fromEntries(
      Object.entries(props.events).map(([key, handler]) => [
        key,
        (event?: unknown, ctx?: Partial<ActionContext>) => {
          dispatchSpy(handler, { ...(ctx ?? {}), event: event as never });
          if (!handler) return undefined;
          return handler(event as never, ctx);
        },
      ]),
    ) as Readonly<Record<string, RendererEventHandler | undefined>>;
    return <DashboardEditorRendererForTest {...props} events={spiedEvents} />;
  }
  return {
    type: 'dashboard-editor',
    displayName: 'Dashboard Editor',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-dashboard',
    component: SpiedEditor,
    fields: [
      { key: 'layout', kind: 'prop' },
      { key: 'cols', kind: 'prop' },
      { key: 'rowHeight', kind: 'prop' },
      { key: 'gap', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'mode', kind: 'prop' },
      { key: 'commitPolicy', kind: 'prop' },
      { key: 'onSave', kind: 'event' },
      { key: 'onError', kind: 'event' },
    ],
  };
}

export type { DashboardLayoutSchema };
