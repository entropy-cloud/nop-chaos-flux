# 17 命名与术语一致性

## 复核统计

- 初审条目: 4
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 2
- 降级: 2
- 驳回: 0

## 保留

### [维度17] word-editor 公共 API 同时暴露 `DataSet` 与 `Dataset` 两套词形

- **文件**: `packages/word-editor-core/src/index.ts:7-8`, `packages/word-editor-core/src/index.ts:21-34`, `packages/word-editor-renderers/src/index.ts:24-28`, `packages/word-editor-renderers/src/types.ts:2-18`
- **证据片段**:
  ```ts
  7: export { createDatasetStore } from './dataset-store.js';
  8: export type { DatasetStoreApi } from './dataset-store.js';
  22:   createDataSet,
  24:   validateDataSet,
  28:   DataSet,
  ```
- **严重程度**: P1
- **冲突名称**: `DataSet` vs `Dataset`
- **冲突位置**: word-editor model/type/factory 侧与 store/UI 侧同时存在两套命名。
- **统一建议**: 统一到一套词形，优先考虑 `Dataset` 家族；旧名走别名/弃用过渡。
- **为什么值得现在做**: 这是 live exported API，不再只是内部实现噪音。
- **误报排除**: item review确认 docs 也在同时使用两套词形。
- **历史模式对应**: 同概念双词汇对外暴露
- **参考文档**: `docs/references/terminology.md`, `docs/components/word-editor-page/design.md`
- **复核状态**: `子项复核通过`

### [维度17] `flux-code-editor` 仍导出 author-facing `dataPath`

- **文件**: `packages/flux-code-editor/src/types.ts:87-99`, `packages/flux-code-editor/src/types.ts:173-178`, `packages/flux-code-editor/src/source-resolvers.ts:134-223`
- **证据片段**:
  ```ts
  87: export type VariableSourceRef = {
  91:   dataPath?: string;
  ```
  ```ts
  173: export type SQLSchemaSourceRef = {
  177:   dataPath?: string;
  ```
- **严重程度**: P2
- **冲突名称**: `dataPath` vs 推荐的 `path`
- **冲突位置**: code-editor source-ref public types 与 repo JSON naming baseline
- **统一建议**: 收口到 `path` 或更明确的 `sourcePath/resultPath`，必要时保留兼容别名。
- **为什么值得现在做**: 这是导出的 authoring surface，继续保留会把旧命名重新固化。
- **误报排除**: item review确认 resolver 仍实际消费 `dataPath`。
- **历史模式对应**: path semantic key 多词汇并存
- **参考文档**: `docs/references/flux-json-conventions.md`, `docs/references/terminology.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度17] `scopeRef` 用于 DOM ref，与 runtime `ScopeRef` 撞名

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts:5-12`, `packages/word-editor-renderers/src/word-editor-page.tsx:48`, `docs/references/terminology.md:171-182`
- **证据片段**:
  ```ts
  5: interface UseWordEditorShortcutsOptions {
  8:   scopeRef?: RefObject<HTMLElement | null>;
  ```
- **严重程度**: P3
- **冲突名称**: `scopeRef` (DOM ref) vs `ScopeRef` (runtime lexical scope)
- **冲突位置**: word-editor shortcuts hook 与全局术语表
- **统一建议**: 改成 `rootRef` / `containerRef` 等 UI 名称。
- **为什么值得现在做**: 局部小改名即可降噪。
- **误报排除**: item review确认这只是局部 hook 命名，不是系统性公共术语冲突。
- **历史模式对应**: 核心术语被复用到不同概念
- **参考文档**: `docs/references/terminology.md`
- **复核状态**: `已降级`

### [维度17] `dingflow-*` / `ding-flow-*` 文件前缀并存

- **文件**: `packages/flow-designer-renderers/src/dingflow/index.ts:1-5`, `packages/flow-designer-renderers/src/dingflow/`
- **证据片段**:
  ```ts
  1: export * from './dingflow-constants';
  3: export { DingFlowEdge } from './ding-flow-edge';
  4: export { computeDingFlowOverlays } from './dingflow-overlays';
  ```
- **严重程度**: P3
- **冲突名称**: `dingflow-` vs `ding-flow-`
- **冲突位置**: 同一子目录下的文件命名模式
- **统一建议**: 统一整个目录前缀。
- **为什么值得现在做**: 机械性清理，影响局部但易完成。
- **误报排除**: item review确认这不影响 runtime contract。
- **历史模式对应**: 同目录文件前缀漂移
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: `已降级`

## 零发现

- 未发现 `create*` / `register*` / `use*` / `is*` / `has*` 的系统性误用。
- 未发现已移除术语在活跃 API 中继续残留。
