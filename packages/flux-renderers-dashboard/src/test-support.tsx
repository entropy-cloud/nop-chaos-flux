import type { ActionContext, RendererComponentProps, RegisteredRendererDefinition, RendererEnv, RendererEventHandler } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv, createSchemaRenderer } from '@nop-chaos/flux-react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import React from 'react';
import type { DashboardEditorSchema } from './editor/dashboard-editor-renderer.js';
import type { DashboardLayoutSchema } from './schemas.js';
import { dashboardRendererDefinition } from './dashboard-definitions.js';
import { dashboardEditorRendererDefinition } from './editor/dashboard-editor-definitions.js';

// Plan 594 (CX-15): hand-written env stub → shared createDefaultEnv.
const env: RendererEnv = createDefaultEnv();

export const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const textRenderer: RegisteredRendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

/** 面板内容 stub：透出 type + data/source + 自定义 prop（断言面板 fragment 装配）。 */
export const panelContentRenderer: RegisteredRendererDefinition = {
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
function contentStub(type: string, testId: string): RegisteredRendererDefinition {
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
// WA-dashboard-002 (plan 568): test definitions derive from the production
// tables ({...base}) so a new production field can no longer be silently
// missing from the test surface (the fields table was copied verbatim twice).
const dashboardEditorDefinitionForTest: RegisteredRendererDefinition = {
  ...dashboardEditorRendererDefinition,
  component: DashboardEditorRendererForTest,
};

export function createDashboardSchemaRenderer(
  extra: RegisteredRendererDefinition[] = [],
  editorDefinition: RegisteredRendererDefinition = dashboardEditorDefinitionForTest,
) {
  // 加载默认 locale（en-US），使 dashboard i18n 键在测试中断言真实文案。
  // WA-dashboard-002 (plan 568): the init used to run at module-evaluation
  // time (WA-content-009 pattern) — a singleton write on import freezes the
  // language for any test file imported later. Explicit init inside the
  // factory keeps first-initializer-wins semantics without the import-order
  // side effect.
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    panelContentRenderer,
    chartStubRenderer,
    tableStubRenderer,
    htmlStubRenderer,
    ...extra,
    {
      ...dashboardRendererDefinition,
      component: DashboardRendererForTest,
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
): RegisteredRendererDefinition {
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
    ...dashboardEditorRendererDefinition,
    component: SpiedEditor,
  };
}

export type { DashboardLayoutSchema };
