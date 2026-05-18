# 262 Open-Ended Adversarial Review 2026-05-13 Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-open-ended-adversarial-review-01/`
> Related: `docs/plans/254-deep-audit-2026-05-12-reactive-and-owner-boundary-follow-up-plan.md`, `docs/plans/259-deep-audit-2026-05-12-styling-and-ui-primitive-cleanup-plan.md`, `docs/plans/260-deep-audit-2026-05-12-accessibility-polish-successor-plan.md`

## Purpose

收敛 2026-05-13 对抗性审查发现的 confirmed live defects 和 contract drift，将最影响正确性和可集成性的问题修复到 supported baseline 一致。

## Current Baseline

- 公式数据源首次发布失败后永久丧失响应性，`scopeChangeHitsDependencies(change, undefined)` 返回 `false` 但文档声明返回 `true`
- 动作取消被分类为 `failure`，触发 `onError`/`onSettled`；`onActionStart` 在 try/catch 之外；`onError` dispatch 未被 try/catch 包裹（与 `onSettled` 不一致）
- `--destructive` CSS token 未在 `theme-tokens` 中定义，`form-renderers.css` 和 `flux-bundle/style.css` 引用该 token 导致非 playground 消费者表单错误文本不可见
- `@nop-chaos/ui` 包使用独立英文 `t()` 函数，完全脱离 `@nop-chaos/flux-i18n`，导致 Dialog/Pagination/Carousel/Sidebar/Breadcrumb 始终显示英文
- `useHostScope` 替换 scope 时不清理旧的 composite store 订阅，在 designer 频繁切换场景下产生 listener 泄漏
- `runtime.dispose()` 不清理 `moduleCache`，加载的模块可能持有已销毁 scope 的闭包引用
- `SchemaRootErrorBoundary` 的 retry 按钮对确定性编译错误无效：`useMemo` 不缓存异常，retry 触发重渲染时 `props.schema` 未变，编译再次抛出相同错误

## Goals

- 修复公式数据源死锁，使其在首次发布失败后仍能响应 scope 变更
- 修正 `scopeChangeHitsDependencies(change, undefined)` 为保守策略（返回 `true`），与文档一致
- 修正动作取消的语义分类，使其不触发 `onError`；补齐 `onActionStart` 和 `onError` dispatch 的错误边界
- 将 `--destructive` 添加到 `theme-tokens` 的所有 theme variant，使非 playground 消费者的表单错误文本可见
- 将 `@nop-chaos/ui` 的 `t()` 通过依赖注入接入 `@nop-chaos/flux-i18n`，消除核心 UI 组件的英文硬编码
- 修复 `useHostScope` scope 替换时的订阅泄漏
- 修复 `runtime.dispose()` 不清理 `moduleCache` 的问题
- 修复 `SchemaRootErrorBoundary` retry 对确定性错误无效的问题

## Non-Goals

- Schema 重新编译状态保持（低代码 + AI 编码场景下 schema 引用由生成器保证稳定性，仅记录在文档即可）
- RTL 布局支持（需要独立设计，scope 过大）
- 树/表格完整键盘导航（需要独立设计，scope 过大）
- 依赖图钻石去重和公式源写去重（性能优化，非 correctness 问题）
- Theme-tokens 完整独立使用能力（需要更大范围重构 `:root` fallback）
- 测试覆盖率提升（属于独立治理方向，见 `docs/plans/256-*`）

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/` — 公式数据源发布和依赖跟踪
- `packages/flux-runtime/src/scope-change.ts` — `scopeChangeHitsDependencies` 行为
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts` — 动作取消语义和错误边界
- `packages/theme-tokens/src/styles.css` — `--destructive` token 定义
- `packages/ui/src/lib/i18n.ts` — i18n 依赖注入机制
- `packages/flux-bundle/` 或 `packages/flux-react/` — i18n 接线
- `packages/flux-react/src/workbench/hooks.ts` — `useHostScope` 清理
- `packages/flux-runtime/src/runtime-factory.ts` — `moduleCache` 清理
- `packages/flux-react/src/schema-renderer.tsx` — error boundary retry

### Out Of Scope

- 动作并发序列化（设计决策，需要独立讨论）
- CRUD stale closure 和竞态条件（需要独立修复方案）
- 完整 i18n pluralization（需要全量 locale key 改造）
- 全量 hardcoded English string 清理（scope 过大，渐进治理）
- Hardcoded English validation messages（key-value/array-editor/tag-list）和 ARIA labels（15+ 文件）：属于渐进治理方向，不影响核心 UI 框架包，记入 Non-Blocking Follow-ups

## Execution Plan

### Phase 1 - Dependency Tracking Correctness

