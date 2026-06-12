# 63 Condition Builder Conjunction Hover Selected Visual Lag Fix

## Problem

- In `condition-builder`, clicking the `AND` / `OR` conjunction pills appeared to respond slowly during manual testing.
- The selected state often looked delayed or ambiguous while the pointer remained over the clicked button.
- The smallest visible repro was: hover a conjunction pill, click it, then observe that the button could look close to the unselected state even though the logic had already switched.

## Diagnostic Method

- Diagnosis was non-obvious because the user-visible symptom looked like a state/store latency problem, but the interaction was also styled through layered button variants and hover classes.
- First inspection followed the data path: `condition-group.tsx` conjunction click -> `ConditionBuilderRenderer` field sync -> form runtime `setValue` -> subscribed rerender.
- Added a focused regression test at `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx` to verify two hypotheses:
  - whether pressed-state switching itself was delayed
  - whether one conjunction change caused excessive form store commits
- The diagnostic test showed the pressed state updated normally and a single conjunction change stayed within a bounded commit count, which rejected the store-latency hypothesis.
- Direct inspection of the button classes then confirmed the visual issue: selected pills still inherited `ghost` hover styling, and the component also applied its own color transition class, so hover/transition styling could visually wash out the active state.

## Root Cause

- The bug was in renderer-level visual state composition inside `packages/flux-renderers-form-advanced`, not in `flux-runtime` form state propagation.
- Selected conjunction pills used active classes such as `bg-primary`, but the underlying `ghost` button variant still contributed hover styles like `hover:bg-muted hover:text-foreground`.
- The extra `transition-colors` class on the conjunction pills amplified the perception of lag by animating the state change instead of snapping immediately to the selected appearance.

## Fix

- Removed conjunction pill color transition in `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` by switching from `transition-colors` to `transition-none`.
- Added explicit selected hover classes for active conjunction pills so hover preserves the selected look: `hover:bg-primary hover:text-primary-foreground`.
- This keeps the visual state aligned with the already-correct logical state, even while the pointer remains on the selected button.

## Tests

- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx` - verifies pressed state switches correctly after click.
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx` - verifies a single conjunction change stays within a bounded number of form store commits.
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx` - verifies conjunction pills do not carry color transition classes.
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx` - verifies selected conjunction pills keep selected hover styling.

## Affected Files

- `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-latency.test.tsx`
- `docs/testing/2026/06-12.md`

## Notes For Future Refactors

- When composing local active-state classes on top of shared `@nop-chaos/ui` button variants, always check whether variant-level hover styles can override or visually dilute the active state.
- If an interaction is reported as “slow”, verify store commits and pressed-state updates before changing runtime code; visual transitions can easily masquerade as latency bugs.
- For compact toggle/pill controls, selected-state styling should usually snap immediately instead of animating color changes unless the interaction specifically benefits from motion.
