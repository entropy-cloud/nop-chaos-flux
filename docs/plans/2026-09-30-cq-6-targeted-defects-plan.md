# CQ-6 定向缺陷与卫生批（类型安全 / 调试残留 / 死代码清理 / 测试卫生 / 巨型组件拆分首批）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-S2/S3/S4/S5/S7/S8/S9/S10/S11/S13/S14/S15/S16/S18、CQ-T9/T10/T11、CQ-S1 清理面）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-1-quality-gates-plan.md`（本 plan Phase 5 依赖其 Phase 1 基线先行落地；清理后其基线收缩）

## Purpose

修复挖掘出的定向缺陷（类型擦除、调试残留、闭包断言、effect 镜像、重复导出、路由双登记、test-support 混居、弱断言/睡眠测试），并完成经验证的死文件/死依赖清理第一批与两个最高密度巨型组件的拆分。每项独立可验证、行为等价或测试增强。

## Current Baseline

- `gantt.tsx:51-68` `createInitialStore(resolved: Record<string, unknown>)`，函数内 `as any` 5 处（:56、:62-65）；全文件 `as any[]` 共 10 处（另 :142-145、:564）。`gantt.types.ts:166` `GanttSchema` 已有完整类型；唯一外部消费者 `gantt-store-proof.test.ts` 三处调用对全可选字段可赋值（签名收紧安全）。
- `flux-formula/src/evaluator.ts:67-85` 五个比较/算术分支 `(left as any)`（:67 `+`、:79/:81/:83/:85 比较）。**现有测试对二元 `+` 零覆盖**，比较分支仅数值字面量 happy path（:318）——重构前必须先建 characterisation 矩阵。
- `flux-core/src/types/renderer-api.ts:228-229` `functions/filters` any。评审核实：全仓无运行时提供方/读取方依赖 any 形状（formula 走 registry 独立路径），unknown 化破坏面 ≈ 0。
- `flux-renderers-industrial/src/symbols/compound.ts` `as unknown as` 恰 7 处（typed props ↔ `Record<string,unknown>` 双向）；`flux-compiler/src/source-compiler.ts` 恰 6 处（evaluator 输出强转）。
- `flux-runtime/src/form-store.ts:299-308` 闭包 `!.` 恰 4 处（:299/:300/:307/:308）；`flux-renderers-form-advanced/src/key-value.tsx:88-108` memo→effect→state 镜像闭环（:88 state、:89-105 memo、:106-108 effect）；行身份稳定性现无 focused 锁定（keyValueRowPropsEqual 在 key-value-row.tsx，key-value.test.tsx 未锁此点）。
- `gantt/undo-stack.ts:185` 生产 console.log（全仓 packages 非测试 src 唯一）。
- 重复导出 4 组（knip 实跑确认）：`flux-runtime/src/async-data/request-runtime.ts:496`（executeApiObject）、`flux-renderers-form-advanced/src/test-support.tsx`（formulaCompiler|sharedFormulaCompiler）、`flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:484`（ScadaEditorCanvas*）、`flux-renderers-industrial/src/renderer/scada-canvas.tsx`（ScadaCanvas*）——后两组为组件双名导出，未进包公开 index，删除前仍需消费方扫描。
- `apps/playground/src/App.tsx`：外层 kind-switch **6 case**（每支有定制布局/props，不可查表化）+ 内层 **domainId-switch 84 case 中的 78 支**（评审核正：全文件 84 case）；`domain-route-entries.ts` 79 条 id——**当前存在 1 条漂移**（正是对账测试的价值）。
- test-support 混居生产 src：form-advanced `condition-builder/config-test-support.tsx`（`: any` 恰 21）、flow-designer-renderers `canvas-bridge-test-support.tsx`、report-designer-renderers `page-renderer.test-support.tsx`；另 form-advanced 根级 `src/test-support.tsx` 同属混居（本轮保留，重复导出在 Phase 2 处理，迁移列 follow-up）。
- knip 死文件：root workspace 实测 **68**（评审复测；报告 79 为全仓口径），以 cq-1 Phase 1 落地后的基线快照为准。死文件抽查全部属实零引用：ding-flow-canvas-overlay、diff-gutter、sql/index.ts、cell-editor.tsx、scheduling 4 barrel、detail-view-transform.test-support、editor-mock 等；`flux-compiler/src/schema-compiler/index.ts` 删除安全（全仓无 `./schema-compiler/index.js` 导入，公共入口走 `./schema-compiler.js`）。
- 测试卫生：`branch-fill-2.test.tsx:104` `expect(true)` 唯一断言；全仓 `expect(true)` 实测 **3 处**（第三处 `flow-designer-renderers/src/auto-layout-guards.test.tsx:232`，尾部兜底非空测试）；`tests/e2e/debug-canvas.spec.ts` 纯诊断未 skip（waitForTimeout(3000)，≥3s/次全量）；`field-default-value-binding.test.tsx` 恰 12 处睡眠（10×500ms + 2×300ms）；全仓 ≥100ms 睡眠单一模式实测 **24 处**（口径：`await new Promise` + ≥100ms，执行时以扫描命令登记）。
- 巨型组件首批：`kanban-board.tsx` 文件 682L（主组件 ~637L、47 hook 调用、5 effect，行为测试存量 ~12 文件）；`use-conversation.ts` 文件 675L（主 hook ~629L、21 hook、9 effect，delete-during-abort/switch-loading/create/clear-all/storage/invariants 系列测试在位）。

