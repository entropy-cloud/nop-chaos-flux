# 681 审计修复 R2·MA3.15：代码质量审计—word-editor-core + word-editor-renderers

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.15；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.8（C9 结构面已审）、MA2.4（C9 运行时正确性已审——**P2-MA2.4-001 word-editor localStorage 恢复面已立案归 MR**，本项不重审定级）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/report-designer/design.md` + `renderer-runtime.md`

## Purpose

对 C9 word-editor 两包（word-editor-core 15 src/15 test/1,893 行/0 tsx + word-editor-renderers 30/24/4,675/19 tsx，合计 45 src/39 test/6,568 行）执行代码质量审计（matrix MA3.15，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `1ad0fc39c`，工作树含并发线未提交文件——本项产物与提交不含之）

- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 两包 **0**；as-any 两包 **0**（实现文件口径——扫描器排除测试件；draft review m-C 注）；TODO **0**。
- **口径③ 基线**：oversized WARN 触及两包 **2 件**（实现 1：core/document-io.ts 550——recovery/normalize/dataset 三段〔MA2.4 已验 recovery 错误分类面〕；测试 1）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及两包 **21 处**（触及口径）。
- **口径④ 基线**：WA 台账 **WA-word 族 11 条**（**WA-wordr-001..010：8 verified + 2 found**——found = WA-wordr-008（P3，**弹层 key 重挂载复位**〔word-editor-page.tsx:361 + ribbon-toolbar.tsx:68，watch-only〕）/ 010；WA-word-editor-core-001 verified）——无未登记活体。
- **口径① 抽样初判**（MA2.4 已深验 recovery/canvas/undo 面——本轮质量维度独立复核）：document-io.ts、editor-store.ts、dataset-model/store、editor-canvas.tsx、use-word-editor-save.ts。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：core ≈15 / renderers ≈54——FM-7〔plan 651〕/WA-13b〔plan 574〕/WA-12〔plan 572〕系列收口热点（携 plan 号）。
- **执行状态**：roadmap MA3.15 当前 `todo`；无已登记 `arm2-MA3.15-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.15-word-editor-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.15-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：document-io / editor-store / dataset-model+store / editor-canvas / use-word-editor-save——三问）；② **React 19**（零 'use no memo' 论证 + check:react19 0）；③ **重构候选**（oversized 2 件逐件裁定 + duplicates 21 处归族）；④ **workaround 嗅探**（TODO 0 + WA-word 族 11 条核对〔found 2 件定性〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.15 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.7/MA2.4 finding（P2-MA2.4-001 localStorage 恢复面已立案归 MR——本项不重审定级）；word editor 交互行为归 MA5.3。
- 不执行 MA3.16 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.15 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 2 件逐件裁定、duplicates 21 处归族、React 19 两点、WA 台账 11 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.15 条目；roadmap MA3.15 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.16+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                          | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）        | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 两包 >0 / oversized 两包 unique 超 2 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：document-io.ts（550 三段）、editor-store.ts、dataset-model.ts + dataset-store.ts、editor-canvas.tsx、use-word-editor-save.ts；每文件三问
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0
- [x] **重构候选**：oversized 2 件〔document-io 550 + word-editor-page-host-scope-projections.test 517〕逐件裁定 + duplicates 21 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-word 族 11 条状态核对（found 2 件位点定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 2 件逐件裁定行
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 21 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 两包（plan 618/FM 亲核）、MA1.7/MA2.4 交叉点（不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：document-io 三段、canvas 命令通道、dataset 面
- [x] 深化机会与 MA4.4/MA5.3 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.15-word-editor-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.15 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.15 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物，Rule 18 交付物耦合偏差显式豁免注——draft review m4）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.15 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.15 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.15 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数复算 + 跨簇归因逐处考古〔MA2.3 报告 grep "word" 零命中/MA2.4 报告 :26/:33 实文/plan 618 全历史零 word-editor 提交〕）
- Verdict: R1 `revised`（0B/3M/4m）→ 回修 → R2 复核
- Rounds: 1
- Findings addressed: M1 跨簇归因系统性错位（Related MA1.7→**MA1.8**；MA2.3→**MA2.4** ×8 处〔recovery/dataset/canvas/save 面〕；MA4.3→**MA4.4**；churn plan 618/D5→**FM-7/WA-13b/WA-12 实测热点**）；M2 WA-wordr-008 定性勘正（invoke-canvas-command 立案件→**弹层 key 重挂载复位**〔page:361/ribbon-toolbar:68，watch-only〕——invoke-canvas-command 是 WA-wordr-004 修复产物）；M3 报告头状态+收口补记时序；m1 测试件具名（word-editor-page-host-scope-projections.test 517）；m2 as-any 实现文件口径注；m3 churn 精确窗口；m4 Rule 18 豁免注

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.15 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 两包=0 / oversized 两包 unique=2 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.15 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 0B/2M/2m——**R-A：M2 勘正两处复发未净 + R-B：M1 归因残留 6 处**〔初稿回修不彻底〕→ 全部清零 → 第二轮复核 `approved` 0B/0M/0m）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，两包 +2 件〕、跨包克隆家族批；deep-audit-prompts.md:532 死指针勘误延续〔MA3.8 M1 立案〕）

## Closure

Status Note: MA3.15 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.15 行唯一无重复，P1=0）、daily log MA3.15 条目〔含两轮如实叙事〕、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（0B/2M/2m——R-A：M2 勘正在报告主体两处复发未净〔:27/:59〕+ R-B：M1 归因勘正残留 6 处〔MA2.3 归因〕）→ 全部清零（残留 MA2.3 仅存 Draft Review Record 证据引用）→ 第二轮复核 `approved`（0B/0M/0m——四项回修实测清零+连带终验通过）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 两包 2 件/结构相似克隆 21 处触及）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 12 项核验〔10 PASS + Major A/B 勘正未净〕→ 残留清零 → 第二轮回修核验表 4 项全 PASS + 连带终验〔零代码变更维持/首轮 PASS 项不受影响/审计痕迹注保留正确〕→ `approved`）
- Evidence: 第二轮复核结论"四项回修全部实测清零，残留严格限于勘正历史与证据引用（3 处合法）"

Follow-up:

- no remaining plan-owned work
