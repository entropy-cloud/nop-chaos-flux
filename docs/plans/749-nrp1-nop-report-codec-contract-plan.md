# 749 NRP-1 codec 契约与基础（nop-report profile）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/report-designer-nop-report-roadmap.md`（NRP-1 work item）、`docs/plans/640-nop-report-profile-plan.md` Phase 1（设计种子，superseded）、`docs/architecture/report-designer/codec-design.md` §3/§8
> Related: `docs/plans/640-nop-report-profile-plan.md`

## Purpose

落地 `nop-report` profile 的第一块地基：中间对象类型（`ExcelWorkbookLike` / `XptWorkbookLike` 家族）、`packages/report-designer-nop-report` 包骨架、codec 方向就地勘误（纯 TS 取代 hucre）、spreadsheet 侧 unknown/props 保真载体裁定、以及 `config-schema.md` / `inspector-design.md` 的 owner-doc drift 收敛。NRP-1 不改通用 core 行为（本 plan 记录的向后兼容加法除外），不实现 codec 本体（NRP-2）。

## Current Baseline

- adapter seam 已定义：`packages/report-designer-core/src/adapters.ts`（`TemplateCodecAdapter`:59、`ReportDesignerProfile`:169，已有 `codecId?`/`previewId?`/`inspectorSchemaId?`/`expressionEditorId?`，无 `referencePickerId?`）。
- 中间类型不存在：`ExcelWorkbookLike` / `XptWorkbookLike` 家族在全仓零代码命中；`packages/report-designer-nop-report` 包不存在。
- 外部信封契约基线：`docs/architecture/report-designer/codec-design.md` §3.3（`raw` 为刻意保留的无损扩展点）、§8（两级 codec 接口建议）。
- spreadsheet 侧无 unknown 字段载体：`packages/spreadsheet-core/src/types.ts` 的 `CellDocument`（:98）/`WorksheetDocument`（:42）/`WorkbookDocument`（:28）无 `raw` 槽；`WorksheetDocument.props?` 与 `WorkbookDocument.props?` 已存在（可选，`Record<string, unknown>`）。`codec-design.md:123` 要求 `SpreadsheetDocument.meta` 中视图信息不回写领域模型。
- codec 方向前提失效：`docs/architecture/report-designer/codec-design.md:477-479`（plan 477 裁决）声明采纳 hucre 作 codec 层依赖；roadmap §4 经用户裁定改为**纯 TS codec、不引 hucre**，需就地勘误。
- owner-doc drift：`docs/architecture/report-designer/config-schema.md:190-226` 描述的 `ReportDesignerConfig.expressions/adapters`、`FieldSourceConfig.mode/itemTemplate/dragPayload` 在 live `packages/report-designer-core/src/types.ts:135-157`（`ReportDesignerConfig`）与 `FieldSourceSnapshot`（:71-91）中不存在；`docs/architecture/report-designer/inspector-design.md:114-127` 以 `target`/`selection` 作为 host scope 字段，而 live canonical 投影为 `selectionTarget`（同文 `:243` 已用 `selectionTarget`）。
- 新包接线点先例：`vite.workspace-alias.ts`（alias map）、根 `tsconfig.json` project references（`packages/report-designer-core` 在 :40，收口时 live 漂移至 :42）、`AGENTS.md`「Adding New Packages」。

## Goals

- 新包 `packages/report-designer-nop-report`（`@nop-chaos/report-designer-nop-report`）骨架可 typecheck/build/lint，并接入 workspace 接线点。
- `ExcelWorkbookLike` / `ExcelSheetLike` / `ExcelCellLike` / `XptWorkbookLike` / `XptSheetLike` / `XptCellLike` 中间类型落地，含最小类型级测试。
- spreadsheet 侧 unknown 字段保真载体裁定落地：`CellDocument` 增加可选 `raw?: Record<string, unknown>`（向后兼容加法）；workbook/sheet 级沿用既有 `props` 槽。
- `codec-design.md` hucre 前提就地勘误；`config-schema.md` / `inspector-design.md` drift 收敛到 live baseline。

## Non-Goals

