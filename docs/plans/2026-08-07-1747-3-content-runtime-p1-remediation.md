# 3 content/runtime P1 修复（diff-view reaction 派发 + async-data child scope 泄漏）

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（1-9/1-10）
> Related: `docs/plans/2026-08-06-2306-3-scheduling-graph-wiring-phantom-contracts.md`（22-05 家族「ready() 永不派发」先例）、`docs/plans/2026-08-06-2306-2-create-scope-dispose-pairing.md`（createScope/disposeScope 配对纪律）

## Purpose

把 content 与 runtime 层本轮审计的 **2 条 P1 发现**一次收口：diff-view 4 个 reaction 字段只 `ready()` 不 `dispatch()`（schema 声明的 action 全路径不可达，1-9）、async-data 每次 run/poll 创建 child scope 永不 dispose（`ownedScopeDisposers` 无界增长内存泄漏，1-10）。全部 test-first 落地。

## Current Baseline

- `diff-view-renderer.tsx:291-295`：`REACTION_FIELD_KEYS = ['toggleViewType', 'setViewType', 'expandAll', 'collapseAll']` 全部仅 `reactions[key]?.ready()` 激活（`reactions` 自 `allProps` 顶层解构，:209 处）；:240-277 handle invoke 四分支只做视觉行为（setSingleViewType/setExpansionState）零 `reactions.*.dispatch()`；UI toggle（`toggleViewType` useCallback，:297-299）只切本地状态不派发，接线点在 :319/:355。定义侧 `content-renderer-definitions.ts:557-560` 4 字段全 `kind: 'reaction'`。与 multi-audit 22-13（gantt 同型）根因相同、独立组件实例；calendar 22-05 已建立「触发即派发」家族标准，diff-view 未对齐。diff-view 测试未断言 reaction 派发。
- `api-data-source-controller-runtime.ts:248-255`：每次 data-source run/poll 周期 `input.runtime.createChildScope` 创建 requestScope；`data-source-runtime-utils.ts:93-101` 创建 mappingScope；`runtime-factory.ts:353-372` `createChildScope` 将 scope 注册进 `ownedScopeDisposers` Map（随机 id）。`async-data/` 目录 grep 零 `disposeScope` 调用；controller dispose（`async-data/source-registry.ts:285-308`）只 abort+停控制器不回收 child scope。5s 轮询约 720 条/小时无界增长（Map + scope store + snapshot 链），runtime 生命周期内永不释放。`data-source-poll-timer-dispose-race.test.ts` 只测定时器，scope 泄漏零覆盖。
- 测试基线：content 286 / runtime 1399 tests 全绿。

## Goals

- 2 条 P1 全部以 `Fix` 收口：diff-view 触发（UI toggle + handle invoke 双路径）即派发对应 reaction；async-data 每次 run/poll 周期创建的 child scope 在请求 settle 后 dispose（controller 级 dispose 一并回收）。
- 每条修复先红后绿，锁定正确行为断言。

## Non-Goals

- 不处理 surface scope dispose 缺口（2-12，P2，`createSurfaceScope` 绕过 ownedScopeDisposers）——登记 roadmap Follow-up Backlog。
- 不改变 diff-view 的公开 handle 契约与 reaction 字段定义。
- 不改动 async-data 的 data-source 对外 API。

## Scope

### In Scope

- `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx` + diff-view 测试
- `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`、`data-source-runtime-utils.ts`、`source-registry.ts`（controller dispose 路径）+ data-source 测试

### Out Of Scope

- 其余 content/runtime P2（2-20 copy 提示 setTimeout 等，登记 backlog）
- `createSurfaceScope` 机制改造（2-12，P2）

## Test Strategy

本档选择：**必须自动化**。两条均为已确认 live defect（静默死契约 + 无界泄漏），必须测试先行（Proof 项先于 Fix 项）。

## Failure Paths

| 可测场景编号              | 触发                                      | 行为（含状态码/错误码）                                          | 可重试       | 用户可见表现       |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | ------------ | ------------------ |
| diff-view-reaction-invoke | `component:setViewType` 传入非法 viewType | 句柄返回 `{ok:false, error}`（既有守卫保持），不派发 reaction    | 是           | 无切换、无 action  |
| async-data-abort          | 请求 AbortError / 控制器停止              | child scope 仍按 finally 路径 dispose（AbortError 归一），不泄漏 | 是（新周期） | 无泄漏（内存可测） |
| async-data-run-failure    | 单次 run 失败                             | 该周期 scope 照常 dispose，下一周期可重试                        | 是           | 无泄漏             |

## Execution Plan

