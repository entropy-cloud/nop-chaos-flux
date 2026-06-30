# 04 Combo & Array-Field — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/combo/design.md`, `docs/architecture/array-field.md`, `docs/architecture/object-field.md`, `docs/architecture/composite-value-owner-clean-slate.md`
> amis cluster: `form/combo` (56 issues)
> Priority summary: Flux's `combo` ≈ `array-field` (object-array editing) with projected scope + `$slot.index` + per-row delete/add + `scaffold`/defaults + unique constraints. The residual gaps are per-row conditions, nested isolation, validation addressing, and "add vs validate" timing.
> Triage: ~16 deep-reads (+56 titles scanned) → 15 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis combo designs Flux rejects)

| amis feature                                             | Reason rejected                                                          | AMIS-REF        |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| `multiLine` / `type: 'combo'` mode flags                 | Flux `array-field` `itemKind` (scalar/object) is the canonical model     | (whole cluster) |
| `canAccessSuperData` / `strictMode` / `syncFields` hacks | Flux's projected scope + lexical inheritance replaces these ad-hoc knobs | #740, #2010     |
| `messages`/`msg` text-param pack for per-field errors    | Flux uses field-addressed validation state, not packed text              | (whole cluster) |

---

## A. Nested Combo Isolation & Cascading

| #   | Property                                                                                                                                                                 | Signal     | Severity | AMIS-REF |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------- |
| C1  | A combo (object array) nested inside another combo's item writes only to its own index-addressed subpath (`${parent.name}.${i}.${child.name}.${j}`); no cross-row bleed. | DESIGN-GAP | P1       | #2010    |
| C2  | A nested combo's child item can read parent-row fields via owner scope for cascading (no `syncFields` equivalent needed).                                                | LOCK       | P1       | #740     |

**Recommended action C1:** Add design note to `combo/design.md` §7 and `array-field.md` "Scope Model": nested array-field writes are isolated to the index-addressed subpath; child item reads parent-row fields via owner scope.

**Recommended tests:**

- C1/C2: 2-level nested object-array; edit row 0 child → row 1 untouched; change parent-row field → child row `when` reacts.

---

## B. Per-Row Conditions

| #   | Property                                                                                                                                                                                                                              | Signal     | Severity | AMIS-REF                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| C3  | Per-row delete can be conditionally disabled (echoed/persisted rows not deletable while newly-added rows are), expressed via an item-scoped `when` on the `removeItem` handle (canonical Flux mechanism), not a field-global boolean. | DESIGN-GAP | P1       | #1359, #4479, #6162                                                                                         |
| C4  | Per-row add/sort gating (when `sortable` lands) is item-scoped.                                                                                                                                                                       | DESIGN-GAP | P2       | #3269 — **RESOLVED (B7)**: watch-only (per-row add/sort gating depends on unimplemented `sortable` feature) |

**Recommended action C3:** Add design note to `combo/design.md` §4/§8: per-row delete gating via item-scoped `when` on `removeItem` (canonical), not field-global boolean.

**Recommended test C3:** array with mixed echoed+new rows; delete disabled on rows matching condition, enabled on others; add then delete new row works.

---

## C. Validation Addressing (server / external errors)

| #   | Property                                                                                                                                                                                           | Signal     | Severity | AMIS-REF                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| C5  | Server/external errors addressed at `${name}.${i}` (row-level) attach to the item row; at `${name}.${i}.${child}` (incl. through containers/tabs) reach the leaf; undefined-target does not crash. | DESIGN-GAP | P1       | #1498, #1380                                                                                                                                |
| C6  | A `unique` constraint across array items validates without clobbering sibling items' values during re-validation.                                                                                  | TEST-GAP   | P2       | #1729 — **RESOLVED (B7)**: watch-only (unique constraint resolves via absolute path per V6 adjudication; no sibling clobber construct-true) |

**Recommended action C5:** Add design note to `array-field.md` "Validation And Addressing": row-level and leaf-level (through containers/tabs) external error paths; undefined-target handling.

**Recommended tests:**

- C5: apply row-level error `items[1]` and leaf error `items[0].sku` and nested `items[2].tabs.t.sku` → each highlights, no throw.
- C6: array-field `itemKind=object` with unique constraint; edit item 0 to collide with item 2 → only validation error, items 1/2 values unchanged.

---

## D. Add / Validate Timing

