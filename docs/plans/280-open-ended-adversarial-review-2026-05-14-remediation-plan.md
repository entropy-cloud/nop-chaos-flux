# 280 Open-Ended Adversarial Review 2026-05-14 Remediation Plan

> Plan Status: in_progress
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md,round-05.md}`
> Related: `docs/plans/250-open-ended-adversarial-review-2026-05-12-remediation-plan.md`, `docs/plans/279-resolved-boolean-props-contract-plan.md`

## Purpose

收口 2026-05-14 开放式对抗性审查确认的 spreadsheet host/widget seam、detail-view viewer invalidation、data-source structural publication paths、Flow Designer canvas reconciliation、以及 table filter/pagination composition defects。

完成态要求：所有 in-scope confirmed live defects 都有最小正确修复、focused regression proof、必要 owner-doc sync 或明确 `No owner-doc update required`，并通过 workspace `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 与独立 closure audit。

## Current Baseline

- `round-01` 确认 `spreadsheet-page` 文档承诺没有自定义 `body` 时提供默认 spreadsheet canvas，但 live `page-renderer.tsx` 只渲染 `renderFallbackBody(...)` 诊断块，schema 作者拿到的是不可编辑 shell。
- `round-01` 还确认 spreadsheet `readOnly` 只在 core dispatch 层拦截 mutation，shared UI 仍允许进入 edit mode、公式栏本地更新、toolbar/context-menu mutation affordances 和 readonly 失败后滞留状态。
- `deep-audit-batch1` 中与同一 spreadsheet interaction surface 重叠的 retained defects `04-07`（field-drop single-gesture history split at `report-spreadsheet-canvas.tsx`) 与 `07-01`（`useResize` render-phase preview reset at `spreadsheet-interactions/use-resize.ts`）也必须在本计划 Phase 1 一并收口；它们不能由并行计划单独 touching 同一 readonly/interaction execution surface。
- `round-02` 确认 `detail-view` 为修 stale viewer 内容，在 render path 对 `currentValue` object 做 `JSON.stringify(...)` 并作为 React key，导致大对象渲染成本、circular fallback stale risk、以及 viewer subtree remount/focus/state loss。
- `round-03` 确认 spreadsheet shortcut handler 挂在 `window`，只跳过 input/textarea，不按 owning grid/root 聚焦隔离；多实例或页面其它区域按键可触发 unfocused spreadsheet commands。
- `round-03` 还确认 `data-source.name` / `statusPath` authoring 是结构 publication path，但 compiler 通过 `compileValue<string>` 接受动态表达式，runtime 注册时只求值一次并冻结 target/status path、ignored roots 和 name index。
- `round-04` 确认 Flow Designer React Flow sync 的 `lastCommittedPositionsRef` 在节点拖拽后长期保留，仅凭 position signature 相等就返回 stale local node，后续 core snapshot 的 label/data/selection/tree metadata 更新可能不进入 canvas。
- `round-05` 确认 Table client-side filtering 先过滤再用旧 `currentPage` slice，同时 pagination bar 的 `totalRows` / `totalPages` 仍来自 unfiltered `source.length`，导致 later-page filter 可显示空表和错误总数。
- `docs/plans/279-resolved-boolean-props-contract-plan.md` owns boolean-like props contract cleanup. 本计划不得重复接管 `tabs.items.disabled` 等 boolean normalization；Phase 1 的 spreadsheet readonly fixes 只消费 live `props.props.readOnly` / `snapshot.runtime.readonly` / `SpreadsheetHostSnapshot.readonly` 等已经 resolved 的 boolean signal。若需要 expression-authored `readOnly` coverage，必须先完成或显式依赖 Plan `279`，不能在本计划里添加 renderer-side coercion。
- Earlier table/CRUD plans, especially Plan `250`, closed sort shape, rowKey select-all, table slot, hidden-field, and tree-control defects. This plan owns only the newly confirmed client-side filtered pagination row-universe mismatch from `round-05`.

## Goals

