# 750 NRP-2 两级 codec + round-trip（nop-report profile）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/report-designer-nop-report-roadmap.md`（NRP-2 work item）、`docs/plans/640-nop-report-profile-plan.md` Phase 2（设计种子，superseded）、`docs/architecture/report-designer/codec-design.md` §2/§4/§5/§7/§8/§11
> Related: `docs/plans/749-nrp1-nop-report-codec-contract-plan.md`（completed；NRP-1 载体裁定与中间类型）

## Purpose

实现纯 TS 两级 codec——`SpreadsheetCodec`（`SpreadsheetDocument <-> ExcelWorkbookLike`）与 `ReportSemanticCodec`（`ReportSemanticDocument <-> XptWorkbookLike`）——及组合的 `NopReportTemplateCodec`（implements `TemplateCodecAdapter`），以判别性 round-trip 测试证明 unknown 字段/props/`rowParent`/`colParent` 无损，并使已注册 profile 的 import/export 命令从 `noCodecConfigured` 失败路径转向成功路径。

## Current Baseline

- NRP-1 已落地（plan 749 completed）：`packages/report-designer-nop-report` 包骨架 + 6 个 `*Like` 中间类型；`CellDocument.raw?: Record<string, unknown>` 载体；workbook/sheet 沿用 `props?`。
- `TemplateCodecAdapter` 契约：`packages/report-designer-core/src/adapters.ts:59-70`（`importDocument(payload, context) -> ReportTemplateDocument`，`exportDocument(document, format, context) -> unknown`）；`createUnsupportedTemplateCodecAdapter`(:157) 是显式 throw 占位；无生产实现。
- 命令链完备：`report-designer:importTemplate`/`report-designer:exportTemplate`（`packages/report-designer-core/src/commands.ts:70-83`）经 `runtime/codec-commands.ts` 的 `resolveCodecAdapter` 解析；无 codec 时返回 `noCodecConfigured` 错误（`{ ok:false, changed:false, error }`，命令层包装，不裸抛）。
- import 成功路径已实现于 `core-dispatch.ts:237-266`（pushUndo + 替换 document + 重置 selection/inspector）；export 成功路径 `:268-286`（`data: exported`，`changed:false`）。
- `SpreadsheetDocument`/`WorkbookDocument`/`WorksheetDocument`/`CellDocument` 形状见 `packages/spreadsheet-core/src/types.ts`（`StyleDefinition`、`MergeRange`、`RowDocument`、`ColumnDocument`、`CellComment`）。
- `ReportSemanticDocument`（workbook/sheet/row/column/cell/range 六级 meta，`MetadataBag` namespaced）见 `packages/report-designer-core/src/types.ts:34-60`。
- 通用 core 测试基线：report-designer-core 212 tests、spreadsheet-core 339 tests 全绿。

## Goals

- `SpreadsheetCodec`：`ExcelWorkbookLike -> SpreadsheetDocument` 与反向；merge 以 `MergeRange[]` 为 canonical 表示，导入兼容 anchor-cell `mergeAcross`/`mergeDown` 语义并归一化；稀疏 row/column 不膨胀；`SpreadsheetDocument.meta`/`viewport` 视图信息不回写领域模型。
- `ReportSemanticCodec`：`XptWorkbookLike -> ReportSemanticDocument` 与反向，namespaced meta（`'nop-report'` 命名空间）映射；`rowParent`/`colParent` 保留原始表示。
- 组合 `NopReportTemplateCodec implements TemplateCodecAdapter`：外部信封 `{ format: 'nop-report-template', version, workbook, xpt? }` 的 decode/encode；`CodecDiagnostic`（info/warning/error）+ `CodecImportResult` 结构化结果；adapter 层错误以携带 diagnostics 的结构化 `CodecError` 抛出（命令层仍只见到 error，不裸异常逃逸）。
- 判别性 round-trip 测试：spreadsheet 与 semantic 两级各自的 `A -> Like -> A` 恒等；unknown 字段（cell/sheet/workbook 级）、sheet props passthrough、merge 归一化、`rowParent`/`colParent` 保真各有独立断言。
- import/export 命令对已注册本 codec 的 profile 走通成功路径（focused 测试驱动 `core.dispatch`）。

## Non-Goals

- 不实现 field source / field drop / inspector / preview / expression / reference adapter（NRP-3/4/5）。
- 不做二进制 `.xpt.xlsx` / CSV 解析；信封绑定 XDSL workbook 模型的 TS 序列化形态。
- 不修改 `TemplateCodecAdapter` 契约与 `core-dispatch.ts` 既有命令语义（本 plan 只新增 codec 与类型；如需 `referencePickerId?` 类加法归 NRP-4）。
- 不做 demo/e2e 装配（NRP-5）。

## Scope

### In Scope

