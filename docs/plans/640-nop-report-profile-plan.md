# 640 nop-report Report Designer Profile 落地计划

> Plan Status: superseded
> Last Reviewed: 2026-10-17
> Superseded By: `docs/backlog/report-designer-nop-report-roadmap.md`（该 roadmap 取代本单一计划的编排方式；本文件保留为各 work item 计划的设计种子）
> Source: `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/nop-report-profile.md`、`docs/architecture/report-designer/codec-design.md`、`docs/analysis/2026-09-12-hucre-vs-report-designer-comparison.md`、`docs/audits/visual-quality/report-designer.md`、`docs/components/report-designer-page/design.md`
> Related: `docs/plans/477-visual-quality-v7-report-designer-plan.md`（completed；其 codec 方向裁决被本计划取代，见 Failure Paths / Supersession）、`docs/plans/628-deep-audit-remediation-plan.md`（active，无关）

## Purpose

> **Supersession Note（2026-10-17）**：本计划原为单一 owner plan，覆盖 codec→adapter→e2e→docs 全链路。用户裁定应改为 **roadmap + 每 work item 一个 plan** 的编排方式，故本计划的编排层职责由 `docs/backlog/report-designer-nop-report-roadmap.md` 接管，本文件状态改为 `superseded`。其 Phase 1–7 的详细 scope / exit criteria 保留为 roadmap 各 work item（NRP-1…NRP-5）起草计划时的设计种子；roadmap 的 §5 状态列为唯一动态状态源。

把已经落地且经过审计的**通用** Report Designer（spreadsheet core + report-designer core + renderers）收口为一个**可用的 `nop-report` 报表设计器**：补齐当前唯一缺失的部分——`nop-report` profile 及其实例化 adapter（模板 codec、字段源、字段拖放映射、inspector schema、预览、表达式编辑器/引用选择器），使「导入模板 → 编辑 → 属性面板编辑 XPT 语义 → 拖字段绑定 → 预览 → 导出模板」形成端到端闭环。

本计划是单一 owner plan（Minimum Rule 22/24/26）：上述能力同属「`nop-report` profile 可用」这一个结果面，共享同一组 adapter seam、同一组 owner-doc、同一组端到端验收，故在单 plan 内以 Phase 收口，不拆成多个零散 plan。

## Current Baseline

已成立（live repo 已核对）：

- 通用 report designer core 为真实实现且测试充分：`packages/report-designer-core/src/core.ts`（`ReportDesignerCore`）、`core-dispatch.ts`（命令处理）、`editor-core-adapter.ts`、`runtime/{registry,field-sources,inspector-panels,metadata,codec-commands,preview-commands,adapter-context}.ts`。
- adapter seam 已定义但无生产实现：`packages/report-designer-core/src/adapters.ts` 定义 `FieldSourceProvider`(:19)、`FieldDropAdapter`(:27)、`PreviewAdapter`(:41)、`TemplateCodecAdapter`(:59)、`ExpressionEditorAdapter`(:88)、`ReferencePickerAdapter`(:98)、`ReportDesignerAdapterRegistry`(:103)、`ReportDesignerProfile`(:169)；`createUnsupportedTemplateCodecAdapter`(:157) 是显式 throw 占位。
- 元数据平面可用：`packages/report-designer-core/src/types.ts` 的 `ReportSemanticDocument`(:34)（workbook/sheet/row/column/cell/range 六级 meta）+ `getTargetMeta`(:359)/`update*Meta`。cell 身份用 `address`（`packages/spreadsheet-core/src/types.ts:99,178-180`）。
- 通用 renderers 真实：`packages/report-designer-renderers/src/renderers.tsx` 注册 `report-inspector-shell`/`report-inspector`/`report-field-panel`/`report-designer-page`/`report-toolbar`；`report-spreadsheet-canvas.tsx` 为内嵌画布。
- spreadsheet 运行时真实：`packages/spreadsheet-core/src/commands-*.ts`（60+ 命令：值/公式/样式/merge/resize/hide/undo-redo/sort/filter/freeze/find/comment）、公式引擎 `formula/formula-engine.ts`。
- 演示为 mock：`apps/playground/src/pages/report-designer-demo.tsx`（自建 shell + 静态字段源 + 本地 drop adapter）、`report-designer-host-demo.tsx`（走生产 `report-designer-page` renderer + stub preview）。

