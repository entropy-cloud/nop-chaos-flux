# 677 审计修复 R2·MA3.11：代码质量审计—renderers-ai（含 message engine）

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.11；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.6（C7 结构面已审）、MA2.3（C7 运行时正确性已审——engine/adapter 取消纪律已验、clipboard family P2-MA2.3-001 已立案）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md`

## Purpose

对 flux-renderers-ai（71 src/104 test，12,418 行，30 tsx——含 message engine/adapters/renderers 三层）执行代码质量审计（matrix MA3.11，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `fbf0b6cf9`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：71 src / 104 test（`*.test.ts(x)` 件数口径）/ 12,418 行 / 30 tsx（src 口径排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本包 **0 真实指令**（`grep -l` 命中的 markdown.tsx:46-48 为**注释文字** "Compiler-safe: … no render-phase ref gating, no 'use no memo'"——声明未使用该指令；精确行首指令 grep 为空）；as-any **0**；TODO **0**。
- **专项扫描器**：`check:ai-engine-invariants` 全仓 **0**（AI 引擎专用不变量扫描器零违规）。
- **口径③ 基线**：oversized WARN 触及本包 **9 件**（实现 4：engine/create-engine.ts 696 / adapters/use-conversation.ts 670 / renderers/ai-chat.tsx 606 / renderers/ai-tool-call.tsx 547；测试 5）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及本包 **7 处**（触及口径——最小族之一）。
- **口径④ 基线**：WA 台账 **WA-ai-001..008**（**6 verified + 2 found**——found = WA-ai-005（P3）/ 008（P3）既有登记件）。
- **口径① 抽样初判**（MA2.3 已深验的面——本轮质量维度独立复核）：create-engine.ts（controller-identity 守卫/catch-finally 状态写保证/插件错误隔离——**engine 三层[:engine/adapters/renderers]纪律已在 MA2.3 全面验证**）、use-conversation.ts（detach-before-abort/排空链/镜像复检）、ai-chat.tsx（subscribe prev-state 翻转检测 + AI-09 快照克隆）。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：≈137 触摸。
- **执行状态**：roadmap MA3.11 当前 `todo`；无已登记 `arm2-MA3.11-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.11-ai-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.11-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：create-engine / use-conversation / ai-chat / ai-tool-call / branching 或 tool-execution——三问；MA2.3 已验取消纪律面本轮按质量维度独立复核结构分层）；② **React 19**（'use no memo' 精确口径——markdown 命中为注释 + check:react19 0）；③ **重构候选**（oversized 9 件逐簇裁定 + duplicates 7 处归族）；④ **workaround 嗅探**（TODO 0 + WA-ai 8 条核对〔found 2 件定性〕+ as-unknown-as 链探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.11 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.6/MA2.3 finding（clipboard family P2-MA2.3-001 已立案归 MR；AI 文案语气归 MA6.2 轻量抽查；流式交互行为归 MA5.6）。
- 不执行 MA3.12 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.11 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 9 件逐簇裁定、duplicates 7 处归族、React 19 两点、WA 台账 8 条核对、churn top、四口径扫描器复跑（含 ai-engine-invariants 专项）。
- `docs/logs/2026/10-20.md` 追加 MA3.11 条目；roadmap MA3.11 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.12+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                    | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）                                  | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 本包 >0 / ai-engine-invariants >0 / oversized 本包 unique 超 9 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：create-engine.ts（engine 层状态机）、use-conversation.ts（adapter 层）、ai-chat.tsx（renderer 层）、ai-tool-call.tsx、branching.ts 或 tool-execution.ts；每文件三问（MA2.3 取消纪律面独立复核结构分层）
- [x] **React 19 口径**：'use no memo' 精确口径（0 真实指令；markdown.tsx 命中为注释）+ check:react19 0
- [x] **重构候选**：oversized 9 件逐簇裁定（engine/adapter/renderer 三层各归属 + 测试 5 归 MA4.3 交叉）；duplicates 7 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-ai 8 条状态核对（found 2 件位点定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 9 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / 'use no memo' 0 真实指令精确口径 / as-any=0 / ai-engine-invariants=0 / duplicates 7 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn ≈137、MA2.3 交叉点（取消纪律不预载）、engine/adapter/renderer 三层边界
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：engine 状态机族、adapter hooks 族、renderer 组件族
- [x] 深化机会与 MA4.3/MA5.6/MA6.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.11-ai-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.11 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.11 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.11 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.11 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.11 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数复算 + 报告侧抽样含 WA 逐条）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修（审查员预授权："M1/M2 修正落字后即视为共识达成，plan 可升 active"）
- Rounds: 1
- Findings addressed: M1 报告 churn 归因勘正（RM-10/RM-4 各仅 1 件→实测 WA-11〔plan 571〕42 触摸最大单源 + visual-quality 系列 + plan 529）；M2 报告头状态超前→draft；m1 plan 笔误 'use no markdown'→'use no memo'；m2 test 口径括注；m3 daily log 前向引用随 Phase 3 落账

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.11 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / 'use no memo' 本包=0 真实指令口径 / as-any=0 / ai-engine-invariants=0 / oversized 本包 unique=9 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.11 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m 可选补记——9/9 对账全 PASS；m1 as-unknown-as 探测留痕/m2 路径精度，随收口落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本包 +9 件〕、跨包克隆家族批；branching.ts AI-24 抽取先例回填治理文档候选）

## Closure

Status Note: MA3.11 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.11 行唯一无重复，P1=0）、daily log MA3.11 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/2m 可选补记——9/9 对账全 PASS：oversized 9 unique/五文件位点逐字/'use no memo' 精确口径/WA 8 条/duplicates 7/规模四数）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本包 9 件/结构相似克隆 7 处最小族）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：oversized 9 unique/五文件位点逐行/'use no memo' 双口径精确 grep/WA 8 条 ledger 行号定位/duplicates 7/规模四数逐位/零代码变更/P3 双抽样定性）
- Evidence: 终局 `approved`（0B/0M/2m 可选补记——m1 as-unknown-as 留痕/m2 路径精度，随收口 commit 落盘）

Follow-up:

- no remaining plan-owned work