- `packages/report-designer-nop-report/src/`：`spreadsheet-codec.ts`、`semantic-codec.ts`、`template-codec.ts`、`diagnostics.ts`（`CodecDiagnostic`/`CodecImportResult`/`CodecError`）、类型加法（`XptWorkbookLike`/`XptSheetLike`/`XptCellLike` 增 `raw?`）。
- package.json 回加 `@nop-chaos/spreadsheet-core` + `@nop-chaos/report-designer-core` workspace 依赖（NRP-1 执行修订的回加项）。
- 判别性 round-trip / unknown 保真 / merge 归一化 / 命令链 focused 测试。
- `codec-design.md` owner-doc 同步（如实现与 §4/§8 建议有出入，就地收敛为最终态）；roadmap §5 NRP-2 状态回写；daily log。

### Out Of Scope

- `report-designer-renderers` / playground / e2e 改动。
- Excel 样式模型增强（styleId 注册表等，roadmap §9 排除）。

## Failure Paths

| 可测场景编号                    | 触发                                          | 行为（含错误码）                                                                                    | 可重试       | 用户可见表现                                  |
| ------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| codec-envelope-missing-workbook | 信封缺 `workbook` 或 `workbook.sheets` 非数组 | `CodecImportResult.ok=false` + diagnostic `error`（code `codec-envelope-invalid`）；不产生 document | 是（换输入） | 命令返回 `{ok:false,error}`，设计器保持原文档 |
| codec-sheet-invalid             | 某 sheet 缺 `name`                            | `error`（code `codec-sheet-invalid`），import 失败                                                  | 是           | 同上                                          |
| codec-semantic-partial          | `xpt` 缺失或结构部分无效                      | import 成功（spreadsheet 层可解析）+ `warning` diagnostics；语义按空处理                            | 是           | 可编辑，警告随结果信封返回                    |
| codec-unknown-field             | 信封含 UI 未建模字段                          | 保留进 `raw`，diagnostic `info`（code `codec-unknown-field`），不中断                               | 是           | 无感（导出不丢）                              |
| adapter-throw-boundary          | codec 内部异常                                | 以 `CodecError`（携带 `diagnostics`）抛出，命令层捕获为 `{ok:false,error}`                          | 是           | 明确失败提示                                  |

## Test Strategy

本档选择：`必须自动化`。

- Proof 项先于 Fix 项：round-trip / unknown 保真 / merge 归一化测试先红后绿。
- 判别机制点名：按已建模字段重建并丢弃 `raw`/`props` 的导出实现必挂 unknown 保真断言；不归一化 anchor-cell merge 的实现必挂 merge canonical 断言；按 inspector 可见字段裁剪 model 的实现必挂 `rowParent`/`colParent` 保真断言。
- 命令链 focused 测试：注册本 codec 的 profile 经 `report-designer:importTemplate`/`exportTemplate` 成功，未注册 kind 仍走 `noCodecConfigured`。

## Execution Plan

### Phase 1 - diagnostics 类型与 spreadsheet codec

Status: completed
Targets: `packages/report-designer-nop-report/src/diagnostics.ts`、`spreadsheet-codec.ts`、`__tests__/spreadsheet-codec.test.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Proof（先红）：spreadsheet round-trip 判别性测试——已知字段全量（value/formula/type/styleId/comment/linkUrl/protected/richText/numberFormat/inline style、row height/hidden/styleId、column width/hidden/styleId、merges、sheet props、workbook styles/props）+ unknown 字段（cell/sheet/workbook 级各一，经 `raw`/`props` 保真）+ `SpreadsheetDocument.meta`/`viewport` 不回写断言。
- [x] Proof（先红）：merge 归一化判别性测试——anchor-cell `mergeAcross`/`mergeDown` 输入归一化为 `MergeRange[]`；导出回填 anchor 语义；canonical `MergeRange` round-trip 恒等。
- [x] Decision：`XptWorkbookLike`/`XptSheetLike`/`XptCellLike` 增加 `raw?: Record<string, unknown>`（向后兼容加法，承载非 nop-report 命名空间与 row/column/range meta 的保真）；`CodecDiagnostic`/`CodecImportResult`/`CodecError` 按 `codec-design.md` §11 落地。
- [x] Fix：实现 `SpreadsheetCodec`（`codec-design.md` §4：sheetId↔name 映射、address 身份、merge canonical、稀疏行列不膨胀、`meta`/`viewport` 不回写）。

Exit Criteria:

- [x] 上述测试存在且全部通过；旧式"重建丢 raw"实现下必挂的断言可指认。
- [x] `pnpm --filter @nop-chaos/report-designer-nop-report test` 全绿。

### Phase 2 - semantic codec + 组合 template codec

Status: completed
Targets: `packages/report-designer-nop-report/src/semantic-codec.ts`、`template-codec.ts`、`__tests__/semantic-codec.test.ts`、`__tests__/template-codec.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：semantic round-trip 判别性测试——workbook/sheet/cell 级 `model`（含 XPT 全部 inspector 字段 `field`/`ds`/`expandType`/`expandExpr`/`valueExpr`/`formatExpr`/`styleIdExpr`/`linkExpr`/`rowParent`/`colParent`/`exportFormula`/`editorId`/`viewerId`）+ unknown XPT 字段 + 非 nop-report 命名空间与 row/column/range meta 的 `raw` 保真。
- [x] Proof（先红）：组合 codec 信封测试——decode（缺 workbook 报 `codec-envelope-invalid`；缺 xpt 走 warning 降级）+ encode + full round-trip（`ReportTemplateDocument -> envelope -> ReportTemplateDocument` 恒等，cell model 保真）。
- [x] Fix：实现 `ReportSemanticCodec`（`semantic.*Meta['nop-report'].model` ↔ `Xpt*Like.model`；unknown 进 `raw`）。
- [x] Fix：实现 `NopReportTemplateCodec implements TemplateCodecAdapter`（envelope decode/encode + 组合两级 codec + `CodecDiagnostic` 分级 + `CodecError` 结构化抛出）。

