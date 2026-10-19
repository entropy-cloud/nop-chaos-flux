# 656 审计修复 R2·MA1.3：basic 渲染器簇定义字段与注册完整性审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.3；`missions/audit-remediation-r2.json`；方法论 `docs/skills/flux-component-design-review-prompt.md`（检查清单）+ `docs/skills/deep-audit-prompts.md`（§A + 通用口径 + 附录 A）+ `docs/skills/architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1/MA1.2 plan 654/655（方法先例，不预载结论）、owner doc `docs/architecture/renderer-runtime.md`

## Purpose

对 C3 basic 渲染器簇（flux-renderers-basic / flux-renderers-form / flux-renderers-form-advanced / flux-renderers-data）执行结构与契约层审计，核心口径 = **定义字段正确性与注册完整性**（matrix MA1.3 取证要点），叠加依赖/边界/导出面共享方法。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `67b1f0960`，干净树）

- **簇构成与规模**（roadmap 口径）：basic 35 src/72 test、form 94/127、form-advanced 71/173、data 120/184，合计 320/556（S 级最大簇）。
- **依赖方向**：basic deps = {core, i18n, react, ui}；form = {core, i18n, react, ui, react-virtual, day-picker}；form-advanced = {core, i18n, react, **content**, **form**, **runtime**, ui, dnd-kit×3, tanstack virtual, tiptap×5}；data = {core, i18n, react, **basic**, ui, tanstack virtual}。跨渲染器边：form-advanced→content/form、data→basic；**form-advanced→flux-runtime 单文件边**（`detail-view/projected-scope.ts`，1 处，owner doc renderer-runtime.md:99 记载 host projection scope 按 flux-runtime 契约内省的授权形态——执行时核对具体 import 是否为该授权用途）。
- **`audit:deps` 现状（2026-10-19 实测）**：全仓 57 条全 no-circular；**C3 命中 14 条**（form 8：input-choice-renderers×4 + schemas-{verification,signature,org,cron} 各 1；form-advanced 3：condition-builder 族；data 3：table-body×2 + list-item-view；basic 0）。与 M0 基线一致。
- **注册机制**：每包一个薄注册函数——`registerBasicRenderers`（index.tsx:26）/ `registerFormRenderers`（definitions.ts:45）/ `registerFormAdvancedRenderers`（index.tsx:82）/ `registerDataRenderers`（index.tsx:27），全部委托 `registerRendererDefinitions(registry, <pkg>RendererDefinitions)`（core registry 去重/override 判别测试已在 MA1.1 核验 `registry.test.ts` 覆盖）。定义文件形态：basic=`basic-renderer-definitions.ts` 等多文件；form=`definitions.ts` + `renderers/*-definitions.ts`（`type:` 条目粗计 input.tsx 11 / schemas.ts 15 / date 7 / org 3 / form-atoms 3…）；form-advanced 内联 `formAdvancedRendererDefinitions`（index.tsx:61）；data=按组件拆分 `*-definition.ts`。
- **契约测试资产（抽样已见）**：四包均有 `contract-honesty.test.ts`；basic 另有 event-handler/dom-structure/widget-markers/basic-renderer-contracts 等大契约族——注册完整性有既有判别面（执行时核对覆盖范围，勿重复计数）。
- **相关扫描器 M0 基线**（执行时复跑核对）：`check:audit-missing-renderer-markers` 0（**规则 include 正是 `flux-renderers-*`**——C3 是该扫描器的主扫描面）；`check:renderer-definition-fields-only` PASS；`check:schema-prop-coverage` PASS（Layer 1/2 + schema 测试覆盖）；`check:audit-hardcoded-type-dispatch` 0；`check:audit-runtime-raw-schema-reads` 0；`check:audit-fieldframe-bypasses` 0。
- **入口面**：index 行数 basic 28 / form 40 / form-advanced 84 / data 29；knip C3 命中 **105 行**（分段待执行裁定）。
- **30 天 churn 热点**：`data/table-renderer.tsx`(13)、`basic/tabs.tsx`(10)、`form-advanced/upload-field.tsx`/`input-table-renderer.tsx`(9)、`form/schemas.ts`(8)、`form/renderers/form-definition.ts`(8)、`form-advanced/array-editor.tsx`(8)、`data/crud-renderer.tsx`(8)。
- **owner doc 规则锚点**：`renderer-runtime.md`——Main Design Rule、Renderer Component Contract、Channel Authority（RM-0 pin）、Declarative Configuration Principle（No Hardcoded Type Dispatch）、**Renderer-Level Static Metadata**、**Prop Contract Coverage Discipline（plan 462；RM-4/plan 606 单源）**、Declarative Metadata Ownership、Validation Boundary Split。
- **执行状态**：roadmap MA1.3 当前 `todo`（依赖 M0 `done`）；`docs/audits/` 无 `arm2-MA1.3-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.3-basic-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.3-<nnn>`；P2/P3 留报告 deferred 区）。
- 覆盖面（matrix MA1.3 + roadmap MA1 共享方法）：① 依赖图与跨包引用（14 条环逐边定性 + 跨渲染器边 + form-advanced→runtime 授权用途核对）；② **定义字段正确性**（四包 definition 对象字段集 vs owner doc Renderer-Level Static Metadata / Prop Contract Coverage Discipline 单源口径；`renderer-definition-fields-only`/`schema-prop-coverage` 复扫）；③ **注册完整性**（注册函数→definition 数量/去重/每 definition 有 component；contract-honesty 覆盖面盘点——测的是稳定契约还是实现细节的边界交 MA4，只做覆盖登记）；④ 导出面稳定性（4 入口 + knip 105 行分段裁定）；⑤ marker（missing-markers 主扫描面复跑 + 抽样）；⑥ 架构深化机会（systemic 记录不落地）。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.3 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；扫描器/knip/环路命中只定级登记，修复归 MR 批量。
- 不排 MR/R\*.n 行；不改写历史文档；不预载 MA1.1/MA1.2 结论（其报告仅作检测启发，命中处本轮重新取证）。
- 组件**行为**正确性（交互/渲染输出）归 MA5；测试质量归 MA4——本项只做结构/契约/注册面；发现行为线索记交叉引用。
- 不执行 MA1.4 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.3 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`/`schema-prop-coverage`/`audit-hardcoded-type-dispatch`/`audit-runtime-raw-schema-reads`/`audit-fieldframe-bypasses`/`workspace-manifest-deps`、4 注册函数与 definition 集合核对、4 入口文件、owner doc 相关节对照、git churn、deep-import 复扫。
- `docs/logs/` 当日 log 追加 MA1.3 条目；roadmap MA1.3 行状态流转（draft review→`planned`；closure audit→`done`）。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）。
- 定级命中（含 14 环、knip 105 行）的修复。
- MA1.4+ / MR / MV / MG 执行或立项。
- 并发线未提交变更（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号        | 触发                                                                                                                                                                                                                                                                               | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found      | 发现 P0——按 Rule 2 实例化（上列为本簇高概率触发面，**不限于**：运行时崩溃/XSS 未 sanitize/数据损坏/核心渲染循环断裂/功能核心操作无法完成/公共导出面破坏性变更未通知——Rule 2 全部六类 P0 均适用；本簇具体化：definition 字段契约破坏致渲染器无法注册/渲染、注册面破坏性变更未通知） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift       | 核对扫描器输出高于 arm2-index M0 基线                                                                                                                                                                                                                                              | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |
| registry-test-drift | 注册/definition 计数与本节 baseline 不符                                                                                                                                                                                                                                           | 以现场重测为准更新报告并说明漂移源                                                                   | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物，在 Closure Gates 执行登记。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 定义字段 / 注册 / 导出面 / marker）

Status: completed
Targets: 报告草稿、`_tmp/`（取证输出）

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑 `pnpm audit:deps` 确认 C3=14（=M0 基线）；14 条环逐条抽取边并定性（type-only vs 运行时，方法同 MA1.1 P2-001 逐边核验）+ 归族与 P 级；跨渲染器边（form-advanced→content/form、data→basic）方向合法性；**form-advanced→flux-runtime 单文件边**核对 import 与 owner doc :99 授权形态是否吻合（live 观测为 `createProjectedScopeStore` public re-export、非 `isHostProjectionScope`——以现场为准，draft review m1 勘正）；deep-import 复扫（`@nop-chaos/flux-renderers-*/<path>` 未声明穿透 = finding）
- [x] **定义字段正确性**：四包 definition 对象逐包抽样 ≥5 个（含热点 `form-definition.ts`/`schemas.ts`）对照 owner doc Renderer-Level Static Metadata 与 Prop Contract Coverage Discipline（RM-4 单源口径：`SchemaFieldRule.contract` 单一挂载位）——字段集一致性、legacy 字段残留（`regions:`/`RendererDefinition.regions`）、contract 挂载位唯一性；复跑 `renderer-definition-fields-only` + `schema-prop-coverage`（=M0 PASS）
- [x] **注册完整性**：四注册函数体核对（委托 `registerRendererDefinitions` + definition 集合实存）；definition 计数 vs 集合条目数实测（防集合漏挂——注册函数引用的数组与散落 definition 文件比对）；每 definition `type` 唯一性/`component` 必备（core registry 判别测试已验，复述基线即可）；contract-honesty 四包测试文件存在性 + 覆盖声明范围登记（质量评估归 MA4）
- [x] 导出面：4 入口逐包核对（definition 集合 + 注册函数 + 组件导出的分类）；knip C3 105 行分段 + 抽样裁定（exports/types/devDeps 段各 ≥5）；30 天 churn 热点提交可追溯性抽样（git log 前 8 热点文件）
- [x] marker：`check:audit-missing-renderer-markers` 复跑（C3 = 主扫描面，0 = M0 基线）+ 抽样 3 个 widget 对照 marker 发射（widget-markers-contract 测试族交叉）；`audit-hardcoded-type-dispatch`/`raw-schema-reads`/`fieldframe-bypasses` 复跑（0 基线，供 MA2 交叉）
- [x] 架构深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五个取证维度各产出带证据条目（n/a 写理由）；14 环与 knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] 定义字段与注册完整性有明确结论（合规面 + 缺口清单或"零缺口"证据）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点 8 文件逐个问"热改是否留下结构债"、knip 105 行全量分段、已知失败模式 #3/#4（BEM/marker）/#9、MA1.1/MA1.2 报告交叉引用点（如 fixture/test-support 形态）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：definition 集合双源风险（form 的 definitions.ts vs renderers/\*-definitions.ts 多文件拼装是否单源）、form-advanced 内联集合（index.tsx:61）与他包独立文件形态不一致是否隐藏漂移、注册函数薄委托是否被绕过（仓内直接 `registerRendererDefinitions` 散用点）、data→basic 依赖是否仅限共享 primitive
- [x] 深化机会与 MA4/MA5 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.3-basic-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（范围/深挖统计/P0/P1/P2/P3/误报排除/深化候选/open 两轮/交叉引用/收口补记门禁节），文件名含时间戳
- [x] arm2-index：MA1.3 行回填报告路径；P1（如有）入索引区（ID `P1-MA1.3-<nnn>`，状态 `open`）
- [x] daily log 追加 MA1.3 条目（路径 + 发现计数 + 门禁；含缓存回放口径注记，沿用 MA1.2 先例）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9）并对照 M0 基线登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.3 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.3 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转），`fix(audit-r2):` 格式；标题不声称 `full-green verification`（e2e 不在本 plan 门禁范围）

Exit Criteria:

- [x] roadmap MA1.3 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（21 turns，12 组 baseline 声称逐条 live 对账全✅）
- Verdict: `pass-with-minors`（0 Blocker + 0 Major + 3 Minor）→ m1/m2/m3 按修法落实后升级 `active`
- Rounds: 1
- Findings addressed: m1 form-advanced→runtime 边授权用途改按 live 观测（createProjectedScopeStore re-export，非 isHostProjectionScope）；m2 Phase 3 BUILD_VERIFY Exit 补「即 Closure Gates 预声明门禁」clarifier；m3 P0 触发词补全 Rule 2 六类（注明上列为本簇高概率实例）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.3 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.3 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 0B/0M + 3 非阻断 Minor——m1 报告标题分段措辞、m3 index 头滚动已同 commit 顺手修正）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2-MA1.3-001 与 P3×2 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.3 全部 Phase 交付完成——报告双风格（multi 六维度 + open 两轮）落盘、arm2-index 登记（MA1.3 行，P1=0）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；独立 fresh-session closure audit verdict `approved`（0B/0M + 3 非阻断 Minor，其中 2 项已同 commit 顺手修正）。roadmap MA1.3 已流转 `done`。P0=0、P1=0、P2=1（四对运行时环逐边定性）、P3=2（knip 105 + 零消费 devDeps×2）、systemic 候选 2 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，14 turns，8 任务组全部直接观测：14 环边种类抽验、knip 105 分段复核、误报排除×4 亲证、门禁复跑 2 扫描器、arm2-index diff 逐字节、git status 恰 5 文件）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 3 非阻断 Minor）；m1 报告 P3-001 标题分段措辞、m3 arm2-index Last Updated 头滚动已同 commit 修正；m2（Phase 4 Status 字段时序）由 completed 流转自然消解；授权覆盖状态流转与收口提交（不声称 full-green）

Follow-up:

- no remaining plan-owned work
