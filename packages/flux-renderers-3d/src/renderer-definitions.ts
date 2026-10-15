import { registerRendererDefinitions, type RegisteredRendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { ThreeCanvasSchema } from './schemas.js';

// 统一延迟加载机制（flux-react createLazyRendererComponent）：three.js 全量留在
// three-canvas 异步 chunk（renderer-definitions 是宿主注册路径，禁止静态触达 three）。
const LazyThreeCanvasRenderer = createLazyRendererComponent<ThreeCanvasSchema>(
  () => import('./renderer/three-canvas.js').then((m) => m.ThreeCanvasRenderer),
);

export const threeCanvasRendererDefinition: RegisteredRendererDefinition = {
  type: 'three-canvas',
  component: LazyThreeCanvasRenderer,
  propContracts: {
    scene: {
      shape: { kind: 'unknown' },
      displayName: 'Scene Config',
      description:
        'Three.js scene config (camera/lights/environment/models). See docs/components/threejs-integration/design-renderer.md §1. Source-enabled.',
      editorType: 'code',
    },
    bindings: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            // 字面量保留位（plan 469 Fix）：表达式字符串（${expr}/convert）必须原样到达绑定桥
            // （design-data-binding.md §1，求值入口在 useBindingBridge，不在 props 编译层）。
            // 编译器包 preserve-literal 信封，渲染器经 binding-literals.ts 解包。
            source: { kind: 'literal', sourceKey: 'expression' },
            condition: { kind: 'literal', sourceKey: 'expression' },
            transform: { kind: 'literal', sourceKey: 'convert' },
          },
        },
      },
      displayName: 'Data Bindings',
      description:
        'DataBinding[]: scope expression → model property with optional transform/condition (I2.2). See design-data-binding.md §1.',
      editorType: 'code',
    },
    events: {
      // events 对象整体 prop（design.md D3）：classifyField 仅顶层 key 精确匹配、无点号路径，
      // 子键无法注册为 event 字段（industrial renderer-definitions.ts:37-38 先例）。
      // 渲染器内经 createNormalizedActionEvent + helpers.dispatch 桥接。
      shape: { kind: 'unknown' },
      displayName: 'Events',
      description:
        'Schema-level event hooks (onObjectClick/onObjectHover/onReady/onError). Dispatched via createNormalizedActionEvent + helpers.dispatch.',
      editorType: 'code',
    },
    height: {
      shape: { kind: 'string' },
      displayName: 'Height',
      description:
        "Container height (CSS value, plan 473 V3-F4). Default '400px'. Pure container styling — not scene semantics.",
      editorType: 'text',
      defaultValue: '400px',
    },
  },
  fields: [
    { key: 'scene', kind: 'prop' },
    { key: 'bindings', kind: 'prop' },
    { key: 'events', kind: 'prop' },
    { key: 'height', kind: 'prop' },
    { key: 'loading', kind: 'region', regionKey: 'loading' },
    { key: 'empty', kind: 'region', regionKey: 'empty' },
  ],
};

export function registerThreeRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, [threeCanvasRendererDefinition]);
}
