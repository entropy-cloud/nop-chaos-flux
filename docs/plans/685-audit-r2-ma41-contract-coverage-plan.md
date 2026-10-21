# 685 审计修复 R2·MA4.1：测试有效性审计—core+runtime 簇（C1+C2 七包）契约覆盖

> Plan Status: completed
> Last Reviewed: 2026-10-21
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA4.1；`missions/audit-remediation-r2.json`；方法论 `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` 为权威（四问 + 十种假覆盖模式 + 八类缺口分类 + 多轮子代理）+ `exploratory-contract-testing-prompt.md`（探针面，仅登记候选）+ 工具输出消费（`check:audit-test-global-leaks` / `check:jsdom-pragma-whitelist` / `check:audit-todo-exitless` / `audit:mutants` M0 数据）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA4 节（报告名模式 `*arm2-MA4.1-core-runtime-tests.md`）、`docs/audits/arm2-index.md`、MA2.1（core+runtime 运行时正确性已审——运行时缺陷面不预载）、MA3.1–3.4（四份代码质量报告已审——质量面不预载）、M0 基线（audit:mutants 1.63% 登记）；owner docs `docs/architecture/flux-core.md`、`flux-runtime-module-boundaries.md`、`form-validation.md`、`action-scope-and-imports.md`、`renderer-runtime.md`
> 接管注记（2026-10-21）：本 plan 由前会话起草（`draft`，未经 draft review）后中断；接管会话重写本 plan——前稿范围误写为 2 包（flux-core + flux-runtime），roadmap 簇表 C1+C2 实为 **7 包**；前稿配套报告草稿 `docs/audits/2026-10-20-2030-arm2-MA4.1-core-runtime-contract-coverage.md`（未提交）的"收口补记"门禁数字与 MA3.18 逐字相同且 daily log 无对应条目，判为未实测模板残留，**作废**（Phase 3 落新报告时删除该文件，不沿用其任何结论）。

## Purpose

对 C1 core 簇（flux-core / flux-formula / flux-compiler / flux-action-core）+ C2 runtime 簇（flux-runtime / flux-react / flux-bundle）七包执行**测试有效性审计**（matrix MA4.1）：专审**现有单元测试对稳定契约的守护效力**（测的是契约还是实现细节；哪些高价值契约无守护；哪些测试绕过真实入口/断言过弱/过度 mock/跨层断层/缺负面场景/缺历史 bug family 回归）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-21 live 实测，HEAD `e1ed6115f`）

- **工作树**：存在并发 mobile 线未提交文件（`docs/components/mobile-roadmap.md`、`docs/index.md`、`docs/logs/2026/10-19.md` 修改 + `docs/analysis/2026-10-19-mobile-*`、`docs/backlog/platform-hardening-roadmap.md`、`docs/components/mobile-native-components-roadmap.md` 未跟踪）——本项产物与提交**一律不含之**；无其他 agent 在本 worktree 活跃（live `lsof` 核对）。
- **规模（口径：src 列 = `packages/<p>/src` 下 `*.ts`/`*.tsx` 排除 `__tests__/`、`test-support/`、`*test*`；test 列 = colocated `*.test.ts`/`*.test.tsx`，与 arm2-index 规模快照同口径）**：

  | 包               | src 文件 | test 文件 | src 行 | `src/index.ts` export 行 |
  | ---------------- | -------- | --------- | ------ | ------------------------ |
  | flux-core        | 75       | 51        | 9,653  | 51                       |
  | flux-formula     | 20       | 14        | 3,479  | 10                       |
  | flux-compiler    | 35       | 43        | 7,281  | 9                        |
  | flux-action-core | 11       | 20        | 2,044  | 3                        |
  | flux-runtime     | 89       | 153       | 18,396 | 19                       |
  | flux-react       | 65       | 76        | 9,022  | 45                       |
  | flux-bundle      | 3        | 3         | 152    | 8                        |
  | **合计**         | **298**  | **360**   | 50,027 | 145                      |

  与 roadmap 簇表 C1 141/128、C2 157/232 逐包一致。

