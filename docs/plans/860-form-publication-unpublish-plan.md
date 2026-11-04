# 860 form 外部发布撤回所有权修复（valuesPath/statusPath ownership-aware unpublish）

> Plan Status: active（draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-05
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-B（B1–B3）
> Related: plan 737 Deferred（P1-MA4.5-006 successor = R3.x/MV）、`docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`、`packages/flux-react/src/__tests__/values-path-integration.test.tsx`（RATCHET HISTORY）

## Purpose

修复深审新发现的 B1 缺陷机制：`FormRuntime` teardown 的 `clearExternalPublication()` 无所有权守卫，在 ownedForm 运行时重创建（动态 `valuesPath`/`statusPath`/`formId` deps 变化）场景下，旧 runtime 的延迟 unpublish 会把后继 runtime 刚发布的外部数据覆写为 undefined，使兄弟节点读空。修复后：撤回只发生在"路径仍持有本 runtime 发布值"时；真实卸载的撤回语义保持不变。附带修复 B2 未处理 rejection 通道。

## Current Baseline

- **B1 / Major（本 plan 缺陷本体）**：`packages/flux-runtime/src/form-runtime.ts:285-294` —— `clearExternalPublication` 无条件 `unsubscribe(); publicationActive=false; publishOwnerStatus(parentScope, statusPath, undefined); parentScope.update(valuesPath, undefined)`。发布侧有 `Object.is` 去重（:262-263）但撤回侧无所有权判定——发布与撤回不对称。
- 触发链（深审逐帧追溯）：`packages/flux-renderers-form/src/renderers/form.tsx:87,106,123` ownedForm `useMemo`（:117 起）依赖 resolved props（动态 `valuesPath: "${dialogArgs.key}.query"` 等)；:144-158 StrictMode 延迟 dispose 协议下，新 runtime 渲染期创建并排队 publish（microtask #1），旧 effect cleanup 排队 dispose-check（microtask #2）且 `activeOwnedFormRef` 已指向新 runtime——旧 runtime 的 `clearExternalPublication` 随后在**新 runtime 发布之后**把共享路径覆写 undefined；新 runtime 的 `store.subscribe(publish)` 要到下一次 values 变化才再发布。
- 后果：兄弟公式/`useScopeSelector` 读该路径得 undefined/seed，直到用户再次编辑表单。
- **B2 / Minor**：`form.tsx:458`（提交成功路径）与 `:515`（submitOnChange debounce）`void deliverToSubmitTarget()` 无 `.catch`——`deliverToSubmitTarget`（:396-407）await `handle.capabilities.invoke('querySubmit', …)`（契约允许 reject，`component-handle-core.ts:38-40`）。本仓惯例是 `void x.catch(reportRuntimeHostIssue(...))`（对照 `api-data-source-controller-runtime.ts:31-56,192-203`）。
- **B3 / 已知缺陷（Non-Goal，仅复探）**：valuesPath **初始**发布丢失 = P1-MA4.5-006，诚实棘轮 `values-path-integration.test.tsx`（it.skip + RATCHET HISTORY 注记），successor 归属 R3.x/MV（plan 737 Deferred）。2026-10-31 独立复跑 assertion-biting 变体仍红（echo `__UNPUBLISHED__`）。B1 是**撤回侧**新机制，与初始发布接线是不同缺陷；修复 B1 预期不改变 B3 状态。
- 相关测试基建：`packages/flux-react/src/__tests__/` 有 form 集成测试先例（`test-support-core.js` 提供 formRenderer/env）；flux-runtime 有 form-runtime 单测群。
- Protected areas 核对：改动落 `packages/flux-runtime/src/form-runtime.ts` + `packages/flux-renderers-form/src/renderers/form.tsx`——不在 flux-core protected 面（runtime 属 implement 层）；有 plan + owner docs（`docs/architecture/form-validation.md` / `form-external-publication-and-reserved-bindings.md`）。

## Goals

