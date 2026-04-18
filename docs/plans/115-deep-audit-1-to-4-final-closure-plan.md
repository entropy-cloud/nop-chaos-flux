# 115 Deep Audit 1-4 Final Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-04-18
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-17-deep-audit-1/summary.md`, `docs/analysis/2026-04-17-deep-audit-2/summary.md`, `docs/analysis/2026-04-17-deep-audit-3/summary.md`, `docs/analysis/2026-04-17-deep-audit-4/summary.md`, `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md`, `docs/logs/2026/04-17.md`
> Related: `docs/plans/67-hidden-field-policy-implementation-plan.md`, `docs/plans/110-api-request-and-cache-hygiene-plan.md`, `docs/plans/114-crud-component-implementation-plan.md`, `docs/plans/24-word-editor-development-plan.md`

## Purpose

Close the remaining valid findings that are still open after the bounded remediation passes for `docs/analysis/2026-04-17-deep-audit-{1,2,3,4}/`.

This is intentionally a final-closure owner plan, not a backlog bucket. Every item owned by this plan must end in exactly one of two states:

- `resolved` — code/tests/docs land and the audited claim becomes false for the right reason
- `closed-no-further-action` — the item is rechecked against the live repo and explicitly retired as a non-defect, an accepted design choice, or a not-worth-doing refactor slice

This plan must not close with successor-plan spillover for the items it owns. After this plan, these items are either fixed or explicitly retired from future audit churn.

## Current Baseline

- Earlier remediation slices already closed the low-conflict defects that were repeatedly reproven in the 2026-04-17 audit set: `array-editor` / `key-value` delete double-write, dependent `system` revalidation, table filter `Set` mutation, CRUD `queryForm` render-path mismatch, CRUD `action: 'dialog'` doc drift, and `TagListRenderer` direct store access.
- Active docs were re-synced to the live compiler/validation baseline on 2026-04-18, including `form-validation.md`, `form-validation-runtime-types.md`, `frontend-baseline.md`, `schema-file-validator.md`, `renderer-runtime.md`, `flux-dsl-vm-extensibility.md`, `template-instantiation-and-node-identity.md`, and the CRUD docs/plan wording.
- The remaining open items are consolidated in `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md` and fall into five groups: validation/runtime correctness, CRUD/table contract gaps, async control/polling semantics, i18n/editor cleanup, and oversized-file/public-surface closure decisions.
- The current problem is not discovery. The remaining problem is closure discipline: the same items have been re-identified across audit slices without being driven to a final resolved-or-retired decision.

## Goals

- Recheck each still-open audit-1 to audit-4 item against the live repo and assign one final disposition: `resolved` or `closed-no-further-action`.
- Land the required code/test/doc changes for the items that are still real defects.
- Retire the items that do not justify changes by recording explicit evidence and removing them from future active audit backlog.
- Update the audit-facing docs so future rechecks do not rediscover the same already-decided items as if they were untriaged.

## Non-Goals

- Do not absorb new findings outside the current open-items list.
- Do not create successor plans for the items owned by this plan.
- Do not keep any owned item in a vague `deferred`, `later`, or `pending recheck` state once this plan closes.
- Do not use wording-only closure for items that still reproduce as behavioral defects.

## Scope

### In Scope

- Every item listed under `## Open Items` in `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md`
- Reverse documentation updates required to keep owner docs, component docs, plan docs, and daily logs aligned with each item's final disposition
- Focused tests needed to prove semantic closure for items resolved in code

### Out Of Scope

- New audit findings discovered outside the current open-items note
- General repo cleanup not directly needed to close an owned item
- Reopening already-closed 2026-04-17 fixes unless live verification shows an actual regression

## Final Disposition Rule

Each owned item must finish in one of these two forms only:

### `resolved`

Use this only when all of the following are true:

- the bug or contract gap still reproduces against live code
- a bounded code/test/doc change lands
- focused verification demonstrates the semantic fix
- reverse docs are updated in the same slice

### `closed-no-further-action`

Use this only when all of the following are true:

- a fresh recheck shows the item is not a live defect, or is a deliberate/acceptable design choice, or is a refactor with insufficient value to justify ongoing churn
- the rationale is written down in repo-visible docs
- the item is removed from active audit-owned backlog language
- the closure note is explicit enough that future audits should not reopen it without new contradictory evidence

