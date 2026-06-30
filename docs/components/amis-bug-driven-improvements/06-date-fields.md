# 06 Date Fields — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/input-date/design.md`, `input-datetime/design.md`, `input-time/design.md`, `date-range/design.md`, `input-month/`, `input-quarter/`, `input-year/`
> amis cluster: `form/date` (60 issues)
> Priority summary: datetime-range is the buggiest amis area and Flux's date-range design has the most unstated invariants. The residual gaps are display-vs-commit format/timezone split, range bound-independence, confirm semantics, and DST/relative-date handling.
> Triage: ~20 deep-reads (+60 titles scanned) → 12 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis date designs Flux rejects)

| amis feature                                                                   | Reason rejected                                            | AMIS-REF        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------- |
| amis `inputDateTime`/`inputDate`/`inputTime`/`inputMonth`... as separate types | Flux unifies under `input-date` with `kind` + `date-range` | (whole cluster) |
| amis `utc` global flag conflating display                                      | Flux splits commit-tz vs display-tz (see D7)               | #4472           |

---

## A. Format & Timezone Split (display vs commit)

| #   | Property                                                                                                                                                                                                                                                                                                                                                                                                      | Signal                | Severity | AMIS-REF                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `valueFormat` governs the committed/serialized value; `displayFormat` governs only the rendered text. Selecting a date commits a value parseable by `valueFormat`. The two are independent.                                                                                                                                                                                                                   | DESIGN-GAP            | P0       | #2074, #973                                                                                                                                                                                                        |
| D2  | When `utc:true`, only the committed/serialized value is UTC; displayFormat rendering and picker interaction always use the user's local timezone.                                                                                                                                                                                                                                                             | DESIGN-GAP            | P1       | #4472                                                                                                                                                                                                              |
| D3  | A cleared date field commits `undefined` (not `""`) — this is the Flux-idiomatic default (consistent with `clearValueOnEmpty` form-layer behavior). If a backend requires `null`, **the Flux-idiomatic path is a submit transformer (`transformOutAction`)**, NOT a new field. A `valueMode`/`nullValue` field would only be added as a conditional X5 follow-up if the transformer path proves insufficient. | DESIGN-GAP / TEST-GAP | P3       | #21348 — **RESOLVED (B7)**: watch-only (B4.2 non-goal deferred→B7; cleared-date→undefined Flux-idiomatic by construction; null-for-backend is host `transformOutAction` submit-transformer, not renderer property) |

**Recommended actions:**

- D1/D2: Add design note to `input-date` §4: `valueFormat` governs commit; `displayFormat` governs render; `utc:true` affects only commit, display/picker stay local.
- D3: Add design note: cleared date commits `undefined` (the Flux default); `null`-for-backend via `transformOutAction` submit transformer (Flux-idiomatic); `nullValue` field only as conditional X5 follow-up.

**Recommended tests:**

- D1: `valueFormat:"X" + displayFormat:"YYYY-MM-DD"` → submitted value is unix timestamp, UI shows ISO date.
- D2: `utc:true` → committed value UTC, textbox shows local-time rendering.

---

## B. Range Bound Independence & Invariants (date-range / datetime-range)

| #   | Property                                                                                                                                   | Signal   | Severity | AMIS-REF            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------- | ------------------- |
| D4  | Selecting/confirming one bound never mutates the other bound's time component (picking end never resets start's hour/min/sec to 00:00:00). | TEST-GAP | P0       | #2816, #6032, #6316 |

> **Back-trace note:** amis #2816 is filed under `form/input/` (not `form/date/`) in the source corpus; #6032 and #6316 are under `form/date/`. All three describe the same datetime-range bound-crosstalk class.
> | D5 | A range field guarantees `start ≤ end` after any reselection sequence (auto-swap/clamp) OR explicitly validates and rejects. | DESIGN-GAP | P0 | #4430 |
> | D6 | `required` on a range fails if EITHER bound is empty. | DESIGN-GAP | P1 | #4568, #4651 |
> | D7 | The panel's pending selection is local UI state, committed only on confirm — the displayed selection equals the committed value (no "previewed but unconfirmed" date leaking into UI while value is empty). | DESIGN-GAP | P1 | #4568, #4651 |
> | D8 | A range with no `minDate` lets start be any future time; with `maxDate` on end, start's max is derived from end, not anchored to today (no over-constraint). | TEST-GAP | P2 | #6318 — **RESOLVED (B7)**: watch-only (derived-bound semantic construct-true; P2 low-freq) |

**Recommended actions:**

- D4: Add design note to `date-range` §7: selecting/confirming one bound never mutates the other's time component.
- D5: Add design note: `start ≤ end` guaranteed (auto-swap/clamp) OR registered as a validation rule.
- D6/D7: Add design note: pending selection is local state, committed only on confirm; `required` validates both bounds non-empty.

**Recommended tests:**

- D4: pick start 03:00:00, pick end 05:00:00 → start remains 03:00:00.
- D5: pick end, then re-pick start later than end → invariant holds or validation error.
- D6: required range, one bound empty → required error.
- D8: no `minDate` → start can be future; `maxDate` on end → start max derived from end.

---

## C. Constraint Application (min/max across entry paths)

| #   | Property                                                                                                                                                                                 | Signal     | Severity | AMIS-REF                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D9  | `minDate`/`maxDate` apply to the final committed datetime regardless of entry path (calendar pick vs typing into time box); comparison direction is correct (not inverted).              | TEST-GAP   | P1       | #1601, #2407                                                                                                                         |
| D10 | Relative-date expressions for `minDate`/`maxDate`/`value` are either defined + tested, OR explicitly listed as a non-goal with a workaround (`when`/expression computing absolute date). | DESIGN-GAP | P2       | #4936, #6118 — **RESOLVED (B7)**: out-of-scope-feature (relative-date expressions are a feature gap; Flux date uses absolute values) |
| D11 | For date-only fields, parse/format avoids DST midnight shifts (use date-only library ops or parse at noon).                                                                              | DESIGN-GAP | P2       | #3768 — **RESOLVED (B7)**: watch-only (date-only DST-midnight host-tz edge; local parse/format construct-true; P2 low-freq)          |

**Recommended actions:**

- D10: Add design note to `input-date` §9: define relative-date vocabulary OR list as non-goal.
- D11: Add design note: date-only fields avoid DST midnight shifts.

**Recommended tests:**

- D9: `minDate` set → type a time yielding datetime < minDate → committed value clamped/rejected; boundary comparison correct direction.
- D11: a DST-boundary date round-trips identically.

---

## D. Manual Keyboard Entry

| #   | Property                                                                                                              | Signal   | Severity | AMIS-REF |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| D12 | Typing each digit into a datetime time sub-field updates the value monotonically without doubling (no `1 → 11 → 23`). | TEST-GAP | P1       | #1027    |

**Recommended test D12:** focus datetime time input, type "1","4" for hour → value hour === 14 (not 11/114); cover Chromium specifically.

---

## Highest-Leverage Items

1. **D4** — range bound independence (start-time reset on end-pick; recurred across many amis versions).
2. **D5/D6/D7** — `start ≤ end` invariant + `required` both-bounds + confirm-vs-commit semantics (the most unstated invariants in flux's date-range design).
3. **D1/D2** — format/timezone split (commit vs display).
4. **D9** — min/max applied across all entry paths (typing bypasses validation was a common amis regression).
