# C0 编排基线（组件清单核对 + 全量基线重跑 + 审计基础设施）

> Plan Status: completed
> Mission: component-audit
> Work Item: C0
> Last Reviewed: 2026-08-02
> Source: `docs/backlog/component-audit-roadmap.md`（C0 Phase Details）、`docs/audits/component-audit-checklist.md`、`docs/logs/2026/08-02.md`
> Related: `docs/plans/2026-08-02-2043-2-c1-1-basic-structure-core-family-audit.md`、`docs/plans/2026-08-02-2043-3-c1-2-basic-structure-extension-family-audit.md`（依赖本 plan 完成才能开工）

## Purpose

把 component-audit mission 从"已批准的路线图"推进到"可开工的基线状态"：核对 112 注册组件清单与 9 包注册定义、重跑全量基线（unit + e2e）并诚实回写 roadmap「当前基线」与 `docs/context/project-context.md`（当前仍标 "production-green"，属过期表述）、确认并冻结审计卡模板 v1、跑取审计工具基线、记录保护区域地图与授权边界。C0 完成后 C1.1 起的所有族级 work item 才能以同一基线开工。

## Current Baseline

- **Work Item Status 表**：32 个 work item 全部 `todo`；声称 112 注册组件（basic 16 / content 19 / data 8 / layout 7 / form 20 / form-advanced 19 / mobile 5 / ai 14 / scheduling 4）——尚未与 live 注册定义核对，表内计数/注释待 C0 验证后回写（roadmap 明确"C0 与注册定义核对后，任何差异以注册为准并回写本表"）。
- **单元测试基线**（2026-08-02 mission-driver 实测并提交）：`pnpm typecheck` 31/31、`pnpm build` 31/31、`pnpm lint` 31/31、`pnpm test` 全包 0 失败（flux-compiler 531、flux-renderers-form 643、flux-renderers-ai 474、nop-debugger 125 等）；上次全绿快照 2026-07-28。
- **E2E 基线**：`pnpm test:e2e` 全量 756-772 passed / 43 skipped，**9 个 pre-existing 失败**（与 HEAD 基线 stash 对比逐项复现一致，均为 mission 未触及包）：ai-chat timestamp、ai-rich-text-sender ×5（Tiptap）、calendar-demo nav、diff-perf 200ms 阈值（机器相关）、input-suggest popover 稳定性。**未达 full-green**。
- **文档过期点**：`docs/context/project-context.md` 仍标 "production-green"（roadmap 已标注为过期表述，C0 计划回写）。
- **审计基础设施**：`docs/audits/per-component/` 目录尚不存在（审计卡载体未初始化）；`docs/audits/component-audit-checklist.md` 已含 18 维清单 + 审计卡模板 + 裁决规则（待 C0 确认冻结为 v1）。
- **已知断言**：`input-suggest` 是 input-text 的 suggestSource 子特性（hook，非注册 type）；`button-group-select` 已于 2026-08-02 mission-driver 注册（fields: options/multiple/direction/dict，见 `docs/logs/2026/08-02.md`），roadmap :51 的"未注册 WIP、DOM 契约测试 5/5 失败"记录已过期，C0 回写时修正。
- **授权边界**：`missions/component-audit.json` description 已声明代码变更授权范围同 audit-remediation（全部保护区域：flux-core/src/、Schema/contract validation、ui/src/index.ts、Renderer 定义、样式契约）；审计与修复之间无人工握手（自动修复机制 §1）。保护区域约束细则见 `docs/context/ai-autonomy-policy.md`（Protected Areas 表 + `ask-first` 项）。

## Goals

