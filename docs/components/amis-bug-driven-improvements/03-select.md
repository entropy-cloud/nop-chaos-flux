# 03 Select — Amis Bug-Driven Improvements

> Flux owner doc: `docs/components/select/design.md`
> amis cluster: `form/select` (203 issues)
> Priority summary: Flux's select (shadcn Combobox, `{label,value}`, real-array multi-select, `multiple`/`searchable`/`clearable`/`virtual`/`groups`/`optionTemplate` landed in E1a/E3) is structurally immune to the largest class of amis select bugs (delimiter encoding). The residual gaps are echo/async/virtual edge cases + lifecycle event contract.
> Triage: ~32 deep-reads (+203 titles scanned) → 13 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis select designs Flux rejects)

| amis feature                                                               | Reason rejected                                                       | AMIS-REF           |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------ |
| `valueField` / `joinValues` / `extractValue` / `delimiter` / `simpleValue` | Flux uses `{label,value}` standard shape and real arrays              | (whole cluster)    |
| `selectMode` (table/group/tree/chained/associated)                         | Multi-mode belongs to `tree-select`/`picker`/`transfer`, not `select` | #3402, #3419, etc. |
| `borderMode` / `overlay` / `mobileUI`                                      | amis skin variants / dual implementation                              | (whole cluster)    |

---

## A. Value Encoding (echo correctness)

| #   | Property                                                                                                                                                                                                                                                                          | Signal     | Severity | AMIS-REF                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| S1  | Value is never delimiter-encoded; multi-select is array-of-primitives matched by `Object.is`. A primitive value containing `,`, `@`, `${`, unicode is never split.                                                                                                                | LOCK       | P0       | #6319, #6428                                                                                                              |
| S2  | Duplicate `SelectOptionSchema.value` resolution is defined (recommend: dev-mode warning + documented "first match echoes"). Echo works under virtualization (matched against full options list, not only mounted items).                                                          | DESIGN-GAP | P2       | #941 — **RESOLVED (B7)**: covered-by B4.1 (S3 echo-fallback + S6 virtual anchors; Object.is matching resolves duplicates) |
| S3  | Echo must not depend on the option being present in the current options/source snapshot. If value is set but no option matches (async not yet loaded, value not in filtered set), degrade gracefully (show raw value / fallback label / "unknown" marker) — never blank or crash. | DESIGN-GAP | P0       | #1731, #5039, #473                                                                                                        |

**Recommended action S2/S3:** Add design note to `select/design.md` §7/§12: define echo behavior for value-with-no-matching-option (render value as-is + optional `noMatchText`, never empty); define duplicate-value resolution.

**Recommended tests:**

- S1: option value containing `,`, `@`, `${`, unicode; verify multi-select value is array of whole primitives, echo renders full label.
- S2: duplicate-value echo; `virtual=true` echo.
- S3: set value not in options; set value while source still loading → trigger + `ComboboxValue` render non-empty.

---

## B. Async Search

| #   | Property                                                                                                                                                                       | Signal     | Severity | AMIS-REF |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------- |
| S4  | Remote search returns a fresh option set per keystroke; already-selected items not present in the new result are retained (value is source of truth, not visible option list). | DESIGN-GAP | P1       | #1264    |
| S5  | Remote fetch cache key includes ALL bound dependencies, not just the search term — a dependency change with the same term does not serve stale options.                        | DESIGN-GAP | P1       | #368     |

**Recommended action S4/S5:** Add design note to `select/design.md` §9 + `api-data-source.md`: "selected value is authoritative; remote option refresh must not drop selections whose options are temporarily absent (echo falls back to raw value/label)"; "remote-search cache key includes the full set of bound dependencies."

**Recommended tests:**

- S4: multi-select + per-keystroke remote source that omits a previously-selected option → selection retained.
- S5: cache key changes when a dependency variable changes even if keyword identical.

---

## C. Virtualization Edge Cases

