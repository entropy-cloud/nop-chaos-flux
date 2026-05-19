# 414 - Playground Performance Diagnostics E2E Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/architecture/performance-diagnostics-and-e2e-design.md`
> Related: `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/testing/e2e-standards.md`

## Purpose

把 `apps/playground` 的 `performance-table` 页面从“同环境 profiler 对比页面”推进到“可由 Playwright 读取结构化计数指标、验证 table/array 局部刷新语义的诊断页面”。

本计划只收口 playground performance diagnostics 的第一批可执行能力：table 单行 immutable update 的 locality gate，以及 array-field object item 的可见 render/remount locality gate。它不把绝对耗时变成 CI benchmark，也不承诺 array-field 已经具备 O(1) item-scope subscriber wake-up。

## Current Baseline

- `performance-table` 当前只接收 `onBack`，没有接收 playground 的 `debuggerController`。
- `PerformanceSchemaStage` 当前只向 `SchemaRenderer` 传入 `schemaUrl`、`schema`、`data`、`env`、`registry`、`formulaCompiler`，没有传入 debugger plugin、decorated env、`onRuntimeChange`、`onComponentRegistryChange`、`onActionScopeChange`、`onActionError`。
- playground 顶层 `createNopDebugger({ id: 'playground-main', capturePerformance: false })` 默认关闭 render capture，这是普通 playground 使用的正确默认。
- `performance-table` 当前依赖 React `Profiler` 聚合 `commitCount`、`totalActualDuration`、`lastActualDuration`、`averageActualDuration`、`maxActualDuration`，并通过 `Run 20 Host Mutations` 产生同页 batch summary。
- `tests/e2e/performance-table.spec.ts` 当前验证页面可进入、模式可切换、host mutation summary 可出现、cell 值正确和 tag-list 交互不产生全局 validation 文案；它不是 locality performance gate。
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts` 当前读取全局 debugger API 的 failure 状态，但因为 performance 页面未接线，该检查不能证明该页面 renderer tree 被 debugger 观测。
- `apps/playground/src/route-model.ts` 当前只解析 hash path segment，`#/performance-table?diagnostics=1` 不会路由到 performance page；如果需要 URL flag，应使用 query-before-hash 或扩展 route parser。
- `docs/architecture/performance-diagnostics-and-e2e-design.md` 已定义当前/目标边界：E2E 可以 gate count-based locality，不应 gate absolute timing；table locality 强于 array-field；array-field 当前只能诚实证明 visible render/remount locality，不能证明 O(1) subscriber wake-up。

## Goals

- 让 `performance-table` 在保持普通页面默认轻量的前提下，支持显式 diagnostics 模式。
- 在 diagnostics 模式下，把 performance page 接入 `nop-debugger` controller，支持 structured failure/error 查询和 inspect/debugger 诊断。
- 增加 page-local `window.__NOP_PERF_DIAGNOSTICS__`，提供 session 化、可由 E2E 读取的结构化 locality counters。
- 增加 deterministic table single-row locality diagnostic，证明目标 row 更新、代表性 sibling row 不 rerender、不 remount、debugger failures/errors 为零。
- 增加 deterministic array-field object item locality diagnostic，证明目标 item 可见更新、代表性 sibling item 不 rerender、不 remount、validation path 仍 index-addressed 正确。
- 增加 supported Playwright E2E 诊断 spec，使用 `tests/e2e/fixtures.ts`、fixture-managed `page` 和 `assertTrackedPageErrors(page)`。
- 保留现有 profiler 页面指标，并继续明确它们是 same-page comparative signals，不是 cross-machine benchmark。

## Non-Goals

