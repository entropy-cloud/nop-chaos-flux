# {3} Async Lifecycle Abort And In-Flight Race Hardening

> Plan Status: completed
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md
> Last Reviewed: 2026-06-27
> Source: open-ended adversarial audit — F4 (dynamic-renderer shared controller → stale/aborted response wins on refresh-while-loading), F5 (FormRenderer cleanup doesn't clear inFlightInitKeyRef → dep-change-during-in-flight silently drops init)

## Purpose

收口两个 pre-existing 但落入本 mission "async/in-flight 正确性"主题、且位于 mission 刚重构过的文件内的 lifecycle race：让"任一 `run()` 在单个 effect 生命周期内可达超过一次"的组件捕获 per-invocation abort controller，让"in-flight guard ref"在被 abort 的同一 cleanup 中被清理。两者均无回归测试，本计划同时提炼可复用的"dep-change-during-in-flight"回归测试形态。

## Current Baseline

起草前已对照 live repo 抽查核实：

- **F4（pre-existing, in refactored path，certain）**：
  - `packages/flux-renderers-basic/src/dynamic-renderer.tsx:104-178`：`let controller`（`:104`）是 per-effect-lifecycle 共享变量；`run()`（`:106`）在 `:119` `controller = new AbortController()` 重新赋值；post-await 守卫 `:127` 与 `:156` 读取的是**共享**变量 `controller.signal.aborted`，而非本次调用的 controller。
  - `run()` 在单个 effect 生命周期内可达超过一次：初始 `void run()`（`:172`）+ 暴露的 `refresh` 能力（`:205` → `loadSchemaRef.current.run()`）。
  - refresh-while-loading race：run#1 dispatch AC1 → run#2 abort AC1、`controller = AC2`、dispatch AC2 → run#1 await resolve、读 `controller.signal.aborted`（读到 AC2，未 abort）→ **继续**，用 stale #1 schema clobber run#2 的更新结果；catch 分支对称失败（对 AC1 的有意 abort 被对照 AC2 检查 → 未识别为 cancel → 渲染出虚假 error 状态）。
  - 该共享 controller 模式在 `0b80da30^` baseline 已存在；mission 重构了 load pipeline（`loadAction` 来源迁移到 `props.props.loadAction` + `loadActionRef`）但保留了不可靠的 abort 检查。属"pre-existing 技术债，暴露在 mission 刚重写的路径"。
  - 本组件带 `'use no memo'`（`:68`），React Compiler 显式关闭，手工 refs/effects 是承重结构。
- **F5（pre-existing, theme-adjacent，certain）**：
  - `packages/flux-renderers-form/src/renderers/form.tsx:311-365`：init effect 用两个 ref 去重——`lastInitKeyRef`（成功标记）与 `inFlightInitKeyRef`（并发标记）。
  - cleanup（`:359-364`）abort controller 并 `initActionAbortRef.current = null`，但**未清理 `inFlightInitKeyRef`**。
  - 当 `activationKey` 以外的 dep（`lifecycleScope`/`ownedForm`/`initAction`/`importsReady`/`autoInit`，deps 见 `:365`）在 init in-flight 期间变化：cleanup 运行（abort，留下 `inFlightInitKeyRef === activationKey`）→ 紧随其后的新 effect 体命中 `:320` `if (inFlightInitKeyRef.current === activationKey) return;` 而 bail → 被 abort 的 promise 随后 reject/catch，`finally`（`:350-353`）才清 ref，**为时已晚**。若无后续 dep 变化，该 activationKey 的 `initAction` 永不重新调用。
  - 两 ref 在 `0b80da30^` 已逐字存在；mission 对 form.tsx 的唯一改动是删除 dead `nop-form-body--inline` class（`:537`），未触及 init 逻辑。属"pre-existing、未测试、主题相邻"。
- **两者均无回归测试**。审计建议的复用形态："dep-change-during-in-flight"驱动测试可同时覆盖 F5 与未来 form/dynamic-renderer/source 的同类复发。

## Goals

- **F4**：dynamic-renderer 的 `run()` 捕获 per-invocation controller（`const myController = new AbortController(); controller = myController;`），post-await 守卫检查 `myController.signal.aborted`，使 refresh-while-loading 时更新结果胜出、被 abort 的旧请求不渲染虚假 error。
- **F5**：FormRenderer cleanup 在 `inFlightInitKeyRef.current === activationKey` 时清理该 ref（或改为基于 aborted-state 而非 in-flight 标记的门控），使 dep-change-during-in-flight 后 init 能为同一 activationKey 重新调用。
- 为两处 race 各落地一条回归测试。

## Non-Goals

- 不重构 dynamic-renderer / form 的整体结构或状态机。
- 不强制两组件共用同一抽象（仅共享"测试形态/模式"，不抽公共库）。
- 不处理 carousel（Plan {1}）或 responseAdaptor（Plan {2}）。
- 不在本计划收口 source/crud 渲染器的同类潜在 race（审计 blind-spot，未确认为 live defect → 列 watch-only residual）。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/dynamic-renderer.tsx:104-178`（abort 捕获与 post-await 守卫）。
- `packages/flux-renderers-form/src/renderers/form.tsx:311-365`（cleanup 对 `inFlightInitKeyRef` 的清理 / 门控）。
- 两处各新增回归测试（refresh/dep-change during in-flight）。

### Out Of Scope

- source/crud 渲染器的 init/abort 路径（仅作为 watch-only 复发面记录）。
- abort/in-flight 之外的 form 行为。
- dynamic-renderer 的 schema 校验/可见性逻辑。

## Failure Paths

| 可测场景编号                | 触发                                                                                | 行为                                                                        | 可重试             | 用户可见表现                                        |
| --------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| dyn-refresh-while-loading   | dynamic-renderer load 进行中触发 `refresh` 能力                                     | run#2 的更新 schema 胜出；run#1 被 abort 不渲染 error 状态                  | refresh 可再次触发 | 显示最新 schema，不闪烁 stale 内容或 error          |
| form-dep-change-during-init | form init in-flight 期间 `activationKey` 以外的 dep（如 `initAction` identity）变化 | cleanup 清理 in-flight 标记；新 effect 体为同一 activationKey 重新调用 init | 沿用既有 init 重试 | 表单最终完成 init，不卡在"已 mount 但永不 init"状态 |

## Test Strategy

档位选择：**必须自动化**

两处均为异步数据加载/初始化的核心 lifecycle 回归路径（mission 的 B2 "async request & in-flight" 主题正是此类）。按 guide，"必须自动化"时 Proof 项须先于 Fix。两条回归测试均先以失败态写就。

## Execution Plan

### Phase 1 - dynamic-renderer Per-Invocation Abort (F4)

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:104-178`；新增回归测试

- Item Types: `Proof`, `Fix`

- [x] 先写失败态回归测试：load 进行中触发 `refresh` → 断言更新（run#2）schema 胜出、run#1 被 abort 不渲染 error 状态。(`Proof`，先于 Fix)
- [x] 捕获 per-invocation controller：`const myController = new AbortController(); controller = myController;`，并将 `:127` 与 `:156` 的 post-await 守卫改为检查 `myController.signal.aborted`（而非共享 `controller`）。(`Fix`)
- [x] 回归测试转绿；既有的 dynamic-renderer autoload/abort 行为测试无回归。(`Proof`)

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证 Phase 2 能继续的局部检查。全量验证归 Closure Gates。

- [x] post-await abort 守卫引用 per-invocation controller（repo-observable）。
- [x] 回归测试断言 fresh-wins + abort 不产生虚假 error。

### Phase 2 - FormRenderer In-Flight Guard Cleanup (F5)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx:311-365`；新增回归测试

- Item Types: `Proof`, `Fix`

- [x] 先写失败态回归测试：init in-flight 期间触发 `activationKey` 以外的 dep 变化（如 `initAction` identity）→ 断言 abort 后 init 为同一 activationKey 重新调用。(`Proof`，先于 Fix)
- [x] 在 cleanup（`:359-364`）中，当 `inFlightInitKeyRef.current === activationKey` 时清理该 ref（或改为基于 aborted-state 的门控，使新 effect 体不再因残留 in-flight 标记而 bail）。保持 success-path（`lastInitKeyRef`）语义不变。**实现提示（draft review minor）**：优先采用 aborted-state 门控；若改为 cleanup 清理 ref，须同时让 `.finally`（`:350-353`）的 ref 清理以 controller 身份（`initActionAbortRef.current === controller`）为条件，否则旧 aborted promise 的 finally 会命中"被 re-run 重新设回 `=== activationKey`"的新 in-flight 标记并提前误清新标记。(`Fix`)
- [x] 回归测试转绿；既有 form init/abort 测试无回归。(`Proof`)

Exit Criteria:

- [x] cleanup 清理 `inFlightInitKeyRef`（或等效门控），使 mid-init dep 变化可恢复（repo-observable）。
- [x] 回归测试断言 init 重新调用。

### Phase 3 - Pattern Note And Recurrence Surface

Status: completed
Targets: `docs/architecture/renderer-runtime.md`（仅当其承载 effect-lifecycle/abort 模式时）→ 实际 owner doc 为 `docs/architecture/performance-design-requirements.md` P5（承载 AbortController-in-useEffect 与 "two cancellation layers" 模式）；source/crud watch-only 已在本计划 `## Deferred But Adjudicated`

- Item Types: `Follow-up`

- [x] 仅当 `docs/architecture/renderer-runtime.md`（或对应 owner doc）已文档化 effect-lifecycle/abort 模式时，补充两条规则（仅当前设计状态，见 Rule 14）："单个 effect 生命周期内可达超过一次的 `run()` 必须捕获 per-invocation controller"、"in-flight guard ref 必须在与 abort 同一 cleanup 中清理"；若 owner doc 未承载该模式则跳过（不写 boilerplate）。(`Follow-up`)
- [x] 将 source/crud 渲染器的同类潜在 race 记录为 watch-only 复发面（写入 `## Deferred But Adjudicated` / `## Non-Blocking Follow-ups`）。(`Follow-up`)

Exit Criteria:

- [x] owner-doc 仅在确实承载该模式时更新；source/crud 复发面已显式记录为 watch-only。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent general sub-agent (fresh session `ses_0fb4b2f81ffepqyZMBuCV8ELQm`)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: zero Blocker / zero Major; 1 non-blocking Minor incorporated (Phase 2 F5 prefer aborted-state gating, else guard `.finally` ref-clear on controller identity to avoid old aborted promise clearing new in-flight marker). All references verified live: dynamic-renderer `:104/119/127/156/172/205` + `'use no memo'` `:68`; form `:311-365`, `:320` bail, `:350-353` finally, `:359-364` cleanup (does NOT clear inFlightInitKeyRef). source/crud watch-only classification confirmed legitimate (audit blind-spot, not hidden in-scope defect).

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 在此跑一次。

- [x] F4 / F5 两处 race 均已修复（per-invocation abort + in-flight guard cleanup）。
- [x] 两处回归测试已落地并转绿。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（source/crud 已显式裁定为 watch-only residual）。
- [x] owner-doc 仅在承载该模式时同步。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### source/crud 渲染器 init/abort 同类 race

- Classification: `watch-only residual`
- Why Not Blocking Closure: 审计 blind-spot 自评明确指出未读 table/source/crud 集群的 init/abort 路径；未确认为 live defect。本计划仅收口已确认的 F4/F5。该复发面用本计划提炼的"dep-change-during-in-flight"测试形态在未来审计中验证即可，不影响 F4/F5 的 closure 成立。
- Successor Required: `no`（若未来审计确认则为 yes）
- Successor Path: 未来 deep-audit / plan 若确认 source/crud 存在同类 race。

## Non-Blocking Follow-ups

- 将"dep-change-during-in-flight"测试形态沉淀为可复用约定（不强制抽公共测试工具），供未来 form/dynamic-renderer/source 复发时参考。

## Closure

Status Note: F4（dynamic-renderer per-invocation abort）+ F5（FormRenderer in-flight guard cleanup）两处 pre-existing async/in-flight race 均已收口，各带先失败后转绿的回归测试；owner doc `performance-design-requirements.md` P5 已补两条规则；source/crud 同类 race 记为 watch-only residual。全量 typecheck/build/lint/test 全绿，独立 fresh-session closure-audit pass-with-minors。

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor, fresh session `ses_0faf8b99bffeY6unN7VKzI0JoD`（adversarial，未参与实现；Fresh Context 三件套：plan + diff summary + verification output）
- Evidence: 独立审阅 plan + 3 个改动文件 + 2 个新测试 + docs diff；独立重跑两条回归测试靶向确认（flux-renderers-basic 409/409、flux-renderers-form 547/547 全绿），并按 pre-fix 代码路径追溯确认 "fails-before / passes-after"。F4：per-invocation `myController` 捕获 + 两处 post-await 守卫迁移；共享 `controller` 仍驱动 abort 闭包与 cleanup，无既有 stale-clear / teardown 回归。F5：cleanup 在 controller-identity 块内清理 `inFlightInitKeyRef`；`.finally` marker-clear 加 controller-identity 守卫，精确防止旧 aborted promise 误清新 re-run marker（draft-review concern 收口）；success / activationKey-change / unmount 三路径重溯无回归。测试断言可观测行为（DOM `[data-error]` 缺失、schema 胜出、initAction 重新调用、signal-aborted），非仅"无异常"。Scope 诚实——diffstat 仅 F4/F5/Phase 3，无静默降级；source/crud watch-only 分类合法并记于 `## Deferred But Adjudicated`。Docs 加入真正的 pattern owner（`performance-design-requirements.md` P5），非 boilerplate。Verdict: pass-with-minors（2 条 non-blocking 测试 hygiene minor；0 blocker / 0 major）。其中一条 minor（tautological `waitFor` + 手工 microtask flush）执行 session 已顺带修正为对 `[data-error]`-null 的直接 `waitFor`。

Follow-up:

- 无剩余 plan-owned work。Non-blocking：`docs/plans/...## Non-Blocking Follow-ups` 已记——将"dep-change-during-in-flight"测试形态沉淀为可复用约定，供未来 form/dynamic-renderer/source 复发时参考；source/crud init/abort 同类 race 为 watch-only residual（successor: no，若未来审计确认则 yes）。
