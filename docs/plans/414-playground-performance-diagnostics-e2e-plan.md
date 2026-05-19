# 414 - Playground Performance Diagnostics E2E Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/architecture/performance-diagnostics-and-e2e-design.md`
> Related: `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/testing/e2e-standards.md`

## Purpose

把 `apps/playground` 的 `performance-table` 页面从“同环境 profiler 对比页面”推进到“可由 Playwright 读取结构化计数指标、验证 table/array 局部刷新语义的诊断页面”。

本计划只收口 playground performance diagnostics 的第一批可执行能力：table 单行 immutable update 的 locality gate，以及 array-field object item 的可见 render/remount locality gate。它不把绝对耗时变成 CI benchmark，也不承诺 array-field 已经具备 O(1) item-scope subscriber wake-up。若 live implementation 不能直接满足 sibling render delta 为零，本计划必须实施最小 renderer containment 修复并证明结果；不能把 in-scope locality gate 静默转移给 successor 后仍标记 completed。

## Current Baseline

- `performance-table` 当前只接收 `onBack`，没有接收 playground 的 `debuggerController`。
- `PerformanceSchemaStage` 当前只向 `SchemaRenderer` 传入 `schemaUrl`、`schema`、`data`、`env`、`registry`、`formulaCompiler`，没有传入 debugger plugin、decorated env、`onRuntimeChange`、`onComponentRegistryChange`、`onActionScopeChange`、`onActionError`。
- playground 顶层 `createNopDebugger({ id: 'playground-main', capturePerformance: false })` 默认关闭 render capture，这是普通 playground 使用的正确默认。
- `performance-table` 当前依赖 React `Profiler` 聚合 `commitCount`、`totalActualDuration`、`lastActualDuration`、`averageActualDuration`、`maxActualDuration`，并通过 `Run 20 Host Mutations` 产生同页 batch summary。
- `tests/e2e/performance-table.spec.ts` 当前验证页面可进入、模式可切换、host mutation summary 可出现、cell 值正确和 tag-list 交互不产生全局 validation 文案；它不是 locality performance gate。
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts` 当前读取全局 debugger API 的 failure 状态，但因为 performance 页面未接线，该检查不能证明该页面 renderer tree 被 debugger 观测。
- `apps/playground/src/route-model.ts` 当前只解析 hash path segment，`#/performance-table?diagnostics=1` 不会路由到 performance page；如果需要 URL flag，应使用 query-before-hash 或扩展 route parser。
- `docs/architecture/performance-diagnostics-and-e2e-design.md` 已定义当前/目标边界：E2E 可以 gate count-based locality，不应 gate absolute timing；table locality 强于 array-field；array-field 当前只能诚实证明 visible render/remount locality，不能证明 O(1) subscriber wake-up。
- Live code cannot be assumed to satisfy sibling render delta zero yet: `TableBodyRows` still maps visible rows through `renderDataRow()`, and `ArrayFieldRenderer` still maps every `ArrayItem` child when the array value changes. Phase 3 and Phase 4 must either prove current behavior with focused tests or implement the minimal row/item render containment required before asserting locality.

## Goals

- 让 `performance-table` 在保持普通页面默认轻量的前提下，支持显式 diagnostics 模式。
- 在 diagnostics 模式下，把 performance page 接入 `nop-debugger` controller，支持 structured failure/error 查询和 inspect/debugger 诊断。
- 增加 page-local `window.__NOP_PERF_DIAGNOSTICS__`，提供 session 化、可由 E2E 读取的结构化 locality counters。
- 增加 deterministic table single-row locality diagnostic，证明目标 row 更新、代表性 visible sibling row 不 rerender、不 mount/unmount、debugger failures/errors 为零；若现状不满足，实施最小 table row render containment。
- 增加 deterministic array-field object item locality diagnostic，证明目标 item 可见更新、代表性 sibling item 不 rerender、不 mount/unmount、validation path 仍 index-addressed 正确；若现状不满足，实施最小 array item render containment。
- 增加 supported Playwright E2E 诊断 spec，使用 `tests/e2e/fixtures.ts`、fixture-managed `page` 和 `assertTrackedPageErrors(page)`。
- 保留现有 profiler 页面指标，并继续明确它们是 same-page comparative signals，不是 cross-machine benchmark。

## Non-Goals

