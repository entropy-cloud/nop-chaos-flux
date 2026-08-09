import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { registerScadaSymbols } from './symbols/register-builtin.js';
import { industrialRendererDefinitions } from './renderer-definitions.js';

/**
 * 包公共面（design-renderer.md §11 授权面）：
 * - 注册入口：`registerScadaRenderers` / `registerScadaSymbols` / 符号注册表 API（`registerScadaSymbol` 等）
 * - 类型：`ScadaCanvasSchema` / `ScadaCanvasEvents` / `ScadaConfig` / `ScadaSymbolNode` / `ScadaPointDeclaration`
 *   / `ScadaSymbolDefinition` / `ScadaSymbolProps`（+ 序列化/绑定 companion 类型）
 *
 * 收敛历史（plan 2026-08-04-1558-1 Phase 2）：原 index.ts 导出 ~93 个符号，其中 ~90 个零外部消费者
 * （engine/binding/symbols 内部实现类）。零消费者内部类不再经包入口泄漏；内部实现保持模块内可达，
 * 测试走 internal path（`../engine/...`、`../binding/...`、`../symbols/...`）。
 */

export type { ScadaCanvasSchema, ScadaCanvasEvents } from './schemas.js';
export type {
  ScadaConfig,
  ScadaSymbolNode,
  ScadaPointDeclaration,
  ScadaConfigDiff,
  ScadaBinding,
  ScadaAnimation,
  ScadaAnimationKind,
  ScadaStateDeclaration,
  ScadaStateDefinition,
  ScadaSymbolEvent,
  ScadaPrimitive,
} from './serialization/config-types.js';
export type {
  ScadaSymbolDefinition,
  ScadaSymbolProps,
  ScadaSymbolStylePatch,
  ScadaFillStyle,
} from './symbols/symbol-types.js';

// 符号注册表 API（design-symbols.md §3：供第三方扩展注册自定义图元）。
export {
  registerScadaSymbol,
  unregisterScadaSymbol,
  hasScadaSymbol,
  getScadaSymbolDefinition,
  listScadaSymbols,
} from './symbols/symbol-registry.js';

// 内置图元注册入口（幂等；registerScadaRenderers 内部亦调用）。
export { registerScadaSymbols, builtinScadaSymbolDefinitions } from './symbols/register-builtin.js';

/**
 * 序列化契约函数（design-renderer.md §4.3 表）：design-contract 函数，运行期经 `exportConfig`/
 * `importConfig` 组件句柄使用；导出供 host 侧工具链（config 迁移/校验/审计）直接调用。
 * 无 live 内部消费者（renderer 经 `engine.exportConfig()` 路径，非此函数），保留导出为契约诚实。
 *
 * plan 2026-08-08-1931-2 Phase 3 / P2-1：serialization 导出 parity——parse/validate/diff 与 serialize 同步导出
 * （与上方 host 校验/审计注释承诺对齐；host 不再需绕 relative path 自建入口校验）。`ScadaValidationResult`
 * 经 `export type` 导出（类型仅）。`parseScadaConfig` 为 fail-closed 纯对象窄化 + 深隔离（Phase 1 / F5）。
 */
export { serializeScadaConfig } from './serialization/serialize.js';
export { parseScadaConfig } from './serialization/parse.js';
export { validateScadaConfig } from './serialization/validate.js';
export type { ScadaValidationResult } from './serialization/validate.js';
export { diffScadaConfig } from './serialization/diff.js';

/**
 * 内置 renderer 定义数组（design-renderer.md §11）。plan 2026-08-08-1931-2 Phase 3 / P2-3：与所有兄弟
 * `flux-renderers-*` 包注册模式对齐——导出 definitions 数组，供 host 自定义注册（选择性注册 / 自建 registry
 * / 顺序控制）。`registerScadaRenderers` 仍是一键全注册便捷入口。
 */
export { industrialRendererDefinitions } from './renderer-definitions.js';

/**
 * `scada-canvas` renderer 注册入口（design-renderer.md §11）。
 *
 * 注册内置 SCADA 图元（`registerScadaSymbols()`，幂等）+ 注册 `scada-canvas` renderer 定义。
 * 调用方仅需 `registerScadaRenderers(registry)` 即完成全部注册——不再依赖模块加载副作用
 * （plan 2026-08-04-1558-1 Phase 1：移除历史 `registerBuiltinScadaSymbols()` 顶层副作用调用，
 * 该副作用曾强制任何 `import type` 消费者拖入 leafer-ui canvas 运行时）。
 */
export function registerScadaRenderers(registry: RendererRegistry) {
  registerScadaSymbols();
  return registerRendererDefinitions(registry, industrialRendererDefinitions);
}