Exit Criteria:

- [x] semantic/template 测试存在且通过；`rowParent`/`colParent` 原始表示保真断言可指认。
- [x] codec 层错误全部走 `CodecDiagnostic` 分级；`CodecError.diagnostics` 可断言。

### Phase 3 - 命令链接线 + owner-doc 回写

Status: completed
Targets: `packages/report-designer-nop-report/src/index.ts`、`package.json`、`docs/architecture/report-designer/codec-design.md`、`docs/backlog/report-designer-nop-report-roadmap.md`、`docs/logs/2026/10-26.md`

- Item Types: `Proof | Fix`

- [x] Fix：package.json 回加两个 workspace 依赖；`src/index.ts` 导出两级 codec、组合 codec、diagnostics 类型与 `createNopReportTemplateCodec()` 工厂。
- [x] Proof（先红→绿）：命令链 focused 测试——组装 registry（codecs map 注册本 codec）+ profile（kind=`nop-report`，codecId 指向），驱动 `createReportDesignerCore().dispatch({type:'report-designer:importTemplate'})` 成功替换 document；exportTemplate 返回信封；未注册 codec 的 profile 仍返回 `noCodecConfigured`。
- [x] Fix：`codec-design.md` 与实现不一致处收敛为最终态（如 §9 建议的包拆分与本包单文件组织的出入、§8 接口签名的落点）。

Exit Criteria:

- [x] 命令链测试存在且通过；`noCodecConfigured` 路径对无 codec profile 保持。
- [x] `codec-design.md` 无与 live 实现冲突的契约描述；roadmap §5 NRP-2 随 closure 回写 `done`。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 2 Minor）
- Rounds: 1
- Findings addressed: Minor 1（baseline spreadsheet-core 计数 341→339，已改）、Minor 2（新测试采用 `__tests__/` 目录布局与既有 colocated 并存，AGENTS 两种均允许，为有意约定，已在本记录注明）。

## Closure Gates

- [x] 所有 in-scope confirmed live defect 已修复（无生产 codec → 两级 codec + 组合 codec 落地）。
- [x] 所有 in-scope confirmed contract drift 已收敛（codec-design.md 与实现一致）。
- [x] 行为/契约结果已达成：判别性 round-trip + 命令链成功路径。
- [x] 必要 focused verification 已完成（round-trip/unknown/merge/命令链测试）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red）

## Deferred But Adjudicated

（无——范围排除项均属 roadmap §9 既有裁定。）

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: 2026-10-26 收口。两级 codec + 组合 codec + 判别性 round-trip/unknown/merge 测试 + 命令链成功路径全部落地；首轮 closure audit 发现 1 Major（`codec-unknown-field` info 诊断未实现）→ 补实现 + 2 测试后由独立 fresh agent 复核 `approved`（0 Blocker / 0 Major）。roadmap §5 NRP-2 随本回写翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session ×2：首轮 audit + 修复后 re-audit，2026-10-26）
- Evidence: 首轮 verdict `issues`（1 Major：Failure Path `codec-unknown-field` 未实现；2 Minor：Proof 复选框漏勾、§11 措辞）→ 全部修复后 re-audit verdict `approved`——逐文件核阅 5 个源模块与 4 个测试文件，28/28 tests 全绿，typecheck 干净；merge 归一化 / meta-viewport 排除 / CodecError diagnostics / rowParent-colParent 原始表示均确认为语义落地而非接口壳。

Follow-up:

- NRP-3/NRP-4/NRP-5 归 roadmap 队列，无剩余 plan-owned work。