### Phase 1 - diff-view reaction 派发（UI toggle + handle invoke 双路径）

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx` + diff-view 测试

- Item Types: `Proof | Fix`

- [x] `Proof` 先红：① UI toggle 路径——mock `props.reactions.*.dispatch`，点击视图切换控件（toggleViewType）后断言 dispatch 被调用（toggleViewType/setViewType/expandAll/collapseAll 四字段至少 UI 可达的逐一断言）；② handle invoke 路径——`component:toggleViewType/setViewType/expandAll/collapseAll` invoke 后断言对应 dispatch 被调用（对齐 gantt 22-13/calendar 22-05 模式）。
- [x] `Fix` 1-9：`diff-view-renderer.tsx` UI toggle（:297-299 useCallback 及其接线点 :319/:355）补 `void reactions[key]?.dispatch()`（`reactions` 为 allProps 顶层解构，非 `props.reactions`）；:240-277 handle invoke 四分支补 dispatch（视觉行为后派发）；对齐「触发即派发」家族标准。
- [x] `Proof` 修复后用例全绿；content 包 286 既有测试零回归。

Exit Criteria:

- [x] UI toggle 与 handle invoke 双路径用例断言 reaction dispatch 调用（修复前红记录）。
- [x] content 包 typecheck 通过、focused 测试全绿。

### Phase 2 - async-data child scope 生命周期（settle 后 dispose）

Status: completed
Targets: `packages/flux-runtime/src/async-data/{api-data-source-controller-runtime.ts,data-source-runtime-utils.ts,source-registry.ts}` + data-source 测试

- Item Types: `Proof | Fix`

- [x] `Proof` 先红：① 多次 run/poll 周期——spy `createChildScope`/`disposeScope`，断言每个 run/poll 周期创建的 requestScope/mappingScope 在请求 settle 后都被 dispose（修复前 dispose 零调用）；② controller dispose 后——断言无残留 ownedScopeDisposers 条目（runtime 层检查或 spy 断言）。
- [x] `Fix` 1-10：run/poll 周期创建的 child scope（requestScope/mappingScope）于请求 settle（finally）后 `disposeScope` 回收；controller dispose（source-registry.ts:285-308）补 child scope 回收；保持 AbortError 路径与既有 dispose 语义（不破坏 data-source-poll-timer-dispose-race 既有测试）。
- [x] `Proof` 修复后用例全绿；runtime 包 1399 既有测试零回归（data-source 家族全部绿）。

Exit Criteria:

- [x] run/poll 周期用例断言每个周期 scope 成对 dispose（修复前红记录）。
- [x] controller dispose 用例断言无残留（修复前红记录）。
- [x] runtime 包 typecheck 通过、data-source 相关 focused 测试全绿。

## Draft Review Record

> 由独立子 agent（fresh session）填写，见 `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule。

- Reviewer / Agent: 独立 review sub-agent `ses_0240db714ffeoD20576kUHlovW`（fresh session，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 全部处理——① Related 路径修正为 `2026-08-06-2306-3-scheduling-graph-wiring-phantom-contracts.md`；② Fix 1-9 访问路径修正为 `reactions[key]?.dispatch()`（allProps 顶层解构，非 `props.reactions`）；③ UI toggle 行号修正为 :297-299（接线点 :319/:355）；④ 补 `## Failure Paths` 表（invoke 非法参数 / AbortError / run 失败路径）；⑤ source-registry 路径补 `async-data/` 前缀

## Closure Gates

- [x] 2 条 in-scope P1 发现全部修复并 test-first 落地（Proof 先红记录可查）
- [x] 无 in-scope live defect 被静默降级到 deferred / follow-up
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（content/runtime 包 focused + 全量）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

无（所有 in-scope 发现均为已确认 live defect，全部入 Fix，无延期项）。

## Non-Blocking Follow-ups

- content/runtime P2 项（2-12/2-20 等）已登记 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog，不影响本 plan 收口。

## Closure

Status Note: 2 Phase 全 completed（2026-08-07）。验证基线 full-green：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32（scheduling 1 条预存在 warning）、`pnpm test` 59/59 task 全绿（content 289 = 286+3、runtime 1402 = 1399+3）；`pnpm check` exit 0（oversized-code-files 仅 2 条既有豁免 locale 文件）。Closure-audit gate 由独立 fresh sub-agent session 执行，证据见下。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（closure audit session，task `ses_02368dd3bffeZvqHeZw6fRmZov`）
- Evidence: 全量复核本 plan（2 Phase 项 + Exit Criteria 全 [x]，Status 全 completed，Plan Status: completed，Closure Gates 全 [x]）。live 源码复验：diff-view 4 处 dispatch 站点（toggleViewType/setViewType/expandAll/collapseAll + UI toggle）存在，非法 setViewType 返回 `{ok:false}` 不派发，reactionsRef 模式无闭包陈旧（handle 注册 deps 不变）；async-data `async-data/` 目录 grep 恰 2 处 createChildScope 全部配对（requestScope finally dispose 覆盖 success/abort/error 三路径、mappingScope try/finally dispose、stop()/reset() drain childScopeIds），AbortError 语义与 data-source-poll-timer-dispose-race 4/4 零回归。独立复跑：content 35 files/289 tests、runtime 1402 passed（+1 既有 benchmark skip）、两包 typecheck 通过、`pnpm check` exit 0（oversized 2 条均为既有豁免 locale）。Verdict: **pass**（0 Blocker / 0 Major / 2 Minor：① plan 基线行号漂移（文件在审计起草后重构，代码站点均存在且修复正确）；② 测试 3 的 `vi.waitFor` 首轮同步检查时序观察——disposeScope 幂等 + disposeScopeTree 对未注册 id 无操作，无泄漏无二次副作用）。

Follow-up:

- 无 remaining plan-owned work（P2 已归 backlog）。
