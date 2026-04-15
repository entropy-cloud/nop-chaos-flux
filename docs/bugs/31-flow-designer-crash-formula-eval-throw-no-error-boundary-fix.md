# 31 Flow Designer Page Crash and E2E Timeout — Formula Eval Throw + No Error Boundary

## Problem

- Navigating to the Flow Designer page in Playwright e2e tests caused the entire React tree to crash: `#root` became empty, no DOM rendered
- All e2e tests waiting for `.react-flow__node` timed out after 15 seconds; running in parallel made the full suite appear to hang for minutes
- Additionally, several spec files also failed immediately on page load due to a Playwright strict-mode violation on the navigation button

## Diagnostic Method

- Initial hypothesis: layout issue (ReactFlow Error 004 — width/height is 0). Checked `getComputedStyle` on canvas container chain. Dismissed: containers all had correct dimensions once the page actually rendered.
- Second hypothesis: Playwright button locator was wrong. Confirmed: `page.getByRole('button', { name: 'Flow Designer' })` matched 2 buttons on the home page ("Visual Workflow Flow Designer" and "Style Prototype DingTalk Flow Designer"), triggering strict-mode failure in 7 spec files.
- Decisive evidence: after fixing the locator, ran a minimal diagnostic test with `page.goto('/#/flow-designer')` + 5s wait + `document.getElementById('root').innerHTML`. The root div was **empty** — React had unmounted everything.
- Console inspection revealed `[pageerror] Cannot access member of null or undefined` with a stack trace originating from `packages/flux-formula/src/evaluator.ts:200` (`evaluateMemberTarget`) propagating through `compile.ts exec()` into `NodeRendererResolved`.
- Confirmed: React warning "An error occurred in the `<NodeRendererResolved>` component. Consider adding an error boundary" matched the crash. No error boundary existed anywhere in the renderer tree.

## Root Cause

Two independent causes, both required for the full crash:

1. **`evaluateAst` re-throws after reporting**: when a formula expression like `${data.config.trigger}` evaluated with `data = null`, `evaluateMemberTarget` threw `"Cannot access member of null or undefined"`. `evaluateAst` called `reportError` then re-threw the same error. This propagated out of `compile.ts exec()` into the React render path.

2. **No error boundary on `NodeRendererResolved`**: the exception escaping from `exec()` during prop resolution inside `NodeRendererResolved` was not caught by any React error boundary. React unmounted the entire component tree from the root, leaving `#root` empty.

The schema expressions (`${data.config.trigger}`, `${data.config.result}`, etc.) are evaluated eagerly on all nodes including unselected inspector fields where `data` is null/undefined — this is expected during normal rendering and must not crash.

The Playwright locator issue was a separate but additive problem: `getByRole('button', { name: 'Flow Designer' })` matched two home-page cards, causing strict-mode failures before the page even loaded.

## Fix

- **`packages/flux-formula/src/compile.ts`**: wrapped `evaluateAst(...)` calls in both `compileExpression.exec()` and `compileTemplate.exec()` with try/catch. On error, `exec()` returns `undefined` / `''`. The error has already been reported via `reportError → env.monitor.onError` inside `evaluateAst` before it re-throws, so nothing is lost. `evaluateAst` itself is unchanged and still throws — it is a low-level primitive, not a renderer facade.

- **`packages/flux-react/src/node-error-boundary.tsx`** (new file): `NodeErrorBoundary` React class component implementing `getDerivedStateFromError` + `componentDidCatch`. Logs the error with node ID. Renders `null` on error, containing the failure to a single node.

- **`packages/flux-react/src/node-renderer.tsx`**: `NodeRenderer` now wraps `<NodeRendererResolved>` in `<NodeErrorBoundary nodeId={props.node.id}>`.

- **8 e2e spec files**: replaced `page.getByRole('button', { name: 'Flow Designer' })` with `page.locator('button', { hasText: 'Visual Workflow' })` to uniquely target the correct card.

- **`flow-designer-css-diag.spec.ts`, `tailwind-css-scan.spec.ts`**: removed hard `waitForTimeout(3000/2000)` sleeps, replaced with event-driven `expect(.react-flow__node).toHaveCount(6)` wait.

## Tests

- `packages/flux-formula/src/index.test.ts` — updated `"reports runtime expression errors through monitor.onError"`: now asserts `exec()` returns `undefined` and `onError` is called once (no longer expects `exec()` to throw)
- `packages/flux-formula/src/index.test.ts` — updated `"rejects unsupported migration syntax like AND/ABS/window/cookie access"`: `exec()` on unknown-function expressions now returns `undefined` instead of throwing
- `packages/flux-formula/src/evaluator.test.ts` — unchanged: `evaluateAst` still throws on invalid call targets (low-level contract preserved)
- `tests/e2e/flow-designer-css-diag.spec.ts` — all 6 layout/CSS diagnostic tests now pass (previously all timed out)
- `tests/e2e/flow-designer-collapsible.spec.ts`, `debug-collapsible*.spec.ts`, `node-title-subtitle-gap.spec.ts`, `tailwind-css-scan.spec.ts` — navigation fixed, all pass

## Affected Files

- `packages/flux-formula/src/compile.ts` — `exec()` now fault-tolerant
- `packages/flux-formula/src/index.test.ts` — updated test expectations
- `packages/flux-react/src/node-error-boundary.tsx` — new file
- `packages/flux-react/src/node-renderer.tsx` — wraps `NodeRendererResolved` in error boundary
- `tests/e2e/flow-designer-css-diag.spec.ts`
- `tests/e2e/tailwind-css-scan.spec.ts`
- `tests/e2e/flow-designer-collapsible.spec.ts`
- `tests/e2e/debug-collapsible.spec.ts`
- `tests/e2e/debug-collapsible2.spec.ts`
- `tests/e2e/debug-collapsible3.spec.ts`
- `tests/e2e/node-title-subtitle-gap.spec.ts`
- `tests/e2e/flow-designer-ui.spec.ts`

## Notes For Future Refactors

- `evaluateAst` intentionally still throws — it is a primitive. **Do not** wrap it in try/catch at the `evaluateAst` level. The fault-tolerance belongs at the renderer-facing `exec()` layer in `compile.ts`.
- Any new renderer component that evaluates formulas (directly or indirectly) during React render must either: (a) be wrapped in `NodeErrorBoundary`, or (b) ensure the evaluation path cannot throw into React's render pipeline.
- If a new `exec()` overload or entry point is added to the formula compiler, it must include the same try/catch pattern to remain fault-tolerant.
- The `NodeErrorBoundary` renders `null` on failure. If a failed node is a critical layout container, the page may look broken but will not crash. Consider surfacing an error placeholder if the node has `type: 'page'` or similar critical types.
