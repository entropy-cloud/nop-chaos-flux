# 215 Performance Measurement And Debugger Gating Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-05
> Source: live repo audit of `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/schema.ts`, `packages/nop-debugger/src/{adapters.ts,controller.ts,diagnostics.ts,diagnostics-failures.ts,store.ts,panel/overview-tab.tsx,panel/node-tab.tsx}`, `docs/architecture/{performance-design-requirements.md,debugger-runtime.md,playground-experience.md}`
> Related: `docs/plans/140-nop-debugger-ai-explanation-contracts-and-test-hardening-plan.md`, `docs/plans/214-report-designer-performance-hot-path-closure-plan.md`

## Purpose

把当前仓库里“能看起来像性能测试，但数字不够可信”的几块表面收口成一套更可靠的性能测量基线，重点包括：修正 playground `performance-table` 页面的测量方法、补齐 `nop-debugger` 对更新/渲染突增的可判读指标、并把所有调试/诊断开销严格限制在显式 debug/perf 模式下，避免普通运行路径为调试信息付热路径成本。对于 playground 页面，本计划只追求同一环境内可解释、可重复比较的页面级测量，不把该页面提升为跨机器、跨环境的 benchmark 平台。

## Current Baseline

- `apps/playground/src/pages/performance-table-page.tsx` 当前提供 mode 切换、React `Profiler`、以及 `Run 20 Host Mutations` 按钮，但页面上的 live metrics 并不实时同步当前 `Profiler` 数据，批次 summary 也混入 `requestAnimationFrame` 节拍与全局累计值，不能作为严格 benchmark 结果。
- 当前 performance page 更接近“重负载探针页”而不是“可信性能测试页”：它可以帮助发现明显退化，但不能稳定回答一次交互到底触发了多少真实更新、哪些数字可比较、以及不同场景间差异是否可归因。当前 live baseline 也不是“1000 行同时可见渲染成本”，而是“1000-row dataset with paged visible rows plus selected stress blocks”。
- `nop-debugger` 已有 `render:start` / `render:end`、overview/group counts、node diagnostics、interaction trace 等事件与聚合能力，但这些更偏调试事件流，不是交互级性能测量契约。
- `nop-debugger` 当前 `countsByGroup.render` 会同时计入 `render:start` 和 `render:end`，且 `render:start` 还带有每 `nodeId` 100ms 节流；因此现有计数不足以单独证明“没有过多更新”。
- `docs/architecture/performance-design-requirements.md` 已明确要求 hot path 避免不必要分配、避免 interaction loop 上的重成本 stringify/diagnostics；`docs/architecture/debugger-runtime.md` 也已要求 debugger event append 路径保持轻量、有界，并优先使用 bounded snapshots/query-time derivation。
- 当前缺的不是“完全没有性能/调试约束”，而是一个覆盖所有 instrumentation 边界的显式 enablement contract：哪些 debugger/perf 采集在 disabled mode 下必须完全关闭，哪些能力只允许在显式 debug/perf mode 下开启，以及普通运行路径必须证明自己不承担同等热路径成本。
- live repo 目前还存在一个关键 gating 漏口：`createNopDebugger({ enabled: false })` 的语义并没有贯穿到所有 debugger/runtime debug-data 边界。尤其 `setComponentRegistry()` 当前无论 controller 是否 enabled 都会 `setDebugEnabled(true)`，这意味着本计划必须显式拥有 component-registry debug-data capture 的 gating 决策，而不是只停留在 env monitor/fetcher 包装层。

## Goals

- 把 playground performance page 收口为一个口径清晰、数字可解释、可重复比较的性能测量页。
- 把 playground performance page 收口为一个口径清晰、数字可解释、可重复比较的页面级 comparative measurement surface。
- 为 `nop-debugger` 增加能辅助判断“是否出现异常更新风暴”的指标与查询口径，但不把它扩展成通用 observability 平台。
- 明确并落地 debug-only/perf-only instrumentation gating：非调试模式不执行高频事件采集、深 payload 构造、字符串化或额外聚合。
- 为新的测量契约补齐 focused proof，避免再次出现“页面有数字但数字不可信”的状态。