- B1 修复：`clearExternalPublication` 变为所有权感知——仅当路径当前值仍是**本 runtime** 最后发布的值（identity/内容比对）时才 unpublish；后继已接管（值已非本 runtime 的）时跳过覆写。
- 真实卸载语义保持：路径仍持有本 runtime 值且无后继时，unpublish 照常发生（statusPath 同规则）。
- 判别性测试先红后绿：旧实现必挂、新实现通过的集成测试（microtask 时序经 React 集成面触发，非直接调内部函数）。
- B2 修复：两处 `void deliverToSubmitTarget()` 补 `.catch` → `reportRuntimeHostIssue`。
- B3 复探裁决：修后重跑 assertion-biting 探针，如实记录状态（预期仍红，归 R3.x/MV；若意外转绿则停下查因，不得顺手认领）。

## Non-Goals

- 不修 P1-MA4.5-006 初始发布本体（R3.x/MV successor 所有权不动）。
- 不改发布侧 `Object.is` 去重、不动 StrictMode 延迟 dispose 协议本身。
- 不扩展 valuesPath/statusPath 语义或新增能力。
- 不处理 dialog/drawer 写隔离（plan 737 M1 勘正已裁决的 isolate 语义）。

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime.ts`（clearExternalPublication 所有权守卫 + 相关状态保留）
- `packages/flux-renderers-form/src/renderers/form.tsx`（仅 B2 两处 catch）
- 新增判别性集成测试（flux-react `__tests__`，经 form.tsx 集成面）+ flux-runtime 单测（守卫逻辑单元面）
- `docs/logs/2026/11-05.md`（收口记录）；若修复改变 `docs/architecture/form-external-publication-and-reserved-bindings.md` 所述撤回语义，则同步该 owner doc（Phase 2 exit 判定）

### Out Of Scope

- R3.x/MV 初始发布修复、node-renderer imports overlay 面
- form 提交流/校验流其他行为
- surface/dialog 家族改动

## Failure Paths

| 可测场景编号              | 触发                                                             | 行为                                                    | 可重试 | 用户可见表现           |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ------ | ---------------------- |
| unpublish-vs-successor    | ownedForm 重创建，旧 runtime 延迟 dispose 晚于新 runtime publish | 旧撤回跳过（值非本 runtime 的）；兄弟持续读到后继发布值 | 否     | 数据不消失             |
| real-teardown-unpublish   | ownedForm 真实卸载（无后继），路径仍持有本 runtime 值            | 撤回照常：路径回 undefined，兄弟读到空                  | 否     | 卸载后读空（语义不变） |
| stale-path-no-longer-ours | 路径被第三方（如页面 schema setValue）覆写后本 runtime 卸载      | 撤回跳过（值非本 runtime 的），不覆盖第三方写入         | 否     | 第三方写入保持         |
| submit-target-reject      | `capabilities.invoke('querySubmit')` reject                      | `reportRuntimeHostIssue` 上报，无 unhandled rejection   | 否     | console 走统一上报通道 |

## Test Strategy

档位选择：`必须自动化`——Proof 先于 Fix：Phase 1 先写判别性集成测试并在当前实现上确认红（old-必挂机制：microtask 顺序使旧 unpublish 覆写新发布值），修复后转绿；另需一条"真实卸载仍撤回"的反向判别测试（防过度修正），以及第三方覆写场景。B2 用 rejected-capability 单测断言上报通道被调用。

## Execution Plan

### Phase 1 - 判别性测试先行（红）

Status: planned
Targets: `packages/flux-react/src/__tests__/`（新增 `form-publication-ownership.test.tsx` 或就近命名）、`packages/flux-runtime/src/__tests__/`（守卫单元面）

- Item Types: `Proof`

- [ ] 集成测试 A（old-必挂）：ownedForm + 动态 valuesPath deps 变化 → 后继 publish 后旧延迟 dispose 触发 → 兄弟 `useScopeSelector` 持续读到后继发布值（旧实现：读 undefined → 红）
- [ ] 反向测试 B（真实卸载）：卸载 ownedForm 后兄弟读空（撤回语义在案）
- [ ] 反向测试 C（第三方覆写）：schema setValue 覆写路径后卸载 → 第三方值保持
- [ ] flux-runtime 单测：clearExternalPublication 守卫逻辑三态（ours / successor's / third-party's）直接断言
- [ ] 实跑确认：A 在当前实现红、B/C 绿（当前实现下 B/C 应已绿——若 B/C 红说明现状语义与预期不符，停下重估）

Exit Criteria:

- [ ] 测试 A 红、B/C 绿、runtime 单测按当前实现形成现状记录
- [ ] 红证据（失败输出）记入当日 log

### Phase 2 - 所有权守卫修复

Status: planned
Targets: `packages/flux-runtime/src/form-runtime.ts`

- Item Types: `Fix`

- [ ] 保留本 runtime 最后发布值引用（values 既有 `lastPublishedValues`；statusPath 复用既有 `lastStatusSummary`（form-runtime.ts:242）——不新增变量）
- [ ] `clearExternalPublication`：valuesPath 撤回前比对 `parentScope.get(valuesPath)` 与本 runtime 保留值（**identity 比对为准**；内容比对兜底仅用于甄别第三方写入的值——不得把后继 runtime 深相等内容的发布误判为本 runtime 的，测试 A/B 的值必须 identity 可区分）；statusPath 同规则（`parentScope.get(statusPath)` vs `lastStatusSummary`）
- [ ] 测试 A 转绿、B/C 保持绿、flux-runtime 全部既有 form 测试绿
- [ ] 核对 `docs/architecture/form-external-publication-and-reserved-bindings.md` 撤回语义描述：若原文描述与"所有权感知撤回"不一致，就地同步（owner-doc 义务在此判定）

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-react test` 与 `pnpm --filter @nop-chaos/flux-runtime test` 全绿（含新增 4 项）
- [ ] 判别机制成立：测试 A 在旧实现必挂（Phase 1 红证据）+ 新实现绿
- [ ] owner doc 同步判定已执行（改或不改均有记录）

