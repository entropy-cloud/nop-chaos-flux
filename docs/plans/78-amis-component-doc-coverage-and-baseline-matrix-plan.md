# 78 AMIS Component Doc Coverage And Baseline Matrix Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/amis-types/`, `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/components-audit.md`, `docs/components/amis-baseline-matrix.md`, `docs/logs/2026/04-12.md`
> Related: `docs/index.md`, `docs/components/examples.manifest.json`

## Purpose

This owner plan closes the process gap between the upstream AMIS component/type baseline and the Flux component-owner doc system under `docs/components/`.

The plan is complete only when:

- every retained AMIS component family has a canonical Flux owner doc directory
- every retained canonical directory contains both `design.md` and `example.json`
- `docs/components/amis-baseline-matrix.md` records an explicit retained or not-retained decision for every audited top-level AMIS type literal
- the component index, roadmap, manifest, and docs routing reflect the same baseline

## Current Baseline

- Before this execution pass, `docs/components/` was internally high quality but not derived from a complete `docs/amis-types/` audit.
- `docs/components/components-audit.md` already documented the key gap: old audits could validate only existing component directories, not important missing directories.
- `crud` exposed that gap first, but the same issue also affected `cards`, `pagination`, `service`, `alert`, `input-number`, the date/time family, upload fields, rich-text editing, and several advanced data/layout families.
- A fresh full audit of `docs/amis-types/*.d.ts` found 137 distinct top-level AMIS `type` literals and additional matrix drift around aliases, static variants, editor-family overlap, and manifest coverage.
- At the start of execution, `docs/components/examples.manifest.json` also lagged the doc baseline for at least `code-editor` and any newly added retained target-contract components.

## Goals

- Produce one durable AMIS-to-Flux baseline matrix that explicitly classifies every audited AMIS top-level type.
- Define one canonical retained Flux owner path for each retained AMIS family.
- Create owner doc directories for all retained-but-missing families, each with `design.md` and `example.json`.
- Synchronize `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/examples.manifest.json`, `docs/components/components-audit.md`, and `docs/index.md` with the final retained baseline.
- Close the plan only after an independent closure audit confirms there are no retained-family doc gaps left.

## Non-Goals

- Do not implement all retained runtime renderers in this plan.
- Do not preserve AMIS legacy names as canonical Flux type names unless there is an explicit retention reason.
- Do not create directories for AMIS types explicitly classified as `notRetained`.
- Do not turn `docs/components/` into a field-by-field AMIS translation set.
- Do not leave retained owner-doc gaps as unnamed future debt; if a family is retained, this plan owns its doc completion.

## Scope

### In Scope

- full audit-backed maintenance of `docs/components/amis-baseline-matrix.md`
- retained/not-retained decisions for all audited top-level AMIS type literals
- new retained component directories under `docs/components/<type>/`
- `design.md` plus `example.json` for every retained canonical component family that lacked them
- sync of `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/examples.manifest.json`, `docs/components/components-audit.md`, `docs/index.md`, and `docs/logs/2026/04-12.md`
- independent closure audit evidence recorded in this plan or the daily log

### Out Of Scope

- runtime implementation of the newly documented renderers
- large new playground scenarios for each retained family
- exhaustive AMIS compatibility-field cleanup beyond what is necessary to state Flux owner boundaries
- owner docs for `notRetained` types such as `nav`, `calendar`, `tooltip-wrapper`, or host-heavy optional integrations

## Execution Plan

### Phase 1 - Baseline Matrix And Retention Policy

Status: completed
Targets: `docs/components/amis-baseline-matrix.md`, `docs/components/components-audit.md`, `docs/components/index.md`, `docs/components/roadmap.md`

- [x] Audit all top-level AMIS `type` literals under `docs/amis-types/*.d.ts`
- [x] Normalize canonical retained-family naming and alias policy
- [x] Expand `docs/components/amis-baseline-matrix.md` so every audited AMIS top-level type has an explicit retained or not-retained decision
- [x] Sync audit and index docs to cite the new matrix as the coverage source of truth

Exit Criteria:

- [x] The repo contains one audit-backed AMIS-to-Flux baseline matrix
- [x] The matrix explicitly explains retained, alias-only, merged, and not-retained decisions
- [x] No audited AMIS top-level type remains undocumented in the matrix

### Phase 2 - Missing Retained Core Families

