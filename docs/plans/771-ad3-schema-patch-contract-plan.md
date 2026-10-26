# 771 AD-3 Schema patch 契约、校验、审计与应用面（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-3 work item；owner doc `docs/architecture/nop-debugger-ai.md` §Schema Patch Protocol（plan 768 草案，本计划收口最终契约）；用户指令 2026-10-27（执行路线图至完成——AD-3 跨包 apply/revert seam 结构性门控的事前人工确认，见 roadmap Rule 9 / mission ②）
> Related: `docs/plans/769-ad1-readonly-tool-adapter-plan.md`（completed，工具层）、`docs/plans/770-ad2-ai-session-panel-plan.md`（completed，会话面）

## Purpose

落地 AD-3：在 `nop-debugger`（AI 无关）建立 schema patch 的数据契约、显式 scope 校验、越权拒绝、审计留痕与运行时 apply/revert 集成 seam（宿主注册 applier 的回调契约——页面 schema 真相由宿主持有，debugger 不拥有页面渲染）。AD-4 的 `propose_schema_patch` 工具与预览/采纳/回滚 UX 消费本契约。

## Current Baseline（2026-10-27 live 核对）

- owner doc §Schema Patch Protocol（`docs/architecture/nop-debugger-ai.md`）：patch 仅限 schema/表达式级、显式 scope（controller + 节点目标）、全程审计、原子 apply/revert、结构级与页面控制排除；apply/revert seam 由本计划建立并收口最终契约节。
- automation API v1 无任何 apply/patch 能力（`types.ts` NopDebuggerAutomationApi 全只读 + 面板控制）；controller 面有 `setRuntime/setActionScope/setComponentRegistry`（宿主接线用）。
- 节点目标可解析基础：`inspectByCid(cid)`（`controller.ts` `currentInspectByCid`）、`getComponentTree()`（本计划仅此二者用于解析；`getNodeDiagnostics` 为事件流聚合、无 found 语义，不充当解析器）。
- `NopComponentInspectResult.authoringContract?: ResolvedAuthoringContract`（flux-core `types/renderer-authoring-contract.ts:22`）可提供节点 schema 层元数据；meta 字段面（visible/hidden/disabled/label/title/className）与 `NopNodeMetaExplanationField`（`types-explanations.ts:85-91`）一致。
- controller 扩展 seam 先例：`registerPanelTab`（plan 770，x- 前缀 + 抛错 + dispose 幂等 + 独立 listener 集 + 缓存 identity）。
- nop-debugger 零 AI 依赖边界测试（`ai-boundary.test.ts`）持续在案；patch 契约放 nop-debugger 即保持 AI 无关（工具经 nop-debugger-ai 消费）。

## Goals

- `NopSchemaPatch` 数据契约：`{ id, createdAt, scope: { controllerId, target: { cid?, nodeId?, path? } }, ops: NopSchemaPatchOp[], reason? }`，op 为**判别联合**（`{ type:'set-prop', field, value }` | `{ type:'set-expression', field, expression }`——互斥在编译面成立，运行时对不可信 JSON 再校验）；ops 非空且 ≤ 20；结构级操作类型（add/remove/move 节点）在类型面不可表达、运行时拒绝。`id`/`createdAt` 由提议方（AD-4 工具）生成，本计划校验器要求 id 非空字符串、createdAt 为数字；`propose` 审计动作为 AD-4 预留位。
- 校验（`controller.validateSchemaPatch(patch)`）：①controllerId 必须等于本 controller（越权拒绝）；②目标解析只用**活树**证据——cid → `inspectByCid` 命中，nodeId/path → `getComponentTree()` 扫描唯一命中（`getNodeDiagnostics` 是事件流聚合、无 found 语义，**不作解析器**）；目标三个选择器全缺 → 拒绝；③**歧义拒绝**：cid 与 nodeId/path 同时存在且解析到不同节点 → 拒绝；path 命中多棵树项 → 拒绝（要求唯一）；④field 非空字符串；返回 `{ ok, errors[], resolvedTarget? }`。
- 原子性责任分割：debugger 侧只负责**活跃表纪律与 fail-closed 拒绝**（校验不过/无 applier/apply 抛错 → 不登记活跃项 + 审计 failed）；**schema 状态级的 all-or-nothing apply 与 revert-恢复原态由宿主 applier 契约保证**，该责任分配写入 owner doc 最终原子性条款（AD-4/AD-6 依赖此分割）。
- 审计（bounded ring ≤ 50）：propose/validate/apply/revert/reject 每步一条 `{ at, patchId, action, ok, detail }`；`getSchemaPatchAudit()` 只读返回。
- apply/revert seam：`controller.registerSchemaPatchApplier({ apply(patch) => Promise<{ revertToken }>, revert(revertToken) => Promise<void> })`（宿主注册，未注册时 apply 拒绝 `no applier`）；`applySchemaPatch(patch)` 校验→applier.apply→登记活跃 patch（patchId→revertToken）；`revertSchemaPatch(patchId)` → applier.revert→移除；apply 抛错 → 审计 failed、活跃表不动（原子性：失败不留半态）。
- 判别性测试：越权拒绝、未知 op 类型拒绝、set-prop/set-expression 互斥拒绝、空 ops 拒绝、目标不可解析拒绝、无 applier 拒绝、apply 失败不留活跃项、revert 后移除、审计序完整。

