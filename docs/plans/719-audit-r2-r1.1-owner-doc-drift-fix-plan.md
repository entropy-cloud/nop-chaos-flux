# 719 审计修复 R2·R1.1：结构契约修复—owner doc drift 收敛（P1-MA1.1-001 + P1-MA1.2-001）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R1.1（MR1.0/plan 711 展开）；`docs/audits/2026-10-19-1002-arm2-MA1.1-core-structure.md` §P1-MA1.1-001（修复方向在案）、`docs/audits/2026-10-19-1052-arm2-MA1.2-runtime-structure.md` §P1-MA1.2-001；`docs/skills/test-first-implementation-prompt.md`（R 行 Skill 列——本行纯文档修复，Test Strategy 声明不适用）
> Related: `docs/architecture/flux-runtime-module-boundaries.md`（owner doc）；roadmap Cross-Cutting 8（文档修复属预授权保护区——工作项 plan 即所需 plan）
> 编号 runway：718 为 MR4.0（本线）；719 本 plan；ARC 线后续从 720 起

## Purpose

收敛 `docs/architecture/flux-runtime-module-boundaries.md` 内两案四处的 owner doc 与 live 实质 drift：validation 归属三处（P1-MA1.1-001——按文档执行会静默写出不生效的校验规则）+ Bundle 默认注册面 7↔9 族（P1-MA1.2-001——宿主可见契约 drift）。修复后 owner doc 恢复强契约资格。

## Current Baseline（2026-10-24 live，HEAD `30deb7ec5`）

- **P1-MA1.1-001 三处**（live 复核）：
  1. `### Validation modules` 节（doc :199-202）：rules.ts 列「schema rule extraction / trigger normalization / compiled dependency path helpers」三项职责——live `rules.ts` 仅 18 行、唯一导出 `collectValidationDependencyPaths`（只覆盖第三项）。
  2. `## Where To Add A New Validation Rule` 第 1 步（doc :431）：指向 `packages/flux-runtime/src/validation/rules.ts`——live 的 schema 抽取/降级管线在 `packages/flux-compiler/src/validation-lowering.ts`（`collectSchemaValidationRules`:35 / `mergeValidationRules`:148 / `normalizeValidationTriggers`:154 / `normalizeValidationVisibilityTriggers`:167 / `compileValidationRules`:200）。
  3. `## flux-compiler Versus validation/` 节（doc :443-462）前两 bullet：「collecting rules from schema fields」「normalizing validation triggers and visibility triggers」列为 runtime/validation 所属——与同文档 `### Compiler boundary` 节 `validation-lowering.ts` 登记自相矛盾，与 live 相反。
- **P1-MA1.2-001**（live 复核）：Bundle Face 节（doc :569）写「**7 renderer families** — basic, form, form-advanced, data, content, layout, scheduling；mobile/ai/graph 按需」——live `packages/flux-bundle/src/index.tsx:43-58` `registerDefaultFluxRenderers` 注册 **9 族**：basic、form、form-advanced、data、content、layout、scheduling、three（3d 懒边界 `createLazyRendererComponent`）、xlang-debug-editor（plan 2474 懒边界）。
- **两 finding 修复行指针均 `R1.1`**（arm2-index 实测）；roadmap R1.1 行 `todo`。
- 修复全部零代码（owner doc 单文件）；同文档同批先例在案：MA1.1 报告 P2-MA1.1-003 定级依据（报告 :63「与 P1-MA1.1-001 同文档、可同批修复」）+ MR1.0 展开记账（logs/2026/10-24 :29「同 owner doc 同修复型」）。

## Goals

- 四处文档修正落地（三处 validation 归属 + 一处 Bundle 注册面），与 live 逐字可对。
- 两 finding 在 arm2-index 回填修复状态（`open`→`closed` + 修复行注记）。
- roadmap R1.1 `todo`→`planned`（激活）→`done`（收口）。

## Non-Goals

- 不动 flux-runtime/flux-compiler 代码（live 归属正确，错在文档）；不处理 MA1.1/MA1.2 报告 P2/P3 deferred 项；不修订审计报告原文。

## Scope（必填节）

### In Scope

- `docs/architecture/flux-runtime-module-boundaries.md`：四处修正（见 Execution Plan）。
- `docs/audits/arm2-index.md`：P1-MA1.1-001 / P1-MA1.2-001 两行状态回填 `closed` + 注记。
- 本 plan 状态流转 + daily log + roadmap R1.1 翻转（激活/收口两提交）。

### Out Of Scope

- 代码变更；P2/P3 deferred 项；并发线（ARC 716/717 线 in-flight 代码、三项遗留——显式路径隔离）。

## Failure Paths

| 可测场景编号 | 触发                            | 行为                                           | 可重试 | 用户可见表现               |
| ------------ | ------------------------------- | ---------------------------------------------- | ------ | -------------------------- |
| anchor-drift | 文档行号/措辞与 live 漂移       | 以语义锚点定位修正，Exit Criteria 逐字复核     | 是     | owner doc 内容与 live 一致 |
| new-drift    | 修正过程中发现第 5 处同族 drift | 就地一并修正并在本 plan 补记（同文档同批先例） | 是     | 四处+增量全收敛            |

## Test Strategy

本档选择：**不适用**——纯文档修复（零代码）；Proof = 修正内容与 live 源码逐字可对（doc-evaluation 四问口径的准确性面）。

## Execution Plan

