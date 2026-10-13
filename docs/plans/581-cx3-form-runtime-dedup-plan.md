# 581 CX-3 共性重构：form-runtime 族复制沉积收敛批（summary 原语/patchFieldStateInMap/ScopeRef 工厂/cascade 守卫）

> Plan Status: active
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-3 条目（WA-2 批立案 WA-runtime-002/003/004/005，台账 79-82 行 successor-required→本批）；先例：plan 579/580
> Related: `docs/audits/workaround-code-smell/ledger.md`；`docs/architecture/form-validation.md`、`docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

flux-runtime 包内四处机制级复制沉积收敛（WA-runtime-002/003/004/005，~340 行冗余+漂移面消除）：①summary 五计数器 3 份→form-store 导出 summary 原语（包内模块导出）；②FieldState 键级更新语义 8 份→提取 `patchFieldStateInMap` 单一原语（吸收五键条件/dirty graft/键清除/空态回收四变体）；③ScopeRef store 装配骨架 2 份→`createStoreBackedScopeAdapter` 工厂；④cascade 深度守卫五件套 2 份→`createCascadeGuard` 工厂。

## Current Baseline（拟制时 HEAD `2f2d9be53` 实测）

- **WA-runtime-002（P1）summary 3 份**：`form-store.ts:14-105`（正本：getFieldStateCounterFlags 严格 ===true 计数+emptySummary+增量维护）↔ `form-store-owned.ts:12-85`（五 helpers 逐字复制；**漂移一=emptySummary 缺失**，读时按 owner 前缀全量重算+缓存）↔ `form-runtime-status.ts:10-48`（draft review M2 修正：**非纯全量重算**——getFormStoreSummary=prefer `state.summary` ?? 回退 `summarizeFieldStates`；**漂移二=回退支真值计数**[`if (fieldState.dirty)`]与前两版严格 ===true 分叉，truthy 非布尔旗标下两派读数可分叉；`buildFormStatusSummary` 为 index.ts:40 **公共导出**，行为必须逐字保持——薄壳保留 prefer-summary 分支与真值语义，禁止三方共用单一计数语义）。
- **WA-runtime-003（P1）FieldState 键级更新 11 份**（draft review M1 扩数裁定=选项 a，机制家族全闭）：已计入 8 份=form-runtime-{owner,registration,array,validation,field-ops}.ts 六处 graft/clear + `form-store.ts:161-193 mergeFieldState` ↔ `field-ops.ts:16-71 updateFieldStateInMap` 孪生对（:22-47 五键块逐字）；**新发现同机制 3 份**=errors-map 全量重建族：`form-runtime-owner-field-states.ts:3-26 mergeFieldStateErrors`（专测 3 用例在位）+ `form-runtime-owner.ts:515-531`（内联变体，graft 带 validationErrorsEqual 守卫+changed 标记）+ `form-runtime-values.ts:130-143`（内联变体，graft 无等值守卫）。收敛=patchFieldStateInMap 吸收前 8 份四变体 + 伴随 errors 重建原语吸收后 3 份三形（9 无守卫/10 等值守卫+changed/11 无守卫——参数化承载）。
- **WA-runtime-004（P2）ScopeRef 装配骨架 2 份**：`form-runtime.ts:131-206` ↔ `page-runtime.ts:24-87`（e9fad5eb0 modularize 复制；Plan 552 门控修复单侧落地先例已发生=漂移通道已兑现一次）。
- **WA-runtime-005（P2）cascade 深度守卫 2 份**：`async-data/reaction-runtime.ts:18,52-77` ↔ `async-data/source-registry.ts:15,42-46,111-130`（draft review m2 区间收窄：:48-109 dashboard-filter 诊断不入组；reaction-runtime-helpers.ts:19 MAX_CASCADE_DEPTH=100 为 per-reaction 报告机件非同构守卫不入组）（7353e3a39 复制；**上限 200 vs 100 依据不可考——原语参数化，不得批内统一数值**；draft review m4 结构不对称=reaction 生产默认模块全局单例 :176 vs source 生产每 registry 实例 :172——`createCascadeGuard(limit)` 返回含 tryEnter/leave/getDepth/setDepth 实例对象，两形态各自实例化；`__get/setGlobalCascadeDepthForTests`/`__get/setSourceCascadeDepthForTests` 导出名逐字保留[deep-import 在案]）。
- **在途**：flux-runtime 有并行会话在途 3 文件（`runtime-factory.ts`/`scope.ts`/`__tests__/runtime-dialogs-scope.dialog-state.test.ts`）——与本批目标文件（form-store*/form-runtime-*/page-runtime/async-data 两件）零交集，执行/收口时逐一核对零触碰。
- **公开面**：全部包内模块导出/私有提取，`flux-runtime/src/index.ts` 公共导出零变更（`git diff --exit-code`）。
- **既有测试**：flux-runtime 套件在案（WA-14 口径 550 用例属 flux-react；runtime 自身套件以 live 为准）；行为保持铁律=特征化测试先钉后改（四组漂移证据位点必须各自有钉住用例：owned 版 emptySummary 缺失/status 版全量重算/dirty 键集分叉/200 vs 100 上限——**钉住的是现行为，不是"正确"行为**）。

## Goals

- 四组收敛落地：summary 原语（form-store 包内导出）+ `patchFieldStateInMap`（吸收四变体）+ errors 重建伴随原语（吸收三形）+ `createStoreBackedScopeAdapter` + `createCascadeGuard`（limit 参数化）——11 份写入形全闭。
- 行为零变化：特征化先钉（含四处漂移证据位点现行为）、提取后全绿。
- 台账 WA-runtime-002/003/004/005 `found → fixed → verified`（closure 后）；roadmap CX-3 `todo → planned → done`。
- flux-runtime filter 门禁 + 双哨兵 + 隔离五门禁全绿；index.ts 公共导出零变更。

## Non-Goals

- 漂移变体的语义统一（emptySummary 补齐/全量重算优化/dirty 键集统一/上限统一——全部保持现行为，收敛的是结构不是语义）。
- 其他 CX 条目；并行在途文件。

## Scope

### In Scope

- `packages/flux-runtime/src/`：form-store.ts、form-store-owned.ts、form-runtime-status.ts、form-runtime-{owner,registration,array,validation,field-ops,owner-field-states,values}.ts、form-runtime.ts、page-runtime.ts、async-data/{reaction-runtime,source-registry}.ts（+新共享件与测试；**排除并行在途 3 文件**）
- ledger/roadmap/dev log；`docs/architecture/form-validation.md`（如装配契约表述需同步）

### Out Of Scope

- 上述外任何修改；漂移语义统一；其他 CX。

## Failure Paths

不适用（零新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**（行为保持型重构）。特征化先钉（四处漂移位点+各写入点现行为）；flux-runtime filter typecheck/build/lint/test + 双哨兵（flux-renderers-ai + flux-react 全量——form-runtime 被 react 渲染面直接消费）+ 隔离五门禁。

## Execution Plan

### Phase 1 - 特征化钉住与四组提取

Status: done（2026-10-13：实施派驻 agent agent_7e43ce99 执行——特征化基线 18 条先钉[draft review 指名缺口全补；重构前 18/18 绿]；五原语/工厂落地[summary 原语 form-store 包内导出/mergeFieldStatePatch+patchFieldStateInMap 102 行/mergeFieldStateErrorsWithGuard/createStoreBackedScopeAdapter 80 行/createCascadeGuard 30 行]净删 ~248 行[240 ins/488 del]；动态判别 5 组变异恰红→sha256 字节级恢复[M4 初版钉被初始 lastChange 掩蔽→钉加强后恰红——披露在案]；flux-runtime filter 四门禁+双哨兵 ai 850/react 554 全绿；index.ts 零变更[buildFormStatusSummary 薄壳保形]；并行 3 文件 hash 前后一致零触碰）
Targets: flux-runtime 包内

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（draft review 指名缺口清单）——①summary：status prefer-summary 支+真值计数边缘[M2 两支各钉]+emptySummary 缺失形态 owned 读路径数值+增量维护；②FieldState：array fresh-graft 分支与预清组合[m3]/owner+registration dirty graft AUDIT-15 不预清时序/五键条件 merge/孪生对/空态回收/errors 重建三形[等值守卫有无+changed]；③ScopeRef：fieldStates-only 变更→通配 replace 重发[Plan 552 门]+单态门；④cascade 既有双限测试在案确认+测试钩子名存活；重构前后同绿。
- [x] Fix：四组提取——①summary 原语（form-store 包内导出；status 薄壳保留 prefer-summary+真值语义[M2]）②`patchFieldStateInMap` 吸收四变体（draft review m3 参数面=触键集合/预清组合/fresh-graft 缺省分支开关[array :199-201]/空态回收策略；owner:97-118 与 registration:52-69 的 AUDIT-15 不预清约束原样保持并加注释引用）+ errors 重建伴随原语吸收 3 形（等值守卫/changed 标记参数化）③`createStoreBackedScopeAdapter`（draft review 位点清单参数面=existingScope/scope 复用键、parent vs initialData 互斥、快照/更新委托、**subscribe 门谓词参数化[form 三态门 :171-190=Plan 552 单侧修复位点 vs page 单态门]**）④`createCascadeGuard(limit)`（m4 双实例形态）；各写入点改引。
- [x] Proof：flux-runtime filter 四门禁 + 双哨兵 + index.ts 零变更（git diff --exit-code）。

Exit Criteria:

- [x] 特征化前后同绿；漂移位点现行为逐字保持；**动态判别（m5）=重构完成后回退任一改引位点，特征化矩阵恰红→恢复同绿（CX-1 先例 727935126 同款）**。
- [x] filter 门禁+双哨兵 exit 0；index.ts 公共导出零变更（buildFormStatusSummary 薄壳保形）。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账四行 fixed→verified 翻转[终读 220=87+0+133]；closure audit R1 approved[agent_43ed0626，0B/0M/2m：m1 四处门预勾回退回勾/m2 knip 修正周期补记 dev log]；roadmap CX-3 done；dev log 回填完成）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账四行 `found → fixed → verified`（closure 后据实翻转）；roadmap CX-3 回写；dev log。（closure audit approved 后完成）
- [x] Proof：隔离五门禁；独立 closure audit。（closure audit agent_43ed0626 approved 后据实回勾）

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（R1 approved 0B/0M/2m）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_e707c92e-1183-4fd7-b3d3-988f2c66edbb，review-only）
- Verdict: `revised`（0B/2M/5m → 全修转 active；位点级清单由审查员产出，实施会话直接引用）
- Rounds: 1
- Findings addressed: **M1** FieldState 计数 8→11（同机制 errors 重建族 3 份 live 新发现[owner-field-states.ts:3-26/owner.ts:515-531/values.ts:130-143]）→ 裁定选项 a 扩数+伴随原语吸收；**M2** status 版「退化为全量重算」表述失准（实为 prefer-summary+回退两支且回退支真值计数分叉；buildFormStatusSummary=index.ts:40 公共导出）→ 基线改写+两支各钉+薄壳保形禁令；**m1** field-ops 孪生实长 :16-71（逐字段 :22-47）；**m2** source-registry cascade 区间收窄 :15,42-46,111-130；**m3** dirty 变体参数面四项+AUDIT-15 注记引用；**m4** cascade 双实例形态+测试钩子名逐字保留；**m5** 动态判别机制补 Exit Criteria（回退改引位点恰红→恢复绿）。审查员 7 项清单 live 实测（四组位点行号/在途零交集/无人工门核验/index.ts 仅 :40 公共导出相接/deep-import 零命中/cascade 双限测试在案/133 测试文件）。

## Closure Gates

- [x] 所有 in-scope 复制沉积已收敛（3+11+2+2 份→5 原语/工厂+薄壳）
- [x] 行为零变化（特征化前后同绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_43ed0626，0B/0M/2m 随收口修正），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 漂移语义统一（emptySummary/全量重算/dirty 键集/上限 200 vs 100）如需裁定归独立行为变更批。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_43ed0626，review-only）
- Rounds: R1 `approved`（0B/0M/2m 随收口修正）
- m1 四处 closure 依赖门预勾→回退后据实回勾（本节即证据）；m2 knip 首跑→收私修正周期补记 dev log；o2 口径精确化随 verified 翻转落 ledger。
- 审计员独立实证：五原语逐一开档（summary 两派语义分立保住[M2]/patch 8 位点逐一改引核对+AUDIT-15 原位/errors 三形守卫.changed 映射/ScopeRef 三态枚举逐支映射+cascade 四实例化上限未统一+钩子名无损）；动态判别 2 组亲手恰红（patch 空态回收反转→恰红 3 条判别非滥红；cascade limit 边界反转→恰红 2 条）→sha256 恢复→32/32 绿；收私 10 符号全仓 grep 零跨文件消费者（de-export 无损）；index.ts 零 diff+buildFormStatusSummary 逐字一致；1514−1513=1 并行 dialogs 测试口径亲证；reconcile 亲跑逐字一致；两树 22/22 sha256 一致。
