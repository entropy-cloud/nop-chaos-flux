# 58 Custom Field Compile Failure Surface Fix

## Problem

- custom renderer fields using `SchemaFieldRule.compile` could throw during compilation in `packages/flux-compiler`
- the compiler emitted a diagnostic but silently dropped the offending field from `compiledPropEntries`
- strict callers did not get a real compile failure, and tolerant callers rendered the real node with a corrupted prop shape

## Diagnostic Method

- started from adversarial-review Finding 5, which reported a mismatch between diagnostics and runtime-visible behavior
- re-read `packages/flux-compiler/src/schema-compiler/node-compiler.ts` around the custom field compile branch and compared it with unknown-renderer `continueOnError` handling
- rejected a field-level sentinel fallback because it still lets the real renderer execute with a dishonest partial prop bag
- confirmed the root cause by tracing the catch block: it emitted `invalid-schema` and then continued, leaving no compiled entry for the original field key

## Root Cause

- `SchemaFieldRule.compile` errors were treated as recoverable diagnostics without adjudicating what the compiled node should become afterward
- the fallback behavior happened at the field level, so the compiler preserved the original node instead of replacing it with an explicit failure surface

## Fix

- strict compilation now rethrows custom field compilation failures as real compile failures in `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- tolerant `continueOnError` compilation now replaces the current node with an explicit synthetic compile-failure renderer instead of rendering the original renderer with a missing field
- the failure surface preserves the original schema type in props so the runtime-visible fallback is honest about which node failed

## Tests

- `packages/flux-compiler/src/schema-compiler-renderer-contracts.test.ts` - verifies strict mode throws and tolerant mode produces an explicit compile-failure surface for a throwing custom field compiler

## Affected Files

- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- `packages/flux-compiler/src/schema-compiler-renderer-contracts.test.ts`
- `docs/architecture/field-metadata-slot-modeling.md`

## Notes For Future Refactors

- do not swallow `SchemaFieldRule.compile` exceptions back into field deletion unless the node-level fallback contract is explicitly redesigned
- `continueOnError` may keep compilation moving, but it must still produce an honest replacement surface when the original renderer contract is no longer valid