- 组件清单与 9 包注册定义核对一致；roadmap Work Item Status 表（组件列表/计数/注释）与 amis-baseline-matrix 差异回写完成。
- 全量基线重跑（typecheck/build/lint/test + e2e）完成，roadmap「当前基线」节与 `docs/context/project-context.md` 同步为诚实基线（移除过期 "production-green" 表述）。
- 审计基础设施就绪：`docs/audits/per-component/` 目录、审计卡模板 v1 冻结、审计工具基线输出、保护区域地图与授权边界记录。
- e2e pre-existing 9 失败完成基线裁定（watch-only 记录 + 明确 successor 归属），C0 不被其阻塞。

## Non-Goals

- 不执行任何 C1.x~C9 的组件审计（审计从 C1.1 起，见 `2026-08-02-2043-2`）。
- 不修复 e2e pre-existing 9 失败（属 ai/scheduling/content 包，非 C0 scope；记录归属即可）。
- 不修改 18 维 checklist 语义（仅确认/冻结 v1；checklist v2 修订属 CG work item）。

## Scope

### In Scope

- 9 包注册定义核对（`*-renderer-definitions.ts` / `surface-renderer-definitions.ts` / `definitions.ts` / `schemas.ts`）与 roadmap 组件清单、`docs/components/amis-baseline-matrix.md` 三方对照，差异裁决并回写 Work Item Status 表。
- 全量基线重跑（`pnpm typecheck`/`build`/`lint`/`test` + `pnpm test:e2e`）并回写 roadmap「当前基线」节 + `docs/context/project-context.md`。
- `docs/audits/per-component/` 初始化；审计卡模板 v1 确认冻结（按 checklist §4）。
- 审计工具脚本基线跑取（suspects / missing-renderer-markers / styling-suspects / performance-suspects / fieldframe-bypasses / async-failure-paths / hardcoded-type-dispatch / reactive-render-reads / runtime-raw-schema-reads / non-retained-renderer-references / react19-optimization-candidates / test-global-leaks），基线数量记录。
- 保护区域地图与授权边界记录（写入 audit log 或 checklist 附录）。
- e2e pre-existing 9 失败的基线裁定与 successor 归属记录。

### Out Of Scope

- 组件级审计与修复（C1.1+）。
- 公共层结构性重构（公共 API、包边界、编译期机制）——按 roadmap Rule，结构性重构需人工确认。
- 18 维 checklist 语义修订。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/错误处理 API 契约；主要风险是基线重跑暴露新红项，已在 Phase 2 以"红项归因处理"覆盖）。

## Test Strategy

本档选择：**必须自动化** —— C0 的核心交付就是全量自动化基线（typecheck/build/lint/test/e2e）；组件清单核对属契约核对，差异修正如触及注册定义/契约需 test-first（roadmap Rule：契约/公共层修复必须 "Must automate"）。

## Execution Plan

### Phase 1 - 组件清单核对与回写

Status: completed
Targets: `packages/flux-renderers-*/src/*-renderer-definitions.ts`、`packages/flux-renderers-*/src/schemas.ts`、`docs/backlog/component-audit-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/audits/per-component/`

- Item Types: `Proof | Fix | Decision`