- Make standalone `spreadsheet-page` useful by default: no custom body must render the shared workbook canvas/toolbar/tab surface instead of a diagnostic-only fallback.
- Make spreadsheet readonly and keyboard behavior enforce owner interaction boundaries at the UI layer, not only core dispatch.
- Replace `detail-view` serialized remount invalidation with a precise, cheap, lifecycle-safe viewer refresh path.
- Make data-source publication paths structural: either reject dynamic `name` / `statusPath` at validation/compile time or implement full re-registration semantics. Preferred direction is reject ordinary expression/template paths for structural publication fields.
- Fix Flow Designer canvas reconciliation so post-drag position smoothing never suppresses later core-owned node render data updates.
- Fix Table filtered pagination so rendered rows, total rows/pages, and active page are derived from the same filtered row universe.

## Non-Goals

- 不重写 spreadsheet core command model or workbook data model beyond UI/default host composition needed for these defects.
- 不把 spreadsheet/report designer split-brain、undo history, or external snapshot aliasing issues from older reviews纳入本计划。
- 不把 all renderer stale-region invalidation or `JSON.stringify` usage across the repo纳入本计划；只处理 `detail-view` viewer key path。
- 不重新设计 data-source dependency tracking, API cache, stale run gating, or formula registry DI。
- 不接管 Plan `279` 的 boolean-like prop validation/runtime normalization。
- 不重构 Flow Designer React Flow adapter wholesale or optimize batch drag performance; only fix the stale local node veto and required tests/docs.
- 不实现 server-side table pagination total model；本计划只处理 client-side filtered row universe.

## Scope

### In Scope

