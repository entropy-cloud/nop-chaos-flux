# 671 审计修复 R2·MA3.5：代码质量审计—renderers-basic + renderers-form

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.5；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.3（C3 结构面已审）、MA2.2（C3 运行时正确性已审）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md` + `form-validation.md`

## Purpose

对 flux-renderers-basic（35 src/72 test，6,567 行，22 tsx）+ flux-renderers-form（94 src/127 test，15,554 行，46 tsx）执行代码质量审计（matrix MA3.5，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `e10489718`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：basic 35 src / 72 test / 6,567 行 / 22 tsx；form 94 src / 127 test / 15,540 行 / 46 tsx（src 口径：排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本域 **2 件**（basic/dynamic-renderer.tsx:73〔codebase-map :35 登记〕+ form/renderers/form.tsx〔9 件族〕——dynamic-renderer 内含 in-file 理由注释"'use no memo' file: without this, every parent re-render re-walked…"）。
- **口径③ 基线**：oversized WARN 触及两包 **20 件**（实现 11：form date-utils 691 / form.tsx 656 / input-choice-renderers 649 / form-definition 585 / field-handlers 561 / input.tsx 559 / schemas.ts 506 + basic basic-renderer-definitions 595 / use-surface-renderer 553 / tabs 543 / command-palette 517；测试 9）——**均未登记**（MA3.1 P3-003 family 最大族）。
- **duplicates 初判**：触及两包 **62 处**（impl 47 + definition/schema 字面 15；impl 抽样主体为渲染器族 JSX 结构相似——org-select↔region-renderer 12L / verification-code↔region 9L / signature 与 select-mobile 内部 9L 段——widget 渲染器共享 JSX 结构模式的形态）。
- **口径④ 基线**：TODO/FIXME/HACK 两包 **0**；`as any` **0**；WA 台账——WA-basic-001..005 verified、**WA-basic-006/007/008 found**（status-hooks 转发 shim/keyboard-tabs-copy 哨兵小字面/事件 dispatch ctx 站点族）；**WA-form-001..010 共 10 条**（001/002/003/004/006 verified 共 5；005/007/008/009/010 found 共 5——signature-renderer:229-234/form-lifecycle-helpers:3-7/input-suggest:132,156/form.tsx:161-167,187-194/form.tsx:360-391+fieldset.tsx:37-60 位点）——found 件为台账既有登记。
- **口径① 抽样初判**：form.tsx（form 渲染器 orchestrator：标准 hooks + form-rules/init-action/load-action/lifecycle-helpers 兄弟模块 + 'use no memo' 登记件）、date-utils.ts（**零日期库依赖**内聚——"Built on native Date + Intl only…All parse failures degrade to undefined (never throw)"降级语义在案）。
- **churn（近 1 个月窗口实测，窗口敏感 ±1）**：form ≈291 触摸 / basic ≈109——form 为 IME 守卫修复（8004860f1）+ FM-7（plan 651）热点（携 plan 号）；basic top = tabs.tsx(10)/schemas.ts(8)。
- **执行状态**：roadmap MA3.5 当前 `todo`；无已登记 `arm2-MA3.5-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.5-basic-form-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.5-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：form.tsx / input.tsx / input-choice-renderers / date-utils / field-handlers / use-surface-renderer 或 tabs——意图表达、复杂度组织、错误传播）；② **React 19**（'use no memo' ×2 与 codebase-map 登记一致性 + check:react19 0 + 密度抽样）；③ **重构候选**（oversized 20 件逐簇裁定 + duplicates 62 处归族〔渲染器族 JSX 结构相似判定〕）；④ **workaround 嗅探**（TODO 0 + WA-basic 8 条 + WA-form 10 条核对 + 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.5 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.3/MA2.2 finding；测试组织归 MA4.2；交互行为归 MA5.4；样式归 MA7.3。
- 不执行 MA3.6 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.5 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 20 件逐簇裁定、duplicates 62 处归族、React 19 两点、WA 台账核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.5 条目；roadmap MA3.5 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.6+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                   | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：表单提交数据损坏、校验参与丢失；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 两包 >0 / oversized 两包 unique 超 20 件 / TODO >0                                         | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：form.tsx（orchestrator + 'use no memo'）、input.tsx、input-choice-renderers.tsx、date-utils.ts（零依赖 + 降级语义）、field-handlers.tsx、use-surface-renderer.ts 或 tabs.tsx；每文件三问
- [x] **React 19 口径**：'use no memo' ×2 与 codebase-map 登记一致性（dynamic-renderer :35 + form.tsx）+ in-file 理由注释核验；`check:react19` 0；密度抽样
- [x] **重构候选**：oversized 20 件逐簇裁定（实现 11 件按域归族〔form 渲染器族/definitions 字面聚合/basic 组件族〕与拆分 ROI；测试 9 件归 MA4.2 交叉）；duplicates 62 处归族（org 渲染器族/JSX 结构相似判定/definition 字面 15 处）
- [x] **workaround 嗅探**：TODO 0 复核 + WA-basic 8 条 + WA-form 10 条状态核对（found 五件位点现场定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 20 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / 'use no memo' ×2 登记一致 / as-any=0 / TODO=0 / duplicates 62 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn form 291/basic 109（IME 修复 + FM 系列亲核）、MA1.3 交叉点（结构结论不预载）、org 渲染器族克隆聚集
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：form 渲染器族（org/region/verification-code）同构漂移、date 家族边界、choice 族结构
- [x] 深化机会与 MA4.2/MA5.4/MA7.3 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.5-basic-form-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.5 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.5 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.5 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.5 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.5 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量计数复核〔无截断〕+ 报告侧抽样 4 条）
- Verdict: R1 `revised`（0B/3M/3m）→ 回修（审查员预授权免复审升 active——"按 670 判例：回修落盘后可由本审查预授权免复审"）
- Rounds: 1
- Findings addressed: M1 WA-form 台账 1→**10 条**（001..010：5 verified + 5 found，五 found 位点枚举——Baseline/Goals/Phase1 联动；连续第三次 head 截断教训在案）；M2 form 行数 15,554→**15,540**；M3 报告头状态 + 收口补记时序（门禁实际已跑、数字真实，时序留痕本 record）；m1 duplicates 归类规则注；m2 簇名"definitions/schemas 字面聚合族"；m3 churn ≈ 注

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.5 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / 'use no memo' 本域=2 件存量口径 / as-any=0 / oversized 两包 unique=20 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.5 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/4m 信息性——9/9 对账全 PASS；m3 建议 CX 批优先权衡 input-date↔input-datetime 43L）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +20 件累计最大族〕、org/region 渲染器族 JSX 共享辅助候选〔P3-002〕、跨包克隆家族批）

## Closure

Status Note: MA3.5 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.5 行唯一无重复，P1=0）、daily log MA3.5 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/4m 信息性——9/9 对账全 PASS：oversized 20 件行数逐一/WA 台账 18 条〔basic 8 + form 10〕逐条/duplicates 62 精确〔form-advanced 未误入〕/零代码变更；m3 信息性建议 CX 批优先权衡 input-date↔input-datetime 43L）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 累计最大族 20 件/渲染器族 JSX 结构相似 62 处触及）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：oversized 20 件 11 个实现行数逐一/六文件位点精确/WA 台账 18 条状态列逐条+五 found 位点匹配/duplicates 62 精确+双抽样/扫描器规模复跑逐位/产物登记一致/门禁滞后正确/零代码变更/P3 定级双抽样）
- Evidence: 终局 `approved`（0B/0M/4m 信息性——"执行者可按 plan Phase 4 完成收口"）

Follow-up:

- no remaining plan-owned work（CX 批盘点候选：input-date↔input-datetime 43L 优先权衡〔closure audit m3〕）