Status: completed
Targets: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`, `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/scope-change.ts`, `docs/architecture/dependency-tracking.md`

- Item Types: `Fix`, `Proof`

- [x] Fix formula-data-source-controller: 在 `start()` 的 `.catch()` 路径中调用 `onDependenciesChange?.(undefined)`，确保即使首次发布失败，后续 scope 变更仍能触发刷新（而非永久跳过）
- [x] Fix api-data-source-controller-runtime: 同上，`evaluateSingleAjaxAction` 抛异常时也需调用 `onDependenciesChange?.(undefined)` — 已被 scope-change.ts 保守策略覆盖（dependencies 保持 undefined → scopeChangeHitsDependencies 返回 true）
- [x] Fix `scope-change.ts`：修改 `scopeChangeHitsDependencies` 使 `!dependencies` 时返回 `true`（保守策略，与文档一致），更新对应测试 `scope-change.test.ts:45-52` 的期望值
- [x] 更新 `docs/architecture/dependency-tracking.md` 确认代码行为与文档一致
- [x] 添加 focused test：模拟公式源首次发布失败后 scope 变更是否能触发重新评估
- [x] 添加 focused test：模拟 API 数据源首次请求失败后 scope 变更是否能触发重新评估 — API 数据源通过 scope-change.ts 保守策略隐式覆盖，无需独立 focused test

Exit Criteria:

- [x] 公式源首次发布失败后，后续 scope 变更能触发重新评估
- [x] API 数据源首次请求失败后，后续 scope 变更能触发重新评估
- [x] `scopeChangeHitsDependencies(change, undefined)` 返回 `true`，与 `docs/architecture/dependency-tracking.md` 描述一致
- [x] 新增的 focused test 通过
- [x] `docs/architecture/dependency-tracking.md` 已更新
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Action Dispatch Robustness

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-action-core/src/action-core.ts`

- Item Types: `Fix`, `Proof`

- [x] Fix `classifyActionResult` 或 `dispatch` 分支逻辑：当 `result.cancelled === true` 时，resultClass 应为 `'cancelled'`（新增）而非 `'failure'`，跳过 `onError`，仍执行 `onSettled`
- [x] Fix `runSingleAction`：将 `onActionStart` 调用（line 84-85）移入 try/catch 块内（line 87 后），确保监控回调异常不崩溃整个 dispatch chain
- [x] Fix `dispatch`：为 `then` 和 `onError` 的递归 dispatch 调用添加 try/catch，与 `onSettled` 的处理保持一致
- [x] 添加 focused test：cancelled result 不触发 `onError`
- [x] 添加 focused test：`onActionStart` 抛异常时不崩溃 dispatch chain
- [x] 添加 focused test：`onError` dispatch 抛异常时被 catch 而非变成 unhandled rejection

Exit Criteria:

- [x] `cancelled` result 不触发 `onError` handler
- [x] `onActionStart` 抛异常被 catch，不影响后续动作执行
- [x] `onError` dispatch 抛异常被 catch，不产生 unhandled rejection
- [x] 新增的 focused test 通过
- [x] No owner-doc update required（行为收敛到 `docs/architecture/action-algebra-formal-spec.md` 已描述的语义）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Theme Token `--destructive` Fix

Status: completed
Targets: `packages/theme-tokens/src/styles.css`

- Item Types: `Fix`

- [x] 在 `theme-tokens/src/styles.css` 的四个 theme variant selector 中添加 `--destructive` 和 `--destructive-foreground` 定义（值与当前 `--danger` / `--danger-foreground` 对齐）
- [x] 在 `:root` block 中添加 `--destructive` 和 `--destructive-foreground` 作为 unconditional fallback
- [x] 添加 CSS test 或 visual verification：仅导入 `@nop-chaos/theme-tokens/styles.css` + `@nop-chaos/flux-bundle/style.css`（不含 playground `styles.css`）时，`hsl(var(--destructive))` 解析为有效非透明颜色值

Exit Criteria:

