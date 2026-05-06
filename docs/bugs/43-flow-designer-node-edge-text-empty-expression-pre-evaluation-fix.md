# 43 Flow Designer Node/Edge Text Empty — Config Expression Pre-Evaluation

## Problem

- Flow designer nodes rendered with empty titles and subtitles; edge labels were also blank
- Expressions like `${label}`, `${description}`, `${condition}` in nodeType/edgeType template schemas resolved to empty strings instead of their intended values
- The designer canvas was visually broken: all nodes showed no text content

## Diagnostic Method

### Why the bug was hard to spot initially

- **Silent data corruption**: `compileValue()` replaces expression strings with `undefined` during compilation, but never logs or warns. The compiled output looks structurally normal — the `body` key is still there, just with value `undefined` instead of `"${label}"`. There is no runtime error, only empty rendered text
- **Unit tests bypass the compilation pipeline**: tests create config objects directly and pass them to renderers, skipping `schema-compiler` entirely. 84 unit tests all passed, creating false confidence that the rendering pipeline was correct. The bug was upstream of what unit tests cover
- **Symptom looks like a renderer bug**: nodes showing empty text suggests a rendering or bindings issue, not a compilation issue. The natural first instinct is to check the renderer code and scope bindings, not the compiler
- **Edge labels recovered after bindings fix, creating a false lead**: fixing the bindings spread made edge labels work, which suggested the problem was partially solved. But node text remained empty because the root cause was different — edge expressions referenced data that existed at edge render scope, while node expressions were already destroyed by pre-evaluation before reaching the renderer

### Investigation path

1. **Bindings layer**: checked `designer-xyflow-edge.tsx` and `designer-xyflow-node.tsx` — found missing `props.data` and `config` spreads. Fixed. Edge labels recovered, node text still empty → bindings were a real but partial issue
2. **Unit tests**: wrote 84 tests covering `RenderNodes`, fragment bindings, expression evaluation — all passed. The contradiction between passing tests and failing playground pointed to the compilation pipeline as the real culprit
3. **E2e diagnostic**: added a test that dumps actual DOM (`page.evaluate` → `document.querySelectorAll('.nop-text')`) from the playground. Confirmed `nop-text` elements existed but had empty content — expressions were gone before rendering
4. **Pipeline trace**: traced `config` backward from `DesignerPageRenderer` → `props.props['config']` → `compileSingleNode` in `schema-compiler.ts` → `expressionCompiler.compileValue()`. Found that `compileValue` recursively walks all plain objects, including the nested nodeType schemas inside `config`, evaluating `${label}` at page scope where `label` is undefined
5. **Direct evidence**: added temporary log at `compileValue` entry comparing config before/after evaluation. Confirmed `${label}"` was replaced with `undefined` in the compiled output

## Root Cause

- `designer-page` schema declares `config` as a `prop` field. During page-level schema compilation, `compileSingleNode` passes all prop values through `expressionCompiler.compileValue()`
- `compileValue()` recursively walks plain objects. When it encounters the nested nodeType template schemas inside `config`, it evaluates `${label}`, `${description}`, etc. at the page scope — where these variables don't exist
- The evaluation result (`undefined`) replaces the original expression string in the compiled config. When the node renderer later tries to render the template, the expression is already gone
- This is a fundamental conflict: `config` contains nested schemas that define their own expression scopes at render time, but the page-level compiler treats them as ordinary string values to evaluate immediately

## Fix

- `DesignerPageRenderer` (`packages/flow-designer-renderers/src/designer-page.tsx:121-123`) now reads `config` from `meta.templateNode.schema` (the original, uncompiled schema) instead of `props.props['config']` (the expression-evaluated version)
- This bypasses the page-level expression evaluation for `config` entirely, preserving the template expressions for later evaluation at the correct scope (node/edge render time)
- Also fixed edge/node bindings in `designer-xyflow-edge.tsx` and `designer-xyflow-node.tsx` to spread nested data into top-level scope

## Tests

- `tests/e2e/flow-designer-label-text.spec.ts` — 6 e2e tests verifying node titles, subtitles, and edge labels render correctly with expression evaluation
- `packages/flow-designer-renderers/src/__tests__/` — 84 unit tests covering the flow designer rendering pipeline (no regressions)

## Affected Files

- `packages/flow-designer-renderers/src/designer-page.tsx` — config read from uncompiled schema
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx` — bindings spread
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx` — bindings spread

## Notes For Future Refactors

- Any prop that contains nested template schemas (not just `config`) must not be passed through `compileValue()` at the parent scope. If a new "schema-within-a-prop" pattern appears, the same fix pattern applies: read from `meta.templateNode.schema` instead of the evaluated props
- The `classifyField` system in `packages/flux-compiler/src/schema-compiler/fields.ts` could be extended with a `template` field kind that skips expression evaluation, which would be a more general solution than per-renderer workarounds
- Unit tests alone cannot catch this class of bug because they typically create config objects that bypass the page-level compilation pipeline. E2e or integration-level tests are necessary
