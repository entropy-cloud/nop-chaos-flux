# 165 Reactive Subscription Precision Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full-2/05-reactive-precision.md`, live code verification
> Related: `docs/plans/161-workspace-quality-and-dx-improvement-plan.md` (Phase 3.1 dialog-host useMemo, completed), `docs/plans/90-form-store-per-path-subscription-plan.md` (completed), `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md` (Phase 1 use-table-controls.ts 拆分须先于本计划 Phase 2 落地)

## Purpose

消除深度审核维度 05 中发现的响应式订阅精度问题。其中 P0 级别的 `useSurfaceScopeSnapshot` 是框架级 hook，导致所有打开的 Dialog/Drawer 在 scope 任何路径变化时全部重渲染。P1 级别问题集中在设计器 host 页面（word-editor、spreadsheet、flow-designer）的 hostScope 对象稳定性，以及 table/crud 渲染器的 scope selector 缺失 equalityFn。

## Current Baseline

- `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过
- Plan 161 Phase 3.1 已修复 `dialog-host.tsx` 中两处 `surfaceContext` 的 useMemo 包裹，但 `dialog-host-surface.tsx` 的 `useSurfaceScopeSnapshot` 未覆盖
- Plan 90 已完成 form-store per-path subscription，但 `diffAndNotifyValuePaths` 仍为线性扫描（已记录为 P2，不在本计划 scope）
- 当前 live code 中 `dialog-host-surface.tsx:43-51` 的 `useSurfaceScopeSnapshot` 订阅全 scope snapshot（selector 为 identity `(state) => state`，equalityFn 为 `Object.is`），每次 scope 任何路径变化都触发所有 dialog/drawer 内容重渲染
- word-editor、spreadsheet、flow-designer 的 host 页面使用内联对象字面量作为 `useHostScope` 参数，每次渲染触发 `scope.replace`
- `useTablePagination` scope selector 缺少 equalityFn（其余 4 个 hook 已有 custom equalityFn）
- `useCrudRuntimeState` 单 selector 读取 7 路径（**已有 equalityFn**，P1 问题为架构不精细而非缺失 equalityFn）
- `report-designer-renderers/src/host-data.ts:190-200` 已实现正确的 `useMemo` 包裹 hostScope 模式，可作为参考

## Goals

- 让 `useSurfaceScopeSnapshot` 只在 dialog/drawer 实际消费的 scope 路径子集变化时触发重渲染
- 让设计器 host 页面的 hostScope 对象引用稳定，消除每次渲染的 `scope.replace`
- 让 table/crud 渲染器的 scope selector 使用 equalityFn 避免不必要的重渲染

## Non-Goals

- 不优化 `diffAndNotifyValuePaths` 线性扫描（P2，已在 dim 15 记录，独立跟进）
- 不包裹所有渲染器组件的 React.memo（P2，收益有限）
- 不重构 `field-utils.tsx` 非 form 模式全 scope 订阅（P2，架构限制）
- 不处理 `dialog-host.tsx` 的 subscribe/getSnapshot 内联函数（P2，已由 Plan 161 Phase 3.1 缓解）
- 不处理 `fallbackSelector` 非稳定引用（已驳回，useCallback 依赖正确）
- 不修改 `useHostScope` 内部实现（`hooks.ts:66-86` 的 `useLayoutEffect` 和 `scope.replace` 调用）；当前 Phase 3 的策略是在调用侧用 `useMemo` 稳定 `scopeData` 参数

## Scope

### In Scope

| Finding                                                                    | Severity | File                                                                 | Phase   |
| -------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- | ------- |
| useSurfaceScopeSnapshot 全 scope 订阅                                      | P0       | `flux-react/src/dialog-host-surface.tsx:43-51`                       | Phase 1 |
| word-editor editorRuntime selector 无 equalityFn                           | P1       | `word-editor-renderers/src/word-editor-page.tsx:96-110`              | Phase 2 |
| useTablePagination scope 分支无 equalityFn                                 | P1       | `flux-renderers-data/src/table-renderer/use-table-controls.ts:26-30` | Phase 2 |
| useCrudRuntimeState 单 selector 读取 7 路径（已有 equalityFn，架构需拆分） | P1       | `flux-renderers-data/src/crud-renderer-state.ts:232-270`             | Phase 2 |
| useEffect 依赖 defaultQuery 对象                                           | P1       | `flux-renderers-data/src/crud-renderer-state.ts:272-303`             | Phase 2 |
| word-editor hostScope 对象每次渲染重建                                     | P1       | `word-editor-renderers/src/word-editor-page.tsx:136-151`             | Phase 2 |
| spreadsheet hostScope 对象每次渲染重建                                     | P1       | `spreadsheet-renderers/src/page-renderer.tsx:116-128`                | Phase 3 |
| useDesignerHostScope useMemo 依赖 input 对象                               | P1       | `flow-designer-renderers/src/designer-context.ts:152-160`            | Phase 3 |

### Out Of Scope

- dim 05-P2 渲染器无 React.memo
- dim 05-P2 非 form 模式全 scope
- dim 05-P2 dialog-host 内联函数
- dim 05-驳回 fallbackSelector

## Sequencing Dependencies

- **Plan 166 Phase 1 须先于本计划 Phase 2 落地**：Plan 166 将 `use-table-controls.ts` 拆分为 5 个独立文件，本计划 Phase 2 的 equalityFn 修改应指向拆分后的 `use-table-pagination.ts`。若 Plan 166 未先落地，本计划 Phase 2 应直接修改原文件，待 Plan 166 拆分后自然继承。

## Execution Plan

### Phase 1 - Fix useSurfaceScopeSnapshot (P0)

Status: completed
Targets: `packages/flux-react/src/dialog-host-surface.tsx`

选定方案 A（路径子集订阅）。方案 B（动态 path trap）记录为潜在后续优化，不在本计划执行。

- [x] 分析 `useSurfaceScopeSnapshot` 当前消费方：每个 dialog/drawer 的 surface body 通过 `useSurfaceScopeSnapshot()` 获取 scope snapshot，然后用 `useSyncExternalStore` 订阅
- [x] 将 `useSurfaceScopeSnapshot` 改为接受可选的 `paths: string[]` 参数：
  - 当提供 `paths` 时，selector 从 `readVisible()` 中只提取指定路径的值，equalityFn 使用 `shallowEqual` 比较提取结果
  - 当未提供 `paths` 时，保持全 scope 订阅行为（向后兼容）
- [x] 添加测试：验证 dialog 打开时，修改 scope 中 dialog 未使用的路径不会触发 dialog body 重渲染
- [x] 添加测试：验证 dialog 使用了 scope.data.a 时，修改 scope.data.b 不触发重渲染，修改 scope.data.a 触发重渲染
- [x] 验证：现有 `dialog-host-surface.tsx` 的消费方（`dialog-host.tsx` 中 `DialogView` 和 `DrawerView`）在不提供 `paths` 参数时行为不变

Exit Criteria:

- [x] `useSurfaceScopeSnapshot` 在提供 `paths` 时只在指定路径变化时触发重渲染
- [x] 未提供 `paths` 时保持全 scope 订阅行为（向后兼容）
- [x] 所有现有 dialog/drawer 测试通过
- [x] 新增测试覆盖选择性订阅行为
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] 确认 `docs/architecture/renderer-runtime.md` 无需更新（API 为可选扩展，无契约变更）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Add equalityFn To Scope Selectors And Stabilize word-editor hostScope (P1)

Status: completed
Targets: `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`（或拆分后的 `use-table-pagination.ts`）, `packages/flux-renderers-data/src/crud-renderer-state.ts`

> 本 Phase 合并了原 Phase 2（equalityFn）和 Phase 3 中 `word-editor-page.tsx` 的 hostScope 稳定化工作，避免同一文件跨 Phase 的上下文切换。

- [x] `word-editor-page.tsx:96-110`：为 `editorRuntime` selector 添加 `shallowEqual` 作为 equalityFn
- [x] `use-table-controls.ts:26-30`（或拆分后的 `use-table-pagination.ts`）：为 `useTablePagination` 的 scope selector 添加 `shallowEqual` equalityFn
- [x] `crud-renderer-state.ts:232-270`：将 `useCrudRuntimeState` 单 selector（已有 equalityFn）拆分为多个细粒度 selector，每个只读取 1-2 个路径
- [x] `crud-renderer-state.ts:272-303`：将 `defaultQuery` 对象通过 ref 稳定化，useEffect 依赖不再包含 `defaultQuery`
- [x] `word-editor-page.tsx:136-151`：将 `hostScope` 对象用 `useMemo` 包裹，依赖项为 `[charts, codes, datasets, runtimeHostSummary, savedDocument?.data, selection]`
- [x] 为每处修改添加验证：render count 测试或在 playground 中使用 React DevTools Profiler 确认重渲染减少

Exit Criteria:

- [x] 3 处 scope selector 均有 equalityFn 或已拆分为细粒度 selector
- [x] `defaultQuery` 对象引用稳定
- [x] word-editor `hostScope` 对象引用稳定
- [x] 当实际数据变化时 `scope.replace` 仍被正确调用
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] 确认 `docs/architecture/renderer-runtime.md` 无需更新（equalityFn 为内部优化，无契约变更）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Stabilize Remaining Host Scope Objects (P1)

Status: completed
Targets: `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/flow-designer-renderers/src/designer-context.ts`

- [x] `page-renderer.tsx:116-128`：将 hostScope 对象用 `useMemo` 包裹，依赖项为 `[spreadsheet]`（`spreadsheet` 已由上游 `useMemo` 稳定）
- [x] `designer-context.ts:152-160`：将 `useDesignerHostScope` 的 `useMemo` 依赖项从 `[input]` 改为 `[input.snapshot, input.config, input.core]`
- [x] 为每处修改添加 render count 测试验证 scope.replace 调用频率降低
- [x] 验证当实际数据变化时 `scope.replace` 仍被正确调用

Exit Criteria:

- [x] 2 处 hostScope 对象引用稳定，不再每次渲染触发 `scope.replace`
- [x] 当实际数据变化时 `scope.replace` 仍被正确调用
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] 确认 `docs/architecture/renderer-runtime.md` 无需更新（useMemo 为内部优化，无契约变更）
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] `useSurfaceScopeSnapshot` 在提供 paths 时只订阅指定路径（P0 修复）
- [x] 所有 scope selector 有 equalityFn（P1 修复）
- [x] 所有 hostScope 对象引用稳定（P1 修复）
- [x] 数据变化时 `scope.replace` 仍正确触发（无 stale data）
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

| Risk                                                               | Impact                                      | Mitigation                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| useSurfaceScopeSnapshot 路径子集订阅可能遗漏 dialog 实际使用的路径 | Dialog 内数据不更新                         | 不提供 paths 时保持全量行为（向后兼容）；提供 paths 时由消费方保证路径完整性                                                                                        |
| equalityFn 使用 shallowEqual 可能遗漏深嵌套对象的等值判断          | 不必要的重渲染或数据不更新                  | 优先使用 shallowEqual，仅对已知深层路径使用 custom comparator                                                                                                       |
| hostScope useMemo 依赖项列表不完整                                 | scope.replace 被跳过导致子 scope 数据不更新 | 依赖项必须覆盖所有实际使用的 scope 属性；exit criteria 包含数据正确性验证                                                                                           |
| hostScope useMemo 稳定化可能阻止 `scope.replace` 对子 scope 的传播 | 子 scope 数据 stale                         | `useHostScope` 的 `useLayoutEffect` 在 `scopeData` 引用不变时跳过 `scope.replace`，但子 scope 通过 `subscribe` 机制自行订阅 store 变化，不依赖 `scope.replace` 传播 |

## Closure

Status Note: All 3 phases executed and verified. P0 `useSurfaceScopeSnapshot` selective path subscription landed with 4 new tests. P1 equalityFn added to 3 scope selectors + 2 host scope stabilizations. P1 crud selector split into 5 fine-grained selectors. Independent closure audit confirmed 10/10 verification points pass after fixing `designer-context.ts` `[input]` → `[input.snapshot, input.config, input.core]` gap.

Closure Audit Evidence:

- Reviewer / Agent: independent general-purpose sub-agent (task session)
- Evidence: Closure audit verified all 10 verification points against live code. 9/10 initially passed; 1 gap at `designer-context.ts:158` (`[input]` deps) was fixed. All exit criteria met. Dev log entry at `docs/logs/2026/05-01.md` line 1.

Follow-up:

- dim 05-P2 渲染器 React.memo 包裹可作为后续 DX 改进
- dim 05-P2 非 form 模式全 scope 订阅需要架构级重构
- dim 15-P2 diffAndNotifyValuePaths 线性扫描优化独立跟进
- Phase 1 方案 B（动态 path trap）可作为后续架构级优化
- Plan 166 仍未落地，其 `use-table-controls.ts` 拆分完成后本计划 Phase 2 的 equalityFn 修改需确认继承正确