- Spreadsheet host/renderers: `packages/spreadsheet-renderers/src/{page-renderer.tsx,use-spreadsheet-interactions.ts,spreadsheet-grid.tsx,sheet-tab-bar.tsx,bridge.ts,spreadsheet-toolbar/**,spreadsheet-grid/**,spreadsheet-interactions/**}` and focused tests.
- Spreadsheet consumers that compose shared primitives: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`, relevant report-designer tests, and playground/demo call sites if shared signatures change.
- Spreadsheet docs: `docs/architecture/report-designer/api.md`, `docs/architecture/report-designer/design.md`, and any component docs that describe `spreadsheet-page` default body/readOnly behavior.
- Detail-view renderer: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` and focused owner/viewer update tests.
- Runtime/compiler data-source structural path validation: `packages/flux-core/src/types/{schema.ts,compilation.ts}`, `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-compiler/src/schema-compiler/{shape-validation.ts,shape-validation-rules.ts}`, `packages/flux-runtime/src/async-data/source-registry.ts`, focused compiler/runtime data-source tests, and relevant docs such as `docs/architecture/api-data-source.md`, `docs/architecture/form-external-publication-and-reserved-bindings.md`, `docs/architecture/field-binding-and-renderer-contract.md`.
- Flow Designer React Flow bridge: `packages/flow-designer-renderers/src/designer-xyflow-canvas/{use-xyflow-sync.ts,use-xyflow-interactions.ts,xyflow-utils.ts,designer-xyflow-canvas.tsx}`, `packages/flow-designer-renderers/src/{canvas-bridge.test.tsx,designer-xyflow-canvas/*.test.tsx}`, and Flow Designer canvas docs.
- Table renderer data pipeline: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/{table-data.ts,use-table-filter.ts,use-table-pagination.ts,use-table-controls.ts}`, table control/data tests, and table docs if they describe filter/pagination totals.
- `docs/logs/2026/05-14.md` and this plan.

### Out Of Scope

- Existing unrelated worktree changes outside these files.
- Fixed-key Word Editor localStorage, autosave dirty semantics, and accepted test hooks from previous analyses.
- Code editor CSS/toolbar/validation payload/scope subscription findings from older audits.
- Array-field non-form validation/subscription defects already recorded in prior analysis.
- Global formula registry DI, tree-shaking, and general package boundary work.

## Execution Plan

### Phase 1 - Repair Spreadsheet Default Host And Readonly Interaction Boundary

Status: completed
Targets: `packages/spreadsheet-renderers/src/**`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`, spreadsheet/report-designer docs/tests

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Re-audit live `SpreadsheetPageRenderer` body composition and define the default standalone host shell. The supported outcome is a real default canvas; documentation-only downgrade to “body is required” is not a valid closure for the confirmed `round-01` live defect.
- [x] [Fix] Replace the diagnostic fallback-only default with a real default spreadsheet body using existing shared primitives without duplicating workbook state owners.
- [x] [Fix] Add or reuse a default-page-body/helper that concretely owns bridge creation via `createSpreadsheetBridge`, `useSpreadsheetInteractions(...)` wiring, root/focus ref ownership, default row/column dimensions, toolbar/grid/sheet-tab/dialog/status composition, and fallback diagnostics only for genuinely unrecoverable setup errors.
- [x] [Fix] Update shared primitive call sites, including `report-spreadsheet-canvas` and playground/demo usages if signatures change, so readonly/root-scope changes typecheck and preserve existing Report Designer behavior.
- [x] [Fix] Thread the owning spreadsheet root/grid ref or active focus state into `useKeyboard(...)` and ignore shortcuts whose event target is outside the owning spreadsheet root or inside editable controls, matching the Flow Designer root containment pattern.
- [x] [Fix] Gate edit start, formula/cell local update paths, toolbar mutation buttons, context-menu mutation items, sheet-tab add/remove/rename affordances, fill/drop/resize mutation affordances, and save/commit paths on `snapshot.readonly` or the canonical readonly signal.
- [x] [Fix] Close the overlapping spreadsheet interaction residuals from `deep-audit-batch1`: `04-07` field-drop must no longer split a single gesture across multiple owner-local history units, and `07-01` resize preview reset must no longer perform render-phase state updates on the shared spreadsheet interaction surface.
- [x] [Decision] For field-drop specifically, either block `handleFieldDrop` / drag-over preview while readonly and add proof, or explicitly record that field-drop is not mounted/user-reachable in the supported default host. It cannot be silently skipped.
- [x] [Fix] Ensure readonly command rejections do not leave local `editingCell`, formula-bar, or transient UI state stuck in an optimistic edited state.
- [x] [Proof] Add focused tests proving default `spreadsheet-page` renders an editable/visible canvas without custom `body`, readonly blocks visible mutation affordances and edit entry including sheet tabs and field-drop if mounted, Report Designer shared consumers remain wired, and shortcuts do not fire from outside the owning root or across sibling instances.
- [x] [Decision] Update spreadsheet/report-designer docs to the final default body and readonly UI contract.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `spreadsheet-page` with no custom `body` renders the documented default workbook canvas/toolbar/tab surface and no longer closes this defect by docs-only downgrade.
- [x] Readonly spreadsheet UI prevents user mutation entry points before dispatch, while allowed readonly commands such as selection/copy/find remain available.
- [x] Sheet-tab mutations and field-drop behavior are either readonly-gated and test-covered or explicitly non-mounted/non-user-reachable in the supported default host.
- [x] The shared spreadsheet interaction surface no longer retains the `04-07` multi-history field-drop split or the `07-01` render-phase resize preview reset defect.
- [x] Shared spreadsheet primitive consumers such as Report Designer still typecheck and have focused coverage where signatures or readonly behavior changed.
- [x] Spreadsheet shortcuts are scoped to the owning root/focused instance and cannot mutate an unfocused sibling instance.
- [x] Focused tests cover default body, readonly UI gates, and root-scoped shortcuts.
- [x] Affected spreadsheet/report-designer docs describe the final live baseline.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Replace Detail View Serialized Viewer Remounting

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, detail-view tests

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Reproduce why `viewerRenderKey` was added by reviewing `detail-view-owner-updates.test.tsx` and live region/scope update behavior; choose a precise invalidation strategy before removing serialization.
- [x] [Fix] Remove render-phase `JSON.stringify(currentValue)` and React key remounting based on serialized business data.
- [x] [Fix] Ensure viewer slot sees confirmed value updates through normal scope/region invalidation, a narrow revision token, or a stable owner generation that changes only when the viewer's effective value owner changes.
- [x] [Fix] Preserve child viewer subtree lifecycle/focus where unrelated fields change and the viewer slot does not need remount.
- [x] [Proof] Add focused regression tests covering first/second confirm viewer updates, large object/circular object safety, and no forced remount for unrelated sibling changes when viewer dependencies are unchanged. At least one test must use a viewer probe with mount count or focus/local state, not only text content.
- [x] [Decision] Update `docs/architecture/performance-design-requirements.md` or renderer-runtime docs only if the final invalidation model changes documented renderer contract; otherwise record `No owner-doc update required`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `detail-view` render path no longer deep-serializes `currentValue` or uses serialized data as a React key.
- [x] Existing viewer update behavior remains correct after confirmed detail value changes.
- [x] Circular or non-JSON-serializable values do not reintroduce stale viewer behavior or render exceptions.
- [x] Focused tests prove update correctness and lifecycle preservation.
- [x] Owner-doc update is completed or explicitly recorded as `No owner-doc update required`.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Close Data-Source Structural Publication Path Drift

Status: completed
Targets: `packages/flux-core/src/types`, `packages/flux-compiler/src`, `packages/flux-runtime/src/async-data`, data-source docs/tests

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Freeze the final authoring contract for `data-source.name` and `statusPath`. Preferred direction: structural literal paths only; `${expr}` and template strings are invalid for these fields.
- [x] [Fix] Adjust compiler/source types or compilation output so `compiled.targetPath` / `compiled.statusPath` are plain static structural strings, or are statically guaranteed compiled values that cannot contain runtime expressions. The chosen representation must not leave runtime registration with a partial dynamic/static split.
- [x] [Fix] Add schema validation diagnostics for dynamic expression/template values and ordinary invalid non-string values in `data-source.name` / `statusPath`.
- [x] [Fix] Simplify `source-registry` registration so target/status path, ignored roots, debug snapshot, host issue details, and `nameIndex` all use the same static structural path baseline.
- [x] [Proof] Add compiler/runtime tests proving static paths work, dynamic path expressions/templates are rejected by validation, `nameIndex` works for static names, and ignored-root filtering uses the static final paths. Include tests in the source compiler and schema validation suites that cover `shape-validation-rules.ts` / `shape-validation.ts` integration.
- [x] [Decision] Sync data-source docs and field-binding docs to state whether these fields are structural and read-once.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] No accepted data-source schema can author dynamic `name` or `statusPath` publication paths without full dynamic ownership semantics.
- [x] Runtime source registration no longer has a partial dynamic/static split for target/status path or `nameIndex`.
- [x] Diagnostics identify invalid dynamic structural paths before runtime.
- [x] Focused tests cover accepted static publication and rejected dynamic publication.
- [x] Affected data-source / field-binding docs describe the final structural path contract.
- [x] `docs/logs/2026/05-14.md` includes Phase 3 execution notes.

### Phase 4 - Fix Flow Designer Post-Drag Canvas Reconciliation

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-xyflow-canvas/**`, Flow Designer tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Define the React Flow sync invariant: local UI may preserve transient drag position, but core snapshot data/selection/render metadata remains authoritative after drag acknowledgement.
- [x] [Fix] Change `useXyflowSync` so matching committed position does not return the entire stale local node when snapshot node data or render-relevant fields changed.
- [x] [Fix] Clear or narrow `lastCommittedPositionsRef` after the snapshot acknowledges the move, or merge only the transient local `position` field while always taking snapshot `data`, `selected`, dimensions, and type metadata.
- [x] [Fix] Preserve legitimate drag smoothing without reintroducing snap-back while core move command catches up.
- [x] [Proof] Add focused tests simulating a committed node drag followed by a snapshot with same position and changed `data.label`, selection, or tree metadata; canvas nodes must receive updated data. Prefer a dedicated `use-xyflow-sync` hook/unit test or an improved React Flow mock that actually exercises the sync effect, not only `canvas-bridge.test.tsx` callback translation.
- [x] [Decision] Update `docs/architecture/flow-designer/canvas-adapters.md` if the sync invariant needs explicit documentation; otherwise record `No owner-doc update required`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Post-drag committed-position cache cannot suppress later core-owned node data/label/selection updates.
- [x] Drag smoothing remains functional and does not snap moved nodes back during normal command acknowledgement.
- [x] Focused tests fail on the stale local-node behavior and pass after the fix.
- [x] Flow Designer canvas docs are updated if the public adapter invariant changes; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-14.md` includes Phase 4 execution notes.

### Phase 5 - Align Table Filtered Rows With Pagination State

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer*`, table tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Define the client-side filtered pagination contract across local, scope-owned, and controlled pagination: filter/search changes reset to page 1 or clamp current page to filtered `totalPages`. Preferred direction: reset/clamp local and scope-owned state; for controlled mode, choose and test one concrete behavior before coding: emit `onPageChange(1/clamped)` after `onFilterChange`, render a clamped effective page without mutating props, or document a different owner signal.
- [x] [Fix] Split table processing into filtered/sorted row derivation plus paginated slice so `filteredRowCount`, `totalPages`, `totalRows`, and visible body use one filtered row universe.
- [x] [Fix] Ensure filter/search/clear actions reset or clamp pagination consistently for local and scope ownership without silently mutating controlled props.
- [x] [Fix] Update pagination bar rendering so it hides or shows totals according to filtered row count, not unfiltered `source.length`.
- [x] [Proof] Add focused tests for being on page 3, applying filter/search leaving one row, and seeing that row plus `1` filtered total page/row count. Include local and scope pagination ownership; include controlled-mode behavior and `onFilterChange` / `onPageChange` ordering according to the chosen contract.
- [x] [Decision] Update table docs/component docs if they describe filter/pagination totals; otherwise record `No owner-doc update required`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Filtering/searching cannot produce an empty later-page slice when matching rows exist on earlier filtered pages.
- [x] Table body, `totalRows`, and `totalPages` are computed from the same filtered/sorted row universe.
- [x] Local, scope, and controlled pagination modes have explicit behavior and focused tests for filter changes.
- [x] Table docs are synced if the user-visible contract changes; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-14.md` includes Phase 5 execution notes.

### Phase 6 - Verification And Independent Closure Audit

Status: in_progress
Targets: affected packages, this plan, daily log, closure evidence

- Item Types: `Proof | Fix | Decision`

- [x] [Proof] Run all focused tests added or modified by Phases 1-5.
- [ ] [Proof] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and full workspace `pnpm test` after all code/doc updates land. Run focused/package tests first for debugging, but full `pnpm test` remains a closure gate unless this plan is explicitly revised before implementation with concrete successor ownership for an unrelated pre-existing blocker.
- [x] [Fix] Update `docs/logs/2026/05-14.md` with execution, verification, and any docs-sync decisions.
- [ ] [Decision] Perform an independent closure audit with a fresh subagent after implementation and verification, requiring it to re-read this plan, live code, focused tests, affected docs, and the original five analysis rounds.
- [ ] [Fix] Address any closure-audit blocker before marking this plan completed; if the audit identifies a truly out-of-scope residual, move it to `Deferred But Adjudicated` with a concrete non-blocking reason or successor plan.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused verification for all five defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass after all in-scope remediation lands. If a pre-existing unrelated failure is discovered, this plan cannot be marked `completed` until the failure is fixed or this plan is explicitly revised with non-conflicting closure gates and concrete successor ownership.
- [ ] Independent closure audit confirms no remaining plan-owned blocker, no interface-vs-semantics mismatch, and no in-scope defect silently downgraded to follow-up.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Plan Review Iterations

### Iteration 1

Status: completed

- [x] Independent reviewer checks this plan against the five analysis rounds, live repo paths, plan authoring guide, and recent plan style.
- [x] Blocking findings are applied to this plan.
- [x] Reviewer confirms whether another review iteration is required.

Findings resolved:

- Removed the documentation-only downgrade path for the confirmed `spreadsheet-page` default canvas defect.
- Added concrete spreadsheet default host shell/bridge/root-focus composition requirements.
- Added shared consumer targets for Report Designer and playground/demo call sites when shared spreadsheet primitive signatures change.
- Added sheet-tab and field-drop readonly gates/proof requirements.
- Clarified Plan `279` ordering and no-coercion boundary for spreadsheet `readOnly` expression support.
- Added `shape-validation-rules.ts` and focused validation/source compiler coverage for data-source structural paths.
- Strengthened detail-view, Flow Designer, and Table proof requirements to cover mount lifecycle, real sync effects, and filter/page event ordering.
- Replaced vague test gates with explicit workspace `pnpm test` closure gate.

Review evidence:

- `ses_1da93f1a3ffePLBtjUzKQytpJX`: plan completeness review found spreadsheet docs-downgrade and vague test gates as blockers.
- `ses_1da93f03fffeknQAAh6TAGpw6w`: code executability review found missing spreadsheet consumers/default shell details, Plan `279` dependency, and missing validation targets.
- `ses_1da93f028ffejocyH3oupqVLDk`: scope/dedupe review found missing sheet-tab and field-drop readonly closure requirements.

### Iteration 2

Status: completed

- [x] Independent reviewers rechecked the revised plan for guide compliance, code executability, and duplicate ownership.
- [x] No blocking findings remained after Iteration 1 revisions.
- [x] Review consensus reached; no additional plan-review iteration is required before implementation begins.

Consensus evidence:

- `ses_1da8a5691ffeDcxvqgs6lsarbi`: plan-authoring review found no blockers; only non-blocking reminder to avoid ambiguous optional checklist items before final closure.
- `ses_1da8a54dbffeUxLYO6FuCr9IZ5`: code-executability review found no blockers and confirmed all five defect-family phases are actionable.
- `ses_1da8a54c0ffeiHqokhHW4cTZjk`: scope/dedupe review found no duplicate active-plan ownership and no confirmed defect hidden in follow-up/out-of-scope sections.

### Additional Iterations

Status: cancelled

No additional plan-review iteration is required before implementation because Iteration 2 reached no-blocker consensus. If implementation changes scope or closure gates, reopen this section with a new completed review record rather than leaving an unchecked optional item.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `spreadsheet-page` default body and readonly/root-scoped interaction defects are fixed and test-covered.
- [x] The overlapping spreadsheet interaction residuals `04-07` and `07-01` are closed on the same shared interaction surface, not left to a parallel plan.
- [x] `detail-view` no longer serializes current business values during render or remounts viewer by serialized key, while viewer updates remain correct.
- [x] `data-source.name` / `statusPath` structural path contract is closed across validation, compiler, runtime, and docs.
- [x] Flow Designer post-drag canvas reconciliation no longer suppresses later core node data updates.
- [x] Table filtered pagination uses one filtered row universe for body, totals, and active page semantics.
- [x] No in-scope confirmed live defect or public-contract drift is silently deferred or downgraded.
- [x] Affected owner docs are synced to live baseline, or each phase explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test`
- [x] Required focused tests and package-level tests for changed packages pass before full-suite closure

## Deferred But Adjudicated

- Workspace closure is currently blocked by unrelated `@nop-chaos/flux-action-core` red tests in `src/__tests__/{action-dispatcher-control-flow.test.ts,contract-control-flow-retry-and-extras.test.ts,action-dispatcher-error-guard.test.ts,action-dispatcher-monitoring.test.ts}`. Why Not Blocking Phase 1-5 Completion: these files and their underlying implementation changes were already present in the worktree and are outside Plan `280` ownership, but they still block Plan `280` from being marked `completed` until fixed or explicitly reassigned.

## Non-Blocking Follow-ups

- Broader spreadsheet command feedback polish remains out of scope unless Phase 1 proves command failures still leave user-visible stale state after readonly gates. Why Not Blocking Closure: this plan owns the confirmed default canvas, readonly mutation affordance, and root-scoped shortcut defects.
- Full data-source dynamic publication path support remains out of scope if Phase 3 chooses static structural paths. Why Not Blocking Closure: static structural path validation closes the live contract drift without needing dynamic owner re-registration.
- Flow Designer batch drag performance remains out of scope. Why Not Blocking Closure: the retained round-04 defect is stale render correctness after drag, not O(k x n) batch move cost.

## Closure

Status Note: Phase 1-5 implementation and focused/package verification are complete. Final plan closure is still blocked by unrelated workspace `pnpm test` failures in `@nop-chaos/flux-action-core`, and the independent closure audit has not yet been run.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending closure audit.