## Goals

- 类型安全重点位清零（gantt/evaluator/renderer-api/compound/source-compiler，均以 characterisation/契约测试先行）；调试残留清零。
- playground 路由 domainId switch 单源（kind-switch 保留）；test-support 出生产 src（3 文件）；死文件/死依赖经验证清理（cq-1 基线同步收缩）。
- 测试卫生三件修复 + ≥100ms 睡眠治理 + 诊断 spec 约定。
- kanban-board 与 use-conversation 拆分至目标密度（kanban 主组件 hook ≤20、use-conversation 主 hook ≤10），行为零变更。

## Non-Goals

- 不拆其余巨型函数（crud/table/create-engine/**gantt**/flow-core/runtime-factory/wizard/upload/form-store 列 follow-up，触达时顺势拆；CQ-S6 table-header-row 深嵌套同列 follow-up，见 Deferred）。
- 不给函数级长度建门禁（先验证首批拆分模式，门禁收益待评估）。
- 不改 evaluator 数值语义（只做类型归一化 + 非法组合诊断；诊断语义：**返回 undefined 并经既有诊断通道上报，不 throw**，用户可见表现为表达式求值结果为空 + 控制台诊断）；合法路径行为由 characterisation 矩阵钉住。
- 不动 `ai/engine/utils.ts` deepClone 泛型实现（cq-2 已裁定为合理边界）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/`、`packages/flux-formula/src/evaluator.ts`、`packages/flux-core/src/types/renderer-api.ts`
- `packages/flux-renderers-industrial/src/symbols/compound.ts`、`packages/flux-compiler/src/source-compiler.ts`
- `packages/flux-runtime/src/form-store.ts`、`packages/flux-renderers-form-advanced/src/key-value.tsx`（+key-value-row 行身份测试）、`packages/flux-runtime/src/async-data/request-runtime.ts`、form-advanced test-support、industrial 两个 scada canvas 文件
- `apps/playground/src/App.tsx`、`apps/playground/src/domain-route-entries.ts`
- 三个 test-support 文件及其测试消费者
- knip 基线内经验证的死文件/死依赖
- 测试卫生文件：branch-fill-2、auto-layout-guards:232、debug-canvas.spec、field-default-value-binding、≥100ms 睡眠清单、诊断 spec
- `packages/flux-renderers-scheduling/src/kanban/`、`packages/flux-renderers-ai/src/adapters/use-conversation.ts`

### Out Of Scope

- 其余巨型函数拆分与 CQ-S6 深嵌套治理；函数级门禁；evaluator 语义增强；form-advanced 根级 test-support.tsx 迁移；任何用户可见行为变更。

## Failure Paths

| 可测场景编号            | 触发                                | 行为                                               | 可重试 | 用户可见表现                |
| ----------------------- | ----------------------------------- | -------------------------------------------------- | ------ | --------------------------- |
| route-entry-drift       | entries 表与 domainId case 集合漂移 | 对账单测双向 exit 1（报漂移 id）                   | 是     | 单测红，无用户影响          |
| evaluator-illegal-combo | 对象参与 `<` 比较/算术              | 返回 undefined + 诊断通道上报（不 throw）          | 是     | 表达式结果为空 + 控制台诊断 |
| dead-file-misjudgment   | 删除"死"文件后构建/测试引用断裂     | 全量 typecheck/build/test 拦截，恢复文件并记录误判 | 是     | 验证红                      |

## Test Strategy

档位：**必须自动化**——evaluator 先建合法操作数组合 characterisation 矩阵（number/string/boolean/null/undefined/bigint × 5 算子）钉住现行为，再实现非法组合诊断（先红后绿）；路由表完整性对账测试先红（当前 1 条漂移）后绿；拆分以既有行为测试锁定 + 拆分后全绿证明等价。

## Execution Plan

### Phase 1 - 类型安全重点位

Status: planned
Targets: gantt.tsx、evaluator.ts、renderer-api.ts、compound.ts、source-compiler.ts

- Item Types: `Proof | Fix`

- [ ] Proof：evaluator characterisation 矩阵测试（合法操作数组合 number/string/boolean/null/undefined/bigint × 5 算子，钉住现行为，先绿）；非法组合诊断期望测试（对象参与 `<`/算术 → undefined + 诊断上报，先红）
- [ ] Fix：gantt `createInitialStore(resolved: GanttSchema)`（函数内 5 处 `as any` 删除，全文件 10 处逐处核对后清零）；evaluator 分支内 typeof 归一化 + 非法组合走诊断通道（返回 undefined + reportError，不 throw；矩阵测试保持绿）；renderer-api `functions/filters` unknown 化；compound.ts 单一 `Record<string, unknown>` 中间表示 + 出口单点校验；source-compiler evaluator 输出类型参数化
- [ ] Proof：flux-formula/flux-core/industrial/flux-compiler focused 测试全绿；诊断测试转绿

Exit Criteria:

- [ ] 五个文件 `as any` 清零或仅剩注记过的单点边界
- [ ] 矩阵测试绿（行为未变）+ 非法组合诊断测试先红后绿

### Phase 2 - 定向小修批（含 4 组重复导出）

Status: planned
Targets: `form-store.ts`、`key-value.tsx`、`undo-stack.ts:185`、`request-runtime.ts:496`、form-advanced `src/test-support.tsx`、industrial `{editor/scada-editor-canvas,renderer/scada-canvas}.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix：form-store 闭包捕获 const 化消 4 处 `!.`；key-value 以**源身份稳定化**（toRawKeyValuePairs 不再逐键克隆）或按 (id,key,value) 行 memo 比较消 effect 镜像，配行身份稳定性 focused 测试（keyValueRowPropsEqual 路径）；删 undo-stack console.log；4 组重复导出别名处理——request-runtime `executeApiObject` 标 `@deprecated` 保留；form-advanced/industrial 三组消费方扫描后删除或 @deprecated（双名未进公开 index，扫描确认零消费即删）
- [ ] Proof：flux-runtime/form-advanced/**industrial** focused 测试绿；lint 绿

Exit Criteria:

- [ ] 4 处 `!.`、1 处 console.log、effect 镜像闭环清零；4 组重复导出全部 @deprecated 或删除
- [ ] focused 测试全绿（含 industrial）

### Phase 3 - playground 路由 domainId 单源化

Status: planned
Targets: `apps/playground/src/App.tsx`、`domain-route-entries.ts`

- Item Types: `Proof | Fix`

- [ ] Proof：新增 domainId 层对账测试（entries 表 79 条 ↔ App.tsx domainId-switch 78 支，双向集合比对）——先红（当前 1 条漂移暴露）
- [ ] Fix：DomainRouteEntry 增 component（lazy loader）字段，domainId-switch 退化为查表；**外层 kind-switch 6 case 保留**（每支定制布局/props，显式注记）
- [ ] Proof：playground 全部测试绿；navigation e2e focused 子集（smoke+navigation 基线 118）全绿

Exit Criteria:

- [ ] App.tsx 不再含 per-domainId case switch（查表实现）；kind-switch 保留且有注记
- [ ] 对账测试绿（漂移归零）；focused e2e 子集绿

### Phase 4 - test-support 出生产 src（3 文件）

Status: planned
Targets: form-advanced `condition-builder/config-test-support.tsx`、flow-designer-renderers `canvas-bridge-test-support.tsx`、report-designer-renderers `page-renderer.test-support.tsx` 及消费者测试 import

- Item Types: `Fix | Proof`

- [ ] Fix：三文件迁 `src/__tests__/`（或包内 test-support 目录，与既有惯例一致）；消费者 import 更新；不进公开 index；form-advanced 根级 `src/test-support.tsx` 本轮保留（多测试消费，迁移列 cq-2 follow-up，防误读此处注记）
- [ ] Proof：三包测试绿；`check:src-artifacts` 绿、knip 对这些文件无新增异常

Exit Criteria:

- [ ] 生产 src 根层不再含三文件（逐包核验）
- [ ] 测试全绿

### Phase 5 - 死文件/死依赖清理第一批

Status: planned
Targets: cq-1 Phase 1 基线快照内经验证的死文件（ding-flow-canvas-overlay、flux-compiler schema-compiler/index.ts、diff-gutter、sql/index.ts、cell-editor.tsx、scheduling 4 barrel、editor-mock、detail-view-transform.test-support 等）、3 unused deps、16 unused devDeps 中可验证者

- Item Types: `Fix | Proof`

- [ ] Fix：**顺序依赖**：本 Phase 依赖 cq-1 Phase 1 基线已落地（若执行顺序相反，则在清理后的树上生成快照再接 cq-1 门禁——两种顺序均合法，执行时记录实际顺序）；逐项验证真死（grep 动态 import/字符串注册表/文档锚点）后删除；死依赖从 package.json 移除；cq-1 基线同步收缩
- [ ] Proof：全量 `pnpm typecheck && pnpm build && pnpm test` 绿；knip 基线收缩后门禁仍绿

Exit Criteria:

- [ ] 清理清单逐项记录验证依据；基线收缩提交
- [ ] 全量验证绿

### Phase 6 - 测试卫生

Status: planned
Targets: branch-fill-2、auto-layout-guards:232、debug-canvas.spec、field-default-value-binding、≥100ms 睡眠清单、诊断 spec

- Item Types: `Fix | Proof`

- [ ] Fix：branch-fill-2:104 补 undo/redo 结果断言；auto-layout-guards:232 尾部空断言改为有意义断言或删除；debug-canvas.spec 移入 exploratory/ 或 skip+注记；field-default-value-binding 12 处睡眠换 `vi.waitFor`/`waitFor`；其余 ≥100ms 睡眠（实测 24 处，扫描命令登记于 cq-1 基线工具或本 plan）逐处裁定（可换则换，语义依赖真实时间者注记保留）；诊断 spec 统一 skip+注记或 exploratory/ 归置（CQ-T11 约定落地）
- [ ] Proof：受影响套件全绿且耗时下降（field-default-value-binding 前后耗时记录）；e2e debug-canvas 不再消耗全量时长

Exit Criteria:

- [ ] `expect(true)` 全仓 3 处清零；≥100ms 睡眠清零或注记保留清单提交
- [ ] 受影响单测 + focused e2e 绿

### Phase 7 - 巨型组件拆分首批

Status: planned
Targets: `kanban-board.tsx`（682L/主组件 47 hooks）、`use-conversation.ts`（675L/主 hook 21 hooks、9 effect）

- Item Types: `Proof | Fix`

- [ ] Proof：kanban（~12 测试文件）/use-conversation（delete-during-abort 等系列）行为测试盘点，缺口先补（列清单）
- [ ] Fix：kanban-board 按 ownership（受控/scope/local）拆自定义 hook + 子组件（主文件 <400L、主组件 hook 调用 ≤20）；use-conversation 按 effect 归属拆子 hook（主文件 <400L、主 hook 调用 ≤10）
- [ ] Proof：两包 focused 测试全绿；主文件行数与 hook 数前后对比记录（repo-observable）

Exit Criteria:

- [ ] 两个主文件 <400L 且 hook 数达标（≤20 / ≤10）
- [ ] scheduling/ai focused 测试全绿（行为测试零改动通过）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b6883b2a，两轮）
- Verdict: 首轮 `fail`（0 Blocker + 5 Major）→ 修订 → 第二轮 `pass-with-minors`（零 Blocker/Major；2 条 Minor 已当场修正：Deferred 计数 8→9、本记录回填）
- Rounds: 2
- Findings addressed: M1（Phase 5 声明对 cq-1 Phase 1 的顺序依赖 + 双向顺序均合法、"已登记"改"落地后生效"、文件数以快照为准 68）、M2（Source 行移除 CQ-S6；Non-Goals/follow-up 清单修正含 gantt；CQ-S6 入 Deferred）、M3（4 组重复导出全路径枚举 + industrial Proof + 消费方扫描）、M4（Phase 3 收窄至 domainId 78↔79、kind-switch 6 case 保留注记、对账先红暴露漂移）、M5（evaluator characterisation 矩阵前置 + 诊断语义定义 + Failure Paths 增行）；吸收 Minor：gantt any 全文件口径、84/79 计数、睡眠 24 处可复现口径、auto-layout-guards 第三处 expect(true)、key-value 修复改源身份稳定化方案、Closure Gates 增 pnpm check、Phase 7 数值目标、form-advanced 根级 test-support 注记

## Closure Gates

- [ ] Phase 1-7 全部 completed，各自 Exit Criteria 全勾
- [ ] 类型安全重点位/调试残留/弱断言/死文件清理的 grep 或工具证明在位
- [ ] cq-1 各基线同步收缩后仍绿（knip/console/duplicates）
- [ ] owner docs：No owner-doc update required（无契约/设计变更；路由表为 playground 内部结构）
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### CQ-S6 table-header-row 深嵌套治理

- Classification: `optimization candidate`
- Why Not Blocking Closure: 扁平树/嵌套树双路径拆分需列配置表重构（16 层嵌套、两个 200L+ 函数），量大且独立；待首批拆分模式验证后随 table-renderer 触达顺势进行
- Successor Required: `no`
- Successor Path: Non-Blocking Follow-ups

### 其余 9 个巨型函数拆分

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首批两处验证拆分模式与收益后，其余在触达各文件的功能变更中顺势进行，避免一次性 4000+ 行纯重构 churn
- Successor Required: `no`
- Successor Path: Non-Blocking Follow-ups

### 函数级长度/复杂度门禁

- Classification: `optimization candidate`
- Why Not Blocking Closure: 待首批拆分模式成熟后评估阈值与误报率再定
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- crud/table/create-engine/gantt/flow-core/runtime-factory/wizard/upload/form-store 拆分（触达时顺势）
- CQ-S13 剩余 console.warn/error 管道统一（warn-once 模式推广）——cq-1 已建门禁面，治理另行
- form-advanced 根级 `src/test-support.tsx` 迁移（cq-2 follow-up 同项）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>
