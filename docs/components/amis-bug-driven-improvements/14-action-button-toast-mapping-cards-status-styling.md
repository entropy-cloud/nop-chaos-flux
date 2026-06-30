# 14 Action / Button / Toast / Mapping / Condition-Builder / Cards / Status / Styling — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/button/design.md`, `docs/components/dropdown-button/design.md`, `docs/architecture/action-scope-and-imports.md`, `docs/components/condition-builder/design.md`, `docs/components/cards/design.md`, `docs/components/card/design.md`, `docs/components/status/design.md`, `docs/components/mapping/design.md`, `docs/architecture/styling-system.md`
> amis cluster: `other/` (178 issues)
> Priority summary: this cluster was previously uncovered. It contains real, non-amis-specific signal for Flux components the project has or plans. The highest-value finds are condition-builder `disabled` fan-out, mapping source-scope ambiguity in lists, action-graph reload target resolution, and the conditional-className question.
> Triage: ~40 deep-reads (+178 titles scanned) → 33 entries across 9 areas.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis designs Flux rejects)

| amis feature                                                   | Reason rejected                                                                    | AMIS-REF                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| `actionType` discriminator tree (ajax/url/dialog/download/...) | Flux uses action graph nodes                                                       | (whole button/action cluster) |
| `level` (button color)                                         | Flux uses `variant`                                                                | (whole cluster)               |
| String-script `onClick` (JS string in schema)                  | Flux forbids; logic in action graph                                                | #2833, #2508                  |
| `hotKey` on button                                             | Host/shell concern                                                                 | #2502                         |
| amis `themeCss` / `.amis-scope` helper.css prefix              | Flux resolves to Tailwind, no parallel helper.css                                  | #1807, #5553, #5502           |
| amis object-form className `{"text-danger": "expr"}`           | Flux uses `variant`/`intent` + `when`, or expression-resolved className (see STY1) | #3368                         |

---

## A. Button

| #   | Property                                                                                                                                                                                     | Signal                                                                                                                                                       | Severity | AMIS-REF                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------- | ----- |
| B1  | `disabled` accepts `boolean                                                                                                                                                                  | expression string`uniformly; an expression value is actually evaluated (never silently always-true). The unified contract (no`disabledOn`) must not regress. | LOCK     | P1                                                                                                                      | #3284 |
| B2  | A bare `url`/`href` field with no navigate action either navigates OR is a documented error/warning — never a silent no-op dead button.                                                      | DESIGN-GAP                                                                                                                                                   | P2       | #5323 — **RESOLVED (B7)**: watch-only (bare url/href navigate requires action construct-true; P2 low-risk)              |
| B3  | A `label` resolved from a data-domain value containing `&` (or other entities) renders faithfully (one decode layer) — no double-escaping of already-text content.                           | TEST-GAP                                                                                                                                                     | P2       | #4246 — **RESOLVED (B7)**: covered-by B6.2 `button-enhancements.test.tsx` (B3 label with `&` faithful)                  |
| B4  | Secondary events (onDoubleClick / onMouseEnter / ...) are explicitly resolved — either "events beyond onClick route via action-graph event nodes" or tracked as follow-up. Currently silent. | DESIGN-GAP                                                                                                                                                   | P2       | #3675 — **RESOLVED (B7)**: watch-only (secondary events route via action-graph event nodes construct-true; P2 low-freq) |

**Recommended action B2/B4:** Add design notes to `button/design.md` §8/§12: resolve the secondary-event question; define `url`-without-navigate-action precedence + failure path.

**Recommended tests:**

- B1: `disabled: "${!isAdmin}"` → truthy disabled, falsy enabled (both branches).
- B3: `label: "${name}"` where name="A & B" → renders literal "A & B" (not "A &amp; B").

---

## B. Action Graph

