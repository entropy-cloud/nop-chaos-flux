# 653 审计修复 R2·M0：审计编排基线（arm2 矩阵 / 工具基线 / 全量门禁基线 / arm2-index）

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` M0 工作项；`missions/audit-remediation-r2.json`；方法论 `docs/skills/audit-remediation-roadmap-authoring-prompt.md`（M0 节）
> Related: r1 机制参照 `docs/audits/arm-index.md`、`docs/audits/audit-remediation-scope-and-dimension-matrix.md`（仅机制，不复制结论）

## Purpose

建立 R2 全新视角审计-修复轮的执行基线：产出 arm2 覆盖矩阵（逐格取证模板）与 arm2-index（索引骨架 + P0/P1/delegated 追踪区），实测全部审计工具与全量门禁的当前基线值，live 复核活跃 owner roadmap 清单。M0 是 MA1–MA9 全部审计工作项的前置依赖。

## Current Baseline（2026-10-19 live 核对，HEAD `ea9aea279`）

- **roadmap 状态**：`docs/backlog/audit-remediation-r2-roadmap.md` 与 `missions/audit-remediation-r2.json` 均为 `active`（2026-10-19 三轮共识审查通过）；Work Item Status 全部 63 项 `todo`，M0 为执行队列第一项。两文件已由作者线提交入库（commit `7e07d19cb`），不在本 plan 提交范围。
- **工作树状态（HEAD `ea9aea279` 实测）**：除本 plan 文件（`docs/plans/653-*.md`）untracked 外，工作树全净。本 plan 起草时点曾存在的并发线未提交变更（form.tsx IME 守卫、628/640、analysis/article 等）已由并发会话于 07:54–07:56 分 5 个提交入库（`8004860f1`、`36887ffd5`、`d3cd2098c`、`7e07d19cb`、`ea9aea279`）——基线在干净树上实测，无双重口径问题。
- **arm2 产物不存在**：`docs/audits/` 下无任何 `arm2-` 前缀文件；`docs/plans/` 下无任何 arm2 plan。执行尚未开始。
- **工具清单 live 核对（根 package.json）**：24 个维度扫描器 = 19 个 `check:audit-*` + `check:ai-engine-invariants` + `check:react19` + `check:i18n-keys` + `check:schema-prop-coverage` + `check:renderer-definition-fields-only`；5 个 `audit:*` = deps / knip / mutants / semgrep / react-doctor（另存在 `audit:knip:packages` / `audit:knip:playground` 两个 knip 子变体，不列入 5 个正式基线项，纳入与否在 arm2-index 工具基线区注记裁定）；另有 `pnpm check`（静态检查链）与 `check:scanner-baselines`。与 roadmap 工具清单逐项一致。
- **活跃 owner roadmap 清单 live 复核（Purpose 第 3 条）**：
  - FM 收官轮：FM-1b-b 为状态表中的真实 `todo` 行；FM-6-b / FM-7-b 为 FM-6 / FM-7 收口注记中的字母批候选、**尚未立行**（`docs/backlog/final-maturity-audit-roadmap.md` Last Updated 注记"待立项滚动"）——delegated 指针应指向 FM roadmap 本身，不指向不存在的行状态；
  - cross-roadmap UR-15 为 `in-flight`（`docs/backlog/cross-roadmap-remediation-roadmap.md` 状态表）；
  - report-designer-nop-report NRP-1..5 为 `todo`（`docs/backlog/report-designer-nop-report-roadmap.md` §5）；
  - renderer-metamodel RM-0..RM-14 已全部 `done`（收官，不列入委托清单）。
  - 与 roadmap Purpose 第 3 条名单一致；状态定性以本节为准（Purpose 第 3 条只列名单不带状态）。
- **规模计数**：roadmap Current Baseline 记 43 包 / ~1553 src / ~1783 test（2026-10-19 快照）并指明"M0 重新实测入册"——本 plan Phase 1 实测回填 arm2-index。
- **今日 log 已存在**：`docs/logs/2026/10-19.md`（行号锚定约束迁移 + R2 立案条目，均已提交），本 plan 追加 M0 基线条目；该文件为并发线共享文件，提交时采用 hunk 级 staging 只取本 plan 的 M0 hunk。
- **r1 基线仅作机制参照**：r1 的 arm-index 数值（2026-07-27/28）不预载为本轮任何基线；本轮全部数值现场实测。

## Goals

- `docs/audits/arm2-scope-and-dimension-matrix.md`：把 roadmap 的 12 包簇 × 9 维度矩阵展开为逐格取证模板（每格 = 工作项 + 方法/工具 + 证据落点 + 取证要点），只做覆盖定义，不携带状态。
- `docs/audits/arm2-index.md`：索引骨架，含工作项→报告登记表、P0 追踪区、P1 finding 索引区、delegated 指针区、工具基线区、全量门禁基线区、活跃 owner roadmap 快照区。
- 工具基线：24 个维度扫描器 + 5 个 `audit:*` + `pnpm check` + `check:scanner-baselines` 逐个实测，exit code 与命中数登记入 arm2-index。
- 全量门禁基线：`pnpm typecheck && pnpm build && pnpm lint && pnpm test` 实测通过并登记入 arm2-index 与 `docs/logs/2026/10-19.md`。
- 活跃 owner roadmap 清单复核结论落入 arm2-index（供后续 MR\*.0 修复去重引用）。

## Non-Goals

- 零代码变更（roadmap Cross-Cutting 9：审计项除 P0 即时修复外零代码变更；M0 无 P0 通道产物预期，扫描器基线命中即基线，不在本轮修复）。
- 不修复任何扫描器报告的既有命中（它们是本轮对照基线，修复属 MA/MR 工作项）。
- 不提交任何非本 plan In Scope 的文件（通用守卫：并发线在共享文件上的 hunk 一律排除，见 Phase 6）。
- 不改写 r1/FM 历史文档（roadmap Rule 7）；不预载 r1 基线数值。
- 不在本 plan 内启动 MA1 及以后任何审计工作项的执行。

## Scope（必填节）

### In Scope

- 新建 `docs/audits/arm2-scope-and-dimension-matrix.md`、`docs/audits/arm2-index.md` 两个文档产物。
- 运行并登记：24 个维度扫描器、5 个 `audit:*`、`pnpm check`、`check:scanner-baselines`、全量 `pnpm typecheck/build/lint/test`。
- `docs/logs/2026/10-19.md` 追加 M0 基线记录。
- roadmap Work Item Status 表 M0 行状态流转（draft review 通过→`planned`；closure audit 通过→`done`）。
- 收口提交：本 plan + 两个 arm2 产物 + log 追加（hunk 级 staging），`fix(audit-r2):` 格式。

### Out Of Scope

- MA1–MA9 / MR / MV / MG 任何工作项的执行或立项。
- 任何 `packages/`、`apps/`、`scripts/`、`tests/` 下的代码或配置变更。
- 并发线未提交变更的处置或提交。
- `docs/context/project-context.md` 的新鲜度改写（属 MG 沉淀项）。

## Failure Paths

不适用：纯文档/编排基线计划，无错误处理、API 契约、鉴权或外部集成面。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯编排基线与文档产物，零行为变更；全量 `pnpm typecheck/build/lint/test` 实测本身是本 plan 的 Proof 交付物（已在 Phase 5 执行并登记），不新增测试代码。

## Execution Plan

### Phase 1 - 事实冻结与活跃 roadmap 复核落册

Status: completed
Targets: `docs/audits/arm2-index.md`（本 Phase 创建文件并写入基线前言/快照/owner-roadmap 三节，其余各节于 Phase 3 展开）、`docs/logs/2026/10-19.md`

- Item Types: `Decision | Proof`

- [x] 创建 arm2-index，写入基线前言：快照当前 `git status` 与 HEAD，声明基线实测树状态
- [x] 实测规模计数（`ls packages/` 包数 + 全仓 src/test 非测试源文件计数，口径同 roadmap Current Baseline）回填 arm2-index（43 包 / 1553 src / 1783 test，零漂移）
- [x] 活跃 owner roadmap 清单复核结论（FM-1b-b `todo` 行；FM-6-b/FM-7-b 未立行候选；UR-15 `in-flight`；NRP-1..5 `todo`；renderer-metamodel 收官）写入 arm2-index 专区，注明复核日期与依据文件

Exit Criteria:

- [x] arm2-index 存在且含工作树快照、规模计数、活跃 owner roadmap 快照三节，与 live 核对一致（本 plan Current Baseline 已预核实，落册时复核一次）

### Phase 2 - arm2 覆盖矩阵（逐格取证模板）

Status: completed
Targets: `docs/audits/arm2-scope-and-dimension-matrix.md`

- Item Types: `Fix | Decision`

- [x] 按 roadmap「审计维度 × 包簇覆盖矩阵」逐格展开：每格列工作项编号、方法/工具（含 roadmap 指定的 skill 与扫描器）、证据落点（报告文件名模式 `YYYY-MM-DD-HHmm-arm2-<工作项>-<维度>.md`）、取证要点
- [x] 矩阵只做覆盖定义：不携带状态列、不复制 roadmap 状态表（roadmap Rule 3）；全部格子标注"按全新视角原则执行时一律按未审计处理"（执行原则节第 1 条）
- [x] 附双风格执行（multi+open）与 P0 即时通道说明节

Exit Criteria:

- [x] 文件存在且 12 簇 × 9 维度所有非空格均有对应工作项映射，格数与 roadmap 矩阵一致（覆盖总表逐格照录 + MA1–MA9 逐工作项模板表）
- [x] 文件内零状态声明（无 todo/planned/done 字样出现于格子）

### Phase 3 - arm2-index 骨架

Status: completed
Targets: `docs/audits/arm2-index.md`

- Item Types: `Fix | Decision`

- [x] 建立索引骨架：工作项→报告登记表（63 项，报告路径列初始为 —）、P0 追踪区（空表+通道说明）、P1 finding 索引区（空表+ID 规则 `P<级别>-<工作项>-<序号>`，ID 落索引后不可变）、delegated 指针区（空表+MV 校验说明）
- [x] 建立工具基线区与全量门禁基线区（空表，Phase 4/5 回填）

Exit Criteria:

- [x] 文件存在且七节齐备（登记表/P0 区/P1 区/delegated 区/工具基线区/门禁基线区/owner roadmap 快照区）
- [x] P0/P1/delegated 区含填写规则说明（ID 不可变、delegated 指针 MV 校验、P0 不得留 MR 批量）

### Phase 4 - 工具基线实测（24 扫描器 + 5 audit:\* + check 链）

Status: completed
Targets: `docs/audits/arm2-index.md` 工具基线区

- Item Types: `Proof`

- [x] 逐个运行 24 个维度扫描器，记录 exit code 与命中数（命中明细不展开，基线只记数值；全部 exit 0）
- [x] 逐个运行 5 个 `audit:*`（deps/knip/mutants/semgrep/react-doctor），记录 exit code 与摘要；工具缺失（如 semgrep 未安装）如实记录；knip 两个子变体（`audit:knip:packages`/`audit:knip:playground`）的纳入/排除裁定注记在工具基线区表头
- [x] 运行 `pnpm check` 与 `check:scanner-baselines`，记录结果与既有注册红名单状态（check 唯一红 = knip xlang-mock-server 归属债；scanner-baselines within）
- [x] 全部数值回填 arm2-index 工具基线区（含运行日期）

Exit Criteria:

- [x] arm2-index 工具基线区 24+5+2 行全部有实测数值（或工具缺失注记），无跳过项
- [x] 数值可复现：重跑任一扫描器输出与登记值一致（抽查 3 个：suspects 733 / styling 240 / todo-exitless 1 两轮一致；且 7 个注册基线项 scanner-baselines 门禁实测 within）

### Phase 5 - 全量门禁基线实测

Status: completed
Targets: `docs/audits/arm2-index.md` 门禁基线区、`docs/logs/2026/10-19.md`

- Item Types: `Proof`

- [x] `pnpm typecheck` 实测：43/44 过，唯一红 playground vite.config（既有登记红）
- [x] `pnpm build` 实测：唯一红同 playground（同一根因）
- [x] `pnpm lint` 实测通过（44/44）
- [x] `pnpm test` 实测通过：82/82 任务、14,051 tests passed、0 failed（Cross-Cutting 9 BUILD_VERIFY）
- [x] 四项结果（含测试计数）回填 arm2-index 门禁基线区并写入 `docs/logs/2026/10-19.md` M0 条目（arm2-index 已回填；log 条目随收口提交落盘）

Exit Criteria:

- [x] 四项结果如实记录：unit 线全绿；typecheck/build 唯一红为既有登记债（playground vite.config，归属披露在案），非新增、不阻断（基线如实建立）

### Phase 6 - 收口与状态流转

Status: completed
Targets: `docs/backlog/audit-remediation-r2-roadmap.md`、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap M0 行 `todo`→`planned`，本 plan Status `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap M0 行 `planned`→`done`，本 plan Status→`completed`
- [x] 单次提交入库：本 plan + arm2 矩阵 + arm2-index + `docs/logs/2026/10-19.md` M0 条目（roadmap + mission 已由作者线入库，不在本次范围；roadmap M0 行 `planned`→`done` 状态流转随本提交落盘）；提交格式 `fix(audit-r2): ...`；log 为并发线共享文件，采用 hunk 级 staging 只取本 plan 的 M0 hunk（仓内先例 `460ed9c42`）
- [x] 提交标题口径：本 plan 门禁 = 四门禁 unit 线全绿；e2e 不在 M0 基线范围（e2e 回归归 MV 抽样）——提交标题**不声称** `full-green verification`（AGENTS.md 的 full-green = unit + e2e 双绿），除非收口前 e2e 亦实测全绿并记录

