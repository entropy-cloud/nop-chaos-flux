# 564 workaround-audit WA-4 基础与表单渲染器审计批（flux-renderers-basic + flux-renderers-form）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-4 工作项，Phase Status 第 5 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/562-workaround-audit-wa2-runtime-plan.md`（在途文件快照规则）、`docs/plans/563-workaround-audit-wa3-react-ui-plan.md`（保护区条款与双 agent 并行取证先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（本批对象清单与 baseline 计数来源）；`docs/audits/workaround-code-smell/wa-3/report.md`（前批沉淀：误报排除清单互通、已收敛模式复核结论）；`docs/audits/workaround-code-smell/wa-2/report.md`（form-runtime\*.ts 运行时侧取证结论——本批为渲染器侧，跨引用不重复立案）；`docs/context/ai-autonomy-policy.md`（Protected Areas 表）

## Purpose

对基础与表单渲染器两包（flux-renderers-basic、flux-renderers-form，inventory 合计 125 文件 / 21,991 行非测试源码）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环（roadmap 自动修复契约）：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出）：flux-renderers-basic 6,527 行/34 文件、flux-renderers-form 15,464 行/91 文件（合计 125 文件/21,991 行；roadmap 行"约 21.5k"为拟制时估算，以 inventory 为准）。
- **字面标记**：两包 literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：basic typeBypass 3 + setTimeoutCandidates 1 + domRaid 1；form typeBypass 9 + setTimeoutCandidates 9 + **domRaid 16**（本批最大候选群，表单渲染器的焦点管理/滚动定位/校验滚动是 DOM 触碰高发区，逐个人工定性）；silentCatch/keyRemount/pixelNudge/testEnvBranch 两包全零。合计 39 处候选逐个人工定性，禁止按 grep 定案。
- **包特性与审计重心**：basic = 稳定结构/展示渲染器族（page/container/flex 等布局与 button/text/tabs/dialog/drawer 等展示交互件；table 等数据展示件在 flux-renderers-data，非本批）；form = 稳定表单字段族（input/select/checkbox 等字段 + form 容器 + 校验接线）。重点：①form 的 domRaid 16 处逐个定性（合法焦点管理 vs 突袭）；②字段渲染器间的复制（受控值接线/校验接线模板在同族字段间的复制沉积）；③与 flux-runtime form-runtime 族（WA-2 已审）的接缝——渲染器侧不得重复立案运行时侧已登记发现（CX-3 覆盖面引用）。
- **保护区与授权条款**：①两包 `src/index.tsx` 公共导出 = **批内零变更**（policy"公共导出面"条款；确需增删 → CX-n/显式注记待人工确认）。②Renderer definition fields = plan-first——本 plan 即载体；批内修复不得改 Renderer 定义字段契约（对齐 `docs/references/renderer-interfaces.md`）。③样式契约 = plan-first——owner doc `docs/architecture/styling-system.md` 在案；Layout marker-classes-only / Widget self-styled 契约零违反。④字段元数据/slot 建模变化 → 对齐 `docs/architecture/field-metadata-slot-modeling.md` 后方可。
- **已收敛模式三档（roadmap 基线节）**：live 可证档——AbortController（验证两包无 boolean cancelled/disposed 手写复发）、createLazyLibLoader（basic/form 预期无重库直连，验证即算）；历史教训档——strip errors 合一 / ajax 两份合一（引用 wa-1/wa-2 结论，本包范围复核零命中即闭环）、`name` vs `dataPath` 双词汇（wa-1 已证三包零命中，本两包复核）；明确不按已收敛处理——form-runtime\*.ts 文件族属 flux-runtime（WA-2 已收口+CX-3 承载），本批只审渲染器侧，跨引用不重复立案。
- **工作树状态（拟制时点实测）**：**flux-renderers-form 存在并行会话在途变更 3 文件**（`renderers/form-definition.ts`、`renderers/form.tsx`、`schemas.ts`——form target 特性，`git status` 拟制时点实测；计数随并行会话自然漂移，以执行时实测为准）；flux-renderers-basic 零在途变更。**取证以 HEAD 提交态 `f84e35612` 为基准快照**（form 三在途文件按 HEAD 读，在途 diff 不取证、报告就地注记）。**修复侧规则**：批内修复若触及在途未提交文件，不叠编辑——首选在隔离 worktree 以 HEAD 快照实施修复与验证、主树留待并行会话收口后由其 owner 对账（P0/P1 单点缺陷必须批内修，不得借在途状态降级）；仅当隔离 worktree 验证不可行时才改显式去向（watch-only/successor-required）并落明理由，报告注记；basic 侧修复直接主树实施。若并行会话中途提交了对本批对象的变更，报告以取证时点快照为准并就地注记。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。
- **五门禁基线**：WA-3 收口（f84e35612）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-4/report.md`：两包逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节。
- findings 全量登记 ledger（`WA-basic-<seq>` / `WA-form-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；两包 `index.tsx` 零公共导出变更约束下实施。
- 台账 modules 两行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施（公共 API/包边界/编译期语义——CX-n + 人工确认载体）；两包 `index.tsx` 公共导出面的任何增删。
- flux-runtime form-runtime 族运行时侧的取证与修复（WA-2 已收口，CX-3 承载收敛）；form 在途文件所载新特性（form target）的设计评审。
- 与其他轨道重复立案（组件契约/交互状态/视觉/DOM 轨道划界同 WA-1..3）；已登记 pre-existing 门禁红的重复立案。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/`、`packages/flux-renderers-form/src/` 全部非测试源码的取证（prompt §5 全量协议；form 按 HEAD 快照口径）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试（受在途文件不叠编辑规则与保护区条款约束）。
- `docs/audits/workaround-code-smell/wa-4/report.md` + ledger 登记/翻转 + roadmap WA-4 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——发现其问题只登记转发，不越权修）。
- 结构性重构实施；playground 消费侧；字段视觉/交互契约问题（转发对应轨道）。

## Failure Paths

不适用（审计批无新增运行时错误处理面；修复项的失败行为随各发现的重构方向在报告内写明）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。每个 P0/P1 修复先写钉住现有正确行为的回归测试（红）→ 重构 → 绿（Proof 与 Fix 在同一修复项内合并表达，沿 561..563 豁免先例）；行为保持型批内修以特征化测试先钉后改；修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-basic/src/`、`packages/flux-renderers-form/src/`（读，HEAD 快照口径）、`docs/audits/workaround-code-smell/wa-4/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——39 处候选逐个定性 + 门禁交叉（basic：raw-schema-reads [high]×2 live 升级立案 WA-basic-001 + 12 catch 全排除；form：6 命中 5 排除 1 升级 WA-form-008）+ 重复块识别（basic jscpd+归一化双探针坐实 3 组；form 288 窗组坐实 10 组）+ 范围结构走读（basic 34/34 全读+marker 契约核查零违反；form 66 文件逐行精读+25 文件信号扫描）+ 已收敛模式三档处置（AbortController/lazy-loader/dataPath 全部未复发）+ 误报排除（54 项；与 wa-2 form-runtime 族跨引用防重复立案落字）。
- [x] Proof：每个立案候选 git 考古（18 条立案全部溯源）；症状性 message 1 处（45443c5f7 13-03 修复批只叙述 addTab——WA-basic-002）+"收敛计划完成后复制仍扩散"实证 2 处（form-001/004）。
- [x] Decision：严重度 + ROI + 共性裁定（含保护区与在途文件触碰裁定：凡修复需动两包 `index.tsx` 公共导出、Renderer 定义字段，或触及 form 在途文件者，按 Current Baseline 规则处置，不得批内硬修）。
- [x] Proof：`wa-4/report.md` 落盘（441 行，closure 修正后），findings 全量登记 ledger（18 行，WA-form-010 排除记录=found+n-a）。

Exit Criteria:

- [x] `wa-4/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖含 form 在途文件快照注记与 domRaid 16 处逐个定性结论——12 处并入 WA-form-003、其余 E/F 排除）。
- [x] ledger 与报告一一对应零遗漏；每行类别/严重度/位置/W 违约/去向齐备。
- [x] 每个立案有 git 考古读数；误报排除有对照理由。
- [x] 共性裁定落字（CX-10/11/12 插入 + CX-8 扩围）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——本批无 P0/P1；2 条 P2 单点行为缺陷批内修（WA-basic-002 tabs 同 tick 三操作函数式化、WA-form-002 cron weekday 词表+映射，均红→绿）；其余 16 条显式去向（fixed 2 + successor-required 8 + watch-only 7 + n-a 1——closure m6 勘误：首版 7/8 转置）；两包 `index.tsx` 零公共导出变更；form 在途 3 文件零编辑（WA-form-007/009 按规则改 watch-only）。
- [x] Proof：受影响包 filter 四门禁——basic 652/652、form 1096/1096、flux-i18n 30/30 全绿；类别清扫（commitCollection 快照提交 grep=0；seg 嗅探无兄弟）落报告《批内修复记录》。