## Non-Goals

- 不做全仓通用 benchmark 基础设施或引入新的重量级 profiling 框架。
- 不把 `nop-debugger` 扩展成生产环境常驻 tracing/metrics 平台。
- 不要求通过 debugger 单独证明所有性能结论；debugger 只提供辅助诊断信号，不替代 focused benchmark/profiler proof。
- 不重写 playground 整体信息架构，只处理与 performance page 和 debugger performance diagnostics 直接相关的表面。
- 不为 `performance-table` 页面增加固定毫秒阈值式 CI 通过线；本计划证明的是语义正确、口径诚实、同环境可比较，而不是绝对延迟预算。

## Scope

### In Scope

- `apps/playground/src/pages/performance-table-page.tsx`
- `apps/playground/src/pages/performance-table/{schema.ts,types.ts,index.ts}`
- `apps/playground/src/{route-model.ts,pages/home-page.tsx}` for user-visible performance-page copy alignment
- `apps/playground/src/App.tsx` for the live playground debugger creation/enabling boundary
- `tests/e2e/performance-table.spec.ts` and any directly needed focused tests/proof harnesses
- `packages/nop-debugger/src/{adapters.ts,controller.ts,diagnostics.ts,diagnostics-failures.ts,store.ts,types.ts}`
- `packages/nop-debugger/src/panel/{overview-tab.tsx,node-tab.tsx,timeline-tab.tsx}` and directly affected focused tests
- debugger automation/report surfaces backed by `getOverview()`, `getNodeDiagnostics()`, `createDiagnosticReport()`, and `exportSession()`
- `packages/flux-runtime/src/component-handle-registry.ts` for debugger-disabled debug-data gating
- directly affected owner docs: `docs/architecture/{performance-design-requirements.md,debugger-runtime.md,playground-experience.md}` if the supported baseline changes

### Out Of Scope

- unrelated report-designer / spreadsheet / flow-designer performance work already owned by other plans
- generic debugger UI redesign unrelated to performance diagnostics meaning or debug-only gating
- production telemetry/export pipelines, remote tracing, or backend metrics collection
- arbitrary renderer-by-renderer microbenchmark coverage across the whole monorepo
- changing debugger AI explanation contracts except where wording must stay consistent with corrected performance-diagnostics semantics

## Execution Plan

### Phase 1 - Freeze Measurement And Gating Contracts

Status: completed
Targets: `docs/architecture/{performance-design-requirements.md,debugger-runtime.md,playground-experience.md}`, in-scope live code surfaces

- Item Types: `Decision | Proof`

- [x] [Decision] Re-audit the current performance page and debugger surfaces, then freeze one explicit contract for what each surface is allowed to claim: exploratory stress probe, interaction-level measurement, or debug-only diagnostics signal.
- [x] [Decision] Resolve the gating model explicitly: define what counts as a true debugger-disabled runtime path in this repo, whether performance diagnostics require a separate explicit gate, and which files own that boundary (`apps/playground/src/App.tsx`, `packages/nop-debugger/src/{controller.ts,adapters.ts,types.ts}`, `packages/flux-runtime/src/component-handle-registry.ts`).
- [x] [Decision] Record a hard owner rule that performance/debugger instrumentation must be explicitly gated by debug/perf mode and must not impose equivalent hot-path work in ordinary runtime mode.
- [x] [Decision] Define the minimum trustworthy metric set for the performance page and the minimum hint-only diagnostic set for `nop-debugger`, including which numbers are allowed to drive regression judgments, which APIs expose them, and which values remain non-authoritative signals only.
- [x] [Proof] Record the current known trust gaps that must be closed before any surface can claim to measure render/update cost accurately.

Exit Criteria:

