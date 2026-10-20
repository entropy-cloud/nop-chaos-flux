# 678 审计修复 R2·MA3.12：代码质量审计—flow-designer-core + flow-designer-renderers + editor-core

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.12；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.7（C8 结构面已审——P1-MA1.7-001 BEM 16 处已立案归 MR）、MA2.4（C8 运行时正确性已审——undo/redo 状态机与序列化往返已验）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/flow-designer/design.md` + `renderer-runtime.md`

## Purpose

对 C8 designer 三包（flow-designer-core 30 src/14 test/5,960 行/0 tsx + flow-designer-renderers 57/49/10,053/26 tsx + editor-core 6/2/757/0 tsx，合计 93 src/65 test/16,770 行）执行代码质量审计（matrix MA3.12，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `27c9eb0e6`，工作树含并发线未提交文件——本项产物与提交不含之）

- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 三包 **0**；as-any 三包 **0**（扫描器口径——playground 的 flow-designer-page 2 处不属本项域）；TODO **0**。
- **口径③ 基线**：oversized WARN 触及三包 **16 件**（实现 9：fdc core.ts 694 / tree-projection.ts 675 / types.ts 512 + fdr designer-xyflow-canvas 622 / designer-page-body 604 / designer-canvas 552 / designer-action-provider 549 / designer-inspector 549 / designer-manifest 503；测试 7）——**均未登记**（MA3.1 P3-003 family；**精确包边界口径**——word-editor-core 件不属本项）。
- **duplicates 初判**：触及三包 **34 处**（触及口径）。
- **口径④ 基线**：WA 台账 **15 条**（WA-flowr-001..010：9 verified + 1 found=008；WA-flow-designer-core-001..005：全 verified）——found 1 件为台账既有登记。
- **口径① 抽样初判**（MA2.4 已深验 undo/redo 与序列化面——本轮质量维度独立复核）：editor-core UndoCommandStack（entry-agnostic 栈 + drift-rebuild 语义）、flow-designer-core/core/history.ts（纯函数快照栈）、designer-xyflow-canvas（MA2.4 已验 async 队列 generation 守卫）。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：fdr ≈135 / fdc ≈50 / ec ≈15——MA3.7 churn 冠军域（携 plan 号）。
- **执行状态**：roadmap MA3.12 当前 `todo`；无已登记 `arm2-MA3.12-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.12-flow-designer-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.12-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：fdc core.ts / tree-projection.ts / fdr designer-xyflow-canvas / designer-page-body / editor-core editor-core.ts——三问；MA2.4 undo/序列化面独立复核结构分层）；② **React 19**（零 'use no memo' 论证 + check:react19 0）；③ **重构候选**（oversized 16 件逐簇裁定 + duplicates 34 处归族）；④ **workaround 嗅探**（TODO 0 + WA 15 条核对〔found 1 件定性〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.12 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.7/MA2.4 finding（P1-MA1.7-001 BEM 16 处已立案归 MR——BEM 面归 MR2 不重审；undo/序列化正确性 MA2.4 已验）；flow 交互行为归 MA5.1。
- 不执行 MA3.13 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.12 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 16 件逐簇裁定、duplicates 34 处归族、React 19 两点、WA 台账 15 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.12 条目；roadmap MA3.12 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.13+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                           | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）         | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 三包 >0 / oversized 三包 unique 超 16 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：fdc core.ts（694 orchestrator）、fdc tree-projection.ts（675）、fdr designer-xyflow-canvas.tsx（622）、fdr designer-page-body.tsx（604）、editor-core editor-core.ts（339 会话核心）；每文件三问
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0
- [x] **重构候选**：oversized 16 件逐簇裁定（fdc core 族 3/fdr canvas 族 3/fdr 面板族 3 + 测试 7 归 MA4.3 交叉）；duplicates 34 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA 15 条状态核对（found 1 件 WA-flowr-008 定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 16 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 34 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn fdr 135（MA3.7 冠军域亲核）、MA1.7/MA2.4 交叉点（不预载）、tree-session 队列族
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：canvas 双件（xyflow/page-body）分工、core.ts orchestrator、editor-core 会话核心
- [x] 深化机会与 MA4.3/MA5.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.12-flow-designer-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.12 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.12 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.12 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.12 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.12 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量复算〔16 件行数逐一、34 克隆精确边界、WA 15 条逐行、word-editor-core 子串陷阱验证〕+ 报告侧抽样 4 条）
- Verdict: R1 `pass-with-minors`（0B/0M/3m——首轮通过）
- Rounds: 1
- Findings addressed: m1 报告误报排除 #4 归因修正（knip-baseline 现含 2 个未入基线命中：xlang mock-server〔10-18 log 并发归属〕+ 3d UseDataSourcesArgs〔09-16 plan 470 未登记〕——"零新增"成立但单因归因高估登记覆盖）；m2 报告头状态随本 review 通过对齐 active；m3（行外）WA-flowr-008 ledger 行锚漂移〔live :426/:433-435〕建议顺手落账

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.12 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 三包=0 / oversized 三包 unique=16 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.12 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 0B/1M/1m——M1 报告 :66 双归因勘正未落〔python 替换串 "5."/"4." 静默未匹配〕→ 精确行编辑 → scoped 复核 `approved` 0B/0M）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，三包 +16 件〕、跨包克隆家族批；knip-baseline 未登记项治理〔3d UseDataSourcesArgs 等——行外债〕；WA-flowr-008 ledger 行锚漂移附注）

## Closure

Status Note: MA3.12 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.12 行唯一无重复，P1=0）、daily log MA3.12 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（0B/1M/1m——M1 报告 :66 双归因勘正声称已修而实际未落〔替换串编号错〕）→ 精确行编辑 → scoped 复核 `approved`（10/10 PASS，0B/0M 未决）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 三包 16 件/结构相似克隆 34 处触及）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 10 项对账〔9 PASS + M1 报告勘正未落〕→ 一行勘正 → scoped 复核 `approved` 10/10 PASS 0B/0M/0m）
- Evidence: scoped 复核结论"改动行落字精确，双归因两个命中路径与 check:knip-baseline 实测输出逐字吻合；相邻条目未受波及"

Follow-up:

- no remaining plan-owned work
