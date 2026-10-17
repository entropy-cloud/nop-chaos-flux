import type {
  RegisteredRendererDefinition,
  SchemaFieldRule,
  BaseSchema,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';

export { createCompileService, type CompileFetcherAdapterOptions } from './compile-service.js';

/** xlang-debug-editor schema（plan 621 M4：被消费 prop 均需 field rule）。 */
export interface XlangDebugEditorSchema extends BaseSchema {
  type: 'xlang-debug-editor';
  /** 调试文档锚点（gutter/sync/诊断编译共用）。 */
  sourcePath: string;
  /** WS 网关地址（/ws/xlang-debugger）。 */
  serverUrl?: string;
  /** 初始源码。 */
  initialSource?: string;
}

/**
 * 注册面组件 = 懒边界（plan 2474 Phase 1，three-canvas 先例）：definition/field
 * rules 同步、实现（xlang-debug-editor.js 携 CE/lezer 重图）动态 chunk 按需加载。
 * 本模块属 **轻路径**（@nop-chaos/flux-xlang-debug/definitions 注册面，bundle 门面
 * 唯一 import 点）——不得静态 import 重模块，lazy-loading-guard.test.ts 守卫。
 */
const LazyXlangDebugEditorRenderer = createLazyRendererComponent<XlangDebugEditorSchema>(
  () => import('./xlang-debug-editor.js').then((m) => m.XlangDebugEditorRenderer),
);

export const xlangDebugEditorFieldRules: SchemaFieldRule[] = [
  {
    key: 'sourcePath',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Source Path',
      description: 'Debug document anchor shared by gutter/sync/diagnostics.',
      // plan 621 审计 B7：缺省 '' 会让下行三族按 sourcePath 过滤全空（静默无装饰）
      required: true,
    },
  },
  {
    key: 'serverUrl',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Server URL',
      description: 'WS gateway address (/ws/xlang-debugger).',
      required: true,
    },
  },
  {
    key: 'initialSource',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Initial Source',
      description: 'Initial xlang source text.',
      editorType: 'textarea',
    },
  },
];

export const xlangDebugEditorRendererDefinition: RegisteredRendererDefinition = {
  type: 'xlang-debug-editor',
  component: LazyXlangDebugEditorRenderer,
  sourcePackage: '@nop-chaos/flux-xlang-debug',
  fields: xlangDebugEditorFieldRules,
};


/** 注册进 flux renderer registry（照 registerCodeEditorRenderers 先例）。 */
export function registerXlangDebugEditorRenderers(registry: RendererRegistry): void {
  registry.register(xlangDebugEditorRendererDefinition);
}