- [x] The plan has one explicit current-baseline statement for performance page measurement semantics and debugger performance-diagnostics semantics.
- [x] The repo has one explicit decision for what `debugger disabled` means and where that boundary is enforced.
- [x] The debug-only/perf-only gating rule is explicitly adjudicated as an owner requirement, not an optional optimization idea.
- [x] Required owner-doc update responsibility is recorded; if no doc wording changes are needed after re-audit, explicitly record `No owner-doc update required`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Make Playground Performance Measurements Trustworthy

Status: completed
Targets: `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/performance-table/{schema.ts,types.ts}`, `apps/playground/src/{route-model.ts,pages/home-page.tsx}`, focused tests/proof

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Replace the current mixed wall-time/average-baseline math with batch-local measurement that distinguishes scheduling time, commit count, and commit-duration aggregates instead of averaging global cumulative values.
- [x] [Fix] Ensure the performance page UI only displays metrics that are actually synchronized and safe to update without reintroducing profiler-driven render loops.
- [x] [Fix] Ensure batch summaries do not publish “commit-local” numbers until the measured updates have actually committed/quiesced; if a number still includes enqueue/scheduling cost, label it explicitly as such instead of presenting it as render cost.
- [x] [Fix] Split or relabel scenarios so the page no longer overclaims “1000-row render cost” when the live scenario is really “1000-row dataset with paged visible rows”, and so individual stressors remain attributable across page copy, route copy, and home-page copy.
- [x] [Proof] Add deterministic helper-level focused proof for batch aggregation math, commit counting/quiescence, reset behavior, and scenario labeling, instead of relying only on the page-level e2e smoke path.
- [x] [Proof] Keep an e2e smoke path proving the page still opens, switches modes, and displays the computed measurement output under the supported baseline.

Exit Criteria:

- [x] The performance page no longer displays stale or mathematically misleading metrics.
- [x] The supported measurement set is explicit and implemented: batch-local commit count, commit-duration aggregates, and any retained scheduling/enqueue duration are synchronized, non-stale, and labeled according to what they actually measure.
- [x] The page and related route/home copy no longer claim full 1000-visible-row render cost when the live baseline is a paged dataset stress surface.
- [x] Deterministic focused proof exists for aggregation math/quiescence semantics, and e2e still covers the supported page workflow.
- [x] Affected owner docs are updated if baseline changed; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Improve Debugger Performance Diagnostics Without Charging Normal Runtime

Status: completed
Targets: `packages/nop-debugger/src/{adapters.ts,controller.ts,diagnostics.ts,diagnostics-failures.ts,store.ts,types.ts}`, `packages/flux-runtime/src/component-handle-registry.ts`, panel tabs, focused tests

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Unify the mixed gating semantics: preserve the existing disabled-mode fast bypass where it already exists, and close the remaining disabled-mode leaks in plugin/controller/runtime-registry paths so high-frequency instrumentation, pre-append payload work (`summary/detail` formatting, redaction, network/payload shaping), and debug-data capture do not execute outside explicit debug/perf mode.
- [x] [Fix] Audit and close the runtime registry debug-data boundary: debugger-disabled controllers must not enable component-registry debug capture, and disabled-mode inspect/debug data collection must be proven off unless an explicit debug/perf mode turns it on.
- [x] [Fix] Refine debugger-side render/update diagnostics so they expose a clearer bounded signal such as interaction-local render events, repeated-node update bursts, unique-node fanout, or other derived churn hints without pretending to be authoritative benchmark data.
- [x] [Fix] Remove or relabel misleading render/update semantics across both UI and automation/report surfaces, especially where throttled `render:start` and unthrottled `render:end` are conflated in `getOverview()`, `getNodeDiagnostics()`, diagnostic reports, or exports.
- [x] [Decision] New debugger performance diagnostics in this plan must derive from the existing bounded event ring or bounded runtime snapshots where possible; this plan does not add a new unbounded per-render or per-async-settle event channel.
- [x] [Decision] Freeze disabled-mode automation semantics: decide whether debugger automation APIs remain present as bounded no-op/empty-result surfaces when disabled or whether host integration hides them entirely, and cover that decision in focused proof.
- [x] [Proof] Add focused tests proving that debugger-disabled mode skips the in-scope instrumentation/debug-data work, while enabled debug mode still produces the intended bounded diagnostics output through UI and automation-facing APIs.
- [x] [Decision] Record any residual debugger performance signals that remain hint-only rather than benchmark-grade, so they are not overclaimed later.

