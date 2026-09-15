import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { ThreeCanvasRenderer } from './renderer/three-canvas.js';

export const threeCanvasRendererDefinition: RendererDefinition = {
  type: 'three-canvas',
  component: ThreeCanvasRenderer,
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
    animations: {
      shape: { kind: 'unknown' },
      displayName: 'Animations',
      description: 'AnimationConfig[] keyframe animations (consumed from I2.2).',
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
  },
  fields: [
    { key: 'scene', kind: 'prop' },
    { key: 'bindings', kind: 'prop' },
    { key: 'animations', kind: 'prop' },
    { key: 'events', kind: 'prop' },
    { key: 'loading', kind: 'region', regionKey: 'loading' },
    { key: 'empty', kind: 'region', regionKey: 'empty' },
  ],
};

export function registerThreeRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, [threeCanvasRendererDefinition]);
}
