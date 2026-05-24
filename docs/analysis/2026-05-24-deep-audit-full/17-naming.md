# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] `createFlowDesignerRegistry` 仍作为稳定导出暴露，但实际语义已是 extend/register

- **文件**: `packages/flow-designer-renderers/src/renderer-definitions.ts:297-309`; `packages/flow-designer-renderers/src/index.tsx:11-16`
- **证据片段**:

  ```ts
  export function registerFlowDesignerRenderers(registry: RendererRegistry) {
    return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
  }

  export function extendFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
    return registerFlowDesignerRenderers(baseRegistry);
  }

  /**
   * @deprecated Use `extendFlowDesignerRegistry()` for register/extend semantics.
  ```

  ```ts
  export {
    flowDesignerRendererDefinitions,
    registerFlowDesignerRenderers,
    extendFlowDesignerRegistry,
    createFlowDesignerRegistry,
  } from './renderer-definitions.js';
  ```

- **严重程度**: P3
- **冲突名称**: `createFlowDesignerRegistry` vs `extendFlowDesignerRegistry` / `registerFlowDesignerRenderers`
- **冲突位置**: 实现文件已用 `@deprecated` 承认 `create*` 名称不表达真实 register/extend 语义，但 root barrel 仍把该 deprecated 名称作为稳定公开导出继续暴露；owner 文档当前只列 `registerFlowDesignerRenderers()`、`extendFlowDesignerRegistry()` 与 definitions 为稳定 surface。
- **统一建议**: 在 v1 无兼容负担基线下，从 root stable export 移除 `createFlowDesignerRegistry`，只保留 `extendFlowDesignerRegistry` / `registerFlowDesignerRenderers`；如仍需旧名，移动到明确 legacy/unstable surface。
- **现状**: 该函数不创建 fresh registry，而是 mutation/extension wrapper；命名冲突已被代码注释识别，但仍在 public barrel 中继续发布。
- **风险**: 新调用者可能按 `create*` 语义误以为它返回独立 registry，导致 registry ownership/side-effect 心智模型错误；也会让后续跨包注册 API 继续复制不精确命名。
- **建议**: 收敛公开 API，删除或迁出 deprecated alias，并同步 owner doc / migration note。
- **为什么值得现在做**: 已弃用命名仍在 stable root 中扩散，清理能避免 v1 主路径继续携带自我矛盾 API。
- **误报排除**: 这不是局部变量命名或 React handler 命名；它是 root package public contract 的稳定导出，且代码自身已标注真实语义应为 `extend`，满足 public contract confusion / maintenance cost 门槛。
- **历史模式对应**: 已 deprecated 的旧 public name 仍保留在 stable barrel。
- **参考文档**: `docs/references/terminology.md`; `docs/references/flux-json-conventions.md`
- **复核状态**: 未复核

## 命名冲突清单

| 编号        | 冲突名称                                                                                       | 位置                                                                                                             | 严重程度 |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| [维度17-01] | `createFlowDesignerRegistry` vs `extendFlowDesignerRegistry` / `registerFlowDesignerRenderers` | `packages/flow-designer-renderers/src/renderer-definitions.ts`, `packages/flow-designer-renderers/src/index.tsx` | P3       |

## 统一建议

- Flow Designer renderer registry 公开面统一使用 `extendFlowDesignerRegistry` 表达扩展已有 registry，用 `registerFlowDesignerRenderers` 表达注册 definitions。
- 不继续在 stable root export 暴露 `createFlowDesignerRegistry` 这种已知 deprecated alias。

## 总结评估

本轮已按要求检查 `ScopeRef/scopeRef`、`RendererRuntime/runtime/env`、`templateNode/compiledNode/nodeInstance`、`FormStoreApi/FormRuntime/form`、`PageStoreApi/PageRuntime/page`、`dataPath` legacy、`items/itemsSource`、`onClick/handleClick`、JSON key/namespace、函数前缀、文件命名和跨包注册命名。多数命中属于合理局部变量、测试辅助、DOM/React handler 或 owner 文档已正式定义的 host projection convenience，不作为问题报告。

## 第 2 轮深挖方向

- 继续聚焦 root public barrel 和 owner docs 中仍导出的 deprecated naming alias。
- 抽查 flow/report/spreadsheet/word editor 的 host action provider 命名，确认是否还有 public `create*` 但实际 mutation/register 的同类问题。
- 本轮未发现除 `[维度17-01]` 外新的高价值问题。

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度17-01]`: 保留（P3）。live code 中 `createFlowDesignerRegistry(baseRegistry)` 仍只是调用 `extendFlowDesignerRegistry()`/注册到传入 registry，且仍由 root barrel 导出；active flow-designer docs 的稳定 surface 只列 canonical `register/extend` 命名，命名债真实存在但影响范围仍属低优先级 public naming residual。

## 子项复核建议

无。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                         | 摘要                                                                              |
| --------- | -------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 维度17-01 | P3       | `packages/flow-designer-renderers/src/renderer-definitions.ts`; `packages/flow-designer-renderers/src/index.tsx` | `createFlowDesignerRegistry` 仍作为稳定导出暴露，但实际语义已是 extend/register。 |
