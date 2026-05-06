# 216 Open-Ended Adversarial Review Residual Integrity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-06
> Source: `docs/analysis/2026-05-06-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md,round-05.md}`, live repo re-audit on 2026-05-06 against `packages/flux-runtime/src/async-data/{reaction-runtime.ts,source-registry.ts}`, `packages/flux-action-core/src/operation-control.ts`, `packages/report-designer-core/src/{core.ts,core-dispatch.ts}`, `packages/spreadsheet-core/src/{core.ts,command-handlers/history-handlers.ts}`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-code-editor/src/use-code-mirror.ts`, `packages/word-editor-core/src/document-io.ts`, `packages/flux-formula/src/compile/pipe-syntax.ts`
> Related: `docs/plans/175-review-4-findings-remediation-plan.md`, `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`, `docs/plans/203-runtime-validation-and-data-source-contract-closure-plan.md`, `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`, `docs/plans/214-report-designer-performance-hot-path-closure-plan.md`

## Purpose

收口 2026-05-06 开放式对抗性审查中再次复核后仍然成立、且在当前 owner map 中没有被现行 active plan 诚实承接的 residual live defects；其中部分问题还是对已关闭 plans `192`、`203`、`214` 的 live-repo 复核反证。该计划因此不是简单“新增范围”，而是一个显式 successor / closure-gap owner：只接管重新复核后仍然 live 的 correctness / integrity defects，包括 reaction/source cascade guard 失真、action retry error 污染、designer undo/document integrity 断裂、root render/editor lifecycle safety、以及 formula pipe 重写语义冲突。

## Current Baseline

- plans `211`-`214` 已拥有 2026-05-05 `full-7` retained runtime / renderer / docs / performance 问题，但 2026-05-06 开放式审查又暴露出一批 **未进入这些 active owner plans** 的 confirmed residuals；如果直接把它们并入 `211` 或 `214`，会重新扩大已在执行中的 owner 范围。
- live re-audit confirmed `packages/flux-runtime/src/async-data/reaction-runtime.ts:129-141,272` 仍在超限时把 `globalCascadeDepth` 先置 `0` 再在 `finally` 中减一，产生 `-1` 下溢；`packages/flux-runtime/src/async-data/source-registry.ts:198-209` 仍用同步计数器包裹 fire-and-forget `controller.refresh()`，使 source cascade guard 对异步链路无效。
- live re-audit confirmed `packages/flux-action-core/src/operation-control.ts:17-26` 仍通过 `Object.assign(error, metadata)` 修改原始 error 对象，并允许 `lastFailureReason: error` 形成自引用循环。
- 上述三项与 completed plans `192` / `203` 的已关闭 surface 存在 live-repo 再审冲突：`192` 声称已关闭 reaction/source loop safety 与 `withRetry` failure counting，`203` 声称已关闭 request failure retry metadata preservation；因此本计划必须显式作为这些 closure claims 的 successor / correction owner，而不能假装它们是“从未拥有过的新问题”。
- live re-audit confirmed report designer 仍存在 undo/document integrity 断裂：`setMetadata()` 直接改文档但不推 undo（`packages/report-designer-core/src/core.ts:371-375`）、`syncSpreadsheetDocument()` 直接替换子树但不推 undo / dirty（`core.ts:378-399`）、`report-designer:importTemplate` 仍直接替换 document 而不进入 undo 链（`packages/report-designer-core/src/core-dispatch.ts:228-253`）。
- 这些 report-designer 路径与 completed plan `214` 的性能 closure、以及 completed plan `175` 的 import 后 derived-state refresh 需要明确切边：`214` owning 的是 clone-cost/perf baseline，`175` owning 的是 import 后派生状态刷新；本计划只 owning 剩余的 undo / redo / dirty / document-integrity correctness 语义。
- live re-audit confirmed spreadsheet 仍存在 transaction/history correctness gaps：事务开始后每次命令仍独立 push undo、rollback 不清理事务内 undo 条目、undo 不清理 editing state（`packages/spreadsheet-core/src/command-handlers/history-handlers.ts:11-68`），且 `replaceDocument()` / `exportDocument()` 仍直接存取内部 document 引用（`packages/spreadsheet-core/src/core.ts:69-84`）。
- live re-audit confirmed root render / editor safety defects still exist: `SchemaRenderer` 根级没有 top-level error boundary 且 `prepareError` / `!compiledRoot` 时直接 `return null`（`packages/flux-react/src/schema-renderer.tsx:274-307`）；`use-code-mirror.ts` 只在挂载时创建 `updateListener`，闭包冻结创建时的 `onChange` / `onFocus` / `onBlur`（`packages/flux-code-editor/src/use-code-mirror.ts:27-44,63-80`）；`word-editor-core/src/document-io.ts:77,86,105,109,114` 仍有 5 处裸 `localStorage` 调用，没有 SSR / non-browser guard。
- live re-audit confirmed `packages/flux-formula/src/compile/pipe-syntax.ts:95-103` 仍会把顶层单 `|` 一律当成 pipe filter 边界，从而把 `${5 | 3}` 之类按位 OR 表达式错误重写为函数调用。
- 本次 plan 明确**不重复拥有**以下已存在 owner 路径：plan `211` 的 async user-visible rejection / retained runtime-state slices；plan `214` 的 report-designer deep-copy hot paths；plan `175` 的 import 后 derived-state refresh；以及 plans `192` / `203` 中不被本次 live re-audit 推翻的其余 closure surface。

## Goals

- 修正仍然 live 的 cascade guard、retry error metadata、designer history/document integrity、root render/editor lifecycle safety、和 formula pipe 语义冲突问题。
- 为每一组 defect 建立 focused proof，避免再次依赖分析文档而不核对 live behavior。
- 明确与 plans `211`-`214` 的 owner 边界，防止重复 owning 或 silent scope drift。

## Non-Goals

- 不重开 plans `211`-`214` 已 owning 的 retained issues。
- 不把本计划扩展成全仓 undo/redo 重构、全仓 SSR 兼容专项、或 formula 语言大规模重新设计。
- 不处理尚未在本轮 live re-audit 中再次确认的低置信/低优先级 residual，例如 report redo-stack bound、generic shallow-equality cleanup、或 broader bundle/tree-shaking work。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/{reaction-runtime.ts,source-registry.ts}`
- `packages/flux-action-core/src/operation-control.ts`
- predecessor plan records if live successor ownership must be documented: `docs/plans/{192-deep-audit-full-6-and-adversarial-review-remediation-plan.md,203-runtime-validation-and-data-source-contract-closure-plan.md,214-report-designer-performance-hot-path-closure-plan.md}`
- `packages/report-designer-core/src/{core.ts,core-dispatch.ts}`
- `packages/spreadsheet-core/src/{core.ts,core/internal-state.ts,command-handlers/history-handlers.ts,command-handlers/sheet-handlers.ts,command-handlers/clipboard-handlers.ts}`
- `packages/flux-react/src/{schema-renderer.tsx,dialog-host.tsx,node-error-boundary.tsx}` and directly affected tests including `packages/flux-react/src/__tests__/error-boundary.test.tsx`
- `packages/flux-code-editor/src/use-code-mirror.ts` and directly affected tests
- `packages/word-editor-core/src/document-io.ts` and directly affected tests/docs
- `packages/flux-formula/src/compile/pipe-syntax.ts` and directly affected tests/docs
- directly affected owner docs and `docs/logs/2026/05-06.md`