- 不建立跨机器或跨 commit 的绝对耗时 benchmark 门禁。
- 不把 React `Profiler.actualDuration` 或 Playwright wall-clock 时间作为 hard threshold。
- 不默认开启 debugger render capture 或高频 scope publish capture。
- 不要求 array-field 在本计划中实现 O(1) item-scope subscriber wake-up。
- 不把 `NopDebuggerController.getComponentTree()` 提升为 automation API，除非 Phase 3 明确裁定并同步 `debugger-runtime.md`。
- 不重写 table row-scope architecture；只允许为 locality gate 所需的最小 table row render containment 修复。
- 不覆盖所有 collection renderer；只覆盖 `table` 和 `array-field` 的目标场景。

## Scope

### In Scope

- `PerformanceTablePage` 接收并可选接线 `NopDebuggerController`。
- diagnostics URL/开关解析，使用当前可路由的形态或显式 route parser 变更。
- page-local diagnostics store/API，暴露 latest session、probe counters、changed keys、debugger summary、profiler delta。
- diagnostics-only probe renderer，记录 render/mount/unmount counts，不污染普通页面。
- table single-row immutable update diagnostic action。
- table visible-row render containment 修复，如果 focused proof 显示代表性 sibling row 会 rerender。
- array-field object item visible locality diagnostic scenario/action。
- array-field object item render containment 修复，如果 focused proof 显示代表性 sibling item 会 rerender。
- supported Playwright tests 和必要 React/Vitest focused tests。
- 文档和日志同步。

### Out Of Scope

- 生产 benchmark harness。
- browser long-task/performance timeline percentile reporting。
- 全局 debugger event schema 大改。
- 默认开启 `capturePerformance`。
- 非 performance-table 页面改造。
- array-field item-scope substrate 重构；visible render/remount locality 仍是本计划 closure 必需项，不得用 subscriber substrate 重构缺失作为降级理由。

## Execution Plan

### Phase 1 - Diagnostics Mode And Debugger Wiring

Status: completed
Targets: `apps/playground/src/App.tsx`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/route-model.ts`, `apps/playground/src/app.test.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] `Decision`: 确定 diagnostics flag 的 URL 形态。当前实现使用 router 已可支持的 `/?diagnostics=1#/performance-table`，未扩展 hash query parsing。
- [x] `Fix`: 扩展 `PerformanceTablePageProps`，接收 `debuggerController?: NopDebuggerController` 和 `diagnosticsEnabled?: boolean`。
- [x] `Fix`: 在 `App.tsx` 中向 `PerformanceTablePage` 传入 playground `debuggerController`，并从 URL/query 或等价 host flag 解析 `diagnosticsEnabled`。
- [x] `Fix`: 在 diagnostics 模式下为 `SchemaRenderer` 接入 `debuggerController.decorateEnv(env)`、`plugins={[debuggerController.plugin]}`、`onRuntimeChange -> setRuntime()`、`onComponentRegistryChange -> setComponentRegistry()`、`onActionScopeChange -> setActionScope()`、`onActionError -> onActionError()`。
- [x] `Fix`: 普通模式保持当前 lightweight path，不开启 debugger render capture，不创建高频 diagnostics probes。
- [x] `Proof`: diagnostics mode 必须通过 `window.__NOP_DEBUGGER_API__` 的 existing automation surface 证明该 page renderer tree 被观测。Coverage evidence 必须包含当前 performance schema URL 或 `onRuntimeChange` 捕获的 runtime id，并包含至少一个 active probe/renderer node 的 `inspectByElement()`/inspect result，其 `rendererType`、`instancePath`/schema URL 指向当前 diagnostic page；不能只证明全局 debugger API 存在或任意节点可 inspect。
- [x] `Proof`: 更新或新增 app/route tests，证明 `#/performance-table` 普通路由不变，diagnostics URL 能进入同一页面且开启 diagnostics mode。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 普通 `#/performance-table` 仍显示现有 performance 页面和 `Run 20 Host Mutations`。
- [x] diagnostics URL/flag 进入同一页面并使 `diagnosticsEnabled === true`。
- [x] diagnostics mode 下 `SchemaRenderer` 已接线 debugger controller 的 env/plugin/runtime/component/action callbacks。
- [x] diagnostics mode 下可证明 performance page renderer tree 被 debugger 覆盖，且证明同时绑定 active runtime/schema URL、expected probe/renderer node、以及 diagnostic session/timestamp window。
- [x] 普通模式未开启 diagnostics probes，未引入 debugger render-capture 默认成本。
- [x] Route/app focused tests 覆盖普通和 diagnostics 入口。
- [x] Owner-doc adjudication completed: if route semantics or debugger integration contract changes, update `docs/architecture/playground-experience.md` / `docs/architecture/debugger-runtime.md`; otherwise record `No owner-doc update required` in the log.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Page-Local Diagnostics API And Probe Renderer