真正剩余的 gap（本计划落点）：

- **无 `nop-report` profile**：`Xpt*Model` 在 `packages/`/`apps/` 零代码命中；`nop-report` 仅作为 renderer 的 CSS/标记前缀与 MIME（如 `packages/report-designer-renderers/src/report-field-panel.tsx:22` 的 `application/x-nop-report-field`、`report-designer-toolbar.tsx:81`、`page-renderer.tsx:639`、`inspector-shell-renderer.tsx:40`）以及一个以 `'nop-report'` 作 namespace key 的 core 测试（`packages/report-designer-core/src/__tests__/document-and-metadata.test.ts:101-109`）出现。
- **无生产 `TemplateCodecAdapter`**：live 导入/导出走 `noCodecConfigured` 失败路径（`runtime/codec-commands.ts:19-22`）。
- **`ExpressionEditorAdapter`/`ReferencePickerAdapter` 无实现、无消费点、且无 profile 选择字段**：`adapters.ts` 注册表 `expressions`/`references` map 仅在 `runtime/registry.ts:16-17` 构造、从未被读取；`ReportDesignerProfile`（`adapters.ts:169-178`）有 `codecId?`/`previewId?`/`inspectorSchemaId?`/`expressionEditorId?` 但**没有 `referencePickerId?`**，`runtime/registry.ts` 也没有对应 resolver。
- **无 `nop-report` field source / field drop / inspector schema / preview adapter**。
- **spreadsheet 无二进制 xlsx/CSV 导入导出**（全仓唯一 `xlsx` 依赖在 `packages/flux-renderers-scheduling` 且未在源码使用）。
- **owner-doc drift**：`docs/architecture/report-designer/config-schema.md` 描述的 `ReportDesignerConfig.expressions`/`adapters`（:`198-199`）、`FieldSourceConfig.mode/itemTemplate/dragPayload`（:`219-226`）在 live `packages/report-designer-core/src/types.ts:135-157` 不存在；`docs/architecture/report-designer/inspector-design.md:114-127` 仍以 `target`/`selection` 作为 host 投影字段，而 live canonical 投影用 `selectionTarget`（同文 `:243` 已用 `selectionTarget`，属同文档内不一致）。
- **codec 方向前提被本计划取代**：`docs/architecture/report-designer/codec-design.md:477-479`（plan 477 裁决）声明采纳 hucre 作为 codec 层依赖；本计划经用户裁定改为**纯 TS codec、不引 hucre**，该前提需就地勘误。

## Goals

- 实现 `nop-report` 报表设计器的 profile 装配：一条 `ReportDesignerProfile`（kind=`nop-report`）绑定字段源、字段拖放、codec、preview、expression/reference adapter 与 inspector schema。
- 实现纯 TS 两级 codec：`SpreadsheetDocument <-> ExcelWorkbookLike`（spreadsheet codec）+ `ReportSemanticDocument <-> XptWorkbookLike`（semantic codec）+ 组合的 `nop-report` template codec；保证 unknown 字段/props/raw 的无损 round-trip。
- 实现 `nop-report` 字段源 provider（数据集 → 字段树）与字段拖放 adapter（字段 drop → `semantic.cellMeta[sheetId][address]['nop-report'].model` 的 `field`/`ds` 等 patch）。
- 实现 `nop-report` inspector schema（cell Basic + cell XPT + sheet/workbook 级）并接入现有 inspector shell。
- 实现并消费 `ExpressionEditorAdapter`（expression-kind 属性）与 `ReferencePickerAdapter`（`rowParent`/`colParent` 地址引用选择）。
- 实现 `nop-report` preview adapter，并把 profile 用于一个真实形状的 demo 与 e2e，使 import/edit/drop/inspect/preview/export 端到端可验证。
- 收敛本计划触及的 owner-doc drift 与 codec 方向前提（就地勘误）。

