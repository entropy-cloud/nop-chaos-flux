# Conformance Audit 03: Runtime Boundary and Remediation Plan

Date: 2026-03-29

## Baseline Document

- `docs/architecture/flux-runtime-module-boundaries.md`

## Finding

### `flux-runtime` entry file owns non-trivial behavior

Severity: Medium

Requirement summary:

- `packages/flux-runtime/src/index.ts` should remain primarily an assembly layer.
- Non-trivial behavior should live in focused modules.

Evidence:

- `packages/flux-runtime/src/index.ts:110` defines async validation execution helper.
- `packages/flux-runtime/src/index.ts:188` defines AJAX action execution logic.
- `packages/flux-runtime/src/index.ts:205` defines generic evaluate helper.

Impact:

- Entry-file growth raises regression risk and hampers module ownership clarity.
- Contradicts the package-boundary guidance and increases refactor friction.

## Proposed Refactor Direction

### Step 1 (safe extraction)

- Move `executeValidationRule` and API shaping logic into a dedicated validation-action adapter module.
- Move `executeAjaxAction` into request-action adapter module.
- Keep `index.ts` as dependency wiring and runtime factory assembly.

### Step 2 (contract hardening)

- Expose internal interfaces for extracted module inputs (compiler/env/executor).
- Add unit tests around extracted modules independent of full runtime creation.

### Step 3 (policy guardrail)

- Add a lightweight contributor rule in docs: non-trivial logic should not be introduced in runtime entry files.

## Cross-Document Execution Priority

1. P0: Align theme and action naming contracts in docs first.
2. P1: Resolve high-severity behavior drift (validation `change` trigger semantics).
3. P1: Extract runtime entry non-trivial logic.
4. P2: Complete styling-contract cleanup and marker-system tightening.

## Verification Checklist for Refactor PR

- Typecheck passes.
- Build passes.
- Lint passes.
- Runtime action and validation tests cover extracted modules.
- No behavior delta in public runtime API.