| #   | Property                                                                                                                                                                      | Signal                                                                                                      | Severity   | AMIS-REF                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| AG1 | The action graph runs >2 steps in declared order, awaiting async ones and propagating their results — the "one action per click" limitation can never recur.                  | LOCK                                                                                                        | P1         | #3592                                                                                                                                                                              |
| AG2 | String-script `onClick` is rejected; async sequencing belongs in the action graph (cite #2833/#2508 as the reason).                                                           | LOCK                                                                                                        | P2         | #2833, #2508 — **RESOLVED (B7)**: covered-by `action-scope-and-imports.md` (`onClick` accepts ActionSchema object, not string; amis string-script onClick rejected by schema type) |
| AG3 | A `reload` action targets a specific component (by name/id) and reloads only that component's data source, NOT the whole page. Core action-graph target-resolution property.  | DESIGN-GAP                                                                                                  | P0         | #5725                                                                                                                                                                              |
| AG4 | A download action (when added) accepts `filename?: string                                                                                                                     | expr` (resolved from expression over data scope), used as fallback when response lacks Content-Disposition. | DESIGN-GAP | P3                                                                                                                                                                                 | #6096 — **RESOLVED (B7)**: watch-only (download-action filename fallback construct-true; P3 low-freq) |
| AG5 | A navigate action (when added) with `target:"_blank"` opens a new tab (`window.open`); a URL containing `#/?_a=` is forwarded verbatim (no double-hash/SPA-router rewriting). | TEST-GAP                                                                                                    | P2         | #865, #5534 — **RESOLVED (B7)**: watch-only (navigate target:\_blank is host-navigation-layer; Flux has no router; construct-true; P2 host concern)                                |

**Recommended action AG2/AG3/AG4:** Add design notes to `button/design.md` §8 + `action-scope-and-imports.md`: reject string-script onClick (cite #2833/#2508); reload targets a named component not the page; download action `filename` arg.

**Recommended tests:**

- AG1: onClick action graph `[callApi, setValue, close]` → all three execute in order, async results propagate.
- AG3: action-graph reload with `target:"someComp"` → only that component's source reloads, no full-page re-render.
- AG5 (when navigate lands): `target:"_blank"` → `window.open` with resolved URL; URL with `#/?_a=` forwarded unchanged.

---

## C. Dropdown-Button

| #   | Property                                                                                                                  | Signal     | Severity | AMIS-REF                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| DB1 | `closeOnSelect?: boolean` (default true) — selecting a menu item dismisses the popover unless explicitly disabled.        | DESIGN-GAP | P2       | #2987 — **RESOLVED (B7)**: watch-only (dropdown `closeOnSelect` dismisses popover construct-true; P2 niche)          |
| DB2 | Whether the trigger accepts a region/schema fragment (avatar/custom node), not just label+icon, is a documented decision. | DESIGN-GAP | P3       | #3086 — **RESOLVED (B7)**: watch-only (dropdown trigger region/schema-fragment decision construct-true; P3 low-freq) |

**Recommended action DB1/DB2:** Add design notes to `dropdown-button/design.md` §4/§6: add `closeOnSelect`; resolve trigger-as-region decision.

---

## D. Toast

| #   | Property                                                                                                             | Signal   | Severity | AMIS-REF                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| T1  | Toast `position` (center / top-right / ...) is stable per value — no position drift across versions.                 | TEST-GAP | P2       | #4258 — **RESOLVED (B7)**: watch-only (toast position stable per value sonner construct-true; P2 low-risk) |
| T2  | Imperative `toast.success(...)` is React strict-mode-safe (message appears exactly once, no throw, no double-toast). | TEST-GAP | P1       | #4418                                                                                                      |
| T3  | `duration` applies uniformly to all variants (info/success/error/warning) — no variant-specific duration asymmetry.  | TEST-GAP | P2       | #676 — **RESOLVED (B7)**: covered-by B6.2 `sonner.test.tsx` (T3 duration uniform across variants)          |

**Recommended tests:**

- T1: toast with `position=center` appears centered; `position=top-right` in corner (rect-based).
- T2: mount Flux root in `<React.StrictMode>`, fire imperative `toast.success` → message appears exactly once.
- T3: toast `duration:N` across all variants → auto-dismisses at ~N ms.

---

## E. Mapping

| #   | Property                                                                                                                                                                                                                                                                                             | Signal     | Severity | AMIS-REF                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| MP1 | `map` resolves from an expression/data-source (`map: "${statusMap}"`), rendering labels by the resolved map and falling back to `placeholder`/`defaultLabel` on miss.                                                                                                                                | LOCK       | P2       | #1367 — **RESOLVED (B7)**: covered-by B6.2 `mapping.test.tsx:101,120,161` (defaultLabel/placeholder fallback on miss) + MP2 expr/source resolution |
| MP2 | In a repeating context (crud/cards), `map` source fetch scope is defined (once-per-renderer, cached) vs per-row value resolution; precedence when both static `map` and a loader-sourced map exist (loader wins); an explicit empty `map:{}` + source does not produce wrong-data/wildcard fallback. | DESIGN-GAP | P1       | #3121                                                                                                                                              |

**Recommended action MP2:** Add design note to `mapping/design.md` §9: define `map` source fetch scope (once-per-renderer, cached) vs per-row value resolution; precedence (loader wins); empty-map + source interaction.

**Recommended test MP2:** mapping in a list with a shared source map resolves each row's value correctly; no wildcard fallback on empty map.

---

## F. Condition-Builder

| #   | Property                                                                                                                                                                                              | Signal     | Severity | AMIS-REF                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| CB1 | `disabled` fans out transitively to ALL mutation affordances: drag (dnd-kit sensors), group/item delete, add-condition/add-group, and the `if`/`not` input — one umbrella switch, no partial disable. | DESIGN-GAP | P0       | #4655                                                                                                                      |
| CB2 | `maxDepth`/`maxItemsPerGroup` block add-group/add-condition at the limit (validates Flux design).                                                                                                     | LOCK       | P2       | #4318 — **RESOLVED (B7)**: covered-by `config-display.test.tsx:85-169` (maxDepth/maxItemsPerGroup block-add anchors)       |
| CB3 | `showNot:true` NOT toggle appears on the initial group AND on every runtime-added group; toggling writes `value.not` and persists across serialize/deserialize.                                       | TEST-GAP   | P1       | #3643                                                                                                                      |
| CB4 | The value-input slot (third slot) fills available row width by default (widget-internal styling); width override via `className` on the slot per styling-system widget contract.                      | DESIGN-GAP | P3       | #5601 — **RESOLVED (B7)**: watch-only (condition-builder value-input slot fills width construct-true styling; P3 low-risk) |

**Recommended action CB1/CB4:** Add design notes to `condition-builder/design.md` §7/§10: `disabled` is one umbrella switch fanning out to all mutation affordances; value-input slot fills width.

**Recommended tests:**

- CB1: `disabled:true` → removes/disables drag, delete, add-condition, add-group.
- CB2: `maxDepth:3` → "add group" hidden/blocked at depth 3; `maxItemsPerGroup:N` → add-condition blocked beyond N.
- CB3: `showNot:true` → NOT toggle on initial + runtime-added groups; toggling writes `value.not`, persists across serialize/deserialize.

---

## G. Cards / Card

| #   | Property                                                                                                                                                                      | Signal     | Severity | AMIS-REF                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CD1 | A single `selectable` (or selection-mode) field, when off, disables BOTH the click-to-highlight visual AND selection state — no partial disable.                              | DESIGN-GAP | P1       | #3254                                                                                                                                              |
| CD2 | Card media/image `url` resolves expressions against row scope (`image: "${imgUrl}"`); missing value degrades gracefully (no broken img).                                      | TEST-GAP   | P2       | #3262 — **RESOLVED (B7)**: watch-only (card media url resolves expr against row scope; missing degrades construct-true echo-fallback; P2 low-risk) |
| CD3 | `columnsCount` (number) or responsive column control is a semantic prop, not an `itemClassName` maxWidth workaround.                                                          | DESIGN-GAP | P2       | #4650 — **RESOLVED (B7)**: watch-only (`columnsCount` semantic prop not itemClassName workaround construct-true; P2 niche)                         |
| CD4 | Card `itemAction`/onClick resolves target scope to the named component (see AG3), not the root.                                                                               | TEST-GAP   | P1       | #5725                                                                                                                                              |
| CD5 | A button with `icon` rendered inside a card `actions` region retains the same icon↔label gap as a standalone button (container CSS does not clobber widget-internal spacing). | TEST-GAP   | P2       | #4901 — **RESOLVED (B7)**: watch-only (card actions button icon↔label gap construct-true styling; P2 low-risk)                                     |
| CD6 | Hover-elevation is decided: either a `variant: "elevated"` or a `data-interactive` state with theme-CSS `:hover` shadow.                                                      | DESIGN-GAP | P3       | #3094 — **RESOLVED (B7)**: watch-only (hover-elevation variant/data-interactive construct-true styling; P3 low-risk)                               |

**Recommended actions:**

- CD1: Add design note to `cards`/`card/design.md` §7: single `selectable` field disables visual + behavior together.
- CD3: Add design note to `cards` design: expose `columnsCount` as a semantic prop.
- CD6: Add design note to `card/design.md` §10/§12: decide hover-elevation as variant or `data-interactive` state.

**Recommended tests:**

- CD1: `selectable=false` → clicking a card produces no `data-selected` and no selection event.
- CD2: card `image:"${imgUrl}"` inside cards/list → URL resolves per row; missing value degrades gracefully.
- CD5: button with `icon` inside card `actions` region → icon↔label gap same as standalone (data-icon=inline-start padding intact).

---

## H. Status / Property

| #   | Property                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Signal     | Severity | AMIS-REF                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ST1 | **Per-renderer field-consistency** (NOT a Rule-1 tautology): within one renderer, all semantic text fields must uniformly accept `${expr}` — no field is expression-blind while its siblings aren't. amis #4900 = `property.title` did not resolve expressions while `source` did. Flux Rule 1 guarantees any field CAN carry an expr, so this is a regression test that no field accidentally bypasses the compiler's expression path (e.g. a field wrongly read from raw schema instead of `props`). | TEST-GAP   | P2       | #4900 — **RESOLVED (B7)**: watch-only (per-renderer field-consistency META_FIELDS construct-true; broad/generic hard to anchor; P2)         |
| ST2 | Boolean status is expressed via the existing value-keyed maps (`labelMap: {"true": "启用", "false": "停用"}`) — explicitly NOT introducing amis `trueValue`/`falseValue`. Single mapping contract.                                                                                                                                                                                                                                                                                                     | DESIGN-GAP | P2       | #2896 — **RESOLVED (B7)**: watch-only (boolean status via value-keyed maps, Flux rejects trueValue/falseValue; construct-true; P2 low-risk) |
| ST3 | Status/property dynamic-source path (value/loader-sourced map) renders dynamically-fetched labels.                                                                                                                                                                                                                                                                                                                                                                                                     | TEST-GAP   | P2       | #6520, #3095 — **RESOLVED (B7)**: watch-only (status dynamic-source path renders fetched labels construct-true; P2 niche)                   |

**Recommended action ST2:** Add design note to `status/design.md` §4: boolean status via value-keyed maps, NOT `trueValue`/`falseValue`.

**Recommended tests:**

- ST1: every text field resolves `${expr}`.
- ST3: status with loader-sourced `labelMap` renders dynamically-fetched labels.

---

## I. Styling-System

| #    | Property                                                                                                                                                                                   | Signal     | Severity | AMIS-REF                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| STY1 | Conditional className stance is documented: either (a) expression-resolved className is supported, or (b) conditional styling routes via `variant`/`intent` + `when`. Currently ambiguous. | DESIGN-GAP | P2       | #3368 — **RESOLVED (B7)**: watch-only (conditional className stance covered thematically by styling-system; construct-true; P2 low-risk) |
| STY2 | Flux utility classNames (e.g. `text-destructive`) work with only the default Flux stylesheet bundle — NO separate helper.css / scope-prefix required.                                      | LOCK       | P1       | #1807, #5553, #5502                                                                                                                      |
| STY3 | A spinner with an explicit `icon` renders that icon even when a global/root loading config is active (explicit prop not silently blanked by config).                                       | TEST-GAP   | P2       | #6546 — **RESOLVED (B7)**: watch-only (spinner explicit icon renders with root loading config construct-true; P2 trivial)                |
| STY4 | Inline `style` passthrough casing (camelCase `backgroundImage`) is documented, OR a `backgroundImage` semantic prop exists on container/wrapper.                                           | DESIGN-GAP | P3       | #3346, #6223 — **RESOLVED (B7)**: watch-only (inline style camelCase passthrough construct-true; P3 low-risk)                            |

**Recommended actions:**

- STY1: Add design note to `styling-system.md`: state whether conditional className is supported (expression-resolved or via `variant`+`when`); document the path.
- STY2: Add design note: utility classNames work with default bundle, no helper.css.
- STY4: Add design note: inline `style` camelCase passthrough, OR `backgroundImage` semantic prop.

**Recommended tests:**

- STY2: renderer with `className:"text-destructive"` renders correct color with only default Flux stylesheet.
- STY3: spinner with explicit `icon` renders it even with root loading config active.

---

## Highest-Leverage Items

1. **CB1** — condition-builder `disabled` fan-out (genuine P0 correctness property; disabled-but-still-mutable).
2. **AG3** — reload targets named component not page (core action-graph target-resolution).
3. **MP2** — mapping source-scope ambiguity in lists (data correctness).
4. **CD1** — card selection highlight can't be partially disabled (selection ownership).
5. **STY1** — conditional-className stance (currently ambiguous authoring question).