Exit Criteria:

- [x] The repo has one explicit and tested disabled-mode boundary: env wrappers, plugin/controller append paths, and component-registry debug-data capture all respect the same enablement model.
- [x] Debug-enabled diagnostics expose a bounded, documented update-churn signal that is explicitly hint-only unless a narrower authoritative semantic is separately proven.
- [x] Existing misleading render/update semantics are either corrected or clearly demoted across panel UI, controller APIs, diagnostic reports, and exports.
- [x] Focused verification covers both debug-disabled and debug-enabled behavior, including automation-facing API expectations.
- [x] Affected owner docs are updated if Phase 3 changes the documented debugger/runtime behavior; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Close The Proof And Documentation Loop

Status: in progress
Targets: focused tests/proof harnesses, `docs/architecture/{performance-design-requirements.md,debugger-runtime.md,playground-experience.md}`, this plan

- Item Types: `Proof | Decision | Follow-up`

- [ ] [Proof] Re-run the in-scope verification set and confirm the supported measurement/debugger baseline is reflected by focused proof plus retained e2e, not by UI wording only.
- [x] [Decision] Update affected owner docs to state the final supported measurement and gating baseline, including what is page-local comparative measurement, what is debug hint-only, what automation APIs mean, and what is explicitly gated.
- [x] [Decision] Adjudicate any remaining out-of-scope optimization ideas into explicit deferred ownership rather than leaving them as implicit debt.

Exit Criteria:

- [ ] The live repo has one consistent owner-doc story for performance measurement, debugger diagnostics semantics, and debug-only instrumentation cost.
- [ ] Focused proof covers the supported in-scope behavior, and retained e2e only checks the supported user-visible workflow rather than timing budgets.
- [ ] Residual items are explicitly adjudicated instead of silently left as “future maybe”.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] The performance page no longer overclaims inaccurate or stale metrics.
- [ ] The in-scope measurement baseline is explicit: which numbers are trustworthy, what they measure, what they do not measure, and that this page is a same-environment comparative surface rather than a cross-machine benchmark.
- [ ] `nop-debugger` no longer uses misleading render/update counters as if they were authoritative performance conclusions in panel UI, controller APIs, diagnostic reports, or exports.
- [ ] The in-scope debug-only/perf-only gating rule is implemented and verified: the chosen disabled-mode boundary covers env wrappers, plugin/controller paths, and component-registry debug-data capture.
- [ ] Focused proof exists for both the performance page measurement path and the debugger debug-enabled/debug-disabled behavior, including deterministic measurement math checks and automation-facing debugger checks.
- [ ] Affected owner docs are synced to the live baseline, or the plan explicitly records `No owner-doc update required` where appropriate.
- [ ] Independent closure audit confirms no remaining in-scope misleading measurement claim or ungated instrumentation hot path.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### General-Purpose Benchmark Infrastructure

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan only owns the supported baseline for the current playground performance page and debugger instrumentation semantics, not a repo-wide benchmarking framework.
- Successor Required: no

### Production Telemetry Or Remote Observability

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: the current requirement is to keep diagnostics off the ordinary runtime hot path unless explicitly enabled, not to add always-on production telemetry.
- Successor Required: no

## Closure

Status Note: Implementation is landed for phases 1-3 and owner docs are synced, but the plan remains open until the full repo verification set and an independent closure audit complete Phase 4 and the closure gates.

Closure Audit Evidence:

- Pending.

Follow-up:

- None yet. Confirmed in-scope gaps must be fixed before closure.
