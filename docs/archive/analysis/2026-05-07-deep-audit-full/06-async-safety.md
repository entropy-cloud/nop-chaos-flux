# 06 Async Safety

- 深挖轮次: 3
- 深挖发现数: 9
- 维度复核: 6 保留 / 2 降级 / 1 驳回
- 子项复核: 已完成 2 项高风险条目复核

## 第 1 轮初审

- `designer-page.tsx` create dialog confirm 缺少方法级并发保护
- `table-quick-edit-controller.ts` save 只靠 `saving` state 防重入
- `variant-field.tsx` detectVariant 仅 stale-drop，无真正 abort

## 深挖第 2 轮追加

- CRUD query submit 缺少方法级 guard
- CRUD capability promise 缺 rejection 收口

## 深挖第 3 轮追加

- detail-view/detail-field adaptation 只有 sequencer，无真正 abort
- report field-source refresh 不 abort provider.load
- report refresh 去重复用旧 promise 的取消语义问题
- flow auto-layout 只有 stale-drop，无真正取消

## 维度复核结论

保留:

- create dialog confirm guard
- table quick edit save guard
- variant-field detect abort
- CRUD query submit guard
- CRUD capability rejection 收口
- report field-source refresh abort gap

降级:

- detail-view/detail-field adaptation only sequencer
- flow auto-layout true cancel

驳回:

- report refresh 复用旧 promise 本身不构成缺陷

## 子项复核结论

成立:

- `flow-designer` create dialog confirm 缺少方法级并发保护

降级:

- `table-quick-edit-controller` 只靠 `saving` state 的问题从 P1 降到 P2

## 最终保留项

### [维度06] Flow Designer 创建节点确认链仍缺少方法级并发保护

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-page-helpers.tsx`
- **严重程度**: P1
- **现状**: confirm handler 只依赖按钮 `disabled` 与 React state，未在方法入口做同步门闩
- **风险**: 同 tick 双击/重复确认时可能重复创建节点并重复执行 submit side effect
- **建议**: 在方法入口加入 ref/token 级 guard
- **复核状态**: 子项复核通过

### [维度06] 多条 query/save/adaptation/field-source 路径仍只有 stale-drop 或 UI-state guard，缺完整取消/异常收口

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flux-renderers-data/src/crud-renderer-ownership.ts`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/report-designer-core/src/runtime/field-sources.ts`
- **严重程度**: P2
- **现状**: 这些路径仍分别存在 UI state 防重入、未 abort provider.load、未 catch capability reject、只有 requestId sequencer 等残留
- **风险**: 重复请求、未处理 rejection、后台旧请求继续运行
- **建议**: 统一补方法级 guard、AbortSignal 透传、结构化失败返回
- **复核状态**: 维度复核通过
