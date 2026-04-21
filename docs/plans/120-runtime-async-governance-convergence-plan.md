# 120 Runtime Async Governance Convergence Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-21
> Source: `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/form-validation.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/experiments/flux-pragmatic-adoptable-runtime-upgrades.md`, `docs/experiments/next-gen-runtime-vs-current-flux-comparison-v5.md`
> Related: `docs/plans/110-api-request-and-cache-hygiene-plan.md`, `docs/plans/118-flux-internal-kernel-session-refactor-plan.md`, `docs/plans/119-action-precompile-and-args-unification-plan.md`, `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md`

## Purpose

在不重写 Flux 当前 `Action Algebra`、`Operation Control`、`data-source` / `reaction` / `form validation` author-visible contract 的前提下，收口运行时异步治理语义，使“谁拥有一次异步运行、谁可以发布结果、何时判定旧结果失效、调试面如何解释 supersession/cancellation/stale result”变成一套共享底层协议，而不是分散在多个子系统中的近似实现。

## Current Baseline

- `action` / request 路径已经共享 `Operation Control` 基座：`packages/flux-runtime/src/operation-control.ts` 提供 timeout / retry / abort helpers，`request-runtime.ts` 和 action runtime 已使用这条主链。
- `data-source` 已有自己的运行中治理：`packages/flux-runtime/src/data-source-runtime.ts` 维护 `AbortController`、`activeControllers`、`inFlightCount`、refresh dedup（`cancel-previous` / `ignore-new` / `parallel`）以及 `statusPath` 发布，但“哪一轮结果允许 publish”仍由 source 自己的控制流隐含决定。
- `reaction` 已有 debounce、queued trigger、fire-count limit、dispose 以及 changed-path coalescing：`packages/flux-runtime/src/reaction-runtime.ts` 已能避免明显的同步自激循环，但没有统一的 async run identity / supersession metadata contract。
- async validation 已有本地 stale-run 防护：`packages/flux-runtime/src/form-runtime-validation.ts` 和 owner 相关模块维护 debounce cancellation、run id / supersession 语义，并要求 stale async completions 不得发布，但这套机制仍是 validation-local 逻辑。
- `docs/architecture/api-data-source.md`、`docs/architecture/form-validation.md`、`docs/architecture/action-interaction-state.md` 已分别定义 source status、validation stale-run suppression、以及 owner-facing interaction state，但没有一个共享文档统一定义 async owner 的 run-governance contract。
- `docs/architecture/debugger-runtime.md` 已定义统一事件模型和 automation API，但当前 debugger 还没有稳定的跨 owner async-governance 诊断面，无法用同一套字段回答 “这次为什么被 superseded / cancelled / stale-dropped”。
- live repo 现状不是“没有异步控制”，而是“请求执行控制已经比较统一，owner-level async result governance 还没有完全统一”。

## Goals

- 为 runtime-owned async owners 定义一套共享的 run-governance substrate：run identity、supersession、publish gate、settle metadata、debug snapshot。
- 保持 `Operation Control` 继续负责 timeout / retry / abort / debounce / dedup 等执行控制，不把它改造成 owner-state 协议。
- 让 `data-source`、`reaction`、async validation 对 stale-result discard 的语义一致，并能用同一种调试语言解释。
- 明确哪些子系统必须接入共享 async governance，哪些只需要继续复用 `Operation Control` 而不需要 owner-level epoch。
- 为 debugger / automation 暴露最小可用的 async diagnostics surface，而不是让每个子系统输出不同的调试摘要。

## Non-Goals

- 不把所有异步能力合并成一个新的 giant runtime object。
- 不重写 `Action Algebra`、`parallel`、`then`、`onError` 或 `Operation Control` 的 author-visible contract。
- 不把所有 action dispatch 都强制改成 latest-only owner model。
- 不在本计划中引入全局 public `commit()`、transaction graph、signal-first runtime、或新的 Effect primitive。
- 不重做 request cache、request serialization、polling cadence；这些由既有 owner plans 继续负责。
- 不扩展 generic hidden auto-loading/auto-disabled 推断规则；交互态 owner 仍遵循 `docs/architecture/action-interaction-state.md`。

