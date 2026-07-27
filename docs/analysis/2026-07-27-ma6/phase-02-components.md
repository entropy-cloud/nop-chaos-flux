# MA6 Phase 2 — Component Docs Audit

> Audit date: 2026-07-27
> Scope: 27 component design docs from `docs/components/` compared against live renderer code
> Method: Read design.md → extract schema props → compare against actual renderer schemas and implementations

---

## Component: page

### Finding 1: Page aside features accurately doc'd and implemented

- Severity: Confirmed accurate
- Doc: `docs/components/page/design.md`:`89-152`
- Code: `packages/flux-renderers-basic/src/page.tsx`:`89-153`
- All aside features (`asideResizable`, `asideMinWidth`, `asideMaxWidth`, `asideSticky`, `asidePosition`) are documented in the Flux Decision Table as "实现" and are fully implemented in the renderer, including pointer-based resize, sticky positioning, and mobile Sheet fallback.

### Finding 2: PageSchema type fields match doc exactly

- Severity: Confirmed accurate
- Doc: `docs/components/page/design.md`:`42`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`24-50`
- `PageSchema` has all fields documented: `title`, `subTitle`, `remark`, `body`, `header`, `footer`, `aside`, `asidePosition`, `asideClassName`, `bodyClassName`, `headerClassName`, `footerClassName`, `toolbarClassName`, `statusPath`, `asideResizable`, `asideMinWidth`, `asideMaxWidth`, `asideSticky`. Mobile responsive behavior in §13 is also accurately reflected in code.

---

## Component: container

### Finding 3: ContainerSchema matches code exactly

- Severity: Confirmed accurate
- Doc: `docs/components/container/design.md`:`52-65`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`162-176`
- `ContainerSchema` has all documented fields: `direction`, `wrap`, `align`, `gap`, `body`, `header`, `footer`, `bodyClassName`, `headerClassName`, `footerClassName`, `responsiveDirection`, `responsiveWrap`. Renderer implements the described dual-DOM structure and flex-body detection.

---

## Component: form

### Finding 4: FormSchema E2g fields fully implemented

- Severity: Confirmed accurate
- Doc: `docs/components/form/design.md`:`55-71`
- Code: `packages/flux-renderers-form/src/schemas.ts`:`82-111`
- All E2g fields (`columnCount`, `mode`, `submitOnChange`, `preventEnterSubmit`, `autoFocus`, `scrollToFirstError`, `static`, `rules`) exist in `FormSchema`. Lifecycle events (`initAction`, `submitAction`, `onSubmitSuccess`, `onSubmitError`, `onValidateError`) are all present. `statusPath` and `valuesPath` are present. Field hint/remark/description fields described in §15 align with `BoundFieldSchemaBase` in `flux-core`.

---

## Component: table

### Finding 5: Table schema aligns with doc (extensive)

- Severity: Confirmed accurate
- Doc: `docs/components/table/design.md`:`60-108`
- Code: `packages/flux-renderers-data/src/schemas.ts`:`114-204`
- All documented ownership fields (`paginationOwnership`, `selectionOwnership`, `sortOwnership`, `filterOwnership`) and their `*StatePath` variants exist. E1b/E1c fields (`columnResize`, `affixHeader`, `prefixRow`, `affixRow`, `combineNum`, `multiSort`, `draggable`, `rowChildrenField`, `childrenSource`, `columnWidthsOwnership`, `columnWidthsStatePath`) are all present. Dynamic column expressions via `"${expr}"` strings are documented and handled in `normalizeTableColumns`.

---

## Component: dialog

### Finding 6: DialogSchema E2f fields match code

- Severity: Confirmed accurate
- Doc: `docs/components/dialog/design.md`:`52-63`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`52-80`
- All E2f fields (`closeOnEsc`, `size`, `width`, `height`, `showCloseButton`, `header`, `footer`, `confirm`, `onConfirm`, `bodyClassName`, `headerClassName`, `footerClassName`) are present. Doc accurately notes that `draggable` and `allowFullscreen` are schema-exposed but behavior-level implementation is deferred (typecheck-only). Doc notes that `onOpen`/`onClose` and `component:open`/`component:close` handles are implemented.

---

## Component: input-text

### Finding 7: InputSchema matches doc with all E2a/E3 fields