- 不实现 codec 本体（`SpreadsheetCodec` / `ReportSemanticCodec` / `NopReportTemplateCodec`，NRP-2）。
- 不实现任何 profile adapter（field source / drop / inspector / preview / expression / reference，NRP-3/NRP-4/NRP-5）。
- 不引入 hucre 或第三方二进制 xlsx 库。
- 不改 `ReportDesignerProfile` 契约（`referencePickerId?` 加法归 NRP-4）。
- 不做二进制 `.xpt.xlsx` 解析。

## Scope

### In Scope

- `packages/report-designer-nop-report/` 包骨架 + workspace 接线（package.json、tsconfig.json、tsconfig.build.json、`vite.workspace-alias.ts`、根 `tsconfig.json` references）。
- `src/types.ts`（中间对象类型）+ `src/index.ts` 导出 + focused 类型测试。
- `packages/spreadsheet-core/src/types.ts` 的 `CellDocument.raw?` 向后兼容加法 + focused 测试。
- `docs/architecture/report-designer/codec-design.md`、`config-schema.md`、`inspector-design.md` 勘误/drift 收敛。
- roadmap §5 NRP-1 状态回写 + daily log。

### Out Of Scope

- codec 实现与 import/export 命令接线（NRP-2）。
- `referencePickerId?` 加法（NRP-4）。
- demo/e2e（NRP-5）。

## Failure Paths

不适用（NRP-1 无运行时行为变更；`raw?` 为纯可选加法，不改变任何既有读写路径）。

## Test Strategy

档位选择：`建议有测`。

- 中间类型与 `CellDocument.raw` 属类型/骨架层：补最小类型级与 focused passthrough 测试即可；codec 行为回归测试归 NRP-2（`必须自动化`）。
- 文档勘误部分不适用（无行为变更）。

## Execution Plan

### Phase 1 - 包骨架与中间类型

Status: completed
Targets: `packages/report-designer-nop-report/**`、`vite.workspace-alias.ts`、`tsconfig.json`

- Item Types: `Decision | Proof`

