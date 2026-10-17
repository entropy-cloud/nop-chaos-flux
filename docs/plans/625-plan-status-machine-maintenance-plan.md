# 625 plan 状态机维护（deep-audit 2026-10-16 findings F2-F4 + F6）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §6（流程与回归）
> Related: docs/plans/00-plan-authoring-and-execution-guide.md（Required Status Markers / Rule 21）、docs/index.md:248（WIP 导航契约）

## Purpose

plan 状态头与完成事实对齐：已完成但头仍 `active`/`draft` 的 plan 逐个核实后翻转；479 的"工作已落地、plan 文档停滞"补收口；616 的 closure 证据空节事实性修复（xlang 项条件性——并发会话静默为前提）。恢复 "unfinished plans = current WIP" 导航契约的信噪比。

## Current Baseline

- 2026-10-17 实测头部状态（对比审计时点）：559 已翻转为 completed（审计勘正）；579 cx1/580 cx2 为**真活跃**（Phase 2 in progress）——本 plan 不动；xlang 轨道 616/617/618/620/621 头部均 `active`（620 有 e219762d2 关闭提交、621 由并发会话收口中）。
- 待核实翻转清单（复核后为 **10 份全勾 + 1 份中间态**）：576、577、578、581-587 共 10 份全部勾满且 Closure Audit Evidence 在档（含独立 agent id，抽样 581/587 全过）；**555 为中间态**——12 勾/6 未勾（未勾的全是 Closure Gates 块），但 Status Note 已填"已收口（2026-10-09）"且 Closure Audit Evidence 记录 R2 delta **APPROVED**（agent_5d399e92）——需第三种处置（见 Phase 1）。
- F4【R1 Blocker 勘正——原审计前提被推翻】：`docs/plans/479-visual-quality-v8a-print-designer-plan.md` 头部 `draft`、0 勾/29 未勾、Closure 节空；**commit 52b4e610f 的 diff 实际不含 479 的核心工作**（30 文件中零 flux-print-\* 文件；仅 diagnostic-i18n 子集——zh-CN/en-US locales 嵌套 print.diagnostic 键 + check-i18n-keys.mjs——与其余无关批次混入）；print-designer 的 canvas/snap-guide/multi-select/dark tokens 工作实测**未落在 master**（零 grep 命中；`print-designer-canvas.tsx` 的 altKey 仅 rotate 消费 = 479 前状态；print-designer.spec.ts 9 测非 12），实际存在于 **stash@{0}**（WIP on master: 0e75ae915，非祖先提交）从未 pop；同消息重复提交 33135a45a 亦非祖先。52b4e610f 的 message 声称（closure audit approved / bookkeeping backfilled）与其自身 diff 矛盾，**不得引用为收口证据**。
- F3：`docs/plans/616-xlang-lang-package-plan.md:155-159` Closure/Auditor/Evidence 为占位符，而 5c14b9a85 提交声称 "per closure audit (approved)"——声称与记录漂移（Rule 21 事实性修复范畴）。
- F6：`docs/components/roadmap.md:3` Last Updated 2026-08-05 未随 10-07 编辑刷新（F6 其余项——articles 计数漂移、d2d81b3f7 前缀——不在本 plan，见 Out Of Scope）。
- 附带发现（R1 审查）：`docs/plans/` 存在 **559 撞号**——`559-scada-3d-bridge...`（completed）与 `2026-10-04-559-editor-designer-p45...`（active）两个 559；Phase 1 结论表用全文件名规避。
- 并发会话领地：616-621 及其内容（含 F3 修复时机）以该会话静默为前提。

## Goals

- Phase 1 名单内 plan 状态头与完成事实对齐：10 份全勾+证据在档者头翻 `completed` 并补 Status Note；555 走第三种处置（补勾 audit 门引用在档 R2 APPROVED 证据 + 纯文档门禁按 guide 条款注记处置，须独立子代理复核）；证据不成立者登记真实剩余项（不得硬翻）。
- 479：按勘正后事实收口——仅 diff 可溯源项（diagnostic-i18n 子集）补勾（附 commit 指向）；未落地项经 Deferred（Successor Required: yes，恢复候选 = stash@{0}，属代码工作归 successor）或取消（scope change 记录）处置；**不翻转 completed**（工作未落地）。
- 616-620/621 + F3：条件性处理（并发会话静默后）——头翻转 + 616 证据节事实性修复；会话仍活跃则本 plan 显式移交并记录。
- roadmap.md Last Updated 头刷新。

## Non-Goals

- 不改写任何 plan 的实质内容/历史文本（Rule 21：本 plan 名单内 active/draft 文件的许可编辑面 = 状态头、Status Note、事实性占位错、Closure Gates 补勾/注记、Deferred 裁决条目、失实声称就地勘误；completed 历史计划一律不回写）。
- 不重开 579/580 的执行（真活跃，归原队列）。
- 不评判已完成 plan 的历史质量。

## Scope

### In Scope

