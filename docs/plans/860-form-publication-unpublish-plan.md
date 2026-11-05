# 860 form 外部发布撤回所有权修复（valuesPath/statusPath ownership-aware unpublish）

> Plan Status: completed（closure audit approved 2026-11-06；draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-06
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
- `docs/logs/2026/11-06.md`（收口记录；起草时写作 11-05，执行与收口实际落在 11-06）；若修复改变 `docs/architecture/form-external-publication-and-reserved-bindings.md` 所述撤回语义，则同步该 owner doc（Phase 2 exit 判定）

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

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/form-values-path-publication.test.tsx`（落点改判，见执行中裁决①）、`packages/flux-runtime/src/__tests__/form-runtime-publication-ownership.test.ts`

- Item Types: `Proof`

- [x] 集成测试 A（old-必挂）：ownedForm + 动态 valuesPath deps 变化 → 后继 publish 后旧延迟 dispose 触发 → 兄弟 `useScopeSelector` 持续读到后继发布值（旧实现：读 undefined → 红）
- [x] 反向测试 B（真实卸载）：`visible` 置 false 卸载 ownedForm 后兄弟读空（撤回语义在案）
- [x] 反向测试 C（第三方覆写）：页面写入覆写路径后卸载 → 第三方值保持
- [x] flux-runtime 单测：clearExternalPublication 守卫逻辑三态（ours / successor's / third-party's）直接断言（另加 identity 相等内容后继、共享初始对象后继、首发前 dispose 三例）
- [x] 实跑确认：A 在当前实现红、B 绿；C **红**（预判改判，见执行中裁决②）

Exit Criteria:

- [x] 测试 A 红、B 绿、C 红（改判在案）、runtime 单测 4/5 红形成现状记录
- [x] 红证据（失败输出）记入当日 log（`_tmp/audit-1106/860-phase1-{runtime,react}-red.log`）

### Phase 2 - 所有权守卫修复

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`、`packages/flux-runtime/src/status-owner.ts`

- Item Types: `Fix`

- [x] 保留本 runtime 最后发布值引用（复用既有 `lastPublishedValues` / `lastStatusSummary`）；另加一个 per-runtime 所有权令牌 `publicationOwner`（设计改判，见执行中裁决③）
- [x] `clearExternalPublication`：valuesPath 撤回前比对 `parentScope.get(valuesPath)` 与本 runtime 保留值（**identity 比对为准**；内容比对兜底仅用于甄别第三方写入的值——不得把后继 runtime 深相等内容的发布误判为本 runtime 的，测试 A/B 的值必须 identity 可区分）；statusPath 同规则（`parentScope.get(statusPath)` vs `lastStatusSummary`）
- [x] 测试 A/C 转绿、B 保持绿、flux-runtime 全部既有 form 测试绿
- [x] 核对 `docs/architecture/form-external-publication-and-reserved-bindings.md` 撤回语义：原文只写"dispose cleanup"，未述所有权 → 新增 §6「Publication Withdrawal Ownership」（含拒绝的内容比对方案）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-runtime test`、`flux-renderers-form test`、`flux-react test` 全绿（含新增：runtime 6 例 + React 面 4 例 + B2 1 例）
- [x] 判别机制成立：测试 A/C 在旧实现必挂（Phase 1 红证据）+ 新实现绿；共享初始对象单测在"仅 identity 守卫"的中间实现下红（证明登记表必要）
- [x] owner doc 同步判定已执行（新增 §6）

### Phase 3 - B2 catch 修复 + B3 复探

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-react/src/__tests__/values-path-integration.test.tsx`（只读复探）

- Item Types: `Fix | Proof`

- [x] 两处 fire-and-forget 调用的失败通道——改判为在 `deliverToSubmitTarget` 内部 try/catch → `reportRuntimeHostIssue`（单点覆盖两处调用，见执行中裁决④）
- [x] rejected-capability 单测：querySubmit reject → `env.notify('error', ...)` 被调、无 unhandled rejection（`form-submit-target-rejection.test.tsx`；去掉 catch 的变异 → 红）
- [x] B3 复探：见执行中裁决⑤（ratchet 测试结构性失效的证据链 + 真实渲染器复探 + cron e2e 复探）；维持 R3.x/MV 归属