## Non-Goals

- 不做 `propose_schema_patch` 工具与候选预览/采纳/回滚 UX/冲突检测（AD-4）。
- 不改 automation/window API（patch 面只挂 controller，不进 window 契约）。
- 不在包内实现页面重渲染（宿主 applier 的职责）；不提供默认 applier。
- 不做 patch 持久化（活跃 patch 会话内有效）。
- 不动 flux-core 编译面（保护区域不触及）。

## Scope

### In Scope

- `packages/nop-debugger/src/{types.ts,controller.ts,schema-patch.ts(新),schema-patch.test.ts(新)}`：契约类型、校验/审计/apply/revert 服务、controller 接线、判别性测试
- `packages/nop-debugger/src/panel.test-support.ts`：fake controller 补新方法 stub
- owner doc：§Schema Patch Protocol 从草案收口为最终契约（applier 接口、校验规则、审计形态、原子性条款）；`docs/architecture/debugger-runtime.md` Host Integration 节加一句 applier seam 注记
- `docs/logs/2026/10-27.md`、roadmap §4 AD-3 行状态推进

### Out Of Scope

- nop-debugger-ai（AD-4 才消费）；flux-core；playground；automation API

## Failure Paths

| 场景               | 触发                                                           | 行为                                                                                 | 可重试           | 用户可见        |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- | --------------- |
| 越权 patch         | scope.controllerId ≠ 本 controller                             | validate 拒绝（`cross-controller`）+ 审计 validate 失败条目（apply 路径另记 reject） | 是               | AD-4 工具卡错误 |
| 结构级 op          | `op.type` 不在 {set-prop,set-expression}                       | validate 拒绝（`unsupported op type`）                                               | 是               | 同上            |
| 互斥违反           | set-prop 带 expression / set-expression 带 value               | validate 拒绝（`op field conflict`）                                                 | 是               | 同上            |
| 目标不可解析       | cid 无 inspect 命中，或 nodeId/path 无组件树命中，或选择器全缺 | validate 拒绝（`target not resolved`）                                               | 是               | 同上            |
| 目标歧义           | cid 与 nodeId/path 解析到不同节点；或 path 命中多个树项        | validate 拒绝（`ambiguous target`）                                                  | 是               | 同上            |
| ops 超限           | ops 数组为空或 > 20                                            | validate 拒绝（`ops empty` / `too many ops`）                                        | 是               | 同上            |
| 审计溢出           | 审计条目 > 50                                                  | 丢弃最旧（bounded ring），有测试                                                     | -                | 无              |
| 无 applier         | 未注册宿主 applier 即 apply                                    | apply 拒绝（`no applier`）+ 审计 reject                                              | 是（宿主注册后） | 同上            |
| applier.apply 抛错 | 宿主应用失败                                                   | 审计 apply failed；活跃表不变（无半态）                                              | 是               | 同上            |
| 审计溢出           | >50 条                                                         | 丢弃最旧（bounded ring）                                                             | -                | 无              |

## Test Strategy

本档选择：`必须自动化`（roadmap §7：patch 校验、越权拒绝、apply/revert 契约需判别性测试）。判别机制点名：越权拒绝测试在"不校验 controllerId"的旧实现下必挂；互斥校验测试在"只查 op.type 不查载荷"的旧实现下必挂；原子性测试在"apply 失败仍登记活跃 patch"的旧实现下必挂。Proof 项（校验/审计/原子性测试）先于服务实现落地（先红后绿）。

## Execution Plan

### Phase 1 - 契约类型与校验服务（Proof 先行）

Status: completed
Targets: `packages/nop-debugger/src/{types.ts,schema-patch.ts,schema-patch.test.ts}`

- Item Types: `Proof`（先红）+ `Fix`（实现）

- [x] 先红：schema-patch.test.ts 判别性测试（契约形态 + 上表全部失败路径：越权/未知 op/互斥/空 ops/超 20/不可解析/歧义/审计溢出 drop-oldest/审计序/原子性）
- [x] 实现：`schema-patch.ts`（NopSchemaPatch 类型、validateSchemaPatchService：白名单/互斥/scope/目标解析输入注入化——目标解析器作参数传入以便测试）、types.ts 导出契约类型 + controller 接口新增 `validateSchemaPatch/applySchemaPatch/revertSchemaPatch/getSchemaPatchAudit/registerSchemaPatchApplier`
- [x] 后绿 + controller 接线（Phase 2）

Exit Criteria:

- [x] 校验测试全绿（先红证据在案）；契约类型从包根可导出；`automation.ts`/window 面零改动（git diff 证明）

### Phase 2 - apply/revert seam 与审计

Status: completed
Targets: `packages/nop-debugger/src/{controller.ts,schema-patch.ts,panel.test-support.ts}`

- Item Types: `Fix`

