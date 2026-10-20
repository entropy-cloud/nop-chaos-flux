# 679 审计修复 R2·MA3.13：代码质量审计—page-designer-core + page-designer-renderers

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.13；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.7（C8 结构面已审）、MA2.4（C8 运行时正确性已审——xui:sid round-trip INV-A..F 已验）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md` + `docs/components/page-designer/design-architecture.md`

## Purpose

对 C8 page-designer 两包（page-designer-core 13 src/10 test/1,723 行/0 tsx + page-designer-renderers 26/22/3,897/12 tsx，合计 39 src/32 test/5,620 行）执行代码质量审计（matrix MA3.13，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `21dcf6f87`，工作树含并发线未提交文件——本项产物与提交不含之）

- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 两包 **0**；as-any 两包 **0**；TODO **0**。
- **口径③ 基线**：oversized WARN 触及两包 **1 件**（实现 1：renderers/page-designer-page.tsx 609——组装页三栏壳，transient 意图与命令通道分离头注在案〔S1 §4.1/§7.2/§8.3 设计锚定〕；测试 0）——**未登记**（MA3.1 P3-003 family——**全系列最小族**）。
- **duplicates 初判**：触及两包 **6 处**（触及口径——最小族之一）。
- **口径④ 基线**：WA 台账 **WA-page 族 14 条**（WA-page-designer-core-001 verified、WA-pager-001/002/003 verified、WA-pages-001/008 等）——按台账行实数核对。
- **口径① 抽样初判**（MA2.4 已深验 xui:sid round-trip INV-A..F 与 undo 面——本轮质量维度独立复核结构分层）：page-designer-page.tsx（三栏壳组装 + session.dispatch 单通道）、core/round-trip.ts、core/commands.ts、core/session.ts、core/command-serialization.ts。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：core ≈32 / renderers ≈95——plan 643（UR-17/18 Wave E）/619 系列收口热点（携 plan 号）。
- **执行状态**：roadmap MA3.13 当前 `todo`；无已登记 `arm2-MA3.13-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.13-page-designer-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.13-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：page-designer-page / round-trip / commands / session / command-serialization——三问；MA2.4 已验面结构复核）；② **React 19**（零 'use no memo' 论证 + check:react19 0）；③ **重构候选**（oversized 1 件逐件裁定 + duplicates 6 处归族）；④ **workaround 嗅探**（TODO 0 + WA-page 族 14 条核对 + 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.13 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.7/MA2.4 finding；page designer 交互行为归 MA5.1。
- 不执行 MA3.14 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.13 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 1 件逐件裁定、duplicates 6 处归族、React 19 两点、WA 台账核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.13 条目；roadmap MA3.13 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.14+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                          | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）        | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 两包 >0 / oversized 两包 unique 超 1 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：page-designer-page.tsx（609 组装页）、core/round-trip.ts、core/commands.ts、core/session.ts、core/command-serialization.ts；每文件三问
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0
- [x] **重构候选**：oversized 1 件逐件裁定 + duplicates 6 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-page 族 14 条状态核对 + as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 1 件逐件裁定行
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 6 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 两包（plan 643/619 亲核）、MA1.7/MA2.4 交叉点（不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：组装页三栏壳、core 命令族、editor-core 事务收口
- [x] 深化机会与 MA4.3/MA5.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.13-page-designer-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.13 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.13 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.13 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.13 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.13 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量复算〔含 WA-page 族 14 条逐行数清：pager-001..004 + fdc-001 + pages-001..009，7 verified + 2 found〕+ 报告侧抽样 3 条）
- Verdict: R1 `pass-with-minors`（0B/0M/2m——首轮通过）
- Rounds: 1
- Findings addressed: m1 报告头状态与 daily log 前向引用随 review 通过/Phase 3 落账对齐（678 判例）；m2 报告 INV-C 归属精确化（round-trip.ts 定义 / tree-navigation.ts:198 实现 / commands 域测试断言）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.13 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 两包=0 / oversized 两包 unique=1 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.13 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/1m 自愈型——10/10 对账全 PASS：oversized 唯一件 609 实测/WA-page 14 条逐行清点/规模逐字节复算）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +1 件〕、跨包克隆家族批）

## Closure

Status Note: MA3.13 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.13 行唯一无重复，P1=0）、daily log MA3.13 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/1m 自愈型——10/10 对账全 PASS：oversized 唯一件 609 实测/m2 INV-C 归属精确化验证/WA-page 14 条逐行清点〔含 WA-pages-001/008 successor CX-19/20 在案〕/规模逐字节复算）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本域 1 件最小族/结构相似克隆 6 处最小族）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，10/10 对账全 PASS：oversized 1 件实测/五文件位点逐字〔含 m2 三点归属验证〕/WA 14 条逐行清点/duplicates 6 处解析/规模逐字节/零代码变更/P3 双抽样定性）
- Evidence: 终局 `approved`（0B/0M/1m 自愈型——m1 随收口 commit 落盘自愈）

Follow-up:

- no remaining plan-owned work
