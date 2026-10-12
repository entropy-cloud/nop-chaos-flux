# 574 workaround-audit WA-13b 设计器渲染层审计批二（report-designer-renderers + spreadsheet-renderers + word-editor-renderers）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-13b 工作项，Phase Status 第 15 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/569/570/573`（保护区条款、closure 迭代先例、ai 哨兵条款）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-13a/report.md`（前批沉淀：误报排除清单互通、CX-16 上下文菜单壳交界）；`docs/context/ai-autonomy-policy.md`

## Purpose

对设计器渲染层三包（report-designer-renderers + spreadsheet-renderers + word-editor-renderers，inventory 97 文件 / 15,707 行）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，三模块）：report-designer-renderers 20 文件/3,687 行 + spreadsheet-renderers 47 文件/7,204 行 + word-editor-renderers 30 文件/4,816 行 = **97 文件/15,707 行**（roadmap 行"约 15.7k"一致，以 inventory 为准）。
- **工作树状态（拟制时点实测）**：三包**零在途**（本包范围 git status 零命中；inventory=HEAD wc=live wc 三口径逐文件零差，全集 15,707 行）。主树并行会话在途变更（runtime/core/data/form/layout 14 文件 + plans 571/572 未跟踪稿，WA-11/12 并行批）不属本批。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。**中途漂移预案**：若并行会话执行中触及本批文件，取证以已完成的 HEAD 快照为准并就地注记；修复不叠编辑（沿 564 规则，P0/P1 不得借在途状态降级）。
- **字面标记**：literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案；执行时以复跑枚举器输出为准）：typeBypass report 1 + spreadsheet 1 + word-editor 3 = 5 + setTimeoutCandidates report 1 + spreadsheet 0 + word-editor 4 = 5 + domRaid spreadsheet 1 = 1，合计 **11 处候选**逐个人工定性；typeBypass 拟制时 grep 复核（非测试 src）1/1/3 逐字吻合；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **17 行命中**（report 5：report-field-panel:40/:111、report-designer-toolbar:55/:148/:174；spreadsheet 4：use-selection:92/:124、fire.ts:2、default-page-body:146；word-editor 8：word-editor-page:101、toolbar/zone-controls:51、toolbar/insert-controls:63、toolbar/font-controls:43、panels/outline-panel:86/:146、hooks/use-word-editor-save:85、editor-canvas:56——去重逐个定性）；`check:audit-performance-suspects` 1（report helpers.ts:38）；`check:audit-runtime-raw-schema-reads`/`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：三包 ≥500 行非测试源 3 件全部 WARN 档（评估不拦 exit）——report page-renderer.tsx 683、report-designer-manifest.ts 529、spreadsheet spreadsheet-grid/table-shell.tsx 544。已登记债不重复立案，但 3 件一律纳入结构走读。live 主树 `check:oversized-code-files` exit 1 系并行会话在途 `flux-runtime/runtime-factory.ts:701`（非本批、隔离 HEAD 口径下不存在）。
- **包特性与审计重心**：①report = 报表设计器渲染族（page-renderer 单文件 683 行、toolbar 三 async 命中、field-panel、manifest）——**跨包消费面**：依赖 spreadsheet-core+spreadsheet-renderers（host-1/plan 547 的 report-field-insert 命令通道）；②spreadsheet = 表格渲染族（spreadsheet-grid/table-shell、spreadsheet-interactions/use-selection 双命中、fire.ts:2 顶层命中、default-page-body）；③word-editor = 文档编辑器族（toolbar 三件 controls、outline-panel 双命中、use-word-editor-save、editor-canvas）——save hook 的 async 面与 558 视觉修正波交界。
- **交界防重复**：①交互审计线（IS-4/plan 547 九页、plan 528、ux-r9/738984e7a、plan 558、plan 552/553）已覆盖交互/视觉透镜（ledger IS-\* 行），本批透镜=九信号，不重复立案但可作考古线索；②designer-family 检查（plan 558）与 designer-renderer-standardization（232f54f4d WorkbenchShell、b8ef4a555）为结构收敛史，考古直接引用；③cq-5/cq-6 收敛点零复发核验；④WA-12（designer cores 并行在途）发现不越界——core 侧问题登记转发；⑤CX-16（上下文菜单壳，WA-13a 登记）如遇三包菜单面显式引用不重复立案。
- **保护区与授权条款**：①三包 `src/index.ts` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（owner doc `docs/architecture/styling-system.md`；designer 件 self-styled 合法）。
- **已收敛模式三档**：live 可证档——cq-5/cq-6 收敛点零复发核验；WorkbenchShell 家族外壳收敛（232f54f4d）零复发；历史教训档——`dataPath` 双词汇（不涉则记不适用）、strip errors/ajax（不涉则记不适用）；WA-1..13a 已立案发现（CX-1..16 覆盖面）不重复立案。
- **五门禁基线**：WA-13a 收口（30d54f4cc）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-13b/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（三口径逐字落字）。
- findings 全量登记 ledger（`WA-reportr-001`/`WA-sheetr-001`/`WA-wordr-001` 起各自顺延，三位零填充），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；三包 `index.ts` 零公共导出变更。
- 台账 modules 三行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；三包 `index.ts` 公共导出面的任何增删。
- designer-core 包（report-designer-core/spreadsheet-core/word-editor-core）的任何修改——属 WA-12 范围（并行在途），登记转发不越权修。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..13a 已立案发现重复立案。
- playground 消费侧。

## Scope

### In Scope

- `packages/report-designer-renderers/src/`、`packages/spreadsheet-renderers/src/`、`packages/word-editor-renderers/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-13b/report.md` + ledger 登记/翻转 + roadmap WA-13b 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件与 plans 571/572 在途稿——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..573 先例）；行为保持型批内修特征化测试先钉后改；修复后跑三包 `pnpm --filter @nop-chaos/report-designer-renderers|@nop-chaos/spreadsheet-renderers|@nop-chaos/word-editor-renderers typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）+ **ai 哨兵套件**（`@nop-chaos/flux-renderers-ai` filter test，content-009 教训条款）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/report-designer-renderers/src/`、`packages/spreadsheet-renderers/src/`、`packages/word-editor-renderers/src/`（读）、`docs/audits/workaround-code-smell/wa-13b/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——11 处候选全部复现逐个定性（typeBypass 5 豁免/setTimeout 5 豁免/domRaid 1 豁免）+ 门禁交叉（async 17 行：13 豁免+3 行并入 2 条立案[sheetr-001/002]+fire.ts 转 watch 立案[sheetr-009]；perf 1=死代码本体[reportr-002]；其余 4 门禁 0 实跑）+ 重复块双探针（逐字版 6,657 窗→39 组、归一版 5,533 窗→430 组，坐实 7 组）+ 范围结构走读（**97/97 全文覆盖**；≥500 行 3 件全读[682/528/543，plan 拟制 +1 口径偏差已注记]；三口径零差落字）+ 走读另捕获基线外 D 类 2 处[reportr-006]+dispatchEvent 1 处[sheetr-006] + 误报排除 24 项（含 CX-16 交界核对记不适用）。
- [x] Proof：每个立案候选 git 考古（20 commit；症状性 message 抽检 30/30=0）。
- [x] Decision：严重度 + ROI + 共性裁定——**27 条立案（P1×1[reportr-003 drag ghost 三包三份]+P2×3+P3×23）**；去向=fixed 20+successor-required 2（reportr-003→CX-17 新拟制、reportr-008→转发 WA-12 评估）+watch-only 5（sheetr-006/007/008、wordr-008/010，后两项公共类型面留人工并案）；**转发 WA-12 两项只读参考**（word-editor-core titleId 契约、无头预览/计数能力缺口——wordr-005/006/007 根因在 core 侧）。
- [x] Proof：`wa-13b/report.md` 落盘，findings 全量登记 ledger（27 行）；reconcile=160 findings（found 102+verified 58）/未处置 20（待 Phase 2 翻转）/violations 0（执行期补登 wordr-009 漏行+27 行位置列补齐）。

