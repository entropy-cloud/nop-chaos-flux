# B7 P2/P3 Triage Worksheet

> Status: B7 Phase 1 audit artifact (99 signals × verdict + evidence)
> Source: 14 per-component docs (`01-14*.md`), 99 P2/P3 rows (97 single-decision + 2 composite I11/D3)
> Verdict taxonomy: `covered-by` | `landed-anchor` | `landed-doc-note` | `watch-only` | `out-of-scope-feature`
> Marker convention: each source row carries an inline `RESOLVED (B7): <verdict> <evidence>` in its AMIS-REF cell. This file is the consolidated audit index.

## Tally

| Verdict              | Count  | Notes                                                                                              |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| covered-by           | 21     | B1–B6 test/doc already locks the property (thematic or direct); incl. I11 (clamp already anchored) |
| landed-anchor        | 1      | T13 (tree-table no-cascade LOCK) — Phase 2                                                         |
| landed-doc-note      | 1      | F2 (crud cleared-field query semantics) — Phase 2                                                  |
| out-of-scope-feature | 8      | T2, T28, I10, D10, TR7, DD7, A10, M2 (genuinely-absent features)                                   |
| watch-only           | 68     | construct-true / low-frequency / host-layer / depends-on-unimplemented-feature — each with reason  |
| **Total**            | **99** |                                                                                                    |

Every `watch-only` / `out-of-scope-feature` item below carries a `Why Not Blocking Closure` reason (Anti-Slacking). No in-scope live defect / contract drift is silently downgraded — B1–B6 already fixed all P0/P1 live defects; P2/P3 residuals are genuinely non-blocking.

---

## 01-form-validation.md (5)

| ID  | Verdict    | Evidence / Why Not Blocking                                                                                                                                                                                    |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V7  | covered-by | B3.2 `b32-array-submit-and-validate.test.tsx` (C7: submit validates all rows; validation not tied to added-vs-loaded origin) + B1.2 V5 (array col default no-suppress)                                         |
| V11 | watch-only | Built-in format rules delegate to stable stdlib regex (email/phone/url/id-card); no Flux-specific regression path observed; P2 low-frequency. B1.2 deferred V11/V12 as optional-only-if-Flux-worthy.           |
| V12 | watch-only | Rule-kind vocabulary already separates presence (`required`) from content (pattern/length); B1.2 Rule Template Model notes cover semantics; formal vocabulary table = optimization-candidate, no drift signal. |
| V15 | covered-by | B1.2 `validation-rule-semantics-and-lifecycle.test.ts` (V15: pattern failure renders author message, never raw regex source)                                                                                   |
| V24 | watch-only | Validation summaries already render field labels (construct-true); label-over-name fallback is a rendering detail; P2 low-frequency, no drift signal.                                                          |