- Severity: Confirmed accurate
- Doc: `docs/components/input-text/design.md`:`49-66`
- Code: `packages/flux-renderers-form/src/schemas.ts`:`55-80`
- All fields are present: `placeholder`, `inputMode`, `minLength`, `maxLength`, `pattern`, `prefix`, `suffix`, `clearable`, `trimContents`, `showCounter`, `nativeAutoComplete`, `revealPassword`, `suggestSource`, `suggestDebounce`, `suggestTrigger`, `suggestMinInputLength`, `suggestTemplate`, `suggestEmpty`. Component handles (`clear`/`reset`/`focus`) are documented and implemented via `useInputComponentHandle`.

---

## Component: select

### Finding 8: SelectSchema matches doc with E1a/E3/S4 fields

- Severity: Confirmed accurate
- Doc: `docs/components/select/design.md`:`43-61`
- Code: `packages/flux-renderers-form/src/schemas.ts`:`115-138`
- All fields present: `options`, `groups`, `multiple`, `searchable`, `clearable`, `filterOption`, `searchPlaceholder`, `noResultsText`, `noMatchText`, `virtual`, `optionTemplate`, `searchSource`, `searchMergeMode`. The Combobox migration, echo-fallback contract, and mobile responsive behavior documented in §13-14 are all accurately reflected in the codebase (separate `select-combobox-lists.tsx` and `select-mobile-renderer.tsx`).

---

## Component: combo

### Finding 9: Combo doc mentions `multiple` field absent from code

- Severity: P2
- Doc: `docs/components/combo/design.md`:`21`
- Code: `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`:`99-113`
- Category: inaccurate-prop
- Doc claims: Schema includes `multiple` as a field alongside `addable`, `removable`, `reorderable`, `minItems`, `maxItems`, `itemKey`, `removeWhen`.
- Code reality: `ComboSchema` in code does NOT have a `multiple` field. Fields are: `items`, `columnCount`, `addable`, `removable`, `reorderable`, `minItems`, `maxItems`, `itemKey`, `removeWhen`.
- Fix direction: Remove `multiple` from doc schema or add the field to code if intended as a deferred capability.

### Finding 10: Combo renderer accurately routes to `flux-renderers-form-advanced` (previously mis-documented)

- Severity: Confirmed accurate (was previously a drift, now corrected per W4c convergence)
- Doc: `docs/components/combo/design.md`:`17`
- Code: `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`:`1`
- Doc correctly states source package as `@nop-chaos/flux-renderers-form-advanced`. Still registered via `registerFormAdvancedRenderers`. The `removeWhen` gating logic described in §4 is implemented in `remove-when-gating.ts`.

---

## Component: flex

### Finding 11: FlexSchema matches doc exactly with X5 extensions

- Severity: Confirmed accurate
- Doc: `docs/components/flex/design.md`:`37-38`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`264-276`
- All documented fields present: `direction` (with `'row-reverse'`/`'column-reverse'`), `wrap`, `align` (with `'baseline'`), `justify` (with `'evenly'`), `alignContent` (with all 7 values), `gap`, `responsiveDirection`, `responsiveWrap`. Renderer supports both `body` and `items` regions. Decision on `alignContent` vs `align` boundary is accurately reflected in code.

---

## Component: grid

### Finding 12: Grid doc §4 missing `responsiveColumns` in formal schema list

- Severity: P3
- Doc: `docs/components/grid/design.md`:`20`
- Code: `packages/flux-renderers-layout/src/schemas.ts`:`114-135`
- Category: inaccurate-prop
- Doc claims: Schema fields are `columns`, `gap`, `items`, `autoFlow`, `alignItems`, `justifyItems`.
- Code reality: `GridSchema` also includes `responsiveColumns?: GridResponsiveColumns` (with `sm`/`md`/`lg` breakpoint overrides). Section 13 does document the responsive behavior, but the formal interface in §4 omits it.
- Fix direction: Add `responsiveColumns` to the formal schema list in §4.

---

## Component: tabs

### Finding 13: TabsSchema matches doc with X5/E3 extensions

- Severity: Confirmed accurate
- Doc: `docs/components/tabs/design.md`:`35-48`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`139-160` (TabsSchema), `110-125` (TabsItemSchema)
- All documented fields present: `items`, `value`, `defaultValue`, `valueOwnership`, `valueStatePath`, `statusPath`, `toolbar`, `orientation`, `variant`, `tabsMode`, `sidePosition`, `closable`, `draggable`, `addable`, `contentClassName`, `toolbarClassName`. Per-tab fields `badge`, `icon`, `mountOnEnter`, `unmountOnExit` exist on `TabsItemSchema`. The `mountOnEnter`/`unmountOnExit` priority rules documented in the Decision section match code behavior.