- **工具口径基线（本日实测）**：`check:audit-test-global-leaks` **108** = M0（2 rule buckets：test-module-top-let / test-global-patch；七包内命中仅 **5** 处——flux-react `schema-renderer-runtime-scope.test.tsx` ×2、`event-prevention.test.tsx` ×2、flux-runtime `runtime-sources-lifecycle.test.ts` ×1）；`check:jsdom-pragma-whitelist` no new entries；`check:audit-todo-exitless` **1** = M0（scheduling undo-stack 注册件，七包 0）。
- **mutation 基线（M0 登记，不重跑）**：`audit:mutants` = `stryker.runtime.conf.mjs`，`mutate: packages/flux-runtime/src/validation/*.ts`，`testFiles: packages/flux-runtime/src/validation/*.test.ts`，vitest include 同——490 mutants / 470 tested / 380 survived / **score 1.63%**。**live 线索（待本项取证定性）**：validation 目录同目录测试仅 4 件（registry / validators / validators-edge-cases / validation-lifecycle-contracts），而 `packages/flux-runtime/src/__tests__/` 下 **15 件**文件直接 import validation 模块（grep 口径：14 件 `.test.ts` + 1 件 `validation-rule-semantics-and-lifecycle-test-support.ts` 测试支持模块）却不在 stryker testFiles 范围——1.63% 可能主要反映**测量口径**而非守护效力；此点前稿定性"真实守护薄弱"未经该核对，本项必须独立裁决。
- **历史材料（仅作检测启发，不预载结论）**：r1 `docs/analysis/2026-07-27-ma4-core-runtime-test-coverage/`（phase-01 契约清单 + round-01 公共 API 映射 / round-02 bug family / round-03 跨层）——按 roadmap 全新视角原则第 2 条用途 ③ 处理：命中处必须本轮重新取证；`docs/bugs/` 中路径点名七包的 bug note **40 份**（grep `packages/(flux-core|…|flux-bundle)/`），作为 bug-family 回归缺口对照源。
- **执行状态**：roadmap MA4.1 `todo`；arm2-index MA4.1 行 `—`；MA3.18 已于 `e1ed6115f` 完成回写勘误（roadmap `done`）。

## Goals

- 产出 `docs/audits/2026-10-21-HHmm-arm2-MA4.1-core-runtime-tests.md`（文件名对齐 matrix 登记模式）：双风格（multi + open），每条发现含 **严重度 / 类别（八类之一）/ 契约 / 位置（实现+测试路径）/ 现状 / coverage 为何误导 / 最小补强建议**（skill 输出格式），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA4.1-<nnn>`），发现归族（local / family / systemic）。
- 覆盖面（四口径，逐包）：① **契约 → 测试映射**（七包 `src/index.ts` 公共导出面 + owner doc 明确承诺 → 直接守护 / 间接 / 无；真实入口 vs 绕过；断言强度）；② **历史 bug family 回归缺口**（40 份 bug note → 对应 defect family 是否有点名回归测试）；③ **跨层贯通**（compile → scope → render → action → update 是否存在贯通测试，或仅分段）；④ **测试卫生与 mutation 消费**（global-leaks 108 = M0 / jsdom pragma / mutation 1.63% 口径定性）。
- 每簇列出「高价值无守护契约」清单（matrix MA4 节要求）+ Coverage Assessment（更像 helper / branch / contract coverage）+ Recommended Next Tests（3–7 条，注明 unit / integration / e2e 层）。
- 产出即登记 `docs/audits/arm2-index.md`（MA4.1 行 + P1 行如有，精确行编辑后 grep 复核）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更：命中只定级登记（修复归 MR2 批；探针转正/mutation 现场裁决归 MA4.5）。不预载 MA2.1 / MA3.1–3.4 finding。
- 不重跑 `audit:mutants`（M0 数据消费 + 口径定性即可；若需补测归 MA4.5）。
- 不执行 MA4.2 及以后工作项；不审 e2e 有效性（MA4.5）；不审测试文件组织/体量（MA4.4 议题仅记录）。
- 不新建 `docs/analysis/` 轮次目录：roadmap Cross-Cutting 2「两段并入同一份 arm2 报告」优先于 skill 的 docs/analysis 落盘建议；子代理轮次中间件落 `_tmp/arm2-ma41/`（任务收口后清理）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA4.1 报告 + `docs/audits/arm2-index.md` 登记回填；删除作废前稿报告文件（未跟踪）。
- 只读取证：七包公共导出面 / owner docs / 现有测试 / bug notes / 三个卫生工具输出 / stryker 配置。
- `docs/logs/2026/10-21.md` 追加 MA4.1 条目；roadmap MA4.1 行状态流转；本 plan 状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA4.2+ / MR / MV / MG；并发 mobile 线未提交变更（一律排除、不触碰）。

## Failure Paths

| 可测场景编号   | 触发                                                                                     | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 六类之一（本维度典型：某契约测试实为必过空断言导致 live 崩溃路径零守护） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:audit-test-global-leaks` ≠108 / `check:audit-todo-exitless` ≠1 / jsdom 新增       | 停止收口，归因（本项零代码变更，应为并发线引入），报告记录                    | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：契约清单 + 多轮子代理映射（四口径）

Status: completed
Targets: `_tmp/arm2-ma41/round-*.md`（中间件）

- Item Types: `Proof | Decision`

