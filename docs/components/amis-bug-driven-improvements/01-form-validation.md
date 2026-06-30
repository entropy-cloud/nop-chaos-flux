# 01 Form Validation — Amis Bug-Driven Improvements

> Flux owner doc: `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`
> amis cluster: `form/validation` (92 issues), `form/formula` (1), `form/static` (2)
> Priority summary: this is the highest generic-correctness-density cluster. Most entries are **TEST-GAP** — Flux's design already claims these properties (dependency closure, fail-closed regex, single publish per submit) but they must be locked with regression tests because amis lost them repeatedly.
> Triage: 95 amis issues reviewed → 24 entries (some consolidate 2–4 issues into one property).

## Decision Vocabulary

- `DESIGN-GAP` — Flux owner doc is silent on the property; needs a design note.
- `TEST-GAP` — Flux design claims the property but no test pins it.
- `LOCK` — design correct + likely implemented; record as regression anchor (amis lost it across versions).
- `NOT-ADOPTED` — amis design rejected; recorded so it is not re-proposed.

## NOT-ADOPTED (amis validation designs Flux rejects)

| amis feature                                                        | Reason rejected                                                                                               | AMIS-REF        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- |
| `requiredOn` / `visibleOn` / `disabledOn` scattered condition props | Flux uses unified `when`; amis scattered props are an anti-pattern                                            | (whole cluster) |
| Per-component `validateApi` schema field                            | Async validation is owned by the validation scope runtime via a rule, not a component-level api short-circuit | (whole cluster) |
| amis server-validation short-circuits client rules                  | Flux runs full rule pipeline on every entry point                                                             | #4236, #4862    |

---

## A. Dependency-Closure Revalidation (cross-field / dependency-triggered)

The most important property cluster. Flux already models dependency closure expansion + cycle-safe fixed-point traversal. amis lost it repeatedly.

| #   | Property                                                                                                                                                                     | Signal     | Severity | AMIS-REF |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| V1  | A value change that resolves a rule MUST clear the matching field-addressed error (error display cannot linger after the rule passes).                                       | TEST-GAP   | P0       | #1636    |
| V2  | Two fields with a mutual constraint (start<end) both revalidate when either changes; correcting one clears the other's error.                                                | TEST-GAP   | P0       | #11956   |
| V3  | A field whose value is **derived** (formula) participates in validation when its value changes, and its dependents revalidate. Derived writes are first-class change events. | DESIGN-GAP | P1       | #1168    |
| V4  | Dynamic requiredness (`requiredWhen`/`requiredUnless`) reliably recomputes both the visual indicator AND the submit-gating rule; the two cannot diverge.                     | TEST-GAP   | P1       | #8071    |

**Recommended tests:**

- V1: submit → error on field A; change A so rule passes; assert `getFieldState(A).errors` empty AND `canSubmit` reflects cleared error; cover `showErrorOn` delay path (underlying error state still cleared).
- V2: fields A `lt ${B}` and B `gt ${A}`; set A=8 (A error), B=12 (B ok); change B → assert A's error clears; assert cycle-safe traversal doesn't infinite-recurse.
- V3: derived field C = A+B; rule on C revalidates when A or B changes (add design note to form-validation.md Dependency Model first).
- V4: field B `requiredWhen: '${A}'`; toggle A; assert `B.effectiveRequired` flips and submit gating flips with it.

**Recommended design note (form-validation.md "Dependency Model"):** explicitly state that computed/derived value writes are equivalent to user writes for dependency triggering, and that the changed path itself is part of the revalidation target set.

---

## B. Array / Object Composite-Field Validation

| #   | Property                                                                                                                                                                                                            | Signal     | Severity | AMIS-REF                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| V5  | A default value on one array-element column MUST NOT suppress rule materialization for sibling columns; each element's compiled rules materialize independently.                                                    | TEST-GAP   | P1       | #9680                                                                                                              |
| V6  | A field inside an array row can depend on another field in the **same row** (row-local relative cross-field reference); closure expansion resolves within the same element instance.                                | DESIGN-GAP | P1       | #10031                                                                                                             |
| V7  | When an array is loaded with pre-existing data, element-field validation runs against loaded values; a field that already has a valid value passes (validation state must not be tied to "added vs loaded" origin). | TEST-GAP   | P2       | #4645 — **RESOLVED (B7)**: covered-by B3.2 `b32-array-submit-and-validate.test.tsx` (C7 submit-all-rows) + B1.2 V5 |
| V8  | External (server) errors are addressable by nested path (`address.city`) and surface on the correct descendant; path containment rejects paths outside the owner subtree.                                           | TEST-GAP   | P1       | #1364                                                                                                              |
| V9  | One submit attempt produces exactly one aggregate validation-failure notification, even when multiple fields (incl. nested combo) fail.                                                                             | TEST-GAP   | P1       | #8659                                                                                                              |