## Scope

### In Scope

- `packages/flux-runtime/src/operation-control.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- debugger-facing runtime diagnostics surfaces and related tests/docs
- architecture/docs/log entries needed to freeze the shared async-governance baseline

### Out Of Scope

- `ActionSchema` exported DSL redesign
- source/result authoring redesign beyond what is needed for runtime governance
- validation graph redesign
- host/domain-specific async runtime protocols outside Flux core runtime
- full debugger product UX redesign unrelated to async diagnostics

## Problem

- `Operation Control` 目前统一的是“这次异步怎么执行”，但 Flux 还缺少统一的“这次异步完成后是否还有资格发布结果”的 owner-level contract。
- `data-source`、`reaction`、async validation 都有 stale-run 防护，但其触发时机、状态记录、错误归类和调试面并不一致。
- abort 并不能覆盖所有 stale-result 情况：某些任务不支持真正 abort，或者 abort 发生太晚，仍需要 publish gate 兜底。
- 如果继续让每个 owner 自己维护近似的 supersession/cancellation 规则，行为会逐渐漂移，debugger 也无法统一解释。

## Design Position

### 1. `Operation Control` 与 async governance 是两层

`Operation Control` 继续回答：

- timeout
- retry
- abort
- debounce
- dedup

shared async governance 回答：

- 这次 run 的 identity 是什么
- 哪次 run superseded 了哪次 run
- 某个 settled result 是否仍可 publish
- 被丢弃的是 cancelled、superseded，还是 stale result after settle
- debugger 如何解释 owner 当前/最近的 async state

### 2. 统一的是 run governance，不是业务语义

本计划不把 `data-source`、`reaction`、async validation、action dispatch 变成同一种业务模型。

统一范围只限于：

- run identity
- publish gate
- settle metadata
- debug surface

各自仍保留：

- `data-source` 的 publication / `statusPath` / refresh policy
- `reaction` 的 watch semantics / loop guard / post-settle scheduling
- validation 的 path/subtree/submit ownership 与 owner-local error publication

### 3. 首轮统一优先覆盖 runtime-owned repeating async owners

首轮必须接入共享治理的 owner：

- API-backed `data-source`
- async `reaction` dispatch
- async validation runs

首轮只做对齐、不强绑 owner model 的路径：

- plain action/request execution
- form submit request path

原则：只有当一个 subsystem 具有“同一 owner 会重复触发异步运行，并持续发布 owner-local state/result”的特征时，才必须接入 shared async governance。

## Execution Plan

### Phase 1 - Baseline Audit And Terminology Freeze

Status: completed
Targets: `docs/architecture/api-data-source.md`, `docs/architecture/form-validation.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/action-interaction-state.md`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`

- [x] 审计 live repo 中 `data-source`、`reaction`、async validation 当前各自的 async run lifecycle、supersession、cancel、stale-result discard 和 debug exposure。
- [x] 冻结共享术语：`runId` / `epoch`、`cause`、`supersededBy`、`publish gate`、`stale result`、`settled outcome`。
- [x] 明确“cancelled”和“superseded but late-settled stale result”不是同一件事，并为代码/文档定义统一归类。
- [x] 明确 action/request 只共享执行控制，不默认强制成为 async owner epoch 模型的一部分。

Exit Criteria:

- [x] 文档能明确说明当前统一了什么、还没统一什么。
- [x] 每个 in-scope owner 都能用同一套术语描述其当前 async lifecycle。
- [x] 计划后续 phases 不再混淆 request execution control 与 owner-level publish governance。

### Phase 2 - Shared Async Run Governance Substrate

Status: completed
Targets: `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/*`

