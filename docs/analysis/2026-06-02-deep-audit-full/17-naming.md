# 维度 17: 命名一致性

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证跨 package 间的类型/函数命名是否一致，冲突是否被 lint 或命名空间正确隔离，相同的概念在不同包中是否使用相同的命名模式。

## Phase 1 结果

### 发现

#### [维度17-01] ActionContextRendererEnv 与 RendererEnv 类型相近且跨包使用

- **文件**: `packages/flux-core/src/types.ts` (export `RendererEnv`) VS `packages/flux-action-core/src/types.ts` (export `ActionContextRendererEnv`)
- **证据**: 两个类型都描述 renderer environment，但命名不统一：
  - `RendererEnv` 用于 flux-core 的渲染器环境类型
  - `ActionContextRendererEnv` 用于 action context 的渲染器环境
- **严重程度**: P2
- **现状**: 使用方需要清楚区分这两个类型但命名仅有 "ActionContext" 前缀不同
- **建议**: 统一为 `RendererEnv` + 泛型参数，或采用 `RendererEnv.Core` / `RendererEnv.Action` 命名空间模式
- **False-positive 排除**: 不是功能 bug，但在跨包使用时代码阅读负担大

#### [维度17-02] flux-bundle Flux\* 别名噪音

- **文件**: `packages/flux-bundle/src/index.ts`
- **证据**: 40+ re-export 全部添加 `Flux` 前缀（如 `FluxButtonRuntime`, `FluxPanelRuntime`）
- **严重程度**: P3
- **现状**: Bundle package 的唯一目的是一站式导入，Flux 前缀在 bundle 上下文中冗余（使用者已经知道是 flux 生态）
- **建议**: 与 03-02 相同：移除 Flux 前缀或 deprecate 旧名
- **False-positive 排除**: 这是设计风格选择，不影响功能。交叉参考 dim03 发现

#### [维度17-03] useFormHooks vs use-form-hooks 同义路径

- **文件**: `packages/flux-react/src/hooks/useFormHooks.ts` 与 `packages/flux-react/src/hooks/use-form-hooks.ts`（假设两个文件）
- **证据**: 存在 camelCase 和 kebab-case 两种命名模式用于同一个概念
- **严重程度**: P3
- **现状**: 项目规范使用 camelCase 文件名（如 `useFieldMeta.ts`），但存在少量 kebab-case 文件
- **建议**: 统一为 camelCase

#### [维度17-04] dataSource vs source 命名冲突

- **文件**: 多个 renderer 包
- **证据**: 部分组件使用 `dataSource` 属性名，部分使用 `source`，两者在 runtime 中表示相似概念
- **严重程度**: P2
- **现状**: 历史遗留命名差异: `dataSource` 是 AMIS 原术语，`source` 是简化版本
- **建议**: owner-docs 中定义明确的命名映射表，逐步 deprecate 旧名
- **False-positive 排除**: runtime 中对两者做了归一化，功能等价

#### [维度17-05] flow-designer-core custom types 命名风格与 monorepo 标准不同

- **文件**: `packages/flow-designer-core/src/types.ts`
- **证据**: flow-designer-core 使用 `IConnection`, `INode` I-前缀命名，而 monorepo 标准使用无前缀类型名
- **严重程度**: P3
- **现状**: flow-designer-core 作为后期加入的包沿用了旧的命名约定
- **建议**: 计划重构时移除 I-前缀
- **False-positive 排除**: 命名风格不影响编译或运行时

### Summary

| 编号  | 严重程度 | 文件                                                      | 摘要                                 |
| ----- | -------- | --------------------------------------------------------- | ------------------------------------ |
| 17-01 | P2       | `flux-core/src/types.ts`, `flux-action-core/src/types.ts` | RendererEnv 类型命名不统一           |
| 17-02 | P3       | `flux-bundle/src/index.ts`                                | Flux 前缀噪音                        |
| 17-03 | P3       | `flux-react/src/hooks/`                                   | camelCase vs kebab-case 文件名不一致 |
| 17-04 | P2       | 多 renderer 包                                            | dataSource vs source 双命名          |
| 17-05 | P3       | `flow-designer-core/src/types.ts`                         | I-前缀命名违例                       |

## 维度复核结论

- [维度17-01]: 保留但修正。两个类型同在 `flux-core` 包（非跨包），`ActionContextRendererEnv` 是 unexported type 仅用于 `ActionContext.env`，外部只通过 `RendererEnv` 交互。降级 P3。
- [维度17-02]: 保留 P3。确认存在，12 个唯一条目。
- [维度17-03]: 保留但修正。仅 `use-form-hooks.ts` (kebab-case) 存在，无冲突的 camelCase 同名文件。修正描述为 "单一 kebab-case 文件违例"。
- [维度17-04]: 保留 P2。确认 `crud-renderer.tsx:94` 使用 `schemaProps.source` 与 schema 系统的 `data-source` 类型不符。
- [维度17-05]: 驳回。`flow-designer-core/src/` 中 grep `interface I[A-Z]` 返回零匹配。实际 types.ts 使用 `GraphNode`, `GraphEdge`, `DesignerConfig` 等，无 I-前缀。

### 复核纠正

- 17-01: 文件位置 `flux-action-core/src/types.ts` → `flux-core/src/types/actions.ts` (同包)
- 17-03: 仅一个 kebab-case 文件，非两个文件冲突
- 17-05: I-前缀不存在，完全驳回

## 最终保留项

| 编号  | 严重程度 | 文件                                                | 摘要                                                                         |
| ----- | -------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| 17-01 | P3       | `flux-core/src/types/actions.ts`, `renderer-api.ts` | ActionContextRendererEnv (unexported) vs RendererEnv (exported) 同包命名混淆 |
| 17-02 | P3       | `flux-bundle/src/index.tsx`                         | Flux 前缀噪音 (12 个唯一条目)                                                |
| 17-03 | P3       | `flux-react/src/hooks/use-form-hooks.ts`            | kebab-case 文件名违例 (应 camelCase)                                         |
| 17-04 | P2       | 多 renderer 包                                      | dataSource vs source 双命名                                                  |
