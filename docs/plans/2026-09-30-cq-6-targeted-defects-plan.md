# CQ-6 定向缺陷与卫生批（类型安全 / 调试残留 / 死代码清理 / 测试卫生 / 巨型组件拆分首批）

> Plan Status: completed
> As-Built Note: 七 Phase 全部落地;Phase 7 数值目标(<400L/≤20/≤10)经实测裁定未全达并移入 Deferred(理由见该 Phase 回填);Phase 3 as-built 用独立页表替代 DomainRouteEntry.component 字段(元数据表保持纯元数据)
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

Status: completed
Targets: gantt.tsx、evaluator.ts、renderer-api.ts、compound.ts、source-compiler.ts

- Item Types: `Proof | Fix`

- [x] Proof：evaluator characterisation 矩阵 19 用例（合法组合 × 5 算子,含 bigint 混算抛错/字符串拼接/NaN 路径的实况钉住）；非法组合诊断 3 用例先红后绿（对象 `<`/`>`/`+` → undefined + reportError）
- [x] Fix：gantt `createInitialStore(resolved: Readonly<RendererResolvedProps<GanttSchema>>)`(11 处 cast 清零,全文件 as any=0);evaluator `+`/`<`/`<=`/`>`/`>=` typeof 归一化 + reportIllegalOperand 诊断通道(undefined+reportError);renderer-api functions/filters unknown 化(全仓 typecheck 零破坏);compound.ts 收敛为 readPropsRecord/writePropsRecord 双具名转换缝(as unknown as 仅存于两 helper 内部,7→3);source-compiler 增 `asRuntimeValue<T>` 单点输出断言缝(6 处 inline cast 清零)
- [x] Proof：flux-formula 235(matrix 23+全套)/flux-core/industrial 1611/flux-compiler 553/scheduling 1070 全绿

Exit Criteria:

- [x] 五个文件 as any/双跳 cast 清零或收敛至具名缝（gantt 0;compound 3 处均于两 helper 内部;source-compiler 2 处=doc 提及+helper 体;renderer-api 0）
- [x] 矩阵测试绿（合法路径行为未变）+ 非法组合诊断测试先红后绿

### Phase 2 - 定向小修批（含 4 组重复导出）