Exit Criteria:

- [x] 红→绿证据在案，无"只修不加测试"；本体删除验证逐项落字。——两条 P2 均先红（3/3 与 1/1 失败，form 红断言与取证读数逐字同）后绿。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1；`git diff --exit-code packages/flux-renderers-basic/src/index.tsx && git diff --exit-code packages/flux-renderers-form/src/index.tsx` 通过。——reconcile 未处置=0/violations=0。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [ ] Proof：台账 modules 两行翻转 `audited`；reconcile 通过。
- [ ] Proof：draft review 通过时 roadmap WA-4 回写 `todo → planned`；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（WA-basic-002/WA-form-002 于本收口 commit 翻转 verified，复检证据=closure audit agent_a94d2038 等价性推演+判别力实证+隔离复现）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [ ] reconcile exit 0 且 wa-4 报告存在。
- [ ] roadmap WA-4 行 `todo → planned` 已落并填 `plan:` 路径。
- [ ] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_acaa9a2f-5ba0-4ad7-a46a-c126bb0f2c7d，review-only）
- Verdict: `revised`（零 Blocker、2 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** 两包公共导出入口实为 `src/index.tsx` 非 `index.ts`（Phase 2 机器判定门按字面 exit 128 不可执行，系从 563 ui 包复制未适配扩展名）→ 五处统一改 `index.tsx`；**M2** "basic…table 等展示件"事实失实（table 族在 flux-renderers-data）→ 改为 button/text/tabs/dialog/drawer 等展示交互件表述；**m1** 补两包字面标记=0 基线行；**m2** 在途计数补漂移免责句；**m3** Phase 3 exit 补 plan 路径；**m4** 在途文件修复规则调序（隔离 worktree 修复首选，P0/P1 不得借在途状态降级）。审查员对 inventory 计数、3 在途文件、HEAD=f84e35612、保护区引述、check:audit 16 项等全部声称 live 复现通过。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本批无 P0/P1；2 条 P2 单点行为缺陷红→绿批内修；结构性/共性以 CX-10/11/12+CX-8 扩围显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）——WA-basic-001 raw-schema 门禁红线=CX-12（人工确认门）；WA-form-001/003 跨包契约缺口=CX-11（人工确认/ask-first）；weekday 词表缺口批内修+词表补齐
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修红→绿：002 三用例 3 failed→3/3、002 词表 labels 逐字红→绿 + 三包 filter 四门禁 652/652、1096/1096、30/30）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（reconcile 未处置=0，violations=0；在途文件的 2 条 P3 按 Current Baseline 规则改 watch-only 并落明理由，非 P0/P1 降级）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-4 回写 + CX 插入 + dev log；字段元数据/样式契约文档未被批内修触及——修复为行为级与词表，无需更新）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_a94d2038-3053-4d6f-9fb9-6a1007462380，0B/1M/6m：M1 覆盖声明行数会计失真）→ 修正后 delta 复核 R2 approved（0B/0M/0m，M1 勘误数字独立实测逐位吻合）；审计员自建隔离 worktree 独立复现五门禁（build→typecheck/lint/check 序次）+ 三包 filter test 全绿
- [x] `pnpm typecheck`（隔离 worktree `../wa4-verify` HEAD `f84e35612`+本批 11 文件 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: 2026-10-11 收口。两模块（basic 34 文件/6,527 行 + form 91 文件/15,383 行 HEAD 口径，closure audit M1 勘误后数字）prompt §5 全量取证完成，18 findings 全量登记台账且去向四态零静默（fixed→verified 2 / successor-required 8→CX-10/11/12 / watch-only 7 / n-a 1）；2 条 P2 单点行为缺陷批内修先红后绿 + 本体删除验证；`index.tsx` 零公共导出变更（git diff --exit-code 实证）；form 在途 3 文件 HEAD 快照口径取证、零叠编辑。隔离五门禁 exit 0 一次通过。roadmap WA-4 → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_a94d2038-3053-4d6f-9fb9-6a1007462380，review-only）
- Evidence: closure audit R1 `issues`（0 Blocker / 1 Major / 6 Minor——M1 覆盖声明行数会计失真：首版"16,323/-6 全落 form.tsx"不成立）→ 修正后 **delta 复核 R2 `approved`**（0B/0M/0m）：M1 按 wc -l 同口径重实测（91 文件 15,383/-81 逐文件分解）就地勘误并附审计署名；m1-m6（plan 漏勾/行数/9 条 P3 现状字段/StrictMode HEAD 行号/tabs 残差注记/去向计数转置）全部落地经复核逐项确认。审计员独立复现：三包 filter test（652/652、1096/1096、30/30）+ typecheck、check-i18n-keys exit 0、reconcile 逐字吻合、8 处 live 抽查全中、6 个出生 commit 考古核实、自建隔离 worktree 复现五门禁（build 先行的环境次序修正后 typecheck/lint/check exit 0）。

Follow-up:

- CX-10（WA-basic-003/004/005）、CX-11（WA-form-001/003/004/006）、CX-12（WA-basic-001）已插入 roadmap，各自由独立 plan 收口；CX-11/12 执行前人工确认/ask-first；CX-10 含 tabs 同 tick 残差观察面（closure m5）；WA-16 收口前处理。
- form 在途 3 文件（form target 特性）收口后：WA-form-007/009 顺带清理、CX-8 扩围实例随 CX-8 执行。
- no remaining plan-owned work。