---

## Component: crud

### Finding 14: CRUD schema has `syncLocation` field despite doc explicitly marking it "不采纳"

- Severity: P2
- Doc: `docs/components/crud/design.md`:`43`
- Code: `packages/flux-renderers-data/src/crud-schema.ts`:`179`
- Category: outdated-doc
- Doc claims: `syncLocation` is "不采纳 — 偏路由/宿主导航职责，不在组件".
- Code reality: `CrudSchema` exposes `syncLocation?: boolean` and `CrudQueryFormConfig` also has `syncLocation?: boolean`. The field exists despite the rejection decision.
- Fix direction: Either (a) remove the field from code if genuinely rejected, or (b) update the decision table to reflect adoption. Decision should be coordinated with the route-persistence architecture.

### Finding 15: CRUD main schema fields align with doc

- Severity: Confirmed accurate (for fields other than Finding 14)
- Doc: `docs/components/crud/design.md`:`22-50`
- Code: `packages/flux-renderers-data/src/crud-schema.ts`:`140-210`
- All documented ownership fields, `listMode`, `selection.*`, `polling.*`, `filterTogglable`, `quickSaveAction`/`quickSaveItemAction`, `listActions`, `toolbar`, `footerToolbar`, `loadAction` are all present in `CrudSchema`. Carrier boundary (§4.1) is implemented with `listMode` routing to `cards`/`list` renderers.

---

## Component: data-source

### Finding 16: DataSource schema and implementation match doc

- Severity: Confirmed accurate
- Doc: `docs/components/data-source/design.md`:`21-25`
- Code: `packages/flux-renderers-data/src/data-source-renderer.tsx`:`11-86`
- Doc describes `name`, `formula`, `action`, `args`, `interval`, `stopWhen`, `silent`, `statusPath`, `dependsOn`, `initialData`, `mergeStrategy`, `mergeKey`, `sendOn`, `initFetch`, `onSuccess`, `onError` as key fields. The renderer implementation registers a `ComponentHandle` with `refresh`, `cancel`, and `start` capabilities. Binary download fields (`responseType`, `downloadFileName`) are documented and propagated via `finalizeApiRequest`/`materializeApiRequest`.

---

## Component: cards

### Finding 17: CardsSchema matches doc with advertised-but-dead fixes applied

- Severity: Confirmed accurate
- Doc: `docs/components/cards/design.md`:`21-24` (schema), `49-56` (dead contract honesty)
- Code: `packages/flux-renderers-content/src/schemas.ts`:`207-227`
- All documented fields present: `items`, `card`, `empty`, `keyField`, `selectionMode`. The doc's honesty section (§8.1) correctly notes that `selectionOwnership`/`selectionStatePath`/`onPageChange` were removed from the schema because they were never wired in the renderer. `columns` responsive support via `CardsResponsiveColumns` matches the doc's §13. Selection is local controlled state per doc.

---

## Component: condition-builder

### Finding 18: Condition-builder schema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/condition-builder/design.md`:`49-79`
- Code: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts` (ConditionBuilderSchema)
- All documented fields present: `fields`, `builderMode`, `embed`, `title`, `searchable`, `draggable`, `showAndOr`, `showNot`, `showIf`, `uniqueFields`, `formulas`, `formulaForIf`, `operators`, `addBtnVisibleOn`, `addGroupBtnVisibleOn`, `placeholder`, i18n labels, `maxDepth`, `maxItemsPerGroup`. E0d cleanups (removed `selectMode: tree/chained`, removed `showIcon`) correctly reflected. The `showAndOr` camelCase fix from the earlier audit (Finding #1 in components-audit.md) is confirmed resolved.

---

## Component: tree-select

### Finding 19: TreeSelectSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/tree-select/design.md`:`49-66`
- Code: `packages/flux-renderers-form/src/schemas.ts`:`197-218`
- All documented fields present: `options`, `treeMode`, `childrenKey`, `labelField`, `valueField`, `cascade`, `searchable`, `onlyLeaf`, `showPathLabel`, `clearable`, `placeholder`, `virtualThreshold`, `childrenSource`, `searchSource`. `showIcon` correctly removed. E2d source contract using `TreeSourceConfig` matches documented behavior. Implementation exists in `tree-controls.tsx`.