- [x] controller 接线：applier 注册/注销（重复注册抛错，先例同 registerPanelTab）、applySchemaPatch/revertSchemaPatch/getSchemaPatchAudit 全流程、bounded 审计 ring
- [x] panel.test-support fake controller 补方法
- [x] 原子性/审计序/无 applier/活跃表生命周期测试（`schema-patch-controller.test.ts`，8 tests；注：wiring 与该测试同批落地，先红纪律在 Phase 1 校验器上完整执行，Phase 2 的流程测试为同批互补覆盖）
- [x] `pnpm --filter @nop-chaos/nop-debugger test` 全绿；ai-boundary 续绿

Exit Criteria:

- [x] apply/revert/审计全流程测试全绿；nop-debugger 既有套件无回归

### Phase 3 - owner doc 最终契约与全量验证

Status: completed
Targets: `docs/architecture/nop-debugger-ai.md`、`docs/architecture/debugger-runtime.md`、`docs/logs/2026/10-27.md`

- Item Types: `Follow-up`（owner doc）+ `Proof`（全量验证）

- [x] owner doc §Schema Patch Protocol 收口最终契约（applier 接口签名、校验规则清单、审计条目形态、原子性条款、活跃表语义）+ Current Code Anchors 补 `schema-patch.ts`
- [x] debugger-runtime.md Host Integration 节加一句宿主 applier 注记（指向 owner doc，不重述）
- [x] daily log 记录

Exit Criteria:

- [x] owner doc 锚点经 anchor 门禁；全量验证归 Closure Gates

## Draft Review Record

- Reviewer / Agent: agent_1ec94dc5（独立 fresh session）
- Verdict: `pass-with-minors`（Round 1 `revised`：3 Major——目标解析改活树证据、歧义拒绝入契约、原子性责任分割成文；Round 2 复核 0 Blocker / 0 Major，共识达成）
- Rounds: 2
- Findings addressed: M1——解析只用 `inspectByCid`/`getComponentTree` 唯一命中，getNodeDiagnostics 显式排除；M2——歧义两场景入契约规则③ + Failure Path + 测试清单；M3——debugger 活跃表纪律 vs 宿主 applier 状态级原子性的责任分割写入 Goals 与 Phase 3 owner-doc 条款；残余 Minor a/b 已就地清扫（重复行去重、基线括注）。

## Closure Gates

- [x] patch 契约/校验/审计/apply-revert seam 全部落地且判别性测试在案（越权/互斥/原子性判别机制点名）
- [x] automation/window API 零改动（automation.ts 零 diff）；nop-debugger 零 AI 包引用（ai-boundary 续绿）
- [x] owner doc §Schema Patch Protocol 收口为最终契约；debugger-runtime.md 注记落地
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

Closure audit round 1（agent_c1596173）verdict `issues`：B1 lint 红（schema-patch.ts 三个未用类型 import）+ M1 契约缺口（scope.target 缺失/非对象时校验漏放行——fail-open 违背 fail-closed 设计）+ m1/m2。已修复：删除冗余 import；`!target` 分支显式 no-selector 拒绝 + 两条判别测试（20/20 绿）；Failure Path 行措辞对齐（reject 记于 apply 路径）；先红证据将随 closure commit message 显式记录。待 round 2 复审。

- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无——执行中改判须当场落节。）

## Non-Blocking Follow-ups

- patch 冲突检测（预览期间 scope 变化）归 AD-4（其 scope 语义依赖本计划的活跃表）。
- applier 的宿主参考实现（playground 持 schema 状态重渲染）归 AD-6 集成面。
- field 深层门控（按 `ResolvedAuthoringContract.editableProps` 校验 field 是否节点可编辑）：v1 只校验非空标识符；editableProps 级门控属 AD-4 候选生成侧的裁定（预览/采纳 UX 一并呈现），不在本计划阻塞面。

## Closure

Status Note: AD-3 交付完整：patch 契约（判别联合 op + 运行时再校验 + ops 上限）、纯校验器（活树解析 + 越权/歧义/互斥/超限 fail-closed）、bounded 审计 ring、controller apply/revert seam（单 applier、无 applier 拒绝、apply 失败不留活跃项）；window automation API 零改动；owner doc 收口最终契约 + 原子性责任分割；20 项 patch 族判别性测试（先红后绿，Phase 1 校验器红证据在案）。

Closure Audit Evidence:

- Auditor / Agent: agent_c1596173（独立 fresh session）
- Evidence: round 1 verdict `issues`（B1 lint 红——三个未用类型 import；M1 契约缺口——scope.target 缺失/非对象漏放行）；两项即修（`!target` 显式 no-selector 拒绝 + 判别测试、import 清理）+ m1 措辞对齐；round 2 复核 `approved`——独立重跑五门禁全 exit 0、nop-debugger 166/166（146+12+8）、round-1 已验项无回归。

Follow-up:

- no remaining plan-owned work（冲突检测与 propose_schema_patch 工具归 AD-4；宿主参考 applier 归 AD-6；editableProps 深门控归 AD-4 候选侧——均已在 Non-Blocking Follow-ups 显式登记归属）。