- [x] 逐包核对注册定义：9 个 renderer 包（basic/content/data/layout/form/form-advanced/mobile/ai/scheduling）的 `type` 注册全集，与 roadmap Work Item Status 表组件清单逐项比对（`文件:行` 证据）。注意定义载体差异：basic/content/data/layout/form 等包集中在 `*-renderer-definitions.ts` / `definitions.ts`；**form-advanced 无独立 definitions 文件**，注册散落于各 renderer 文件（如 `combo-renderer.tsx`、`array-editor.tsx`、`icon-picker.tsx`）并由 `src/index.tsx` 的 `registerRendererDefinitions` 聚合；`flux-renderers-form/src/definitions.ts` 为聚合器，`type:` 字面量在其 `src/renderers/*.ts` 子文件中——以注册生效处为准。
- [x] 与 `docs/components/amis-baseline-matrix.md` 对照：已 landed 组件 vs 注册定义差异；`input-suggest`（hook 非注册 type）、`hidden-field`（非组件）等已知断言在核对中复验；`button-group-select` 的 roadmap :51"未注册 WIP、5/5 失败"记录为过期表述（已注册，见 Current Baseline），核对后回写。
- [x] 差异裁决（Decision）：任何差异以注册定义为准，回写 Work Item Status 表（组件列表、每族计数、注释、总计），并在 daily log 记录差异明细。
- [x] 创建 `docs/audits/per-component/` 目录；按 checklist §4 模板冻结审计卡 v1（字段：状态/审查日期/审查 plan/注册定义与渲染器与 design.md 与 playground 与 e2e 引用/组件身份/18 维表/发现清单/宿主场景/修复记录/Closure）。
- [x] 记录保护区域地图与授权边界（来源：`docs/context/ai-autonomy-policy.md` Protected Areas 表 + `missions/component-audit.json` description 授权声明；落点：roadmap「当前基线」或 audit log）：mission 已授权全部保护区域（flux-core/src/、Schema/contract validation、ui/src/index.ts、Renderer 定义、样式契约），结构性重构（公共 API/包边界/编译期）执行前仍需人工确认；`@nop-chaos/ui` 公共导出变更维持 `ask-first`。

Exit Criteria:

> 本 Phase 交付"清单可信 + 审计载体就绪"，是后续所有 C\* plan 开工的前提。

- [x] roadmap Work Item Status 表已回写为与注册定义一致（计数/组件清单/注释），daily log 记录差异明细与裁决。
- [x] `docs/audits/per-component/` 存在且含审计卡模板 v1（或 checklist §4 已冻结声明）。
- [x] 保护区域地图与授权边界已记录（依据 `docs/context/ai-autonomy-policy.md` Protected Areas 表与 mission description 授权声明，落点 roadmap「当前基线」或 audit log）。

### Phase 2 - 全量基线重跑与回写

Status: completed
Targets: 全仓库验证命令、`docs/backlog/component-audit-roadmap.md`「当前基线」节、`docs/context/project-context.md`

- Item Types: `Proof | Decision`