## Non-Goals

- **不做 band / 分组头 / `expandType` 的 canvas 语义渲染**（带区模型已由 `docs/audits/visual-quality/report-designer.md` 显式 deferred；本计划只在 inspector 层编辑 XPT 字段，不做画布依赖图/展开预览布局）。
- **不引入 hucre 或任何第三方 xlsx 二进制库**；不在 `spreadsheet-core` 内实现完整 OOXML/xlsx 二进制读写。
- **不修改 `nop-entropy`（后端）代码**；profile 只消费双方约定的模型信封，不新增后端接口契约。
- **不改 `packages/flux-core/src/`**（protected，plan-first 之外的区域）。
- **不重定义通用 report designer core 契约**（adapter seam 已足够；如确需扩展，只做向后兼容的加法）。
- **不做移动端/大屏/打印设计器**。

## Scope

### In Scope

- `nop-report` profile 的 adapter 实现与装配（新包，见 Phase 1 Decision）。
- 两级 codec + round-trip 无损测试（spreadsheet / semantic / template）。
- field source provider、field drop adapter、inspector schema、expression editor、reference picker、preview adapter 的实现与消费点。
- demo 用真实形状的 `nop-report` 数据替换 mock；end-to-end e2e。
- 本计划触及的 owner-doc 收敛：`codec-design.md`、`config-schema.md`、`inspector-design.md`、`nop-report-profile.md`、`docs/components/report-designer-page/design.md`（如契约变更）。

### Out Of Scope

- 二进制 `.xpt.xlsx` 的 TS 侧解析/生成（由后端或 successor 承担；见 Failure Paths 的降级裁定）。
- 燃料/字号/条件格式/图片/图表/pivot 的 Excel 完整样式模型（沿用现有 `CellStyle` 子集；差异写入 Deferred）。
- `report-designer-renderers` 纳入 UI 一致性 gate 扫描集（独立治理项）。

## Failure Paths

> 说明：codec/预览链路的失败以结构化结果（`CodecImportResult.diagnostics[].code`）判别，而非 HTTP 错误码；无既有错误码词汇表的场景以 `codec-*`/`drop-*`/`preview-*` 作为 diagnostic code 前缀，实现时必须保持稳定可断言。

| 可测场景编号                    | 触发                                          | 行为（含错误码）                                                             | 可重试       | 用户可见表现               |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ------------ | -------------------------- |
| codec-import-structural-invalid | 导入信封缺少 workbook/sheets 结构             | `CodecImportResult.ok=false` + diagnostic `error`；不产生 document           | 是（换输入） | 错误提示，设计器保持原文档 |
| codec-import-semantic-partial   | spreadsheet 结构可解析但 XPT 语义层部分失败   | 导入成功 + `warning` diagnostics；语义缺失项按空处理                         | 是           | 可编辑，警告角标/日志      |
| codec-unknown-field             | 信封含 UI 未建模字段                          | 保留进 `raw`/namespaced meta，`info`/`warning`                               | 是           | 无感（导出不丢）           |
| codec-export-no-codec           | profile 未注册 codec                          | 维持 `noCodecConfigured`（既有 i18n 文案）                                   | 否           | 明确失败提示               |
| drop-unsupported-target         | 字段 drop 到非 cell/range 或 fieldType 不匹配 | adapter `canHandle=false` → 无 patch、无副作用                               | 是           | drop 无效果/回滚           |
| preview-aborted                 | 预览中再次触发/取消                           | 旧请求 abort，不覆盖 `preview.running`/`lastResult`（沿用既有单 owner 序列） | 是           | 显示最新一次结果           |

## Test Strategy

本档选择：**必须自动化**。

- codec 的 round-trip 无损、unknown 保留、merge 规范化为核心回归路径，Proof 项先于实现项写入各 Phase。
- profile adapter 契约（field source/drop/inspector/expression/reference/preview）需 focused 单测。
- 端到端 import/edit/drop/inspect/preview/export 需 Playwright e2e。

## Execution Plan

### Phase 1 - codec 契约、中间类型与包落点

