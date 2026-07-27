# MA4.2 — Basic + Content + Mobile Test Coverage Audit

> Plan Status: completed
> Last Updated: 2026-07-27
> Source Plan: `docs/plans/2026-07-27-1201-2-ma42-basic-content-mobile-test-coverage-audit.md`
> Scope: flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-content, flux-renderers-mobile

## Package Summary

| Package       | Source Files  | Test Files | Renderers | Total Gaps | P1    | P2      | P3     |
| ------------- | ------------- | ---------- | --------- | ---------- | ----- | ------- | ------ |
| basic         | ~30           | 43         | 17        | 42         | 1     | 36      | 5      |
| form          | ~35           | ~25        | 21        | 30         | 3     | 23      | 4      |
| form-advanced | ~20           | ~15        | 18        | 16         | 0     | 14      | 2      |
| data          | ~25           | ~20        | 9         | 50         | 1     | 42      | 7      |
| content       | 85            | ~15        | 20        | 22         | 1     | 17      | 4      |
| mobile        | 20            | ~8         | 5         | 12         | 0     | 10      | 2      |
| **Total**     | **261+85+20** | **~126**   | **94**    | **172**    | **6** | **142** | **24** |

## Dedup Rules Applied

From `01-contract-baseline.md` dedup table:

- MA3.2 F1-F9 (crud-raw-schema-read, mobile CSS, fieldframe-bypass, clipboard duplicate, large files) — excluded
- OA-14..OA-17 (mobile adversarial findings) — excluded
- DV-DISP-01..DV-DISP-04 (diff-view display operability) — excluded
- H1/P0-1/P0-2/P0-3 (components adversarial) — excluded
- Bug notes #33/#42/#49/#60/#65 — excluded
- MA4.1 F01-F22 (core+runtime test coverage) — excluded; some cross-referenced below

## P0/P1 Finding Index

| Finding ID   | Severity | Package            | Description                                                                                                                       | Source File                              | Status | Fix Plan    |
| ------------ | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ | ----------- |
| MA42-B-P1-01 | P1       | basic (Page)       | `collectDescendantValidation` contract has zero test coverage                                                                     | `02-round1-props-mapping.md` GB-22       | open   | Pending MR2 |
| MA42-F-P1-01 | P1       | form (Form)        | `initAction` lifecycle before form render untested                                                                                | `02-round1-props-mapping.md` GF-05       | open   | Pending MR2 |
| MA42-F-P1-02 | P1       | form               | `submitOnChange` debounce timing untested                                                                                         | `02-round1-props-mapping.md` GF-18       | open   | Pending MR2 |
| MA42-F-P1-03 | P1       | form (FieldFrame)  | `aria-labelledby`/`aria-describedby`/`aria-errormessage`/`aria-invalid` wiring through FieldFrame has zero tests                  | `02-round1-props-mapping.md` GF-24       | open   | Pending MR2 |
| MA42-D-P1-01 | P1       | data (DataSource)  | `onSuccess`/`onError` events compiled into artifact but never consumed/delivered per H1 finding                                   | `02-round1-props-mapping.md` GD-03       | open   | Pending MR2 |
| MA42-C-P1-01 | P1       | content (DiffView) | Reaction handles (`toggleViewType`/`setViewType`/`expandAll`/`collapseAll`) have zero tests despite being documented as reactions | `02-round1-props-mapping.md` GC-04/GC-13 | open   | Pending MR2 |

### Cross-Reference to Existing Tracked P1s

The following P1 findings from MA4.1 have cross-cutting relevance to basic/content/mobile:

- **MA4-F02** (P1): Validation errors never tested through React UI (FieldFrame error display) — directly affects form renderers
- **MA4-F08** (P1): Cross-layer integration tests (compile→runtime→react→renderer) entirely absent
- **MA4-F09** (P1): Data-source/reaction declarative lowering path untested — directly affects data-source and reaction renderers

These are already tracked in arm-index and marked for MR2; not re-added here.