- [x] **契约清单**（执行者）：逐包从 `src/index.ts` 导出面 + owner doc 明确承诺提炼稳定契约清单（不先数测试）
- [x] **Round A（子代理）**：flux-core + flux-formula 契约 → 测试映射（直接/间接/无；真实入口 vs 绕过；断言强度；mock 厚度）
- [x] **Round B（子代理）**：flux-compiler + flux-action-core 同口径
- [x] **Round C（子代理）**：flux-runtime 同口径（form-validation.md / flux-runtime-module-boundaries.md / action-scope-and-imports.md 承诺为契约源）
- [x] **Round D（子代理）**：flux-react + flux-bundle 同口径（renderer-runtime.md hooks 契约 + bundle 注册面）
- [x] **Round E（子代理）**：40 份点名七包的 bug note → defect family → 是否有点名回归测试（历史回归缺口）（实核 39 份——00-guide 为模板误报）
- [x] **Round F（子代理）**：跨层贯通——compile → scope → render → action → update 贯通测试盘点 vs 分段测试
- [x] **工具消费**（执行者）：global-leaks 108（七包 5 处逐条定性）/ jsdom pragma / todo-exitless / mutation 1.63% 测量口径裁决（stryker testFiles vs `__tests__/` 15 件）——裁决 = include 并集失效、测量无效（P1-MA4.1-009）
- [x] 每轮结论交叉去重后按八类缺口分类 + P 级判定 + 归族

Exit Criteria:

- [x] 七包契约 → 测试映射清单落字（有守护 / 弱守护 / 无守护三列，每条有实现+测试路径）
- [x] 六轮子代理产物在 `_tmp/arm2-ma41/`，每轮回答「本轮新发现了什么」
- [x] 四项工具输出消费行落字（含 mutation 口径裁决结论）

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] 以 Phase 1 暴露的高价值线索为起点 ≥2 轮追问（如：某类假覆盖模式是否有更多实例 / 更大影响范围 / 不同根因），每轮有证据
- [x] 深化机会（systemic 候选）与 MA4.4 / MA4.5 / MG 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据与「与上一轮相比新增了什么」；最后一轮显式写明「本轮未发现新的高价值问题」方可停止
- [x] 全部发现完成归族 + P 级判定；P2/P3 入 deferred 区附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-21-HHmm-arm2-MA4.1-core-runtime-tests.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-21.md`

- Item Types: `Proof | Decision`

- [x] 报告按 skill 输出格式 + arm2 报告惯例（头部 / 审核范围 / 深挖统计 / P0 / P1 / P2-P3 deferred / 误报排除 / 深化机会 / open 轮次 / 高频文件 / 已自动化 / 建议新增自动化 / 判别证据索引 / 收口补记）落盘；删除作废前稿 `2026-10-20-2030-*.md`
- [x] arm2-index：MA4.1 行回填 + P1 行（如有）精确行编辑 + Last Updated 行滚动，编辑后 grep 复核
- [x] daily log 10-21 追加 MA4.1 条目（计数 = 报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制 Proof 交付物，Rule 18 耦合偏差显式豁免注；**本次实跑即 Closure Gates「BUILD_VERIFY」行与「`pnpm test`」行共用的同一次运行，不重复跑**）并登记；同步复跑三卫生扫描器核对 = 基线
- [x] 清理 `_tmp/arm2-ma41/`（closure audit 通过、提交前执行——保留轮次文件供审计员抽查）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（实数记录入报告收口补记 + log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA4.1 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA4.1 `planned`→`done`，本 plan→`completed`
- [x] 提交前 `grep -n "^- \[ \]\|^Status: in progress\|^Status: planned"` 本 plan 零残留 + grep roadmap MA4.1 行字面值 `done`（10-21 勘误教训）
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`；并发线文件不入 stage

> 并发事件记录（closure audit R1 B1 + R2 勘正，2026-10-21）：closure audit 进行期间 mobile 线会话在本 worktree 执行 merge `bce166dbc`，将本项三份回写文件扫入 pre-merge stash，其后其 stash pop 冲突遗留 `docs/components/mobile-roadmap.md`/`docs/index.md` UU 半成品（HEAD 无污染）。merge **涉七包中 C2 侧 3 文件**（flux-react/flux-runtime，加法性：use-input-component-handle.ts / input-component-handle.ts / 其新增 test——初判"不涉七包"系 `git show --stat` 长路径截断 grep 假阴性，R2 勘正）；R2 独立复验确认 3 文件不在报告引用锚点内、九条 P1 grep 证据在 HEAD 全部仍成立。处置：自 pre-merge stash 外科恢复三份回写文件（恢复后该 stash 已被 mobile 线 pop/drop，恢复态落在 worktree+index 不受影响）；对方 UU 两文件与其 stash **不触碰**（归 mobile 线收口）；收口提交走显式路径；门禁以 merge 后复跑为准（test 82/82〔4 任务真实重跑〕/ lint 44/44 / typecheck+build 44/44 全绿——mobile 线顺带修复 playground vite.config 既有登记红；三扫描器 = 基线，见报告收口补记·并发事件节）。audit R1 其余发现 M1（P2 定级理由 7 处）/m1（P1 八类标签）/m2（utils 路径）已全部回修。