Status: planned
Targets: `docs/architecture/report-designer/codec-design.md`、`docs/architecture/report-designer/nop-report-profile.md`、新包目录（待 Decision 定名）

- Item Types: `Decision | Proof`

- [ ] Decision：确定 profile 实现落点——推荐新建 `packages/report-designer-nop-report`（先读 `docs/architecture/flux-runtime-module-boundaries.md`，再遵循 `AGENTS.md`「Adding New Packages」步骤：`packages/<name>/`、`tsconfig.json`、`vite.workspace-alias.ts`、根 `tsconfig.json` references、`docs/logs/`）；记录为何不塞进 `report-designer-core`（避免 nop-report 语义污染通用 core，符合 `nop-report-profile.md:564-587` 职责划分）。
- [ ] Decision：确定 codec 外部信封契约——绑定 `nop-report` 的 XDSL workbook 模型（`/nop/schema/excel/workbook.xdef`，等价 `ExcelWorkbook + Xpt*Model` 的序列化形态），并明确二进制 `.xpt.xlsx <-> 模型信封` 由后端承担（本计划不实现二进制解析）。把该裁定与「纯 TS、不引 hucre」一并**就地勘误**写入 `docs/architecture/report-designer/codec-design.md:477-479`（Supersession Note：取代 plan 477 的 hucre 裁决），不改写历史文本。
- [ ] Proof：定义并落地中间对象类型 `ExcelWorkbookLike`/`ExcelSheetLike`/`ExcelCellLike`/`XptWorkbookLike`/`XptSheetLike`/`XptCellLike`（以 `codec-design.md:62-110` 为基线，`raw` 保留无损扩展点）。
- [ ] Proof：为上述类型补最小类型级测试（构造样例 + 类型守卫），确保后续 Phase 有稳定 seam。
- [ ] 收敛 owner-doc drift：把 `docs/architecture/report-designer/config-schema.md` 的 `ReportDesignerConfig.expressions`/`adapters`、`FieldSourceConfig.mode/itemTemplate/dragPayload` 与 `inspector-design.md` 的 `target`/`selection` 表述对齐到 live baseline（要么随本计划实现，要么就地标注为未实现/已移除）。`Fix`

Exit Criteria:

- [ ] 新包骨架可被 `pnpm --filter @nop-chaos/report-designer-nop-report typecheck` 通过（或明确记录不新建包的决定与替代落点）。
- [ ] `codec-design.md` 已就地勘误 codec 方向（hucre → 纯 TS）并注明取代 plan 477 裁决；`config-schema.md`/`inspector-design.md` drift 已收敛。
- [ ] 中间类型文件与最小类型测试存在且通过。

### Phase 2 - 两级 codec 与 round-trip

Status: planned
Targets: `packages/report-designer-nop-report/src/**`

- Item Types: `Proof | Fix`

- [ ] Decision：确定 spreadsheet 侧 unknown/props 的保真载体。live `packages/spreadsheet-core/src/types.ts` 的 `CellDocument`(:98-112)/`WorkbookDocument`/`WorksheetDocument` 无 `raw` 槽，`codec-design.md:123` 又要求“`SpreadsheetDocument.meta` 中的视图信息不回写”。裁定并落地：对 `CellDocument`/`WorksheetDocument`/`WorkbookDocument` **做向后兼容的加法**（新增可选 `raw?: Record<string, unknown>` 与/或使用既有 `WorksheetDocument.props`），作为未知字段/props passthrough 的唯一载体；该加法属 Non-Goals 允许的“向后兼容加法”，在 plan 内显式记录。
- [ ] Proof（先红）：写 `SpreadsheetDocument -> ExcelWorkbookLike -> SpreadsheetDocument` round-trip 测试，覆盖已知字段（值/公式/type/styleId/comment/linkUrl/protected/richText/merge/row-col 尺寸/hidden/sheet props passthrough）**以及 unknown 字段保真**（一个 UI 未建模的 cell/sheet/workbook 字段经 round-trip 后仍在 `raw`/props 中）。判别机制：导出时按已建模字段重建、丢弃 `raw`/props 的实现必挂；merge 未归一化为单一 `MergeRange` 的实现必挂。
- [ ] Proof（先红）：写 `ReportSemanticDocument -> XptWorkbookLike -> ReportSemanticDocument` round-trip 测试（workbook/sheet/cell model + unknown XPT 字段 + `rowParent`/`colParent` 地址保真）。判别机制：导出时按 inspector 可见字段裁剪 model 的实现必挂。
- [ ] Fix：实现 spreadsheet codec（su `codec-design.md` §4、§10：sheetId↔name 映射、cell address 身份、merge canonical `MergeRange`、稀疏 row/column 不膨胀）。
- [ ] Fix：实现 semantic codec（`semantic.*Meta['nop-report'].model` ↔ `Xpt*Like`；unknown 字段进 `raw`）。
- [ ] Fix：实现组合 `NopReportTemplateCodec implements TemplateCodecAdapter`（envelope decode/encode + 组合两个 codec），定义 `CodecDiagnostic` 分级（`codec-design.md` §11）。
- [ ] Fix：注册 codec，使 `runtime/codec-commands.ts` 的 import/export 从 `noCodecConfigured` 转向成功路径（保留无 codec 的失败路径给其它 kind）。

