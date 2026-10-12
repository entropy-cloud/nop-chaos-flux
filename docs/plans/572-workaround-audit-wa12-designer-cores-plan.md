# 572 workaround-audit WA-12 设计器内核层审计批（editor-core + page-designer-core + flow-designer-core + report-designer-core + spreadsheet-core + word-editor-core）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-12 工作项，Phase Status 第 13 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/571/570/569`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-13b/report.md`（转发项承接：WA-reportr-008 + word-editor-core 两项只读参考）；`docs/audits/workaround-code-smell/wa-13a/report.md`（pager-004 core 归属评估注记）；`docs/audits/workaround-code-smell/wa-10/report.md`（误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对设计器内核层六包（editor-core、page-designer-core、flow-designer-core、report-designer-core、spreadsheet-core、word-editor-core）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，六模块）：editor-core 5 文件/701 行 + flow-designer-core 29/5,624 + page-designer-core 13/1,722 + report-designer-core 14/2,443 + spreadsheet-core 28/4,742 + word-editor-core 14/1,876 = **103 文件/17,108 行**（roadmap 行"约 17.0k"系拟制估算，以 inventory 为准）。
- **在途漂移口径（拟制时实测 2026-10-12）**：六包 `git status` **零在途**。拟制时 HEAD = `b3fb1dbfe`（WA-10 收口提交）；修订时 HEAD = `502d6be7e`（WA-11 收口提交，隔离五门禁全绿为生效基线）；执行时以当时 HEAD 快照注记。
- **字面标记**：literalEn/literalZh **0**（wa-10 后连续第五个双零批组；inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：typeBypass **4**（flow-designer-core 2/page-designer-core 2，其余 0）；setTimeout/domRaid/silentCatch 等以 inventory baseline 落字（拟制速览全零）；**候选量历批最小**。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **15 行命中**（editor-core ×3[editor-core.ts:34,126,148]、flow-designer-core ×4[core-edge-commands:86,215/core-node-commands:51,155]、report-designer-core ×2[core-dispatch:221,370]、spreadsheet-core ×2[core-dispatch:41/search-operations:19]、word-editor-core ×4[document-io:403,415,505,517]——逐个去重定性）；`check:audit-performance-suspects` **3**（flow-designer-core clone.ts:59 双报 + tree-validation.ts:79——逐个定性）；reactive-render-reads/runtime-raw-schema-reads/hardcoded-type-dispatch/renderer-browser-io 均 **0**（实跑留痕）。
- **oversized 登记债口径**（draft review m4 修订：拟制时枚举）：六包 ≥500 行非测试源 **6 件**（flow-designer-core core.ts 697 / tree-projection.ts 674 / types.ts 511；report-designer-core core.ts 536；spreadsheet-core formula/formula-engine.ts 551；word-editor-core document-io.ts 549——find+wc 口径，gate 读数各 +1 系无尾换行差）；≥500 行源文件一律结构走读；执行时以 `check:oversized-code-files` 六包过滤复测落字。
- **knip 登记债口径**（draft review M1 修订）：`scripts/baselines/knip-baseline.json` 六包在案 **135 条**（exports 105 + types 29 + dependencies 1，flow-designer-core 与 spreadsheet-core 占绝对多数）——①该登记死代码面本身是 §5 取证的现成证据输入（I 类转正/W2 出口核对、deprecated-feature-cleanup 处置裁定逐条落字）；②check 门禁 knip 相遇以批前基线为准（plan 568/569/571/573 四批收口均记录 knip 相遇、两批首跑即红——本批修复致基线符号路径变化沿 plan 571 先例**以修代重立基线**或收私，随收口披露）；③执行时以基线 live 复测落字。
- **包特性与审计重心**：①六包均为**设计器内核纯逻辑层**（无 React 渲染/DOM 依赖为主）——九类信号中的 A（症状特判）/B（静默兜底）/H（复制沉积）在命令分发/undo/序列化管线中的分布为本批重心；②跨包同构嫌疑：report-designer-core/spreadsheet-core 各有 `core-dispatch.ts`（async 各 2 行命中）+ flow core-edge/core-node commands——六包内核若存在跨包复制的命令/分发骨架，按 §3 两步协议裁定（CX-n 潜在点）；③editor-core 仅 5 文件/701 行（六包中最小）；④word-editor-core document-io 异步导入导出链（async ×4）。
- **承接转发（前批登记，本批必查项）**：①**WA-reportr-008**（wa-13b 立案 successor-required）——report↔spreadsheet 快照切片族跨包孪生 ~40 行，自然 home=spreadsheet-core（SpreadsheetRuntimeSnapshot 同文件家族）；slice/selector/equal 三符号的 core 侧导出评估归本批（**注意**：六包 index.ts 批内零变更条款不变——评估结论若为「应导出」则登记 CX-n/watch 留人工，不批内实施）；②**word-editor-core 两项只读参考**（wa-13b 转发）——titleId 契约完整性（WA-wordr-007 兜底根因在 core 侧 id 契约缺口）与无头预览/搜索计数能力缺口（WA-wordr-005/006 占位根因），本批取证时作为必查线索复核；③**WA-13a pager-004 评估注记**——page 侧 getSchemaType helper 的「归属 core 更优否」评估归本批（同上，涉公共面只登记不实施）。
- **交界防重复**：①WA-1..11 已立案发现与 CX-1..17 覆盖面不重复立案（尤其 CX-10 event 键契约、CX-13 Tree 族——设计器渲染层 WA-13a/b 才触及 renderers，本批纯 core；CX-16 上下文菜单壳与 CX-17 drag ghost 均为 renderers 层发现，core 侧预期记不适用但遇交界显式核对）；②interaction-state 轨道 IS-1 flow-designer（plan 544）、IS-6+ 系列设计器域工作项已收口的交互面结论直接引用；③flow-designer-core 的 tree-projection/tree-session（plan 544 种子 002 viewport 保持修复）与 **fdChainGap/**fdBranchGroupOwner 投影装饰（plan 544 种子 001/004）为考古锚——本批不翻案；④designer-shell collapsed 接线（plan 538）触及各 renderers，不涉 core。
- **保护区与授权条款**：①六包 `src/index.ts` 公共导出 = **批内零变更**。②Renderer definition fields = plan-first。③schema/contract validation 属保护区——flow-designer-core/tree-validation.ts 与各 core-dispatch 的校验逻辑变更 plan-first（本 plan 即载体）。
- **跨包测试隔离条款（WA-7 教训固化）**：批内任何提取/重写不得把带副作用的调用提升进模块顶层求值路径；凡修复触及模块求值面，除涉包 filter 四门禁外加跑 **flux-renderers-ai 全量 + flux-react 全量**（双哨兵）。
- **五门禁基线**：拟制时点 = WA-10 收口（b3fb1dbfe）隔离全绿；WA-11 收口后以收口提交的隔离五门禁全绿为生效基线。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/dropdown/layout 14 文件）与六包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-12/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（103 文件分档落字）。
- findings 全量登记 ledger（六前缀 `WA-editor-core-001`/`WA-page-designer-core-001`/`WA-flow-designer-core-001`/`WA-report-designer-core-001`/`WA-spreadsheet-core-001`/`WA-word-editor-core-001` 起，与既有前缀零撞号——以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；六包 `index.ts` 零公共导出变更。
- 台账 modules 六行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发；跨包 core-dispatch 同构为潜在点）。

## Non-Goals

- 结构性重构的批内实施；六包 `index.ts` 公共导出面的任何增删。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..11 已立案发现重复立案；CX-15 覆盖面重复立案。
- 设计器 renderers 层（WA-13a/b 批）与 playground designer-hosts（WA-15a 批）。

## Scope

### In Scope

- 六包 `src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-12/report.md` + ledger 登记/翻转 + roadmap WA-12 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；设计器 renderers 层与 playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑涉包 `pnpm --filter <pkg> typecheck/build/lint/test`；触及模块求值面的修复加跑双哨兵；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: 六包 `src/`（读）、`docs/audits/workaround-code-smell/wa-12/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走（独立取证 agent 产出报告，执行中因用量上限中断一次、报告完整落盘后恢复）——候选逐个定性（async 15 行全豁免+1 watch；perf 3 全豁免；typeBypass 4 全豁免；七探针全零历批最少候选量；Math.random/Date.now 盲区探针 17 处定性；模块顶层求值面单列 1 处[elk-layout]）+ 门禁交叉（其余 4 门禁+oversized 实跑留痕）+ 重复块双探针（逐字 15,756 窗→75 组坐实 5 簇/归一 15,486 窗→551 组+走读补 3 组盲区；跨包 core-dispatch 同构必查项=report↔spreadsheet 命令边界协议平行设计记豁免、undo/redo 骨架孪生入 CX-18）+ 范围结构走读（103/103 全文覆盖；≥500 行 6 件全读；三口径 17,108 逐文件零差）+ 三档处置（cq-2 收口断言 live 复核发现失真→立案 002；cq-3/cq-4/cq-5/cq-6 零复发或不适用）+ knip 135 条登记死代码面逐档定性（Baseline ③条款：66 条 handle\* registry 冗余/行为死代码仅 2 条/测试基建豁免）+ 误报排除 20 项。
- [x] Proof：每个立案候选 git 考古（21 commit；症状性 message 抽检 40/40=0——2026-06 后 40 条全集全查；0e5c670c3 单 commit 双声明族/eb99fc99f→dccce0022 canonical 早生链/d2b7bef55 双写波全核验）。
- [x] Decision：严重度 + ROI + 共性裁定——**13 条立案（P1×3+P2×1+P3×9，零 P0；editor-core 零立案）**；去向=fixed 11+successor-required 1[spreadsheet-002]+watch-only 1[spreadsheet-003]；承接转发三项评估落字（reportr-008「应导出」成立→CX-18、word-editor-core 两项根因确证留 watch、pager-004「core 更优非必要」watch）；**CX-18 插入 roadmap**（report↔spreadsheet 跨包孪生三构件并案+readonly 门类型化评估+handle\* 收私批注记）。
- [x] Proof：`wa-12/report.md` 落盘，findings 全量登记 ledger（13 行）；reconcile 通过（181=found 86+fixed 11+verified 84/未处置 0/violations 0）。

Exit Criteria:

- [x] `wa-12/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（103 文件分档落字，行数三口径零差）。
- [x] ledger 与报告一一对应零遗漏（零撞号——六前缀 live 核验）。
- [x] 每个立案有 git 考古读数；误报排除逐项有对照理由（20 项+knip 135 条逐档）。
- [x] 共性裁定落字（CX-18 插入+承接转发三项评估落字）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——P1×3 先红后绿（flow-001 事务内 undoDepth 判别测试/report-001 AA2 判别/report-002 range 隔离判别，各自红态恰红→恢复绿）+P2×1（flow-002 克隆单源）+P3×7+watch 登记注释（spreadsheet-003）；本体删除验证逐项落字（报告批内修复记录表）；**执行期披露回归 1 起**：spreadsheet-001 随案删 getCell 系文件内 setCell 消费（knip unused-export≠可删函数）致 24 用例红→收私复绿，报告建议据此更正。
- [x] Proof：六包 filter 四门禁全绿（flow 198/page 123/report 200/spreadsheet 314/word 274/editor-core 39；build/lint 0 error）；模块求值面裁定：修复全部为包内函数/导入级变更零顶层副作用→双哨兵不触发；六包 `index.ts` 零公共导出变更（`git diff --exit-code`；report rangeMetaId 为 types.ts 包内导出、index.ts 显式具名不泄漏）。

Exit Criteria:

- [x] 红→绿证据在案（3 项判别测试各自红态读数在报告修复记录表）；本体删除验证逐项落字。
- [x] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1（P1×3 全 fixed；successor/watch 各 1 均 P3）；六包 `index.ts` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 六行翻转 `audited`；reconcile 通过（audited 36/uncovered 13）。
- [x] Proof：draft review 通过时 roadmap WA-12 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（11 行于本收口 commit 翻转；复检证据=closure audit agent_068e83b7 十一项修复逐一开档实证+生产代码污染动态判别 3/3 恰红→字节级恢复绿）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-12 报告存在。
- [x] roadmap WA-12 行 `todo → planned` 已落并填 plan 路径（CX-18 同 commit 登记）。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_2fbc3728-c3af-4249-bc3b-33e01c4f03d0，review-only）
- Verdict: `revised`（零 Blocker、1 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** knip 基线条款缺失（六包承载全轨道最大登记死代码面 135 条[exports 105+types 29+dep 1]未入 Baseline；且 plan 568/569/571/573 四批收口均记录 knip 相遇、两批首跑即红）→ Baseline 增「knip 登记债口径」条款（证据输入+以修代重立基线先例+复测落字）；**m1** 双零批序数勘误（连续第三个→wa-10 后连续第五个）；**m2** editor-core「最小包」补「六包中」限定语；**m3** 补 `## Closure` 模板脚手架节；**m4** oversized 拟制时枚举落字（6 件：flow core.ts 697/tree-projection.ts 674/types.ts 511、report core.ts 536、spreadsheet formula-engine.ts 551、word document-io.ts 549）。审查员 14 项清单全部 live 复现（对象清单 103/17,108 逐包 wc 吻合、六包零在途、async 15 行/perf 3/typeBypass 4 逐 file:line 吻合、四门禁 0、literal 0/0、26 既有前缀零撞号、承接转发三项与前批报告原文一致、HEAD 锚点、候选量历批最小成立、模板逐节比对与 571 结构一致[12 项 Closure Gates 与 571 先例逐项同构]）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1×3 先红后绿批内收口；结构性/共性以 CX-18 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向——002 克隆三机制/003 双声明族单源化）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（3 项判别测试红→绿 + 六包 filter 四门禁；双哨兵按裁定不触发——修复全部为包内函数/导入级变更零顶层副作用）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（spreadsheet-002 以 successor-required 显式登记、spreadsheet-003 以 watch-only 显式登记）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-12 回写 + CX-18 登记 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_068e83b7，0B/1M/2m：M1=word-001 完成度声称失实[dataset-model 未转换 3/4]→方案 A 补转；m1=report-002 红态口径统一「2 文件各 1 failed」；m2=测试注释重复短语）→delta 复核 approved（0B/0M/0m），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红；knip 符号删除仅产生无害 stale 基线条目）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- CX-18（roadmap 已登记，todo）：report↔spreadsheet 跨包 editor-domain 孪生并案——执行归其自身 plan。
- spreadsheet-002（no-op 守卫，successor-required）：可随 CX-18 或 spreadsheet 域批并案裁决；须显式推翻 plan 547「逐字节一致」迁移语义并记录。
- 承接转发 watch 三项（word-editor-core titleId 契约/无头预览计数缺口、pager-004 getSchemaType core 归属）：留后续 word/page 域批必读线索。

## Closure

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_068e83b7-b180-475b-a980-3b87685b4cdb，review-only）
- Rounds: R1 `issues`（0 Blocker / 1 Major / 2 Minor）→ 三项修正 → delta 复核 `approved`（0B/0M/0m）
- R1 findings 与修正：**M1** word-001 修复完成度声称失实（dataset-model.ts 转换实际未落地[首轮脚本在无 import 行锚点处崩溃]，live 3/4 位点）→ 方案 A 补转（generateDatasetId 改 createPrefixedId('ds')+\_idCounter 删除；判据 grep \_idCounter 全零达成；word filter 274/274 复跑绿）；**m1** report-002 红态读数口径统一（「恰 1 failed」→「2 文件各 1 failed[index.test bundle 入口双注册]」，与审计员污染实证恰 2 failed 同构；report+ledger 两处）；**m2** 判别测试注释重复短语并句。
- 审计员独立实证：11 项修复逐一开档（含 spreadsheet-001 执行期披露回归三处记录一致核验+getCell 收私注记在位+setCell:86 消费链核对）；watch-only/successor-required 两项原样在位零静默；六包 index.ts 零变更；knip baseline 零改动（git status 零命中）；reconcile 复跑 181=86+11+84/未处置 0/violations 0；两树 21 src 文件+4 docs 逐字节一致（delta 后 22 src）；CX-18 登记与报告裁定节一致。
- 动态判别 3/3（隔离树生产代码污染→恰红→字节级恢复→绿）：①flow-001 live getter 改恒空捕获→恰 1 failed→198/198；②report-001 entryKey 改回内联 charcode 公式→恰 2 failed→200/200；③report-002 读侧退回 [0] 错档→恰 2 failed→200/200。辅助：spreadsheet 全量 314/314 独立复跑（含收私回归族）。
- 隔离五门禁（HEAD 502d6be7e + 本批 diff）终态日志：`_tmp/wa12-gates-final-1..5.log`（typecheck/build/lint 42/42、test 78/78、check 全链 designer-conformance passed 收尾；首跑日志 wa12-gates-1..5.log）。gates-4 旧绝对路径读数系 turbo 内容寻址缓存回放（cache hit, replaying logs）——审计员排除疑点记良性。