| #   | Property                                                                                                                          | Signal   | Severity | AMIS-REF                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| S6  | Search/filter after scrolling to a far offset does not crash (VirtualList index always defined).                                  | TEST-GAP | P1       | #2820                                                                                                             |
| S7  | Options array replaced (new ref) while popup open with a value selected → selection preserved, list re-renders without vanishing. | TEST-GAP | P2       | #4521 — **RESOLVED (B7)**: covered-by B4.1 (S4 value-is-true-source doc + S3 multi-retain option-backfill anchor) |

**Recommended tests:**

- S6: `virtual=true`, 1000+ options — scroll to offset ~700, then type a search filter → no crash, filtered list correct.
- S7: options replaced (new ref) while popup open + value selected → selection preserved, list re-renders.

---

## D. Lifecycle / Event Contract

| #   | Property                                                                                                                                                                                   | Signal     | Severity | AMIS-REF                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| S8  | A value set by initialization / data-source-driven default / `setValue` emits the standard change observable consumed by `when`/actions (programmatic set IS observable so cascades work). | DESIGN-GAP | P1       | #5100                                                                                                        |
| S9  | The change observable / action payload exposed on change reflects the post-change array, not a pre-update snapshot.                                                                        | TEST-GAP   | P2       | #4480 — **RESOLVED (B7)**: covered-by B4.1 (I6 unified onChange / value-is-source contract)                  |
| S10 | Selection-driven `setValue` writes merge at the addressed key path (shallow per-key, not whole-object replace); idempotent and re-fireable.                                                | DESIGN-GAP | P2       | #2900, #3345 — **RESOLVED (B7)**: watch-only (setValue per-key merge idempotent construct-true; P2 low-freq) |

**Recommended action S8/S10:** Add design note to `select/design.md` §8 + `action-scope-and-imports.md`: programmatic set emits standard change observable; selection-driven `setValue` merges per-key.

**Recommended tests:**

- S8: default value from data-source → dependent field/expression reacts.
- S9: `multiple=true`, toggle items on/off → change observable equals resulting array at each step.
- S10: select fills `obj.value` while `obj.text` non-empty → `obj.text` preserved; fill twice → second applies.

---

## E. Interaction Edge Cases

| #   | Property                                                                                                                                                                                                                  | Signal   | Severity | AMIS-REF                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| S11 | Space is a literal search character when `searchable`, never a trigger/collapse key (single + multi).                                                                                                                     | TEST-GAP | P2       | #1333, #4828 — **RESOLVED (B7)**: watch-only (`searchable` space-as-literal native combobox construct-true; P2 niche) |
| S12 | `optionTemplate` rendering arbitrary html/icon/double-line content: clicking anywhere on the rendered content selects the option (`ComboboxItem value` contract holds); nested anchors must not swallow the select click. | TEST-GAP | P1       | #5369                                                                                                                 |
| S13 | Mobile branch (Sheet): 100+ options scroll to the last item via touch (not only mouse-wheel).                                                                                                                             | TEST-GAP | P2       | #3252 — **RESOLVED (B7)**: covered-by B4.1 (S6 virtual 1000+ scroll+filter anchor covers mobile Sheet touch-scroll)   |

**Recommended tests:**

- S11: `searchable` select, focus input, type " " and "foo bar" → dropdown stays open, filter matches labels with spaces (single + multi).
- S12: `optionTemplate` rendering html/icon/double-line → click anywhere selects; verify under `virtual` + `multiple`.
- S13 (mobile/Sheet): 100+ options in mobile Sheet → touch-scroll reaches last option, tappable.

---

## Highest-Leverage Items

1. **S3** — echo when option absent (most repeated select bug across the index).
2. **S4/S5** — remote-search retains selections + dependency-aware cache key.
3. **S12** — `optionTemplate` click selection (Flux's E3 region — high regression risk).
4. **S1** — delimiter-encoding immunity (LOCK — Flux's structural advantage, must be regression-locked).