Exit Criteria:

- [x] 新单测绿；flux-renderers-form 包测试全绿
- [x] B3 复探结果与裁决记录入当日 log
- [x] 复探不改动 values-path-integration.test.tsx 的棘轮状态（棘轮失效登记为 successor 工作，见 Deferred）

## 执行中裁决（2026-11-06）

① **集成测试落点**：plan 原定 `flux-react/src/__tests__/`，但 flux-react 的测试 `formRenderer` 是 `FormStub`（`test-support-core.tsx:75-105`），不跑 `form.tsx` 的 ownedForm/延迟 dispose 协议——在那里写不出经 form.tsx 集成面的判别测试（flux-react 也不能依赖 flux-renderers-form）。改落 `flux-renderers-form/src/__tests__/form-values-path-publication.test.tsx`，用真实 `formRendererDefinitions` + `createSchemaRenderer`。触发 A 的方式：`name: '${formName}'` + 页面写入 formName → ownedForm `useMemo` 依赖变化、`valuesPath` 不变（若 `valuesPath` 本身变化，新旧路径不同，不构成覆写）。

② **C 的预判改判**：plan 预判"当前实现下 B/C 应已绿"。实跑 C 红——旧实现在卸载时无条件清空路径，覆盖第三方写入；这正是 Failure Paths `stale-path-no-longer-ours` 所述的目标行为被违反，属同一 B1 机制的第二个判别面，不是语义偏差，不触发"停下重估"。

③ **所有权判定从"值 identity"改为"最后发布者登记 + identity"**：按 plan 原设计（仅比对 `parentScope.get(path)` 与本 runtime 最后发布值的 identity）实现后，runtime 单测全绿但 React 面测试 A 仍红。根因：FormRenderer 把同一个 `initialValuesRef.current` 交给每次重建的 runtime，`createFormStore` 按引用持有，前后两个 runtime 发布**同一个引用**——identity 无法区分。新增单测"共享初始对象后继"在仅 identity 的实现下红、复现该机制。终版：`status-owner.ts` 新增 `markPublicationOwner`/`releasePublicationOwner`（WeakMap<ScopeRef, Map<path, owner>>），发布时登记、撤回时要求"仍是最后发布者 且 值 identity 未被第三方替换"。plan 的"内容比对兜底"未采用（会把内容相等的后继发布误判为本 runtime 的）。

④ **B2 落点**：plan 写"两处调用补 `.catch`"；改为在 `deliverToSubmitTarget` 内部 try/catch——两处调用都是 fire-and-forget、没有调用方需要拿到 rejection，单点处理覆盖两处且不会遗漏将来新增的调用点。

⑤ **B3 复探证据链**：

- `flux-react/src/__tests__/values-path-integration.test.tsx` 的 ratchet 用的是 `FormStub`，而 `FormStub` 调 `createFormRuntime` 时**不传 `valuesPath`/`statusPath`**——该测试在任何修复下都不可能转绿，是结构性失效的棘轮，不能作为 P1-MA4.5-006 的回归守卫。
- 真实 FormRenderer 复探（`form-values-path-publication.test.tsx` "B3 probe"）：表单外的兄弟节点读取初始发布——**绿**，且在旧实现与新实现下均绿。基本发布链路是通的。
- 真实 app 复探（`tests/e2e/cron-editor.spec.ts`）：HEAD 行为与本 plan 修复后行为一致——text mode 与 v2 wizard 两项红（ledger F9 已登记的 echo 空文本），其余 3 项绿（HEAD 首轮一次 3 红为冷启动 flake，复跑 2 红）。cron lab 的 echo 位于**表单 body 内部**、经 form scope 链读 `ui.textCron`——P1-MA4.5-006 的真实落点收窄为"表单内部读取发布到父作用域的路径"。
- 裁决：P1-MA4.5-006 仍 live，R3.x/MV 归属不变；棘轮失效登记为 successor 工作（Deferred）。