Exit Criteria:

- [x] roadmap M0 行状态与 plan 状态流转完成且相互一致
- [x] 提交内容仅含本 plan In Scope 文件清单，`git status` 复核无越界文件（并发线 hunk 不得混入）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理 agent_105e3940
- Verdict: `revised`（0 Blocker + 2 Major + 6 Minor）→ 全部按审查建议修法逐条落实后达成共识（零残留 B/M），plan 升级 `active`
- Rounds: 1
- Findings addressed: Major-1 Current Baseline 工作区清单在审查期间被并发线 5 提交清空→按 HEAD `ea9aea279` 干净树重写、Phase 6 提交范围缩减为 plan+两产物+log hunk；Major-2 FM-6-b/FM-7-b 并非 `todo` 行（未立行候选）→改写为"FM-1b-b 为 `todo` 行、FM-6-b/FM-7-b 为收口注记候选未立行，指针指向 FM roadmap 本身"；Minor-1 Phase 1 注明创建 arm2-index 并展开三节；Minor-2 补 Failure Paths（不适用）；Minor-3 规模计数实测入 Phase 1；Minor-4 提交标题口径钉死（四门禁 unit 线，不声称 full-green 除非 e2e 亦绿）；Minor-5 knip 子变体裁定注记入 Phase 4；Minor-6 log hunk 级 staging 入 Phase 6。

