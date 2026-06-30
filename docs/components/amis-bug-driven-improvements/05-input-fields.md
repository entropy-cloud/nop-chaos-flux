# 05 Input Fields (text / number / textarea / email / password) — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/input-text/design.md`, `input-number/design.md`, `input-email/design.md`, `input-password/design.md`, `textarea/design.md`, `docs/architecture/field-binding-and-renderer-contract.md`
> amis cluster: `form/input` (subset — text/number/password/email/textarea; tree is in `07-input-tree.md`)
> Priority summary: Flux input fields are standard controlled fields with `when`-based validation and `valueAdapter` in/out. The residual gaps are controlled-value display↔commit sync, debounce→flush contract, literal-vs-expression initial values, and number precision/clamp semantics.
> Triage: ~25 deep-reads (subset) → 13 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis input designs Flux rejects)

| amis feature                               | Reason rejected                                                                | AMIS-REF        |
| ------------------------------------------ | ------------------------------------------------------------------------------ | --------------- |
| `big` (big-number mode)                    | Flux number-only contract; big-number belongs to a dedicated component if ever | #6334           |
| scattered `addOn` / `keyboardEvent` config | Compose with `field` slot + `when`                                             | (whole cluster) |

---

## A. Controlled-Value Display ↔ Commit Sync

| #   | Property                                                                                                                                                        | Signal   | Severity | AMIS-REF |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| I1  | A scalar string field fed `null` renders as an empty input, never the literal "null". `valueAdapter` in-path normalizes null→undefined.                         | TEST-GAP | P1       | #169     |
| I2  | After `form.reset` / `component:reset`, the controlled input's displayed value matches the reset runtime value, including flushing any pending debounced write. | BOTH     | P0       | #4539    |
| I3  | A `reset` clears BOTH display and the committed/serialized value used on submit (number adapter out-path maps ''/undefined→undefined).                          | TEST-GAP | P1       | #3129    |
| I4  | A controlled input remains fully editable after any programmatic `setValue`/commit (focus + typing + cut/paste keep working; a commit never freezes the field). | TEST-GAP | P1       | #2557    |
| I5  | Debounced field writes expose a **flush** semantic; component handle / submit flushes pending debounced writes before reading.                                  | BOTH     | P1       | #4107    |

**Recommended action I2/I5:** Add design note to `input-text` §8 (component handles): `form.reset` and `component:reset` re-sync the rendered value incl. flushing pending debounced writes; document the debounce→flush contract.

**Recommended tests:**

- I1: field bound to `{name:null}` renders empty; `onChange→null` round-trips to undefined.
- I2: type "abc" → `form.reset` → DOM value === "" and runtime value === undefined.
- I3: input-number value 111 → reset → submit/serialize → no number field (undefined), not 111.
- I4: set value programmatically → then type/backspace/paste → value updates normally.
- I5: type then immediately click submit → submitted value includes latest typed chars.

---

## B. Event / Mutation Path Contract

| #   | Property                                                                                                                                                                                                    | Signal     | Severity | AMIS-REF                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| I6  | Every value-mutation path (clear / reset / handle / action `setValue`) emits the canonical field `onChange` event, not only the native typing path.                                                         | DESIGN-GAP | P1       | #6109                                                                                                                                         |
| I7  | A focused text field does not globally swallow key combos meant for page-level actions (e.g. ⌘O); inputs only handle keys they own (typing, IME, opt-in Enter-for-submit). Especially with IME composition. | TEST-GAP   | P2       | #4201 — **RESOLVED (B7)**: watch-only (focused-input hotkey/IME is native browser behavior construct-true; host-browser concern; P2 low-risk) |

**Recommended action I6:** Add design note to `input-text` §8: every value-mutation path emits the unified `onChange`.

**Recommended tests:**

- I6: clear/reset/`setValue` → assert `onChange` fires (consumable by `when`/actions).
- I7: focus input-text, press a registered page hotkey → page action fires (input does not `stopPropagation` globally).

---

## C. Literal vs Expression Initial Values