### Phase 1 - 四处文档修正

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`

- Item Types: `Fix`

- [x] 修正 1（doc :196-201，语义锚点 `### Validation modules` 节 rules.ts 条目）：rules.ts 条目改写为「compiled dependency path helpers（`collectValidationDependencyPaths`——文件唯一导出；schema rule extraction / trigger normalization 归属 compiler `validation-lowering.ts`）」
- [x] 修正 2（doc :429）：Where-To-Add 第 1 步改指 `packages/flux-compiler/src/validation-lowering.ts`（authoring-time lowering：`collectSchemaValidationRules` / `normalizeValidationTriggers`）——runtime 语义由既有第 2 步（validators.ts，:432）承载，不改动 :432
- [x] 修正 3（doc :451-452）：Versus 节前两 bullet 改为「读取编译期降级产物（`validation-lowering.ts` 产出 `CompiledValidationRule`）的 runtime 消费」口径，消除与 Compiler boundary 节矛盾
- [x] 修正 4（doc :567）：Bundle Face 改 9 族全列（basic/form/form-advanced/data/content/layout/scheduling/three 懒边界/xlang-debug-editor 懒边界 plan 2474）+ 尾句「must register the other families explicitly」同步（mobile/ai/graph 按需口径保留核对）；首句改现在时现状描述（Rule 14：`face changed` 变更叙事 → 现状），节标题历史戳 (2026-09-06) 保留为历史标注

Exit Criteria:

- [x] 四处修正与 live 源码逐字可对（rules.ts 18 行单导出 / validation-lowering.ts 五导出 / index.tsx:43-58 九次 register 调用）——终验：:199-200 修正 1 落地、:429 修正 2 落地、:453 修正 3 落地、:567 修正 4 落地（grep "9 renderer families" =1）、prettier clean

### Phase 2 - 索引回填与收口

Status: completed
Targets: `docs/audits/arm2-index.md`、roadmap、daily log

- Item Types: `Fix | Proof`

- [x] arm2-index 两行 `open`→`closed` + 修复注记（本 plan 指针）
- [x] draft review 通过后：R1.1 `todo`→`planned` 翻转入激活提交，plan→`active`（55c6c680f）
- [x] closure audit（fresh subagent）approved 后：R1.1 `planned`→`done`（regex 定位替换 + 回读核验），plan→`completed`
- [x] daily log 追加；两提交（激活/收口）均显式路径、并发线不入 stage

Exit Criteria:

- [x] 两 finding `closed`；R1.1 `done`（回读核验）；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_47a9855d`（五项检查全 PASS——四处修正草案反向校验 live 吻合、修正 3 删改后剩余四 bullet 仍被 validation/ 四文件支撑、修正 4 其余段落 live-true）
- Verdict: R1 `pass-with-minors`（0B/0M/5m）→ **共识可升 active**
- Rounds: 1
- Findings addressed: m1 修正 2 草案删 validators 子句（既有第 2 步承载）；m2 行号锚点 :196-201 + 语义锚点；m3 同批先例出处改 MA1.1 报告 :63 + MR1.0 记账；m4 package.json:74 同族实例记 watch 不扩面；m5 修正 4 首句现在时 + 标题戳保留历史标注——均已落字

## Closure Gates

- [ ] 四处修正落地且与 live 逐字可对
- [ ] arm2-index 两 finding `closed` + 注记
- [x] 不存在被静默降级的 in-scope 项
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44 @ 07:19 安静窗；auditor memo：其后并发线 test-first 红灯再现——md-only delta 无因果，按 713/718 先例披露）
- [x] `pnpm test`（82/82 @ 07:19 安静窗同上）

> build/lint 按 guide 纯文档条款删除；typecheck+test 保留（md-only 变更应全绿；受并发线 test-first 循环干扰时按 713/718 先例披露）。

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- draft review m4 在案同族实例：`packages/flux-bundle/package.json:74` description 列 8 族缺 xlang-debug-editor——跨文件（包 manifest 非 owner doc），本 plan Scope 单文件不扩；记 watch，随 R 线后续 owner-doc/manifest 修复批一并处理。
- 如发现其他第 5 处同族 drift 走 Failure Paths new-drift 径（跨文件先扩 Scope 再改）。

## Closure

Status Note: R1.1 收官——四处 owner doc 修正落地（rules.ts 单职责 / Where-To-Add 改指 compiler lowering / Versus 节 runtime-消费口径 / Bundle Face 9 族现状），原 P1 静默失效路径实证关闭（compiler 零 import rules.ts）；两 finding `closed`（修复注记由修复行列 R1.1 指针承载——closure m-b 口径点明）；package.json:74 watch 实例未动（m4 纪律）；零代码变更。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_7034562e`（2026-10-24 07:4x）
- Evidence: R1 **`approved`**（0B/0M/2m 提交卫生项随手落 + 2 memo）——四处逐字+语义双吻合（live 接线证实：validation-collection.ts:137 → compiler 降级 → validation-runtime.ts:20 消费）、原 drift 关闭实证（compiler grep rules 零命中）、索引状态翻转字节级不碰证据链、零越界（恰两文件 5 hunk）、m4 watch 未动；m-a prettier 归一已落、m-b 注记口径在本 Note 点明；并发线红灯 memo 按 07:19 安静窗 + 先例披露处理。

Follow-up:

- watch：`packages/flux-bundle/package.json:74` description 8 族同族实例（draft review m4）——随后续 owner-doc/manifest 修复批处理。
