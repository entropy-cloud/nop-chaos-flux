# 654 审计修复 R2·MA1.1：core 簇结构契约审计（依赖 / 边界 / 导出面 / schema 契约）

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.1；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（§A 架构与模块边界 + 通用审计口径 + 附录 A 输出格式）+ `docs/skills/architecture-deepening-review-prompt.md`（深化机会方法集）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、M0 plan 653（已收口）、owner doc `docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

对 C1 core 簇（flux-core / flux-formula / flux-compiler / flux-action-core）执行结构与契约层审计：依赖方向与跨包引用、模块边界合规、公共导出面稳定性、schema 契约完整性，产出 arm2 审计报告并登记 arm2-index。MA1.1 是 R2 队列中 M0 之后的第一个审计工作项；本 plan 只审计取证，零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `35577ecb3`，干净树）

- **簇构成与规模**（roadmap 包簇表口径）：flux-core 75 src/51 test、flux-formula 20/14、flux-compiler 35/43、flux-action-core 11/20，合计 141/128。
- **依赖方向**：`package.json` 实测——flux-core 零依赖；flux-formula→core；flux-compiler→core+formula；flux-action-core→core。合法分层：core 为底，formula 与 action-core 并列于 core 之上，compiler 位于 core+formula 之上（**compiler 不依赖 action-core**），**无反向依赖**。
- **跨包引用形态**：全仓 `grep from '@nop-chaos/flux-{core,formula,compiler,action-core}/`（deep import 形态）实测 **0 条**——跨包引用全部走包根 bare specifier（`@nop-chaos/flux-core` 等），符合 Package Entry Boundaries。
- **`audit:deps` 现状（2026-10-19 实测）**：exit 57，57 条全部为 `no-circular`；其中 **C1 命中 8 条，全部位于 flux-core 包内**（`schema-diagnostics/index.ts` ×4、`types/renderer-definition-types.ts` ×2、`types/schema-validation-types.ts` ×1、`schema-diagnostics/value-shape-runtime.ts` ×1）。其余 49 条分布在 scheduling/industrial/form/data/playground 等非本工作项范围。C1 跨包环（如 core↔formula↔compiler 之间）**未见命中**。
- **导出面快照**：`packages/*/src/index.ts` 行数 = core 148（51 条 export 语句）/ formula 10（10）/ compiler 40（9）/ action-core 37（3）。近 30 天 churn 热点第一即 `flux-core/src/index.ts`（11 次变更），其次 `types/renderer-api.ts`（6）、`types/renderer-definition-types.ts`（5）。
- **相关扫描器 M0 基线**（`docs/audits/arm2-index.md` 工具基线区，MA1.1 只核对不高于）：`check:renderer-definition-fields-only` PASS（禁 legacy `RendererDefinition.regions` / `renderer.regions` 引用与 `regions: [` 字面——该规则的**被保护契约正由 flux-core 拥有**，属本簇审计对象）；`check:schema-prop-coverage` PASS；`check:audit-missing-renderer-markers` 0（C1 无 renderer 包，适用性仅剩 core 侧定义字段契约）；`check:workspace-manifest-deps` 绿（`pnpm check` 链内）。
- **owner doc 规则锚点**：`flux-runtime-module-boundaries.md`——Main Rule（assembly vs logic）、Architecture Guardrails（bug-derived 强制边界）、Package Entry Boundaries（包根入口纪律）、`flux-compiler` Versus `validation/`、Action execution boundary（`flux-action-core` 职责）。
- **检测启发（已知失败模式 #3）**：`packages/*/src/index.ts` 为受保护区域，变更须 plan + owner doc——本项以"导出面稳定性"口径复核（本 plan 不改任何 index.ts）。
- **执行状态**：roadmap MA1.1 当前 `todo`（依赖 M0 已 `done`）；`docs/audits/` 下无任何 `arm2-MA1.1-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.1-core-structure.md`：双风格执行（multi 维度清单 + open live 信号追问），含 P0/P1/P2/P3 分级 finding（P1 落 arm2-index，P2/P3 留报告 deferred 区）。
- 覆盖面（roadmap MA1 每项口径 + 矩阵 MA1.1 取证要点）：① 依赖图与跨包引用；② 模块边界合规；③ renderer 定义字段契约与注册完整性（core 侧——`renderer-definition-types.ts` / `renderer-prop-contracts.ts` 是定义字段契约的**发源地**）；④ 公共导出面稳定性；⑤ 样式契约 marker（C1 无 renderer 包，核对扫描器 PASS 并在报告中显式记 n/a 理由）；⑥ 架构深化机会（systemic finding 记录，落地不在本轮）。
- 产出即登记 `docs/audits/arm2-index.md`：工作项→报告登记表 MA1.1 行回填报告路径；P1 finding（如有）入 P1 索引区（ID `P1-MA1.1-<nnn>`，落索引后不可变）。
- BUILD_VERIFY：全量 `pnpm test` 确认审计期间基线未漂移（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更（roadmap Cross-Cutting 9）：审计项除 P0 即时修复外不改 `packages/`/`apps/`/`scripts/`/`tests/` 任何文件；扫描器/`audit:deps` 命中的既有违规是**本轮对照基线**，修复属 MR 批量（本 plan 只定级登记，不修）。
- 不排 MR/R\*.n 修复行（MR1.0 展开器的职责）；不改写 r1/FM 历史文档；不预载历史审计结论作为"已覆盖"证据（全新视角原则）。
- 深化重构（architecture-deepening）只记 systemic finding，落地前人工确认。
- 不执行 MA1.2 及以后任何工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.1 报告 + `docs/audits/arm2-index.md` 登记回填。
- 运行与复核（只读）：`audit:deps`、`check:renderer-definition-fields-only`、`check:schema-prop-coverage`、`check:audit-missing-renderer-markers`、`check:workspace-manifest-deps`（经 `pnpm check` 单项）、依赖图人工审读（4 包 import 图）、4 包 `src/index.ts` 导出面逐包核对、owner doc 规则逐条对照 live code。
- `docs/logs/2026/10-19.md` 追加 MA1.1 条目；roadmap MA1.1 行状态流转（draft review 通过→`planned`；closure audit 通过→`done`）。
- 收口提交：`fix(audit-r2):` 格式（hunk 级 staging，共享 log 只取本 plan hunk）。

