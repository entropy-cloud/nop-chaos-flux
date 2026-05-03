# 16 文档-代码一致性

- 初审发现数: 4
- 维度复核: 完成
- 子项复核: 5
- 最终结果: 保留 3 / 降级 1 / 驳回 0

## 保留

### [维度16] `flux-runtime-module-boundaries.md` 的迁移叙述已落后于 live code

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-renderers-basic/src/utils.ts`, `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-runtime/src/index.ts`, `packages/flux-react/src/unstable.ts`
- **严重程度**: P1
- **漂移类型**: owner 漂移 / 行为不一致
- **文档描述**: 文档描述 `resolveGap` 已从 basic 迁到 react，`crud-renderer.tsx` 已从稳定根入口拿 `createReadonlyScopeBinding`。
- **代码现状**: `flux-renderers-basic` 仍保留并使用本地 `resolveGap`；`crud-renderer.tsx` 实际从 `@nop-chaos/flux-react/unstable` 导入，而真实 owner/re-export 来源在 `flux-runtime`。
- **建议**: 将该节改为当前真实 baseline，明确哪些迁移尚未完成、哪些 helper 仍经 `unstable` 暴露。
- **复核状态**: 子项复核通过

### [维度16] `renderer-runtime.md` 的 `useCurrentFormState` 签名块漏了 `paths`

- **文档路径**: `docs/architecture/renderer-runtime.md`
- **代码路径**: `packages/flux-react/src/hooks.ts`
- **严重程度**: P2
- **漂移类型**: API 文档漂移
- **文档描述**: 签名块只写 `options?: { enabled?: boolean; path?: string }`。
- **代码现状**: live 签名已支持 `paths?: readonly string[]`，且同页正文也在引用 `{ paths }`。
- **建议**: 统一签名块与正文，补全 `paths`。
- **复核状态**: 子项复核通过

### [维度16] 活跃计划 189 的状态字面量不符合 plan guide

- **文档路径**: `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md`
- **代码路径**: 无
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: plan guide 规定状态使用 `in progress`。
- **代码现状**: 计划 189 使用了 `in_progress`。
- **建议**: 统一改为 guide 规定的状态字面量。
- **复核状态**: 子项复核通过

## 已降级

- `FormStoreApi.subscribeToPaths(...)` 的 active docs 未同步: **已降级**
  - 子项复核确认它在核心 owner/reference 文档中缺失，但 `docs/architecture/dependency-tracking.md` 已写到该能力，因此更准确地属于“主文档面未完全同步”，而不是所有 active docs 都缺失。