- [x] 重跑 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`，记录各包结果。
- [x] 重跑 `pnpm test:e2e` 全量（component-lab + 其余），记录 passed/skipped/failed 计数。
- [x] 红项归因（Decision）：unit 或 e2e 出现新红项 → 与 2026-08-02 mission-driver 提交后的基线对比定位；本 plan scope 内可修（如清单核对牵连）的 test-first 修复，超出 scope 的记为阻塞项并在 daily log 记录。
- [x] 回写 roadmap「当前基线」节：以本次实测为准（含 e2e pre-existing 9 失败清单与归属）。
- [x] 回写 `docs/context/project-context.md`：移除过期 "production-green" 表述，更新 freshness 与基线描述（该文件仍标 "production-green"，属过期表述，C0 必须修正）。
- [x] e2e pre-existing 9 失败基线裁定（Decision）：逐项记录"pre-existing + 与 HEAD 基线一致 + 触发包"，归属 successor（CV 全量验证或专项处理计划）；C0 不阻塞、不修复。

Exit Criteria:

> 本 Phase 交付"诚实基线"，后续 work item 的验证门禁以此为参照。

- [x] roadmap「当前基线」节与 `docs/context/project-context.md` 已按实测回写，无过期 "production-green" 表述残留。
- [x] e2e pre-existing 9 失败逐项记录在案（清单 + 触发包 + successor 归属），C0 不被阻塞。

### Phase 3 - 工具基线 + 审计基础设施归档

Status: completed
Targets: 审计工具脚本（`check:audit-*` 系列）、`docs/logs/2026/08-02.md`

- Item Types: `Proof | Follow-up`

- [x] 跑取审计工具基线并记录数量：`check:audit-suspects`、`check:audit-missing-renderer-markers`、`check:audit-styling-suspects`、`check:audit-performance-suspects`、`check:audit-fieldframe-bypasses`、`check:audit-async-failure-paths`、`check:audit-hardcoded-type-dispatch`、`check:audit-reactive-render-reads`、`check:audit-runtime-raw-schema-reads`、`check:audit-non-retained-renderer-references`、`check:audit-react19-optimization-candidates`、`check:audit-test-global-leaks`（以根 package.json scripts 为准）。
- [x] 工具基线输出与日期归档（daily log 记录各脚本命中数），供各 C\* plan 对比增量（C0 后基线为参照，不要求清零）。
- [x] daily log 收口：C0 交付物清单（清单核对差异表、基线数据、工具基线、保护区域地图位置）。

Exit Criteria:

- [x] 工具基线数量已记录（daily log），后续 C\* plan 可直接引用。
- [x] daily log 已记录 C0 收口证据（含差异裁决与基线数据）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03d3862e2fferRZviQ7hV4hx2n`，两轮 review）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 Minor-1 已处理（form-advanced 注册载体差异补入 Phase 1）；Minor-2 已处理（button-group-select 基线事实更新）；Minor-3 已处理（保护区域地图引用改为 ai-autonomy-policy.md + mission description）；R2 残留 Minor（Phase 1 未注册表述与基线不一致）已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 组件清单核对完成且 roadmap Work Item Status 表与注册定义一致
- [x] 全量基线重跑完成且 roadmap「当前基线」+ `docs/context/project-context.md` 为诚实表述（无过期 "production-green"）
- [x] 审计基础设施就绪（per-component 目录 + 审计卡模板 v1 + 工具基线 + 保护区域地图）
- [x] e2e pre-existing 9 失败完成基线裁定（watch-only + successor 归属），无被静默降级的 in-scope 项
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### e2e pre-existing 9 失败（ai-chat/ai-rich-text-sender/calendar/diff-perf/input-suggest）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 逐项与 HEAD 基线 stash 对比复现一致，均为 mission 未触及包（ai/scheduling/content），且 C0 已以"对照基线归因 + 记录"的方式处理；修复它们超出 C0 编排基线 scope，由后续专项/CV 全量验证承载。
- Successor Required: `yes`
- Successor Path: CV 全量验证 work item，或专项处理计划（diff-perf 需评估阈值与机器基线；其余属 ai/scheduling 组件族，可在 C8.x/C9 或专项处理）

## Non-Blocking Follow-ups

- 各 C\* plan 开工前如发现工具脚本缺失/损坏，直接在对应 plan 内补齐（不新增 CX-n）。
- C0 后各 work item 的验证门禁以"本 plan 回写的 C0 后基线"为准（roadmap「自动修复机制」§4）。

## Closure

Status Note: 已完成 —— 三个 Phase 全部执行完毕并勾选（组件清单核对与回写 / 全量基线重跑与回写 / 工具基线+归档），Closure Gates 全绿。独立 closure audit 通过（见下），roadmap C0 work item 已标 `done`。e2e pre-existing 9 失败按 watch-only residual 处理并归属 successor，未静默降级任何 in-scope 项。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_03d213beeffeowO2ACslRuSuAt`）
- Evidence: verdict `approved`；逐项复核计划 checklist 全勾、9 包注册计数与 live 定义一致（含 form 21/button-group-select@input.tsx:639）、roadmap「当前基线」与 project-context.md 无过期 "production-green"、per-component 审计卡模板 v1 与 checklist §4 逐字段一致、daily log 三节 C0 记录齐全、12 个 `check:audit-*` 脚本计数重跑全符、e2e 9 失败归属诚实（watch-only + successor）。1 条 non-blocking 发现（保护区域地图落点指针）已修复（roadmap「当前基线」补回该条目，daily log 指针现准确）。证据另见 `docs/logs/2026/08-02.md` C0 三节。

Follow-up:

- 待 C0 完成后由 `2026-08-02-2043-2`（C1.1）与 `2026-08-02-2043-3`（C1.2）承接。
