# 89 Scope Visible View And Materialization Refactor Plan

> Plan Status: planned
> Last Reviewed: 2026-04-15
> Source: `docs/analysis/2026-04-15-scope-state-and-materialization-optimization-report.md`, `docs/architecture/flux-core.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/api-data-source.md`, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md`, `docs/plans/53-scope-ownership-and-isolation-alignment-plan.md`, `docs/plans/54-table-row-projection-and-isolation-plan.md`, `docs/plans/77-renderer-hot-path-perf-and-memory-continuation-plan.md`, `docs/plans/83-scope-debug-renderer-and-component-lab-integration-plan.md`

## Purpose

收口当前 `ScopeRef` 中“own snapshot / visible lexical view / plain-object materialization”三种语义长期混在 `read()` 里的问题，把 scope 读取模型重构为：

- `readOwn()` = owner-local snapshot
- `readVisible()` = prototype-backed visible lexical view
- `materializeVisible()` = 显式 plain-object flatten

并同步完成与此相关的 runtime/formula/request/overlay/debugger 代码迁移，以及 owner docs 的基线更新。

## Current Baseline

- `packages/flux-runtime/src/scope.ts` 当前只有 `readOwn()` 和 `read()`：`read()` 在非 isolated child scope 上通过 `{ ...parent.read(), ...own }` 物化 merged plain object，并把这个 merged object 作为 visible scope fallback。
- `packages/flux-runtime/src/scope.ts` 的真实持久状态本质上只有 own snapshot；merged object 只是缓存后的派生视图，但 API 命名没有明确这一点。
- `packages/flux-formula/src/evaluate.ts` / `packages/flux-formula/src/scope.ts` 当前仍把 `materialize()` 当作 whole visible scope fallback 与 wildcard-ownKeys 语义载体，普通 property access miss 仍可能回落到 `context.materialize()`。
- `packages/flux-runtime/src/request-runtime.ts` 当前把 `includeScope: '*'` 实现为 `scope.read()`，即 visible lexical scope，而不是当前 owner 的 own snapshot。
- `packages/flux-runtime/src/action-runtime-core.ts`、`packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-runtime/src/status-owner.ts` 等 overlay 路径当前仍使用 `{ ...scope.read(), ...bindings }` 这类 spread clone，而不是 prototype-backed overlay view。
- `docs/analysis/2026-04-15-scope-state-and-materialization-optimization-report.md` 已明确建议把 scope 读模型拆成 `readOwn()` / `readVisible()` / `materializeVisible()`，并将 `includeScope: '*'` 收口为 own snapshot only，但当前 architecture docs 和 live code 还未同步。
- `packages/flux-runtime/src/__tests__/scope-read-benchmark.test.ts` 的 opt-in microbenchmark 已给出信号：prototype-backed visible view 在 cached root access 和 rematerialize 路径上显著快于 current `read()` merged object。

## Goals

- 把 `ScopeRef.read()` 从核心契约中移除，替换为 `readVisible()` 与 `materializeVisible()` 的显式分层。
- 让 `ScopeRef` 的唯一真实 retained state 保持为 own snapshot，不再把 merged plain object 当作默认可见读模型。
- 让 `readVisible()` 返回 prototype-backed visible lexical view，用于 point-read 和 overlay view，而不是 eager merged object。
- 把 `materializeVisible()` 收窄为显式 expensive path，只用于 formula broad-access、debugger/scope dump、以及真正需要 own-enumerable plain object 的边界。
- 把 `includeScope: '*'` 收口为 current owner `readOwn()`，不再自动包含 parent lexical scope。
- 把 action/form/status 等 overlay 路径从 spread clone 迁移为 prototype-backed overlay view 或更窄的 `get/has` / local projection。
- 更新相关 architecture docs，使 scope 可见性、request scope injection、dependency-tracking broad-access 语义、renderer/runtime baseline 与 live code 一致。

## Non-Goals

- 不在本计划内重做 row carrier / pure-display table special carrier；row scope 仍沿用现有 narrow + isolated baseline。
- 不在本计划内重新设计 validation architecture。
- 不把所有 runtime plain-object payload 全部一刀切改成 visible view；仅在 scope/materialize 语义明确的边界上收口。
- 不在本计划内实现新的 virtualization 或 table 专用渲染通道。
- 不引入新的外部 benchmark framework；继续使用现有 Vitest opt-in benchmark 和 playground performance page。

## Scope

### In Scope

- `packages/flux-core/src/types/scope.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-runtime/src/status-owner.ts`
- `packages/flux-runtime/src/index.ts` 中 host/projection scope wrappers
- `packages/flux-react` / `packages/nop-debugger` 中与 scope dump、visible snapshot、debug materialization 直接相关的调用点
- `packages/flux-runtime/src/__tests__/scope-read-benchmark.test.ts`
- `apps/playground/src/pages/PerformanceTablePage.tsx`（作为回归观测面）
- 相关 focused tests
- `docs/architecture/flux-core.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/renderer-runtime.md`
- 如需要，再补 `docs/architecture/performance-design-requirements.md`

### Out Of Scope

- `packages/flux-renderers-data/src/table-renderer.tsx` 的 row carrier 架构重做
- form validation owner 模型重构
- source registry / reaction scheduler 的更大范围重写
- flow/report/spreadsheet 专用 host protocol 变化
- 新的 debugger UI 设计

## Execution Plan

### Phase 1 - Scope Contract Rename And Baseline Types

Status: planned
Targets: `packages/flux-core/src/types/scope.ts`, `packages/flux-runtime/src/scope.ts`, `docs/architecture/flux-core.md`, `docs/architecture/scope-ownership-and-isolation.md`

- [ ] 在 `ScopeRef` 中删除 `read()`，引入 `readVisible()` 与 `materializeVisible()`，保留 `readOwn()`。
- [ ] 在 `packages/flux-runtime/src/scope.ts` 中把真实 retained state 明确收口为 own snapshot；`readVisible()` 返回 prototype-backed visible view；`materializeVisible()` 承担 plain-object flatten。
- [ ] 明确 `readVisible()` 不是 store snapshot，也不是 guaranteed plain merged object；必要时引入内部 helper（例如 visible view cache / explicit flatten helper）。
- [ ] 审计并补齐危险 key / prototype pollution 约束，确保 prototype-backed view helper 不对未审计输入无脑 `Object.assign(...)`。
- [ ] 更新 `docs/architecture/flux-core.md` 与 `docs/architecture/scope-ownership-and-isolation.md`，把 scope 读取契约从 `read()` 收口到 `readOwn()` / `readVisible()` / `materializeVisible()`。

Exit Criteria:

- [ ] `ScopeRef` 类型层不再暴露 today-style `read()`。
- [ ] `packages/flux-runtime/src/scope.ts` 的 visible view 与 materialize 语义明确分离。
- [ ] architecture docs 已不再把 visible scope 等同于 merged plain object。

### Phase 2 - Formula Path/Payload Split

Status: planned
Targets: `packages/flux-formula/src/evaluate.ts`, `packages/flux-formula/src/scope.ts`, `docs/architecture/dependency-tracking.md`

- [ ] 把 formula ordinary property lookup 路径从 `materialize()` fallback 中收紧到 `resolve/has` 与 native visible-view point reads。
- [ ] 保留并明确 formula broad-access / wildcard 路径的 `materializeVisible()` 触发边界，如 top-level `Object.keys(scope)`、`JSON.stringify(scope)`、spread-like enumeration。
- [ ] 保证 rootPath dependency collection 继续成立，不因 visible view 切换为 prototype-backed 对象而退回 whole-scope wildcard。
- [ ] 更新 `docs/architecture/dependency-tracking.md`，明确 broad-access 才触发 `materializeVisible()` / wildcard，普通 path access 不再依赖 whole visible object。

Exit Criteria:

- [ ] `packages/flux-formula/src/scope.ts` 中 ordinary property access 不再在普通 miss 上轻易触发 whole visible materialization。
- [ ] wildcard / broadAccess 的语义与 docs 保持一致。
- [ ] focused tests 覆盖普通 path access 与 broad-access 的差异行为。

### Phase 3 - Request And Overlay Semantics Convergence

Status: planned
Targets: `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-runtime/src/status-owner.ts`, `packages/flux-runtime/src/index.ts`, `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