- 不建立跨机器或跨 commit 的绝对耗时 benchmark 门禁。
- 不把 React `Profiler.actualDuration` 或 Playwright wall-clock 时间作为 hard threshold。
- 不默认开启 debugger render capture 或高频 scope publish capture。
- 不要求 array-field 在本计划中实现 O(1) item-scope subscriber wake-up。
- 不把 `NopDebuggerController.getComponentTree()` 提升为 automation API，除非 Phase 3 明确裁定并同步 `debugger-runtime.md`。
- 不重写 table row-scope architecture；本计划只在 playground 加诊断 harness 和测试证明。
- 不覆盖所有 collection renderer；只覆盖 `table` 和 `array-field` 的目标场景。

## Scope

### In Scope

- `PerformanceTablePage` 接收并可选接线 `NopDebuggerController`。
- diagnostics URL/开关解析，使用当前可路由的形态或显式 route parser 变更。
- page-local diagnostics store/API，暴露 latest session、probe counters、changed keys、debugger summary、profiler delta。
- diagnostics-only probe renderer，记录 render/mount/unmount counts，不污染普通页面。
- table single-row immutable update diagnostic action。
- array-field object item visible locality diagnostic scenario/action。
- supported Playwright tests 和必要 React/Vitest focused tests。
- 文档和日志同步。

### Out Of Scope

- 生产 benchmark harness。
- browser long-task/performance timeline percentile reporting。
- 全局 debugger event schema 大改。
- 默认开启 `capturePerformance`。
- 非 performance-table 页面改造。
- array-field item-scope substrate 重构，除非执行中发现 visible locality 也无法诚实成立；若发生，应拆出 successor plan，而不是扩大本计划。

## Execution Plan

### Phase 1 - Diagnostics Mode And Debugger Wiring

Status: planned
Targets: `apps/playground/src/App.tsx`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/route-model.ts`, `apps/playground/src/app.test.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision`: 确定 diagnostics flag 的 URL 形态。优先使用当前 router 可支持的 `/?diagnostics=1#/performance-table`；只有确有必要时才扩展 hash query parsing，并同步 route tests。
- [ ] `Fix`: 扩展 `PerformanceTablePageProps`，接收 `debuggerController?: NopDebuggerController` 和 `diagnosticsEnabled?: boolean`。
- [ ] `Fix`: 在 `App.tsx` 中向 `PerformanceTablePage` 传入 playground `debuggerController`，并从 URL/query 或等价 host flag 解析 `diagnosticsEnabled`。
- [ ] `Fix`: 在 diagnostics 模式下为 `SchemaRenderer` 接入 `debuggerController.decorateEnv(env)`、`plugins={[debuggerController.plugin]}`、`onRuntimeChange -> setRuntime()`、`onComponentRegistryChange -> setComponentRegistry()`、`onActionScopeChange -> setActionScope()`、`onActionError -> onActionError()`。
- [ ] `Fix`: 普通模式保持当前 lightweight path，不开启 debugger render capture，不创建高频 diagnostics probes。
- [ ] `Proof`: 更新或新增 app/route tests，证明 `#/performance-table` 普通路由不变，diagnostics URL 能进入同一页面且开启 diagnostics mode。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 普通 `#/performance-table` 仍显示现有 performance 页面和 `Run 20 Host Mutations`。
- [ ] diagnostics URL/flag 进入同一页面并使 `diagnosticsEnabled === true`。
- [ ] diagnostics mode 下 `SchemaRenderer` 已接线 debugger controller 的 env/plugin/runtime/component/action callbacks。
- [ ] 普通模式未开启 diagnostics probes，未引入 debugger render-capture 默认成本。
- [ ] Route/app focused tests 覆盖普通和 diagnostics 入口。
- [ ] Owner-doc adjudication completed: if route semantics or debugger integration contract changes, update `docs/architecture/playground-experience.md` / `docs/architecture/debugger-runtime.md`; otherwise record `No owner-doc update required` in the log.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Page-Local Diagnostics API And Probe Renderer