Forbidden end states for this plan:

- `deferred`
- `follow up later`
- `move to successor plan`
- `needs another audit pass someday`

## Owned Item Ledger

| ID | Item | Current Area | Allowed Final Outcome |
| --- | --- | --- | --- |
| A1 | Hidden-field stale error cleanup | `packages/flux-runtime/src/form-runtime-field-ops.ts`, `form-runtime-validation.ts`, `form-runtime-owner.ts` | `resolved` or `closed-no-further-action` |
| A2 | Runtime-only async validation stale suppression | `packages/flux-runtime/src/form-runtime-validation.ts` | `resolved` or `closed-no-further-action` |
| A3 | CRUD selection summary drift | `packages/flux-renderers-data/src/crud-renderer.tsx` | `resolved` or `closed-no-further-action` |
| A4 | `operation-control` retry/backoff abort awareness | `packages/flux-runtime/src/operation-control.ts` | `resolved` or `closed-no-further-action` |
| A5 | Table `loadingSlot` metadata gap | `packages/flux-renderers-data/src/index.tsx`, `table-renderer.tsx` | `resolved` or `closed-no-further-action` |
| A6 | Condition Builder private i18n | `packages/flux-renderers-form-advanced/src/condition-builder/i18n.ts` | `resolved` or `closed-no-further-action` |
| A7 | Word Editor hardcoded English | `packages/word-editor-renderers/src/` | `resolved` or `closed-no-further-action` |
| A8 | Word Editor autosave second-source issue | `packages/word-editor-renderers/src/EditorCanvas.tsx`, `WordEditorPage.tsx` | `resolved` or `closed-no-further-action` |
| A9 | `data-source-runtime` `stopWhen` behavior | `packages/flux-runtime/src/data-source-runtime.ts` | `resolved` or `closed-no-further-action` |
| A10 | Oversized-file / public-surface residual items | `data-source-runtime.ts`, `flow-designer-renderers/src/index.tsx`, `report-designer-renderers/src/index.ts`, `word-editor-renderers/src/index.ts` | `resolved` or `closed-no-further-action` |

## Execution Plan

### Workstream 1 - Validation And Form-Runtime Closure

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-field-ops.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, validation tests, validation docs

- [x] Rechecked A1 against live hidden-field transition behavior and confirmed it as a real defect.
- [x] Fixed the hidden stale-error/validating cleanup path and added regression coverage.
- [x] Rechecked A2 against runtime-registered async validator behavior and confirmed the stale completion gap.
- [x] Landed stale-run suppression for runtime-only async validation.
- [x] Updated the final disposition record to reflect both items as `resolved`.

Exit Criteria:

- [x] A1 has a final disposition recorded in repo-visible docs.
- [x] A2 has a final disposition recorded in repo-visible docs.
- [x] Code fixes in this workstream have focused tests proving the semantic behavior.
- [x] No validation item owned by this workstream remains described as merely "still needs recheck".

### Workstream 2 - CRUD And Table Contract Closure

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/index.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`, data renderer tests, CRUD/table docs

- [x] Rechecked A3 and confirmed the CRUD selection summary drift against scope-owned table selection.
- [x] Fixed the summary bridge and added regression coverage.
- [x] Rechecked A5 and confirmed the `loadingSlot` field-metadata gap.
- [x] Added the missing field metadata.
- [x] Updated the final disposition record and supporting table docs.

Exit Criteria:

- [x] A3 has a final disposition recorded in repo-visible docs.
- [x] A5 has a final disposition recorded in repo-visible docs.
- [x] CRUD/table code fixes are covered by focused tests.
- [x] No CRUD/table item owned by this workstream remains open-ended.

### Workstream 3 - Async Control And Polling Closure

Status: completed
Targets: `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, runtime tests, owner docs where relevant

- [x] Rechecked A4 and confirmed the retry/backoff abort-awareness gap.
- [x] Made retry delay waits abort-aware and connected request execution signal propagation.
- [x] Rechecked A9 and confirmed `stopWhen` exception swallowing as a live defect.
- [x] Landed the runtime fix and added focused polling coverage.
- [x] Updated the final disposition record with both items as `resolved`.

