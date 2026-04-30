# 146 Domain Host Projection And Vocabulary Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-26
> Source: `docs/skills/code-refactor-discovery-prompt.md`, `docs/references/refactoring-guidelines.md`, live repo audit of `packages/word-editor-renderers`, `packages/report-designer-renderers`, `docs/components/word-editor-page/design.md`, `docs/components/report-designer-page/design.md`, and `docs/architecture/word-editor/design.md`
> Related: `docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md`, `docs/plans/144-flux-execution-boundary-diagnostics-and-host-contract-tooling-plan.md`, `docs/plans/24-word-editor-development-plan.md`, `docs/plans/32-report-designer-schema-driven-refactor-plan.md`

## Purpose

这份计划单独收敛 complex domain host renderer 的 host projection / host vocabulary 边界，避免 `word-editor-page` 与 `report-designer-page` 在宿主 scope 上继续累积双事实来源、重复别名和文档 owner 漂移。

## Current Baseline

- `packages/word-editor-renderers/src/word-editor-page.tsx` 当前把 host scope 的 `document` 建立在 debounced autosave `savedDocument` 上，但同时把 `runtime` 与 `selection` 建立在实时 editor store 上；这形成了“实时 runtime/selection + 滞后 document”的混合 host projection。
- `packages/word-editor-renderers/src/word-editor-page.tsx` 中 `runtimeSnapshot` selector 还会在 editor store 热路径上构造新对象，并夹带 `datasetStore.getAll().length`、`charts.length`、`codes.length` 等外部来源，当前聚合边界不够清晰。
- `docs/components/word-editor-page/design.md` 仍写默认左侧是“大纲导航和数据集管理两个 Tab”、右侧是“属性面板”，但 live code 默认左侧是 `datasets/fields`，右侧是 `OutlinePanel`；文档 owner 已和实际默认布局脱节。
- `packages/report-designer-renderers/src/host-data.ts` 当前同时发布 `selection`、`target`、`selectionTarget`，以及多组顶层重复字段与 `designer.*` 内字段，host projection 词汇没有收敛到单一 canonical vocabulary。
- `packages/report-designer-renderers/src/renderers.integration.test.tsx` 已经直接依赖这些重复 host aliases 和 host projection shape；如果不先明确兼容策略，就无法安全收敛 projection vocabulary。
- `docs/components/report-designer-page/design.md` 与 `docs/architecture/report-designer/design.md` 当前只把 host projection 描述成“宿主 scope 数据快照”，但没有明确 selection/target 词汇、spreadsheet snapshot 混入规则、兼容 alias 边界和对外承诺。
- `docs/architecture/word-editor/design.md` 当前承认 page 会发布 host projection scope，但没有说明 `document` 到底是实时编辑快照、持久化快照，还是二者混合。
- 本轮 live audit 已确认这些问题属于一个独立 result surface：domain host owner 对内/对外的 projection contract 收敛，而不是 `runtime -> react -> form-advanced / CRUD / flow-designer` 热点边界收敛的一部分。

## Goals

- 为 `word-editor-page` 明确并落地单一、可解释的 host projection contract，区分实时 host state 与持久化/autosave snapshot 的角色。
- 为 `report-designer-page` 明确并落地单一 canonical host vocabulary，同时把兼容 alias 限制在可控边界。
- 让 host projection 的实现、测试、组件文档、架构文档使用同一套词汇和同一份可观察 baseline。
- 在不破坏现有可用扩展面的前提下，明确哪些 alias 继续保留兼容、哪些字段是 canonical read surface、哪些字段只应留在边界层。

## Non-Goals

- 不把 `word-editor`、`report-designer` 扩大成完整功能重写或 UI redesign。
- 不在本计划内重做 editor core、spreadsheet core、report designer core 的内部状态模型。
- 不把所有 domain host renderer 一次性统一成一套抽象框架；本计划只处理 `word-editor-page` 和 `report-designer-page`。
- 不把 `145` 里的 runtime/react/form-advanced/CRUD/flow-designer 热点重新拉回本计划。
- 不为了“词汇统一”而直接删除兼容 alias；是否删 alias 必须基于明确定义的 compatibility policy 和 focused verification。

## Scope

### In Scope

- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/word-editor-renderers/src/editor-canvas.tsx`
- `packages/word-editor-renderers/src/__tests__/*` 中直接验证 host projection / host status / page shell projection 的测试
- `packages/report-designer-renderers/src/host-data.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/renderers.integration.test.tsx`
- 与上述 contract 直接相关的 component docs、architecture docs、daily logs

### Out Of Scope

- `word-editor-core`、`report-designer-core`、`spreadsheet-core` 的内部状态或 command 系统重构
- 与 host projection 无关的 toolbar/panel/canvas UI 细节改造
- `report-designer` inspector/provider/profile 体系的大规模重构
- `word-editor` 数据集、图表、代码块功能扩展
- 机械拆分所有大测试文件；只处理直接依赖 host projection / host vocabulary 的测试

## Problem

当前两个 complex domain host renderer 都在同一个问题上继续漂移：host projection 已经成为 schema 片段、tests、docs、status publication 的公共读面，但“哪些字段是 canonical contract、哪些是兼容 alias、哪些只是实现期快照”仍没有收口。

- `word-editor-page` 把实时 runtime/selection 与 autosave document 混在一个 host scope 里，调用方无法从字段名判断时效性。
- `report-designer-page` 继续并列暴露多套同义 selection 词汇，consumer 很容易各自绑定不同别名。
- docs 只描述“大概有 host projection”，却没有把 projection contract 写成当前可执行 baseline。
- tests 已经开始固化这些历史并列字段和模糊语义，使后续收敛越来越难。

## Root Cause

- domain host page 最初优先满足“先可用”，host projection 往往以宽对象形式快速落地，后续缺少第二轮 vocabulary/semantics 收口。
- docs 和 tests 更早绑定到了宽 projection，而不是绑定到一个被命名的 canonical contract。
- host projection 天然跨越 runtime、page shell、slot rendering、status publication 和 tests，若没有 owner plan，很容易长期处于“大家都能读，但没人定义”的状态。

## Execution Plan

### Phase 1 - Freeze Host Projection Baseline And Compatibility Policy

Status: completed
Targets: this plan, `docs/components/word-editor-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/architecture/word-editor/design.md`, `docs/architecture/report-designer/design.md`

- [x] 基于 live repo 把 `word-editor-page` 与 `report-designer-page` 当前 host projection 字段、时效性、alias、statusPath 关系写成 repo-observable baseline。
- [x] 明确本计划的 compatibility policy：哪些字段是 canonical contract，哪些 alias 必须暂时保留，哪些字段只允许作为内部/edge compatibility carrier。
- [x] 明确 docs owner 和 code owner 的对应关系，避免后续一边改 projection、一边继续保留过时默认布局或模糊 host vocabulary 说明。
- [x] 明确 focused verification 入口，尤其是现有测试里哪些断言直接依赖旧 alias / 混合 projection。

Exit Criteria:

- [x] `word-editor-page` 与 `report-designer-page` 的 host projection baseline 已在本计划中以 repo-observable条目写清
- [x] canonical fields、compatibility aliases、internal-only carriers 三类边界已明确
- [x] 需要同步的 docs/components / docs/architecture 条目已列清
- [x] `docs/logs/` 对应日期条目已更新

#### Phase 1 Baseline: Word Editor Host Projection

Source: `packages/word-editor-renderers/src/word-editor-page.tsx` (lines 118-129)

Current `useHostScope()` fields projected into host scope:

| Host Field  | Source                                                                                                      | Timing                                                             | Category  | Notes                                                                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`  | `savedDocument?.data ?? { header, main, footer, charts, codes }`                                            | **Debounced (500ms)** — set via `EditorCanvas.onAutosave` callback | Canonical | This is a persisted/autosave snapshot, NOT the real-time editing state. The `document` field lags behind what the user sees on screen by up to 500ms. The manifest declares it as "Current word document and persisted placeholders." |
| `datasets`  | `datasetStore.getState().datasets` via `useSyncExternalStoreWithSelector`                                   | Real-time                                                          | Canonical | Reactive to dataset store mutations. Test in `word-editor-page.test.tsx:148-193` verifies reactivity.                                                                                                                                 |
| `runtime`   | `runtimeHostSummary` computed from `runtimeSnapshot` + `datasets.length` + `charts.length` + `codes.length` | Real-time (editor store driven)                                    | Canonical | Contains: `ready`, `dirty`, `wordCount`, `canUndo`, `canRedo`, `currentPage`, `totalPages`, `scale`, `datasetCount`, `chartCount`, `codeCount`.                                                                                       |
| `selection` | `editorStore.getState().selection` via `useSyncExternalStoreWithSelector`                                   | Real-time                                                          | Canonical | Contains formatting state: `bold`, `italic`, `underline`, `strikeout`, `font`, `size`, `color`, `highlight`, `rowFlex`, `level`, `listType`, `listStyle`, `rowMargin`, `undo`, `redo`.                                                |

**Identified issues:**

1. **Mixed timing**: `document` is a debounced autosave snapshot (~500ms lag), while `runtime` and `selection` are real-time editor store reads. A consumer reading `document` alongside `runtime.dirty=true` will see stale document content, not the current editor state.

2. **Cross-store contamination in selector**: The `runtimeSnapshot` selector (lines 78-95) reads from both `editorStore` and external React state (`datasetStore.getAll().length`, `charts.length`, `codes.length`). This forces a new object allocation on every editor store change, even if those counts haven't changed. The `runtimeHostSummary` memo (lines 104-116) partially mitigates this via `useMemo` with precise deps.

3. **Document scope confusion**: `document` field includes `charts` and `codes` from React state, but these may not match the autosave's embedded charts/codes. The fallback (line 121-125) synthesizes a document from React state when `savedDocument` is null.

**statusPath publication** (lines 233-252): Publishes a `WordEditorHostStatusSummary` to the parent scope. Fields: `kind`, `dirty`, `busy`, `canUndo`, `canRedo`, `wordCount`, `datasetCount`, `chartCount`, `codeCount`. This is a separate narrow read surface from the host projection.

**Focused verification entry points:**

- `packages/word-editor-renderers/src/__tests__/word-editor-page.test.tsx`: Tests host scope dataset projection reactivity (lines 148-193) and page shell marker (lines 195-223).
- No existing tests verify `document` timing semantics or `runtimeSnapshot` cross-store aggregation.

#### Phase 1 Baseline: Report Designer Host Projection

Source: `packages/report-designer-renderers/src/host-data.ts` (function `buildReportDesignerScopeData`, lines 137-197)

Current host projection fields:

| Host Field        | Source                                              | Category                | Notes                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `designer`        | Computed from `ReportDesignerCore` snapshot         | Canonical               | Contains: `kind`, `documentId`, `documentName`, `selectionTarget`, `selectionKind`, `inspector`, `inspectorPanels`, `fieldDrag`, `preview`, `activeMeta`, `fieldSources`, `fieldSourceCount`, `fieldCount`. |
| `runtime`         | Merged from report-designer + spreadsheet snapshots | Canonical               | Contains: `canUndo`, `canRedo`, `previewRunning`, `previewMode`, `dirty`.                                                                                                                                   |
| `spreadsheet`     | From `SpreadsheetRuntimeSnapshot` if available      | Canonical               | Contains: `workbook`, `activeSheet`, `selection`, `activeCell`, `activeRange`, `runtime`.                                                                                                                   |
| `fieldSources`    | `snapshot.fieldSources`                             | Canonical duplicate     | Also available as `designer.fieldSources`.                                                                                                                                                                  |
| `fieldDrag`       | `snapshot.fieldDrag`                                | Canonical duplicate     | Also available as `designer.fieldDrag`.                                                                                                                                                                     |
| `inspector`       | `snapshot.inspector`                                | Canonical duplicate     | Also available as `designer.inspector`.                                                                                                                                                                     |
| `meta`            | `snapshot.activeMeta`                               | Canonical duplicate     | Also available as `designer.activeMeta`.                                                                                                                                                                    |
| `preview`         | `snapshot.preview`                                  | Canonical duplicate     | Also available as `designer.preview`.                                                                                                                                                                       |
| `inspectorPanels` | `core.getInspectorPanels()`                         | Canonical duplicate     | Also available as `designer.inspectorPanels`.                                                                                                                                                               |
| `selection`       | `snapshot.selectionTarget`                          | **Compatibility alias** | Same value as `target` and `selectionTarget`.                                                                                                                                                               |
| `target`          | `snapshot.selectionTarget`                          | **Compatibility alias** | Same value as `selection` and `selectionTarget`.                                                                                                                                                            |
| `selectionTarget` | `snapshot.selectionTarget`                          | Canonical               | The canonical field name. Also inside `designer.selectionTarget`.                                                                                                                                           |
| `reportDocument`  | Merged report + spreadsheet document                | Canonical               | Active document snapshot.                                                                                                                                                                                   |
| `workbook`        | From spreadsheet or report snapshot                 | Canonical duplicate     | Derivable from `spreadsheet.workbook` or `reportDocument.spreadsheet.workbook`.                                                                                                                             |
| `activeSheet`     | Resolved from spreadsheet or report                 | Canonical duplicate     | Derivable from `spreadsheet.activeSheet`.                                                                                                                                                                   |
| `activeCell`      | From spreadsheet snapshot                           | Canonical duplicate     | Derivable from `spreadsheet.activeCell`.                                                                                                                                                                    |
| `activeRange`     | From spreadsheet snapshot                           | Canonical duplicate     | Derivable from `spreadsheet.activeRange`.                                                                                                                                                                   |
| `canUndo`         | Merged report + spreadsheet                         | Canonical duplicate     | Same as `runtime.canUndo`.                                                                                                                                                                                  |
| `canRedo`         | Merged report + spreadsheet                         | Canonical duplicate     | Same as `runtime.canRedo`.                                                                                                                                                                                  |
| `documentName`    | `snapshot.document.name`                            | Canonical duplicate     | Same as `designer.documentName`.                                                                                                                                                                            |
| `fieldCount`      | Computed via `getFieldCount()`                      | Canonical duplicate     | Same as `designer.fieldCount`.                                                                                                                                                                              |

**Identified issues:**

1. **Triple alias for selection target**: `selection`, `target`, and `selectionTarget` are identical values all pointing to `snapshot.selectionTarget`. Integration tests directly depend on both `target` and `selection` aliases (`renderers.integration.test.tsx:80` reads `data.target?.kind ?? data.selection?.kind`).

2. **Deep duplicate surface**: At least 10 top-level fields duplicate data already available inside `designer.*` or `spreadsheet.*` or `runtime.*`. These are convenience mirrors, not distinct contract surfaces.

3. **Test coupling to aliases**: `renderers.integration.test.tsx:90` reads both `data.spreadsheet?.activeSheet?.cells?.A1?.value ?? data.activeSheet?.cells?.A1?.value` — tests treat top-level convenience mirrors as primary read surfaces.

**statusPath publication** (`page-renderer.tsx` lines 186-202): Publishes `ReportDesignerHostStatusSummary` with: `kind`, `dirty`, `busy`, `canUndo`, `canRedo`, `previewRunning`, `selectionKind`, `fieldSourceCount`.

**Focused verification entry points:**

- `packages/report-designer-renderers/src/renderers.integration.test.tsx`:
  - Line 389-417: Tests `target` and `selection` aliases reactivity via `ReportTargetKindProbe`
  - Line 358-387: Tests `runtime.dirty` projection
  - Line 419-458: Tests spreadsheet namespace action + host scope projection
  - Line 56-67: `WorkbookTitleProbe` reads `reportDocument.semantic.workbookMeta.title`
  - Line 89-92: `ReportSpreadsheetA1Probe` reads both `spreadsheet?.activeSheet` and top-level `activeSheet`

#### Phase 1 Compatibility Policy

**Word Editor:**

| Field       | Status                                                           | Action                                                                   |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `document`  | Canonical, but **semantically confused** (autosave vs real-time) | Phase 2 will clarify timing without renaming. The field stays canonical. |
| `datasets`  | Canonical                                                        | No change.                                                               |
| `runtime`   | Canonical                                                        | No change. Phase 2 will fix cross-store selector allocation.             |
| `selection` | Canonical                                                        | No change.                                                               |

No word-editor compatibility aliases needed. The contract is already narrow (4 fields).

**Report Designer:**

| Field                                                                          | Status                                              | Action                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| `designer`                                                                     | Canonical                                           | No change.                                                       |
| `runtime`                                                                      | Canonical                                           | No change.                                                       |
| `spreadsheet`                                                                  | Canonical                                           | No change.                                                       |
| `selectionTarget`                                                              | Canonical                                           | Promote as the canonical selection field.                        |
| `selection`                                                                    | **Compatibility alias** for `selectionTarget`       | Keep for now. Phase 3 will limit to compat layer.                |
| `target`                                                                       | **Compatibility alias** for `selectionTarget`       | Keep for now. Phase 3 will limit to compat layer.                |
| `reportDocument`                                                               | Canonical                                           | No change.                                                       |
| `fieldSources`, `fieldDrag`, `inspector`, `meta`, `preview`, `inspectorPanels` | **Convenience mirrors** of `designer.*`             | Phase 3 will evaluate which to keep as convenience vs deprecate. |
| `workbook`, `activeSheet`, `activeCell`, `activeRange`                         | **Convenience mirrors** of `spreadsheet.*`          | Phase 3 will evaluate.                                           |
| `canUndo`, `canRedo`, `documentName`, `fieldCount`                             | **Convenience mirrors** of `runtime.*`/`designer.*` | Phase 3 will evaluate.                                           |

#### Phase 1 Docs Owner Mapping

| Doc                                              | Current State                                                                             | Owner   | Action Needed                                                                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/components/word-editor-page/design.md`     | Section 7 lists `document`, `datasets`, `runtime`, `selection` but doesn't clarify timing | Phase 2 | Update `document` description to clarify it's an autosave snapshot, not real-time editor content. Fix section 6 "left panel default" wording to match live code (left=datasets/fields, right=OutlinePanel). |
| `docs/components/report-designer-page/design.md` | Section 7 mentions host projection but lacks vocabulary definition                        | Phase 3 | Add canonical vocabulary section, document compat aliases.                                                                                                                                                  |
| `docs/architecture/word-editor/design.md`        | Mentions host projection scope but doesn't clarify `document` timing                      | Phase 2 | Add host projection timing semantics.                                                                                                                                                                       |
| `docs/architecture/report-designer/design.md`    | Section 11 defines host scope fields but doesn't distinguish canonical from aliases       | Phase 3 | Update section 11 to match canonical/alias policy.                                                                                                                                                          |

#### Phase 1 Focused Verification Map

**Word Editor tests that depend on host projection:**

- `word-editor-page.test.tsx:148-193`: Verifies `datasets` host scope reactivity — no alias dependency, canonical field only.
- `word-editor-page.test.tsx:195-223`: Verifies page shell marker — no host projection dependency.
- **No tests verify `document` timing or `runtime` cross-store aggregation.** Phase 2 will need to add these.

**Report Designer tests that depend on host projection aliases:**

- `renderers.integration.test.tsx:80`: `ReportTargetKindProbe` reads `data.target?.kind ?? data.selection?.kind` — **depends on both aliases**.
- `renderers.integration.test.tsx:90`: `ReportSpreadsheetA1Probe` reads `data.spreadsheet?.activeSheet?.cells?.A1?.value ?? data.activeSheet?.cells?.A1?.value` — **depends on top-level convenience mirror**.
- `renderers.integration.test.tsx:70-71`: `ReportRuntimeDirtyProbe` reads `data.runtime?.dirty` — canonical field, no alias.
- `renderers.integration.test.tsx:57-61`: `WorkbookTitleProbe` reads `reportDocument.semantic.workbookMeta.title` — canonical field.
- `renderers.integration.test.tsx:100`: `ReportProviderSpreadsheetProbe` reads `data.reportDocument?.semantic?.workbookMeta?.providerSheetId` — canonical field.

### Phase 2 - Converge Word Editor Host Projection Semantics

Status: completed
Targets: `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/word-editor-renderers/src/editor-canvas.tsx`, related focused tests and docs

- [x] 把 `word-editor-page` host projection 中实时 editor state 与 persisted/autosave snapshot 的角色明确拆分，避免 `document` 继续承担混合语义。
- [x] 收敛 `runtimeSnapshot` 聚合边界，避免 selector 在 editor store 热路径上持续返回新对象并夹带跨 store 读取而不声明 contract。
- [x] 保持 `statusPath`、namespaced actions、当前 page shell 外部交互语义不变，除非本计划明确声明新的 canonical field 命名并保留兼容路径。
- [x] 更新 `word-editor` 的 component/architecture docs，使默认 panel 布局、host projection 字段与当前 live baseline 一致。

Exit Criteria:

- [x] `word-editor-page` host projection 中实时字段与 persisted/autosave 字段的语义分工可从字段命名与 docs 直接判断
- [x] `document`、`runtime`、`selection` 等 host fields 的时效性和数据来源已通过 focused tests 锁定
- [x] `docs/components/word-editor-page/design.md`、`docs/architecture/word-editor/design.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Converge Report Designer Host Vocabulary And Alias Boundary

Status: completed
Targets: `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/renderers.integration.test.tsx`, related docs

- [x] 为 report designer host projection 定义 canonical selection/target vocabulary，并把兼容 alias 局限到最小必要边界。
- [x] 收敛顶层重复字段与 `designer.*` 内重复字段的关系，明确哪些是 public read surface、哪些只是 convenience mirror、哪些应移除或隔离。
- [x] 调整集成测试，使 tests 明确验证 canonical contract 和兼容策略，而不是继续把多个历史别名都当成主读面。
- [x] 更新 report designer component/architecture docs，把 host scope、selection target、spreadsheet snapshot 混入规则写成当前 baseline。

Exit Criteria:

- [x] report designer host projection 有一套被 docs/tests/shared code 同时采用的 canonical vocabulary
- [x] 兼容 alias 若仍保留，已被明确限制在 edge compatibility 层，并有 focused tests 说明其保留范围
- [x] `docs/components/report-designer-page/design.md`、`docs/architecture/report-designer/design.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Verification And Successor Boundary Audit

Status: completed
Targets: affected packages, focused tests, docs, this plan

- [x] 运行所有受影响包和 focused tests，确认 host projection 收敛没有引入 page shell、status publication、namespaced action regression。
- [x] 进行一次独立 closure-audit，确认没有把 `word-editor` / `report-designer` host projection 之外的 editor family work 偷偷吸回本计划。
- [x] 若仍有剩余 host-contract or manifest-level follow-up，明确 successor ownership，而不是让 Closure 保留模糊 debt。

Exit Criteria:

- [x] 相关 focused verification 全部完成并有可追溯证据
- [x] 所有受影响 docs 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新
- [x] 独立 closure audit 明确无剩余 plan-owned work，或已明确 successor plan

## Validation Checklist

- [x] `word-editor-page` host projection contract 已有 focused behavior tests
- [x] `report-designer-page` canonical vocabulary / compatibility alias policy 已有 focused behavior tests
- [x] docs/components 与 docs/architecture 对 host projection 的描述已同步到当前 baseline
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` (affected packages: word-editor-renderers, report-designer-renderers)
- [x] `pnpm build` (affected packages: word-editor-renderers, report-designer-renderers)
- [x] `pnpm lint` (affected packages: word-editor-renderers, report-designer-renderers)
- [x] `pnpm test` (affected packages: word-editor-renderers 64/64, report-designer-renderers 124/124)

## Risks And Rollback

- 若 `word-editor-page` 在不区分实时与持久化字段的情况下直接重命名 host fields，容易让现有 slot/schema consumer 读到错误时效性；必须先定义 compatibility policy，再做字段收敛。
- 若 `report-designer` 直接删除 `selection` / `target` / `selectionTarget` 中的任一别名而不先锁定 canonical contract 和兼容路径，集成测试与现有 consumer 很容易同时断裂。
- docs drift 若不和代码落地同步处理，会继续制造错误实现方向；因此本计划每个 phase 都把 docs 同步作为 exit criteria，而不是最后补文档。
- 回退策略以 phase 为单位：优先回退新的 canonical mapping/helper/compat layer，不回退已经验证的 page shell 或 core runtime 前置行为。

## Closure

Status Note: Both domain host projection contracts have been converged. Word editor: `editorRuntime` selector is now editor-store-only, cross-store counts are aggregated via independent subscriptions in `runtimeHostSummary`, `document` timing semantics are documented and tested. Report designer: `selectionTarget` promoted as canonical selection field, `selection`/`target` preserved as `@compat` aliases, convenience mirrors documented and classified, unused top-level mirrors removed from `ReportDesignerHostData` while preserving `inspector`/`inspectorPanels`/`meta` for existing consumers. All four phases passed independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: Independent closure audit subagent (ses_23626bb4effeO4lNilUYs1Bvvf)
- Evidence: All 4 phases PASS — word-editor-renderers 64/64 tests, report-designer-renderers 124/124 tests, typecheck/build/lint clean on both packages, docs verified against live code. See `docs/logs/2026/04-26.md` for execution entries.

Follow-up:

- No remaining plan-owned work. The `word-editor-page` `document` field remains an autosave snapshot rather than real-time; if a future requirement demands real-time document access, that would be a separate feature plan, not a vocabulary/boundary concern.
