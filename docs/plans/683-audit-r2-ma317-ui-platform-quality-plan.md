# 683 审计修复 R2·MA3.17：代码质量审计—ui + theme-tokens + tailwind-preset + flux-i18n

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.17；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.9（C10 结构面已审——ui 69 export 覆盖面/css-exports 已验）、MA2.4（C10 运行时正确性已验——drawer teardown/drag-ghost 修复面；WA-ui-005 验证在 MA2.4 报告 :104、WA-ui-006 在 WA ledger closure〔agent_c6218731〕）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/styling-system.md` + `renderer-runtime.md`

## Purpose

对 C10 platform 四包（ui 84 src/72 test/9,386 行/67 tsx + theme-tokens 1/2/40/0 + tailwind-preset 1/1/151/0 + flux-i18n 6/2/4,331/0，合计 92 src/77 test/13,908 行）执行代码质量审计（matrix MA3.17，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `4460f6ba5`，工作树含并发线未提交文件——本项产物与提交不含之）

- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 四包 **0**（ui 的 'use client' 为 RSC 边界标记，与 memo 指令正交）；as-any 四包 **0**；TODO **0**。
- **口径③ 基线**：oversized WARN 触及四包 **3 件**（flux-i18n/locales/en-US.ts 2075 **[exempt]** + zh-CN.ts 2074 **[exempt]**〔i18n locales 双件已注册豁免〕+ ui/drawer.tsx 524〔**未登记 WARN**——Base UI 装配层〕；测试 0）——**locales exempt 已注册、drawer 未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及四包 **26 处**（触及口径）。
- **口径④ 基线**：WA 台账 **WA-ui-001..008 全 verified + WA-i18n-001 verified**（共 9 条**零 found**——wa-13b/FM 系列已完整收敛本域，与 report-designer 并列全系列最净）——无未登记活体。
- **口径① 抽样初判**（MA2.4 已深验 drawer teardown/drag-ghost 修复面——本轮质量维度独立复核；WA-ui-006 验证证据在 WA ledger closure）：drawer.tsx（Base UI Drawer 装配 + overlay-z-index 层级治理）、json-viewer.tsx（WA-ui-005 修复位）、drag-ghost.ts、flux-i18n/i18n.ts+hooks.ts（1843 keys zh=en 对齐 + contract test）、theme-tokens/tailwind-preset 声明件。
- **churn（近 1 个月窗口实测，git log --name-only 触摸口径、窗口敏感）**：ui ≈129 / flux-i18n ≈105 / theme-tokens ≈10 / tailwind-preset ≈4——FM 系列〔plan 651〕与 designer collapse 契约系列热点（携 plan 号）。
- **执行状态**：roadmap MA3.17 当前 `todo`；无已登记 `arm2-MA3.17-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.17-platform-ui-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.17-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：drawer / json-viewer / drag-ghost / flux-i18n i18n.ts+hooks / theme-tokens 或 tailwind-preset——三问）；② **React 19**（'use client' 与 'use no memo' 正交论证 + check:react19 0）；③ **重构候选**（oversized 3 件逐件裁定〔区分 exempt/未登记〕+ duplicates 26 处归族）；④ **workaround 嗅探**（TODO 0 + WA-ui 8 条 + WA-i18n 1 条核对〔零 found 验证〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.17 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.9/MA2.3 finding；UI 组件视觉行为归 MA6.4；i18n 键完整性归 MA8.2。
- 不执行 MA3.18 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.17 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 3 件逐件裁定（区分 exempt/未登记）、duplicates 26 处归族、React 19 两点、WA 台账 9 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.17 条目；roadmap MA3.17 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.18+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                          | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）        | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 四包 >0 / oversized 四包 unique 超 3 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：drawer.tsx（524 Base UI 装配）、json-viewer.tsx（WA-ui-005 修复位）、drag-ghost.ts、flux-i18n i18n.ts + hooks.ts、theme-tokens 或 tailwind-preset；每文件三问
- [x] **React 19 口径**：'use client' 与 'use no memo' 正交论证 + check:react19 0
- [x] **重构候选**：oversized 3 件逐件裁定（区分 locales exempt/未登记 WARN）+ duplicates 26 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-ui 8 条 + WA-i18n 1 条状态核对（零 found 验证）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 3 件逐件裁定行（区分 exempt/未登记）
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 26 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn ui 129/i18n 105（FM 系列亲核）、MA1.9/MA2.3 交叉点（不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：drawer/overlay 层级、i18n 键治理、token/preset 声明面
- [x] 深化机会与 MA4.4/MA6.4/MA8.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.17-platform-ui-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式（`docs/skills/deep-audit-prompts.md`）落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.17 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.17 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物，Rule 18 交付物耦合偏差显式豁免注）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.17 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.17 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.17 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量复算〔含 'use no memo' 全仓 10 文件/ui 20 文件 'use client' 抽验/locales exempt 双件 scanner OVERSIZED_EXEMPTIONS 实证〕+ 报告侧抽样 3+ 条）
- Verdict: R1 `revised`（0B/2M/2m）→ 回修（审查员裁定"文本行编辑+一次文件改名，完成后 R2 复核"）
- Rounds: 1
- Findings addressed: M1 oversized 计数 4→**3 件**（locales 2 exempt + drawer 1 WARN；plan 六处/report 六处联动，Failure Paths 阈值同步）；M2 MA2.3→**MA2.4** 运行时归属勘正（drawer teardown/drag-ghost 在 MA2.4 报告 :34/:36/:104；WA-ui-005/006 指针改锚 WA ledger closure）；m1 报告文件名对齐 matrix 登记模式（platform-ui-quality）；m2 报告头状态

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.17 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 四包=0 / oversized 四包 unique=3 件存量口径（locales 2 exempt + drawer 1 WARN）/ TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.17 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 0B/1M——R-A M2 勘正在报告主体 5 处复发未净〔MA2.3 归因〕→ grep 清零 → 复审 `approved` 0B/0M/0m）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 drawer 1 件〕、跨包克隆家族批；codebase-map 'use no memo' 登记表补全延续〔MA3.6 M2 立案〕）

## Closure

Status Note: MA3.17 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮；按 draft review m1 已对齐 matrix 登记模式改名 platform-ui-quality）、arm2-index 登记（MA3.17 行唯一无重复，P1=0）、daily log MA3.17 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（0B/1M——R-A M2 勘正在报告主体 5 处复发未净〔MA2.3 归因〕）→ grep 清零 → 复审 `approved`（0B/0M/0m——10 项审核全 PASS + M2 复审五点锚点核对）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 四包 3 件〔locales 2 exempt + drawer 1 未登记〕/结构相似克隆 26 处触及）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 10 项对账〔9 PASS + R-A 报告主体 5 处 MA2.3 残留〕→ grep 清零 → 复审 grep 恰 1 处合法 + 五点锚点核对 → `approved`）
- Evidence: 复审结论"发现清零 0B/0M/0m；规模/扫描器/台账/duplicates/1843 keys/typecheck 唯一红等全量计数零截断、可复算"

Follow-up:

- no remaining plan-owned work
