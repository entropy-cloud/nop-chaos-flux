# Open-Ended Adversarial Review — 2026-05-20 — Round 03

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: `flux-compiler` shape validation, lifecycle actions, renderer prop contracts, reaction schema
**Discovery source**: compile/validate/runtime semantic-drift review, avoiding already reported action `when`/`onSettled` branch gaps

---

## Finding 1: lifecycle actions compile and run, but shape validation never validates them

- **Where**:
  - `packages/flux-core/src/types/schema.ts:26-45`
  - `packages/flux-compiler/src/schema-compiler/fields.ts:27-42`
  - `packages/flux-compiler/src/schema-compiler/target-enrichment.ts:39-53`
  - `packages/flux-compiler/src/schema-compiler/node-compiler.ts:139-215,397-425`
  - `packages/flux-compiler/src/schema-compiler-contract-exploration-part2.test.ts:262-286`
- **What**: `BaseSchema` exposes `onMount` and `onUnmount` as `ActionSchema | ActionSchema[]`. The compiler explicitly extracts them and compiles them into `TemplateNode.lifecycleActions`, so they are first-class executable lifecycle actions. During shape validation, however, `classifyField()` marks the same keys as `ignored` so they do not go through the normal `rule.kind === 'event'` path and never call `validateActionShape()`. Existing exploration tests only assert that lifecycle keys do not become unknown properties; they do not assert invalid lifecycle action shapes are rejected.
- **Why it matters**: schemas such as `onMount: 'not-an-action'` can validate cleanly but still compile into a lifecycle action node with `action: undefined`, because `compileActions()` assumes an `ActionSchema` and reads `action.action` directly. The author gets no compile-time diagnostic at the lifecycle boundary, and the failure is pushed into runtime dispatch or monitoring.
- **Confidence**: High. The classification/validation/compilation paths are explicit, and the existing tests lock only the "not unknown" behavior, not action-shape validation.
- **Non-duplication note**: this is not the previously reported action `when` or `onSettled` branch validation gap. It is a separate top-level lifecycle-action channel that bypasses action shape validation entirely.

---

## Finding 2: `RendererPropContract.required` is documented as parse/validate semantics but is not enforced by schema validation

- **Where**:
  - `packages/flux-core/src/types/renderer-core.ts:223-230`
  - `docs/architecture/renderer-runtime.md:334-339`
  - `docs/architecture/complex-control-host-protocol.md:202-205`
  - `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:38-65,141-233`
  - `packages/flow-designer-renderers/src/renderer-definitions.ts:183-189`
  - `packages/report-designer-renderers/src/renderers.tsx:188-200`
  - `packages/spreadsheet-renderers/src/renderers.tsx:30-35`
  - `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts:116-124`
- **What**: `RendererPropContract` has `required?: boolean`, and architecture docs state `shape / required / defaultValue` belong to authored schema semantics and parse/validate boundaries. Live renderer definitions use `required: true` for host-critical props such as Flow Designer `config`, Report Designer `document/config`, and Spreadsheet `document`. But `validateKnownPropValue()` only validates a contract when the property is present; missing properties are skipped. The exploration test named "validates missing required props" currently expects no diagnostics for a missing required-like prop.
- **Why it matters**: static contracts can advertise required authored props while `compiler.validate()` still accepts schemas that omit them. That creates a three-way split: tooling/metadata says the prop is required, docs say required belongs to validation semantics, but validation/runtime still allow omission and rely on renderer-local fallback or error UI.
- **Confidence**: High. Required metadata is present in public renderer definitions, and there is no pass over `renderer.propContracts` that emits a missing-field diagnostic for absent required keys.
- **Non-duplication note**: prior reports identified individual public type/runtime required-contract drifts for specific complex controls. This finding is the shared compiler root cause: `RendererPropContract.required` is not implemented as a schema validation rule anywhere.

---

## Finding 3: `reaction` validates only `actions`; invalid `watch` and control fields can validate, compile, and then silently degrade at runtime

- **Where**:
  - `packages/flux-core/src/types/schema.ts:204-213`
  - `docs/architecture/api-data-source.md:901-924`
  - `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:283-296`
  - `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:306-314`
  - `packages/flux-compiler/src/reaction-compiler.ts:19-30,49-88`
  - `packages/flux-runtime/src/async-data/reaction-runtime.ts:92-107,392-435`
- **What**: `ReactionSchema` and the active architecture require `watch` and `actions`, with `immediate`/`debounce`/`once` typed as boolean/number/boolean. The renderer definition lists these fields as props, but shape validation has only a special case for `schema.actions`; it does not require `watch`, validate `watch` shape, or validate the control fields. The compiler then converts a missing or non-string/non-array `watch` to `''`, compiles it as a static value, and passes `immediate`, `debounce`, and `once` through unchanged.
- **Why it matters**: a malformed reaction can pass validation and become a silent no-op or oddly scheduled watcher. For example, missing `watch` compiles to a static empty template and will not observe the intended dependency graph; a string `debounce` or truthy non-boolean `immediate` can alter runtime scheduling because runtime checks `debounceSource > 0` and `if (immediateSource)` without a prior shape guarantee.
- **Confidence**: High. Current tests validate only bad `actions` shape; the special-case validation block does not inspect the other `ReactionSchema` fields.
- **Non-duplication note**: this is not the earlier validation BFS performance issue, not the reaction runtime failure cursor issue, and not the action branch shape gap. It is a compile/validate semantic split for the reaction schema itself.

## Round Assessment

This round exposes a recurring compiler pattern: **special-case schema fields are executable enough to compile, but not always authoring-validated enough to fail early**.

- lifecycle actions were made non-events to keep them out of `eventPlans`, but no replacement validation path was added;
- prop-contract `required` exists as public authoring metadata, but validation only checks present values;
- reaction is treated as a real runtime node, but validation only protects its action body.

Immediate improvement direction: every field class that has a custom compile/runtime path should have an explicit companion validate path. In practice this likely means lifecycle-specific `validateActionShape()` calls, a pass over missing `propContracts.required`, and a `validateReactionShape()` alongside `validateSourceShape()`.

## Blind-Spot Self-Assessment

This round did not execute a runtime repro schema or add regression tests. It also did not inspect every custom field compiler such as `designer-page.config` or deep table/variant transforms for similar validate/compile split. The strongest next continuation would be to inventory custom `SchemaFieldRule.compile` and renderer `schemaValidator` paths for the same missing counterpart validation.