- [x] Decision：包落点为 `packages/report-designer-nop-report`（npm 名 `@nop-chaos/report-designer-nop-report`），依赖 `@nop-chaos/spreadsheet-core` + `@nop-chaos/report-designer-core`（workspace:\*）；不塞进 `report-designer-core`（避免 nop-report 语义污染通用 core，`nop-report-profile.md` §12/§13 职责划分）。按 AGENTS「Adding New Packages」完成四处接线。**执行修订（2026-10-26）**：NRP-1 仅落地纯类型骨架，两个 workspace 依赖推迟到 NRP-2 首个真实 import 时再加（`check:knip-baseline` 门禁拒绝未使用依赖）；NRP-2 计划须包含依赖回加。
- [x] Proof：`src/types.ts` 落地 `ExcelWorkbookLike` / `ExcelSheetLike` / `ExcelCellLike` / `XptWorkbookLike` / `XptSheetLike` / `XptCellLike`（以 `codec-design.md:62-110` 为基线，`raw` 保留无损扩展点），`src/index.ts` 导出。
- [x] Proof：focused 测试（构造样例对象 + 结构断言）证明类型 seam 稳定，供 NRP-2 依赖。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/report-designer-nop-report typecheck` 通过；新包在根 `pnpm typecheck`/`build`/`lint` 覆盖范围内。
- [x] `ExcelWorkbookLike` 等 6 个类型从包入口可导入，focused 测试通过。

### Phase 2 - spreadsheet unknown/props 载体裁定

Status: completed
Targets: `packages/spreadsheet-core/src/types.ts`

- Item Types: `Decision | Proof`

- [x] Decision：cell 级 unknown 字段载体为 `CellDocument.raw?: Record<string, unknown>`（新增可选字段，向后兼容加法）；workbook/sheet 级沿用既有 `WorkbookDocument.props?` / `WorksheetDocument.props?`，不重复加 `raw`。该裁定与 `codec-design.md` §6.3（cell raw preservation）/§6.2（sheet props preservation）对齐，勘误时在 codec-design.md 注明载体落点。
- [x] Proof：spreadsheet-core focused 测试——携带 `raw` 的 `CellDocument` 经既有构造/更新路径后 `raw` 保留（或证明既有路径不触碰 `raw` 即可视为保留），确保 NRP-2 codec 有稳定 passthrough 载体。

Exit Criteria:

- [x] `CellDocument.raw?` 存在且不影响既有类型兼容（`pnpm --filter @nop-chaos/spreadsheet-core typecheck` 及其 focused 测试通过）。
- [x] 裁定已记录于本 plan 本节与 `codec-design.md` 勘误注。

### Phase 3 - owner-doc 勘误与 drift 收敛

Status: completed
Targets: `docs/architecture/report-designer/codec-design.md`、`config-schema.md`、`inspector-design.md`

- Item Types: `Fix`

- [x] Fix：`codec-design.md:477-479` 就地勘误——历史裁决文本不改写，就地追加勘误注：codec 实现改为纯 TS、不引 hucre，取代 plan 477 裁决（依据 roadmap §4 用户裁定）；同时在 §6 载体处注明 NRP-1 裁定（cell=`raw`、workbook/sheet=`props`）。
- [x] Fix：`config-schema.md` §5/§6 收敛——`ReportDesignerConfig.expressions/adapters`、`FieldSourceConfig.mode/itemTemplate/dragPayload` 按 live `types.ts:135-157` 的真实形态改写（`kind?/fieldSources?/maxUndoDepth?/features?/inspector?/preview?` 与 `FieldSourceSnapshot` 形态）。
- [x] Fix：`inspector-design.md:114-127` host scope 字段名收敛为 live canonical `selectionTarget`（与同文 `:243` 一致）。

Exit Criteria:

- [x] 三份文档不再含与 live `packages/report-designer-core/src/types.ts` 冲突的契约描述；hucre 勘误注就地存在于 `codec-design.md` 原裁决小节。
- [x] 文档抽查：文中类型名/字段名均能在 live 代码中找到对应定义。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor）
- Rounds: 1
- Findings addressed: Minor 1（spreadsheet-core types.ts 行号漂移，已改为 :98/:42/:28）、Minor 2（`props` 应写 `props?` 可选，已改）、Minor 3（根 tsconfig 引用行号 :40-41 收窄为 :40，已改）。

## Closure Gates

- [x] 所有 in-scope confirmed live defect / contract drift 已收敛（config-schema.md / inspector-design.md drift、codec-design.md 前提失效）。
- [x] 行为/契约结果已达成：中间类型 + 包骨架 + `CellDocument.raw?` 载体落地。
- [x] 必要 focused verification 已完成（新包 + spreadsheet-core focused 测试）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red）

## Deferred But Adjudicated

（无——NRP-1 范围内无 deferred 项；范围排除项均属 roadmap §9 既有裁定，不由本 plan 重复记账。）

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: 2026-10-26 收口。中间类型 + 包骨架 + `CellDocument.raw?` 载体 + 三份 owner-doc 勘误/drift 收敛全部落地并通过独立子 agent closure audit（0 Blocker / 0 Major / 1 Minor，Minor 为 baseline 行号时点漂移，已就地标注）。NRP-1 交付不实现 codec 行为，roadmap §5 NRP-1 随本回写翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-26）
- Evidence: verdict `approved`——逐条复核 plan 声称（新包 4 处接线 + 6 Like 类型 + 3 tests；`CellDocument.raw?` + command-path passthrough 测试；codec-design.md 就地勘误；config-schema.md 逐字段对齐 live `ReportDesignerConfig`；inspector-design.md `selectionTarget`）；focused verification 全绿（新包 typecheck + 3/3、spreadsheet-core raw passthrough 2/2、flux-renderers-data 1263/1263）；依赖回加（NRP-2）执行修订记录诚实（plan Phase 1 / daily log / package.json 三处一致）。

Follow-up:

- NRP-2 起草时回加 `@nop-chaos/spreadsheet-core` + `@nop-chaos/report-designer-core` workspace 依赖（执行修订，见 Phase 1 Decision）。
- NRP-2/NRP-3 归 roadmap 队列，不属本 plan 剩余工作。