- `docs/plans/{555,576,577,578,581,582,583,584,585,586,587}-*.md`（头部/Status Note）
- `docs/plans/479-visual-quality-v8a-print-designer-plan.md`（补账）
- `docs/plans/616-*.md`/`617`/`618`/`620`/`621`（**条件性**——并发会话静默时）
- `docs/components/roadmap.md`（头刷新）
- `docs/logs/`（收口记录）

### Out Of Scope

- 各 plan 指向的代码/测试内容；579/580；`docs/backlog/`、`docs/audits/` 状态

## Failure Paths

| 场景             | 触发                                   | 行为                                                           | 可重试 | 用户可见表现  |
| ---------------- | -------------------------------------- | -------------------------------------------------------------- | ------ | ------------- |
| verify-fail      | 某 plan 核实发现未勾项/缺 closure 证据 | 不翻转；在 plan 内登记真实剩余项并保持原状态；daily log 披露   | 是     | plan/审计台账 |
| session-conflict | 并发会话仍在写 xlang plan 文件         | Phase 3 整体移交：在本 plan 记录"移交并发会话"，不产生半写状态 | 是     | daily log     |

## Test Strategy

不适用：纯文档状态维护，无行为变更。验证 = 逐份核对证据（checkbox/gates/closure record）+ 翻转后 `grep "Plan Status: active" docs/plans/` 清单与 Phase 4 归属表一致。

## Execution Plan

### Phase 1 - 10+1 份 plan 核实与翻转（F2 主项）

Status: completed
Targets: `docs/plans/{555,576,577,578,581,582,583,584,585,586,587}-*.md`

- Item Types: `Proof`、`Fix`

- [x] 逐份核对（结论表用**全文件名**，规避 559 撞号）：程序化 sweep 实测——10 份全勾（576 x=31/582 x=32/578+581-587 各 x=17，empty=0）+ 555 中间态（x=12/empty=6，全部位于 Closure Gates 块）与 R2 审查结论一致
- [x] 10 份全勾+证据在档（576/577/578/581-587）→ 头翻 `completed`（各自已有 Status Note 与 closure audit agent id：576=agent_bc35079a、581=agent_43ed0626、587=agent_00a7bee4 等在档）；**576/577 的重复尾部 `## Closure` 占位节已清理**（各移除 1 处）
- [x] 555（中间态）：Closure audit 门补勾引用在档 R2 APPROVED 证据（agent_5d399e92）；5 个 pnpm 门禁按 guide 纯文档条款注记处置；头翻 `completed`——**待独立子代理复核（见 Closure Audit Evidence）**
- [x] 证据不成立项：无（11/11 全部处置成功）

Exit Criteria:

- [x] 11 份核对结论表记录于本 Phase 执行项（全文件名 grep 残留 = 零）
- [x] `grep -l "Plan Status: active"` 输出不再含已处置 plan（实测残留 = 579/580/621/624/625/626/2026-10-04-559，均非 F2 名单）
- [x] 555 的补勾经独立子代理复核记录在档（见 Closure Audit Evidence）

### Phase 2 - plan 479 按事实收口（F4 勘正后）

Status: completed
Targets: `docs/plans/479-visual-quality-v8a-print-designer-plan.md`

- Item Types: `Fix`、`Proof`

- [x] 处置记录节（"625 Phase 2 处置记录"）落盘 479 plan 内：落地子集 = diagnostic-i18n 键面（52b4e610f diff 溯源，17×2 locale 实测）；未落地项零 grep 证据（nop-print-snap-line/data-print-diagnostic/--print-\*/altKey 状态/spec 9 测非 12）全数保留未勾
- [x] 未落地项整批入 Deferred：Classification `out-of-scope improvement`，Successor `yes` → stash@{0} 恢复评估；52b4e610f message 失实声称就地勘误注记
- [x] Status Note 填实 + Plan Status → `deferred`（工作未落地故非 completed；无人在途故非 active）
- [x] 待独立子代理复核（同 555 规则，见 Closure Audit Evidence）

Exit Criteria:

- [x] 479 状态 = `deferred`，处置记录节承载逐项溯源（落地子集有 commit 指向 / 未落地项有 Deferred successor 路径）
- [x] 52b4e610f 失实声称的就地勘误注记在档（处置记录节第 4 条）
- [x] 独立子代理复核记录在档（见 Closure Audit Evidence）

### Phase 3 - xlang 轨道头部 + 616 证据修复（F2 部分、F3）【条件性】

Status: completed
Targets: `docs/plans/616-*.md`、`617`、`618`、`620`、`621`

- Item Types: `Fix`

- [x] 前置检查通过（工作树无 xlang plan 在途写；最后 xlang 提交 46799d3be 为昨晚——静默认定成立，必要非充分已注记）
- [x] 616/617/618/620：关闭提交核实（5c14b9a85/07aeeafd7/785efe7b2/e219762d2 均在档）→ 四份头翻 `completed`
- [x] 616 Closure 证据节**重建填实**（非勘误路径）：daily log 2026-10-16 §616 完整在档 closure audit 记录（agent_45729f0c approved + 6 维度 + 2 变异探针 + 3 minor + CE 111/111）+ 5c14b9a85 提交记录——填入 Auditor/Evidence 并注明重建来源（执行中事故与恢复：一次不安全读改写脚本截断该文件，git checkout 恢复后以安全读改写重做，终态 15914 字节一致）
- [x] 621：保持 `active`（并发会话自身流程，未收口不代收）——显式移交记录于本条