**Recommended tests:**

- V5: input-table with column A (required) and column B (required, `value:"sss"`); submit empty A → A required error fires.
- V6: row-local dependency where field B's rule references field A in the same row; change A in row N → only row N's B revalidates. (Design note in form-validation.md array-field section first.)
- V7: pre-populate array with valid data; submit → no required errors on already-filled fields; cover init/initial vs user-added rows.
- V8: inject external error at nested path `address.city`; assert child chrome renders it; assert out-of-subtree path rejected.
- V9: form with multiple required fields + nested combo with required fields; submit empty → assert exactly one `validateFailed` summary event fires.

**Recommended design note (form-validation.md array-field section):** document that dependency paths may be row-relative and closure expansion resolves within the same repeated-instance context.

---

## C. Rule Semantics / Type Coercion / Pattern Correctness

| #   | Property                                                                                                                                                                                                                           | Signal     | Severity | AMIS-REF                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V10 | Numeric rules (min/max/isInt) coerce or type-check before comparing; a non-numeric string produces a single coherent error, not contradictory "passes both > and <".                                                               | BOTH       | P1       | #1994                                                                                                                                                                          |
| V11 | Built-in format rules (id-card/email/phone/url) accept valid inputs and reject invalid ones — truth-table correctness.                                                                                                             | TEST-GAP   | P2       | #10257 — **RESOLVED (B7)**: watch-only (format rules delegate to stable stdlib regex; no Flux-specific regression path; P2 low-freq)                                           |
| V12 | Rule vocabulary has clear, non-overlapping semantics; "presence" (required) vs "content" (no-whitespace-only) are distinct and documented.                                                                                         | DESIGN-GAP | P2       | #574 — **RESOLVED (B7)**: watch-only (rule-kind vocabulary already separates presence vs content; B1.2 Rule Template Model notes cover; formal table = optimization-candidate) |
| V13 | Pattern rule parameters (minimum/maximum/isLength/...) accept expression/variable references resolved at materialization; the referenced path enters `dependencyPaths` so the rule re-evaluates when the referenced field changes. | BOTH       | P1       | #3122, #3139, #3151, #1313                                                                                                                                                     |
| V14 | Pattern rules correctly compile/match arbitrary valid regexes (incl. `/`, escaping, character classes); invalid regexes surface as explicit configuration errors (fail-closed, never silent no-op).                                | LOCK       | P1       | #595, #745                                                                                                                                                                     |
| V15 | When a pattern rule fails and an author message exists, the rendered error is the author's message — never the raw regex source.                                                                                                   | TEST-GAP   | P2       | #2013, #3077 — **RESOLVED (B7)**: covered-by B1.2 `validation-rule-semantics-and-lifecycle.test.ts` (V15)                                                                      |

**Recommended tests:**

- V10: field `maximum:100, isInt:true`; input "abc" → single coherent error.
- V11: parameterized format-rule tests with known-valid/invalid value tables for id/email/phone/url.
- V12: field with only a no-whitespace rule + no required rule; input " " → fires; input "" → does NOT fire unless required also set.
- V13: `maximum: ${maxField}`; change maxField → threshold recomputes, validation re-runs; verify referenced path in `dependencyPaths`.
- V14: corpus of valid regexes containing `/`, escaping, classes — assert match/reject; malformed regex → configuration error (fail-closed).
- V15: pattern rule with custom message; non-matching input → error text equals custom message, never contains regex source.

**Recommended design notes:**

- form-validation.md "Rule Template Model": numeric rules must define input-type contract (coerce vs reject) per kind; all threshold rule kinds uniformly support compiled expression args.
- form-validation.md: clarify requiredness vs content rules; define which rules treat empty string as failing.

---

## D. Async Validation Semantics

