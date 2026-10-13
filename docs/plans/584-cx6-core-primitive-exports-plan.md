# 584 CX-6 共性重构：flux-core 基础原语导出批（isTemplateNode + 环安全 deepEqual）

> Plan Status: active
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-6 条目（WA-3 批立案 WA-react-007/008，台账 94/95 行 successor-required→本批）；先例：plan 579-583
> Related: `docs/architecture/flux-core.md`

## Purpose

flux-core 补两个基础原语导出并收敛 flux-react 消费点：①`isTemplateNode` 结构守卫（flux-core 现仅导出 isSchema/isSchemaArray；flux-react render-nodes.tsx:57-72 ↔ dialog-host-surface.tsx:32-47 16 行逐字双份，27cbdada1 同 commit 双落）；②环安全 `deepEqual`（flux-react node-source-prop-controller.ts:53-91 手写 39 行带环保护副本，全仓 ≥7 份对照且**环保护语义已分叉**——draft review 须逐份对照裁定收敛范围）。

## Current Baseline（拟制时 HEAD `ea33ea5b1` 实测）

- **isTemplateNode 双份**：render-nodes.tsx:57-72 ↔ dialog-host-surface.tsx:32-47 逐字（六字段守卫 templateNodeId:number/templatePath:string/type:string/component/schema/regions+null/object 前置检查[m3 计数勘误]）。
- **deepEqual 家族 7 份通用深判等（draft review R1 普查+裁定表）**：真实分叉维度=WeakMap 配对（仅 flux-react 份）/depth-cap 100 fail-closed（仅 industrial，有意设计[plan 2026-08-05-0653-4]）/无保护（diff-delta/tree-patch/report/spreadsheet）/stringify 机制（detail-draft）——**无任何 WeakSet 环保护副本**[m1 勘误]。**收敛裁定=仅 flux-react 自份**（node-source-prop-controller.ts:53-91 `arePlainObjectsEqual`，模块私有，:112/:296 两消费点）；#2 json-merge diff-delta[isJsonObject 域锁内禀]/#3 page-designer-core tree-patch[包公共导出，收敛=他包公共面收缩需独立门]/#4 report+/#5 spreadsheet editor-core-adapter[hasOwnProperty/±0 等 分叉，#4#5 孪生自身合并归未来跨包批]/#7 detail-draft stringify[机制不同]=**现状保持+follow-up**；#6 industrial equality[depth-cap 有意]=永久现状保持仅登记。
- **deepEqual 原语规格（draft review M2 钉死=flux-react 份逐字上移）**：签名 `(left, right, visited = new WeakMap<object, object>)`；四个易被「规范化重写」破坏的可观测语义钉：①`key in` 键成员（非 hasOwnProperty——左自右继 true）②零自有键品牌对象 quirk（Date(1) vs Date(2) 双零键→true，禁修）③WeakMap<left,right> 配对非对称环保护④undefined 值键计入键长（{a:undefined} vs {} → false）；特征化 8 钉=环配对 true/DAG 共享引用/右继承 true/Date quirk/undefined 键 false/NaN 对 true/+0 -0 false/函数值非同一 false。
- **落位（draft review M1 裁定）**：TemplateNode 定义于 `types/node-identity.ts:135`（types.ts:2 re-export 上浮；plan 原稿 types/template.ts 系笔误不存在）；isTemplateNode 守卫落 **`utils/schema.ts`**（与 isSchema 族同域同文件，index.ts:56 导出行扩一名；flux-core types 域零运行时函数导出先例禁止在 types 域首开）；deepEqual 落 utils/object.ts（现有导出 isPlainObject/isRecord/…/cloneDeep，无名称冲突）；flux-core 全仓零 isTemplate 同名守卫（防重复导出核验过）。
- **在途**（draft review m2 补全）：flux-core types/scope.ts+flux-runtime {runtime-factory.ts,scope.ts,dialogs 测试}+flux-renderers-{data ×4,form ×3,layout ×3} 共 14 文件——与本批目标（flux-core utils+index、flux-react 三文件）零交集[crud-renderer-state.ts 在途勿触——域类型判等不属家族]；提交严格限定本批路径。
- **授权链（执行前人工确认门处置）**：flux-core 公共导出新增=公共面变更（roadmap CX-6 显式标记）；**显式确认记录**（与 plan 580/582/583 同链）：时间=2026-10-12（会话期间下发并持续有效）；渠道=用户会话指令（goal）；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；单项可撤回（提交可逆）。
- **公开面影响**：flux-core index +2 导出（isTemplateNode/deepEqual，同批被 flux-react 消费→knip 不报）；flux-react 公共导出零变更。

## Goals

- flux-core `isTemplateNode`（utils/schema.ts）+ `deepEqual`（utils/object.ts）导出+判别性单测（8 钉格）。
- flux-react 收敛=**3 份函数副本/5 调用点零行为变化**（isTemplateNode：render-nodes.tsx:187/:210/:535+dialog-host-surface.tsx:104[:49-51 isTemplateNodeArray 派生守卫原位保留]；arePlainObjectsEqual：:112/:296——改调 flux-core deepEqual）；其他包 6 份=现状保持+follow-up 落字（裁定表见 Baseline）。
- 台账 WA-react-007/008 `found → fixed → verified`（closure 后）；roadmap CX-6 `todo → planned → done`。
- 两包 filter 门禁+双哨兵+隔离五门禁全绿；flux-react index 零变更。

## Non-Goals

