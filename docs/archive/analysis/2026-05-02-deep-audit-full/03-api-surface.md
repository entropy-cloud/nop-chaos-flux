# 03 API 表面积与契约一致性

## 复核统计

- 初审条目: 4
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 0
- 降级: 2
- 驳回: 3

## 已降级

### [维度03] `flux-runtime` 为 core registry API 提供了第二条公开路径

- **文件**: `packages/flux-runtime/src/index.ts:1-3`, `packages/flux-core/src/registry.ts:9-20`
- **证据片段**:
  ```ts
  1: export { createRendererRuntime, createModuleCache } from './runtime-factory';
  2: export { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
  ```
- **严重程度**: P3
- **现状**: `createRendererRegistry` / `registerRendererDefinitions` 同时从 `flux-core` 和 `flux-runtime` 可见。
- **风险**: 增加公开 contract owner 的 discoverability 噪音。
- **建议**: 若保留 convenience facade，需显式文档化；否则回收为 `flux-core` 唯一路径。
- **为什么值得现在做**: 当前 live 非测试调用主要仍走 `flux-core`，越早收口越便宜。
- **误报排除**: item review确认这不是高风险契约冲突，只是低优先级 API 收口项。
- **历史模式对应**: second owner path / convenience re-export 漂移
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: `已降级`

### [维度03] `flow-designer-renderers` root barrel 对 `designer-context` 过度 `export *`

- **文件**: `packages/flow-designer-renderers/src/index.tsx:15-17`, `packages/flow-designer-renderers/src/designer-context.ts:80-160`
- **证据片段**:
  ```ts
  15: export * from './schemas';
  16: export * from './designer-context';
  ```
  ```ts
  88: export function notifyCommandFailure(
  100: export function toActionResult(
  108: export function buildDesignerScopeData(input: {
  ```
- **严重程度**: P3
- **现状**: 根 barrel 把 raw context helper、action-result helper、scope-data builder 一并公开。
- **风险**: workspace-private 包的根公开面比稳定宿主契约更宽。
- **建议**: 保留确属 public 的 hooks/types，收窄 `DesignerContext` / helper 级导出。
- **为什么值得现在做**: 当前外部根路径使用面很窄，收口成本低。
- **误报排除**: item review 同时确认 `DesignerContextValue` / 部分 hooks 可能是当前合理 public surface，问题不是整包全错。
- **历史模式对应**: root barrel `export *` 把 internal-ish helper 带出
- **参考文档**: `docs/architecture/flow-designer/runtime-snapshot.md`
- **复核状态**: `已降级`

## 已驳回

### [维度03] `flux-code-editor` root barrel 泄露 compiler internal

- **文件**: `packages/flux-code-editor/src/index.ts:8-55`
- **证据片段**:
  ```ts
  44: export {
  45:   useResolvedVariables,
  49: } from './source-resolvers';
  54: export { CodeEditorRenderer, codeEditorRendererDefinition, codeEditorFieldRules };
  ```
- **严重程度**: P3
- **现状**: root barrel 并未转导出 `flux-compiler` 内部路径或 compiler private submodule。
- **风险**: 原 lead 会把“暴露 helper”误写成“泄露 compiler internal”。
- **建议**: 若后续继续收窄 package surface，再单独审查 helper 级导出。
- **为什么值得现在做**: 防止误把低风险 API 宽度问题上升成跨包私有耦合。
- **误报排除**: live code 只导出本包 schema/types/hooks/renderer helpers。
- **历史模式对应**: API surface 宽度与 internal leak 混淆
- **参考文档**: `docs/components/code-editor/design.md`
- **复核状态**: `已驳回`

### [维度03] `flux-code-editor` 当前 root barrel 已构成 package contract defect

- **文件**: `docs/plans/171-workbench-surface-and-package-boundary-successor-plan.md:86-112`, `docs/logs/2026/05-01.md:31`
- **证据片段**:
  ```md
  104: - [x] Narrow `flux-code-editor` root barrel to the intended package surface.
  111: - [x] `flux-code-editor` root barrel no longer exports an overly broad mixed surface.
  ```
- **严重程度**: P3
- **现状**: 当前 baseline 已把该项标记为已完成的低风险 surface cleanup，不足以重新上升为 live defect。
- **风险**: 若无更强证据，继续重复报告会和当前 owner baseline 冲突。
- **建议**: 只把剩余 helper exports 当低风险观察项。
- **为什么值得现在做**: 避免把已收敛问题重复计入最终报告。
- **误报排除**: item review核对了 live plan/log 与 barrel 实际导出。
- **历史模式对应**: 已收敛 package-surface 项被重复追打
- **参考文档**: `docs/plans/171-workbench-surface-and-package-boundary-successor-plan.md`
- **复核状态**: `已驳回`

### [维度03] `flux-react` 发布了平行 `RendererDefinition` 契约

- **文件**: `packages/flux-react/src/react-contracts.ts:14-17`, `docs/architecture/renderer-runtime.md:145-146`
- **证据片段**:
  ```ts
  14: export interface RendererDefinition<S extends BaseSchema = BaseSchema>
  15:   extends CoreRendererDefinition<S> {
  16:   reactComponent?: (props: Record<string, unknown>) => ReactElement | null;
  ```
- **严重程度**: P3
- **现状**: 这是 `flux-react` 明确声明的 React-specialized alias，不是与 `flux-core` 冲突的第二套独立契约。
- **风险**: 按原 lead 继续报告会把当前 code/doc 一致的 alias 误判为 duplication。
- **建议**: 不作为 defect 进入最终问题清单。
- **为什么值得现在做**: 防止误报当前已经明确文档化的 host-neutral vs React alias 分层。
- **误报排除**: doc 已明确 `flux-core` 拥有 host-neutral 合同，`flux-react` 拥有 React alias。
- **历史模式对应**: alias contract 被误判为 duplicate contract
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-core.md`
- **复核状态**: `已驳回`

## API 面快照

| 包                                   | 最终结论                                     |
| ------------------------------------ | -------------------------------------------- |
| `@nop-chaos/flow-designer-renderers` | 根 barrel 过宽，低优先级收口                 |
| `@nop-chaos/flux-runtime`            | core registry API 存在 convenience re-export |
| 其他已抽查包                         | 未发现需要报告的 live API contract defect    |

## 零发现

- 未发现 `exports` map 与 root barrel 的 live 失配。
- 未发现 `ScopeRef` code-level contract mismatch。
- 未确认有死代码级未接线源码文件需要报告。
