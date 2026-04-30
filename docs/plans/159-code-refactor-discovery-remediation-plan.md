# 159 Code Refactor Discovery Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: 全仓库 11 维度重构发现审计（`docs/skills/code-refactor-discovery-prompt.md`），审计结果汇总见本 plan 执行当日的 daily log
> Related: `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`, `docs/plans/84-oversized-code-file-elimination-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`

## Purpose

修复 2026-04-30 全仓库 11 维度重构发现审计中确认的结构性问题：双状态/双数据源、异步取消模式、包边界违规（158 未覆盖的实例）、目录结构归组、i18n 违规、兼容层收敛。

## Current Baseline

- 2026-04-30 执行了覆盖全部 packages 的 11 维度代码重构发现审计
- 审计发现 0 P0、7 P1、15 P2 问题
- `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 当前全部通过
- 158 计划已覆盖：重复代码消除、form-runtime 文件合并（19→5-6）、AST walker 去重、`flux-action-core→flux-compiler` 反向依赖、死代码清理
- 本计划覆盖 158 未涉及的以下领域

## Goals

1. 修复 4 处 P1 级双状态/双数据源问题，消除 `useState` + `useEffect` 镜像 store 数据的同步风险
2. 将 `reaction-runtime.ts` 和相关模块的 `disposed` 布尔值迁移为 `AbortController`/`AbortSignal`
3. 修复 3 处 158 未覆盖的包边界违规
4. 修复 `designer-inspector.tsx` 的 i18n 违规
5. 评估并收敛兼容层遗留别名（`extractLegacyPayload`、`selection/target/selectionTarget`）

## Non-Goals

- 不做 form-runtime 文件合并（19→5-6），这是 145 的已完成职责
- 不做重复代码消除，这是 158 Phase 1 的职责
- 不做 formula AST walker 去重，这是 158 Phase 3 的职责
- 不做 `parseNamespacedAction` 统一和 `flux-action-core→flux-compiler` 反向依赖修复，这是 158 Phase 4 的职责
- 不做死代码/冗余清理，这是 158 Phase 5 的职责
- 不重构 `RendererRuntime` 接口或 `RendererDefinition` 接口
- 不重构 table/CRUD ownership 模式（`useOwnedState` 设计需独立排期）
- 不做 `runtime-factory.ts` 的 `disposed` 布尔迁移（同步 dispose 门控，当前可接受）
- 不做目录结构归组（Phase 4 已取消）

## Scope

### In Scope

| Phase | 主题                         | 影响包                                                                                          | 问题等级  |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------- | --------- |
| 1     | 异步取消模式迁移             | flux-runtime                                                                                    | P1        |
| 2     | 双状态/双数据源修复          | flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flow-designer-renderers | P1/P2     |
| 3     | 包边界修复（158 未覆盖）     | flux-renderers-data, flux-renderers-form, flux-compiler                                         | P1/P2     |
| 4     | ~~目录结构归组~~ (cancelled) | ~~flux-runtime, flux-react, report-designer-renderers~~                                         | ~~P1/P2~~ |
| 5     | i18n 修复                    | flow-designer-renderers                                                                         | P1        |
| 6     | 兼容层收敛与清理             | flux-compiler, report-designer-renderers                                                        | P2        |

## Execution Plan

### Phase 1 - 异步取消模式迁移

Status: completed
Targets: `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`

- [x] **P1.1** `reaction-runtime.ts` `disposed` → `AbortController`：已完成（line 76: `const abortController = new AbortController()`）
- [x] **P1.2** `reaction-runtime.ts` `onDebugUpdate` 从 `abortController.signal.aborted` 读取（line 90）
- [x] **P1.3** `reaction-runtime.ts` 第二处 disposed 迁移为 `AbortController`（line 369/395）
- [x] **P1.4** `source-registry.ts` disposed → `AbortController`（lines 188/192）
- [x] **P1.5** focused test 已添加：`reaction-runtime.test.ts` 5 个测试覆盖 dispose race/debounce/stale-drop/cancelled-result

Exit Criteria:

- [x] 无 `let disposed = false` 模式（仅 `runtime-factory.ts` 保留，明确 Non-Goals）
- [x] 所有异步取消通过 `AbortController.signal.aborted`
- [x] `dispose()` 使用 `abortController.abort()`
- [x] 5 个 focused test 验证取消语义
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/architecture/flux-runtime-module-boundaries.md` 已更新 async-data 取消机制说明
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 双状态/双数据源修复

