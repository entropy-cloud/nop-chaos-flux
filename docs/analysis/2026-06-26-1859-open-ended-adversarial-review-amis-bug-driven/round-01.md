# Round 01 — Open-Ended Adversarial Review (mission `amis-bug-driven-improvements`)

> This is the per-round record for the open-ended execution whose authoritative
> deliverable is `docs/audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md`.
> Same findings, kept here per the open-ended prompt's per-round landing rules.

- **Snapshot**: HEAD `77bd50b6` (post-remediation of the prior open-audit's F1–F6).
- **Dedup baseline**: prior open-audit F1–F6 (now FIXED, re-verified live), parallel multi-audit M-01..M-10 (live), prior components-audit C-series, `docs/references/reopened-design-decisions-and-audit-adjudications.md`.
- **Method**: code-driven. 4 open-ended parallel probes (table cluster · form-advanced composite cluster · data/CRUD/tree/chart/list · runtime/validation/i18n/formula) + main-agent live re-verification of every `certain` finding. Lenses: _contract archaeologist_, _exception-path detective_, _combination-explosion tester_, _lifecycle tracker_, _10×-scale operator_.

## Verified-certain findings (re-read live by main agent)

1. **G1 — Picker single-select `Confirm` with no toggle silently erases the field value** (`picker-renderer.tsx:150,196-206`). `openDialog` seeds `pending` to `[]` for single-select; `confirmSelection` writes `Array.from(pending).pop()` → `undefined`. The comment at `:200` ("keep existing if none toggled") contradicts the code. Mission rewrote the single-select surface → latent bug now user-visible. **Data loss.**
2. **G2 — Tree-table child-row selection is silently pruned every render → children are unselectable** (`table-renderer.tsx:253` wires selection to top-level `filteredData`; `use-table-selection.ts:60-95` builds `currentRowKeySet` from those top-level rows only; tree children are flattened _later_ at `:259`). Mission-introduced pruning regression; **opposite direction** of M-01 (M-01 = phantom keys in payload; G2 = legitimate child keys dropped from display). Companion test `table-tree-selection-no-cascade.test.tsx` models children as top-level rows → false confidence.
3. **G3 — `buildValidationMessage` silently ignores `rule.message` for `required` / `minLength` / `maxLength`** (`message.ts:12-19`). Every sibling kind (incl. mission-added `requiredRange`) honors `rule.message ??`; these three don't. `required` is the most common rule. Pre-existing.
4. **G4 — `contract-honesty` capability scanner is a near-no-op for realistic handles** (`contract-honesty.ts:48-51`). `isCapabilityHandleReferenced` matches any quoted occurrence of the handle string anywhere in source, so common handles (`'submit'`/`'validate'`/`'reset'`/`'setValue'`/`'focus'`/`'clear'`) always "match". The scanner's stated purpose (turn lying-contract drift into a test failure) is defeated for capabilities; the test only injects an absent fake handle (true-negative only). Mission-introduced (new file).
5. **G5 — `useInfiniteScroll` loading/error contract is fully dead; observer has no concurrent-fetch guard and no post-load refill** (`use-infinite-scroll.ts:79-85` fires `onLoadMore` with no `loading` guard; hook never calls `setLoading(true)`/`setError`; grep confirms both consumers only **read** `loading`/`error` for status text and call `setError(undefined)` on retry). Loading indicator + error/retry UI can never render; rapid scroll double-fires; a short page never refills. Pre-existing but squarely inside the mission's B4.2/CRUD lifecycle theme.

## Likely findings (sub-agent traced, not all re-verified line-by-line by main agent)

6. **G6 — `areColumnsRenderEquivalent` omits `quickEdit`/`copyable` → stale cell chrome on column mutation** (`table-flattened-items.ts:84-94`, consumed by `MemoizedDataRow`). Mission-introduced new file.
7. **G7 — Render-time selection prune is a read-only mask → perpetual re-render storm once a phantom exists** (`use-table-selection.ts:65-95`). Pruning returns a new `Set` every render without writing back; this is also the structural enabler that lets M-01's phantoms survive. Mission-introduced.
8. **G8 — Chart pie/scatter manual data extraction bypasses dotted paths** (`chart-renderer.tsx:182,238,310-311`). Cartesian charts let recharts resolve dotted `dataKey`; pie/scatter use bracket access → `dataRegionKey:"nested.value"` yields `undefined`. Same _class_ as M-04, different file/feature. Pre-existing.
9. **G9 — Composite-field child-path/registration churns on every keystroke** (`array-field.tsx:422-425,546-577`; `array-editor.tsx:269-272`; `key-value.tsx:329-332`). `childPaths` memo deps include the full `items` array → new ref per keystroke → O(N) unregister/register per keypress. Pre-existing, high impact.
10. **G10 — Controlled-ownership drag-sort is a silent visual no-op without `onReorder`** (`use-row-drag-sort.ts:154-155`). Rows snap back on drop with no signal. Mission-introduced branch.

## Additional (lower-severity / shorter)

- **G11** Upload has no request cancellation; an in-flight upload outlives unmount and writes to the field (`upload-field.tsx:179-251`) — the U2–U4 lifecycle gap.
- **G12** List selection state never resets on `items` change; stale keys leak into `onSelectionChange` (`list-renderer.tsx:234,317-344`) — a list-side parallel of M-01.
- **G13** Tree expansion renders **all** children after a 0 ms timeout; a fat node (thousands of children) freezes the UI (`tree-renderer.tsx:160-180`). Scale.
- **G14** `requiredRange` reuses the generic `validation.required` message and has no dedicated i18n key, so a half-filled range reads "{{label}} is required" (`message.ts:14-15`) — residual to M-02.
- **G15** `contract-honesty` scans one concatenated source blob per package → sibling masking + comment/string sensitivity (`contract-honesty.ts:62-103`); the event matcher is more precise but still matches comments. Mission-introduced.
- **G16** `flux.queryFailed` i18n key added to both locales but never consumed (dead key, I1).
- **G17** Tree focus is lost to `<body>` on data refresh when the active node disappears (`tree-renderer.tsx:419-431`) — residual to B4.2 focus-nav.
- **G18** Loaded rows lacking an id/key fall back to **positional** React keys → structural edits (delete/move) remount every subsequent row, losing focus/state (`array-editor`/`key-value`/`combo`/`input-table`/`array-field`). Certain mechanism, severity depends on authoring.

## Conclusion of round 01

Round 01 surfaced a substantial set of novel, high-value findings beyond the dedup baseline. The five verified-certain items (G1–G5) alone justify action. The round is therefore **not** a clean round; additional rounds would continue from the still-unread surfaces (e.g. `input-table-renderer` removeWhen asymmetry, period/date-range control typing edges, markdown code-block verbatim, condition-builder projected-form `disabled` propagation). Stopping here per prompt rule 8 is **not** warranted — but the highest-value cuts have been captured and are written up in the authoritative audit file.