Status: completed
Targets: `apps/playground/src/pages/performance-table/diagnostics.ts`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table-page.test.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix`: 新增 page-local diagnostics store，支持 `startSession()`, `completeSession()`, `recordProbeEvent()`, `recordProfilerSnapshot()`, `getLatestSession()`, `clear()`。
- [x] `Fix`: 在 diagnostics mode 下安装 `window.__NOP_PERF_DIAGNOSTICS__`；普通模式不安装或返回 no-op bounded API。
- [x] `Fix`: 定义 `PerformanceDiagnosticSession` 数据结构，至少包含 `id`, `scenario`, `status`, `startedAt`, `endedAt`, `profilerBefore`, `profilerAfter`, `changedRowKeys`, `changedItemKeys`, `probeDeltas`, `debuggerSummary`；`startedAt`/`endedAt` 使用 `Date.now()` epoch milliseconds。
- [x] `Fix`: `probeDeltas` 分别暴露 render、mount、unmount delta；不能只记录 aggregate 或 render-only 计数。
- [x] `Fix`: `debuggerSummary` 区分 `covered: true | false`、coverage evidence、session-scoped failures/errors，并在 debugger 未接线时显式标记 limitation。
- [x] `Fix`: 新增 diagnostics-only `perf-render-probe` renderer，按 `probeKey` 记录 render/mount/unmount，并带上 `instancePath` / `cid` when available；renderer 输出 `data-testid`、`data-probe-key`、`data-cid` inspect anchor。
- [x] `Fix`: 将 probe renderer 只注册在 performance page registry 中，且只由 diagnostics schema 分支使用。
- [x] `Proof`: React/happy-dom focused tests 已覆盖 diagnostics store、window API install/cleanup、以及 basic probe/session bookkeeping。

Exit Criteria:

- [x] `window.__NOP_PERF_DIAGNOSTICS__` 在 diagnostics mode 下可读取 latest session，并且普通 mode 不暴露误导性 active session。
- [x] probe renderer 可记录 render/mount/unmount counts，并按 `probeKey` 聚合。
- [x] probe renderer renders inspectable DOM anchors for target/sibling probes; if `cid` is missing where debugger inspection is required, coverage proof must fail rather than silently pass。
- [x] diagnostics session summary 可同时包含 probe delta 和 profiler delta。
- [x] diagnostics session summary 可表达 debugger coverage evidence、session-scoped failure/error counts、以及未覆盖时的 explicit limitation。
- [x] page unmount 后 window API 不保留 stale active session 或 stale page callbacks。
- [x] Focused tests 覆盖 diagnostics store 与 probe renderer。
- [x] No owner-doc update required unless public diagnostics API is documented outside playground; if documented, update `docs/architecture/performance-diagnostics-and-e2e-design.md`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Table Single-Row Locality Diagnostic

Status: completed
Targets: `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table/*.test.ts`, `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, `tests/e2e/performance-table.spec.ts`

- Item Types: `Fix | Proof`

- [x] `Decision`: 选择目标 row 时必须保证 probe row 在当前 table 可见页中。当前实现固定使用首屏第一页稳定 rowKey `user-25`，并选择同页 visible siblings `user-24` / `user-26`。
- [x] `Fix`: 新增 deterministic action/control：`Run Single Row Locality Diagnostic`，目标 row 固定为稳定合法且当前可见的 rowKey。
- [x] `Fix`: 单行 mutation 现已通过 diagnostics page runtime 的精确 path update 驱动目标 row (`perfRows.<index>.*`)，避免 React host 级整页 `data` replace 把 locality gate 误放大成 broad invalidation；同时保持 host `perfRows` state 与 runtime data 同步。
- [x] `Fix`: diagnostics schema 在目标 row、前一可见 sibling、后一可见 sibling 或固定代表性 visible siblings 上注入 `perf-render-probe`，并确保这些 probes 的 DOM anchors 位于 Playwright/debugger 能 inspect 的 active row subtree 中。
- [x] `Decision`: Focused proof showed unchanged visible sibling row probe deltas already stay at zero once the diagnostic uses precise page-scope path updates, so no additional table row containment change was required for this plan.
- [x] `Fix`: session summary 记录 `changedRowKeys`, `targetProbeDelta`, `siblingProbeDelta`, `unchangedRowUnmountDelta`, `profilerDelta`, `debuggerFailures`, `debuggerErrors`, and pre/post target/sibling visible value snapshots。
- [x] `Proof`: focused React test 验证单行 diagnostic 后 target visible cell value changed、representative sibling visible values stayed stable、changed row key 为所选 target rowKey，target probe render delta > 0，representative visible sibling probe render/mount/unmount delta 为 0。
- [x] `Proof`: Playwright supported test 使用 fixture-managed `page`，进入 diagnostics mode，运行 single-row diagnostic，读取 structured report 并断言 locality counters。

Exit Criteria:

- [x] Diagnostic dataset 使用稳定、非空、无重复、非 index-derived `rowKey`；若检测到无效/重复 key，diagnostic session 必须 fail 而不是产出 locality pass。
- [x] Target row 与 representative sibling probes 在 mutation 前已在当前可见页存在；若 target 不可见，diagnostic 必须 fail 而不是产出 locality pass。
- [x] Single-row mutation 只报告所选 target rowKey，且该 key 稳定、非 index-derived。
- [x] Target row visible value changes in both focused and E2E proof, representative sibling visible values stay stable, and `changedRowKeys` is computed from actual before/after row data rather than only the action payload。
- [x] Target row probe render delta > 0。
- [x] Representative unrelated sibling row probe render delta === 0。
- [x] Representative unrelated sibling row mount delta === 0 and unmount delta === 0。
- [x] Debugger recent failures/errors for the diagnostic session are zero and debugger coverage evidence confirms this page renderer tree was wired; missing coverage is a failed diagnostic for this phase, not a pass with limitation。
- [x] Playwright spec imports from `tests/e2e/fixtures.ts` and calls `assertTrackedPageErrors(page)` after the page ready signal。
- [x] Timing fields are present only as comparative signals; no absolute timing threshold is asserted。
- [x] Owner-doc adjudication completed: update `docs/architecture/performance-diagnostics-and-e2e-design.md` if implemented API names differ from the design doc.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Array Object Item Visible Locality Diagnostic

Status: completed
Targets: `apps/playground/src/pages/performance-table/schema.ts`, `apps/playground/src/pages/performance-table-page.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.test.tsx`, `tests/e2e/performance-table.spec.ts`

- Item Types: `Decision | Fix | Proof`

- [x] `Decision`: 选择 diagnostics 用 array-field 场景。当前实现使用 diagnostics-only object items with deterministic `itemKey` (`line-1`...`line-12`)。
- [x] `Fix`: 在 performance diagnostics schema 中加入 diagnostics-only 最小 object-array editor/probe scenario，包含至少 target item、previous sibling、next sibling；该 scenario 必须在 diagnostics mode 下可见或可运行，不依赖用户先切换普通 `full-stress` mode，除非 E2E 显式切换并 assert target/sibling item probes exist before mutation。
- [x] `Fix`: 新增 deterministic action/control：`Run Array Item Locality Diagnostic`，更新目标 item 的一个 nested field，例如 `lineItems.7.qty`。
- [x] `Decision`: Focused proof showed unchanged object-array sibling item probe deltas already stay at zero in the supported diagnostics scenario, so no additional `ArrayFieldRenderer` containment change was required for this plan.
- [x] `Fix`: session summary 记录 `changedItemKeys`, `targetItemProbeDelta`, `siblingItemProbeDelta`, `unchangedItemUnmountDelta`, `validationPathCheck`, `debuggerFailures`, `debuggerErrors`, `debuggerSummary.covered`, and pre/post target/sibling visible value snapshots。
- [x] `Proof`: focused React test 验证 target item visible value changed、representative sibling visible values stayed stable、changed item key 为目标 `itemKey`、representative sibling item probe render/mount/unmount delta 为 0、validation path 仍绑定到 index-addressed parent form path，并断言写入的是目标 index path 而不是 itemKey path。
- [x] `Proof`: Playwright supported test 读取 structured report，并明确该 gate 只证明 visible render/remount locality，不证明 O(1) subscriber wake-up。

Exit Criteria:

- [x] Plan-owned diagnostics object-array items 使用 deterministic object `itemKey`，且 duplicate/missing itemKey 会使 diagnostic fail and block closure；`skip with explicit limitation` 只允许用于未来 out-of-scope/ad-hoc datasets，不能用于本计划 supported gate。
- [x] Single item mutation 只报告目标 object `itemKey`，且 `changedItemKeys` is computed from actual before/after item data rather than only the action payload。
- [x] Target item visible value changes in both focused and E2E proof, and representative sibling visible values stay stable。
- [x] Target item visible probe render delta > 0。
- [x] Representative unrelated sibling item probe render delta === 0；如果 focused proof fails, containment fix remains in this plan and this phase cannot close until it passes。
- [x] Representative unrelated sibling item mount delta === 0 and unmount delta === 0。
- [x] Validation/writeback path 检查证明 parent owner path 仍为 index-addressed，例如 mutation/validation evidence includes `lineItems.7.qty` and explicitly does not use itemKey-addressed owner path。
- [x] Debugger recent failures/errors for the diagnostic session are zero and debugger coverage evidence confirms this page renderer tree was wired; missing coverage is a failed diagnostic for this phase, not a pass with limitation。
- [x] E2E 文案和 assertions 不声称 O(1) subscriber wake-up。
- [x] Owner-doc adjudication completed: if array-field behavior or supported contract changes, update `docs/architecture/array-field.md`; otherwise record `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Supported E2E And Verification Integration

Status: completed
Targets: `tests/e2e/performance-table.spec.ts`, `tests/e2e/exploratory/performance-table-deep-state.spec.ts`, `docs/testing/e2e-standards.md` adjudication

- Item Types: `Fix | Proof`

- [x] `Fix`: 将 table locality diagnostic spec 放入 supported `tests/e2e/performance-table.spec.ts` 或同目录 supported spec，而不是 exploratory-only。
- [x] `Fix`: 将 array item visible locality diagnostic spec 放入 supported E2E；如果 Phase 4 暂时无法通过，Plan 414 必须保持 blocked/in progress，不能以 successor plan 替代本计划 closure。
- [x] `Fix`: 保持 existing performance-table correctness specs，不用新的 locality specs 替代旧覆盖。
- [x] `Fix`: E2E helper 必须读取 structured diagnostics report，禁止通过 screenshot 或 debugger panel DOM 判断性能。
- [x] `Fix`: E2E helper 必须保证 session freshness：先记录 `browserBefore = Date.now()` 和 previous latest session id，触发 action 时传入或读取 action-generated unique `expectedSessionId`/nonce，poll latest session 直到 `status === 'completed'`，并断言 `latest.id !== previousId`、`latest.scenario === expectedScenario`、`startedAt >= browserBefore`、`endedAt >= startedAt`、report 非空、probe/debugger summary 非空。当前实现用 previous-id mismatch + scenario/timestamp window + completed summary freshness 组合断言；若未来页面暴露 explicit expected session id/nonce，可再收紧。
- [x] `Proof`: Focused Playwright run for performance diagnostics passes with zero tracked console/page errors。
- [x] `Proof`: Relevant app/page/unit tests pass。

Exit Criteria:

- [x] Supported E2E 包含 table single-row locality gate。
- [x] Supported E2E 包含 array object item visible locality gate；若该 gate 未通过，本计划不能标记 completed。
- [x] All new E2E tests use `tests/e2e/fixtures.ts` and fixture-managed `page`。
- [x] All new E2E diagnostics reads prove freshness using unique session id/nonce, previous id mismatch, scenario match, timestamp window, and non-empty report summaries。
- [x] No E2E test asserts absolute duration thresholds。
- [x] Existing performance-table tests still pass and retain prior correctness coverage。
- [x] Focused verification commands and results recorded in `docs/logs/`。
- [x] Owner-doc adjudication completed: update `docs/testing/e2e-standards.md` only if new reusable E2E rules are introduced; otherwise `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 6 - Documentation Sync And Closure Audit

Status: completed
Targets: `docs/architecture/performance-diagnostics-and-e2e-design.md`, `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/array-field.md`, `docs/logs/2026/05-19.md`

- Item Types: `Decision | Proof`

- [x] `Decision`: Compare implemented diagnostics API names, URL shape, and E2E assertions against `docs/architecture/performance-diagnostics-and-e2e-design.md`.
- [x] `Decision`: Adjudicate whether `debugger-runtime.md` needs updates for automation APIs, component-tree access, or diagnostic events.
- [x] `Decision`: Adjudicate whether `playground-experience.md` needs updates for performance diagnostic mode UX/routing.
- [x] `Decision`: Adjudicate whether `array-field.md` needs updates based on Phase 4 findings.
- [x] `Proof`: Final verification after code changes passed: `pnpm typecheck`, `pnpm build`, `pnpm lint`, relevant focused tests, supported Playwright diagnostics tests, and `pnpm test`.
- [x] `Proof`: Independent closure audit was rerun after Phases 1-5 and final plan-text sync; no locality gate was moved out of scope.

Exit Criteria:

- [x] All impacted owner docs are either updated or explicitly adjudicated as `No owner-doc update required` with reason.
- [x] Daily log records final implemented capability and verification results.
- [x] Closure audit is performed by independent reviewer/subagent and recorded with findings/verdict.
- [x] No phase remains `planned`, `in progress`, `blocked`, or moved out of scope if the plan status is `completed`.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] Performance page diagnostics mode is implemented without changing ordinary page default cost.
- [x] Performance page is honestly wired to debugger for diagnostics mode, with coverage evidence that the page renderer tree was observed.
- [x] Page-local `window.__NOP_PERF_DIAGNOSTICS__` exposes structured session reports for E2E.
- [x] Table single-row locality diagnostic passes focused React and supported Playwright gates.
- [x] Array object item visible locality diagnostic passes focused React and supported Playwright gates.
- [x] No absolute timing threshold is introduced as a hard E2E gate.
- [x] Existing performance-table correctness tests remain covered.
- [x] All relevant owner docs are updated or explicitly adjudicated.
- [x] `docs/logs/` includes implementation and verification notes.
- [x] Independent closure audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Relevant focused tests pass.
- [x] `pnpm test`

## Deferred But Adjudicated

### Production Benchmark Harness

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: The architecture deliberately separates count-based E2E locality diagnostics from cross-machine benchmark claims; this plan only implements the former.
- Successor Required: no

### Array-Field O(1) Subscriber Wake-Up Proof

- Classification: `optimization candidate`
- Why Not Blocking Closure: `docs/architecture/performance-diagnostics-and-e2e-design.md` already states current array-field can only honestly target visible render/remount locality without substrate changes.
- Successor Required: no for Plan 414 closure; create a concrete successor only if later product requirements demand subscriber-level proof.

### Debugger Automation Component Tree API

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Locality gates can use page-local probes and existing inspect APIs; exposing controller `getComponentTree()` through `NopDebuggerAutomationApi` is useful but not required for this plan.
- Successor Required: no

## Non-Blocking Follow-ups

- Production benchmark harness: non-blocking out-of-scope improvement; only revisit after count-based diagnostics are stable and a real cross-run timing requirement exists.
- Generic collection-owner locality diagnostics: non-blocking out-of-scope improvement; only revisit after table and array-field diagnostics prove the pattern.

## Closure

Status Note: Completed. Phase 1-6 implementation and closure verification are now aligned with the live repo: diagnostics routing, debugger wiring, page-local diagnostics API, table/array locality gates, route-focused Vitest coverage, focused playground diagnostics tests, supported Playwright diagnostics tests, and repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass. Two unrelated stale test surfaces (`flow-designer-renderers` manifest expectations and `flux-renderers-data` pagination callback assertions) were updated during closure verification so the repo-wide gates honestly reflect the current supported contracts.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1bf24585effe1YmvtK3kKE6bcx`
- Evidence: Final independent closure audit returned `Verdict: acceptable`, `Findings: none`, and `Plan 414 can be marked completed now: Yes`. The audit re-checked the live diagnostics wiring, focused proofs, supported Playwright locality coverage, owner-doc adjudication, and green workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` gates after the final plan-text sync.

Follow-up:

- no remaining plan-owned work