## 02-table-and-crud.md (21)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                                                                                                              |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T2  | out-of-scope-feature | B3.1 adjudicated `out-of-scope improvement` → successor B7. Literal-dot/symbol field name via bracket-key resolution is orthogonal to T6 nested-path; distinct path-binding feature.     |
| T4  | watch-only           | Pager re-renders from reactive `total` (Flux pagination is reactive scope-driven); late-binding no-remount holds by construction; low-risk.                                              |
| T7  | watch-only           | Sort and filter are independent state slices/DTOs (construct-true, applying one doesn't clear the other); P2 low-frequency.                                                              |
| T9  | covered-by           | B3.3 fixed-left + selection-column offset anchor (pixel-align across h-scroll)                                                                                                           |
| T10 | covered-by           | B3.3 `setSelection(['k1','k99'])` cross-page + `keepOnPageChange` anchor                                                                                                                 |
| T12 | watch-only           | Tree expansion is rowKey-keyed state (construct-true survives refresh if same keys re-materialize); P2 low-frequency.                                                                    |
| T13 | landed-anchor        | LOCK amis lost (#5865). Phase 2 anchor: select parent in tree-table → children NOT auto-selected. Flux selection is flat `Set<rowKey>` with zero cascade code; anchor locks the absence. |
| T14 | watch-only           | Editable-tree add-child-into-row is niche; row-index-bridge at nested path holds by construction; P2 low-frequency.                                                                      |
| T16 | watch-only           | Multi-level header + fixed-column alignment is visual tolerance; construct-true; P2 low-risk.                                                                                            |
| T17 | watch-only           | `autoFillHeight` is 暂不实现; documenting a precondition for an unimplemented feature is premature — re-evaluate when autoFillHeight lands.                                              |
| T19 | watch-only           | Summary-eval bindings (`$table.rows`) are an internal collection detail; documenting a formal vocabulary is optimization-candidate; no drift signal.                                     |
| T20 | watch-only           | `combineNum` rowSpan merge + fixed consistency is construct-true; P2 niche.                                                                                                              |
| T21 | watch-only           | Per-row draggable condition depends on a per-row drag-condition feature (not core); re-evaluate if/when added.                                                                           |
| T22 | watch-only           | Drag-sort writeback at `orderField` is construct-true (well-formed payload); P2 niche.                                                                                                   |
| T25 | watch-only           | `source` expression evaluates once per dialog open (lexical scope, no fan-out) — request-sink audit pattern #1; construct-true; low-risk.                                                |
| T26 | watch-only           | `loadDataOnce` is amis NOT-ADOPTED (Flux uses data-source `clientMode`); no analogous state-leak in Flux's single-owner source model; property holds vacuously.                          |
| T28 | out-of-scope-feature | `columns` is static schema; dynamic `columns:${expr}` recompilation is a distinct feature gap; Flux has no column-recompile machinery.                                                   |
| T30 | watch-only           | Edit-fan-out is row-local (construct-true, React.memo per row); documenting a keystroke-to-paint budget is optimization-candidate/perf.                                                  |
| T31 | watch-only           | Tree-expand virtualizes the window (construct-true via virtualization); P2 perf.                                                                                                         |
| T32 | watch-only           | Column toggle/reorder mid-render is a robustness edge; construct-true (no stale ref); low-risk.                                                                                          |

## 03-select.md (6)

| ID  | Verdict    | Evidence / Why Not Blocking                                                                                                   |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| S2  | covered-by | B4.1 S3 echo-fallback + S6 virtual scroll/filter anchors cover duplicate-value resolution + virtual echo (Object.is matching) |
| S7  | covered-by | B4.1 S4 (value is true source, option refresh doesn't lose value) doc contract + S3 multi-retain option-backfill anchor       |
| S9  | covered-by | B4.1 I6 (all change paths emit unified onChange) / value-is-source contract                                                   |
| S10 | watch-only | `setValue` per-key merge is construct-true (idempotent keyed merge); P2 low-frequency.                                        |
| S11 | watch-only | `searchable` space-as-literal-search-char is construct-true (native combobox); P2 niche.                                      |
| S13 | covered-by | B4.1 S6 virtual 1000+ scroll+filter anchor covers mobile Sheet 100+ touch-scroll                                              |

## 04-combo-and-array-field.md (6)

| ID  | Verdict    | Evidence / Why Not Blocking                                                                                                                                          |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4  | watch-only | Per-row add/sort gating depends on `sortable` feature (not landed); re-evaluate when sortable lands.                                                                 |
| C6  | watch-only | `unique` constraint revalidation resolves via absolute path (V6 adjudication: rules resolve to root not row-local); no sibling clobber by construction; P2 low-risk. |
| C8  | watch-only | Out-of-order add with scaffold/defaults produces no holes (construct-true); P2 niche.                                                                                |
| C11 | watch-only | Move/reorder display↔commit↔itemKey parity depends on `sortable`/move feature (not landed); re-evaluate when sortable lands.                                         |
| C14 | watch-only | `maxItems`/`minItems` expression-driven reactivity is construct-true (rule re-materialize on dep change); P2 low-frequency.                                          |
| C15 | watch-only | Scalar-array items accept any scalar editor (construct-true via generic item renderer); P2 niche.                                                                    |

## 05-input-fields.md (6)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                                                                                                                                                     |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I7  | watch-only           | Focused-input hotkey/IME behavior is native browser behavior (construct-true); host-browser concern; P2 low-risk.                                                                                                               |
| I9  | watch-only           | Two-fields-same-`name` is a dev-error scenario; construct-true (scoped/last-write); low-frequency.                                                                                                                              |
| I10 | out-of-scope-feature | Precision rounding mode (`precisionMode`/truncate) is a feature gap (X5); Flux input-number clamps (BY-DESIGN).                                                                                                                 |
| I11 | covered-by           | BY-DESIGN (clamp not validate). Clamp rationale in `input-number/design.md` §6; behavior already anchored by `input-number.test.tsx:160` (clamps to max on blur, types 200 with max:100 → submit 100, no error) + `:132` (min). |
| I12 | watch-only           | Number-adapter type-stability across mount/edit is construct-true (valueAdapter); P2 low-risk.                                                                                                                                  |
| I13 | watch-only           | Disabled input-number disabled-visual + non-interactive stepper is construct-true; P3 trivial.                                                                                                                                  |

## 06-date-fields.md (4)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                                                                                                                              |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D3  | watch-only           | B4.2 explicit non-goal deferred → B7. Cleared-date→`undefined` is Flux-idiomatic by construction; null-for-backend is a host submit-transformer concern (`transformOutAction`), not a renderer property. |
| D8  | watch-only           | Range with no `minDate`: start-max-derived-from-end is a derived-bound semantic; construct-true; P2 low-frequency.                                                                                       |
| D10 | out-of-scope-feature | Relative-date expressions (`now`/`today+1d`) are a feature gap; Flux date uses absolute values.                                                                                                          |
| D11 | watch-only           | Date-only parse/format DST-midnight-shift is a host-tz edge; construct-true (local parse/format); P2 low-frequency.                                                                                      |

## 07-input-tree.md (2)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                                     |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| TR6 | covered-by           | B4.2 `tree-options.test.ts:157` (TR6 `valueField`/`labelField`/`childrenKey` node-key remap anchor)             |
| TR7 | out-of-scope-feature | `enableNodePath` path-string is explicitly 暂不实现 (DESIGN-ACK-NOT-IMPL); pinned not tested until implemented. |

## 08-input-file-and-image.md (2)

| ID  | Verdict    | Evidence / Why Not Blocking                                                                            |
| --- | ---------- | ------------------------------------------------------------------------------------------------------ |
| U7  | watch-only | `accept:"*"`/`""` permits all (aligns with native `<input accept>`); construct-true; P2 low-risk.      |
| U8  | watch-only | Multipart body has only file + declared fields (construct-true via uploadAction payload); P2 low-risk. |

## 09-layout-surfaces.md (7)

| ID  | Verdict    | Evidence / Why Not Blocking                                                                                                                                          |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L4  | covered-by | `dialog-host-close-behavior.test.tsx:89` (E2f closeOnOutside independent) + `surface-enhancements.test.tsx:186` (showCloseButton independent) — orthogonality locked |
| L5  | watch-only | Action-chain short-circuit/halt propagates through action graph (construct-true); P2 low-risk.                                                                       |
| L10 | watch-only | `readOnly` metadata propagates through tabs region (construct-true); P2 niche.                                                                                       |
| L11 | watch-only | Tabs content-panel `min-width:0`/overflow context is CSS (construct-true); styling.                                                                                  |
| L12 | watch-only | Grid column-level conditional visibility/style reactivity is construct-true (className expr); narrowed by Flux-principles audit; styling.                            |
| L13 | watch-only | Collapse initial-expanded-state is independent of wrapping context (construct-true); P2 niche.                                                                       |
| L15 | watch-only | Steps `value`/`status` scope-reactive (construct-true, not snapshot-at-mount); P2 niche.                                                                             |

## 10-data-display.md (6)

| ID   | Verdict              | Evidence / Why Not Blocking                                                                                                  |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| DD4  | covered-by           | B5.1 L1 surface-teardown-GC + B2.2 data-source interval lifecycle clear polling timers on owner dispose                      |
| DD5  | watch-only           | Image `src` object → graceful coerce/skip (construct-true defensive); P2 low-risk.                                           |
| DD6  | watch-only           | Images-gallery multi-value field splits deterministically (construct-true); P2 niche.                                        |
| DD7  | out-of-scope-feature | Image fetcher-backed mode for auth-protected sources is a distinct feature (image renders URL directly today).               |
| DD11 | watch-only           | Rich-text editor in-surface aux-popup z-index depends on rich-text editor aux; surface stacking construct-true; P2 low-risk. |
| DD14 | covered-by           | B5.2 DD8 markdown reactivity + DD13 dynamic-renderer live-scope cover symmetric value propagation (set AND clear)            |

## 11-api-data-and-scope.md (9)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                                                                                |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4  | covered-by           | B2.2 `api-data-source.md` "Adaptor Abort Boundary" doc note                                                                                                |
| A6  | watch-only           | `method` participates in dynamic request config eval (construct-true); P2 low-risk.                                                                        |
| A7  | covered-by           | B2.2 `template.test.ts` (`${` interpolation boundary + no escape) + `api-data-source.md` "Template Interpolation Boundary" doc note                        |
| A8  | covered-by           | B2.2 `request-runtime.test.ts` array serialization unified `ids=1&ids=2`                                                                                   |
| A10 | out-of-scope-feature | Polling jitter is a feature enhancement; Flux polling has no jitter.                                                                                       |
| A12 | watch-only           | N parallel data-sources aggregated by author is an orchestration recipe (each source independent, construct-true); documentation = optimization-candidate. |
| A13 | watch-only           | Status-branching (201→nav, 202→dialog) is host/action concern; construct-true; P2 low-frequency.                                                           |
| A17 | watch-only           | `name` + `resultMapping`/`mergeStrategy` no-stale-binding is construct-true; P2 niche.                                                                     |
| A18 | watch-only           | Sibling-to-sibling via shared parent owner is an author worked-example (lexical scope, construct-true); documentation = optimization-candidate.            |

## 12-i18n.md (1)

| ID  | Verdict    | Evidence / Why Not Blocking                                                       |
| --- | ---------- | --------------------------------------------------------------------------------- |
| I5  | watch-only | Locale-aware formatters delegate to flux-i18n/Intl (construct-true); P2 low-risk. |

## 13-mobile-responsive.md (1)

| ID  | Verdict              | Evidence / Why Not Blocking                                                                   |
| --- | -------------------- | --------------------------------------------------------------------------------------------- |
| M2  | out-of-scope-feature | Multi-tab keep-alive shell is an app-shell feature; Flux has no app shell / keep-alive shell. |

## 14-action-button-toast-mapping-cards-status-styling.md (23)

| ID   | Verdict    | Evidence / Why Not Blocking                                                                                                                            |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B2   | watch-only | Bare `url`/`href` with no navigate action: navigate requires an action (construct-true); P2 low-risk.                                                  |
| B3   | covered-by | B6.2 `button-enhancements.test.tsx` (B3: `label` with `&` renders faithfully, no double-escape)                                                        |
| B4   | watch-only | Secondary events (dblclick/mouseenter) resolve via event registry (construct-true); P2 low-frequency.                                                  |
| AG2  | covered-by | `action-scope-and-imports.md` — `onClick` accepts an `ActionSchema` object (not string); amis string-script onClick rejected by the schema type itself |
| AG4  | watch-only | Download-action `filename` fallback is construct-true; P3 low-frequency.                                                                               |
| AG5  | watch-only | Navigate `target:"_blank"` is host-navigation-layer (Flux has no router); construct-true; P2 host concern.                                             |
| DB1  | watch-only | Dropdown `closeOnSelect` dismisses popover (construct-true); P2 niche.                                                                                 |
| DB2  | watch-only | Dropdown trigger region/schema-fragment decision is construct-true; P3 low-frequency.                                                                  |
| T1   | watch-only | Toast `position` stable per value (sonner construct-true); P2 low-risk.                                                                                |
| T3   | covered-by | B6.2 `sonner.test.tsx` (T3: `duration` uniform across variants — rendered toastOptions no `duration` + source guard)                                   |
| MP1  | covered-by | B6.2 `mapping.test.tsx:101,120,161` (defaultLabel/placeholder fallback on miss) + MP2 expr/source resolution                                           |
| CB2  | covered-by | `config-display.test.tsx:85-169` (maxDepth / maxItemsPerGroup block-add anchors)                                                                       |
| CB4  | watch-only | Condition-builder value-input slot fills row width (construct-true styling); P3 low-risk.                                                              |
| CD2  | watch-only | Card media `url` resolves expr against row scope; missing degrades (construct-true echo-fallback theme); P2 low-risk.                                  |
| CD3  | watch-only | `columnsCount` is a semantic prop (construct-true, not itemClassName workaround); P2 niche.                                                            |
| CD5  | watch-only | Card `actions` button icon↔label gap (construct-true styling); P2 low-risk.                                                                            |
| CD6  | watch-only | Hover-elevation decided via variant/`data-interactive` (construct-true styling); P3 low-risk.                                                          |
| ST1  | watch-only | Per-renderer field consistency (all text fields accept `${expr}`) is broad/generic (META_FIELDS construct-true); hard to anchor meaningfully; P2.      |
| ST2  | watch-only | Boolean status via value-keyed maps (Flux rejects `trueValue`/`falseValue`); construct-true; P2 low-risk.                                              |
| ST3  | watch-only | Status dynamic-source path renders fetched labels (construct-true); P2 niche.                                                                          |
| STY1 | watch-only | Conditional className stance documented in styling-system (covered thematically); P2 low-risk.                                                         |
| STY3 | watch-only | Spinner explicit `icon` renders with root loading config (construct-true); P2 trivial.                                                                 |
| STY4 | watch-only | Inline `style` camelCase passthrough (construct-true); P3 low-risk.                                                                                    |

---

## Phase 1 Spot-Check (5 `covered-by` independent verification)

Per plan Phase 1 item 3, 5 `covered-by` verdicts independently re-verified against the cited B1–B6 evidence (live repo):

1. **V15** → `packages/flux-runtime/src/__tests__/validation-rule-semantics-and-lifecycle.test.ts` contains the V15 pattern-message assertion (author message, no regex source). ✓ confirmed.
2. **T9** → B3.3 landed fixed-left + selection-column offset anchor in `packages/flux-renderers-data/src/__tests__/`. ✓ confirmed (T9 in B3.3 signal set).
3. **L4** → `packages/flux-react/src/__tests__/dialog-host-close-behavior.test.tsx:89` (closeOnOutside) + `packages/flux-renderers-basic/src/__tests__/surface-enhancements.test.tsx:186` (showCloseButton) — independent props, orthogonality locked. ✓ confirmed (live grep).
4. **CB2** → `packages/flux-renderers-form-advanced/src/condition-builder/config-display.test.tsx:85-169` tests maxDepth (block at 0, allow < max) + maxItemsPerGroup (block at limit). ✓ confirmed (live grep).
5. **MP1** → `packages/flux-renderers-content/src/mapping.test.tsx:101,120,161` test defaultLabel/placeholder fallback on miss; `mapping.tsx:47-73` implements the fallback chain. ✓ confirmed (live grep).

All 5 spot-checks consistent — no "claimed-covered-but-not" cases.

## Phase 2 Input Sets (determined)

- **landed-anchor** (confirmed-uncovered, construct-true): `T13`
- **landed-doc-note** (owner-doc silent on implemented property): `F2`
- **out-of-scope-feature** → Phase 3 successor consolidation: `T2, T28, I10, D10, TR7, DD7, A10, M2` (+ B1–B6 deferred ~10)

> Note: I11 was initially classed `landed-anchor` but live-repo verification found the clamp behavior is already anchored at `input-number.test.tsx:160` (clamps-to-max-on-blur) — reclassified `covered-by` to avoid a redundant duplicate anchor.

## Phase 3 Input Sets (determined)

- B1–B6 deferred feature items: V6, C10-projection, T11, U5, U6, DD9, I1-schema, I4, L16, MP2-loader
- Phase 1 new `out-of-scope-feature`: T2, T28, I10, D10, TR7, DD7, A10, M2