| #   | Property                                                                                                                                                                                                             | Signal     | Severity | AMIS-REF                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| I8  | A bound scalar initial value (via `name`) is treated as a literal string, never parsed for expression tokens (`$`, `${}`). Only explicitly-typed expression fields (`label`/`placeholder`/`disabled`) are evaluated. | DESIGN-GAP | P1       | #3905                                                                                                                |
| I9  | Two fields bound to the same `name`: semantics is explicit (shared slot OR dev-schema warning) — not implicit and silent.                                                                                            | DESIGN-GAP | P2       | #5363 — **RESOLVED (B7)**: watch-only (two-fields-same-`name` dev-error; scoped/last-write construct-true; low-freq) |

**Recommended actions:**

- I8: Add design note: initial/default field values bound via `name` are literal.
- I9: Add design note to form field binding: `name` uniqueness contract; warn-vs-error on duplicate.

**Recommended tests:**

- I8: initial value `"$catId"` renders as the literal text "$catId".
- I9: two fields same `name` → documented behavior (shared slot or dev-warn).

---

## D. input-number Specifics

| #   | Property                                                                                                                                                                                                                                                                                                                                                                                                                                            | Signal               | Severity | AMIS-REF                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| I10 | Precision rounding mode is documented (banker's / round-half-up fixed); truncate is out-of-scope OR (only if a real gap remains) a `precisionMode` field is added as a **conditional X5 follow-up, not a default**.                                                                                                                                                                                                                                 | DESIGN-GAP           | P2       | #3753 — **RESOLVED (B7)**: out-of-scope-feature (precision rounding `precisionMode`/truncate is a feature gap X5; Flux clamps BY-DESIGN)          |
| I11 | **BY-DESIGN (not a gap).** `min`/`max` clamp is a settled Flux decision (`input-number/design.md` §6: "min/max 约束不放在 adapter 的 validate 中，而是放在渲染器内部的 clamp 逻辑中"). Residual only: (a) document the deliberate clamp-vs-validate rationale, (b) regression-test that input above max clamps to max (NOT error). Reversing to validate-instead-of-clamp = explicit decision-reversal needing design-owner sign-off, not a P1 gap. | BY-DESIGN / TEST-GAP | P3       | #2597 — **RESOLVED (B7)**: covered-by `input-number.test.tsx:160` (clamps to max on blur, no error) + `input-number/design.md` §6 clamp rationale |
| I12 | The number adapter is type-stable across mount and edit (initial value "1" string → consistently number 1 from mount, no type flip on first edit).                                                                                                                                                                                                                                                                                                  | TEST-GAP             | P2       | #6334 — **RESOLVED (B7)**: watch-only (number-adapter type-stability construct-true via valueAdapter; P2 low-risk)                                |
| I13 | Disabled input-number renders with disabled visual state; stepper buttons absent or non-interactive.                                                                                                                                                                                                                                                                                                                                                | TEST-GAP             | P3       | #5351 — **RESOLVED (B7)**: watch-only (disabled input-number visual + non-interactive stepper construct-true; P3 trivial)                         |

**Recommended actions:**

- I10: Add design note to `input-number` §6: precision rounding mode; truncate out-of-scope; `precisionMode` only as conditional X5 follow-up.
- I11: BY-DESIGN — do NOT add a validation rule; add a regression test that out-of-range input clamps to `[min,max]` without surfacing a validation error; add a one-line doc note that clamp-vs-validate is deliberate (cite §6).

**Recommended tests:**

- I12: initial value "1" (string) → displayed and committed value consistently number 1 from mount.
- I13: disabled input-number → disabled visual state; stepper absent/non-interactive.

---

## Highest-Leverage Items

1. **I2/I5** — controlled-value display↔commit sync on reset + debounce→flush (the classic controlled-input desync bug).
2. **I6** — every mutation path emits unified `onChange` (cascade correctness).
3. **I8** — literal-vs-expression initial values (silent misinterpretation hazard).
4. **I11** — `min`/`max` clamp-vs-validate semantics (UX correctness tension).
