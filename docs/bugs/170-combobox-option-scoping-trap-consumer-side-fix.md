# 170 Combobox Option Scoping Trap (consumer-side defect, not a flux defect)

## Problem

- Downstream e2e (`nop-entropy-e2e`, via `nop-chaos-next`'s `FluxAdapter`) could not select
  options in a `select` field: the click landed on nothing, `data-open` stayed closed, and the
  helper eventually threw `flux 组合框选择失败`.
- Surface symptom looked like "the combobox does not respond to clicks in the browser".
- **No flux defect was found.** Every flux-side behavior checked was correct — see
  _Flux-side verification_ below.

## Diagnostic Method

- Difficulty: the failure was in a downstream consumer, and the first three hypotheses were all
  wrong. Two of them were asserted as fact before being tested, which sent the investigation down
  wrong paths twice.
- Rejected hypotheses, in order:
  1. _Base UI combobox items need real pointer events, so `el.click()` cannot select._ Read
     `ComboboxItem.js` — `onClick` calls `commitSelection` directly. Then measured it: after a
     native `el.click()` the trigger read `test-测试执行器` and the popup closed. Hypothesis wrong.
  2. _Closed popups are missing `aria-hidden`/`inert`, so they leak into the accessibility tree._
     Measured: closed popups are `display:block; visibility:visible; pointer-events:none` at 0×0 —
     `aria-hidden`/`inert` absent, which looked conclusive. But `ariaSnapshot()` showed **no
     `option` rows** for closed popups and `getByRole('option')` matched nothing, so they are in
     fact excluded. Hypothesis wrong.
  3. _`:not([data-closed])` is a valid way to find the open popup._ Measured per-field option
     counts: `:not([data-closed])` → `[3,4,1,4]`, `[data-open]` → `[3,4,5,4]` (the true counts).
     A never-opened popup carries **neither** attribute, so it matches `:not([data-closed])`.
- Decisive evidence: the measured per-field option counts above, plus the fact that
  `[data-slot="combobox-content"][data-open]` — an attribute Base UI already emits — isolates the
  open popup exactly.

## Root Cause

- The consumer scoped options by a bare `[data-slot="combobox-item"]` (or a `.first()` of it).
  Closed popups keep their options mounted in a real browser (the exit-animation layer retains
  them), and the popup of a field that has never been opened is mounted too, so that query returns
  options belonging to **every** select on the page.
- Secondary contributor: `renderer-markers-and-selectors.md` documented
  `[data-slot="combobox-item"][data-value=...]` as the way to locate an option **without** saying
  it must be scoped to the open popup. A consumer following the doc literally gets cross-field
  matches.

## Fix

- Flux side — no product code change; the contract already existed but was under-documented.
  `docs/architecture/renderer-markers-and-selectors.md` now records
  `[data-slot="combobox-content"][data-open]` as the open-popup hook and restates the option hook
  as scoped to it, naming both traps.
- Consumer side: scope options through the open popup and keep only geometry-live items.

## Flux-side verification (all correct, no fix needed)

- native `el.click()` selects and closes the popup
- `aria-expanded` stays in sync on both trigger input and toggle button
- focus moves into the control on open and returns to it on `Escape`; `ArrowDown` opens it
- closed popups are excluded from the accessibility tree (`ariaSnapshot` / `getByRole`)
- closed popups already carry `pointer-events: none`
- `ComboboxPopup` genuinely does not set `aria-hidden`/`inert`, but the component still behaves
  correctly because of `role="presentation"` + zero-size + the modal focus trap

## Tests

- `packages/flux-renderers-form/src/__tests__/select-combobox-dom-contract.test.tsx` — freezes
  that `data-open` is absent when closed and present when open, and that scoping options by the
  open popup yields exactly the opened field's options (two fields, open→close→open).
- `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx` — select/combobox
  cases split out into the file above (see _Affected Files_).

## Affected Files

- `docs/architecture/renderer-markers-and-selectors.md`
- `packages/flux-renderers-form/src/__tests__/select-combobox-dom-contract.test.tsx` (new, split from …)
- `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`
- (consumer, different repo) `packages/e2e-shared/src/FluxAdapter.ts`

## Notes For Future Refactors

- **Closed-popup DOM retention is not reproducible in jsdom.** Base UI unmounts the popup on close
  there; only the real browser (exit-animation layer) keeps the options. An assertion like
  "closed popup options are still in the DOM" passes nowhere and fails in jsdom — assert the
  scoping invariant instead, and keep the browser-only behavior documented, not unit-tested.
- While the popup is open it is modal, so sibling fields are not accessible: a test cannot open two
  selects without closing the first.
- Do not "fix" consumer selectors by adding `data-open` to `combobox-item`. The option is already
  inside the popup; scoping through the popup is the contract.