### Out Of Scope

- 任何代码 / 测试 / 配置变更（P0 即时通道除外；见 Failure Paths）。
- `audit:deps` 57 条 no-circular 与 knip 死导出的**修复**（定级登记入报告，修复归 MR1.0）。
- MA1.2–MA9、MR、MV、MG 工作项的执行或立项。
- 并发线未提交变更的处置（基线声明为干净树；若执行中出现非本 plan 变更，按 plan guide 通用守卫排除出提交范围）。

## Failure Paths

| 可测场景编号（可选） | 触发                                                                                                 | 行为（含状态码/错误码）                                                                                                   | 是否可重试       | 用户可见表现   |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------- |
| audit-p0-found       | 审计中发现 P0（公共导出面破坏性变更未通知 / schema 契约断裂导致核心渲染循环不可用 / 现存运行时崩溃） | 走 P0 即时通道：本 plan 内追加 Fix Phase 就地修复（判别测试先红后绿）或异步注入独立修复 plan，并登记 arm2-index P0 追踪区 | 否（发现即处理） | 无（修复先行） |
| scanner-drift        | 执行期间任一核对扫描器输出**高于** arm2-index M0 基线                                                | 视为基线漂移信号：查明是否本 plan 引入（应为零变更）；无法归因则停止收口并在报告记录                                      | 是（复跑归因）   | 无             |

预期：两路径均不触发（零代码变更计划）；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更、不新增测试代码；全量 `pnpm test`（BUILD_VERIFY）为本 plan 的 Proof 交付物，在 Closure Gates 执行并登记。若触发 P0 即时通道追加 Fix Phase，则该 Fix 自动升档 `必须自动化`（判别测试先红后绿，Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 边界 / 导出面 / schema 契约）