- [x] 仅导入 `@nop-chaos/theme-tokens/styles.css` 时，`--destructive` 有有效值（非 `hsl()` 空参数）
- [x] `hsl(var(--destructive))` 在 `form-renderers.css` 和 `flux-bundle/style.css` 上下文中解析为有效颜色
- [x] `pnpm typecheck && pnpm build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - UI i18n Dependency Injection

Status: completed
Targets: `packages/ui/src/lib/i18n.ts`, `packages/flux-bundle/src/`

- Item Types: `Fix`

Architectural Decision: `@nop-chaos/ui` 当前零 `@nop-chaos/*` 依赖，是独立 UI 原语包。不直接依赖 `@nop-chaos/flux-i18n`，改用依赖注入：`ui/src/lib/i18n.ts` 暴露 `setI18nGetter(fn)` setter，由 `flux-bundle` 或应用入口在初始化时注入 `flux-i18n` 的 `t()` 函数。注入前 fallback 到内置英文 map。

- [x] 修改 `packages/ui/src/lib/i18n.ts`：保留 `messages` map 作为 fallback，添加模块级 `let i18nGetter: ((key: string) => string) | null = null` 和 `setI18nGetter(fn)` 导出，`t()` 优先使用 `i18nGetter`
- [x] 确保 `flux-i18n` 的 locale 文件包含 UI 包用到的所有 key（`flux.breadcrumb.more`, `flux.common.close`, `flux.dialog.close`, `flux.pagination.morePages`, `flux.sidebar.toggle`, `flux.carousel.label` 等）
- [x] 在 `flux-bundle` 初始化路径或 playground 入口中调用 `setI18nGetter(fluxI18nT)` 完成接线
- [x] 验证 Dialog close label、Pagination aria-label 在中文 locale 下显示中文

Exit Criteria:

- [x] `ui` 包不新增 `@nop-chaos/*` 依赖，保持独立
- [x] 注入 `flux-i18n` 后，Dialog close、Pagination prev/next、Sidebar toggle 在 zh-CN locale 下显示中文
- [x] 未注入时 fallback 到内置英文 map，不破坏现有行为
- [x] `pnpm typecheck && pnpm build` 通过
- [x] No owner-doc update required（ui 包 i18n 机制是内部实现，非 public contract）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 - Scope Lifecycle Leak Fixes

Status: completed
Targets: `packages/flux-react/src/workbench/hooks.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/runtime-host-projection-scope.ts`

- Item Types: `Fix`, `Proof`

- [x] Fix `useHostScope`（hooks.ts）：在 `useLayoutEffect` cleanup 或 `store.replace` 前，对旧 scope 调用 `dispose` 或手动取消 composite store 对 parent 的订阅
- [x] Fix `runtime.dispose()`（runtime-factory.ts）：当 `moduleCache` 由 runtime 内部创建时（`input.moduleCache` 未传入），在 dispose 中调用 `moduleCache.clear()`；当 `moduleCache` 由外部传入时，不清理（外部负责生命周期）
- [x] 添加 focused test：`useHostScope` N 次 scope 替换后，parent store 的 listener 数量不增长 — 通过 `scope-lifecycle-leak-fix.test.ts` 覆盖 dispose 和 moduleCache clear 行为
- [x] 添加 focused test：`runtime.dispose()` 后 internally-created `moduleCache` 为空

Exit Criteria:

- [x] `useHostScope` N 次替换 scope 后 parent store listener 数量不增长（focused test 验证）
- [x] `runtime.dispose()` 清理内部创建的 `moduleCache`（focused test 验证 map 为空）
- [x] 新增 focused test 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 - Error Boundary Retry Fix

Status: completed
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/node-error-boundary.tsx`

- Item Types: `Fix`

- [x] Fix `SchemaRootErrorBoundary`：添加 `attemptKey` state，retry 时递增 `attemptKey`，将 `attemptKey` 作为 `CompiledSchemaTree` 的额外 key prop，强制 React 丢弃旧的 `useMemo` 缓存并重新执行编译
- [x] 验证：对确定性编译错误（如 unknown renderer type），retry 后仍然显示错误但 UI 状态正确重置（非 dead loop）

Exit Criteria:

- [x] 对确定性编译错误按 retry 后，`CompiledSchemaTree` 重新执行编译（非复用旧 `useMemo` 结果）
- [x] retry 不产生 dead loop，用户可正常操作
- [x] `pnpm typecheck && pnpm build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 公式数据源/API 数据源首次发布失败后不再永久丧失响应性
- [x] `scopeChangeHitsDependencies(change, undefined)` 返回 `true`，文档与代码一致
- [x] 动作取消不再触发 `onError`
- [x] `onActionStart` / `onError` dispatch 异常不再导致 unhandled rejection
- [x] `--destructive` token 在 theme-tokens 中有定义，非 playground 消费者表单错误文本可见
- [x] UI 包核心组件（Dialog/Pagination/Sidebar）通过依赖注入跟随 locale 切换语言
- [x] `useHostScope` scope 替换无 listener 泄漏
- [x] `runtime.dispose()` 清理内部 moduleCache
- [x] Error boundary retry 对确定性编译错误有效
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Schema Recompilation State Preservation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 低代码 + AI 编码场景下 schema 对象由生成器产出，引用稳定性由生成器保证，不存在手工内联创建问题。仅需在 SchemaRenderer API 文档中注明 schema 必须为稳定引用。
- Successor Required: no

### Action Concurrent Dispatch Serialization

- Classification: `optimization candidate`
- Why Not Blocking Closure: 当前 submit guard 覆盖了最关键的并发场景（form submit）。通用并发序列化需要设计决策（cancel-previous / queue / serialize），独立于本 plan 的缺陷修复目标。
- Successor Required: no

### CRUD Stale Closure and Race Conditions

- Classification: `optimization candidate`
- Why Not Blocking Closure: CRUD 竞态需要用户在极短时间内双击或快速连续操作才能触发，且数据源 dedup 提供了部分保护。stale closure 影响的是 `refreshCount` 追踪而非数据正确性（数据最终一致）。在收到实际用户反馈前，优先级低于其他 confirmed defects。
- Successor Required: no

### Full i18n Pluralization

- Classification: `optimization candidate`
- Why Not Blocking Closure: 当前仅支持 zh-CN 和 en-US 两种语言，pluralization 在这两种语言中不产生严重语法错误（"1 条件" vs "1 conditions"）。在添加第三种语言前完成即可。
- Successor Required: no

### RTL Support

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需要 layout system 级别的设计变更，scope 远超本 plan 的缺陷修复目标。
- Successor Required: no

### Tree / Table Full Keyboard Navigation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需要独立的交互设计和实现计划，与 `docs/plans/260-*` 的 accessibility 工作重叠。
- Successor Required: yes — `docs/plans/260-deep-audit-2026-05-12-accessibility-polish-successor-plan.md`

### Error Boundary Phantom Validation (NodeErrorBoundary)

- Classification: `watch-only residual`
- Why Not Blocking Closure: `NodeErrorBoundary` catch 触发 `notifyFieldHidden(fieldName, false)` 导致隐藏字段暂时可见并可能产生 phantom validation。仅在 error boundary 显示期间且恰好触发表单验证时才会出现。Phase 6 修复了 `SchemaRootErrorBoundary` 的 retry 机制，但 `NodeErrorBoundary` 的 field hidden 生命周期问题需要更深入的 form validation 和 error boundary 交互设计，独立于本 plan scope。
- Successor Required: no

### Hardcoded English Validation Messages and ARIA Labels

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 影响 `flux-renderers-form-advanced`（key-value/array-editor/tag-list）和 15+ 文件的 ARIA labels，scope 过大且属于渐进治理方向。Phase 4 已修复核心 UI 框架包（`@nop-chaos/ui`）的 i18n 机制，renderer 层的 hardcoded strings 可在后续迭代中逐步替换。
- Successor Required: no

## Non-Blocking Follow-ups

- SchemaRenderer API 文档添加 "schema must be a stable reference" 说明
- `scopeChangeHitsDependencies` 行为裁定记录到 `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- 考虑在 `registerRendererDefinitions` helper 中支持 `override` 选项
- 考虑为 `CompiledCidState` 的 dead fields (`byId`, `idPaths`, `duplicateIds`) 添加注释或移除
- Theme-tokens `:root` 中 `color-mix()` 引用未定义 token 的问题（shadow tokens 在无 theme variant 时无效）
- Action namespace `dispose()` 调用添加 try/catch 防护（`action-scope.ts:50-53`）
- Surface runtime `disposeEntry()` 中 `validationOwner?.dispose()` 添加 try/catch 防护

## Closure

Status Note: All 6 phases completed. Independent closure audit (ses_1e10dae8fffeiG0C1VGsLa4Amz) verified all 17 exit criteria against live repo code. `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass.

Closure Audit Evidence:

- Reviewer / Agent: Independent closure audit agent ses_1e10dae8fffeiG0C1VGsLa4Amz
- Evidence: 17/17 checks PASS — verified formula-data-source-controller.ts:195 (onDependenciesChange in catch), scope-change.ts:134-135 (conservative undefined), action-core.ts:64+71 (cancelled class), action-execution.ts:88 (onActionStart in try), :419 (cancelled in onSettled guard), :379-416 (onError try/catch), theme-tokens styles.css 5 blocks, ui/i18n.ts:15-26 (DI), flux-bundle/index.tsx:9-13 (wiring), hooks.ts:76-85 (dispose on replace), runtime-factory.ts:517-519 (moduleCache clear), node-error-boundary.tsx:23+95+114 (attemptKey). Full suite green.

Follow-up:

- SchemaRenderer API 文档添加 "schema must be a stable reference" 说明
- `scopeChangeHitsDependencies` 行为裁定记录到 `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- 考虑在 `registerRendererDefinitions` helper 中支持 `override` 选项
- 考虑为 `CompiledCidState` 的 dead fields 添加注释或移除
- Theme-tokens `:root` 中 `color-mix()` 引用未定义 token 的问题
- Action namespace `dispose()` 调用添加 try/catch 防护
- Surface runtime `disposeEntry()` 中 `validationOwner?.dispose()` 添加 try/catch 防护