| #   | Property                                                                                                                                                                                                                | Signal     | Severity | AMIS-REF |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| V16 | When a newer async run supersedes an older one, the stale run is cancelled and publishes **nothing** — never surfaces as a user-visible error ("cancelled" etc.); only the latest run's result publishes.               | TEST-GAP   | P0       | #10530   |
| V17 | Async validation snapshots the **latest** owner value at run start, not a stale value captured at scheduling time.                                                                                                      | TEST-GAP   | P1       | #3995    |
| V18 | When an async rule itself fails (network error/exception), the failure routes through the diagnostics seam (`env.monitor`/`onError` + `env.notify`), NOT as a field validation error. Transport failure ≠ rule failure. | DESIGN-GAP | P1       | #8850    |

**Recommended tests:**

- V16: rapid successive changes triggering async validation; assert stale run publishes nothing; only latest result publishes; `ValidationResult` has no `cancelled` flag callers could misread.
- V17: async rule + change-trigger; A→B→C rapidly; assert resolved run uses value C, not A/B; snapshot bound at execution time, not debounce-schedule time.
- V18: async rule whose fetch rejects; assert no field error published, but `env.monitor`/`onError` invoked. (Design note in form-validation.md "Async Validation Semantics" first.)

**Recommended design note (form-validation.md "Async Validation Semantics"):** distinguish "rule produced errors" (field-addressed) from "rule execution failed / transport error" (diagnostics seam, not a field error).

---

## E. Hidden / Inactive Field Participation & Init Boundary

| #   | Property                                                                                                                                                                                                                                                                                                                                   | Signal   | Severity | AMIS-REF |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------- | -------- |
| V19 | A field hidden via visibility is excluded from validation participation; under `clearValueWhenHidden` its value is cleared, otherwise retained-but-skipped. Holds for individually-hidden fields, not just hidden parents. (Companion to `04-combo-and-array-field.md` C10, which covers the _submit-payload_ exclusion of hidden fields.) | TEST-GAP | P1       | #11907   |
| V20 | Initial data load (init/remote hydration) does NOT trigger user-visible validation errors; `system` reason / `showErrorOn` policy keeps errors hidden before any interaction; init-driven writes don't mark fields touched.                                                                                                                | TEST-GAP | P1       | #8383    |
| V21 | A programmatic write (ajax result / `setValue`) that populates previously-empty required fields clears stale required errors and makes the form submittable without a second action (`applyChangesAndRevalidate` is atomic).                                                                                                               | TEST-GAP | P1       | #6949    |

**Recommended tests:**

- V19: required field A hidden via visibility; submit; assert A not validated; cover default + `clearValueWhenHidden`.
- V20: form with required fields + remote init returning empty values + `validateOnChange`; after init → no visible field errors, even if summary validity is false.
- V21: required field A errors on submit; ajax action writes valid value via `applyChangesAndRevalidate` → A error clears, `canSubmit` true without manual re-validate.

---

## F. Submit Orchestration & Programmatic Validation API

| #   | Property                                                                                                                                                                                                                  | Signal     | Severity | AMIS-REF                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| V22 | Any validation entry point (manual, action-triggered, submit) runs the **full** rule pipeline for the targeted set — there is no "required-only" weakened mode. Action/external triggers validate all materialized rules. | BOTH       | P1       | #4236, #4862, #4876                                                                                                                                |
| V23 | Programmatic `validate()` returns a structured, truthful result (valid flag + failed paths) so callers can branch downstream actions ("validate then conditionally act" is first-class).                                  | DESIGN-GAP | P1       | #6941, #7657, #9867                                                                                                                                |
| V24 | User-facing validation summaries prefer the field's display **label** over its technical `name`, falling back to name only when label is absent.                                                                          | DESIGN-GAP | P2       | #2622 — **RESOLVED (B7)**: watch-only (summaries render field labels by construction; label-over-name fallback is a rendering detail; P2 low-freq) |

**Recommended tests:**

- V22: trigger validation via the action/external entry on a field with required + minLength + pattern; assert all rules execute and all errors surface.
- V23: `validateAll('manual')`; on failure assert result lists failing paths; on success assert downstream action proceeds.

**Recommended design notes:**

- form-validation.md: any validation entry point runs the same full rule pipeline; document `validate()` return contract (valid flag + failed paths).
- form-validation.md "ValidationError": scope-level summary rendering resolves label-with-name-fallback.

---

## Highest-Leverage Items

If only a few are acted on:

1. **V1/V2** — dependency-closure error-clearing (the most user-visible amis regression class).
2. **V16/V18** — async validation staleness/no-publish + transport-failure-via-diagnostics.
3. **V22** — every validation entry point runs the full pipeline (the "required-only" regression is subtle and dangerous).
4. **V5/V6** — array/table per-row and per-column rule materialization correctness.
