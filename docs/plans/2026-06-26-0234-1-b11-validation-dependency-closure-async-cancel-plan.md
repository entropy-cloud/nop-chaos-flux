# B1.1 校验依赖闭包错误清除与 async 取消语义

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B1, work item B1.1), `docs/components/amis-bug-driven-improvements/01-form-validation.md` (V1/V2/V16/V22), `docs/architecture/form-validation.md`
> Mission: amis-bug-driven-improvements
> Work Item: B1.1 校验依赖闭包错误清除与 async 取消语义
> Related: successor B1.2 (校验规则语义) and B3.2 (array/combo 嵌套隔离) both depend on this work item landing first

## Purpose

把 roadmap 工作项 B1.1 收口：锁定 Flux 校验运行时已声称、但缺聚焦回归测试的四个 P0/P1 正确性属性（依赖闭包错误清除、相互约束双向重校验、async 过期运行不发布、全管道入口），并把 owner doc 中唯一沉默的一条（值变更解决规则后必须清除字段错误）补成显式设计规则。

本计划是 **TEST-GAP 锁定 + 少量 owner-doc 显式化**，不是功能新建。独立审计已确认实现层已建模这四个属性；本计划交付的是可证伪回归锚 + 设计边界文档化。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-runtime/src/` 的 live-repo 审计。

**已成立（实现层）：**

- 依赖闭包展开：`form-runtime-owner.ts:120-191` `revalidateDependents(path, reason)` BFS 队列 + `visited` Set（cycle-safe fixed-point），经 `getCompiledValidationDependents`（`flux-core/src/validation-model.ts:189`）扩展；`form-runtime-values.ts:147-153` 在值变更时调用。
- 错误清除：`form-runtime-validation.ts:99-138` `commitPathValidationState` 在 `errors.length === 0` 时 `delete nextFieldState.errors`（清除机制 `:114-116`）；`setPathErrors`（定义 `:91-97`、写入调用点 `:427`）；`validateForm` merge 移除已校验路径的旧错误（`form-runtime-owner.ts:466-508`）。
- async 取消/不发布：`form-runtime-validation.ts` `VALIDATION_CANCELLED` sentinel（`:85`）、`validateCompiledField` 的 runId bump + abort-controller + stale-run 检查（`:260-488`，stale 检查 `:314,411-422,477-478`）、`supersedeLowerPriorityWork`（`form-runtime-owner.ts:214-227`）；async-governance substrate（`runtime-factory.ts:116,441,488,502,639`）。
- 全管道入口：`validateAt`/`validateAll`/`validateForm`/`validateSubtree`/`executeFormSubmit` 共享同一 `validateCompiledField`；规则循环 `for (const compiledRule of field.rules)` 无 required-only 短路。`rg "required-only|requiredOnly|weaken"` in `packages/flux-runtime/src` = **0 命中**，无弱化模式存在。
- `ValidationResult`（`flux-core/src/types/validation.ts:48-51`）**无 `cancelled` 标志**；`cancelled` 只存在于 `ActionResult`、component-handle result、async-governance 内部 settle/diagnostics 记录（`flux-core/src/types/async-governance.ts:22,50`），从不进入返回给校验调用方的 result shape。与 V16 设计意图一致。

**已有测试覆盖（部分）：**

- V1：`__tests__/bug-validate-overwrite.test.ts:356` 仅覆盖「显式 `validateForm()` 后清除」，**未覆盖变更触发路径**；无 `canSubmit` 反映、无 `showErrorOn` 延迟路径底层清除断言。
- V2：`form-runtime-values.test.ts:343`（闭包 a→b→c）、`:374`（cycle-safe）——**两者都 mock 了 `validateField`**，只断言「哪些 path 被调用」，**未用真实相互规则断言错误真正清除**。
- V16：`runtime-validation.test.ts:174`、`owner-validation-lifecycle-contracts.test.ts:358/429/461`、`runtime-audit-fixes.test.ts:64` 已覆盖「过期运行不发布 / settle 为 cancelled」——**signal 的 TEST-GAP 分类已 stale**；唯一缺口是无一条显式断言「`cancelled` 字符串永不作为用户可见字段错误出现」。
- V22：`owner-validation-lifecycle-contracts.test.ts:227` 覆盖「required 不抑制 async」；**无 required+minLength+pattern 三同步规则跨 manual/action/submit 入口的全管道回归锚**。

**真正剩余 gap：**

- V1 变更触发清除（用户输入解决规则 → 字段错误清除 + `canSubmit` 反映）—— TEST-GAP。
- V2 真实相互约束规则的双向清除 —— TEST-GAP（现有测试 mock 了校验执行）。
- V16 「cancelled 永不作为用户可见错误」的显式负向锚 —— 小缺口。
- V22 多规则 × 全入口回归锚 + owner doc 显式「无 required-only 模式」一句 —— TEST-GAP + DESIGN-GAP（doc 沉默）。
- owner doc `form-validation.md` 缺一条显式「Error Clearing on Rule Pass」规则（V1 的唯一真沉默）。

## Goals

- 为 V1/V2/V16/V22 各落一条聚焦、可证伪的回归测试，钉住当前正确行为。
- 在 `form-validation.md` 补显式「Error Clearing on Rule Pass」规则，并在「Rule Template Model / Validation APIs」处补一句「任何入口都跑同一全管道、无 required-only 弱化模式」。
- 若任一 Proof 测试在 live code 上失败，将其升级为 Fix（证明确实存在 amis 同类回归），并修复。

## Non-Goals

- 不新建校验能力、不改校验运行时架构（实现层已建模这些属性）。
- 不覆盖 B1.2 的规则语义/类型强制/hidden/init/程序式 API（V3-V6/V8-V10/V13-V15/V17-V21/V23）—— 归 successor plan B1.2。
- 不覆盖 B3.2 的 array/combo 嵌套隔离与行级寻址（C1-C13）—— 归 B3.2，本计划仅锁定 B1.1 范围内的闭包/取消/全管道基线。
- 不改 `showErrorOn` 显示策略本身（只验证「底层错误状态已清除」语义）。
- 不引入 `ValidationResult.cancelled` 标志（V16 明确要求不暴露）。

## Scope

### In Scope

- V1：变更触发路径下，值变更使规则通过 → 字段错误清除；含 `canSubmit` 反映、`showErrorOn` 延迟路径下底层错误状态仍清除。
- V2：真实相互约束（`lt ${B}` / `gt ${A}`）双向重校验，修正一端清除另一端错误，cycle-safe 不无限递归。
- V16：过期 async 运行不发布 + `cancelled` 永不作为用户可见字段错误出现的负向锚。
- V22：required + minLength + pattern 三同步规则，经 manual / action / submit 三个入口均全部执行、全部错误浮现；无 required-only 弱化模式。
- owner doc 显式化：`form-validation.md` 补「Error Clearing on Rule Pass」规则 + 「无 required-only 全管道」一句。

### Out Of Scope

- V3-V6/V8-V10/V13-V21/V23（B1.2）。
- array/combo 行级相对依赖、server 错误嵌套寻址（B3.2）。
- 跨 owner 依赖边（owner doc 已规定不允许；不在本计划）。
- 任何 `setValue` 程序式写入清除自身错误的故事（= V21，归 B1.2）。

## Failure Paths

> 校验运行时不涉及 HTTP/鉴权；本节为内部契约可观测场景。

| 场景编号           | 触发                                      | 行为                                                             | 可重试 | 用户可见表现                 |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------- | ------ | ---------------------------- |
| V1-lingering-error | 字段有错误 → 用户改值使规则通过 → change  | 该字段 `errors` 清空；`canSubmit` 立即反映；底层状态先于显示清除 | n/a    | 错误消失，提交按钮可用性同步 |
| V2-cross-clear     | A `lt ${B}`、B `gt ${A}`；改 B 使 A 通过  | A 的错误清除；闭包遍历收敛不无限递归                             | n/a    | 对端字段错误消失             |
| V16-stale-publish  | 快速连续变更触发 async；旧 run 过期       | 旧 run 不发布任何错误；仅最新 run 发布                           | n/a    | 无「cancelled」类残留错误    |
| V22-weakened-mode  | required+minLength+pattern 字段经任意入口 | 三规则全部执行、错误全浮现；不存在只校验 required 的弱化模式     | n/a    | 所有违规均被报告             |

## Test Strategy

本档选择：**必须自动化**

理由：B1.1 是 P0 锚点工作项（roadmap 明确「P0 锚点条目属必须自动化」），V1/V2 是 amis 最高频回归类（#1636/#11956）。所有 Proof 项须在对应 Fix（如需）之前或同时落地。

实现层已建模这些属性，故多数 Proof 是「回归锁」（写完应直接 green）；但 V1 变更触发清除路径存在已知微妙点（`setValue`→`revalidateDependents` skip-self，依赖 renderer 触发 `validateField(path,'change')`），若 Proof 失败即揭示真实回归 → 升级为 Fix。审计阶段不预判结论。

## Execution Plan

### Phase 1 - V1/V2 依赖闭包错误清除回归锁

Status: completed
Targets: `packages/flux-runtime/src/__tests__/validation-dependency-closure.test.ts`

- Item Types: `Proof`（如失败则升级为 `Fix`）

- [x] (Proof, V1) 新增聚焦测试：字段带会失败的规则 → 触发校验产生错误 → 模拟 renderer 变更路径改值使规则通过（`validateField(path,'change')`）→ 断言 `getFieldState(path).errors` 为空、`canSubmit` 反映、`showErrorOn:'touched'` 延迟路径下底层错误状态仍清除。
- [x] (Proof, V2) 新增聚焦测试：字段 A 规则 `lt ${B}`、字段 B 规则 `gt ${A}`；设值使 A 报错、B 通过 → 改 B 使 A 通过 → 断言 A 的字段错误清除；且闭包遍历收敛（用真实规则，不 mock `validateField`）。
- [x] (Decision) 若 V1 或 V2 Proof 在 live code 上失败：定位根因（如 change 触发未走清除、闭包未回写错误），升级为 Fix 并修复，直至 Proof green。_裁定：V1/V2 Proof 在 live code 上直接 green，无需升级为 Fix。_

Exit Criteria:

> 本 Phase 交付 V1/V2 的可证伪回归锚；如 Proof 失败则含对应修复。

- [x] V1 变更触发清除测试存在并通过（含 `canSubmit` 与 `showErrorOn` 延迟路径底层清除断言）。
- [x] V2 真实相互约束双向清除测试存在并通过（不 mock 校验执行）。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-runtime test` 通过（聚焦包级验证，保证后续 Phase 基线成立）。