## P2 Finding Index (Selected High-Impact)

### Package: basic-renderers

| ID           | Package                 | Gap                                                           | Source   |
| ------------ | ----------------------- | ------------------------------------------------------------- | -------- |
| MA42-B-P2-01 | basic (Page)            | Title region as value-or-region untested                      | R1 GB-23 |
| MA42-B-P2-02 | basic (Page)            | Mobile aside→Sheet collapse untested                          | R1 GB-24 |
| MA42-B-P2-03 | basic (Container)       | `staticCapable: true` behavior for container                  | R1 GB-25 |
| MA42-B-P2-04 | basic (Container)       | Semantic props `direction` mapping untested in isolation      | R1 GB-26 |
| MA42-B-P2-05 | basic (Flex)            | `items` vs `body` region choosing logic untested              | R1 GB-27 |
| MA42-B-P2-06 | basic (Fragment)        | `isolate` scope isolation boundary untested                   | R1 GB-28 |
| MA42-B-P2-07 | basic (Loop)            | `lazyEval` itemData evaluation timing untested                | R1 GB-29 |
| MA42-B-P2-08 | basic (Button)          | `countDown` + `countDownTpl` display format untested          | R1 GB-30 |
| MA42-B-P2-09 | basic (Button)          | `href` navigation integration (beyond shadcn) untested        | R1 GB-31 |
| MA42-B-P2-10 | basic (Tabs)            | `closable`/`draggable`/`addable` untested                     | R1 GB-32 |
| MA42-B-P2-11 | basic (Tabs)            | `valueOwnership: controlled` lifecycle untested               | R1 GB-33 |
| MA42-B-P2-12 | basic (Dialog)          | Declarative `open` prop vs controlled `open` prop distinction | R1 GB-34 |
| MA42-B-P2-13 | basic (Reaction)        | `debounce`/`once` timing semantics untested                   | R1 GB-35 |
| MA42-B-P2-14 | basic (Loop)            | `items: null`/`undefined`/non-array crashes                   | R3       |
| MA42-B-P2-15 | basic (DynamicRenderer) | Network error state untested                                  | R3       |
| MA42-B-P2-16 | basic (Text)            | `copyable` clipboard integration untested                     | R1       |

### Package: form

| ID           | Package | Gap                                                                      | Source   |
| ------------ | ------- | ------------------------------------------------------------------------ | -------- |
| MA42-F-P2-01 | form    | `static` propagation to wrapped FieldFrame children                      | R1 GF-06 |
| MA42-F-P2-02 | form    | `mode` (normal/horizontal/inline) `columnCount` grid layout              | R1 GF-07 |
| MA42-F-P2-03 | form    | `preventEnterSubmit` key handler interception                            | R1 GF-08 |
| MA42-F-P2-04 | form    | `scrollToFirstError` scroll behavior                                     | R1 GF-09 |
| MA42-F-P2-05 | form    | Cross-field `rules` (equalsField/notEqualsField)                         | R1 GF-10 |
| MA42-F-P2-06 | form    | `$form` scope export (loading/validating/submitting/error)               | R1 GF-11 |
| MA42-F-P2-07 | form    | `submitAction`→`onSubmitSuccess`/`onSubmitError`/`onValidateError` chain | R1 GF-12 |
| MA42-F-P2-08 | form    | Input renderers component capabilities (clear/reset/focus)               | R1 GF-13 |
| MA42-F-P2-09 | form    | `suggestSource` contract on text inputs                                  | R1 GF-14 |
| MA42-F-P2-10 | form    | `data: null` submit                                                      | R3       |
| MA42-F-P2-11 | form    | Input renderers missing `placeholder` attribute                          | R3       |
| MA42-F-P2-12 | form    | Select null/empty options (non-source mode)                              | R3       |
| MA42-F-P2-13 | form    | RadioGroup null options                                                  | R3       |

### Package: form-advanced