Exit Criteria:

- [x] xlang 5 份：4 份翻 completed（关闭事实一致），621 显式移交记录在案
- [x] 616 证据节填实（重建来源注明），无空占位

### Phase 4 - roadmap 头刷新 + 收口核对（F6）

Status: completed
Targets: `docs/components/roadmap.md`、`docs/logs/`

- Item Types: `Fix`

- [x] roadmap.md Last Updated → 2026-10-17（注记原头 2026-08-05 未随 10-07 编辑更新）
- [x] 全量核对归属表（实测 2026-10-17）：
  - 真活跃 WIP：579 cx1 / 580 cx2（Phase 2 in progress）、621（并发会话收口中）、625/626（本审计会话在途；624 已于同日稍后 completed——【closure Minor 3 同日陈旧注记】）
  - stale 候选登记：`2026-10-04-559-editor-designer-p45-flow-misc-cleanup-plan.md`（active，Last Reviewed 2026-10-04——p45 遗留，归 editor-designer 轨道裁决，非 F2 名单）、`00-plan-authoring-and-execution-guide.md`（draft 标记 = 常设指南自身状态行，非 plan）
  - 误报排除：2026-08-08-2034-2（头部实为 completed，grep 命中为正文引用）、525（头部实为 completed）、2026-08-04-0043-2（已不在 active 集合）

Exit Criteria:

- [x] roadmap 头与编辑事实一致
- [x] active/draft 全清单归属表在档（上方）；F2 名单零残留；已完成仍 active 的新残留 = 零

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_021321cf（fresh session，R1 + R2 两轮）
- Verdict: R1 fail（1 Blocker / 2 Major / 4 Minor，全量修订）→ R2 **pass-with-minors**（0B/0M/3 residual 单行 minors，允许随执行提交落盘）
- Rounds: 2
- Findings addressed: B1 F4 前提推翻重写（52b4e610f 不含 479 工作仅 i18n 子集；stash@{0} 为恢复候选；479 落 deferred 非 completed；message 失实声称禁作证据）；M2 555 中间态第三处置（补勾 audit 门引在档 R2 APPROVED + 纯文档门禁注记 + 独立复核）；M3 Phase 4 改归属表（全清单逐项登记 + 559 撞号全文件名规避）；m4 576/577 重复 Closure 占位节清理入 Phase 1；m5 Phase 2 措辞去自相矛盾；m6 F6 部分吸收显式声明；m7 必要非充分 + typo 随 R2 落盘

## Closure Gates

- [ ] 所有 in-scope 项落地（Phase Exit Criteria 全勾；Phase 3 移交情形须有显式记录）
- [ ] 翻转的每份 plan 五处一致性核对在档
- [x] 纯文档计划：`pnpm typecheck`/`build`/`lint`/`test` 豁免（guide 纯文档条款）；docs 子门禁（check:docs-garbled / check:active-doc-code-anchors）零新增红
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log 已记录

## Deferred But Adjudicated

### plan 621 收口移交（Phase 3 实际发生，closure audit Minor 2 补录）

- Classification: `watch-only residual`
- Why Not Blocking Closure: plan 621 的收口（Phase 3 closure audit + roadmap 回写）归并发会话自身流程所有——其 Phase 1/2 已提交（46799d3be），收口未完成；本 plan 代收会产生跨会话半写状态
- Successor Required: `yes`
- Successor Path: 并发会话的 plan 621 Phase 3（自身 Closure Gates）

## Non-Blocking Follow-ups

- 11 份 plan 的共同模式（收口后忘翻头）的流程性预防——建议后续在 closure 流程加"同 commit 翻头"检查（不属本 plan）

## Closure

Status Note: 2026-10-17 收口。四 Phase 全落地：11 份 plan 状态头与完成事实对齐（10 翻转 + 555 第三处置）；479 按勘正事实落 `deferred`（52b4e610f 前提推翻——核心工作在 stash@{0}）；xlang 4 份补账翻转 + 616 证据重建填实（621 显式移交）；roadmap 头刷新 + 全清单归属表。执行侧的一次文件截断事故经 git 恢复并经独立复核确认无内容损失。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_4c58fc6a（closure audit，fresh session）+ agent_72e4a49b（Phase 1/2/3 三处裁决的独立复核，fresh session）
- Evidence: closure audit **approved**（0B/0M/3 Minor 随收口落：M1 本节补引两审计、M2 Deferred 621 条目补录、M3 624 行同日陈旧注记）——四 Phase 逐项 live 重验（头部 grep、479 事实抽查、616 恢复完整性 git diff 比对、归属表独立 grep 对账）；72e4a49b verdict **verified**（555 补勾引证实据、479 七项事实全对、616 重建非虚构）。