### Out Of Scope

- retained runtime/reactivity/async slices already tracked by `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`
- report-designer deep-copy performance hot paths already tracked by `docs/plans/214-report-designer-performance-hot-path-closure-plan.md`; this plan must preserve that landed performance baseline and only touch remaining correctness/integrity semantics on the same call paths
- `report-designer:importTemplate` derived-state refresh already tracked and closed by `docs/plans/175-review-4-findings-remediation-plan.md`
- broader report/spreadsheet designer UX polish unrelated to undo/document integrity
- broader formula evaluator semantic redesign beyond the confirmed top-level pipe-vs-bitwise-OR conflict
- any 2026-05-06 review item not revalidated in live code here; those require a separate owner decision rather than being silently downgraded

## Execution Plan

### Workstream 1 - Restore Runtime Guardrail Integrity

Status: completed
Targets: `packages/flux-runtime/src/async-data/{reaction-runtime.ts,source-registry.ts}`, `packages/flux-action-core/src/operation-control.ts`, `docs/plans/{192-deep-audit-full-6-and-adversarial-review-remediation-plan.md,203-runtime-validation-and-data-source-contract-closure-plan.md}`, focused runtime/action tests

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Explicitly record this workstream as successor ownership for the live-repo gaps reopened against completed plans `192` / `203`, and freeze which portions of those earlier closures remain accepted versus superseded.
- [x] [Fix] Repair `globalCascadeDepth` handling so overflow no longer resets to `0` and then underflows in `finally`; preserve honest global-guard semantics under both success and failure paths.
- [x] [Fix] Replace the current synchronous `sourceCascadeDepth` wrapper around fire-and-forget `controller.refresh()` with a guard model that actually tracks async source cascades, or explicitly narrow the guard semantics and document the supported baseline.
- [x] [Fix] Stop mutating original retry errors in `withRetryMetadata`; preserve retry metadata without creating self-referential error objects.
- [x] [Proof] Add focused tests covering reaction overflow, async source cascade re-entry, and retry error serialization / metadata preservation.
- [x] [Decision] Add explicit `Outdated Note` / `Supersession Note` to the relevant predecessor plan(s) (`192` / `203`) so the old closure claim is no longer left unqualified after this live-repo re-audit.
- [x] [Decision] Record the final owner-doc wording for cascade guard semantics and retry error metadata if the supported baseline changes; owner-doc narrowing cannot be used as a substitute for fixing an in-scope live defect unless the closure audit proves the previous supported-baseline claim was wrong.