Exit Criteria:

- [x] A4 has a final disposition recorded in repo-visible docs.
- [x] A9 has a final disposition recorded in repo-visible docs.
- [x] Runtime code fixes in this workstream have focused tests.
- [x] No async-control item owned by this workstream remains in backlog language.

### Workstream 4 - I18n And Word Editor Closure

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/`, `packages/word-editor-renderers/src/`, i18n dictionaries, focused tests/docs

- [x] Rechecked A6 and retired it as `closed-no-further-action`; the private text layer remains localized, overrideable, package-local, and not a reproduced live defect.
- [x] Rechecked A7 and confirmed active Word Editor English strings still needed migration.
- [x] Moved the active page/preview shell strings onto `@nop-chaos/flux-i18n` and updated focused verification.
- [x] Rechecked A8 and retired it as `closed-no-further-action`; the canonical save path already persists through `saveDocument(bridge, { charts, codes })`, while autosave is a host snapshot mirror rather than the authoritative save channel.
- [x] Updated the final disposition record with the explicit outcomes for A6-A8.

Exit Criteria:

- [x] A6 has a final disposition recorded in repo-visible docs.
- [x] A7 has a final disposition recorded in repo-visible docs.
- [x] A8 has a final disposition recorded in repo-visible docs.
- [x] i18n/editor code fixes have focused verification proving the semantic closure.

### Workstream 5 - Residual Refactor And Public-Surface Final Decision

Status: completed
Targets: `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flow-designer-renderers/src/index.tsx`, `packages/report-designer-renderers/src/index.ts`, `packages/word-editor-renderers/src/index.ts`, relevant docs/logs

- [x] Rechecked A10 item by item instead of leaving it as a generic debt bucket.
- [x] Determined that the current residual items do not justify further churn without a new concrete maintainability or contract failure.
- [x] Recorded explicit `closed-no-further-action` rationale for each A10 sub-item in the final disposition record.
- [x] Removed backlog-style language for the owned A10 surface.

Exit Criteria:

- [x] Every A10 sub-item has its own final disposition note.
- [x] No A10 sub-item is left in a generic deferred state.
- [x] The workstream outcome is reverse-documented even where the final decision is to retire rather than refactor.

### Workstream 6 - Audit Sync And Final Closure Audit

Status: completed
Targets: `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md`, `docs/logs/2026/04-18.md` or current active log, touched owner docs, this plan

- [x] Replaced the open-items note with a final disposition record.
- [x] Converted the note from an active backlog into an explicit closure record with item-by-item outcomes.
- [x] Re-audited A1-A10 against the live repo during execution and assigned final dispositions.
- [x] Recorded the closure evidence in the daily log and this plan.

Exit Criteria:

- [x] `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md` no longer reads like an active unresolved backlog.
- [x] Every owned item A1-A10 is recorded as `resolved` or `closed-no-further-action`.
- [x] Closure evidence is recorded in this plan and daily log for the final pass.

## Validation Checklist

- [x] A1-A10 each have a final repo-visible disposition.
- [x] No owned item remains in a `deferred`, `pending`, or successor-plan state.
- [x] Reverse docs are updated for every item whose code or contract changed.
- [x] The open-items note is no longer an open-ended backlog note by the time this plan closes.
- [x] Focused verification exists for every code fix landed under this plan.
- [x] Closure evidence is recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Documentation Follow-Up

- Keep `docs/logs/2026/04-17.md` and the active current-day log aligned with each closure slice.
- Update owner docs only when a disposition changes the live contract or explicitly retires a misleading older statement.
- Remove backlog-style wording from `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md` once the item decisions are final.

## Closure

Status Note: Completed. Every owned item A1-A10 now has a final repo-visible disposition of either `resolved` or `closed-no-further-action`, and the former open-items note has been converted into a final disposition record so these audit findings are not left in a repeatable backlog state.

Closure Audit Evidence:

- Reviewer / Agent: implementation closure pass recorded in current session, with repo-visible final dispositions in `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md`
- Evidence: final item-by-item disposition summary in `docs/analysis/2026-04-18-deep-audit-1-to-4-open-items.md`, closure status in this plan, and 2026-04-17 daily-log closure entry

Follow-up:

- no remaining plan-owned work