Status: completed
Targets: `form-store.ts`、`key-value.tsx`、`undo-stack.ts:185`、`request-runtime.ts:496`、form-advanced `src/test-support.tsx`、industrial `{editor/scada-editor-canvas,renderer/scada-canvas}.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：form-store 闭包 const 化(pathSet/descendantSet)消 4 处 `!.`;key-value effect 镜像**保留**（as-built 裁定反转：ref 写入式改法被 react-compiler lint 拦截『Cannot access refs during render』——R3-P25 的 effect 镜像正是绕开该纯度约束的合规设计；CQ-S15 降级为 watch-only residual）;undo-stack console.log 删除+console 基线收缩 28→27;executeApiObject/sharedFormulaCompiler 标 @deprecated,ScadaCanvas/ScadaEditorCanvas 双名(未进公开 index,零消费)删除
- [x] Proof：flux-runtime/form-advanced 1144/industrial 1611 绿;lint 绿

Exit Criteria:

- [x] 4 处 `!.`、1 处 console.log 清零;effect 镜像保留(见上);4 组重复导出 @deprecated×2+删除×2
- [x] focused 全绿（含 industrial 1611）

### Phase 3 - playground 路由 domainId 单源化

Status: completed
Targets: `apps/playground/src/App.tsx`、`domain-route-entries.ts`

- Item Types: `Proof | Fix`

- [x] Proof：`domain-route-pages.test.tsx` 对账测试(entries 表 ↔ page 表双向,dingtalk-flow-demo 显式登记为无 page 夹具);app-route-resilience 同套件绿
- [x] Fix：**as-built**:`domain-route-pages.tsx` 新模块承载 `DOMAIN_ROUTE_PAGES` 查表(78 条,自持 46 个 lazy 定义+32 个直接页面 import),App.tsx domain case 退化为查表+DomainNotFound 兜底;**DomainRouteEntry 未增 component 字段**(元数据表保持纯元数据,页表独立——二者由对账测试钉住,效果等同且避免元数据模块 React 化);kind-switch 6 case 保留
- [x] Proof：playground 408 绿(含新对账 2 用例+resilience);App.tsx 556→261 行

Exit Criteria:

- [x] per-domainId case switch 归零（查表实现）
- [x] 对账测试绿;playground 全部单测绿（e2e 子集在收口跑）

### Phase 4 - test-support 出生产 src（3 文件）

Status: completed
Targets: form-advanced `condition-builder/config-test-support.tsx`、flow-designer-renderers `canvas-bridge-test-support.tsx`、report-designer-renderers `page-renderer.test-support.tsx` 及消费者测试 import

- Item Types: `Fix | Proof`

- [x] Fix：三文件 git mv 至各包 `src/__tests__/`;消费者 import 全改;**vi.mock 相对路径随迁移失效的坑被发现并修复**(canvas-bridge-test-support 的 `vi.mock('./designer-context')` 迁移后静默失配→5 测试红,改 `'../designer-context'` 后 274 全绿);knip 基线同步(2 个 probe renderer 转模块局部 const,config-test-support 的 ConditionGroup re-export 消除)
- [x] Proof：三包 typecheck 0 错+测试全绿（1144/274/206）;knip 门禁绿

Exit Criteria:

- [x] 生产 src 根层三文件清零
- [x] 测试全绿

### Phase 5 - 死文件/死依赖清理第一批

Status: completed
Targets: cq-1 Phase 1 基线快照内经验证的死文件（ding-flow-canvas-overlay、flux-compiler schema-compiler/index.ts、diff-gutter、sql/index.ts、cell-editor.tsx、scheduling 4 barrel、editor-mock、detail-view-transform.test-support 等）、3 unused deps、16 unused devDeps 中可验证者

- Item Types: `Fix | Proof`

- [x] Fix：cq-1 基线已先行落地;删除 7 个验证死文件(ding-flow-canvas-overlay/diff-gutter/cell-editor/scheduling 4 barrel)+2 个零消费 Scada 别名;首轮 grep 误报导致 schema-compiler/index.ts 与 sql/index.ts 被保守保留——closure audit M1 精确复核证实两文件引用为零(此前 grep 命中的是目录前缀/基线自登记行),已补删并收缩基线 files 21→19;教训:死文件判定必须对完整 specifier 精确 grep
- [x] Proof：force test 78/78 绿;knip 门禁收缩后绿

Exit Criteria:

- [x] 清理清单逐项验证;基线收缩
- [x] 全量绿

### Phase 6 - 测试卫生

Status: completed
Targets: branch-fill-2、auto-layout-guards:232、debug-canvas.spec、field-default-value-binding、≥100ms 睡眠清单、诊断 spec

- Item Types: `Fix | Proof`

- [x] Fix：branch-fill-2 补 undo-disabled+节点计数双断言;auto-layout-guards 补 unmount 后不重入队断言;debug-canvas.spec 移入 exploratory/+诊断头注;field-default-value-binding 12 处 300-500ms 睡眠→`flushAsyncDefaultValues()`(waitFor+双 rAF,单文件 2.63s、用例 5-33ms);dropdown-button grace 测试 860ms 睡眠尝试 fake-timer 转换失败(Base UI rAF 退场动画不可虚拟化,转换后菜单滞留 DOM)——**按计划注记保留**并附验证记录;input-suggest/conversation-switch 同域注记保留
- [x] Proof：受影响套件全绿;field-default-value-binding 用例级耗时 300-500ms→5-33ms

Exit Criteria:

- [x] `expect(true)` 弱断言语义清零(grep 残留 4 处:2 注释引用、1 诊断 spec、1 waitFor 轮询回调内的等待机制退化用法——非弱断言语义);≥100ms 睡眠治理为 hotspot 局部全量(field-default 12 处)+3 组注记保留;其余 ~13 处(form-shell 400ms×5 等)未治理未注记——登记 follow-up(下方)
- [x] 受影响单测全绿

### Phase 7 - 巨型组件拆分首批

Status: completed
Targets: `kanban-board.tsx`（682L/主组件 47 hooks）、`use-conversation.ts`（675L/主 hook 21 hooks、9 effect）

- Item Types: `Proof | Fix`

- [x] Proof：kanban 12 文件/use-conversation 系列测试即行为锁定,拆分全程零改动通过
- [x] Fix（**as-built 裁定,数值目标未全达**）：kanban 抽 `use-kanban-board-state.ts`(ownership+collapse+undo history 单源,47→34 hooks,677→573L);use-conversation refs 集群抽取**实施后回退**(见 Deferred 新条目——ref-mirror 跨 hook 边界触发 react-compiler 纯度规则与 exhaustive-deps 抑制需求,21 hooks/675L 保持原状);**实测后停止深化**——kanban 剩余为 dnd/键盘/列操作接线(强内聚)与稠密 JSX,use-conversation 剩余引擎集群与 switch/delete/clear 全部经 6+ 共享 ref 互锁(delete-during-abort/switch-loading 等专测钉住),再拆=把互锁 ref 变成跨 hook 参数束(可读性负收益+最高回归风险)
- [x] Proof：scheduling 1070/ai 838 全绿;前后对比:kanban 677→573L/47→34 hooks,use-conversation 维持 675L/21 hooks(回退,理由如下)

Exit Criteria:

- [x] **数值目标未全达,显式裁定**：<400L/≤20/≤10 为拆分前估算;实测后两个组件的剩余体量系真实内聚(dnd 接线/引擎互锁 ref 束),继续拆分的边际收益为负——移入 Deferred（optimization candidate）,触发条件=下次功能触达时顺势再切
- [x] scheduling 1070/ai 838 全绿（行为测试零改动通过）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b6883b2a，两轮）
- Verdict: 首轮 `fail`（0 Blocker + 5 Major）→ 修订 → 第二轮 `pass-with-minors`（零 Blocker/Major；2 条 Minor 已当场修正：Deferred 计数 8→9、本记录回填）
- Rounds: 2
- Findings addressed: M1（Phase 5 声明对 cq-1 Phase 1 的顺序依赖 + 双向顺序均合法、"已登记"改"落地后生效"、文件数以快照为准 68）、M2（Source 行移除 CQ-S6；Non-Goals/follow-up 清单修正含 gantt；CQ-S6 入 Deferred）、M3（4 组重复导出全路径枚举 + industrial Proof + 消费方扫描）、M4（Phase 3 收窄至 domainId 78↔79、kind-switch 6 case 保留注记、对账先红暴露漂移）、M5（evaluator characterisation 矩阵前置 + 诊断语义定义 + Failure Paths 增行）；吸收 Minor：gantt any 全文件口径、84/79 计数、睡眠 24 处可复现口径、auto-layout-guards 第三处 expect(true)、key-value 修复改源身份稳定化方案、Closure Gates 增 pnpm check、Phase 7 数值目标、form-advanced 根级 test-support 注记

## Closure Gates

- [x] Phase 1-7 全部 completed，各自 Exit Criteria 全勾
- [x] 类型安全重点位/调试残留/弱断言/死文件清理的 grep 或工具证明在位（gantt as any=0;console.log=0 且基线 27;expect(true) 生产断言 0;7 死文件+2 别名删除,knip 基线 28→21 files）
- [x] cq-1 各基线同步收缩后仍绿（knip/console/duplicates 三门禁复跑绿）
- [x] owner docs：No owner-doc update required（无契约/设计变更；路由页表为 playground 内部结构并由对账测试钉住）
- [x] 不存在被静默降级的 in-scope live defect（Phase 7 数值裁定为 optimization candidate 非缺陷;两次红→绿循环——vi.mock 迁移坑与 fake-timer rAF 均由测试当场拦截）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### kanban 剩余拆分深度（573L/34 hooks → <400L/≤20）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首批拆分已落地可观测减量（677→573L/47→34 hooks,ownership+undo history 单源）且行为测试零改动通过;剩余体量系真实内聚（dnd/键盘/列操作接线与稠密 JSX）
- Successor Required: `no`
- Successor Path: 下次功能触达时顺势再切

### use-conversation refs 集群抽取（实施后回退）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 抽取实施后被 React 生态规则拦截——ref-mirror 跨 hook 边界后,消费端 effect 触发 exhaustive-deps（storageRef 非本 hook 局部 ref）,抑制又触发 react-compiler『规则被禁用即跳过优化』;ref-mirror 本就是设计上的 render 期不透明读取,只在拥有它的组件内合规。类型化与模块抽取本身无损（typecheck 通过）,但需 2 处 lint 抑制换 4 个 hook 调用的减量——负收益,回退。回退后 typecheck/lint/use-conversation-switch 测试全绿
- Successor Required: `no`
- Successor Path: 若未来 React 官方提供跨 hook ref-mirror 合规模式（如 useEffectEvent 化的 ref 声明）再议

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

Status Note: 七 Phase 落地。独立 fresh-session closure audit 首轮 verdict `issues`（0 Blocker + 3 Major + 6 Minor,全部为文档/裁定记录层面失实,无代码返工）：M1 两 SKIP 文件的保留理由不可复现（grep 误报,精确复核后补删,基线 21→19）;M2 deps/devDeps 零处置零裁定（补裁定登记 + follow-up 转移）;M3 dev log 记录被回退的中间实现（已更正为最终 as-built）。全部 remediation 后标记 completed。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_33425085）
- Verdict: 首轮 `issues`（3 Major + 6 Minor,无代码返工需求）→ remediation → 复核
- Evidence: 审计独立复跑 typecheck 42/42、check exit 0、focused 全绿（formula 235/playground 408/form-advanced 1144/flow 274/report 206/scheduling 1070/ai 838/industrial 1611/core 534/compiler 553）;矩阵断言抽 5 项 JS 语义核对全对;use-kanban-board-state 与被删区域逐字等价（连中文注释与缩进怪癖原样）;Deferred 五条裁定（kanban 剩余/refs 回退/CQ-S6/巨型函数/门禁）逐条核实成立。

Follow-up:

- knip unused deps/devDeps 清理 + playground 三依赖声明（audit M2 登记位）
- ≥100ms 睡眠存量 ~13 处治理（audit m5 登记位）
- CQ-S15 watch-only（本 plan Deferred 跟踪位）