Exit Criteria:

- [x] roadmap MA4.1 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线 UU 两文件与 stash 不触碰、不入 stage）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_7cb7d69a`（五项检查 + 全量复算：七包规模表逐格、global-leaks 108/七包 5 处逐行号、todo-exitless 1、jsdom no new、stryker 三处配置口径、validation 同目录 4 件/`__tests__` 15 件构成、bug note 40、HEAD/roadmap/arm2-index 三方状态、前稿作废三判据、全部引用路径、skill 四问/八类/多轮映射、模板节完整性、Non-Goals Decision 合理性）
- Verdict: `pass-with-minors`（0B/0M/3m）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。m1 规模表口径注记拆写 src/test 两列口径；m2 `__tests__` 15 件构成注明 14 test + 1 test-support；m3 Phase 3 BUILD_VERIFY 与 Closure Gates `pnpm test` 行注明共用同一次运行——三条均已落字

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、每条发现七要素齐全、收口补记门禁节实数）
- [x] arm2-index 登记（MA4.1 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:audit-test-global-leaks`=108 / `check:jsdom-pragma-whitelist` no new / `check:audit-todo-exitless`=1 / mutation 1.63% 口径裁决落字
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] 作废前稿报告文件已删除，`docs/audits/` 下 MA4.1 报告唯一
- [x] roadmap Work Item Status MA4.1 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（`agent_66e787a0` 三轮：R1 `issues` 1B/1M/2m〔B1 并发 merge 扫 stash/M1 P2 定级理由 7 处/m1 P1 八类标签/m2 utils 路径〕→ 处置 + R2 残留验证 `issues` 0B/1M/0m〔M1'="不涉七包"系 `git show --stat` 截断假阴性〕→ 三文档按 3 文件准确口径改写 + 定向 grep 复核 → **R3 终审 `approved` 0B/0M/0m**，审计员明示"可按 plan Phase 4 执行收口提交"）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: MA4.1 全部 Phase 交付完成——七包（C1+C2，298 src/360 test/50,027 src 行）测试有效性审计双风格落盘（multi 六轮子代理 A–F + open 三轮），P0=0/**P1=9**（001 defineRendererFamily 零守护、002 getFormulaNamespaces 播种链、003 xui:actions dispatcher 解析步、004 built-in 遮蔽优先序、005 structuralWhen 交接〔bug 51〕、006 lastChange 新鲜度〔bug 30〕、007 imports overlay 写捕获〔bug 163〕、008 必 notify 分支〔bug 69〕、009 stryker 测量口径失效）/P2=10/P3 若干；arm2-index 登记 MA4.1 行 + 9 条 P1；daily log 收口；**P1-MA2.1-001 同型新证：M0 的 mutation 1.63% 系测量口径失效**（mergeConfig include 并集不生效），重测归 MA4.5。接管注记兑现：前稿 2 包范围勘正为 7 包、模板残留门禁数字作废删除零沿用。closure audit 三轮至 `approved`（0B/0M/0m）。并发事件（mobile 线 merge `bce166dbc` 扫 stash → 外科恢复 + 门禁 merge 后复跑全绿：test 82/82〔4 任务真实重跑〕/ lint 44/44 / **typecheck+build 44/44**〔mobile 线顺带修复 playground vite.config 既有登记红〕/ 三扫描器 = 基线）已在报告收口补记·并发事件节与 Phase 4 注记录。零代码变更纪律经审计员 HEAD 独立复验。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_66e787a0`（三轮：R1 `issues` 1B/1M/2m → 处置 → R2 残留验证 `issues` 0B/1M/0m → M1' 修复 + 定向 grep 复核 → R3 终审 **`approved` 0B/0M/0m**）
- Evidence: R1 五点处置核验（B1 外科恢复 PASS〔`git diff -w` 证实超出部分纯表格 padding〕/ B1.3 门禁复跑 PASS〔审计员独立实跑三扫描器 = 基线〕/ M1、m1、m2 PASS）；R2 唯一残留 M1' 假阴性勘正（3 文件准确口径 + 截断根因）；R3 复核 grep "不涉 C1/C2 七包"=0/0/0、`input-component-handle` 报告 2/plan 1/log 1、"stash 仍在"=0 → approved；审计员独立复验九条 P1 grep 证据在 merge 后 HEAD 全部仍成立。

Follow-up:

- no remaining plan-owned work（MR2.0 展开器消费 9 条 P1；MA4.5 消费 P1-009 mutation 重测与探针转正；MG 候选见报告"建议新增的自动化检查"4 条）
