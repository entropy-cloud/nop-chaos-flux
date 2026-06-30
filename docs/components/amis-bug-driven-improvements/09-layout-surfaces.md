# 09 Layout & Surfaces (dialog / drawer / tabs / page / flex / grid / collapse / card / steps / iframe) — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/dialog/design.md`, `drawer/design.md`, `tabs/design.md`, `page/design.md`, `flex/design.md`, `grid/design.md`, `collapse/design.md`, `card/design.md`, `steps/design.md`; `docs/architecture/surface-owner.md`, `docs/architecture/styling-system.md`
> amis cluster: `layout/dialog` (38), `layout/drawer` (10), `layout/nav` (49), `layout/tabs` (31), small layout dirs (card/collapse/fieldSet/flex/grid/iframe/page/panel/steps/wrapper)
> Priority summary: Flux's surface-family runtime (`statusPath`, global z-index counter, close-lifecycle), tabs ownership model, and styling-system marker-classes rule already close most amis bugs by construction. The residual gaps are lifecycle-teardown regression, stale-snapshot-vs-live-scope, and three "design-correctness anchors" (controlled-vs-default value, mountOnEnter inner-owner init) that must be locked.
> Triage: ~250 titles scanned + ~40 deep-reads → 16 entries across 10 components.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis layout designs Flux rejects)