| ID           | Package                     | Gap                                              | Source   |
| ------------ | --------------------------- | ------------------------------------------------ | -------- |
| MA42-A-P2-01 | form-adv (ArrayEditor)      | Add/remove item boundary at minLength/maxLength  | R1 GA-01 |
| MA42-A-P2-02 | form-adv (ArrayEditor)      | `items: null`                                    | R3       |
| MA42-A-P2-03 | form-adv (Combo)            | Multi-condition grouping interaction             | R1 GA-02 |
| MA42-A-P2-04 | form-adv (Combo)            | `items: null`                                    | R3       |
| MA42-A-P2-05 | form-adv (ConditionBuilder) | AND/OR group nesting logic                       | R1 GA-03 |
| MA42-A-P2-06 | form-adv (ConditionBuilder) | `fields: null`/`source: null`                    | R3       |
| MA42-A-P2-07 | form-adv (InputTable)       | Editable cell modes                              | R1 GA-04 |
| MA42-A-P2-08 | form-adv (InputTable)       | `columns: null`                                  | R3       |
| MA42-A-P2-09 | form-adv (Picker)           | Dialog+search interaction, source-driven options | R1 GA-05 |
| MA42-A-P2-10 | form-adv (Picker)           | Null options                                     | R3       |
| MA42-A-P2-11 | form-adv (Transfer)         | Selection sync between panes                     | R1 GA-06 |
| MA42-A-P2-12 | form-adv (Transfer)         | Null options                                     | R3       |
| MA42-A-P2-13 | form-adv (VariantField)     | `variants: null`                                 | R3       |

### Package: data

| ID           | Package           | Gap                                                 | Source   |
| ------------ | ----------------- | --------------------------------------------------- | -------- |
| MA42-D-P2-01 | data (Table)      | `affixRow`/`combineNum`/`combineFromIndex` untested | R1 GD-04 |
| MA42-D-P2-02 | data (Table)      | `virtualThreshold` virtualization boundary          | R1 GD-05 |
| MA42-D-P2-03 | data (Table)      | `columnResize` + `affixHeader`                      | R1 GD-06 |
| MA42-D-P2-04 | data (Table)      | `quickSaveItemAction` per-row quick-save            | R1 GD-07 |
| MA42-D-P2-05 | data (CRUD)       | `loadAllData` mode                                  | R1 GD-08 |
| MA42-D-P2-06 | data (CRUD)       | `polling` orchestration lifecycle                   | R1 GD-09 |
| MA42-D-P2-07 | data (CRUD)       | `clientMode` local filtering/sorting/pagination     | R1 GD-10 |
| MA42-D-P2-08 | data (CRUD)       | `syncLocation` URL state sync                       | R1 GD-11 |
| MA42-D-P2-09 | data (CRUD)       | `autoGenerateQueryForm`                             | R1 GD-12 |
| MA42-D-P2-10 | data (List)       | `paginationOwnership: controlled/scope`             | R1 GD-13 |
| MA42-D-P2-11 | data (List)       | Infinite load-more via `onLoadMore`                 | R1 GD-14 |
| MA42-D-P2-12 | data (List)       | `selectionMode` transitions                         | R1 GD-15 |
| MA42-D-P2-13 | data (DataSource) | `sendOn` guard condition                            | R1 GD-16 |
| MA42-D-P2-14 | data (DataSource) | `mergeToScope`/`mergeStrategy`/`mergeKey`           | R1 GD-17 |
| MA42-D-P2-15 | data (DataSource) | `dependsOn` reactive re-fetch                       | R1 GD-18 |
| MA42-D-P2-16 | data (Chart)      | `onClick`/`onHover` event wiring                    | R1 GD-19 |
| MA42-D-P2-17 | data (Chart)      | Lazy-load lifecycle                                 | R1 GD-20 |
| MA42-D-P2-18 | data (Pagination) | `pageSizeOptions`/mode switching                    | R1 GD-21 |
| MA42-D-P2-19 | data (Table)      | `columns: null`/`source: null`, page 0 clamp        | R3       |
| MA42-D-P2-20 | data (DataSource) | `name: null`                                        | R3       |
| MA42-D-P2-21 | data (Chart)      | `series: null`                                      | R3       |
| MA42-D-P2-22 | data (Tree)       | `data: null`                                        | R3       |
| MA42-D-P2-23 | data (List)       | `items: null`                                       | R3       |

