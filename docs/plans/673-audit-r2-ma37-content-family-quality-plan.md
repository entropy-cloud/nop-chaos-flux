# 673 审计修复 R2·MA3.7：代码质量审计—content + layout + dashboard + pivot + mobile

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.7；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.4（C4 结构面已审）、MA2.3（C4 运行时正确性已审——IO 边界 P1-MA2.3-001 与剪贴板 family 不预载）、MA3.1 P3-003（WARN 登记机制 family——**codebase-map 'use no memo' 登记滞后已由 MA3.6 M2 勘正并立案 MG**）、owner doc `docs/architecture/renderer-runtime.md`

## Purpose

对 C4 五包（content 40 src/45 test/5,872 行/28 tsx + layout 21/23/4,289/11 + dashboard 15/12/2,512/5 + pivot 8/4/1,287/1 + mobile 9/16/2,077/5）执行代码质量审计（matrix MA3.7，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `eea525fa2`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：见 Purpose（五包合计 93 src / 100 test / 16,037 行 / 50 tsx；src 口径排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本域 **content 3 文件**（mapping.tsx:50 / diff-view/diff-view-renderer.tsx :70/:191/:455 三处（:455 CrossFileDiffView） / diff-view/components/diff-file-list.tsx）——**codebase-map 登记表未含 content 行**（MA3.6 M2 已勘正登记滞后——表仅 3 行 vs 全仓 10 处/8 文件；补全随 MG 并案）。
- **口径③ 基线**：oversized WARN 触及五包 **11 件**（实现 4：layout/wizard-renderer 678 / content/content-renderer-definitions 632 / layout/layout-renderer-definitions 606 / content/diff-view-renderer 553；测试 7）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及五包 **52 处**（触及口径；归族现场判定）。
- **口径④ 基线**：TODO/FIXME/HACK 五包 **0**；`as any` **0**；WA 台账 **18 条**（content 9 / layout 4 / dashboard 3 / mobile 1 / pivot 1；16 verified + 2 found）——found 件为台账既有登记。
- **口径① 抽样初判**：wizard-renderer.tsx（678——MA2.3 已抽样其 P1-03 committing 锁/guards 质量）、content-renderer-definitions.ts（defineRendererFamily 族装配）、diff-view-renderer.tsx（'use no memo' 登记件）。
- **churn（近 1 个月窗口实测，git log --name-only 文件触及口径、窗口敏感 ±1）**：content ≈100 / layout ≈88 / dashboard ≈65 / pivot ≈19 / mobile ≈23——WA-7 批（plan 567）/IS-8b（plan 553）收口热点（携 plan 号）。
- **执行状态**：roadmap MA3.7 当前 `todo`；无已登记 `arm2-MA3.7-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.7-content-family-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.7-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：wizard-renderer / content-renderer-definitions / diff-view-renderer / dashboard editor 族 / pivot-renderer / mobile swipe-cell 或 pull-refresh——意图表达、复杂度组织、错误传播）；② **React 19**（'use no memo' content 3 文件与登记滞后现状定性 + check:react19 0 + 密度抽样）；③ **重构候选**（oversized 11 件逐簇裁定 + duplicates 52 处归族）；④ **workaround 嗅探**（TODO 0 + WA 18 条核对〔found 2 件定性〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.7 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.4/MA2.3 finding（P1-MA2.3-001 camera IO 与 P2 剪贴板 family 归 MR/MA2.3 已立案）；测试组织归 MA4.3；交互行为归 MA5.5。
- 不执行 MA3.8 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.7 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 11 件逐簇裁定、duplicates 52 处归族、React 19 两点、WA 台账 18 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.7 条目；roadmap MA3.7 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.8+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                           | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）         | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 五包 >0 / oversized 五包 unique 超 11 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：wizard-renderer.tsx、content-renderer-definitions.ts、diff-view-renderer.tsx、dashboard editor 族（editor-canvas 或 editor-inspector）、pivot-renderer.tsx、mobile swipe-cell.tsx 或 pull-refresh.tsx；每文件三问
- [x] **React 19 口径**：'use no memo' content 3 文件定性（指令数〔diff-view-renderer 3 处〕+ codebase-map 登记滞后现状——MA3.6 M2 已立案 MG）+ check:react19 0 + 密度抽样
- [x] **重构候选**：oversized 11 件逐件裁定（实现 4 件 wizard/definitions 族 + 测试 7 归 MA4.3 交叉）；duplicates 52 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA 18 条状态核对（found 2 件位点定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 11 件逐件裁定行
- [x] 四口径基线对照行（react19=0 / 'use no memo' content 3 文件定性 / as-any=0 / TODO=0 / duplicates 52 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 五包（WA-7/IS-8b 亲核）、MA2.3 交叉点（IO 边界结论不预载）、diff-view 'use no memo' 群
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：wizard 步骤族、dashboard editor 三件、mobile 手势族
- [x] 深化机会与 MA4.3/MA5.5 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.7-content-family-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.7 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.7 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.7 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.7 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.7 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数复核 + 报告侧抽样 3 条）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修（审查员预授权免复审——"修正后可按 MA3.3 先例由本审查预授权免复审直接 pass"）
- Rounds: 1
- Findings addressed: M1 'use no memo' diff-view-renderer 处数 2→**3 处**（:70/:191/:455 CrossFileDiffView——与全仓 10 处算术一致）；M2 报告头状态超前→draft；m1 churn 计量口径注（--name-only 文件触及）；m2 as-any 口径注（注册扫描器非测试源）；m3 附录 A 属主文件名（deep-audit-prompts.md）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.7 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 五包=0 / oversized 五包 unique=11 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.7 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m 文字级——9/9 对账全 PASS + 四门禁独立复跑；m1 :455 枚举残缺随收口补）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +11 件〕、codebase-map 'use no memo' 登记表补全〔MA3.6 M2 并案，本域 content 3 文件〕、跨包克隆家族批）

## Closure

Status Note: MA3.7 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.7 行唯一无重复，P1=0）、daily log MA3.7 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增——auditor 独立复跑）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/2m 文字级——9/9 对账全 PASS：oversized 11 件零重复/六文件位点逐字/WA 18 条逐包数清/duplicates 52/规模逐字节/门禁独立复跑）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本域 11 件/'use no memo' content 3 文件登记滞后定性 + 52 处家族批）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：11 件 unique 零重复/六文件位点/WA 18 条逐行/52 处/五包规模逐字节吻合/门禁独立复跑 82-82-43-44/churn 抽查 ≈ 值精确/P3 双抽样定性）
- Evidence: 终局 `approved`（0B/0M/2m 不阻塞——m1 :455 枚举残缺随收口 hunk 补〔已落〕）

Follow-up:

- no remaining plan-owned work
