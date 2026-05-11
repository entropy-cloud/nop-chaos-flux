# 51 `structuralWhen` Compiler-Runtime-React Handoff Contract Fix

## Problem

- `TemplateNode.structuralWhen` was documented and compiled, but the live runtime (`packages/flux-runtime/src/node-runtime.ts`) did not actually consume it for render gating. Instead, the runtime fell through to `meta.when` in all cases.
- This meant nodes with `when: false` at the schema level could still render if `structuralWhen` was supposed to gate them but was never evaluated.
- The handoff gap was invisible because no test exercised the full path: schema `when` → compiled `structuralWhen` → runtime evaluation → React render gating.

## Diagnostic Method

- Discovered during the plan-248 contract closure audit, which traced `structuralWhen` from compiler output through runtime consumption to React rendering.
- The audit found that `node-runtime.ts` `resolveNodeMeta` evaluated `meta.when` directly and ignored `node.structuralWhen`.
- `schema-renderer-runtime-monitoring.test.tsx` already had a test named `consumes templateNode.structuralWhen for render gating`, but it only proved that a node with `when: false` did not render — it could not distinguish whether `structuralWhen` or `meta.when` was doing the gating, since both had the same value.
- The decisive evidence: reading `node-runtime.ts` showed `meta.when` was the only source used, and `structuralWhen` was not referenced.

## Root Cause

- `packages/flux-runtime/src/node-runtime.ts` did not check `node.structuralWhen` before falling through to `meta.when`. The compiled field existed on `TemplateNode` but was a dead field in the runtime evaluation path.
- The compiler/runtime boundary had a documented contract that was not enforced by code.

## Fix

- Modified `resolveNodeMeta` in `packages/flux-runtime/src/node-runtime.ts` to prefer `node.structuralWhen` when it is defined (`!== undefined`), and only evaluate `meta.when` as fallback.
- The resolved `when` value now uses the `structuralWhen` result: `when: Boolean(structuralWhen ?? true)`.
- The existing test in `schema-renderer-runtime-monitoring.test.tsx` now exercises the actual `structuralWhen` path because the runtime genuinely consumes it.

## Tests

- `packages/flux-react/src/__tests__/schema-renderer-runtime-monitoring.test.tsx` — `consumes templateNode.structuralWhen for render gating instead of relying on meta.when` verifies that a node with `when: false` does not render through the structural gating path.

## Affected Files

- `packages/flux-runtime/src/node-runtime.ts`
- `packages/flux-react/src/__tests__/schema-renderer-runtime-monitoring.test.tsx`

## Notes For Future Refactors

- `structuralWhen` is now a live supported contract: if the compiler produces it, the runtime will consume it. Do not remove the `node.structuralWhen` branch in `resolveNodeMeta` without also updating the compiler and docs.
- When adding new compiled fields to `TemplateNode`, always verify the runtime consumption point exists — a field that is compiled but never read is a silent contract gap.
- The `when` resolution in `resolveNodeMeta` has a two-level precedence: `structuralWhen` (compiled structural gate) > `meta.when` (dynamic expression). This ordering is intentional and should be preserved.