| #   | Property                                                                                                                                                                                                                                         | Signal     | Severity | AMIS-REF                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| C7  | Adding/scaffolding a new (empty) item does NOT surface required-field validation for that not-yet-filled row; validation fires on submit or on the row's own field edit.                                                                         | DESIGN-GAP | P1       | #3273                                                                                                              |
| C8  | When items are added/accessed out of order, per-item `scaffold`/defaults apply without creating array holes or length mismatch that resets entered values.                                                                                       | TEST-GAP   | P2       | #3511, #793 — **RESOLVED (B7)**: watch-only (out-of-order add scaffold/defaults no holes construct-true; P2 niche) |
| C9  | An array item's committed value contains ONLY its declared child fields; transient data-source response payloads (options, fetched items) in the item scope are not persisted into the array value.                                              | DESIGN-GAP | P1       | #4024                                                                                                              |
| C10 | When a field is hidden by `when`, its value is excluded from submit by default (hide ≠ clear; contract explicit, opt-in keep). (Submit-payload companion to `01-form-validation.md` V19, which covers the _validation-participation_ exclusion.) | DESIGN-GAP | P1       | #974                                                                                                               |

**Recommended actions:**

- C7: Add design note to `combo`/`array-field` docs: scaffolding/adding does not validate the new row until interaction or submit.
- C9: Add design note to `combo/design.md` §7/`array-field.md`: item committed value = only declared child-field writes.
- C10: Add design note to form-validation / `when` mechanism doc: hidden fields excluded from submit by default, opt-in keep.

**Recommended tests:**

- C7: required field in item template; click add → no error; type then clear → error; submit → all rows validated.
- C8: add 3 items, fill index 2 before 0/1 → values at all indices retained; `scaffold` with partial defaults → merged without overwriting.
- C9: item contains a select whose options come from a per-item data-source → submit value contains only declared fields.
- C10: two same-named fields toggled by `when`; switch visibility → only visible field's value in submit payload.

---

## E. Reorder / Move

| #   | Property                                                                                                                                                            | Signal   | Severity | AMIS-REF                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| C11 | Move/reorder keeps displayed order, committed array order, and itemKey order identical after multiple consecutive moves; validation paths remap by index correctly. | TEST-GAP | P2       | #3269 — **RESOLVED (B7)**: watch-only (move/reorder parity depends on unimplemented `sortable`/move feature) |

**Recommended test C11** (when `sortable` lands): 3+ consecutive non-trivial moves; assert rendered order === value array order === itemKey order; validation paths remap by index.

---

## F. Performance / Per-Item Lifecycle

| #   | Property                                                                                                                                                                             | Signal     | Severity | AMIS-REF                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| C12 | Editing one item re-renders only that row's subtree (stable `itemKey`-based identity).                                                                                               | TEST-GAP   | P1       | #1505                                                                                                                                      |
| C13 | A per-item action that returns data writes back into that item's index-addressed path and reflects in the parent array value; one row's async loading does NOT disable sibling rows. | DESIGN-GAP | P1       | #5555                                                                                                                                      |
| C14 | `maxItems`/`minItems` driven by an expression/another field reactively updates the add-button state and validation.                                                                  | TEST-GAP   | P2       | #6163, #2864 — **RESOLVED (B7)**: watch-only (maxItems/minItems expression reactivity construct-true via rule re-materialize; P2 low-freq) |
| C15 | Scalar-array (`itemKind=scalar`) items support any scalar editor (number/text/switch) without type-specific breakage.                                                                | TEST-GAP   | P2       | #5819 — **RESOLVED (B7)**: watch-only (scalar-array any scalar editor construct-true via generic item renderer; P2 niche)                  |

**Recommended action C13:** Add design note to `array-field.md` "Lifecycle": per-item action results write to `${name}.${i}.*` and are visible in parent value; per-item loading is item-scoped.

**Recommended tests:**

- C12: large array-field (50 items); edit one field in row 25 → only that row re-renders (render-count assertion).
- C13: row action returns `{status:true}` → only that row updates, parent value reflects it, siblings remain interactive.
- C14: `maxItems` bound to `${count}`; change count → add-button disables/enables, validation threshold updates.
- C15: `itemKind=scalar` with item editors input-number, input-text, switch → each binds/writes/validates to `${name}.${i}`.

---

## Highest-Leverage Items

1. **C5** — validation error addressing at row-level and through nested containers (correctness).
2. **C3** — per-row delete conditions via item-scoped `when` (high-frequency real need).
3. **C9/C10** — item committed value filters to declared fields; hidden fields excluded from submit (data correctness).
4. **C7** — "add should not validate" (UX correctness).
5. **C12/C13** — per-item re-render isolation + per-item action writeback (performance + correctness).
