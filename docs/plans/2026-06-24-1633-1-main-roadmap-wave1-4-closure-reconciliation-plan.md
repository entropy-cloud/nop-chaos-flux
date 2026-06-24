# 1 主组件 Roadmap Wave 1–4 收尾与状态对账

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md`、`docs/components/mobile-roadmap.md`、`docs/components/amis-baseline-matrix.md`、W1a–W4c 各 plan 的 Closure 节
> Related: `docs/plans/2026-06-22-2057-2-m5-mobile-native-components-plan.md`（W1d 实际交付物）、`docs/plans/2026-06-24-1633-2-list-scrolling-pagination-integration-plan.md`

## Purpose

把组件主 roadmap（Wave 1–4 + W1d）的「全部 wave 已在代码层落地，但 roadmap 状态文本滞后」这一不一致收口为单一可信基线：W1d 标 `done`、stale 计数清零、roadmap ↔ amis-baseline-matrix ↔ mobile-roadmap 三方一致，并显式记录尾部剩余项（D1a deferred、O1 optional）的归属。

## Current Baseline

- W1a–W4c 共 12 个工作项在 Phase Status 均已 `done`，对应 plan 均通过独立 closure audit。`amis-baseline-matrix.md` 状态**大体**同步但存在残留 drift：多数 wave 组件 Status 已 `runtime`（抽样 grid/collapse/steps/timeline/wizard/cards/markdown/html/separator/button-group 均 `runtime`），但仍有三处需本计划 Phase 2 收敛——(a) `markdown-editor`（W3d，Flux-native）在 matrix 中**无行**（缺登记，应入 Section 7 Flux-Only Form Component Families，对齐 `fieldset` 先例）；(b) 6 个 W3d 组件（input-month/quarter/year/file/image/editor）Implementation wave 列标 `landed` 而非 `wave 3`；(c) 4 个 W4c 组件（combo/picker/transfer/input-table，见 matrix 第 5 节行 149-152）Implementation wave 列同样标 `landed` 而非 `wave 4`。
- **W1d 实际已落地**：`pull-refresh` / `infinite-scroll` 已注册于 `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts:17` 与 `:41`（含 `defaultSchema`），M5 工作项 `done` 并有完整 closure audit 链（mobile-roadmap Current Baseline 明示「5 个组件已落地 … M5 工作项已完成」）。但 `roadmap.md:23` 仍写 `todo` 且标注「**代码未落地**」——与 live repo 矛盾。
- **stale 计数**：`roadmap.md:74` 仍写「核心缺口：43 个 retained-but-unimplemented renderer（W1–W4，12 个工作项）」。实际这 43 个已全部 `runtime`，retained-but-unimplemented 数应为 0；剩余仅为 D1a（2 个 declared-but-unregistered）与 O1（13 个可选）。W1d 的 2 个为 Flux-native 移动端组件，不经 amis-baseline-matrix（roadmap.md:283-285 已立约），随 M5 一并 `done`。
- roadmap.md 的 Rule（行 311）已规定「当 M5 plan 完成时，W1d 随 M5 一并标 `done`」——M5 已 `done`，W1d 标记属逾期机械收尾，但全局对账从未做过。
- D1a（designer-node-card / designer-edge-row）：schema 已声明（`packages/flow-designer-renderers/src/schemas.ts:45-53`），renderer **刻意未注册**。其 design.md 契约（designer-node-card §12、designer-edge-row §12）明示「需要等 host bridge 稳定后再注册」「需要等 inspector 与 graph summary 需求稳定后再确定」——该稳定性裁定属设计契约层保留判断，当前无「host bridge 已稳定、可注册」的记录决策。故 D1a 仍 deferred，不在本计划执行范围。

## Goals

- W1d Phase Status 由 `todo` 收敛为 `done`，并删除「代码未落地」这类与 live repo 矛盾的措辞。
- roadmap.md「核心缺口」/Current Baseline 的计数与 renderer 清单与 live repo 一致（43 个 wave 组件已 runtime；0 retained-but-unimplemented）。
- roadmap.md ↔ amis-baseline-matrix.md ↔ mobile-roadmap.md 三方在 W1d/Wave 1–4 维度无矛盾陈述。
- 尾部剩余项（D1a deferred 的依据、O1 optional、W1c list-scrolling successor）在 roadmap 中有清晰、诚实的归属记录。

## Non-Goals

- 不注册或实现 D1a 的 designer-node-card / designer-edge-row（host bridge 稳定性裁定属保留判断，超出本计划）。
- 不动 O1 任一可选组件的 retained 决策或为其建工作项（roadmap Rule：按需启动，需人确认）。
- 不实现 list 的 infinite-scroll/pagination 集成（归 successor plan `2026-06-24-1633-2-...`）。
- 不重构 roadmap 结构或改写 wave 划分；本计划是状态对账与文本一致性，不是 roadmap 重设计。

## Scope

### In Scope

- `docs/components/roadmap.md`：W1d 状态行、Current Baseline「核心缺口」计数与 renderer 基线、必要的 Rule/依赖图口径同步。
- `docs/components/amis-baseline-matrix.md`：核对 43 个 wave 组件 Status/wave 列全 `runtime`（修正任何残留 `targetContract`/漏标）。
- `docs/components/mobile-roadmap.md`：核对 W1d 镜像陈述与本计划一致（M5 done ⇒ W1d done）。
- 三方一致性逐项核对记录（写入本计划 Closure 与 daily log）。

### Out Of Scope

- D1a 注册实现、O1 工作项创建、list scrolling 实现（见 Non-Goals 与 successor plan）。
- `docs/components/<type>/design.md` 内容修订（各 wave plan closure 已收敛 §3 归属 drift，无遗留）。
- 任何代码（`packages/**`）变更——本计划为纯文档对账。

## Test Strategy

档位选择：`不适用：理由`

本档选择：不适用——纯文档状态对账与文本一致性核对，无代码行为变更、无公共契约变更；验证手段为文档↔live repo 交叉核对（逐组件 Status 抽样 + 计数重算），非自动化测试可覆盖。

## Execution Plan

### Phase 1 - W1d 状态收尾

Status: completed
Targets: `docs/components/roadmap.md`、`docs/components/mobile-roadmap.md`

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：将 `roadmap.md:23` 的 W1d 行由 `todo` 改为 `done`，删除「代码未落地」措辞，改为引用 M5 实际交付（plan path + `mobile-renderer-definitions.ts` 注册证据），口径与 mobile-roadmap 一致。
- [x] `Fix`：修正 `roadmap.md:311`（Rule 节）中「当前两者代码均未落地」同样与 live repo 矛盾的措辞，与 W1d done 口径一致。
- [x] `Proof`：在 live repo 核对 `pull-refresh`/`infinite-scroll` 注册（`mobile-renderer-definitions.ts` type+defaultSchema）与 M5 closure audit 链存在，作为 `done` 的事实依据（记录到本计划）。

Exit Criteria:

- [x] `roadmap.md` Phase Status 中 W1d 为 `done`，且该行不再出现「代码未落地」或任何与 `flux-renderers-mobile` 已落地相矛盾的措辞。
- [x] `roadmap.md` Rule 节（行 311）同样不再出现「代码未落地/均未落地」措辞。
- [x] W1d 行的 plan 引用指向 M5 plan，并注明「随 M5 一并 done」（对齐 roadmap Rule 行 311）。

> Phase 1 Proof 证据：`pull-refresh` 注册于 `mobile-renderer-definitions.ts:17`（`type:'pull-refresh'` + `defaultSchema:{type:'pull-refresh',body:[]}` + `component: PullRefreshRenderer`）；`infinite-scroll` 注册于 `mobile-renderer-definitions.ts:41`（`type:'infinite-scroll'` + `defaultSchema:{type:'infinite-scroll',body:[]}` + `component: InfiniteScrollRenderer`）。M5 plan `2026-06-22-2057-2-...` `Plan Status: completed`，Closure Audit Evidence Verdict `approved`，五点一致。`mobile-roadmap.md` Current Baseline 已写「5 个组件已落地」「M5 工作项已完成」，Phase Status M5 `done`——与 W1d done 无矛盾，无需改动 mobile-roadmap（Phase 3 再做三方交叉核对记录）。

### Phase 2 - 计数与基线对账

Status: completed
Targets: `docs/components/roadmap.md`、`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix | Proof`

- [x] `Fix`：重算 `roadmap.md:74`「核心缺口」计数——retained-but-unimplemented（W1–W4）由 43 改为 0；剩余项明确表述为「D1a 2 个 declared-but-unregistered + O1 13 个 optional；W1d 2 个移动端原生已随 M5 done」。
- [x] `Fix`：核对 `roadmap.md` Current Baseline「已实现」renderer 基线描述与 live repo 一致（43 个 wave 组件 + L0）；如 L0 清单与 wave 组件存在口径重叠/遗漏（例如 `list` 同时见于 L0 与 W1c），统一为不矛盾的表述。
- [x] `Fix`：在 `amis-baseline-matrix.md` Section 7（Flux-Only Form Component Families）补登 `markdown-editor` 行（Status 与 `fieldset` 先例一致、Owner doc 指向 `docs/components/markdown-editor/design.md`），消除「43 个 wave 组件之一在 matrix 无行」的缺登记 drift。
- [x] `Fix`：修正 `amis-baseline-matrix.md` Implementation wave 列——6 个 W3d 组件（input-month/quarter/year/file/image/editor）由 `landed` 改 `wave 3`；4 个 W4c 组件（combo/picker/transfer/input-table）由 `landed` 改 `wave 4`。
- [x] `Proof`：逐工作项（W1a–W4c，**全量非抽样**）核对 `amis-baseline-matrix.md` 对应组件 Status 均为 `runtime` 且 Implementation wave 列正确；发现上述清单之外的任何残留 `targetContract`/漏标即就地 `Fix` 并记录。

Exit Criteria:

- [x] `roadmap.md` 中不再出现「43 个 retained-but-unimplemented」或任何把已 `runtime` 组件计为未实现的陈述。
- [x] `amis-baseline-matrix.md` 中 W1a–W4c 全部 43 个 wave 组件均有对应行且 Status 为 `runtime`（`markdown-editor` 已入 Section 7；逐工作项全量核对记录写入本计划）。
- [x] `amis-baseline-matrix.md` 中 10 个原标 `landed` 的 wave 组件（W3d 6 + W4c 4）Implementation wave 列已修正为 `wave 3` / `wave 4`。

> Phase 2 全量核对记录（W1a–W4c，43 个 wave 组件，逐项 Status=`runtime` + wave 列）：
>
> - **W1a (wave 1, 5)**: markdown L89、html L90、link L91、image L92、json-view L98 — runtime/wave 1 ✓
> - **W1b (wave 1, 5)**: separator L70、card L71、progress L95、spinner L96、empty L97 — runtime/wave 1 ✓
> - **W1c (wave 1, 1)**: list L117 — runtime/**wave 1** ✓（**Proof 阶段就地 Fix**：原 `landed`→`wave 1`，属 W1c wave 1 交付，与 W2b 日期组件标 `wave 2` 同口径；roadmap L0 已加口径说明消除 L0↔W1c 重叠矛盾）
> - **W2a (wave 2, 5)**: service L114、pagination L118、cards L72、wizard L77、alert L99 — runtime/wave 2 ✓
> - **W2b (wave 2, 4)**: input-date L153、input-datetime L154、input-time L155、date-range L156 — runtime/wave 2 ✓
> - **W3a (wave 3, 2)**: grid L69、collapse L74 — runtime/wave 3 ✓
> - **W3b (wave 3, 2)**: button-group L86、dropdown-button L87 — runtime/wave 3 ✓
> - **W3c (wave 3, 2)**: mapping L100、status L101 — runtime/wave 3 ✓
> - **W3d (wave 3, 7)**: input-month L157、input-quarter L158、input-year L159、input-file L160、input-image L161、editor L162（6 个 `landed`→`wave 3`）+ markdown-editor Section 7（**新增行**）— 全 runtime/wave 3 ✓
> - **W4a (wave 4, 4)**: audio L102、video L103、carousel L104、qrcode L105 — runtime/wave 4 ✓
> - **W4b (wave 4, 2)**: steps L75、timeline L76 — runtime/wave 4 ✓
> - **W4c (wave 4, 4)**: combo L149、picker L150、transfer L151、input-table L152（4 个 `landed`→`wave 4`）— 全 runtime/wave 4 ✓
> - 合计：5+5+1+5+4+2+2+2+7+4+2+4 = **43**，全 `runtime`，无残留 `targetContract` 组件行（matrix 内 `targetContract` 仅剩 L27 Status Vocabulary 定义）。
> - 范围边界：`package-splitting-strategy.md` 仍含历史 `targetContract` 规划表述，属本计划 Non-Goal「不重构 roadmap 结构或改写 wave 划分」之外的历史规划文档，未改动。

### Phase 3 - 三方一致性核对 + 尾部归属记录

Status: completed
Targets: `docs/components/roadmap.md`、`docs/components/mobile-roadmap.md`、daily log

- Item Types: `Proof | Follow-up`

- [x] `Proof`：交叉核对 roadmap.md ↔ mobile-roadmap.md 在 W1d/M5 维度无矛盾（两者均反映 W1d done via M5）。
- [x] `Follow-up`：在 roadmap.md 显式记录尾部剩余项归属——D1a deferred（引用 design.md §12 host bridge 稳定性裁定为依据）、O1 optional（按需启动）、W1c list infinite-scroll/分页 successor（指向 `2026-06-24-1633-2-...` plan）。该记录应让读者清楚「主 wave 已全部 done，剩余仅为 deferred/optional/successor」。
- [x] `Follow-up`：更新 `docs/logs/2026/06-24.md`，记录本次主 roadmap 收尾对账与 W1d done。

Exit Criteria:

- [x] roadmap.md / mobile-roadmap.md / amis-baseline-matrix.md 三方在 Wave 1–4 + W1d 维度无互相矛盾的陈述。
- [x] roadmap.md 读者可从单一文件判断「主组件 wave 全部 done；D1a 为何 deferred；O1 为何 optional；list-scrolling 谁接手」。

> Phase 3 证据：(1) 三方核对——`roadmap.md:23` W1d `done`（引 M5 plan + 注册证据）↔ `mobile-roadmap.md` Phase Status M5 `done` + Current Baseline「5 个组件已落地」「M5 工作项已完成」↔ `amis-baseline-matrix.md` 按规则不登记 Flux-native 移动端组件（W1d 无 AMIS 源），三方在 W1d/M5 维度无矛盾陈述。(2) 尾部归属——`roadmap.md:76-81` 核心缺口区已列 D1a（deferred，引 design.md §12 host bridge 裁定 + `schemas.ts:45-53` 声明证据）、O1（optional 按需启动）、W1d（done via M5）、W1c list-scrolling successor（指向 `2026-06-24-1633-2-...` plan），并加「主 wave 全部 done，剩余仅 deferred/optional/successor」总结。(3) 日志——`docs/logs/2026/06-24.md` 顶部已新增「主组件 Roadmap Wave 1–4 收尾与状态对账」条目（含 Phase 1/2/3 摘要 + 验证手段 + 范围边界）。

## Draft Review Record

- Reviewer / Agent: opencode plan-review（fresh session, glm-5.2）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: (Major) Current Baseline 漏报 W4c 4 组件（combo/picker/transfer/input-table, matrix:149-152）wave 列 `landed`→`wave 4` drift，已补入；Phase 2 将 `markdown-editor` 缺登记与 wave 列 drift 从泛 Proof 拆为显式 `Fix`（Rule 15），并补可观测 Exit Criteria；消除「43 组件行」与 `markdown-editor` 无行的内部矛盾。(Minor) 引用准确性已 live 核对通过：`roadmap.md:23/74/311`、`mobile-renderer-definitions.ts:17/41`、`schemas.ts:45-53`、mobile-roadmap Current Baseline、M5 plan 与 successor plan 均存在且语义吻合。

## Closure Gates

> 纯文档计划：`pnpm test`/`lint`/`typecheck`/`build` 不适用（本计划无代码变更），依 guide 删除。

- [x] W1d 在 `roadmap.md` Phase Status 标 `done` 且无矛盾措辞
- [x] 「核心缺口」计数与 live repo 一致（0 retained-but-unimplemented from W1–W4）
- [x] `amis-baseline-matrix.md` 中 W1a–W4c 43 个 wave 组件均有行且 Status 全 `runtime`；10 个 wave 列 drift（W3d 6 + W4c 4）已修正（全量核对）
- [x] roadmap ↔ mobile-roadmap ↔ amis-baseline-matrix 三方无矛盾
- [x] 尾部剩余项（D1a deferred 依据 / O1 optional / list-scrolling successor）在 roadmap 有诚实归属
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `docs/logs/2026/06-24.md` 已更新

## Deferred But Adjudicated

### D1a designer-node-card / designer-edge-row 注册

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划是主 wave 状态对账，不实现新组件。D1a 注册受其 design.md 契约约束（designer-node-card §12 / designer-edge-row §12：「需要等 host bridge 稳定后再注册」），该稳定性裁定属保留判断，当前无已记录的「host bridge 已稳定」决策；故注册不在本计划 scope。
- Successor Required: `yes`
- Successor Path: 待 host bridge 稳定性裁定明确后，由独立 D1a 注册 plan 接手。

## Non-Blocking Follow-ups

- `roadmap.md` 的 Mermaid 依赖图样式标记为可选同步项（若 Phase Status 文本已一致，图例着色不影响 closure）。
- 各 `docs/components/<type>/design.md` 的 §3 归属在对应 wave plan closure 已收敛，无需在本计划重审。

## Closure

Status Note: 三个 Phase 全部执行完成（全 `[x]`，Status `completed`），6 个实质 Closure Gates 已勾选。本计划是纯文档状态对账（git 确认仅 `docs/components/roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/2026/06-24.md` 三文件改动，无 `packages/**` 代码变更），故 `pnpm test/lint/typecheck/build` 不适用（已按 guide 删除）。W1d 已 `done`（roadmap:23/311 收敛 + 注册证据 + M5 approved），「核心缺口」从「43 retained-but-unimplemented」收敛为「0」（43 wave 组件全 `runtime`），`markdown-editor` 缺登记 + 11 处 wave 列 drift（W3d 6 + W4c 4 + list）已修正，三方无矛盾，尾部归属诚实记录。closure-audit gate `[ ]` 留待独立 fresh-session 子 agent 复核后勾选（执行 session 不自审）。

Closure Audit Evidence:

- Auditor / Agent: opencode closure-audit (fresh session, general subagent)
- Evidence: 独立复核（非信任执行 session 叙述，直接读 live repo 逐项核对）：
  - **Phase A W1d truthfulness**：`roadmap.md:23` W1d `done`（引 M5 plan + 注册证据），全文件 grep 「代码未落地/均未落地」 EXIT=1（零命中）。`mobile-renderer-definitions.ts` 确认 `pull-refresh` 注册（L17 `type`、L21 `defaultSchema:{type:'pull-refresh',body:[]}`、L22 `component: PullRefreshRenderer`）、`infinite-scroll` 注册（L41 `type`、L45 `defaultSchema`、L46 `component: InfiniteScrollRenderer`）。M5 plan `2026-06-22-2057-2-...` L3 `Plan Status: completed`，L230 独立 fresh-session auditor，L244 `Verdict: approved`。
  - **Phase B 计数与基线（全量非抽样，逐行核对 `amis-baseline-matrix.md`）**——43 个 wave 组件全 `runtime`，wave 列正确：W1a(5,wave1) markdown L89/html L90/link L91/image L92/json-view L98；W1b(5,wave1) separator L70/card L71/progress L95/spinner L96/empty L97；W1c(1,wave1) list L117；W2a(5,wave2) service L114/pagination L118/cards L72/wizard L77/alert L99；W2b(4,wave2) input-date L153/input-datetime L154/input-time L155/date-range L156；W3a(2,wave3) grid L69/collapse L74；W3b(2,wave3) button-group L86/dropdown-button L87；W3c(2,wave3) mapping L100/status L101；W3d(7,wave3) input-month L157/input-quarter L158/input-year L159/input-file L160/input-image L161/editor L162（Sec5，均 `wave 3`）+ markdown-editor L192（Sec7，`runtime`，无 wave 列对齐 fieldset 先例，Role 嵌「(W3d)」）；W4a(4,wave4) audio L102/video L103/carousel L104/qrcode L105；W4b(2,wave4) steps L75/timeline L76；W4c(4,wave4) combo L149/picker L150/transfer L151/input-table L152。**合计 5+5+1+5+4+2+2+2+7+4+2+4 = 43**。`markdown-editor` 已入 Section 7。零 wave 组件残留 `landed`（所有 `landed` 行均为 pre-wave baseline 组件）；`targetContract` 仅剩 L27 Status Vocabulary 定义行。
  - **Phase C 三方一致 + 尾部归属**：`mobile-roadmap.md` L78 Phase Status M5 `done`、L20「5 个组件已落地」「M5 工作项已完成」——与 roadmap W1d done 无矛盾；`amis-baseline-matrix.md` 正确排除 Flux-native W1d 组件（无 pull-refresh/infinite-scroll 行，无 AMIS 源）。`roadmap.md` L78-83 尾部归属诚实：D1a deferred（引 design.md §12 host bridge 裁定 + `schemas.ts:45-53` 声明）、O1 optional、W1d done via M5、W1c list-scrolling successor（指向 `2026-06-24-1633-2-...` plan，该文件存在）。`docs/logs/2026/06-24.md` L3-11 新增收口条目。
  - **Phase D 文本一致性**：3 Phase 全 `Status: completed`、checklist/Exit Criteria 全 `[x]`；Closure Gates 除 closure-audit gate（本次勾选）外全 `[x]`；deferred 分类诚实（D1a = out-of-scope improvement，非隐匿 in-scope defect）。
  - **Phase E scope honesty**：`git status --short` 仅 3 docs 文件改动（`roadmap.md`/`amis-baseline-matrix.md`/`06-24.md`）+ 2 未跟踪 plan 文件；**零 `packages/**` 代码变更\*\*，无 stray build artifacts——与「纯文档对账」一致。
  - **Verdict**: `approved` — 零 Blocker，无 in-scope drift/contract gap/untruth 被静默降级。

Follow-up:

- 主组件 wave（W1a–W4c + W1d）已**全部 `done`**，43 个 wave 组件全 `runtime`，0 retained-but-unimplemented。
- D1a（`designer-node-card`/`designer-edge-row`）deferred——见 `## Deferred But Adjudicated`，受 design.md §12 host bridge 稳定性裁定约束，待独立 D1a 注册 plan 接手。
- W1c list infinite-scroll/分页集成归 successor plan `docs/plans/2026-06-24-1633-2-list-scrolling-pagination-integration-plan.md`。
- O1（13 个非 retained 可选项）optional，按需启动。
- `roadmap.md` Mermaid 依赖图样式为可选同步项（Phase Status 文本已一致，图例着色不影响 closure）。