| amis feature                                             | Reason rejected                                       | AMIS-REF                      |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| amis App / route / multi-page / nav as a single renderer | Host responsibility; Flux has no amis-style app shell | (layout/nav, mobile #6005)    |
| `themeCss` / per-component theme overrides               | Flux uses Tailwind + CSS variables + marker classes   | (whole cluster)               |
| amis `msg` / `confirmText` / `feedback` text-param packs | Flux uses field-addressed props, not packed text      | dialog/drawer decision tables |

---

## A. Dialog (surfaces)

| #   | Property                                                                                                                                                                                | Signal   | Severity | AMIS-REF |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| L1  | `runtime.dispose()` of a surface releases SurfaceEntry + surface-root validation owner + child scope; GC actually happens after repeated open/close (no retained scope / detached DOM). | TEST-GAP | P0       | #6390    |

> **Back-trace note:** amis #6390 was fixed in later amis versions (1.6 was wontfix); retained here as the regression-class anchor for Flux's surface teardown, not as a live amis defect.
> | L2 | A top-surface close (closeSurface top-most / close button / Esc) removes ONLY the top SurfaceEntry — does not cascade to ancestor surfaces; parent stays open, focus returns to parent, parent `statusPath` still reads `{open:true}`. | TEST-GAP | P1 | #1405 |
> | L3 | An ad-hoc surface (`openDialog` action) re-resolves the inlined surface schema against the **live** opening scope at open time, not a snapshot captured at click time. | TEST-GAP | P1 | #1970 |
> | L4 | `showCloseButton` and `closeOnOutside` are orthogonal (neither implies the other); both route through the same `onOpenChange(false)`. | LOCK | P2 | #4994, #4967 — **RESOLVED (B7)**: covered-by `dialog-host-close-behavior.test.tsx:89` + `surface-enhancements.test.tsx:186` (independent props) |
> | L5 | An action in a chain may short-circuit subsequent sibling actions; `openDialog`/`openDrawer` respect the chain halt (no `stopPropagation`-can't-stop-surface class of bug). | DESIGN-GAP | P2 | #6502 — **RESOLVED (B7)**: watch-only (action-chain halt propagates via action graph construct-true; P2 low-risk) |

**Recommended action L5:** Add design note to `docs/architecture/action-interaction-state.md`: "an action in a chain may short-circuit subsequent sibling actions; surfaces respect the chain halt."

**Recommended tests:**

- L1: open a dialog mounting a heavy owner (form + table/source), close, repeat 50× → no retained SurfaceEntry/scope/detached DOM (weak-ref/heap-count gate).
- L2: nested dialog-in-dialog; close inner via top-most/close/Esc → only inner removed, parent open, focus restored.
- L3: button whose `openDialog` body contains a scope-derived value; mutate scope; click again → newly opened surface reflects latest scope (not first-click snapshot).
- L4: `showCloseButton:false + closeOnOutside:false` → no close affordance AND outside-click doesn't close; `showCloseButton:false + closeOnOutside:true` → header hidden, outside-click still closes.

**Recommended action L4:** Add design note to `drawer/design.md` §7: "`showCloseButton` and `closeOnOutside` are orthogonal; defaults independent; neither implies the other."

---

## B. Drawer

| #   | Property                                                                                                                                                                                                                                     | Signal   | Severity | AMIS-REF |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| L6  | A transient overlay (popover/select) opened INSIDE a drawer must portal to the document root and must NOT write `position`/layout onto the DrawerContent host (the drawer's bounding box is unchanged before/after the inner overlay opens). | TEST-GAP | P1       | #6538    |

**Recommended test L6:** drawer containing a select/popover; open popover → DrawerContent computed `position` + bounding box unchanged before/after.

**Recommended action L6:** Add design note to `drawer/design.md` §10: transient overlays inside a drawer portal to document root and don't write position/layout onto DrawerContent host.

---

## C. Tabs

| #   | Property                                                                                                                                                                                                                                                       | Signal     | Severity | AMIS-REF                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| L7  | `value` (controlled) vs `defaultValue` (initial) semantics is unambiguous: numeric index and string key both resolve; `valueStatePath` writeback drives activation. No initial-vs-controlled confusion.                                                        | LOCK       | P0       | #6293, #5235, #2005                                                                                                 |
| L8  | When the scope array backing `items: "${expr}"` mutates, resolved items re-derive and the active tab auto-corrects via the candidate-fix rule (keep key → nearest right → nearest left → empty).                                                               | TEST-GAP   | P1       | #3199, #3250, #4214                                                                                                 |
| L9  | `mountOnEnter:true` tab containing a chart/data-source → switching to it fires the inner source load and renders (no blank); `unmountOnExit:true` tab → switch away and back re-initializes the inner form owner cleanly (no blank, no duplicate subscribers). | DESIGN-GAP | P1       | #3014, #2208                                                                                                        |
| L10 | Field `readOnly`/static metadata propagates identically whether the field is directly in a form or nested under a tabs region (tabs region is transparent to field-meta inheritance).                                                                          | TEST-GAP   | P2       | #6117 — **RESOLVED (B7)**: watch-only (readOnly metadata propagates through tabs region construct-true; P2 niche)   |
| L11 | A tabs content panel (esp. vertical/sidebar orientation) establishes a `min-width:0` / overflow context so wide inner content cannot expand the panel or push the TabsList.                                                                                    | TEST-GAP   | P2       | #5327 — **RESOLVED (B7)**: watch-only (tabs content-panel min-width:0/overflow context CSS construct-true; styling) |

**Recommended actions:**

- L8: Add design note to `tabs/design.md` §10: the candidate-fix rule must be covered when `items` is expression-bound, not only when static items change visibility.
- L9: Add design note to `tabs/design.md` §2 Decision: "`mountOnEnter`/`unmountOnExit` correctness includes inner-owner lifecycle init, covered by regression."
- L11: Add design note to `tabs/design.md` §15: tabs-content slot establishes `min-width:0`/overflow context.

**Recommended tests:**

- L7: 4 ownership/value combos (defaultValue only; value bound to expression; value as numeric index vs string key; `valueStatePath`).
- L8: `items: "${reports}"`; mutate `reports` (add/remove/reorder); if previously-active item removed → §10 fallback fires.
- L9: (a) `mountOnEnter:true` + chart/data-source → switch → inner source fires + renders; (b) `unmountOnExit:true` → switch away and back → inner form owner re-initializes cleanly.
- L10: form whose body is a tabs region; field `readOnly` at form level → field inside tab honors inherited read-only, same as sibling outside tabs.
- L11: vertical-orientation tabs with wide table body → table scrolls horizontally without pushing TabsList.

---

## D. Grid / Collapse / Card / Steps / Iframe

| #   | Property                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Signal     | Severity | AMIS-REF                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| L12 | **Narrowed** (Rule 1 + frozen `META_FIELDS.className` already guarantee className accepts `${expr}` universally — that is NOT the gap). The grid-specific residual is only: **column-level** conditional visibility/style driven by an expression must re-render reactively when the scope value flips (amis #11720 = grid `columnClassName` rejected expressions). One focused reactivity test; generic className-expr behavior belongs to styling-system, not grid. | TEST-GAP   | P3       | #11720 — **RESOLVED (B7)**: watch-only (grid column-level className-expr reactivity construct-true; narrowed by Flux-principles audit; styling) |
| L13 | A collapse/accordion's initial expanded state is a pure function of its own schema (`defaultOpen`/`activeKey`), independent of host/editor wrapping context.                                                                                                                                                                                                                                                                                                          | TEST-GAP   | P2       | #9056 — **RESOLVED (B7)**: watch-only (collapse initial-expanded-state independent of wrapping context construct-true; P2 niche)                |
| L14 | A card's media slot lets schema `className`/`classAliases` control image dimensions; the renderer does NOT emit fixed `width:auto`/`height:auto` that overrides author classes. (Card geometry only; for card selection/itemAction/media-url/mapping see `14-…md` CD1–CD6.)                                                                                                                                                                                           | DESIGN-GAP | P1       | #3348                                                                                                                                           |
| L15 | Steps `value`/`status` are scope-reactive (controlled ownership), not snapshot-at-mount.                                                                                                                                                                                                                                                                                                                                                                              | TEST-GAP   | P2       | #5070 — **RESOLVED (B7)**: watch-only (steps value/status scope-reactive not snapshot-at-mount construct-true; P2 niche)                        |
| L16 | An iframe's message listeners are added on mount and removed on unmount exactly once (no accumulation, no N×-fire on remount); messaging payloads are structured-clone-safe (non-cloneable values dropped/stringified, never `DataCloneError`).                                                                                                                                                                                                                       | TEST-GAP   | P1       | #5061, #6102, #4437                                                                                                                             |

**Recommended actions:**

- L12: NO design note (Rule 1 + styling-system cover className-expr); add ONE grid reactivity test only.
- L14: Add design note to `card/design.md`: card media image dimensions are author-controlled via `className`; renderer must not emit fixed `width`/`height:auto`.

**Recommended tests:**

- L12: grid column `className` bound to an expression (e.g. conditional `hidden`) → flipping the scope value re-renders the column visibility/style.
- L13: identical collapse schema rendered (a) bare, (b) inside a region/editor wrapper → identical initial expanded state.
- L14: card media with `className:"w-60 h-48 object-cover"` → computed width/height match author classes, not auto.
- L15: steps with `value:"${currentStep}"` + per-step status from scope; mutate scope → activation + status badges update.
- L16: iframe with message listener; mount → message → unmount → remount → message → handler fires exactly once per message; payload with non-cloneable value → no throw.

---

## Cross-Cutting: Lifecycle Teardown (shared with chart #4037, iframe #5061, dialog #6390)

These three are the same property family: a renderer that owns a runtime resource (scope/listener/timer) must release it on unmount. Flux asserts this in design docs but has no stated regression gate. A shared test pattern (mount-heavy-owner → close/unmount → assert no retained scope/listener/timer) covers all of them — see `README.md` Cross-Cutting Theme #1.

---

## Highest-Leverage Items

1. **L1** — dialog/surface GC regression (amis #6390 crashed pages after long sessions).
2. **L7** — tabs controlled-vs-default value (amis regressed this across 3 versions).
3. **L9** — mountOnEnter/unmountOnExit inner-owner lifecycle init (highest-value tabs signal).
4. **L14** — card media hardcoded geometry (direct styling-system violation).
5. **L16** — iframe listener accumulation + clone-safe payloads (catastrophic when it fails).