### Package: content

| ID           | Package                     | Gap                                                               | Source   |
| ------------ | --------------------------- | ----------------------------------------------------------------- | -------- |
| MA42-C-P2-01 | content (Cards)             | `selectionMode` transitions (none/single/multiple)                | R1 GC-05 |
| MA42-C-P2-02 | content (Alert)             | `level`→`icon` mapping + `closable`→`onClose`                     | R1 GC-06 |
| MA42-C-P2-03 | content (Mapping/Status)    | `value: null`→`defaultLabel`/`placeholder` fallback               | R1 GC-07 |
| MA42-C-P2-04 | content (Image/Video/Audio) | `onLoadError` event dispatch                                      | R1 GC-08 |
| MA42-C-P2-05 | content (Carousel)          | `autoPlay`/`interval`/`loop`/`onChange` interaction               | R1 GC-09 |
| MA42-C-P2-06 | content (QrCode)            | `level` (L/M/Q/H) enums, `foreground`/`background` color          | R1 GC-10 |
| MA42-C-P2-07 | content (Value-or-region)   | `title`/`description`/`empty`/`label` as value-or-region patterns | R1 GC-11 |
| MA42-C-P2-08 | content (DiffView)          | Multi-file navigation cross-file diff toggle                      | R1 GC-12 |
| MA42-C-P2-09 | content (DiffView)          | `viewType` split/unified/three-column mode override               | R1 GC-14 |
| MA42-C-P2-10 | content (Markdown/Html)     | `content: null`, `sanitize: false` + XSS, `allowHtml: true`       | R3       |
| MA42-C-P2-11 | content (Link)              | `href: null`                                                      | R3       |
| MA42-C-P2-12 | content (DiffView)          | `oldContent: null`/`newContent: null`/`files: null` crash         | R3       |

### Package: mobile

| ID           | Package                 | Gap                                        | Source   |
| ------------ | ----------------------- | ------------------------------------------ | -------- |
| MA42-M-P2-01 | mobile (PullRefresh)    | `disabled` while loading                   | R1 GM-01 |
| MA42-M-P2-02 | mobile (InfiniteScroll) | `disabled` edge cases                      | R1 GM-02 |
| MA42-M-P2-03 | mobile (SwipeCell)      | `closeOnOutside` on outside click          | R1 GM-03 |
| MA42-M-P2-04 | mobile (SwipeCell)      | `disabled` state prevents open/close       | R1 GM-04 |
| MA42-M-P2-05 | mobile (SwipeCell)      | `direction` (left/right/both)              | R1 GM-05 |
| MA42-M-P2-06 | mobile (Countdown)      | `paused`/`autoStart` lifecycle             | R1 GM-06 |
| MA42-M-P2-07 | mobile (Countdown)      | `format`/`millisecond` display modes       | R1 GM-07 |
| MA42-M-P2-08 | mobile (NoticeBar)      | `scrollable`/`speed`/`direction` animation | R1 GM-08 |
| MA42-M-P2-09 | mobile (Countdown)      | `time: -1000` negative                     | R3       |
| MA42-M-P2-10 | mobile (InfiniteScroll) | `distance: 0` boundary                     | R3       |

## Cross-Cutting Findings

| ID        | Packages        | Gap                                                                                                                                         | Severity                        |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| MA42-X-01 | all renderers   | Cross-layer integration tests (compile→runtime→react→renderer) entirely absent for basic/content/mobile renderers                           | P1 (already tracked as MA4-F08) |
| MA42-X-02 | basic+form+data | Negative scenario coverage (null items/columns/source/options) is sparse — 17 uncovered P1 null-crash risk items across 6 packages          | P1                              |
| MA42-X-03 | data+content    | DataSource `onSuccess`/`onError` + DiffView reactions both share the same untested pattern: compiled artifact with no consumption path test | P1                              |
| MA42-X-04 | form            | FieldFrame aria accessibility contract has zero test coverage across all wrapped renderers                                                  | P1                              |

