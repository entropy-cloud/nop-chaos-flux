# F3 — Input, Content & Upload Component Enhancement Portfolio

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-06-26-2100-1-b7-p2p3-signal-triage-residual-adjudication-plan.md` (I10, D10, TR7, U5, U6, DD7, DD9, MP2), `docs/plans/2026-06-26-0830-3-b42-date-tree-file-lifecycle-boundary-plan.md` (U5, U6)
> Related: `docs/plans/2026-07-21-0800-1-form-runtime-path-projection-plan.md`, `docs/plans/2026-07-21-0800-2-table-data-component-enhancement-plan.md`

## Purpose

Implement eight deferred component enhancements across three packages: form inputs (`flux-renderers-form`), advanced upload (`flux-renderers-form-advanced`), and content/media (`flux-renderers-content`). These were deferred from the B3/B4/B5/B7 work as `out-of-scope improvement` — genuine feature gaps across multiple component families.

## Current Baseline

### Form Inputs (`flux-renderers-form`)

- **I10 (input-number precision rounding):** `precisionMode` / truncation rounding is absent. Live `input-number` uses BY-DESIGN clamp (not validate) — values outside precision are clamped, not rounded. `input-number/design.md` §6 documents this.
- **D10 (relative date expressions):** Date fields use absolute values. Relative expressions like `now`, `today+1d`, `now-7d` are not supported in `minDate`/`maxDate`/`value`. Users can work around via `when`/expressions computing absolute dates.
- **TR7 (input-tree `enableNodePath`):** `enableNodePath` is explicitly marked "暂不实现" in `input-tree/design.md` §4. Path-string value construction for tree node selection is absent.

### Advanced Upload (`flux-renderers-form-advanced`)

- **U5 (input-file `deleteAction`):** No `deleteAction` field exists. Live upload has no server-side delete capability after upload. `input-file/design.md` and `input-file/package.json` have zero grep hits for `deleteAction`.
- **U6 (input-file `maxSize` / `onReject` / `onDelete*`):** No `maxSize` client-side validation, no `onReject` callback for rejected files, no `onDelete*` lifecycle events. File size validation is entirely server-side.

### Content/Media (`flux-renderers-content`)

- **DD7 (image fetcher-backed mode):** Image renders directly as `<img src>`. There is no fetcher/data-source backed mode for auth-protected image sources (data-source → data URI). No `fetcher` or `source` prop exists on image.
- **DD9 (markdown remote `src` fetch):** Markdown renders `content` only — no `src` prop for remote markdown fetching. `content` can be bound via expression/source for dynamic values.
- **MP2 (mapping loader-sourced map):** Mapping has no `source` or loader integration. The map values come from static schema `map` array. Component-level loader was rejected by 请求下沉 audit; loader integration should happen through loader/assembly layer.

## Goals

- Implement `input-number` precision rounding mode (`precisionMode: 'round' | 'truncate' | 'ceil' | 'floor'`)
- Implement relative date expression support for `input-date`/`date-range` (`now`, `today±Nd`, `now±Nd`)
- Implement `input-tree` `enableNodePath` path-string value construction
- Implement `input-file` `deleteAction`, `maxSize`, `onReject`, `onDelete*` lifecycle events
- Implement `image` fetcher-backed mode for auth-protected sources
- Implement `markdown` remote `src` fetch
- Implement `mapping` loader-sourced map integration (via expression/source, not component-level loader)
- All features covered by focused unit tests

## Non-Goals

- No input-number `step` or `min`/`max` changes (existing contracts unchanged)
- No `date-range` relative expression asymmetry — D10 applies to both single and range date fields
- No input-tree virtual scrolling or remote search (separate features)
- No input-file chunked upload or resumable upload (separate feature)
- No markdown `allowHtml` changes (existing sanitize gate unchanged)
- No mapping `item` region changes (existing contract unchanged)

## Scope

### In Scope

- I10: `flux-renderers-form` — `precisionMode` prop, rounding logic on blur/change
- D10: `flux-renderers-form` — relative date token parser, applied to `minDate`/`maxDate`/`value`
- TR7: `flux-renderers-form` — `enableNodePath` path construction on node selection
- U5/U6: `flux-renderers-form-advanced` — `deleteAction`, `maxSize`, `onReject`, `onDelete*` on input-file
- DD7: `flux-renderers-content` — image fetcher/data-source prop for auth-protected sources
- DD9: `flux-renderers-content` — markdown `src` fetch (expression or URL)
- MP2: `flux-renderers-content` — mapping `source` expression for loader-sourced map data

### Out Of Scope

- Reactive locale wiring (I1/I4) — product decision required
- Multi-tab keep-alive shell (M2) — product decision required
- `derived-state-in-effect` cleanup (plan 415 successor)

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测 — all are additive component features; each has a clear API surface and existing test infrastructure. Proof items where appropriate.

## Execution Plan

### Phase 1 — Form Input Enhancements (I10 + D10 + TR7)

Status: planned
Targets: `packages/flux-renderers-form/src/` (input-number, input-date, date-range, input-tree)

- Item Types: `Fix | Proof`

- [ ] I10: Add `precisionMode: 'round' | 'truncate' | 'ceil' | 'floor'` to input-number schema; implement rounding on blur/value change; preserve existing `precision` clamping as the default mode
- [ ] D10: Add relative date token parser (`now`, `today`, `+Nd`, `-Nd`, `+M`, `-M`); apply to `minDate`/`maxDate`/`value` in input-date and date-range; move relative→absolute conversion before existing date parse path
- [ ] TR7: Implement `enableNodePath` on input-tree: construct path-string (e.g., `root/child/grandchild`) from tree node hierarchy on selection; expose via `onChange` and value
- [ ] Write focused tests for each: I10 rounding modes, D10 relative token parsing and edge cases, TR7 path-string construction

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-form test` passes with new tests
- [ ] Existing tests unchanged and still pass