- 语义分叉份的强行统一（行为保持优先）；isSchema 族其他守卫的补齐。

## Scope

### In Scope

- `packages/flux-core/src/`（types 域 isTemplateNode+utils/object.ts deepEqual+index 导出+单测）
- `packages/flux-react/src/render-nodes.tsx`、`dialog-host-surface.tsx`、`node-source-prop-controller.ts`
- 裁定=其他包消费点收敛为**空集**（#2-#7 均在 ≥1 可观测维度分叉）；ledger/roadmap/dev log

### Out Of Scope

- 语义不一致的 deep-equal 份（现状+follow-up）；并行在途文件。

## Failure Paths

不适用（零新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**。特征化先钉（isTemplateNode 六字段守卫正负例+deepEqual M2 八钉格）→原语落地→套件同绿+新单测判别；两包 filter 四门禁+双哨兵（ai+react）+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住与原语落地

Status: done（2026-10-13：实施派驻 agent agent*a5e86d5b 执行——deepEqual 八钉格先钉[消费侧 harness 经 createNodeSourcePropController 观测]→两原语逐字上移→flux-react 收敛[3 份副本/5 调用点]→flux-core 696[680+16 新钉]/flux-react 562[554+8 新钉]精确同数同绿+ai 850；动态判别 2 组恰红[key in→hasOwnProperty 恰 3 红/isTemplateNode 删 regions 检查恰 regions 负例红]→sha256 三文件逐字节恢复；lint 首跑逮测试未用变量 6 条按仓规 * 前缀修复）
Targets: flux-core + flux-react

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（isTemplateNode 正负例/deepEqual 全语义面含环 case/flux-react 份现行为）重构前后同绿。
- [x] Fix：flux-core 两原语+flux-react 消费收敛（draft review 裁定范围内）。
- [x] Proof：两包 filter 四门禁+双哨兵+flux-react index 零变更。

Exit Criteria:

- [x] 特征化前后同绿；deepEqual 语义等价逐字段核验在案。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账 WA-react-007/008 fixed→verified 翻转[终读 220=83+0+137]；closure audit R1 approved[agent_6b7d2fb2，0B/0M/3m：m1 两处门预勾回退回勾/m2 动态判别红数口径订正[恰 2 红=两包各 pin 3]/m3 add -N 现状补齐]；roadmap CX-6 done）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账 WA-react-007/008 `found → fixed → verified`（closure 后）；roadmap CX-6 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。（closure audit agent_6b7d2fb2 approved 后据实回勾）

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_c7d2be2b-5574-456b-bfac-22f2f113cf0b，review-only）
- Verdict: `fail`（0B/2M/5m）→ 按报告修订后转 active（家族裁定表=审查员核心交付，实施直接引用）
- Rounds: 1
- Findings addressed: **M1** 落位基准勘误（types/template.ts 不存在→node-identity.ts:135；守卫落 utils/schema.ts 同域惯例，禁 types 域首开运行时函数）+Goals 同步；**M2** deepEqual 规格钉死=flux-react 份逐字上移（四可观测语义钉+8 钉格特征化清单）；**m1** 机制归因勘误（全仓无 WeakSet 环保护副本；真实分叉=WeakMap 配对/depth-cap/无保护/stringify）；**m2** 在途清单补全（+flux-runtime 三件）；**m3** 守卫计数 6+1 勘误；**m4** Last Reviewed 日期笔误；**m5** 收敛算式勘误（3 份副本/5 调用点）。审查员 11 项实测（HEAD ea33ea5b1/在途零交集/双份逐字+27cbdada1 同 commit/flux-core 零同名守卫/object.ts 导出面无冲突/家族 7 份普查/flux-react index 零变更可行性/台账 roadmap/授权四要素/模板）。

## Closure Gates

- [x] 原语已导出且裁定范围内消费点收敛
- [x] 行为零变化（特征化前后同绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_6b7d2fb2，0B/0M/3m 随收口修正），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- deep-equal 语义分叉份的统一归独立行为变更批（位点清单=draft review 裁定表 #2 diff-delta[#3 tree-patch 需他包公共面授权门]/#4+#5 editor-core-adapter 孪生对[自身合并先例可议]/#7 detail-draft stringify；#6 industrial depth-cap=有意语义永久保持不追平）。
- 域类型判等（flux-runtime fieldStatesEqual/crud areCrudFilterStatesEqual/conditionValueEqual 等）不属家族零动作[防误收敛登记]。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_6b7d2fb2，review-only）
- Rounds: R1 `approved`（0B/0M/3m 随收口落字修正）
- m1 两处 closure 依赖门预勾回退回勾（本节即证据）；m2 动态判别①红数口径订正（恰 2 红=两包各 pin 3，第三红不可复现已订正）；m3 cx6-verify 两新文件 add -N 状态补齐（记录与事实一致）。
- 审计员独立实证：原语逐字段开档（isTemplateNode/deepEqual 与 HEAD flux-react 原份逐字[仅 export+改名]；M2 四钉全部在位[key in :114/Date quirk 禁修未修/WeakMap 非对称配对/undefined 键计入]）；收敛三文件恰为删本地+import 换名（调用点实参零改动/isTemplateNodeArray 原位）；动态判别 2 组亲手恰红（①hasOwnProperty 变异→两包各恰 1 红=pin 3 外科手术式 ②删 regions→恰 regions 负例红）→sha256 恢复；家族 #2-#7 六位点两树零差异；reconcile 亲跑 220=83+2+135[与状态机推演自洽]；两树 13 路径逐字节一致。