## Coverage Assessment by Package

### flux-renderers-basic — Moderate (S-weak on structural contracts)

43 test files exist. Button, Dialog, Tabs, DynamicRenderer have targeted test files. **Weak areas**: Page validation-contract, Container semantic props, Loop lazyEval, Reaction debounce/once. **Negative gaps**: Loop null items (P1), DynamicRenderer fetch error (P1).

### flux-renderers-form — Moderate (M-weak on lifecycle)

Input renderers have good coverage via shared test patterns. **Weak areas**: Form lifecycle (initAction, submitOnChange, scrollToFirstError), FieldFrame aria, cross-field rules, $form scope export. **Negative gaps**: null data, null options.

### flux-renderers-form-advanced — Weak

Large files with limited test coverage. **Weak areas**: ArrayEditor itemsRef staleness (bug #49 re-test exists), Combo grouping, ConditionBuilder nesting, Picker dialog integration, InputTable editing. **Negative gaps**: null items across most composite renderers (5 P1-level crash risks).

### flux-renderers-data — Moderate (S-weak on ownership)

Table and CRUD have dedicated test files. **Weak areas**: DataSource onSuccess/onError (P1), Chart lazy-load + events, Pagination ownership modes, List infinite load-more. **Negative gaps**: null columns/source (P1 crash risk).

### flux-renderers-content — Weak (B-package gap)

20 renderers with ~15 test files. Some strong coverage (mapping, status, image, video, audio, qrcode negative tests). **Weak areas**: DiffView reactions (P1), Cards selection, Alert closable, Carousel autoPlay, value-or-region patterns, Markdown/Html XSS. **Negative gaps**: DiffView null content (P1), Markdown/Html null content (P1).

### flux-renderers-mobile — Adequate (C-package best)

5 renderers with reasonable coverage. OA-14..OA-17 findings identified concrete gaps. **Weak areas**: SwipeCell disabled+closeOnOutside, PullRefresh disabled, NoticeBar scrollable, Countdown paused/autoStart. **Negative gaps**: Countdown negative time (P1), InfiniteScroll zero distance.

## Recommended Next Steps (by priority)

1. **MR2 fix plan**: Address all 6 new P1 findings (MA42-\*-P1-01..06) plus cross-reference existing MA4-F08 (integration tests)
2. **Null-crash regression pack**: Add focused negative tests for null items/columns/source/options on Table, CRUD, List, Tree, Chart, ArrayEditor, Combo, ConditionBuilder, Picker, Transfer, InputTable — highest ROI for crash prevention
3. **Form lifecycle test pack**: initAction, submitOnChange debounce, scrollToFirstError, static propagation, mode/columnCount
4. **FieldFrame aria test pack**: Add accessibility assertions to wrapped renderer tests
5. **Mobile edge case pack**: SwipeCell disabled+closeOnOutside, Countdown negative+autoStart, PullRefresh disabled
6. **Content gap pack**: Cards selection modes, Alert closable, Carousel autoPlay, QrCode level, value-or-region patterns, Markdown/Html sanitize

## Audit Files

- `docs/analysis/2026-07-27-ma4-basic-content-mobile-test-coverage/01-contract-baseline.md` — Stable contract baseline (270 lines)
- `docs/analysis/2026-07-27-ma4-basic-content-mobile-test-coverage/02-round1-props-mapping.md` — Props→test mapping (532 lines)
- `docs/analysis/2026-07-27-ma4-basic-content-mobile-test-coverage/03-round2-bug-regression.md` — Bug regression check (234 lines)
- `docs/analysis/2026-07-27-ma4-basic-content-mobile-test-coverage/04-round3-negative-tests.md` — Negative tests (639 lines)