Exit Criteria:

- [ ] spreadsheet/semantic round-trip 测试存在且通过；unknown 字段与 `rowParent`/`colParent` 保真断言存在。
- [ ] `importTemplate`/`exportTemplate` 命令对已注册 profile 返回结构化结果信封（`{ ok, cancelled?, changed, error?, data? }`；`changed` 为必填，对齐 live `commands.ts:81-87`）。
- [ ] codec 层错误走 `CodecImportResult` 分级，不抛裸异常到命令层。

### Phase 3 - nop-report 字段源与字段拖放

Status: planned
Targets: `packages/report-designer-nop-report/src/**`

- Item Types: `Proof | Fix`

- [ ] Proof（先红）：field source provider 的 focused 测试（数据集树 → `FieldSourceSnapshot`，含 abort/错误路径）。
- [ ] Proof（先红）：field drop adapter 的 focused 测试（drop 到 cell → `cellMeta['nop-report'].model` 的 `field`/`ds` patch；fieldType 不匹配 → `canHandle=false`；drop 到 range 的裁定）。
- [ ] Fix：实现 `nop-report` field source provider（`FieldSourceProvider`，消费外部传入的数据集/字段上下文；`nop-report-profile.md` §5）。
- [ ] Fix：实现 field drop adapter（`FieldDropAdapter`，字段 → XPT `field`/`ds` patch；`nop-report-profile.md` §6）。
- [ ] Fix：按 `nop-report-profile.md` §6.2 裁定 range drop（首版单 cell；range 保留但显式 `Deferred But Adjudicated` 或实现批量 patch，二选一并记录）。

Exit Criteria:

- [ ] provider 与 drop adapter 单测存在且通过；非拖拽插入路径（`report-field-insert.ts`）与 drop 共用同一命令链。
- [ ] 无 mock 残留：demo 的字段源来自 provider 而非静态数组（该项在 Phase 6 端到端复核）。

### Phase 4 - inspector schema（Basic + XPT）

Status: planned
Targets: `packages/report-designer-nop-report/src/**`、`packages/report-designer-renderers/src/**`

- Item Types: `Proof | Fix`

- [ ] Proof（先红）：inspector schema 解析测试——按 `selectionTarget.kind`（workbook/sheet/cell）解析出对应 schema；无 inspector 时整侧隐藏（既有 `runtime/inspector-panels.ts` 行为）。
- [ ] Fix：生成 cell `Basic` tab（value/type/styleId/comment/linkUrl/protected）与 cell `XPT` tab（`field`/`ds`/`expandType`/`expandExpr`/`valueExpr`/`formatExpr`/`styleIdExpr`/`linkExpr`/`rowParent`/`colParent`/`exportFormula`/`editorId`/`viewerId`），读写 `meta['nop-report'].model`（`nop-report-profile.md` §7）。
- [ ] Fix：生成 sheet/workbook 级 inspector schema（sheet model、workbook model、命名样式入口）。
- [ ] Fix：expression-kind 字段标注机制（供 Phase 5 消费），并接入 `config.features.expressionEditor` feature gate。