- [x] 设计并实现一个很薄的 runtime-local async governance helper/module，至少提供：begin run、mark superseded、check current run、settle run、emit debug snapshot。
- [x] 明确该 helper 不承担 request transport、cache、orchestration、business publication，只承担 owner-level run identity 与 publish gate。
- [x] 定义统一 metadata shape：`ownerKind`, `ownerId`, `scopeId`, `runId`, `cause`, `startedAt`, `settledAt`, `outcome`, `supersededBy`, `cancelled`, `timedOut`, optional `error` summary。
- [x] 决定 run-governance helper 在 runtime 模块边界中的归属，避免继续把逻辑散落进多个 subsystem 文件。

Exit Criteria:

- [x] shared helper 可以独立回答“这个 settled result 还能不能 publish”。
- [x] helper 的职责边界与 `Operation Control` 明确分开。
- [x] runtime module placement 符合 `flux-runtime-module-boundaries.md` 的 focused-boundary 规则。

### Phase 3 - DataSource Governance Convergence

Status: completed
Targets: `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, related tests

- [x] 让 API-backed `data-source` 用 shared run-governance helper 管理 refresh runs。
- [x] 把现有 `cancel-previous` / `ignore-new` / `parallel` refresh policy 映射到统一 run lifecycle，而不是只靠局部控制流隐含表达。
- [x] 明确定义 stale result publish gate：旧 refresh 即使晚返回，也不得覆盖 newer current run 的 publication/status summary。
- [x] 保持现有 `statusPath` / `DataSourceState` author-visible shape 尽量稳定，只做 additive diagnostics fields when necessary。

Exit Criteria:

- [x] `data-source` 对 superseded refresh 的结果发布规则有 focused tests。
- [x] `parallel` 模式下多 in-flight requests 的 settle 行为仍可解释，且不会错误覆盖 newer authoritative publication。
- [x] `statusPath` 与 source debug snapshot 能解释当前 authoritative run 与 stale-dropped run 的区别。

### Phase 4 - Reaction Async Dispatch Convergence

Status: completed
Targets: `packages/flux-runtime/src/reaction-runtime.ts`, related tests

- [x] 为 reaction 的 async action dispatch 接入 shared run-governance helper。
- [x] 保持 reaction 现有 watch semantics、debounce、fire-count limit 和 post-settle scheduling，不把它改造成 source-like publisher。
- [x] 定义 reaction run supersession 规则：已排队、debounced、running、late-settled 的 reaction dispatch 如何被 newer trigger 取代，以及哪些情况下只合并 changedPaths 而不新开 run。
- [x] 把 reaction debug snapshot 扩展为可解释 queued/running/superseded/disposed 状态，而不是仅暴露 fireCount 和 disposed。

Exit Criteria:

- [x] reaction 的 async dispatch late settle 不会以旧 run 身份误写回 current diagnostics state。
- [x] debounce / queued trigger / running trigger 的关系有明确 repo-observable 语义。
- [x] reaction debug snapshot 能用统一字段解释当前 run state。

### Phase 5 - Async Validation Governance Convergence

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime.ts`, related tests

- [x] 用 shared run-governance helper 吸收 validation 当前 per-path/per-owner stale-run suppression 的共性逻辑。
- [x] 保持 validation 的 owner-local path/subtree/submit priority rules，不把它退化成 generic async task queue。
- [x] 明确 validation run cause taxonomy，例如 `change`, `blur`, `submit`, `subtree`, `dependency-revalidate`。
- [x] 让 stale async validation completion 的 discard 规则、debug metadata、owner summary 语义与 source/reaction 保持同构。

Exit Criteria:

- [x] async validation 仍满足当前 form-validation 文档要求的 supersession/stale-run suppression。
- [x] validation internal run state 不再完全是 validation-local one-off protocol。
- [x] focused tests 能证明 path-level 和 submit-level supersession 都走统一 publish gate。

### Phase 6 - Action/Request Alignment And Debugger Surface

Status: completed
Targets: `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/operation-control.ts`, `docs/architecture/debugger-runtime.md`, related tests/docs