⑥ **scanner 误报修正**：B2 新增的 catch 命中 `catch-without-structured-failure-path`（discover 798→799 / async 351→352）。该启发式不识别本仓规范上报通道 `reportRuntimeHostIssue`——改 `scripts/audit/rules.mjs` 识别它（回归测试 `scripts/__tests__/async-failure-rules.test.ts`，旧扫描器下红），连带清掉 5 个既有误报（每处 catch 体均核实调用了 `reportRuntimeHostIssue`）；基线收缩 discover 798→793 / async 351→346 + reRegistrationNote。

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_0f17fc38（fresh session）
- Verdict: `pass`（零 Blocker/Major；运行时逐帧追溯、修复可实现性〔`parentScope.get` 存在 scope.ts:480、update 存引用不克隆、publishOwnerStatus 直传 summary〕、B2 惯例形态全部核实）
- Rounds: 1
- Findings addressed: Minor 4 条已吸收进正文（StrictMode dispose 锚点 :144-158 / ownedForm useMemo :117；测试 A/B 值必须 identity 可区分、内容兜底仅限甄别第三方写入；statusPath 复用既有 `lastStatusSummary` 不新增变量；api-data-source `.catch` 先例的 `input.silent` 门控差异已留意——本修复两处无条件 catch 符合现位语义）

## Closure Gates

- [x] B1 修复落地且判别性测试先红后绿（红证据在案）
- [x] 真实卸载撤回语义保持（反向测试 B/C 绿）
- [x] B2 两处调用的失败通道落地（`deliverToSubmitTarget` 内部单点，见执行中裁决④）且单测覆盖
- [x] B3 复探完成且裁决记录在案（不认领、不静默）
- [x] flux-runtime / flux-react / flux-renderers-form 三包测试全绿，既有断言零弱化
- [x] owner doc 同步判定已执行
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### P1-MA4.5-006 棘轮测试结构性失效（FormStub 不接 valuesPath）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan Non-Goals 明确不修 P1-MA4.5-006 本体且不改棘轮状态；失效的棘轮不影响 B1/B2 的判别证明（二者的判别测试都在真实 FormRenderer 上）。证据链见执行中裁决⑤。
- Successor Required: `yes`
- Successor Path: R3.x/MV（`docs/backlog/audit-remediation-r2-roadmap.md` R2.14 行已就地注记）——修复时须把棘轮迁到真实 FormRenderer、表单内部读取拓扑（对齐 cron lab），而非沿用 FormStub

## Non-Blocking Follow-ups

- P1-MA4.5-006 初始发布本体修复维持 R3.x/MV 归属（audit-remediation-r2 roadmap）。
- `publicationActive` 标志与撤回守卫的交互简化评估（若守卫落地后该标志成为冗余，属内部清理，非本 plan 面做不做均可，挂 follow-up）。

## Closure

Status Note: B1 撤回所有权缺陷修复（`(scope, path)` 最后发布者登记 + 值 identity 识别第三方写入）、B2 submit target 失败通道、B3 复探全部落地；判别测试在旧实现与"仅 identity"中间实现下均红、修复后绿；顺带修正 `catch-without-structured-failure-path` 扫描器对规范上报通道的误报（清 5 处既有误报）。全量 typecheck/build/lint 46/46、test 16,902/0、check exit 0。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子代理（closure audit，2026-11-06）
- Evidence: verdict **approved**（0 Blocker / 0 Major / 2 Minor）；独立变异 (a) 撤回改回无条件清空 → runtime 5/6 红、React A/C 红；(b) 只做 identity → 共享初始对象单测 + React A 红；(c) 去 try/catch → B2 测试红；(d) 扫描器去 `reportRuntimeHostIssue` → 规则测试红；全部 cp 还原 + MD5 核验。独立复跑 flux-runtime 1568/1 skip、flux-renderers-form 1122/1 skip、cron e2e（F9 echo 空复现）；5 处既有误报逐一核实；16,902 求和核验。Minor：In Scope 日志路径（已勘正）、16,902 先于 B2 测试类型化改写（行为等价，已复跑该文件）。记录见 `docs/logs/2026/11-06.md`。

Follow-up:

- P1-MA4.5-006 本体 + 棘轮迁移归 R3.x/MV（Deferred 已登记）；`publicationActive` 与登记表的交互简化见 Non-Blocking Follow-ups。
