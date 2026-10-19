# 669 审计修复 R2·MA3.3：代码质量审计—flux-runtime

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.3；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.2（C2 结构面已审）、MA2.1（C2 运行时正确性已审——本项质量面独立取证）、MA3.1 P3-003（WARN 未登记机制——family 信号）、MA3.2 P3-003（跨包克隆家族批——归族信号）、owner doc `docs/architecture/renderer-runtime.md` + `flux-runtime-module-boundaries.md`

## Purpose

对 flux-runtime（89 src/153 test，18,425 行，零 tsx）执行代码质量审计（matrix MA3.3，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `84a5d8900`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：89 src（排除 `*test*`/`*fixtures*`）/ 153 test（`*.test.ts`）/ 18,425 行（含 fixtures 的 90 件口径——m1 口径注）；**零 .tsx**（headless runtime——React 层在 flux-react，MA3.4 域）——口径② React 19 n/a（'use no memo' 包内 0；`check:react19` 全仓 0）。
- **口径③ 基线**：oversized WARN 触及本包 **unique 33 件**（实现 13〔12 WARN + owner 735 exempt〕+ 测试 20；脚本原始输出 34 行——owner 双行）（`check:oversized-code-files` 实测；`form-runtime-owner.ts` 735 为 [exempt] **已注册豁免**〔ERROR 级〕、`form-runtime-submit-flow.ts` 506 已按 FM-3 F5 **登记为已知 WARN**（10-18 log）——其余实现件 **11 件**（form-store 692/runtime-factory 671/action-adapter 669/form-runtime 650/form-runtime-validation 634/scope 630/reaction-runtime 604/request-runtime 596/import-stack 582/source-registry 551/api-data-source-controller-runtime 525）**未登记**——MA3.1 P3-003 机制缺口的最大存量簇）。
- **口径④ 基线**：TODO/FIXME/HACK 包内 **0**；`as any` 包内 **0**（`check:audit-as-any-casts`）；WA 台账 WA-runtime-001..005 均 **verified**、WA-runtime-006（组件句柄脚手架 ×4 数组字面量双写）**found**（台账既有登记件，非新发现）。
- **duplicates 初判**：触及本包 IN 29 + CROSS 6（async-data 控制器族克隆聚集 ~8 处；CROSS 含 import-stack↔action-execution、action-scope↔action-parsing——已在 MA3.2 P3-003 家族批清单内；新增 form-store-owned↔condition-builder/utils 12L；vitest.config ×2 良性）。
- **口径① 抽样初判**：form-store.ts（zustand vanilla + typed FormStoreApi 契约）、runtime-factory.ts（全契约 orchestrator 导入）、action-adapter.ts（结构化校验 + reportRuntimeHostIssue）、scope.ts（ScopeChange 规范化归一）。
- **churn（近 1 个月窗口实测）**：114 触摸——FM-6/FM-3/FM-2 系列 plan 收口热点（抽检携 plan 号）。
- **执行状态**：roadmap MA3.3 当前 `todo`；无已登记 `arm2-MA3.3-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.3-flux-runtime-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.3-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：form-store / scope / runtime-factory / action-adapter / form-runtime-validation / async-data 三件套〔request-runtime/reaction-runtime/source-registry〕——意图表达、复杂度组织、错误传播）；② **React 19**（n/a 论证）；③ **重构候选**（oversized unique 33 件〔实现 13 + 测试 20〕逐簇裁定——owner/submit-flow 已登记例外核验 + 拆分 ROI；duplicates 35 克隆归族〔async-data 族聚集判定〕）；④ **workaround 嗅探**（TODO 0 + WA 台账 6 条状态核对 + WA-runtime-006 found 件现场定性 + 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.3 行 + P1 行如有，**精确行编辑**）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.2/MA2.1 finding；测试覆盖质量归 MA4.1（17 个 500+ 测试件的组织问题归 MA4.1 深审）；性能归 MA7.1。
- 不执行 MA3.4 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.3 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized unique 33 件逐簇裁定、duplicates 35 克隆归族、WA 台账核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.3 条目；roadmap MA3.3 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.4+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：form store 数据损坏、scope 隔离破坏、request 竞态致数据损坏；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 本包 >0 / oversized 本包 unique 口径超 33 件 / TODO >0                                                                  | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：form-store.ts（store 核心三问）、scope.ts（ScopeChange 规范化）、runtime-factory.ts（orchestrator 装配）、action-adapter.ts（结构化校验）、form-runtime-validation.ts（校验 owner 生命周期）、async-data/request-runtime.ts + reaction-runtime.ts + source-registry.ts（数据源三件套）
- [x] **React 19 口径**：零 tsx 论证 + `check:react19` 0——n/a 落字
- [x] **重构候选**：oversized unique 33 件逐簇裁定（owner exempt + submit-flow 已登记两例外核验；实现 11 件未登记簇按域归族〔form-runtime 族/scope 族/async-data 族/action 族〕与拆分 ROI；测试 17 件归 MA4.1 交叉）；duplicates 35 克隆归族（async-data 族聚集、新增跨包 form-store-owned↔condition-builder、vitest.config 良性）
- [x] **workaround 嗅探**：TODO 0 复核 + WA 台账 6 条状态核对（WA-runtime-006 found 件现场定性——脚手架双写在案裁定还是漏处置）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized unique 33 件逐簇裁定行（含两登记例外核验）
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 35 克隆归族落字 / WA-006 定性落字 / oversized unique 33 件逐簇裁定落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 114 触摸（FM 系列亲核）、MA3.1 P3-003 family 最大存量簇、MA2.1 交叉点（运行时正确性结论不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：async-data 控制器族同构演化的漂移风险、form-runtime 五件套 graft/clear 对（WA-runtime-003 verified 后残余）、scope 归一化的边界
- [x] 深化机会与 MA4.1/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.3-flux-runtime-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.3 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.3 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.3 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.3 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.3 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 扫描器/jscpd/台账实测复核 + 报告侧抽样 4 条）
- Verdict: R1 `revised`（0B/2M/1m）→ 回修（审查员预授权免复审："修正落盘后本审查无保留意见"）
- Rounds: 1
- Findings addressed: M1 oversized 基数 34→**unique 33 件**（实现 13〔12 WARN + owner exempt〕+ 测试 20；脚本 34 行 owner 双行；未登记实现件 15→**11**——Baseline/Goals/Phase1/FailurePaths/ClosureGates 六处联动）；M2 报告头 Plan 状态行超前 + 报告继承错误计数——同步回修 + 执行先于 review 门的事实在本 record 留痕；m1 规模口径注（89 排除 fixtures / 18,425 含 fixtures 90 件口径）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.3 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 本包=0 / oversized 本包=unique 33 件存量口径（owner exempt + submit-flow 登记例外不变）/ TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.3 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m〔m1 churn 114→115 口径勘正顺手落/m2 前瞻句留痕〕——9/9 对账全 PASS）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本包 +11 件最大簇〕、async-data 控制器族骨架裁定〔P3-002〕、跨包克隆家族批累计 8 处）

## Closure

Status Note: MA3.3 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.3 行唯一无重复，P1=0）、daily log MA3.3 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/2m 免回修——9/9 对账全 PASS：oversized unique 33 件 owner 双行核验/六文件位点逐字/台账 6 条/35 克隆归族/零代码变更；m1 churn 114→115 随收口落盘）。P0=0/P1=0/P2=0、P3=2（oversized WARN 未登记最大存量簇 11 件并入 MA3.1 P3-003/async-data 控制器族同构克隆聚集 + 跨包家族批累计 8 处）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：owner 双行 unique 计数核验/六文件位点逐字亲核/台账与 006 位点 live 在案/35 克隆与跨包 6 条逐一核对/零代码变更/门禁状态滞后正确）
- Evidence: 终局 `approved`（0B/0M/2m 免回修——"放行 Phase 4 剩余门"）；m1 churn 口径勘正随收口 commit 落盘

Follow-up:

- no remaining plan-owned work