Status: completed
Targets: `docs/audits/` 报告草稿、`_tmp/`（取证输出临时区）

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑 `pnpm audit:deps`，逐条审读 C1 命中（M0 基线 8 条 no-circular，全在 flux-core 内）——每条判定 local/family/systemic 归族与 P 级（含"是否构成跨包环"结论）；复核 4 包 import 方向与 package.json 一致、无反向依赖
- [x] 模块边界：跨包 deep import 复扫（预期 0）+ `check:workspace-manifest-deps` + owner doc Main Rule / Action execution boundary / `flux-compiler` Versus `validation/` 三节逐条对照 live code（`runtime-factory.ts` 不在本簇，记 n/a；action-core 职责边界抽样 `action-dispatcher/` 对照）
- [x] 导出面稳定性：逐包核对 4 个 `index.ts` 导出清单 vs 包内实现——死导出（结合 `audit:knip` C1 侧 unused exports 证据）、未声明就公开的内部实现、导出面 churn（flux-core index 30 天 11 次）是否伴随 owner doc 更新（已知失败模式 #3 口径）；flux-react/unstable 类分层在 core 的对应物（如无则记 n/a）
- [x] schema 契约：`check:schema-prop-coverage` + `check:renderer-definition-fields-only` 复跑核对（M0 基线 PASS）；`renderer-definition-types.ts` / `renderer-prop-contracts.ts` 的定义字段集合 vs flux-guide / owner doc 声明抽样对照（定义字段漂移 = P1 候选）；`flux-core/src/schema-diagnostics/` 的 5 条 circular 命中对 schema 诊断契约的实质影响审读
- [x] 样式契约 marker（`check:audit-missing-renderer-markers`）：复跑核对 0；报告记 C1 无 renderer 包的 n/a 理由（矩阵 MA1 覆盖面完整性要求显式记，不留空）

Exit Criteria:

- [x] 五个取证维度各产生带证据（命令输出 / 文件路径 / 行为对照）的条目草稿入报告，零维度留空（n/a 必须写理由）
- [x] `audit:deps` C1 8 条命中逐条给出 归族 + P 级判定（P0 即时通道项当场触发 Failure Path）

### Phase 2 - open 开放式追问（live 信号驱动，清单外发现合法）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针设计：git log 30 天 C1 热点（index.ts / renderer-api.ts / renderer-definition-types.ts）、`audit:knip` C1 侧死代码证据、`docs/skills/README.md §已知失败模式` #3（index.ts 受保护区域）与 #7（async 失败路由）在 C1 的落地抽查、deep-audit-prompts §A 深挖追加指令逐条过一遍
- [x] 至少 2 轮开放式追问（"若把 core 当新项目审，哪里最可能藏着结构债？"口径）：候选方向包括 schema-diagnostics 循环依赖的可拆性、flux-core index 148 行大桶导出是否混入非契约符号、`commitCompositeState` 等值导出 vs `export *` 的边界一致性、renderer 定义字段契约发散风险——每问产出判别证据或明确"未命中"
- [x] 架构深化机会（`architecture-deepening-review-prompt.md`）：发现记 systemic finding（可落地候选清单，标注"落地前人工确认"），不排修复

Exit Criteria:

- [x] 报告含独立 open 段落，追问 ≥2 轮且每轮有 live 证据（命令/文件/历史）支撑，"未命中"显式记录
- [x] 每条发现完成归族（local / family / systemic）与 P 级判定（P2/P3 入 deferred 区）

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.1-core-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-19.md`

- Item Types: `Proof | Decision`

- [x] 报告按 deep-audit-prompts 附录 A 输出格式落盘：审计范围 / 多维发现（multi+open 合并）/ P0 清单 / P1 清单（ID `P1-MA1.1-<nnn>`）/ P2/P3 deferred 区 / 误报排除清单 / systemic 深化候选；文件名含报告产出时点时间戳
- [x] arm2-index 登记：登记表 MA1.1 行回填报告路径；P1（如有）入 P1 索引区（状态 `open`，修复行留空待 MR1.0）；P0（预期无）入 P0 追踪区
- [x] `docs/logs/2026/10-19.md` 追加 MA1.1 条目（报告路径 + 发现计数 + 门禁结果）
- [x] BUILD_VERIFY：全量 `pnpm test` 通过（Cross-Cutting 9：确认审计期间基线未漂移；零代码变更下预期全绿，与 M0 基线 82/82、14,051 一致）

Exit Criteria:

- [x] 报告存在且 arm2-index MA1.1 行 + P1 行（如适用）与报告逐条一致
- [x] `pnpm test` exit 0（结果与 M0 基线对照记录入报告/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: `docs/backlog/audit-remediation-r2-roadmap.md`、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.1 行 `todo`→`planned`，本 plan Status `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.1 行 `planned`→`done`，本 plan Status→`completed`
- [x] 单次提交入库：本 plan + arm2 报告 + arm2-index 登记 + log 条目 + roadmap 状态流转；`fix(audit-r2):` 格式；提交标题**不声称** `full-green verification`（e2e 不在本 plan 门禁范围——e2e 回归归 MV 抽样；除非收口前 e2e 亦实测全绿并记录）

Exit Criteria:

- [x] roadmap MA1.1 行状态与 plan 状态流转完成且相互一致
- [x] 提交内容仅含本 plan In Scope 文件清单，`git status` 复核无越界文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（general，15 turns，21 组 baseline 声称逐条 live 对账）
- Verdict: `pass-with-minors`（0 Blocker + 0 Major + 2 Minor）→ 落实两条 Minor（m1 依赖分层图示改写、m2 扫描器行为补 `renderer.regions`）后按审查结论升级 `active`，无需第二轮复审
- Rounds: 1
- Findings addressed: m1 Current Baseline 依赖分层精确化（compiler 不依赖 action-core）；m2 `check:renderer-definition-fields-only` 行为描述补全 `renderer.regions` 检查项

## Closure Gates

> 全量验证归此处（plan guide Minimum Rule 18）；审计项 BUILD_VERIFY（`pnpm test`）按 roadmap Cross-Cutting 9 在此预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（含 n/a 显式理由、双风格两段齐备）
- [x] arm2-index 登记（MA1.1 报告路径 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（Cross-Cutting 9）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线（高于即查明归因，见 Failure Paths）
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只允许入报告 deferred 区并附定级理由；无 in-scope live defect 进 follow-up）
- [x] roadmap Work Item Status MA1.1 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved`，0B/0M/2m；m1 knip 计数 25→26、m2 #7 措辞勘正已同 commit 落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径，见 arm2-index 门禁基线区——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P1-MA1.1-001 / P2×3 / P3×1 按 Non-Goals 属 MR 批量修复面，已入 arm2-index 与报告 Deferred 区排账，非本 plan 债务）

## Closure

Status Note: MA1.1 全部 Phase 交付完成——报告双风格（multi 五维度 + open 两轮追问）落盘、arm2-index 登记（MA1.1 行 + P1-MA1.1-001）、daily log 条目、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；独立 fresh-session closure audit verdict `approved`（0B/0M/2m，m1/m2 已同 commit 勘正回写）。roadmap MA1.1 行已流转 `done`。P0=0、P1=1（进 MR 排账）、P2=3 + P3=1（报告 Deferred 区）、系统性深化候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，13 turns，全部结论基于直接观测：10 项任务逐条开档，P1 三处 drift 逐条对照 live code、8 环 3 边 import 种类抽查、5 副本谓词逐 diff、arm2-index M0 基线区逐字未动核验、git status 5 条恰合 scope、门禁抽复跑 `pnpm --filter @nop-chaos/flux typecheck` exit 0）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 2 Minor）；m1 knip C1 计数 25→26（10 exports + 16 types，排除 test-support）、m2 失败模式 #3 措辞勘正（11 条中 8 条携 plan 编号，其余携 roadmap 项号/可追溯标题）——两处均已在本 commit 内回写报告与 daily log；授权语句覆盖状态流转、plan completed 与 Phase 4 收口提交

Follow-up:

- no remaining plan-owned work