### Phase 2 - V16 负向锚与 V22 全管道入口锁

Status: completed
Targets: `packages/flux-runtime/src/__tests__/validation-async-cancel-and-full-pipeline.test.ts`

- Item Types: `Proof`

- [x] (Proof, V16) 新增负向锚：快速连续变更触发 async 校验使旧 run 过期 → 断言旧 run 不发布任何字段错误，且返回给调用方的 `ValidationResult`/字段状态中**永不出现** `cancelled` 类字符串作为用户可见错误（显式钉住 signal 措辞）。
- [x] (Proof, V22) 新增测试：字段同时带 required + minLength + pattern 三同步规则 → 分别经 `validateAt('manual')`、action 触发入口、`submit` 三个入口触发 → 断言三规则全部执行、全部错误浮现；并显式断言「不存在只校验 required 的弱化模式」（如：空值提交时 minLength/pattern 仍参与或违规均报告，依实际语义钉住）。

Exit Criteria:

- [x] V16 负向锚测试存在并通过。
- [x] V22 三规则 × 三入口全管道测试存在并通过。

### Phase 3 - owner doc 显式化

Status: completed
Targets: `docs/architecture/form-validation.md`

- Item Types: `Decision`（文档裁定）

- [x] (Decision) 在 `form-validation.md`「Dependency Model」或紧邻错误发布模型处，补一条显式规则：**值变更使规则通过时，必须清除对应字段寻址错误（含相互约束双向重校验）；底层错误状态先于 `showErrorOn` 显示策略清除**（收口 V1/V2 的 owner-doc 沉默）。_新增「Error Clearing On Rule Pass」子节（Dependency Model 之后）。_
- [x] (Decision) 在 `form-validation.md`「Rule Template Model」/「Validation APIs」处补一句：**任何校验入口（manual/action/submit）都运行同一全规则管道，不存在 required-only 弱化模式**（收口 V22 的 DESIGN-GAP）。_新增 Rule Template Model 规则 5。_
- [x] (Proof) 抽查修改后的 `form-validation.md` 与 live code（`validateCompiledField` 规则循环、`commitPathValidationState` 清除）一致，无「Proposed vs Current」叙事。

