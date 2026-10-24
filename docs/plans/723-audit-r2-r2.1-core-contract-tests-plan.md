# 723 审计修复 R2·R2.1：契约补测—core 簇（P1-MA4.1-001/002/003/004/008）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.1（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-0415-arm2-MA4.1-core-runtime-tests.md` §P1-MA4.1-001/002/003/004/008（各含最小补强规格）；owner doc `docs/architecture/flux-core.md` :522-523、`docs/architecture/action-scope-and-imports.md` :924
> Related: Cross-Cutting 11（判别纪律）；先例 plan 719-722（R 行修复全链）
> 编号 runway：722 为 R1.4（本线）；723 本 plan；ARC 线后续从 724 起

## Purpose

为 core 簇五条「关键契约零判别测试」finding 补测：每契约一条针对测试，先证绿（现实现守约）再证红（临时变异实现证判别力，复员后提交——红证留痕入 plan，不提交变异）；五 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `c3f7c400a`）

- 五契约 live 锚点（实测）：
  1. **P1-MA4.1-001** `defineRendererFamily`（`packages/flux-core/src/renderer-definition-builder.ts`）：family `sourcePackage`/`defaultSchema` 钉扎——产物 `...familyRest, ...entry` + `defaultSchema: entry.defaultSchema ?? familyDefaultSchema(entry.type)`；owner doc flux-core.md :523「structurally identical to hand-written literals」。全仓测试 0 命中。
  2. **P1-MA4.1-002** 播种链三层：契约 `flux-core/src/types/compilation.ts:230`（`getFormulaNamespaces?()` 宿主命名空间→符号表，防 unknown-import-alias）；生产侧 `flux-formula/src/compile/formula-compiler.ts:170`；消费侧 `flux-compiler/src/compile-symbol-table.ts:93`（`$` 前缀符号播种）。链路测试 0 命中。
  3. **P1-MA4.1-003** `runNamedAction`（`flux-action-core/src/action-dispatcher/action-runners.ts:156`）：纯名 action（无冒号）→ `xui-actions:<name>` resolve → `adapter.invokeNamespacedAction` + 元数据附着；冒号名/未 resolve → undefined。现有测试全绕过此步。
  4. **P1-MA4.1-004** 优先序（`action-execution.ts:314-337` 顺序）：builtIn → component → named → namespaced；owner doc :924「built-in actions can never be shadowed by xui:actions」——同名 built-in + named provider 在场时 built-in 胜、named 不被咨询。顺序零 pin。
  5. **P1-MA4.1-008** 守卫（`action-execution.ts:204-207`）——**诚实覆盖图（draft review R1 勘正）**：「has-channel 早退」分支已被既有 `action-dispatcher-error-guard.test.ts:74` 传递性钉住（场景 A 经 adapter 抛错→runSingleAction catch→:205 守卫是 notify 唯一抑制者，删守卫该测试必红——审计「删守卫零测试变红」定性部分推翻，需就地勘误）；**真零覆盖**=caught+无通道兜底路径（bug 69 回归面本体）与「returned 失败+有通道仍 notify」的反向 pin（防删 `caughtFailureResults.has()` 合取项的部分变异）。
- roadmap R2.1 行 `todo`；arm2-index 五行修复列 `R2.1`、状态 `open`。

## Goals

- 五条契约测试落地（ Flux/Core 1 + flux-compiler 集成 1 + action-core 3），每条红证（临时变异）+ 绿证留痕。
- 五 finding 回填 `closed`；roadmap R2.1 翻转。

## Non-Goals

- 不改任何实现代码（契约测试——现实现守约）；不处理 MA4.1 P2/P3；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-core/src/renderer-definition-builder.test.ts`（新建，4.1-001）
- `packages/flux-compiler/src/formula-namespace-seeding.test.ts`（新建，4.1-002——flux-compiler 测试为 src 根平铺布局；flux-formula 在 dependencies，跨包 import 先例充分）
- `packages/flux-action-core/src/__tests__/action-runners-named.test.ts`（新建，4.1-003——action-core 测试全在 src/**tests**/）
- `packages/flux-action-core/src/__tests__/action-execution-precedence.test.ts`（新建，4.1-004 + 4.1-008 同文件）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.1 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更；R2.2-R3.12；并发线（ARC 716/717 线 content WIP、三项遗留）。

## Failure Paths

| 可测场景编号 | 触发                        | 行为                                                         | 可重试 |
| ------------ | --------------------------- | ------------------------------------------------------------ | ------ |
| contract-gap | 写测试中发现契约本身未实现  | 停：升级为新 finding（不静默改实现——本 plan 零实现变更纪律） | 否     |
| api-shape    | 集成测试 API 形状与规格不符 | 以既有同类测试先例校正规格，plan 补记                        | 是     |

## Test Strategy

本档选择：**必须自动化**——本 plan 即测试；红证 = 临时变异实现（每测试一处：删归一化/断链/删步/换序/删守卫），变异复员后提交，红证输出入 plan。

## Execution Plan

### Phase 1 - 五测试落地（各先红后绿）

Status: completed
Targets: 四测试文件

- Item Types: `Proof`

- [x] T1（4.1-001）：family 钉扎四断言——entry 无 defaultSchema 时 family 工厂以 `entry.type` 调用产出；entry 自带 defaultSchema 覆盖 family；sourcePackage 经 familyRest 透传；entry 字段胜 familyRest 同名。红证变异：删 :33-36 `?? (familyDefaultSchema ? familyDefaultSchema(entry.type) : undefined)` 分支。
- [x] T2（4.1-002）：含宿主命名空间（`getFormulaNamespaces` 返回 `$Arr`）的 expressionCompiler 注入编译 → `createFormulaAwareCompileSymbolTable` 符号表解析 `$Arr` 成功、无 unknown-import-alias 诊断。红证变异：播种循环删除。
- [x] T3（4.1-003）：runNamedAction 三分支——纯名+resolved 走 invokeNamespacedAction（断言 invocation 形状 + namespace/sourceScopeId/providerKind 元数据）；冒号名 undefined；未 resolve undefined。红证变异：交付记录采用「删冒号早退」（有判别力）；「删元数据附着」变体在补强 result 元数据断言后（closure m3）同样有判别力。
- [x] T4（4.1-004，行为级断言——沿既有 `action-dispatcher-routing.test.ts:267-293` 惯用法：actionScope mock 注入 + createMockAdapter 的 invokeNamespacedAction vi.fn，不做模块内 spy）：同名 built-in + named provider 在场 → built-in 结果返回且 adapter.invokeNamespacedAction 零调用。红证变异：调换 runBuiltInAction/runNamedAction 顺序（named 胜出即红）。
- [x] T5（4.1-008，经 runSingleAction catch 路径构造 caught-failure——WeakSet 模块私有经 adapter 抛错进入）：**A** caught + onActionError/plugin.onError 在场 → notify 零调用（既有传递性 pin 的显式回归钉）；**B** caught + 无任何诊断通道 → `notify('error', describeActionFailure(...))` 恰一次（真缺口）；**C** returned 失败（ok:false 非 caught）+ 有通道 → notify 仍发（WeakSet 作用域反向 pin）。红证：B 的判别变异=守卫改无条件早退；C 的判别变异=删 `caughtFailureResults.has()` 合取项（两变异分别使 B/C 红）。

Exit Criteria:

- [x] 五测试绿证 + 五红证留痕：T1 变异 1 failed〔closure m1 订正:实删 :33-36 分支红 1;『2 failed』对应恒走 family 工厂变体〕/ T2 变异 1 failed / T3 变异 1 failed / T4 变异 1 failed / T5 双变异（B 2 failed、C 1 failed）——全部复员后三包套件全绿（flux-core 52/728、flux-compiler 44/575、flux-action-core 22/239）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Fix | Proof`

