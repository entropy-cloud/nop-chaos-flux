# 287 Deep Audit 2026-05-14 Structural Hotspots Owner Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,02-module-responsibility.md}`, `docs/logs/2026/05-14.md`
> Related: `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md`, `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `docs/plans/284-deep-audit-2026-05-14-test-hard-gate-and-coverage-closure-plan.md`, `docs/plans/286-deep-audit-2026-05-14-reactive-and-async-feedback-closure-plan.md`, `docs/plans/288-deep-audit-2026-05-14-performance-and-error-fidelity-closure-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

对 `deep-audit-batch1` 中仍保留但不全是 closure-critical 的 source structural hotspots 做 live re-audit、owner routing、以及诚实的 successor/deferred adjudication，避免它们在多个 active execution plans 之间重复 owning。

## Current Baseline

- 当前批次保留的 source structural hotspots 包括 `02-07/09/10/11/12/13/14`，对应 `runtime-factory.ts`, `spreadsheet-grid.tsx`, `page-renderer.tsx`, `report-designer-core/src/core.ts`, `reaction-runtime.ts`, `variant-field.tsx`, `tree-layout.ts`。
- 这些文件中的多个同时位于 active execution plans 或 Plan `280` 的语义 owner surface 内；如果直接在多个计划里同时声明“修复”，会造成 duplicate ownership。
- 当前更需要的是：逐项确认哪一项仍是 live structural defect、哪一项只是 watch-only residual、哪一项必须等相邻语义 owner plan 关闭后再进入新的 execution successor。
- Plan `280` 已经在 `spreadsheet-grid.tsx` 所在的 spreadsheet interaction surface 落地 readonly、shortcut、field-drop 和 resize 相关修复；本计划不应再把同一 surface 重新声明成独立 structural execution owner。
- Plans `281`, `282`, and `286` 已分别拥有 `report-designer-core/src/**` truth surface、`report-designer-renderers/src/**` public contract、以及 `variant-field.tsx` 所在 async failure-feedback surface 的 active execution ownership。
- 当前 live repo 中 `runtime-factory.ts` (`605` 行), `spreadsheet-grid.tsx` (`616` 行), `report-designer-renderers/src/page-renderer.tsx` (`591` 行), `report-designer-core/src/core.ts` (`462` 行), `reaction-runtime.ts` (`593` 行), `variant-field.tsx` (`646` 行), `tree-layout.ts` (`505` 行) 都仍是 warning-sized structural hotspots，但没有新的 `>700` hard-gate source failure。
- 历史 completed structural plans 只作为证据来源，不作为本计划要回写的对象；本次 routing 以当前 live file path 和当前 active plan scope 为准。

## Goals

- Re-audit each retained structural hotspot against the current live repo.
- Assign each hotspot to one and only one explicit outcome: `landed`, `watch-only residual`, `optimization candidate`, or `moved to explicit successor ownership`.

## Non-Goals

- 不在本计划里直接执行这些 source hotspot 的代码重构。
- 不接管 test hard-gate closure；那由 Plan `284` owning。

## Scope

### In Scope

- `02-07/09/10/11/12/13/14`
- related plan/docs files needed for explicit owner routing
- `docs/logs/2026/05-14.md`

### Out Of Scope

- `02-01/02/02/03/04/05/06` test hard-gate hotspots
- Any code implementation beyond minimal plan/doc updates needed to route ownership honestly

## Owner Matrix

| ID      | File                                                                        | Live Status                                                                                                                                                                                                                | Blocking? | Final Owner Path                                                                                                                  | Final State                      |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `02-07` | `packages/flux-runtime/src/runtime-factory.ts`                              | `605` lines; still mixes runtime assembly, import bootstrap, source/reaction registration, and dispose orchestration, but the current boundary still matches the runtime assembly role described by the live runtime docs. | No        | `docs/plans/287-deep-audit-2026-05-14-structural-hotspots-owner-routing-plan.md#02-07---runtime-factoryts-runtime-assembly-width` | `watch-only residual`            |
| `02-09` | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                   | `616` lines; still a wide complete-control grid shell, but the current live correctness pressure on this file is the spreadsheet interaction surface already owned and actively repaired under Plan `280`.                 | No        | `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`                                                     | `already handled by active plan` |
| `02-10` | `packages/report-designer-renderers/src/page-renderer.tsx`                  | `591` lines; still combines report host boot, spreadsheet/report sync, host publication, and shell composition. The same surface remains under active public-contract closure in Plan `282`.                               | No        | `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`                                                   | `already handled by active plan` |
| `02-11` | `packages/report-designer-core/src/core.ts`                                 | `462` lines; smaller than the original audit snapshot and functioning as a core facade/assembler, while the same subsystem is already in active truth-surface closure under Plan `281`.                                    | No        | `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md`                                         | `already handled by active plan` |
| `02-12` | `packages/flux-runtime/src/async-data/reaction-runtime.ts`                  | `593` lines; executor, registry ownership, debug snapshot, and test hooks still co-locate, but no current hard gate or independently reproduced contract drift requires a dedicated execution successor.                   | No        | `docs/plans/287-deep-audit-2026-05-14-structural-hotspots-owner-routing-plan.md#02-12---reaction-runtimets-registrydebug-width`   | `watch-only residual`            |
| `02-13` | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` | `646` lines; still mixes selector UI, migration, validation projection, and child-contract bridging, but the same file is already under active async/error-handling ownership in Plan `286`.                               | No        | `docs/plans/286-deep-audit-2026-05-14-reactive-and-async-feedback-closure-plan.md`                                                | `already handled by active plan` |
| `02-14` | `packages/flow-designer-core/src/tree-layout.ts`                            | `505` lines; three layout strategies still share one module. This is an extraction opportunity, not a current live contract blocker.                                                                                       | No        | `docs/plans/287-deep-audit-2026-05-14-structural-hotspots-owner-routing-plan.md#02-14---tree-layoutts-layout-strategy-split`      | `optimization candidate`         |