Exit Criteria:

- [x] Reaction cascade overflow no longer corrupts the global counter.
- [x] Source cascade protection is either truly async-safe or explicitly re-scoped with matching docs/tests.
- [x] Retry metadata no longer mutates or self-links the original error object.
- [x] The plan text and closure evidence make the `192` / `203` successor boundary explicit instead of silently duplicating their old owner claims.
- [x] The affected predecessor plan files (`192` / `203`) carry explicit outdated/supersession notes for the superseded closure claims.
- [x] Focused tests cover all landed fixes in this workstream.
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Restore Designer History And Document Integrity

Status: completed
Targets: `packages/report-designer-core/src/{core.ts,core-dispatch.ts}`, `packages/spreadsheet-core/src/{core.ts,core/internal-state.ts,command-handlers/history-handlers.ts,command-handlers/sheet-handlers.ts,command-handlers/clipboard-handlers.ts}`, `docs/plans/214-report-designer-performance-hot-path-closure-plan.md`, focused designer/spreadsheet tests

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Explicitly record this workstream as successor ownership for the live-repo correctness gaps reopened against completed plan `214`, while preserving plan `175`'s already-closed import refresh baseline.
- [x] [Fix] Make report designer metadata updates, spreadsheet-sync updates, and template import participate honestly in undo/redo + dirty tracking, or split public APIs so out-of-band mutations are explicit and cannot masquerade as normal editable operations.
- [x] [Fix] Restore spreadsheet transaction atomicity: transaction-internal edits must not create independent undo slices, rollback must clear transaction-owned history pollution, and commit must not duplicate the final undo frame.
- [x] [Fix] Ensure spreadsheet undo/redo clears or restores editing state and does not leave stale draft editors able to overwrite restored document state.
- [x] [Fix] Eliminate direct external reference leakage from `replaceDocument()` / `exportDocument()` if live mutable aliasing can bypass history guarantees.
- [x] [Proof] Add focused tests for report metadata/import/sync undoability, spreadsheet transaction rollback/commit atomicity, undo during edit, and external document alias safety.
- [x] [Decision] Add an explicit `Outdated Note` / `Supersession Note` to plan `214` for the shared call paths where live correctness review reopens post-closure semantics, while preserving its landed performance ownership.
- [x] [Decision] Record the final public-contract baseline for designer core mutation APIs and dirty semantics.

Exit Criteria:

- [x] Report designer public mutation paths no longer bypass undo/dirty semantics inside the supported baseline.
- [x] Spreadsheet transactions behave atomically from the user's undo/redo perspective.
- [x] Undo/redo no longer leaves stale editing state able to overwrite restored documents.
- [x] External document aliasing can no longer silently bypass history guarantees within the supported API surface.
- [x] The plan text and closure evidence make the `214` successor boundary explicit and do not reopen the landed performance baseline or `175`'s import-refresh ownership.
- [x] The affected predecessor plan file (`214`) carries an explicit outdated/supersession note for the superseded closure wording on shared call paths.
- [x] Focused tests cover all landed fixes in this workstream.
- [x] `docs/architecture/report-designer/design.md` and related owner docs are updated for the landed baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Harden Root Render And Editor Host Boundaries

