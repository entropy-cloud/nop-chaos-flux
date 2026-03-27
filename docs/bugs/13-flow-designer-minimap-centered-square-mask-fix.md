# 13 Flow Designer Minimap Centered Square Mask Fix

## Problem

- Flow Designer minimap still showed a centered square artifact even after color tuning.
- Expected visual model was: gray panel background + white viewport mask + dark node blocks.
- Observed runtime result was a visible inner square block that did not match the rounded minimap shell.

## Diagnostic Method

- Diagnosis difficulty: the issue looked like a CSS padding/radius mismatch, but the artifact persisted after color and spacing updates.
- Investigation path:
  - inspected runtime minimap DOM/SVG output from browser (`panel`, `svg`, `viewBox`, `mask path`)
  - compared minimap shell sizing and `svg` world bounds behavior with rendered `viewBox`
- Rejected hypotheses:
  - pure panel padding issue (padding was already zero)
  - simple background token mismatch only (colors aligned but centered square remained)
- Decisive evidence:
  - runtime DOM showed minimap `viewBox` derived from world bounds while panel used fixed card ratio
  - mask outer rectangle was rendered in centered fit mode, producing visible square-block artifact in the card center

## Root Cause

- XYFlow minimap SVG world bounds (`viewBox`) and panel viewport aspect ratio diverged.
- Default SVG aspect-ratio behavior caused mask/background to be centered-fit into the minimap panel.
- That centered-fit behavior exposed the inner square region as a distinct block inside the rounded shell.

## Fix

- Kept minimap shell and inner SVG on unified gray background token.
- Enforced full-bleed minimap rendering and deterministic box sizing in panel styles.
- Set minimap SVG `preserveAspectRatio="none"` after render so mask/background map to panel bounds instead of centered world-box fit.
- Retained prototype-aligned mask/node tokens: white semi-transparent mask + dark node blocks.

## Tests

- `tests/e2e/flow-designer-ui.spec.ts` - validates minimap dimensions/anchor and background token expectations.
- `pnpm.cmd --filter @nop-chaos/flow-designer-renderers lint` - renderer package lint check.
- `pnpm.cmd test:e2e --reporter=line` - visual parity regression check (`2 passed`).

## Affected Files

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
- `packages/flow-designer-renderers/src/styles.css`
- `tests/e2e/flow-designer-ui.spec.ts`

## Notes For Future Refactors

- For minimap issues, inspect runtime `viewBox`/mask path first; do not assume padding is the primary cause.
- Keep shell ratio and SVG mapping strategy explicit; implicit SVG aspect behavior can reintroduce centered artifacts.
- Use DOM evidence (panel style + SVG attributes + mask path) as the primary diagnosis chain for minimap visual bugs.