## Execution Plan

### Phase 1 - Live Re-Audit And Owner Matrix

Status: completed
Targets: linked source files, related active plans, `docs/analysis/2026-05-14-deep-audit-batch1/02-module-responsibility.md`

- Item Types: `Decision | Proof`

- [x] Re-audit each retained hotspot `02-07/09/10/11/12/13/14` against the live repo.
- [x] Build an explicit owner matrix in this plan using the format `ID | File | Live Status | Blocking? | Final Owner Path | Final State`.
- [x] Record whether each hotspot is already adequately owned by Plans `281`, `282`, `286`, `280`, or a future dedicated successor.

Exit Criteria:

- [x] Every in-scope retained hotspot has an explicit owner decision recorded in this plan.
- [x] No hotspot remains ambiguously shared between active plans.
- [x] No owner-doc update required; this routing pass only updates the active plan/log docs.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 routing notes.

### Phase 2 - Deferred Or Successor Adjudication

Status: completed
Targets: this plan, any successor plan files created by the routing outcome, `docs/logs/2026/05-14.md`

- Item Types: `Decision | Follow-up`

- [x] Move any non-blocking hotspot to `Deferred But Adjudicated` with `Classification`, `Why Not Blocking Closure`, `Successor Required`, and `Successor Path`.
- [x] For any hotspot that still requires code execution ownership, create or name exactly one successor execution plan. No new successor plan is required on the current baseline.
- [x] Verify that no confirmed live structural defect is hidden in `Non-Blocking Follow-ups`.

Exit Criteria:

- [x] Every in-scope hotspot ends in one allowed explicit state.
- [x] No confirmed live structural defect is silently deferred.
- [x] Any required successor path is explicitly recorded.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 routing notes.

### Phase 3 - Closure Audit

Status: completed
Targets: this plan, touched successor plan files, `docs/logs/2026/05-14.md`

- Item Types: `Proof | Decision`

- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, and any successor plan files created or referenced here.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Independent closure audit confirms no retained hotspot is left ownerless or multiply owned.
- [x] Affected plan/log files are updated.
- [x] No owner-doc update required, or any needed update is explicitly recorded.

## Closure Gates

- [x] All in-scope retained structural hotspots have exactly one explicit owner outcome.
- [x] No confirmed live structural hotspot is silently deferred.
- [x] Independent closure audit confirms no remaining in-scope blocker.

## Deferred But Adjudicated

### `02-07` - `runtime-factory.ts` runtime assembly width

- Classification: `watch-only residual`
- Why Not Blocking Closure: `runtime-factory.ts` is still broad, but its current assembly/bootstrap mix remains aligned with the live runtime owner-doc boundary and there is no reproduced public-contract break or hard-gate failure that justifies a standalone execution successor right now.
- Successor Required: `no`
- Successor Path: n/a

### `02-12` - `reaction-runtime.ts` registry/debug width

- Classification: `watch-only residual`
- Why Not Blocking Closure: `reaction-runtime.ts` still co-locates registry, executor, debug snapshot, and test hooks, but the live repo does not currently show a closure-critical semantic defect or hard gate on this file beyond maintainability pressure.
- Successor Required: `no`
- Successor Path: n/a

### `02-14` - `tree-layout.ts` layout strategy split

- Classification: `optimization candidate`
- Why Not Blocking Closure: `tree-layout.ts` still holds structured/simple/ELK layout strategies together, but this is a refactor-quality opportunity rather than a live supported-baseline break.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- If Plans `280`, `281`, `282`, or `286` narrow their scope before closing the overlapping owner surfaces named in the matrix, rerun this routing pass before closing Plan `287`.

## Closure

Status Note: Completed after the independent closure audit rechecked the owner matrix against the final active-plan set and confirmed every in-scope hotspot has exactly one explicit owner outcome with no multiply-owned or ownerless residual.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d8f71fa6ffe6KrLCbvMczQipn`
- Evidence: Independent closure audit re-read this plan, the linked `02-module-responsibility` analysis, `docs/logs/2026/05-14.md`, and the live hotspot files; it confirmed `02-07/09/10/11/12/13/14` are all explicitly adjudicated with no remaining routing blocker.

Follow-up:

- None.