### Phase 2 — Upload Enhancements (U5 + U6)

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/` (input-file)

- Item Types: `Fix | Proof`

- [ ] U5: Add `deleteAction: ActionSchema` to input-file; implement delete trigger on existing files (action dispatched with file identity); loading/error/disabled states during delete
- [ ] U6: Add `maxSize: number` (bytes) client-side validation rejecting oversized files before upload; add `onReject: ActionSchema` triggered on file rejection (with rejection reason in event payload); add `onDelete`/`onDeleteSuccess`/`onDeleteFail` lifecycle events
- [ ] Write focused tests: deleteAction dispatch, maxSize client rejection with file info, onReject action payload, onDelete lifecycle sequence

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` passes with new tests
- [ ] Existing upload tests unchanged and still pass

### Phase 3 — Content/Media Enhancements (DD7 + DD9 + MP2)

Status: planned
Targets: `packages/flux-renderers-content/src/` (image, markdown, mapping)

- Item Types: `Fix | Proof`

- [ ] DD7: Add `fetcher: ActionSchema` prop to image; when present, image loads via data-source action → data URI instead of direct `<img src>`; handle loading/error/fallback states
- [ ] DD9: Add `src: string | Expression` to markdown schema; when `src` is present (and `content` is absent), fetch markdown content from resolved URL/expression; apply existing sanitize pipeline; handle loading/error states
- [ ] MP2: Add `source: Expression` to mapping schema; when `source` resolves to a map object, merge/override the static `map` array entries (loader-sourced wins per "loader wins" precedence)
- [ ] Write focused tests: image fetcher data-URI flow, markdown src fetch + sanitize, mapping source merge precedence

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-content test` passes with new tests
- [ ] Existing content tests unchanged and still pass

### Phase 4 — Owner-Doc Sync

Status: planned
Targets: `docs/components/input-number/design.md`, `docs/components/input-date/design.md`, `docs/components/input-tree/design.md`, `docs/components/input-file/design.md`, `docs/components/image/design.md`, `docs/components/markdown/design.md`, `docs/components/mapping/design.md`, `docs/logs/2026/07-21.md`

- Item Types: `Follow-up`

- [ ] Update input-number design.md — document `precisionMode`
- [ ] Update input-date design.md — document relative date expressions
- [ ] Update input-tree design.md — flip `enableNodePath` from "暂不实现" to "已实现"
- [ ] Update input-file design.md — document `deleteAction`, `maxSize`, `onReject`, `onDelete*`
- [ ] Update image design.md — document fetcher-backed auth-protected mode
- [ ] Update markdown design.md — document `src` remote fetch
- [ ] Update mapping design.md — document `source` expression for loader-sourced map
- [ ] Update `docs/logs/2026/07-21.md`

Exit Criteria:

- [ ] All 7 owner docs updated to reflect current live baseline
- [ ] Daily log written

## Draft Review Record

- Reviewer / Agent: independent sub-agent (ses_07ef9c01cffew4Idlq58lBf9rj)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker, 0 Major, 2 Minor (not blocking). Minor 1: Test tier recommendation — upload lifecycle features (U5/U6) may warrant "必须自动化"; left as "建议有测" per additive-feature reasoning. Minor 2: Phase 1 bundles 3 features in `flux-renderers-form` — accepted as reasonable grouping by package.

## Closure Gates

- [ ] I10/D10/TR7 form input enhancements implemented and tested
- [ ] U5/U6 upload enhancements implemented and tested
- [ ] DD7/DD9/MP2 content/media enhancements implemented and tested
- [ ] All focused tests pass; existing tests not regressed
- [ ] No deferred live defects or contract drifts
- [ ] Affected owner docs synced (7 design.md files)
- [ ] By independent sub-agent (fresh session) closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None — scope is self-contained across three package areas.

## Non-Blocking Follow-ups

- Input-tree virtual scrolling for large trees — optimization candidate, not blocking.
- Input-file chunked upload — separate feature, product decision needed.

## Closure

Status Note: TBD

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- No remaining plan-owned work.