- [x] 明确 action/request 与 shared async governance 的关系：plain action/request 继续停留在 execution-control / monitor metadata 层，不升级成 owner-level epoch subsystem。
- [x] 为 debugger / automation 增加最小统一 async diagnostics surface，可按 owner 查询 recent runs、current run、superseded runs、settled outcomes。
- [x] 保持现有 debugger event budget 和 bounded-retention 规则，不把每次 async settle 都膨胀成不可控 deep payload。
- [x] 评估 `ActionMonitor` / runtime monitor 是否需要 additive async-governance metadata，而不是引入第二套 monitor channel。

Exit Criteria:

- [x] debugger 能回答“为什么这次异步结果没有 publish”。
- [x] event/inspect surface 仍然 bounded，未破坏 debugger performance baseline。
- [x] action/request 不会被误升级成必须持有 owner-local epoch state 的 subsystem。

### Phase 7 - Docs Sync, Verification, And Closure Prep

Status: completed with external workspace blockers noted
Targets: affected runtime modules, `docs/architecture/api-data-source.md`, `docs/architecture/form-validation.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/action-interaction-state.md`, `docs/logs/`

- [x] 把统一后的 async-governance baseline 写回 owner docs，避免多个 subsystem docs 各自发明新术语。
- [x] 增加 focused tests，覆盖 source supersession、reaction async dispatch supersession、validation stale completion discard、debug snapshot consistency。
- [x] 完成 workspace verification，并记录 closure-audit 所需证据。
- [x] 如执行过程中发现 action/request 也需要独立 successor plan，明确拆出而不是隐含留债。

Exit Criteria:

- [x] docs、runtime、tests、debugger 对 async governance 的说法一致。
- [x] 可以基于 live repo 明确回答“统一到了哪一层、没有统一哪些层”。
- [x] leftover work 已明确归属，没有隐含 plan-owned async debt。

## Validation Checklist

- [x] `Operation Control` 与 owner-level async governance 的边界在文档和代码中都明确可见。
- [x] `data-source`、`reaction`、async validation 共享 run identity / publish gate / settle metadata 基线。
- [x] stale-settled result 不会覆盖 newer authoritative owner state。
- [x] cancel、supersede、stale-drop 在 diagnostics 中可区分。
- [x] debugger / automation 能查询统一的 async owner diagnostics。
- [x] `statusPath` / owner-facing interaction state 没有被新的 internal protocol 污染成 breaking author-visible contract。
- [x] focused verification 已完成。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- 如果把 shared async governance 做成 giant abstraction，很容易反向污染 `data-source`、`reaction`、validation 各自的业务语义。
- 如果把 action/request 也强行纳入 owner-level epoch，会错误扩大 scope，并让运行时抽象变得难以解释。
- 如果调试面输出过深的 per-run payload，可能破坏 debugger retention/performance baseline。
- 如果 validation 的 owner-local priority 规则被过度抽象，可能损坏 submit/commit/field-change 现有语义。
- 若执行中发现某个 subsystem 只能通过更大规模重构才能接入 shared substrate，应拆出 successor plan，而不是在当前计划内无限扩宽。

## Closure

Status Note: Plan-owned async-governance convergence work remains landed and closure-audited. A fresh 2026-04-21 workspace verification rerun also completed green, so the previous external-blocker note is no longer needed.

Closure Audit Evidence:

- Reviewer / Agent: general subagent `ses_254b9e11cffeUdf6oSBECb4Igb`
- Evidence: Live audit confirmed shared async governance is landed across runtime-owned async owners (`data-source`, `reaction`, async validation), additive `flux-core` inspection/types, `flux-react` host runtime callback forwarding, and `nop-debugger` async snapshot forwarding. The audit originally found a plan-owned validation cleanup gap on form refresh/dispose; that gap was fixed in `packages/flux-runtime/src/form-runtime-owner.ts` with focused regression coverage in `packages/flux-runtime/src/__tests__/runtime-validation.test.ts`. Fresh workspace verification rerun on 2026-04-21 also passed: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.

Follow-up:

- If action/request-owner diagnostics need a broader contract after Phase 6, split a successor plan instead of enlarging this plan silently.
- If domain-host runtimes need their own async-governance layer later, treat that as separate host-boundary work rather than reopening Flux core runtime scope.