---

## Component: wizard

### Finding 20: WizardSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/wizard/design.md`:`28-59`
- Code: `packages/flux-renderers-layout/src/schemas.ts`:`28-65`
- All documented fields present: `steps`, `value`, `defaultValue`, `statusPath`, `mode`, `linear`, `allowStepJump`, `mountOnEnter`, `unmountOnExit`, `actionFinishLabel`, `actionNextLabel`, `actionPrevLabel`, `actionNextSaveLabel`, `onChange`, `onStepCommit`, `onComplete`, `onStepError`. `WizardStepSchema` has `key`, `title`, `description`, `body`, `actions`, `visible`, `disabled`, `formId`, `beforeEnter`, `beforeLeave`. The interaction/lifecycle state separation (§6) is explicitly implemented as two distinct state objects in `wizard-renderer.tsx`.

---

## Component: alert

### Finding 21: AlertSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/alert/design.md`:`20-22`
- Code: `packages/flux-renderers-content/src/schemas.ts`:`231-246`
- All fields present: `level`, `icon`, `closable`, `title`, `body`, `actions`, `onClose`. Renderer implements level-based styling and closable behavior. The separation from toast/dialog/field-error (§12 risk) is maintained.

---

## Component: badge

### Finding 22: BadgeSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/badge/design.md`:`21`
- Code: `packages/flux-renderers-basic/src/schemas.ts`:`258-262`
- Fields `text` and `level` present. Renderer maps `level` to ui `Badge` variant correctly. `level` values `'info' | 'success' | 'warning' | 'danger'` match the doc.

---

## Component: card

### Finding 23: CardSchema matches doc with all regions and className contract

- Severity: Confirmed accurate
- Doc: `docs/components/card/design.md`:`20-21`
- Code: `packages/flux-renderers-content/src/schemas.ts`:`93-112`
- All fields present: `title`, `header`, `body`, `footer`, `actions`, `image`, `imageClassName`, `variant`, `onClick`. The L14 media className contract (`imageClassName` merged with default `aspect-video w-full object-cover`) is implemented. `onClick` operates in the card node scope (not per-row itemScope), matching the doc's §8 distinction.

---

## Component: carousel

### Finding 24: CarouselSchema matches doc with WCAG auto-play contract

- Severity: Confirmed accurate
- Doc: `docs/components/carousel/design.md`:`20-21`, `56-63`
- Code: `packages/flux-renderers-content/src/schemas.ts`:`343-358`
- All fields present: `items`, `autoPlay`, `interval`, `loop`, `controls`, `indicators`, `onChange`. WCAG 2.2.2 auto-play accessibility contract (hover/focus/offscreen layered pause + reduced-motion) is implemented with tests in `carousel-autoplay.test.tsx`. Component handles (`component:next`, `component:prev`, `component:setValue`) are implemented. `onChange` payload uses `activeIndex` per the Decision A cleanup.

---

## Component: pull-refresh

### Finding 25: PullRefreshSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/pull-refresh/design.md`:`34-73`
- Code: `packages/flux-renderers-mobile/src/schemas.ts`:`4-31`
- All fields present: `body`, `direction`, `threshold`, `loadingText`, `pullingText`, `loosingText`, `successText`, `successDuration`, `animationDuration`, `disabled`, `onRefresh`. The OA-14 direction lock (`'down'` only) is enforced. State machine (normal→pulling→loosing→loading→success→normal) is implemented. Documentation correctly notes that `'up'` was removed from the type.

---

## Component: notice-bar

### Finding 26: NoticeBarSchema matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/notice-bar/design.md`:`43-73`
- Code: `packages/flux-renderers-mobile/src/schemas.ts`:`95-107`
- All fields present: `text`, `scrollable`, `speed`, `direction`, `loop`, `closable`, `icon`, `variant`, `onClick`, `onClose`. The marquee/scrollable dual mode is implemented. OA-15 multi-text carousel with `CAROUSEL_INTERVAL_MS` is implemented.

---

## Component: countdown

### Finding 27: Countdown doc decision table says `prefix`/`suffix` are "value-or-region" but schema types as `string`

