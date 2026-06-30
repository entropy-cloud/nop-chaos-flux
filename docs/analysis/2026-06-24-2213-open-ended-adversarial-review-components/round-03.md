# Round 03 — cross-boundary i18n injection contract is unwired (a11y chrome stuck on English)

> Execution: `2026-06-24-2213-open-ended-adversarial-review-components`
> Lens: _cross-boundary messenger_ + _dead-code scavenger_.

---

## R3-1 — The `@nop-chaos/ui` → `@nop-chaos/flux-i18n` injection bridge (`setI18nGetter`) is never wired; 18 a11y-critical UI strings are permanently English

- **Where**:
  - Bridge definition: `packages/ui/src/lib/i18n.ts:37-47` — `t()` calls the injected getter (`getUiI18nBridge().getter?.(key)`), then falls back to the hardcoded English `messages` map (`:1-17`), then the raw key.
  - Consumers: 18 `t('flux.*')` call sites in `ui` components — `carousel.tsx:125,191,221`, `sidebar-layout.tsx:61,62,135`, `sheet.tsx:75`, `breadcrumb.tsx:91`, `dialog.tsx:182,192,260,261,300`, `drawer.tsx:188,204`, `pagination.tsx:59,77,105`. The vast majority feed **`aria-label` / `aria-roledescription` / `sr-only`** text (e.g. `flux.dialog.moveDialogInstructions`, `flux.drawer.resize`, `flux.pagination.morePages`, `flux.sidebar.toggle`).
  - Claimed wiring (absent): `docs/logs/2026/05-13.md:147` and `docs/archive/plans/262-…:142` state the bridge is wired via `setI18nGetter(fluxI18nT)` in `packages/flux-bundle/src/index.tsx`. Reading that file (74 lines): it imports only `flux-core`, `flux-formula`, `flux-react`, `flux-renderers-basic`, `flux-renderers-data`, `flux-renderers-form` — **never `@nop-chaos/ui`, never `@nop-chaos/flux-i18n`, never `setI18nGetter`**. A repo-wide grep for `setI18nGetter` returns only the `ui` definition + export + test + docs — **zero production call sites**. (`apps/playground` does not call it either.)
  - Prior notice: `docs/archive/analysis/2026-05-19-deep-audit-full/18-cross-package.md:23` already recorded "仓库未见 flux-i18n 注入 setI18nGetter" — i.e. a deep-audit flagged this on 2026-05-19 and it was never remediated.
- **What**: The dependency-injection seam that lets the zero-`@nop-chaos/*`-dep `ui` package localize its chrome through the active `flux-i18n` instance is dead infrastructure. Every `ui`-component `t('flux.*')` resolves to the English entry in the internal `messages` map, regardless of the host locale. Renderer packages (`flux-renderers-*`) localize correctly because they import `t` from `@nop-chaos/flux-i18n` directly (e.g. `chart-renderer.tsx:25`); only the `ui`-package chrome is stuck.
- **Why it matters**:
  1. **Accessibility, not cosmetics**: the affected strings are predominantly screen-reader announcements and control labels. Non-English-locale users (and the WCAG language-of-page expectation) get English a11y chrome for dialogs/drawers/carousels/pagination/sidebars.
  2. **Doc↔code contradiction**: two log/plan entries assert the wiring is done; it isn't. Anyone trusting the logs will assume UI chrome is localized.
  3. **Live, previously-flagged defect**: this is not new to this audit — it was recorded 2026-05-19 and left open. It qualifies as a _live residual_, not a duplicate.
- **Confidence**: Certain (verified: no call site exists; consumers confirmed; English-only fallback confirmed).

---

## Round 3 overall

A clean cross-boundary finding: the `ui` package's deliberate DI seam (to stay zero-dep) was designed and "completed" on paper but never actually wired, leaving its a11y chrome un-localizable. Combined with R1/R2, the audit now spans correctness (table/chart/list/array-field), contract honesty (H1), lifecycle (drawer/dialog), a11y (Card/Carousel/Sidebar + this), and i18n — five distinct defect domains across four packages.

## Blind-spot self-assessment (cumulative)

- `flux-renderers-basic` structural renderers (`loop`, `recurse`, `fragment`, `container`, `page`, `dynamic-renderer`) were not body-audited; template-instantiation/identity edge cases there are a known historical bug source (see `docs/architecture/template-instantiation-and-node-identity.md`) and remain a candidate for a focused round.
- The `condition-builder` a11y (keyboard reorder, focus management) and `transfer`/`picker` keyboard semantics were not audited.
