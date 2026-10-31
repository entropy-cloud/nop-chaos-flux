import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';

export { industrialRendererDefinitions } from './renderer-definitions.js';

/**
 * jsdom/node-safe registration subpath（`@nop-chaos/flux-renderers-industrial/runtime`，
 * plan 809 M1 设立）：与包入口 `. ` 同一键面，但不静态触达 leafer-ui——入口 `. ` 还
 * re-export `registerScadaSymbols`/`builtinScadaSymbolDefinitions`（register-builtin →
 * symbols 静态链）与 serialization 契约面，其中图元定义模块在 happy-dom/jsdom 下
 * module-load 即触发 `CanvasRenderingContext2D` 访问。宿主（playground complex-pages
 * render-host 先例）在共享单元测试环境注册 scada-canvas 时走本子路径；浏览器宿主两者等价。
 *
 * `registerScadaRenderers` 与入口 `. ` 的同名导出为同一实现（单一来源 re-export）；
 * renderer 组件仍经 `scada-canvas-lazy.ts` 统一延迟装载，图元随异步 chunk 自注册。
 */
export function registerScadaRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialRendererDefinitions);
}
