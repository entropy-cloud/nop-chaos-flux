# 13 Mobile / Responsive — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/mobile-roadmap.md` (mobile = responsive same-component-same-props via Tailwind breakpoints + runtime branches; NOT separate mobile components; NO `mobileUI` flag)
> amis cluster: `mobile` (8 issues)
> Priority summary: Flux explicitly rejects amis's `mobileUI` dual-implementation model. Most amis mobile issues are amis-specific (iconfont sprite, amfe-flexible rem conflict, SDK packaging). The single real risk is that Flux's runtime mobile branches (`useIsMobile()`) must be live-viewport-reactive, not captured once at mount.
> Triage: 8 issues (all read) → 2 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis mobile designs Flux rejects)

| amis feature                                          | Reason rejected                                                  | AMIS-REF        |
| ----------------------------------------------------- | ---------------------------------------------------------------- | --------------- |
| `mobileUI` / `useMobileUI` flag + dual implementation | Flux uses responsive same-component-same-props; no mobileUI flag | #5615, #1740    |
| Separate mobile component set                         | Flux mobile = responsive adaptation of the same components       | (whole cluster) |
| amis app mode / closable multi-tab shell              | Host/navigation-layer responsibility (flagged only)              | #6005           |

---

## A. Runtime Mobile Branch Reactivity

| #   | Property                                                                                                                                                                                                                                                                                           | Signal     | Severity | AMIS-REF     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------ |
| M1  | Runtime mobile branches (`useIsMobile()` / equivalent) MUST be reactive to **live** viewport/container width (resize / `ResizeObserver`), matching the CSS breakpoint semantics — NOT captured once at mount. CSS-media-query-driven styling is already immune; the runtime branches are the risk. | DESIGN-GAP | P1       | #1740, #4835 |

**Recommended action M1:** Add design note to `mobile-roadmap.md` / mobile-responsive-baseline: runtime mobile branches (`useIsMobile`) MUST be reactive to live viewport/container width, matching CSS breakpoint semantics.

**Recommended test M1:** render at wide viewport, resize narrow → runtime branch flips (bottom-sheet renders) without reload (the #1740 regression test).

---

## B. App / Navigation (flagged, low-priority)

| #   | Property                                                                                                                                                                                            | Signal     | Severity | AMIS-REF                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M2  | Whether Flux's app/page model supports a multi-tab keep-alive shell (closable tabs), and if so the schema shape (page region + cached surfaces). Flagged for product decision — not a renderer gap. | DESIGN-GAP | P3       | #6005 — **RESOLVED (B7)**: out-of-scope-feature (multi-tab keep-alive shell is an app-shell feature; Flux has no app shell/keep-alive shell) |

**Recommended action M2:** Add low-pri design note to `page/design.md` or a navigation doc: decide multi-tab keep-alive shell support + schema shape if targeting admin shells.

---

## Highest-Leverage Items

1. **M1** — runtime mobile branches live-viewport-reactive (the one real risk given Flux's `useIsMobile` branches; amis captured width at mount).