## Closure Gates

> 全量验证归此处（plan guide Minimum Rule 18）；本 plan 的全量门禁同时是交付物基线（Phase 5），双重身份在 Closure Gates 复核。

- [x] arm2 矩阵与 arm2-index 两个产物落盘且 Exit Criteria 全部满足
- [x] 工具基线 24+5+2 项实测登记无跳过
- [x] 全量门禁四项实测并登记 arm2-index 与 daily log（按 Phase 5 裁决口径：unit 线 `pnpm lint`+`pnpm test` 全绿；`pnpm typecheck`/`pnpm build` 唯一红 = 既有登记债 `apps/playground/vite.config.ts`，零新增、非阻断——closure audit 复核该裁决成立）
- [x] 活跃 owner roadmap 复核结论落册
- [x] 不存在被静默降级的 in-scope 项（本 plan 无 deferred 预期；如执行中出现改判，当场落 Deferred But Adjudicated 节）
- [x] roadmap Work Item Status M0 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved`，0 Blocker + 0 Major + 2 Minor；m1 已补 arm2-index typecheck 注记、m2 已改写本区门禁措辞）
- [x] `pnpm typecheck`（exit 1，唯一红 = 既有登记债 playground vite.config；见上方门禁裁决）
- [x] `pnpm build`（exit 1，同一根因；见上方门禁裁决）
- [x] `pnpm lint`（exit 0，44/44）
- [x] `pnpm test`（exit 0，82/82 任务、14,051 tests passed、0 failed）

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- （无）

## Closure

Status Note: M0 全部 Phase 交付完成——arm2 矩阵与 arm2-index 落盘、24+5+2 工具基线与四门禁基线实测登记、活跃 owner roadmap 快照落册、daily log 条目落盘；独立 fresh-session closure audit verdict `approved`（0B/0M/2m，m1/m2 已同 commit 回写）。roadmap M0 行已流转 `done`。零代码变更；零 deferred。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，不复用执行者上下文，26 turns，全部结论基于直接观测：实跑 6 个扫描器复现基线、复测规模计数、核对 gate 原始输出与 git status）
- Evidence: 审计报告 `_tmp/arm2-m0-closure-audit.md`（\_tmp 产物收口后清理，关键证据摘录于本节）；产物结构九节齐备 / 登记表恰 63 行 / 矩阵与 roadmap 逐格逐字一致 / 规模复测 43·1553·1783 零漂移 / suspects·styling·todo-exitless·scanner-baselines·i18n·raw-schema-reads 六项复跑与登记一致 / gate 输出与门禁基线区逐字一致（含 14,051 求和去重核验）/ owner roadmap 快照五家 live 核实 / git status 恰为预期 5 项零越界；verdict `approved` 授权状态流转与收口提交

Follow-up:

- no remaining plan-owned work