### Phase 3 - B2 catch 修复 + B3 复探

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-react/src/__tests__/values-path-integration.test.tsx`（只读复探）

- Item Types: `Fix | Proof`

- [ ] :458 与 :515 两处补 `.catch((e) => reportRuntimeHostIssue({ env, error: e, phase: 'action' }))`（对照本仓惯例形态；env 获取方式按现位上下文）
- [ ] rejected-capability 单测：querySubmit reject → 上报通道被调、无 unhandled rejection
- [ ] B3 复探：重跑 values-path assertion-biting 探针（不激活 it.skip），如实记录结果与裁决（预期仍红 → 维持 R3.x/MV 归属；若绿 → 停下查因并升级记录）

Exit Criteria:

- [ ] 新单测绿；flux-renderers-form 包测试全绿
- [ ] B3 复探结果与裁决记录入当日 log（无论红绿）
- [ ] 复探不改动 values-path-integration.test.tsx 的棘轮状态（除非绿且查因成立，那也须先在 log 记录证据链）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_0f17fc38（fresh session）
- Verdict: `pass`（零 Blocker/Major；运行时逐帧追溯、修复可实现性〔`parentScope.get` 存在 scope.ts:480、update 存引用不克隆、publishOwnerStatus 直传 summary〕、B2 惯例形态全部核实）
- Rounds: 1
- Findings addressed: Minor 4 条已吸收进正文（StrictMode dispose 锚点 :144-158 / ownedForm useMemo :117；测试 A/B 值必须 identity 可区分、内容兜底仅限甄别第三方写入；statusPath 复用既有 `lastStatusSummary` 不新增变量；api-data-source `.catch` 先例的 `input.silent` 门控差异已留意——本修复两处无条件 catch 符合现位语义）

## Closure Gates

- [ ] B1 修复落地且判别性测试先红后绿（红证据在案）
- [ ] 真实卸载撤回语义保持（反向测试 B/C 绿）
- [ ] B2 两处 catch 落地且单测覆盖
- [ ] B3 复探完成且裁决记录在案（不认领、不静默）
- [ ] flux-runtime / flux-react / flux-renderers-form 三包测试全绿，既有断言零弱化
- [ ] owner doc 同步判定已执行
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中若有改判当场落节）

## Non-Blocking Follow-ups

- P1-MA4.5-006 初始发布本体修复维持 R3.x/MV 归属（audit-remediation-r2 roadmap）。
- `publicationActive` 标志与撤回守卫的交互简化评估（若守卫落地后该标志成为冗余，属内部清理，非本 plan 面做不做均可，挂 follow-up）。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
