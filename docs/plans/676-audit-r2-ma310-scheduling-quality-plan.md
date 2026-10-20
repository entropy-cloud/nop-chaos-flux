# 676 审计修复 R2·MA3.10：代码质量审计—renderers-scheduling

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.10；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.6（C6 结构面已审）、MA2.3（C6 运行时正确性已审——barcode camera IO P1-MA2.3-001 已立案归 MR）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md`

## Purpose

对 flux-renderers-scheduling（92 src/114 test，13,534 行，32 tsx）执行代码质量审计（matrix MA3.10，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `cc8cb7096`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：92 src / 114 test / 13,534 行 / 32 tsx（src 口径排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本包 **0**；**as-any 8 处**（继 MA3.2 基建三包 3 位点后本系列第二个非零包、首个非零 renderer 包——逐点定性：barcode torch/detector 3 处为浏览器原生 API 特性检测与第三方枚举动态访问〔与 P1-MA2.3-001 camera 族同域〕、calendar 2 处为 schema resolved 动态访问+弃用路径 dev 告警、gantt-grid 1 处 schema 驱动动态列访问、use-kanban-board-state 1 处 schema config 访问、kanban-column 1 处为 **WA-scheduling-003 收敛注释**〔RenderRegionHandle 收敛后残留文字提及〕）——初判全部校准动态边界，现场逐点复核。
- **TODO 基线**：**1 件 = M0 注册基线件**（gantt/undo-stack.ts:194 todo-exitless——**WA-scheduling-005 已裁定双轨设计注记**："Gantt: class-based commands…Kanban: typed operation deltas…Unification is a possible future refactor…pick it up only if a third command consumer appears"）——非开放 TODO。
- **口径③ 基线**：oversized WARN 触及本包 **6 件**（实现 3：gantt/gantt.tsx 676 / calendar/calendar.tsx 643 / kanban/kanban-board.tsx 572；测试 3）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及本包 **22 处**（触及口径）。
- **口径④ 基线**：WA 台账 **WA-scheduling-001..009**（**4 verified**〔001/003/005/009〕+ **5 found**〔002/004/006/007/008——WA-9 批挂账既有件〕）——无未登记活体。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：≈248 触摸（top：kanban-board 10/gantt 10/calendar 9——visual-quality〔plans 479-488〕/interaction-state〔plans 513-546〕/WA-8〔plan 568〕/perf 2026-09-29-1/RM-11〔plan 613〕/cq-6 多系列热点，携 plan 号）。
- **执行状态**：roadmap MA3.10 当前 `todo`；无已登记 `arm2-MA3.10-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.10-scheduling-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.10-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：gantt.tsx / calendar.tsx / kanban-board.tsx / undo-stack.ts / barcode-input 族——三问）；② **React 19**（零 'use no memo' 论证 + check:react19 0 + as-any 8 处逐点定性）；③ **重构候选**（oversized 6 件逐簇裁定 + duplicates 22 处归族）；④ **workaround 嗅探**（TODO 1 = WA-005 裁定件核验 + WA-scheduling 9 条状态核对〔found 5 件定性〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.10 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.6/MA2.3 finding（P1-MA2.3-001 camera IO 已立案——barcode as-any 3 处与其同域但不改变其定级路径）；测试组织归 MA4.3；gantt/kanban/calendar 交互归 MA5.2。
- 不执行 MA3.11 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.10 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 6 件逐簇裁定、duplicates 22 处归族、React 19 两点（含 as-any 8 处逐点）、WA 台账 9 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.10 条目；roadmap MA3.10 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.11+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                      | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）                                    | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 本包 >8 处存量口径 / oversized 本包 unique 超 6 件 / TODO >1（WA-005 注册件） | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：gantt.tsx（676 orchestrator）、calendar.tsx（643）、kanban-board.tsx（572）、undo-stack.ts（WA-005 双轨裁定件）、barcode-input/barcode-scanner-overlay.tsx（MA2.3 已验 wasm env.fetcher 面）；每文件三问
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0 + **as-any 8 处逐点定性**（barcode 3/calendar 2/gantt-grid 1/kanban 2）
- [x] **重构候选**：oversized 6 件逐簇裁定（gantt/calendar/kanban 三大件 + 测试 3 归 MA4.3 交叉）；duplicates 22 处归族
- [x] **workaround 嗅探**：TODO 1 = WA-005 裁定件核验（双轨注记在案）+ WA-scheduling 9 条状态核对（found 5 件位点定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 6 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / as-any 8 处逐点定性落字 / TODO 1 = WA-005 件核验 / duplicates 22 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn ≈248（FM 系列亲核）、MA1.6/MA2.3 交叉点（不预载）、gantt/kanban 双轨 undo（WA-005）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：gantt/calendar/kanban 三大件内聚、barcode 族 camera 相邻面、undo 双轨第三消费者阈值
- [x] 深化机会与 MA4.3/MA5.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.10-scheduling-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.10 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.10 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.10 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.10 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.10 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数复核 + 报告侧抽样 3 条）
- Verdict: R1 `revised`（0B/3M/2m）→ 回修（审查员预授权："修正后即可升 active"）
- Rounds: 1
- Findings addressed: M1 churn 归因勘正（"FM 系列热点"→visual-quality〔479-488〕/interaction-state〔513-546〕/WA-8〔568〕/perf/RM-11〔613〕/cq-6 多系列——FM 未触 top-3 文件）；M2 报告头状态超前→draft；M3 "本系列首个非零包"→"继 MA3.2 后第二个非零、首个非零 renderer 包"；m1 gantt 678→676；m2 WA-005 注记跨度 :192-197→:193-198

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.10 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 本包=8 处存量口径 / oversized 本包 unique=6 件存量口径 / TODO=1（WA-005 注册件）
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.10 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m——10/10 对账全 PASS；m1 gantt 本体无头注措辞勘正随收口落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本包 +6 件〕、跨包克隆家族批；WA-005 第三消费者阈值条款延续）

## Closure

Status Note: MA3.10 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.10 行唯一无重复，P1=0）、daily log MA3.10 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/2m——10/10 对账全 PASS：oversized 6 unique/as-any 8 处逐点/WA 9 条/TODO 1 注册件/duplicates 22/规模四数；m1 gantt 本体无头注措辞勘正随收口落盘）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本包 6 件/结构相似克隆 22 处触及）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，10/10 对账全 PASS：oversized 6 unique 逐件/as-any 8 处逐点含注释行判定/WA 9 条 ledger 行号定位/TODO 1 注册件/duplicates 22/规模四数全中/克隆双抽样定性/零代码变更）
- Evidence: 终局 `approved`（0B/0M/2m 不阻塞——m1 一行勘正随收口提交带入）

Follow-up:

- no remaining plan-owned work