Exit Criteria:

- [x] `wa-13b/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备。
- [x] ledger 与报告一一对应零遗漏（三 ID 命名空间零撞号，27/27）。
- [x] 每个立案有 git 考古读数；误报排除 24 项有对照理由。
- [x] 共性裁定落字（CX-17 插入 roadmap[人工确认门]；转发 WA-12 两项只读参考已落报告）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——本批唯一 P1（reportr-003）归 CX-17 显式去向不批内修；20 项批内修全部落地：report 6（cellAddress 改 import core/死导出删除[perf 命中本体消亡]/item-list 收敛 report-field-list-item.tsx/designer-bag 提取/切片冒充改类型化 Pick 收窄/fieldCount 常量单源）+spreadsheet 6（sheetr-001 onFailure 观测接线 7 点[红→绿]+sheetr-002 grid-dimensions 单源 4 位魔法常量[红→绿 rows=150 endRow 99→149]+error-format 单源五变体[语义反转变体独立命名 formatCommandFailure 注记不合并]+StyleToolType 单源/aria t() 复用既有键/fire JSDoc 契约注记）+word 8（probe §2.6 豁免注记/dataset-visuals 单源[描边漂移取 border 侧拍板+注记]/死组件 199 行删除+空转测试清理/invoke-canvas-command 单源统一 catch 面+zone canvas-first 顺序修正[红→绿 回滚断言]/假预览诚实标注新键/假计数删除/outline 稳定 id[红→绿 Math.random 回退实证]/FileReader 串 t() 化补键）；三包 `index.ts` 零公共导出变更（git diff --exit-code；sheetr-001 onFailure 为消费侧 config additive 类型非导出面）。
- [x] Proof：三包 filter 四门禁 + ai 哨兵——typecheck/build/lint/test 全绿（report 213/213[基线保持]/spreadsheet 180/180/word 161/161/ai 哨兵 850/850；lint 0 error×3 包）；类别清扫落报告（死导出/死组件/裸英文/魔法常量/假计数 grep=0 判据逐项达成）。

Exit Criteria:

- [x] 红→绿证据在案（sheetr-001/002、wordr-004/007 四项先红后绿；行为保持提取先钉后改同套同绿）；本体删除验证逐项落字（死函数/死组件/裸英文/假计数/魔法常量 grep=0）。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1（reconcile 未处置=0/fixed 20/violations 0）；三入口 `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 三行翻转 `audited`；reconcile 通过。
- [x] Proof：draft review 通过时 roadmap WA-13b 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（20 行于本收口 commit 翻转；复检证据=closure audit agent_5a44cd40 二十项修复逐一开档实证+三处动态判别红→绿复现）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-13b 报告存在。
- [x] roadmap WA-13b 行 `todo → planned` 已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_f5f1be42-851c-48d0-b8bd-d80d6e532108，review-only）
- Verdict: `revised`（零 Blocker、1 Major、0 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** 模式候选计数失实（setTimeoutCandidates spreadsheet 实为 0 非 1——modules.json 原值+live 全包零命中+生成器 regex 三重印证；候选总数应为 11 非 12，并传导至 Phase 1 执行项）→ 两处改 11/1/0/4 拆分+「执行时以复跑枚举器输出为准」对冲措辞。审查员对其余清单项全部 live 复现通过（97 文件/15,707 精确复算、三包零在途且 97/97 逐文件零差[全量核]、async 17 行 file:line 逐一吻合、perf 1、四门禁 0、typeBypass 1/1/3、oversized 3 件 WARN+runtime-factory 归因、三包 index.ts、六考古锚+测试计数佐证、模板合规含 573 两条教训已吸收、三前缀与既有 22 前缀零撞号+regex 兼容、WA-12/CX-16 交界四处显式且 spreadsheet-grid-context-menu.tsx 使 CX-16 条款有实际指向）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）——本批唯一 P1（reportr-003）归 CX-17 显式去向不批内修
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁 + ai 哨兵）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-13b 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_5a44cd40，0B/1M/2m：M1=台账「27 行位置列补齐」声称与实况不符[25 行位置列空]；m1=report §5 计数 19/6 漂移；m2=wordr-003 判据缺 dist 豁免注记）→三项修正后 delta 复核 approved（0B/0M/0m），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_5a44cd40-b742-4e6e-8f60-55b04abbe851，review-only）
- Rounds: R1 `issues`（0 Blocker / 1 Major / 2 Minor）→ 三项修正 → delta 复核 `approved`（0B/0M/0m）
- R1 findings 与修正：**M1** 台账「27 行位置列补齐」声称与实况漂移（25 行位置列空）→ 从 report 各 finding 位置字段回填 25 格（按列拆分写入；执行期一次正则脚本事故吞分隔管道致 reconcile 短暂读数 135，已从隔离 worktree 恢复后安全重写，审计员 delta 复核确认两树 27 行 findings 状态/去向列逐字节一致零事故残留）；**m1** report §5 计数 19/6 → 20/5；**m2** wordr-003 验证方式补 dist/ 残影豁免注记（reportr-002 同款）。
- 审计员独立实证：20 项修复逐一开档在位（reportr-001 import 改造/reportr-002 死导出删除/reportr-004 新件双消费点/reportr-005 buildDesignerBag/reportr-006 类型化切片/reportr-007 常量单源/sheetr-001 两装配点接线+消费点/sheetr-002 grid-dimensions 单源/sheetr-003 五变体收敛含语义反转变体独立命名/sheetr-004 单源/sheetr-005 t()/sheetr-009 JSDoc/wordr-001 豁免注记/wordr-002 单源/wordr-003 两组件+两测试删除/wordr-004 统一 catch+zone canvas-first/wordr-005 双对话框+双 locale/wordr-006 resultCount=0/wordr-007 稳定 id/wordr-009 双 locale 键对齐）；watch-only 5 项逐一开档零静默；动态判别 3/3（sheetr-002 钳制回退恰 1 failed→恢复绿；wordr-007 Math.random 回退恰 1 failed→恢复绿；wordr-004 catch 静默吞恰 2 failed→恢复绿）；reconcile 复跑 160=82+20+58/未处置 0/violations 0；隔离 worktree 54 文件两树 cmp 逐字节一致（唯一预期差=ledger 收口翻转时点）；五门禁日志全链 exit 0（oversized 3 errors 全 [exempt]）；三包 index.ts 零导出变更。
- 测试计数复核：report 213/213、spreadsheet 180/180、word 161/161、ai 哨兵 850/850（与 dev log 逐字吻合）。
- 隔离五门禁（HEAD 30d54f4cc + 本批 diff）日志：`_tmp/wa13b-gates-1..5.log`（typecheck 42/42、build 42/42、lint 42/42、test 78/78 successful、check 全链过 check-designer-conformance passed 收尾）。