- [ ] 把 `includeScope: '*'` 改为 `readOwn()`，不再包含 parent lexical scope。
- [ ] 保持 `includeScope: string[]` 继续使用 lexical `get(key)`，并在 docs 中明确区分 `'*'` 与显式 key list 的语义。
- [ ] 把 action/form/status/host projection 等 overlay 路径从 `{ ...scope.read(), ...bindings }` 改成 prototype-backed overlay view 或更窄的 `get/has` / local projection。
- [ ] 若需要，引入统一 overlay helper，避免各处重新定义 root-shadowing 逻辑。
- [ ] 更新 `docs/architecture/api-data-source.md` 与 `docs/architecture/renderer-runtime.md`，明确 request scope injection 与 visible view/materialize 的边界。

Exit Criteria:

- [ ] `includeScope: '*'` 已明确只注入 current owner own snapshot。
- [ ] overlay 路径不再以 spread clone whole visible scope 为默认实现。
- [ ] architecture docs 与 live code 对 `includeScope` / bindings overlay 的语义一致。

### Phase 4 - Debug/Inspection/Callsite Cleanup By Compile Errors

Status: planned
Targets: `packages/flux-react/**/*`, `packages/nop-debugger/**/*`, `packages/flux-runtime/**/*`, focused tests, `apps/playground/src/pages/PerformanceTablePage.tsx`