Status: completed
Targets: `docs/components/cards/`, `docs/components/pagination/`, `docs/components/service/`, `docs/components/alert/`, `docs/components/input-number/`, `docs/components/input-date/`, `docs/components/input-datetime/`, `docs/components/input-time/`, `docs/components/date-range/`

- [x] Add missing retained core component directories with `design.md` and `example.json`
- [x] Document canonical date/time split and range-family boundary
- [x] Register all new retained docs in the component index and manifest

Exit Criteria:

- [x] All retained wave-2 core families exist under `docs/components/`
- [x] Each directory includes `design.md` and `example.json`

### Phase 3 - Missing Retained Layout, Action, Upload, And Rich-Text Families

Status: completed
Targets: `docs/components/collapse/`, `docs/components/grid/`, `docs/components/mapping/`, `docs/components/status/`, `docs/components/button-group/`, `docs/components/dropdown-button/`, `docs/components/input-month/`, `docs/components/input-quarter/`, `docs/components/input-year/`, `docs/components/input-file/`, `docs/components/input-image/`, `docs/components/editor/`

- [x] Add missing retained mid-wave component directories with `design.md` and `example.json`
- [x] Keep rich-text `editor` explicitly separate from retained `code-editor`
- [x] Record canonical month/quarter family boundaries without reintroducing parallel range-type owners

Exit Criteria:

- [x] All retained wave-3 families exist under `docs/components/`
- [x] Rich-text editor and code-editor boundaries are explicit in both the matrix and owner docs

### Phase 4 - Missing Retained Advanced And Media Families

Status: completed
Targets: `docs/components/combo/`, `docs/components/picker/`, `docs/components/transfer/`, `docs/components/input-table/`, `docs/components/steps/`, `docs/components/timeline/`, `docs/components/audio/`, `docs/components/video/`, `docs/components/carousel/`, `docs/components/qrcode/`

- [x] Add missing retained advanced/media component directories with `design.md` and `example.json`
- [x] Keep advanced-form families aligned with existing owner/runtime architecture instead of copying AMIS historical field surfaces
- [x] Register all new retained docs in the component index and manifest

Exit Criteria:

- [x] All retained wave-4 families exist under `docs/components/`
- [x] No retained family remains matrix-only without an owner directory

### Phase 5 - Index Convergence, Verification, And Closure Audit

Status: completed
Targets: `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/examples.manifest.json`, `docs/components/components-audit.md`, `docs/index.md`, `docs/logs/2026/04-12.md`

- [x] Reconcile matrix, actual component directories, and manifest coverage
- [x] Update index, roadmap, audit doc, docs index, and daily log to the final retained baseline
- [x] Run required repo verification commands
- [x] Obtain independent closure-audit evidence for retained-family completeness

Exit Criteria:

- [x] Retained component list matches actual canonical directories and manifest entries
- [x] No retained family is missing a `design.md` or `example.json`
- [x] Closure audit confirms that the `crud`-style omission gap is closed for the retained baseline

## Validation Checklist

- [x] `docs/components/amis-baseline-matrix.md` exists as the baseline routing table
- [x] retained / alias-only / merged / not-retained rules are written down
- [x] all retained canonical component families have `design.md` and `example.json`
- [x] `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/examples.manifest.json`, `docs/components/components-audit.md`, and `docs/index.md` are synchronized
- [x] the matrix covers every audited AMIS top-level type
- [x] `docs/components/` reaches complete coverage for the retained scope owned by this plan
- [x] independent closure audit is complete and cited
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Documentation Follow-Up

- For future retained family additions, update `docs/components/amis-baseline-matrix.md` first, then create or revise the canonical owner doc directory, then sync the index and manifest.

## Closure

Status Note: Completed on 2026-04-12 after the full AMIS top-level type audit was converted into an explicit retained/notRetained matrix, all retained canonical families gained `design.md` plus `example.json`, index/roadmap/manifest/audit routing was synchronized to the live repo state, and workspace `typecheck` / `build` / `lint` / `test` all passed.

Closure Audit Evidence:

- Reviewer / Agent: independent explore subagent
- Evidence: final closure audit task `ses_27efa8bf3ffeVzd8ZgPbP8MPsb`; earlier interim audits `ses_27f0f7734ffe9iPh9h2QTd0I1K` and `ses_27f07c956ffeqROSPcrl98IMmW` found remaining matrix/example/status drift, which was then resolved before closure

Follow-up:

- no remaining plan-owned work; future work belongs to retained renderer runtime implementation plans rather than this documentation coverage plan