Status: completed
Targets: `packages/flux-react/src/{schema-renderer.tsx,dialog-host.tsx,node-error-boundary.tsx}`, `packages/flux-react/src/__tests__/error-boundary.test.tsx`, `packages/flux-code-editor/src/use-code-mirror.ts`, `packages/word-editor-core/src/document-io.ts`, focused React/editor/SSR tests

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Add a root-level error boundary / fallback path around `SchemaRenderer` host-only surfaces so `DialogHost` and sibling host failures cannot white-screen the entire tree.
- [x] [Fix] Replace the current silent `prepareError` / `!compiledRoot` null-return contract with an explicit root failure / loading fallback, or document and test a narrower supported baseline if `null` remains intentional.
- [x] [Fix] Replace the one-time CodeMirror listener capture with a latest-callback-safe pattern so dynamic schema/event updates do not freeze `onChange` / `onFocus` / `onBlur` handlers.
- [x] [Fix] Guard `word-editor-core` storage helpers for SSR / non-browser environments with explicit fallback behavior or explicit unsupported-environment errors.
- [x] [Proof] Add focused tests for schema-root failure isolation, code-editor callback freshness across rerenders, and non-browser `document-io` behavior.
- [x] [Decision] Record the supported baseline for root fallback UX and browser-only persistence helpers.

Exit Criteria:

- [x] Root-host failures no longer crash the entire schema tree without a fallback surface.
- [x] `prepareError` / `!compiledRoot` no longer fail silently without an explicit, tested host-level outcome.
- [x] CodeMirror callbacks stay fresh across prop/schema updates without remounting the editor.
- [x] `word-editor-core` storage helpers behave explicitly in SSR / non-browser contexts.
- [x] Focused tests cover all landed fixes in this workstream.
- [x] `docs/architecture/renderer-runtime.md` and `docs/architecture/word-editor/design.md` are updated for the landed baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Close The Formula Pipe Syntax Contract Hole

Status: completed
Targets: `packages/flux-formula/src/compile/pipe-syntax.ts`, focused formula tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Stop top-level pipe syntax rewriting from hijacking legitimate bitwise-OR expressions, including the `${5 | 3}` class of formulas.
- [x] [Fix] Clarify or complete multi-pipe behavior so chained filter syntax does not partially rewrite into broken hybrids.
- [x] [Proof] Add focused parser/compiler tests for bitwise OR, single filter pipes, and chained filter pipes.
- [x] [Decision] Update the formula contract/doc wording if the supported pipe syntax grammar changes.

Exit Criteria:

- [x] Bitwise OR expressions no longer miscompile through pipe rewriting.
- [x] Supported filter-pipe behavior is explicit and regression-tested.
- [x] Focused tests cover both the corrected conflict and the supported pipe grammar.
- [x] Formula reference docs are updated for the landed baseline.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope confirmed live defects revalidated on 2026-05-06 are fixed, or moved to explicit successor ownership with recorded reasoning.
- [x] No in-scope confirmed defect is silently downgraded into a watch-only residual or absorbed back into plans `175`, `192`, `203`, `211`, or `214` without an explicit scope change.
- [x] The final plan text and closure evidence make every reopened predecessor boundary (`192`, `203`, `214`) explicit rather than pretending the issue was never previously owned.
- [x] Focused verification exists for runtime guardrails, designer history/document integrity, root render/editor host boundaries, and formula pipe syntax.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker from the 2026-05-06 residual set.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Non-Blocking Follow-ups

- Lower-priority findings from `docs/analysis/2026-05-06-open-ended-adversarial-review-01/` that were not revalidated into this owner plan remain outside scope and require a fresh owner decision before they can honestly become active fixes.

## Closure

Status Note: Completed. The plan-owned residual defects revalidated on 2026-05-06 were fixed in live code, predecessor-boundary notes were updated in plans `192`, `203`, and `214`, focused package proofs passed, and full-workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed on 2026-05-06. Independent closure audit evidence was recorded after a separate subagent re-audited the landed surfaces and found no remaining in-scope blocker.

Follow-up:

- No remaining in-scope work remains under this plan. Lower-priority residuals from the broader 2026-05-06 review stay outside this plan's ownership until a future owner decision revalidates them.