- [ ] 以删除 `read()` 后的 TypeScript 编译报错为索引，逐个调用点按以下规则分类：`get/has`、`readOwn()`、`readVisible()`、`materializeVisible()`、应重设计而非机械平移。
- [ ] 对 scope-debug/debugger/playground 等 scope dump 场景，显式切换到 `materializeVisible()`，不再隐式依赖 visible view 即 plain object。
- [ ] 对 `PerformanceTablePage` 与 `scope-read-benchmark.test.ts` 做回归观测，比较重构前后 point-read / rematerialize / broad-access 结果。
- [ ] 补齐 focused tests，覆盖：visible view point-read、plain-object materialization、`includeScope: '*'` own-only、overlay root shadowing、debug snapshot 行为。

Exit Criteria:

- [ ] workspace 中不再残留对旧 `ScopeRef.read()` 的依赖。
- [ ] debug / scope dump 路径已显式使用 `materializeVisible()`。
- [ ] benchmark 与 playground 至少表明 cached root access 和 rematerialize 路径没有回退。

## Validation Checklist

- [ ] `ScopeRef` 已完成 `read()` -> `readVisible()` / `materializeVisible()` 的语义拆分。
- [ ] `readOwn()` 继续代表唯一 owner-local snapshot 读取。
- [ ] `includeScope: '*'` 已收口为 own snapshot only。
- [ ] formula ordinary path access 不再依赖 whole visible materialization。
- [ ] formula broad-access / wildcard 继续有明确 materialize 边界。
- [ ] overlay 路径不再默认 spread clone whole visible scope。
- [ ] debugger / scope dump / benchmark / playground 已更新并验证新语义。
- [ ] 相关 architecture docs 已更新到最新 baseline。
- [ ] `docs/logs/` 已记录执行与关键决策。
- [ ] focused verification 已完成。
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- prototype-backed visible view 若未处理危险 key，可能引入 prototype pollution 风险；Phase 1 必须先明确危险 key 策略。
- 删除 `read()` 会产生大量编译报错；这是预期内迁移信号，但若 scope 过宽，计划可能被迫扩大。执行时必须坚持 caller 分类规则，避免把所有报错都机械替换成 `materializeVisible()`。
- 如果 formula broad-access 与 ordinary property access 分流不清，容易出现 wildcard 语义漂移或 materialize 路径回流到热路径。
- 若 overlay helper 设计过重，可能重新引入另一层抽象债务；应优先保持 helper 最小，仅服务 root-shadowing 语义复用。

## Documentation Follow-Up

- `docs/architecture/flux-core.md`：更新 scope 读取主契约与 whole-object fallback 描述。
- `docs/architecture/dependency-tracking.md`：更新 broad-access/materialize/wildcard 规则。
- `docs/architecture/api-data-source.md`：更新 `includeScope: '*'` 与 `includeScope: string[]` 的语义分流。
- `docs/architecture/scope-ownership-and-isolation.md`：明确 own snapshot / visible lexical view 的 authoring 心智。
- `docs/architecture/renderer-runtime.md`：更新 bindings overlay / runtime visible scope 说明。
- 如 broad-access 预算规则需要加硬，再同步 `docs/architecture/performance-design-requirements.md`。

## Closure

Status Note: 未完成。关闭前必须完成一次独立 closure audit，确认旧 `read()` 已从 `ScopeRef` 契约和所有 live callers 中移除，`includeScope: '*'` 已收口到 own snapshot only，formula broad-access 与 ordinary path access 已分流，且相关 docs 与 benchmark/playground 结果已同步。

Closure Audit Evidence:

- Reviewer / Agent: <<待补充>>
- Evidence: <<待补充>>

Follow-up:

- 如 row/table 在本计划完成后仍显示出明显 scope carrier 热点，另起 successor plan 处理 lighter row carrier / repeated renderer specialized evaluation。
- 如 broad-access diagnostics 需要单独产品化（budget/telemetry/devtools），另起 successor plan，不在本计划内扩张。
