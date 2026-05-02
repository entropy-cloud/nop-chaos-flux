# 180 Report Preview Cancellation And Stale-Result Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full/summary.md`, live code verification of `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-core/src/runtime/preview-commands.ts`, `packages/report-designer-core/src/adapters.ts`, `packages/report-designer-core/src/core.ts`
> Related: `docs/plans/176-deep-audit-residual-owner-assignment-plan.md`

## Purpose

Close the retained report-designer preview residual: preview requests are still not truly cancellable and stale completions can still publish state after a superseding preview or `stopPreview`.

## Current Baseline

- `packages/report-designer-core/src/core.ts:118-152` already provides AbortController sequencing for derived-state refresh and field-source refresh.
- `packages/report-designer-core/src/core-dispatch.ts:169-211` preview has no entry token, no cancellation path, and no stale-result guard.
- `packages/report-designer-core/src/adapters.ts:40-48` and `packages/report-designer-core/src/runtime/preview-commands.ts:33-52` expose no preview abort signal, so `stopPreview` cannot actually cancel preview work.
- `docs/architecture/report-designer/design.md` is the active owner doc for the current runtime baseline. Future-draft files such as `docs/architecture/report-designer/contracts.md` and `api.md` are not current owner docs for this plan.

## Goals

- Make report preview requests sequence-safe and truly cancellable.
- Ensure stale preview completion cannot clear `running` or overwrite the latest preview result.
- Document the current cancellation baseline in the active report-designer owner doc.

## Non-Goals

- Do not redesign report preview UX or add new preview modes.
- Do not broaden into field-source or codec redesign.

## Scope

### In Scope

- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-core/src/runtime/preview-commands.ts`
- `packages/report-designer-core/src/adapters.ts`
- focused tests in `packages/report-designer-core/src/__tests__/designer-core.test.ts` or a dedicated preview test
- `docs/architecture/report-designer/design.md`
- `docs/logs/2026/05-02.md`

### Out Of Scope

- future-draft report-designer docs except for optional consistency notes
- broader report-designer host-snapshot or dirty-state work

## Execution Plan

### Phase 1 - Preview Cancellation Contract

Status: planned
Targets: `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-core/src/runtime/preview-commands.ts`, `packages/report-designer-core/src/adapters.ts`, focused tests, `docs/architecture/report-designer/design.md`, `docs/logs/2026/05-02.md`

- [ ] Add sequencing and true cancellation support to the preview path.
- [ ] Extend the preview adapter/runtime contract as needed so in-flight preview work can observe cancellation.
- [ ] Add focused regression tests for superseded preview requests and `stopPreview` behavior.

Exit Criteria:

- [ ] Report preview requests are sequence-safe and cancellable in the live runtime path.
- [ ] Stale preview completion can no longer clear `running` or overwrite the latest preview result.
- [ ] Focused tests cover superseded preview and explicit stop/cancel behavior.
- [ ] `docs/architecture/report-designer/design.md` records the current cancellation baseline.
- [ ] `docs/logs/2026/05-02.md` records the preview-contract fix.

## Validation Checklist

- [ ] report preview sequencing is cancellable and stale-result-safe
- [ ] focused tests cover the in-scope preview behavior family
- [ ] independent closure audit confirms no remaining plan-owned preview residual in scope
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<fill when completed>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or subagent>>
- Evidence: <<task id / daily log link / findings summary>>

Follow-up:

- broader report-designer runtime or host-snapshot work should move through separate successors