- Severity: P3
- Doc: `docs/components/countdown/design.md`:`29`, `57-59`
- Code: `packages/flux-renderers-mobile/src/schemas.ts`:`79-91`
- Category: inaccurate-prop
- Doc claims (decision table row): `prefix` / `suffix` are `value-or-region` (which would allow schema fragments as content).
- Code reality: `CountdownSchema` has `prefix?: string` and `suffix?: string` — they are plain `string` typed, not `SchemaInput`/value-or-region.
- Fix direction: Either upgrade the schema types to `SchemaInput` (allowing region content) or correct the doc decision table to reflect the `string`-only reality. The schema section in the doc correctly shows `string`, so only the decision table is wrong.

### Finding 28: Countdown schema otherwise matches doc

- Severity: Confirmed accurate
- Doc: `docs/components/countdown/design.md`:`40-61`
- Code: `packages/flux-renderers-mobile/src/schemas.ts`:`79-91`
- `time`, `targetTime`, `format`, `millisecond`, `paused`, `autoStart`, `prefix`, `suffix`, `onFinish` all present. Format string spec (DD/HH/mm/ss/SSS) matches `formatCountdown` implementation.

---

## Component: calendar

### Finding 29: Calendar implementation exists despite doc stating it's not in manifest

- Severity: P3
- Doc: `docs/components/calendar/design.md`:`30-31`
- Code: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`
- Category: outdated-doc
- Doc claims: "当前尚未在 `examples.manifest.json` 注册，需新增为 `targetContract` 条目" — implying the renderer is not yet registered.
- Code reality: Full calendar implementation exists in `flux-renderers-scheduling/src/calendar/` with `calendar.tsx`, tests (`calendar.test.tsx`, `calendar.integration.test.tsx`), components, hooks, and utils. It IS registered via `scheduling-renderer-definitions.ts`.
- Fix direction: Update doc to reflect that calendar is a `runtime` registered renderer, not a `targetContract`.

---

## Component: gantt

### Finding 30: Gantt doc accurately describes extensive implementation

- Severity: Confirmed accurate
- Doc: `docs/components/gantt/design.md`:`50-80`
- Code: `packages/flux-renderers-scheduling/src/gantt/`
- All documented features exist: task bar rendering (`gantt-bars.tsx`), grid columns (`gantt-cellgrid.tsx`), time scales (`gantt-timescale.tsx`), dependency lines (`gantt-links.tsx`), drag interactions (hooks), undo stack (`undo-stack.ts`), tree hierarchy (`gantt-tree-utils.ts`), zoom controls, markers, editor (`gantt-editor.tsx`). Doc accurately notes scheduling-specific features as "计划实现" (e.g., work calendar, resource assignment).

---

## Component: kanban

### Finding 31: Kanban doc accurately describes implementation

- Severity: Confirmed accurate
- Doc: `docs/components/kanban/design.md`:`75-80`
- Code: `packages/flux-renderers-scheduling/src/kanban/`
- All documented features exist: BoardData model, pragmatic-drag-and-drop (DnD kanban), card templates (cardTemplate region), column headers (columnHeader region), pure-function helpers (`kanban-helpers.ts`), flat dictionary model, activity log, virtual scrolling (P2), filter/search (P1), column reordering, configMap dispatch. Component rendering architecture matches the Decision table.

---

## Summary

| Category                       | Count | Status |
| ------------------------------ | ----- | ------ |
| Components audited             | 27    | —      |
| Confirmed accurate (no issues) | 22    | ✅     |
| P2 findings                    | 2     | ⚠️     |
| P3 findings                    | 3     | 🔍     |

### Key Issues Requiring Action

1. **P2 — CRUD `syncLocation`**: Doc explicitly marks as "不采纳" but code exposes the field (`crud-schema.ts:179`). Needs reconciliation: either remove from code or update doc decision table.

2. **P2 — Combo `multiple`**: Doc lists `multiple` as a schema field but `ComboSchema` has no such field (`composite-schemas.ts:99-113`). If combos shouldn't support a non-multiple mode, remove from doc; if `multiple` is planned, annotate as deferred.

3. **P3 — Grid `responsiveColumns` omitted from §4**: The formal schema list in §4 is missing `responsiveColumns` (present in code and documented in §13). Add to §4.

4. **P3 — Countdown `prefix`/`suffix` type mismatch**: Decision table says "value-or-region" but code types as `string`. Align one direction.

5. **P3 — Calendar registration status**: Doc says "尚未注册" but implementation is live. Update doc to reflect `runtime` status.