- [x] arm2-index 五行 `open`→`closed` + 注记（指针列承载）；**4.1-008 行就地勘误**（已落）（guide Closure Rule 12：「删守卫零测试变红」定性部分推翻——has-channel 分支既有传递性覆盖在案，真缺口为 caught+无通道兜底与反向 pin，随本 plan 补齐）
- [x] draft review 通过后：R2.1 `todo`→`planned` 翻转入激活提交，plan→`active`（fa74a3751）；closure audit approved 后 R2.1 `planned`→`done`、plan→`completed`
- [ ] daily log 追加；两提交显式路径、并发线不入 stage

Exit Criteria:

- [ ] 五 finding `closed`；R2.1 `done` 回读核验；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_94b9b4d6`（五项检查：可想象性/格式/内容稳健性/引用准确性 PASS——T1-T5 代码锚点逐行全中、flux-compiler→flux-formula 依赖方向成立〔dependencies 非仅 devDep〕、五红证变异点全部 live 验证有判别力；声称-实况 FAIL 由 Major 1 驱动）
- Verdict: R1 `FAIL`（0B/1M/4m）→ 修订（待复审确认）
- Rounds: 2
- Findings addressed: Major1 T5 覆盖图勘正（has-channel 分支既有传递性覆盖、真缺口=caught+无通道兜底+反向 pin；T5 改三断言 A/B/C 双变异红证）+ arm2-index 4.1-008 就地勘误步骤（Closure Rule 12）；m1 测试落点（action-core→**tests**/、flux-compiler→根平铺）；m2 owner doc :924；m3 T4 改行为级断言（弃模块 spy）；m4 T1 变异行号 :33-36——均已落字
- Round 2: **共识零 B/M**（Major1 三子项闭环含判别力矩阵推演、m1/m3/m4 闭环；m2 残留 Source :5 处行号随激活落字）——可升 active

## Closure Gates

- [x] 五测试落地且红绿证据链在案（五红证输出 + 绿证三包全绿）
- [x] flux-core/flux-compiler/flux-action-core 各包套件全绿
- [x] arm2-index 五行 `closed` + 4.1-008 勘误
- [x] 不存在被静默降级的 in-scope 项
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据（auditor 独立重演 4 变异全部证红复员干净 + 三包实跑全绿）
- [x] `pnpm typecheck`（44/44 @ 09:45——修复新测试 2 处类型错误后）
- [x] `pnpm build`（44/44 @ 09:45）
- [x] `pnpm lint`（44/44 @ 09:45——fix 1 unused arg 后）
- [x] `pnpm test`（82/82 @ 09:45 终验记录）

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: R2.1 收官——五契约测试落地（T1 builder 钉扎 4 断言 / T2 播种链 3 用例含负控与 legacy / T3 runNamedAction 三分支含元数据断言〔closure m3 补强〕/ T4 优先序行为级 / T5 三断言 A/B/C 双变异配对），五红证独立复演全部证红复员干净（auditor），实现零变更，五 finding `closed` + 4.1-008 就地勘误。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_3004b0c6`（2026-10-24 09:5x）
- Evidence: R1 **`approved`**（0B/0M/3m 全部随手落地）——五测试与规格逐字、4 变异独立重演证红（T2 播种/T5-C 合取/T5-B 守卫/T1 fallback）+ 复员干净、实现零变更（五契约目标文件 diff 空）、三包实跑全绿（728/575/239）、门禁 44×3+82 复现一致；m1 红证计数订正、m2 红证菜单注记、m3 元数据断言补强均已落字。

Follow-up:

- no remaining plan-owned work。
