# Amis Bug-Driven Improvements (Flux 横向核验)

> Status: reference / improvement backlog
> Source data: `~/app/nop-chaos-flux-tests/data/useful-llm/` (1785 amis issues, audited 2026-05-07)
> Date: 2026-06-25
> Related: `docs/components/amis-baseline-matrix.md`, `docs/components/existing-components-improvement-analysis.md`, `docs/architecture/flux-design-principles.md`

## Purpose

This directory mines the **historical bug-fix history of amis** (`data/useful-llm/`, 1785 curated issues across form/table/layout/renderers/api-data/i18n/mobile/other) for two kinds of signal that matter for `nop-chaos-flux`:

1. **Design gaps** — properties or scenarios that Flux's design docs are silent about, which amis users hit in production. Each is phrased as a generic correctness property, **not** an amis-parity demand.
2. **Test coverage gaps** — properties Flux already claims (by design or by implementation) that amis users lost to regressions, and that Flux should therefore lock with regression tests.

## Critical Framing — Flux Is Not amis

`nop-chaos-flux` is a **rewrite** with a completely different, more generic, better design. It is **not** an amis clone. Per `docs/components/existing-components-improvement-analysis.md` §0.2, Flux rejects a large class of amis designs:

- scattered condition props (`visibleOn` / `hiddenOn` / `disabledOn`) → Flux uses unified `when`
- component-level `api` / `initFetch` / `interval` → Flux routes requests through `data-source`
- amis value encoding (`valueField` / `joinValues` / `extractValue` / `delimiter` / `selectMode`) → Flux uses `{label, value}` and real arrays
- amis `level` / `actionType` discriminator tree → Flux uses `variant`
- `themeCss` / `borderMode` / `mobileUI` dual implementation → Flux uses Tailwind + responsive
- amis `dataProvider` JS function strings, frontend export, echarts → rejected

Therefore the docs in this directory deliberately do **not** request copying amis behavior. Every entry translates an amis-specific bug into a **generic correctness property** that Flux should guarantee (often: _more strongly than amis did_). When an amis bug is really amis-specific (SDK build, React-version, iconfont sprite, editor-only), it was filtered out and is **not** recorded here.

Each entry cites amis issue numbers (`AMIS-REF: #NNNN`) purely for back-traceability — so a future maintainer can read the original production report when judging whether Flux's design/implementation truly closes the property.

## Flux-Principles Audit (2026-06-25)

An independent sub-agent audited all 215 entries against Flux's actual architecture (`field-binding-and-renderer-contract.md` Rule 1 _"Expressions Use Ordinary Props"_ + Frozen `META_FIELDS` set, `naming-conventions.md` §3 NOT-ADOPTED, `existing-components-improvement-analysis.md` §0.2/§5). **Verdict: 0 hard violations** — no entry proposes an amis-specific design Flux rejects, no entry invents `xxxExpr`/`xxxOn` variants, and the NOT-ADOPTED tables are the compliance mechanism. The audit found and fixed 5 framing defects:

| Entry                          | Defect                                                                                                    | Fix                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I11** (input-number min/max) | Treated a settled Flux decision (clamp, not validate — `input-number/design.md` §6) as an open DESIGN-GAP | Reframed to **BY-DESIGN / TEST-GAP P3**; clamp is deliberate; reversing to validate = explicit decision-reversal needing sign-off                         |
| **TR6** (input-tree)           | Half-tested `enableNodePath`, which is 暂不实现 in `input-tree/design.md`                                 | Split: TR6 = `valueField` remap (live field, kept); **TR7** = `enableNodePath` path-build → DESIGN-ACK-NOT-IMPL P3                                        |
| **ST1** (status/property)      | Restated Rule 1 ("any field accepts `${expr}`") as a status-specific gap                                  | Reframed to **per-renderer field consistency** (amis #4900 = `title` expression-blind while siblings weren't) — a real regression anchor, not a tautology |
| **L12** (grid className)       | Restated frozen `META_FIELDS.className` expr support as a grid gap                                        | Narrowed to **grid-column reactivity** only (generic className-expr belongs to styling-system); P2→P3                                                     |
| **D3** (cleared date)          | Led with a speculative `valueMode`/`nullValue` field                                                      | Lead with Flux-idiomatic **`transformOutAction` submit-transformer**; new field only as conditional X5 follow-up                                          |

The audit confirms the signal library is Flux-principles-compliant. See `amis-bug-driven-improvement-roadmap.md` Cross-Cutting for the durable record.

## Request-Sink Audit (2026-06-25)

A second independent sub-agent specifically audited the **api / data-source / action** layer (B2/B3/B6 entries: A1–A19, T11/T23/T25/T27, U1–U6, C13, AG3/AG4) against Flux's hard rule that a component schema field must NOT be a data-loading entry point (`docs/bugs/15-component-level-initfetch-analysis-and-fix.md`). **Verdict: 0 violations — no amis `initApi` / component-level `api` introduced.**

Every `interval` / `silent` / `sendOn` / `initFetch` / `cache` / `dedup` / `resultMapping` / `mergeStrategy` reference is bound to `data-source` / `DataSourceController` / `ApiSchema` (the request OWNER, per `api-data-source.md` X4 layering), never to a consumer component. Each data-loading-adjacent entry maps cleanly to one of the three bug-15 compliant patterns:

| Entry                                                | Compliant pattern            | Why                                                                                                     |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| A9/A10/A11/A19 (`sendOn`/`interval`/`cache`/`dedup`) | ② gated data-source controls | All `BaseDataSourceSchema` / `ActionDataSourceSchema` fields; data-source LAYER, not component          |
| T11 (tree lazy-load)                                 | ③ user-interaction-driven    | on-expand dispatch mirroring `childrenSource` (NOT mount-time)                                          |
| T23/T25/T27 (table `source`)                         | ① expression-value-binding   | `source?: SchemaValue` reads scope, does NOT fetch (upstream data-source owns the fetch)                |
| U5 (`deleteAction`)                                  | ③ user-interaction-driven    | action-ref via `kind:'prop'`, dispatched on user click-remove mirroring `uploadAction` (NOT mount-time) |
| AG3 (`reload`)                                       | action-graph capability      | targets a named component's source via `refreshSource`/`component:refresh` (NOT a component `api`)      |
| C13 (per-item writeback)                             | ③ action dispatch            | action writes via standard value channel `${name}.${i}.*` (NOT a per-item auto-fetch)                   |

One cosmetic fix applied: **T25** wording "source init fires once per mount" → "`source` expression evaluates once per dialog open (no fan-out)" + pattern-① note, to remove any read as a mount-time fetch.

NOT-ADOPTED coverage confirmed complete: the api/table/file/action docs all carry the "component-level `api`/`initApi`/`interval` → rejected, route through data-source" rejection row.

## How To Read Each Doc

Each per-component file follows a common structure:

- **Header**: component, flux owner doc, priority summary
- **Decision vocabulary**:
  - `DESIGN-GAP` — Flux owner doc is silent on the property; needs a design note.
  - `TEST-GAP` — Flux design claims the property but no test pins it.
  - `BOTH` — both a design note and a test are needed.
  - `LOCK` — design is already correct (and likely implemented); record as a regression anchor because amis lost it across versions.
  - `DESIGN-ACK-NOT-IMPL` — Flux has acknowledged the capability as planned but not yet implemented (decision recorded, work outstanding).
  - `NOT-ADOPTED` — amis design explicitly rejected; recorded so it is not re-proposed.
- **Improvement table**: one row per property — amis-ref, signal, flux owner, severity, the generic property, recommended action
- **Recommended test list**: concrete, falsifiable test descriptions (for the `docs/.../*.test.ts(x)` owners)
- **NOT-ADOPTED list**: amis designs rejected, with one-line rationale (kept so future readers don't re-propose them)

Severities follow `existing-components-improvement-analysis.md` §0.4: `P0` (blocks a main flow) / `P1` (high frequency) / `P2` (common, workaround exists) / `P3` (low frequency).

> **Priority scope note:** per `existing-components-improvement-analysis.md` §0.5, i18n / a11y / keyboard / SSR / performance are **non-range dimensions** in the main roadmap ("Flux 多走独立设计，单独立项评估"). Therefore a `P0` inside this backlog (e.g. `12-i18n.md` I1) is _this backlog's_ priority for back-tracing amis signal, NOT necessarily a main-roadmap P0. Promote to the main roadmap only after the independent evaluation.

## File Index

| File                                                     | Flux component(s)                                                                                             | amis cluster                                             | Signal density           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| `01-form-validation.md`                                  | validation runtime, form-validation.md, array/object-field validation                                         | form/validation, form/formula, form/static               | High (24 entries)        |
| `02-table-and-crud.md`                                   | table, crud, pagination, row-identity, data-source                                                            | table/crud, table/filter, table/pagination, table/export | High (34 entries)        |
| `03-select.md`                                           | select                                                                                                        | form/select                                              | Medium-High (13 entries) |
| `04-combo-and-array-field.md`                            | combo, array-field, object-field                                                                              | form/combo                                               | High (15 entries)        |
| `05-input-fields.md`                                     | input-text, input-number, textarea, email, password                                                           | form/input (subset)                                      | Medium (13 entries)      |
| `06-date-fields.md`                                      | input-date, input-datetime, input-time, date-range, input-month/quarter/year                                  | form/date                                                | High (12 entries)        |
| `07-input-tree.md`                                       | input-tree, tree-select                                                                                       | form/input (tree)                                        | High (7 entries)         |
| `08-input-file-and-image.md`                             | input-file, input-image                                                                                       | form/upload                                              | Medium (8 entries)       |
| `09-layout-surfaces.md`                                  | dialog, drawer, tabs, page, flex, grid, collapse, card, steps, iframe                                         | layout/\*                                                | High (16 entries)        |
| `10-data-display.md`                                     | chart, image, rich-text/markdown, dynamic-renderer, timeline                                                  | renderers/chart, image, rich-text, custom                | Medium (14 entries)      |
| `11-api-data-and-scope.md`                               | api-schema, request-adaptation, data-source, reaction, scope/data-binding                                     | api-data/\*                                              | High (19 entries)        |
| `12-i18n.md`                                             | flux-i18n                                                                                                     | i18n                                                     | Medium (5 entries)       |
| `13-mobile-responsive.md`                                | mobile/responsive baseline                                                                                    | mobile                                                   | Low (2 entries)          |
| `14-action-button-toast-mapping-cards-status-styling.md` | button, action-graph, dropdown-button, toast, mapping, condition-builder, cards, card, status, styling-system | other/ (178)                                             | High (33 entries)        |

(One file per **component** as the task requires. Multiple amis issues about the same component are appended into that one file.)

## How These Docs Relate To Existing Improvement Docs

These docs are a **signal source**, not a replacement for:

- `existing-components-improvement-analysis.md` / `-detail.md` / `-roadmap.md` — Flux's primary improvement roadmap, judged by Flux design principles. This directory feeds it evidence (real production reports) but does not override its decisions.
- each component's own `docs/components/<x>/design.md` — the canonical contract. Entries here that say "Add design note to `<doc>`" should be **merged into the design doc** when the team accepts them; this directory is the staging area.

The recommended workflow when an entry is acted on:

1. Promote the design note into the owner `design.md` decision table.
2. Write the recommended test.
3. Mark the entry here as `RESOLVED → <design.md link> / <test file link>`.

## Cross-Cutting Themes (extracted across all clusters)

These recur across multiple components and are the highest-leverage items:

1. **Lifecycle teardown is asserted in design but rarely tested** — dialog (#6390), iframe message listeners (#5061), chart polling timers (#4037), nested-dialog re-mount storms (#3105). One shared test pattern (mount-heavy-owner → close → assert no retained scope/listener/timer) covers all of them.
2. **Stale-snapshot vs live scope** — dialog action snapshot (#1970), custom component `props.data` snapshot (#2665), markdown static value (#2536), steps/tabs value-not-reactive (#5070, #2005). Flux's lexical-scope + controlled-ownership model is the fix; each owner needs a "reactive, not snapshot" regression test.
3. **Renderer must not hardcode geometry over author intent** — card media image size (#3348), chart min-height (#4365, #6167), grid className expression (#11720). All are the `styling-system.md` rule; these are anchors to lock with tests.
4. **Echo / display-when-value-source-missing** — select option absent (#1731, #5039), input-tree lazy-init race (#3228), input-text null→"null" (#169). Generic "degrade gracefully when the bound value's source is missing/loading" property.
5. **Async request correctness** — concurrent-same-request dedup (#3417), 4xx adaptor reachability (#3465), GET-query mutation by adaptor (#1470), polling not flipping global loading (#2381, #1499).
6. **Clearing a field must propagate symmetrically to set** — select remote-search retains selection (#1264), input-file merge-on-incremental-upload (#5935), dynamic-renderer symmetric value clear (#2801).
7. **Umbrella-switch atomicity** — a single disable/selection flag must be atomic across ALL affordances, no partial disable. condition-builder `disabled` fans out to drag/delete/add/not-input (#4655); card `selectable` disables both highlight visual AND selection state (#3254). (Surfaced by doc 14.)

## Methodology

Each cluster was triaged by an independent explore agent with these constraints:

- Read the INDEX.md of each subdirectory, then deep-read the most relevant ~30–60 issue files.
- Translate each kept issue into a generic Flux property (1–3 sentences), never an amis-parity demand.
- Filter out amis-specific garbage: SDK build, React-version, iconfont sprite, amis-editor-only, echarts-config-deep, amis `dataProvider`/`themeCss`/`mobileUI`, host-routing/multi-page-app.
- Map each to a Flux component and a concrete recommended action (design note or test).
- Several amis issues collapse into one Flux property (e.g. #3122/#3139/#3151/#1313 → "numeric rule expression args").

Triage totals: ~95 validation/formula/static → 24 entries; ~46 table deep-reads (+420 crud titles scanned) → 34 entries; ~50 select+combo → 28 entries (13 select + 15 array-field); ~50 input/date/upload → 37 entries (13 input + 12 date + 6 tree + 8 file, tree split into its own doc); ~250 layout/renderers titles → 30 entries (16 layout + 14 data-display); ~56 api-data/i18n/mobile → 26 entries (19 api-data + 5 i18n + 2 mobile); ~40 `other/` deep-reads (+178 titles scanned) → 33 entries. **~1785 amis issues considered overall (the full `data/useful-llm` corpus), ~215 high-signal entries distilled into 14 component docs.** Each cluster's reject pile (amis-SDK / build / iconfont / React-version / amis-editor-only / echarts-config-deep / amis `dataProvider`/`themeCss`/`mobileUI` / host-routing) was filtered out and is NOT recorded here — those are amis-specific, not generic Flux signal.