Status: planned
Targets: `apps/playground/src/pages/performance-table/diagnostics.ts`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table-page.test.tsx`

- Item Types: `Fix | Proof`

- [ ] `Fix`: 新增 page-local diagnostics store，支持 `startSession()`, `completeSession()`, `recordProbeEvent()`, `recordProfilerSnapshot()`, `getLatestSession()`, `clear()`。
- [ ] `Fix`: 在 diagnostics mode 下安装 `window.__NOP_PERF_DIAGNOSTICS__`；普通模式不安装或返回 no-op bounded API。
- [ ] `Fix`: 定义 `PerformanceDiagnosticSession` 数据结构，至少包含 `id`, `scenario`, `status`, `startedAt`, `endedAt`, `profilerBefore`, `profilerAfter`, `changedRowKeys`, `changedItemKeys`, `probeDeltas`, `debuggerSummary`。
- [ ] `Fix`: 新增 diagnostics-only `perf-render-probe` renderer，按 `probeKey` 记录 render/mount/unmount，并带上 `instancePath` / `cid` when available。
- [ ] `Fix`: 将 probe renderer 只注册在 performance page registry 中，且只由 diagnostics schema 分支使用。
- [ ] `Proof`: React/happy-dom focused tests 验证 probe render/mount/unmount counters、session start/complete、window API install/cleanup 行为。

Exit Criteria:

- [ ] `window.__NOP_PERF_DIAGNOSTICS__` 在 diagnostics mode 下可读取 latest session，并且普通 mode 不暴露误导性 active session。
- [ ] probe renderer 可记录 render/mount/unmount counts，并按 `probeKey` 聚合。
- [ ] diagnostics session summary 可同时包含 probe delta 和 profiler delta。
- [ ] page unmount 后 window API 不保留 stale active session 或 stale page callbacks。
- [ ] Focused tests 覆盖 diagnostics store 与 probe renderer。
- [ ] No owner-doc update required unless public diagnostics API is documented outside playground; if documented, update `docs/architecture/performance-diagnostics-and-e2e-design.md`.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Table Single-Row Locality Diagnostic

Status: planned
Targets: `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table/*.test.ts`, `tests/e2e/performance-table.spec.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix`: 新增 deterministic action/control：`Run Single Row Locality Diagnostic`，目标 row 固定为稳定合法 rowKey，例如 `user-501`。
- [ ] `Fix`: 单行 mutation 必须 immutable replace 目标 row，并保持代表性 sibling row object references 不变。
- [ ] `Fix`: diagnostics schema 在目标 row、前一可见 sibling、后一可见 sibling 或固定代表性 visible siblings 上注入 `perf-render-probe`。
- [ ] `Fix`: session summary 记录 `changedRowKeys`, `targetProbeDelta`, `siblingProbeDelta`, `unchangedRowUnmountDelta`, `profilerDelta`, `debuggerFailures`, `debuggerErrors`。
- [ ] `Proof`: focused React test 验证单行 diagnostic 后 changed row key 为 `user-501`，target probe render delta > 0，representative sibling probe render/mount/unmount delta 为 0。
- [ ] `Proof`: Playwright supported test 使用 fixture-managed `page`，进入 diagnostics mode，运行 single-row diagnostic，读取 structured report 并断言 locality counters。

Exit Criteria:

- [ ] Diagnostic dataset 使用稳定、非空、无重复、非 index-derived `rowKey`；若检测到无效/重复 key，diagnostic session 必须 fail 而不是产出 locality pass。
- [ ] Single-row mutation 只报告 `changedRowKeys: ['user-501']`。
- [ ] Target row probe render delta > 0。
- [ ] Representative unrelated sibling row probe render delta === 0。
- [ ] Unchanged row mount/unmount delta === 0。
- [ ] Debugger recent failures/errors for the diagnostic session are zero when debugger is wired; if debugger capture is unavailable, session must mark limitation explicitly and E2E must not pretend debugger coverage exists。
- [ ] Playwright spec imports from `tests/e2e/fixtures.ts` and calls `assertTrackedPageErrors(page)` after the page ready signal。
- [ ] Timing fields are present only as comparative signals; no absolute timing threshold is asserted。
- [ ] Owner-doc adjudication completed: update `docs/architecture/performance-diagnostics-and-e2e-design.md` if implemented API names differ from the design doc.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Array Object Item Visible Locality Diagnostic

Status: planned
Targets: `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table-page.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.test.tsx` if needed, `tests/e2e/performance-table.spec.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] `Decision`: 选择 diagnostics 用 array-field 场景。必须使用 object items 和 deterministic `itemKey`，避免把 scalar implementation-local compatibility keys 误写成 public architecture contract。
- [ ] `Fix`: 在 performance diagnostics schema 中加入最小 object-array editor/probe scenario，包含至少 target item、previous sibling、next sibling。
- [ ] `Fix`: 新增 deterministic action/control：`Run Array Item Locality Diagnostic`，更新目标 item 的一个 nested field，例如 `lineItems.7.qty`。
- [ ] `Fix`: session summary 记录 `changedItemKeys`, `targetItemProbeDelta`, `siblingItemProbeDelta`, `unchangedItemUnmountDelta`, `validationPathCheck`。
- [ ] `Proof`: focused React test 验证 target item visible value 更新、representative sibling item probe render/mount/unmount delta 为 0、validation path 仍绑定到 index-addressed parent form path。
- [ ] `Proof`: Playwright supported test 读取 structured report，并明确该 gate 只证明 visible render/remount locality，不证明 O(1) subscriber wake-up。

Exit Criteria:

- [ ] Diagnostics object-array items 使用 deterministic object `itemKey`，且 duplicate/missing itemKey 会使 diagnostic fail 或 skip with explicit limitation。
- [ ] Single item mutation 只报告目标 object `itemKey`。
- [ ] Target item visible probe render delta > 0。
- [ ] Representative unrelated sibling item probe render delta === 0，或如果 live implementation 暴露不可避免 sibling render，必须停止本 phase 并创建 successor plan；不得把失败降级成 pass。
- [ ] Unchanged item mount/unmount delta === 0。
- [ ] Validation/writeback path 检查证明 parent owner path 仍为 index-addressed。
- [ ] E2E 文案和 assertions 不声称 O(1) subscriber wake-up。
- [ ] Owner-doc adjudication completed: if array-field behavior or supported contract changes, update `docs/architecture/array-field.md`; otherwise record `No owner-doc update required`。
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Supported E2E And Verification Integration

Status: planned
Targets: `tests/e2e/performance-table.spec.ts`, `tests/e2e/exploratory/performance-table-deep-state.spec.ts`, `docs/testing/e2e-standards.md` if needed

- Item Types: `Fix | Proof`

- [ ] `Fix`: 将 table locality diagnostic spec 放入 supported `tests/e2e/performance-table.spec.ts` 或同目录 supported spec，而不是 exploratory-only。
- [ ] `Fix`: 将 array item visible locality diagnostic spec 放入 supported E2E；如果 Phase 4 发现 live behavior 不支持，则本项必须改为 blocked 并创建 successor plan。
- [ ] `Fix`: 保持 existing performance-table correctness specs，不用新的 locality specs 替代旧覆盖。
- [ ] `Fix`: E2E helper 必须读取 structured diagnostics report，禁止通过 screenshot 或 debugger panel DOM 判断性能。
- [ ] `Proof`: Focused Playwright run for performance diagnostics passes with zero tracked console/page errors。
- [ ] `Proof`: Relevant app/page/unit tests pass。

Exit Criteria:

- [ ] Supported E2E 包含 table single-row locality gate。
- [ ] Supported E2E 包含 array object item visible locality gate，或 Phase 4 已明确 blocked 并由 successor plan 接管。
- [ ] All new E2E tests use `tests/e2e/fixtures.ts` and fixture-managed `page`。
- [ ] No E2E test asserts absolute duration thresholds。
- [ ] Existing performance-table tests still pass and retain prior correctness coverage。
- [ ] Focused verification commands and results recorded in `docs/logs/`。
- [ ] Owner-doc adjudication completed: update `docs/testing/e2e-standards.md` only if new reusable E2E rules are introduced; otherwise `No owner-doc update required`。
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 6 - Documentation Sync And Closure Audit

Status: planned
Targets: `docs/architecture/performance-diagnostics-and-e2e-design.md`, `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/array-field.md`, `docs/logs/2026/05-19.md`

- Item Types: `Decision | Proof`

- [ ] `Decision`: Compare implemented diagnostics API names, URL shape, and E2E assertions against `docs/architecture/performance-diagnostics-and-e2e-design.md`.
- [ ] `Decision`: Adjudicate whether `debugger-runtime.md` needs updates for automation APIs, component-tree access, or diagnostic events.
- [ ] `Decision`: Adjudicate whether `playground-experience.md` needs updates for performance diagnostic mode UX/routing.
- [ ] `Decision`: Adjudicate whether `array-field.md` needs updates based on Phase 4 findings.
- [ ] `Proof`: Run required verification after code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and relevant focused/full tests per repo guidance.
- [ ] `Proof`: Run an independent closure audit only after Phases 1-5 are completed or explicitly moved out of scope.

Exit Criteria:

- [ ] All impacted owner docs are either updated or explicitly adjudicated as `No owner-doc update required` with reason.
- [ ] Daily log records final implemented capability and verification results.
- [ ] Closure audit is performed by independent reviewer/subagent and recorded with findings/verdict.
- [ ] No phase remains `planned`, `in progress`, or `blocked` unless the plan status is not `completed`.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] Performance page diagnostics mode is implemented without changing ordinary page default cost.
- [ ] Performance page is honestly wired to debugger for diagnostics mode, or the plan records a deliberate page-local-only decision and updates owner docs accordingly.
- [ ] Page-local `window.__NOP_PERF_DIAGNOSTICS__` exposes structured session reports for E2E.
- [ ] Table single-row locality diagnostic passes focused React and supported Playwright gates.
- [ ] Array object item visible locality diagnostic passes focused React and supported Playwright gates, or is moved to explicit successor ownership because live behavior cannot honestly satisfy it.
- [ ] No absolute timing threshold is introduced as a hard E2E gate.
- [ ] Existing performance-table correctness tests remain covered.
- [ ] All relevant owner docs are updated or explicitly adjudicated.
- [ ] `docs/logs/` includes implementation and verification notes.
- [ ] Independent closure audit completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] Relevant focused tests pass.
- [ ] `pnpm test` pass or any failures are explicitly identified as unrelated pre-existing blockers per repo practice.

## Deferred But Adjudicated

### Production Benchmark Harness

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: The architecture deliberately separates count-based E2E locality diagnostics from cross-machine benchmark claims; this plan only implements the former.
- Successor Required: no

### Array-Field O(1) Subscriber Wake-Up Proof

- Classification: `optimization candidate`
- Why Not Blocking Closure: `docs/architecture/performance-diagnostics-and-e2e-design.md` already states current array-field can only honestly target visible render/remount locality without substrate changes.
- Successor Required: yes, only if Phase 4 or later product requirements demand subscriber-level proof.
- Successor Path: TBD if needed.

### Debugger Automation Component Tree API

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Locality gates can use page-local probes and existing inspect APIs; exposing controller `getComponentTree()` through `NopDebuggerAutomationApi` is useful but not required for this plan.
- Successor Required: no

## Non-Blocking Follow-ups

- Consider a separate production benchmark harness only after the count-based diagnostics are stable and a real cross-run timing requirement exists.
- Consider generic collection-owner locality diagnostics after table and array-field diagnostics prove the pattern.

## Closure

Status Note: Planned. This plan has not been executed.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- No remaining plan-owned work can be declared until all phases and closure gates are completed or explicitly moved to successor ownership.
