# 07 Input-Tree (& Tree-Select) — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/tree/design.md`
> amis cluster: `form/input` (tree subset)
> Priority summary: input-tree is the strongest, most generic-correctness amis cluster. Flux's design already nails the cascade contract (positive boolean, only in checkbox mode, down-propagate + up-derive). The residual gaps are leaf-derivation from empty-children, cascade dedup, lazy-init echo race, and option immutability.
> Triage: ~6 deep-reads → 7 entries (TR6 split: valueField remap kept live, enableNodePath path-build → TR7 DESIGN-ACK-NOT-IMPL since 暂不实现).

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis tree designs Flux rejects)

| amis feature                                 | Reason rejected                                                | AMIS-REF                        |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------- |
| `cascade` flag with version-inverted meaning | Flux `cascade` is a stable positive boolean (true = propagate) | #4093                           |
| `showIcon` / `showOutline` amis skin toggles | Replaced by `optionTemplate`/schema-driven content             | (input-tree contract drift set) |

---

## A. Leaf Derivation & Cascade Contract

| #   | Property                                                                                                                                                                                                                           | Signal   | Severity | AMIS-REF |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| TR1 | A node whose `children` is an empty array `[]` IS a leaf and is selectable (leaf-ness = "no children OR empty-array children OR children key absent"). Server APIs returning `children:[]` instead of `null` are extremely common. | TEST-GAP | P0       | #2355    |
| TR2 | `cascade` contract is stable: (a) `cascade:true` + checkbox → check parent checks all selectable descendants; (b) unchecking last child unchecks parent; (c) partial → indeterminate; (d) cascade ignored in radio/normal mode.    | LOCK     | P0       | #4093    |
| TR3 | Cascade writes parent+children values together; repeated select/deselect of the last child does NOT accumulate duplicate parent entries (only truly-flipped values enter the array).                                               | TEST-GAP | P1       | #4859    |

**Recommended tests:**

- TR1: node `{value:'a', children:[]}` in checkbox mode is selectable; value written on check.
- TR2: lock the 4 cascade behaviors above.
- TR3: `cascade:true`, toggle last child on/off 5× → value array contains parent exactly once (or zero), no duplicates.

**Recommended action TR1:** Add design note to `input-tree` §4: leaf derivation treats empty-array children as leaf.

---

## B. Lazy-Load & Init-Value Echo Race

| #   | Property                                                                                                                                                                                                                                                              | Signal   | Severity | AMIS-REF |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| TR4 | With `childrenSource` lazy loading, the initial selected value (referencing not-yet-loaded descendants) reliably resolves/echoes after async children arrive (deterministic, no flake); init-value resolution waits for / reattempts after `childrenSource` resolves. | TEST-GAP | P1       | #3228    |

**Recommended test TR4:** `childrenSource` lazy + initial value referencing a deferred descendant → after children load, the node is checked (deterministic, no flake).

**Recommended action TR4:** Add design note: init-value resolution waits for/reattempts after `childrenSource` resolves.

---

## C. Immutability & Path Building

| #   | Property                                                                                                                                                                                                                                                                                                                                      | Signal              | Severity | AMIS-REF                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| TR5 | Tree option helpers treat option records as immutable (derive keyed/flattened metadata into separate maps; never write onto the source option object) — matters because options can come from frozen source data.                                                                                                                             | TEST-GAP            | P1       | #6042                                                                                                                                               |
| TR6 | `valueField`/`labelField`/`childrenKey` remapping (live Flux fields, `input-tree/design.md` §4) resolves node keys correctly against arbitrary record shapes — value lookup uses the configured `valueField`, not a hardcoded `value` key. (Distinct from select's rejected value-**encoding** `valueField`; this is node-key **remapping**.) | TEST-GAP            | P2       | #6229 — **RESOLVED (B7)**: covered-by B4.2 `tree-options.test.ts:157` (TR6 node-key remap anchor)                                                   |
| TR7 | `enableNodePath` + `pathSeparator` path-string construction. **`enableNodePath` is 暂不实现 in `input-tree/design.md` §4** — do NOT test until implemented. Tracked as DESIGN-ACK-NOT-IMPL so a future implementer has the property pinned.                                                                                                   | DESIGN-ACK-NOT-IMPL | P3       | #6229 — **RESOLVED (B7)**: out-of-scope-feature (`enableNodePath` 暂不实现; pinned not tested until implemented; successor input-tree feature plan) |

**Recommended tests:**

- TR5: options passed as `Object.freeze()`'d array → CRUD/flatten operations do not throw and do not mutate input.
- TR6: options where the id lives under `code` not `value` (`valueField:'code'`) → selection/checking resolves by `code`; remapping is consistent across flatten/cascade.
- TR7: deferred — no test until `enableNodePath` lands.

---

## Highest-Leverage Items

1. **TR1** — empty-children-as-leaf (extremely common server-API shape; silent selection failure).
2. **TR2** — cascade contract lock (amis drifted this across versions).
3. **TR5** — option immutability (matters for frozen source data + future memoization).
4. **TR4** — lazy-init echo race (intermittent ~20-30% failure in amis).