Exit Criteria:

- [ ] inspector 在 cell 选择下渲染 Basic/XPT 两组字段；提交走 `report-designer:updateMeta`（或既有命令），回写 `semantic.cellMeta`。
- [ ] 表达式字段被标记为 expression-kind 且未退化渲染为普通输入框（Phase 5 前可先断言标记存在）。

### Phase 5 - expression editor 与 reference picker

Status: planned
Targets: `packages/report-designer-core/src/**`（消费点）、`packages/report-designer-nop-report/src/**`

- Item Types: `Proof | Fix`

- [ ] Proof（先红）：`ExpressionEditorAdapter`/`ReferencePickerAdapter` 注册后必须被消费——判别性测试：未注册时回退为普通输入/禁用，注册时渲染 adapter 产出的节点。
- [ ] Fix：为 `ReportDesignerAdapterRegistry.expressions`/`references` 增加消费路径（当前两个 map 从未被读取；在 inspector 渲染层解析 expression-kind/reference-kind 字段并调用 adapter）。
- [ ] Fix：给 `ReportDesignerProfile`（`packages/report-designer-core/src/adapters.ts:169-178`）做**向后兼容加法**新增 `referencePickerId?: string`，并在 `runtime/registry.ts` 增加与 `getCodecId`/`getPreviewProviderId` 并列的 resolver；这是 Non-Goals 允许的“向后兼容加法”例外，plan 内显式记录（`expressionEditorId?` 已存在，无需新增）。
- [ ] Fix：实现 `nop-report` 表达式编辑器 adapter（最小渲染 + `onChange` 回传；不固化表达式语言/补全协议，`design.md:110-124`）。
- [ ] Fix：实现 `nop-report` reference picker adapter（选中单元格/区域地址回填 `rowParent`/`colParent`；首版地址输入 + 选择器，`nop-report-profile.md` §9.1），并经 `referencePickerId` 装配。

Exit Criteria:

- [ ] 两个 adapter 的消费路径有判别性测试；未注册时既有行为不回退。
- [ ] `rowParent`/`colParent` 可通过 reference picker 填入并回写 `cellMeta`。

### Phase 6 - preview adapter、profile 装配、demo 与 e2e

Status: planned
Targets: `packages/report-designer-nop-report/src/**`、`apps/playground/src/pages/report-designer-*`、`tests/e2e/**`

- Item Types: `Proof | Fix`

- [ ] Fix：实现 `nop-report` preview adapter（导出当前 template 信封 → 调用预览接口 → 回传结果；沿用既有 preview 单 owner 序列与 abort 语义，`design.md:472-478`）。
- [ ] Proof：preview 取消/时序测试（过期请求不得覆盖 `preview.running`/`lastResult`）。
- [ ] Fix：提供 `createNopReportProfile()` / `registerNopReportAdapters(registry, options)` 装配函数，实例化一条完整 profile。
- [ ] Fix：把 demo（`report-designer-demo.tsx` / `report-designer-host-demo.tsx`）改为消费 profile + provider + codec（用真实形状的 XDSL 模型信封样本，不再用 mock 静态字段源/本地 drop adapter）。
- [ ] Proof：Playwright e2e——导入样本 → 选中 cell → inspector 编辑 `field`/`ds` → 拖字段 → 预览 → 导出，断言 `cellMeta` 与导出信封（程序化断言，非仅截图）。

Exit Criteria:

- [ ] demo 无 mock profile 残留；e2e 全链路通过。
- [ ] 导出信封经 semantic/spreadsheet codec 可再次导入，且 `cellMeta['nop-report'].model` 保真。

### Phase 7 - owner-doc 收敛与收口

Status: planned
Targets: `docs/architecture/report-designer/**`、`docs/components/report-designer-page/design.md`、`docs/logs/{year}/{month}-{day}.md`

- Item Types: `Fix | Proof`