Status: completed (P2.3 descoped)
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`

- [x] **P2.1** `field-utils.tsx` `useAdaptedFieldValue`：已添加 `AbortController`（`ac`），同步 adapter 有 `__syncIn` 优化跳过 useState
- [x] **P2.2** `object-field.tsx` `resolvedValue`：no-op 场景用 `usesWorkingValue` 跳过 useState；有 transformIn 时用 `AbortController`
- [x] **P2.3** `table-quick-edit-controller.ts` scope 订阅：**descoped**。`useSyncExternalStore` 直接订阅会导致反馈循环（内部 `rowScope.update` 触发 snapshot 变化 → useEffect 重置 savedValue → dirty 始终 false）。`record` prop 已通过父组件 re-render 传播外部变更，对当前 per-cell controller 足够。
- [x] **P2.4** `designer-page.tsx` prop-state 双写：已添加 `prevInputRef` 浅比较（lines 38-46）
- [x] **P2.5** adapter focused test：6 个测试覆盖 sync (\_\_syncIn)、sync-via-microtask、async resolve、stale cancellation、error warning（`field-utils.unit.test.tsx`）

Exit Criteria:

- [x] `field-utils.tsx` 使用 `AbortController`
- [x] `object-field.tsx` 无 transformIn 场景不使用 useState
- [x] `table-quick-edit-controller.ts` — descoped（`record` prop 传播外部变更；`useSyncExternalStore` 反馈循环不可行）
- [x] `designer-page.tsx` 浅比较降低双写风险
- [x] focused test 验证 adapter 同步/取消语义（6 个测试）
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - 包边界修复（158 未覆盖）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, `packages/flux-compiler/src/schema-compiler-registry.test.ts`

- [x] **P3.1** `crud-renderer.tsx` 改为从 `@nop-chaos/flux-react` 导入 `createReadonlyScopeBinding`
- [x] **P3.2** `resolveGap` 提取到 `flux-react/src/resolve-gap.ts`，`form.tsx` 和 `fieldset.tsx` 已改为从 `@nop-chaos/flux-react` 导入。旧导出已确认不在 `flux-renderers-basic/src/index.tsx`（无消费者）
- [x] **P3.3** `schema-compiler-registry.test.ts` 不再导入 `@nop-chaos/flux-renderers-data`

Exit Criteria:

- [x] `crud-renderer.tsx` 从 `@nop-chaos/flux-react` 导入
- [x] `resolveGap` 存在于 `flux-react`，`flux-renderers-form` 不再导入 `@nop-chaos/flux-renderers-basic`
- [x] `schema-compiler-registry.test.ts` 不再导入 `@nop-chaos/flux-renderers-data`
- [x] 无新增 `flux-renderers-data` 到 `flux-compiler` 的依赖
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/architecture/flux-runtime-module-boundaries.md` 已更新包依赖关系
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - 目录结构归组

Status: cancelled
Reason: 目录归组是人类可读性优化，不改变任何架构契约或运行时行为。对 AI 驱动的开发模式而言：(1) 扁平目录结构比 barrel re-export 间接层更直接可定位；(2) 51 个文件移动 + 数百条 import 更新属于纯机械操作，工作量大但零语义收益；(3) barrel index.ts 增加每次定位实际实现的穿透成本。如果未来人类团队接手且目录浏览体验成为痛点，可单独排期。

### Phase 5 - i18n 修复

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-inspector.tsx`

- [x] **P5.1** `designer-inspector.tsx` 所有硬编码中文替换为 `t('flux.flowDesigner.inspector.xxx')`（22+ key）
- [x] **P5.2** `zh-CN` 和 `en-US` 翻译文件已更新（`inspector` key set）

Exit Criteria:

- [x] `designer-inspector.tsx` 无硬编码中文
- [x] 所有用户可见文本通过 `t()` 获取
- [x] `zh-CN` 和 `en-US` 已更新
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 - 兼容层收敛与清理

Status: completed
Targets: `packages/flux-compiler/src/action-compiler.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/report-designer-manifest.ts`

- [x] **P6.1** `extractLegacyPayload` 已从 `action-compiler.ts` 删除（超出计划预期，直接删除而非 @deprecated）
- [x] **P6.2** `host-data.ts` / `report-designer-manifest.ts`：`ReportDesignerHostData` 接口中 `selection`/`target` 已移除。`buildReportDesignerScopeData()` 不再提供 `selection`/`target` 别名。manifest 中 `selection`/`target` 兼容别名已删除，仅保留 canonical `selectionTarget`。

Exit Criteria:

- [x] `extractLegacyPayload` 已删除
- [x] `host-data.ts` / manifest 的 `selection`/`target` 别名完全清除
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/architecture/flux-runtime-module-boundaries.md` 已更新兼容层清理结论
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] Phase 1-6 所有 Exit Criteria 已满足（P2.3 descoped with reason）
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过
- [x] 无行为变更（所有现有测试保持通过）
- [x] 无新增 `any` 类型或 `@ts-ignore`
- [x] 所有涉及文件变动的 `docs/architecture/` 已更新
- [x] `docs/logs/` 每个实施日均有条目
- [x] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status: completed. All phases landed. P2.3 (table-quick-edit-controller scope subscription) descoped: `useSyncExternalStore` creates a feedback loop (internal `rowScope.update` → snapshot change → useEffect resets savedValue → dirty always false); `record` prop already propagates external changes from parent re-render.

Closure Audit Evidence:

- Reviewer / Agent: independent sub agent (ses_22189672bffeaQjXeNcNwScVYC + ses_2217dadf2ffeSFeyQhbkAXgOMP) + follow-up session
- Evidence: Phase 1/3/5/6 code verified as landed. P2.3 descoped with documented reason. P2.5 6 adapter tests added (`field-utils.unit.test.tsx`). P6.2 manifest aliases removed. P3.2 resolveGap dead export confirmed absent. All 3 `flux-runtime-module-boundaries.md` gaps filled.

Follow-up:

- `runtime-factory.ts` 的 `disposed` 布尔值 → 当前可接受（同步 dispose 门控）
- 大型测试文件拆分 → 独立排期
- `designer-xyflow-canvas.tsx` DOM patch 提取 → flow-designer 优化专项
- `schema.ts` legacy compatibility carriers → 下个大版本清理
- `table-data.ts` `legacy-index` 兜底 → 观察期