Exit Criteria:

- [x] `form-validation.md` 新增「Error Clearing on Rule Pass」规则 + 「无 required-only 全管道」一句，且与 live code 行为一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0ffec80e2ffel2Nru3ayDonxC3`）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor M1（`async-governance.ts` 路径歧义）→ 已改为 `flux-core/src/types/async-governance.ts:22,50`。
  - Minor M2（`setPathErrors` 归因松散）→ 已区分清除机制 `commitPathValidationState:114-116` 与写入调用点 `:427`。
  - Minor M3（Non-Goals `V13-V21` 误含 V16）→ 已改为 `V13-V15/V17-V21`。
  - 审阅者确认：所有 file:line 引用经 live repo 核对准确；V16 signal TEST-GAP 分类 stale 的再判定诚实；B1.1/B1.2/B3.2 边界正确；「多数 Proof / 无需改码」框架面对 V1 skip-self 微妙点仍诚实（含 Proof→Fix 升级路径）。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] V1/V2/V16/V22 四个属性各有聚焦回归测试通过。
- [x] 若 Proof 揭示真实回归，对应 Fix 已落地（无 in-scope live defect 残留）。_所有 Proof 在 live code 上直接 green，无回归，无需 Fix。_
- [x] owner doc `form-validation.md` 已补「Error Clearing on Rule Pass」与「无 required-only 全管道」，且与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。_Auditor: 独立子 agent `ses_0ffd3db8fffeM4RbPjDrqsgYoc`（fresh session，三件套输入）。Verdict: pass（零 blocker / 零 major，2 minor：B2.1 同树暂存未计入 diff 摘要、校验计数 1010 vs 1192 stale；均不影响结论）。_
- [x] `pnpm typecheck`（55/55 tasks 通过）
- [x] `pnpm build`（29/29 tasks 通过）
- [x] `pnpm lint`（29/29 tasks 通过）
- [x] `pnpm test`（55/55 packages 通过；flux-runtime 包 1010 passed | 1 skipped）

## Deferred But Adjudicated

_本计划范围内暂无 deferred 项。如执行期裁定某项非阻塞，须在此登记 Classification + Why Not Blocking Closure + Successor Required。_

## Non-Blocking Follow-ups

- 若 V16 的 4+ 既有测试已充分覆盖「不发布」，本计划新增的负向锚为加固；不视为阻塞。
- V21（程序式 `setValue` 清除自身错误）属 B1.2，不在本计划。

## Closure

Status Note: B1.1 收口。四个 P0/P1 属性（V1 变更触发清除、V2 相互约束双向清除、V16 过期 async 不发布、V22 全管道无 required-only 弱化）各有聚焦、可证伪回归锚并通过；owner doc `form-validation.md` 已补「Error Clearing On Rule Pass」与「无 required-only 全管道」。所有 Proof 在 live code 上直接 green，无 Fix、无 in-scope 残留缺陷、无静默降级。typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_0ffd3db8fffeM4RbPjDrqsgYoc`
- Verdict: `pass`（零 Blocker / 零 Major）
- Evidence:
  - Scope: `git diff --stat` 确认仅 2 doc + 2 新测试 + 计划文件改动，无 `packages/flux-runtime/src`（排除 `__tests__`）生产源码改动。
  - Test fidelity: V1/V2/V16/V22 各自用真实校验执行（非 mock `validateField`）证伪性断言；`npx vitest run` 两文件 11/11 green；flux-runtime 包全量 green。
  - Doc accuracy: `validateCompiledField` 规则循环、`commitPathValidationState:114-116` 空 errors 删除、`validateForm` 合并清除已通过路径、`rg "required-only|requiredOnly|weaken"` 生产代码 0 命中，均与 doc 一致；无 "Proposed vs Current" 叙事。
  - Consistency: 三 Phase 均 `completed` 且条目全 `[x]`；closure-audit 门由独立 session 完成。
  - Minor: B2.1 同树暂存（roadmap/plans）未计入本 plan diff 摘要；校验计数 stale（1010 vs 1192）——均不影响结论。

Follow-up:

- no remaining plan-owned work。B1.2（V3-V6/V8-V10/V13-V15/V17-V21/V23）与 B3.2（array/combo 嵌套隔离 C1-C13）为显式 successor，依赖本工作项先行落地；本计划不覆盖。