- [ ] Fix：`docs/architecture/report-designer/nop-report-profile.md` 收敛为最终设计状态（去掉「若后续开始编码」的拟议语气，改为当前实现状态；只写最终设计，不写演进叙事，Minimum Rule 14）。
- [ ] Fix：`docs/components/report-designer-page/design.md` 与 `docs/architecture/report-designer/contracts.md` 如有契约变更同步收敛；`contracts.md` 若仍是「future contract draft」，收敛为与 live 一致的最终契约或显式标注为历史草案。
- [ ] Fix：更新 daily log（`docs/logs/{year}/{month}-{day}.md`）。
- [ ] Proof：本计划范围内新增/修改的 owner-doc 与 live code 一致性抽查。

Exit Criteria:

- [ ] 本计划触及的 owner-doc 全部与 live 基线一致，无残留「Proposed/待实现」表述。
- [ ] daily log 记录本 plan 收口状态。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_eb5f502ceffeh5h0hH0BP1oTpo` 首轮 + `ses_eb5ee609cffe1URlgAFt0laH41` 复审）
- Verdict: `pass-with-minors`（首轮 fail：0 Blocker / 3 Major；复审 pass：0 Blocker / 0 Major / 0 Minor）
- Rounds: 2
- Findings addressed:
  - Major M1（`ReferencePickerAdapter` 无 profile 选择字段）→ Phase 5 增加 `referencePickerId?` 加法 + resolver，并记录为允许的向后兼容加法。
  - Major M2（spreadsheet unknown/props 保真载体未定 + 缺判别性测试）→ Phase 2 增加载体 Decision 与 unknown 保真先红测试。
  - Major M3（baseline 关于 `nop-report` 出现的断言不实）→ 改写为 renderer MIME/CSS/标记前缀 + core 测试 namespace key。
  - Minor m1（新包步骤漏读 module-boundaries 文档）、m2（`changed` 必填）、m3（inspector-design drift 收窄到行）、m4（Closure Gates 补 `pnpm check`）、m5（Failure Paths 错误码说明）均已修正。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证在收口时跑一次。

- [ ] 所有 in-scope confirmed live defect 已修复（无生产 codec、adapter 无消费点等）。
- [ ] 所有 in-scope confirmed contract drift 已收敛（`config-schema.md`/`inspector-design.md`）。
- [ ] 行为/契约结果已达成：`nop-report` profile 端到端可用。
- [ ] 必要 focused verification 已完成（codec round-trip、adapter 契约、e2e）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] 受影响的 owner docs（`codec-design.md`/`config-schema.md`/`inspector-design.md`/`nop-report-profile.md`/`report-designer-page/design.md`）已同步到 live baseline。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增 red；新包携带 marker/CSS 时尤其注意）

## Deferred But Adjudicated

### 二进制 `.xpt.xlsx` 的 TS 侧解析/生成

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: codec 绑定 XDSL 模型信封，二进制转换由后端（nop-entropy 已具备 `ExcelWorkbook <-> .xpt.xlsx`）承担；profile 的 import/edit/export 闭环不依赖 TS 解析二进制。
- Successor Required: `yes`
- Successor Path: 待定（后续如需纯前端离线 xlsx，另开 plan）

### 带区/分组头/`expandType` canvas 语义渲染

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 已由 `docs/audits/visual-quality/report-designer.md` 显式 deferred；本计划只在 inspector 层编辑 XPT 字段即可使重用闭环成立。
- Successor Required: `yes`
- Successor Path: 待定（报表语义渲染 roadmap）

### range drop 批量生成循环区

- Classification: `watch-only residual`
- Why Not Blocking Closure: 首版单 cell drop 已覆盖主要绑定路径；range drop 属增强，不影响 profile 可用性。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- `report-designer-renderers` 纳入 UI 一致性 gate 扫描集（独立治理项）。
- Excel 完整样式模型（styleId 注册表、条件格式、图片/图表/pivot）扩展（`nop-report-profile.md` §1.2 差距表），归后续 plan。

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立子 agent 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- 无剩余 plan-owned work 时明确写明。
