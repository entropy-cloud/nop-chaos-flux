# Security Design Requirements

## Purpose

Define mandatory security boundaries for Flux runtime and renderer-related packages.

This is a normative design requirements document.

## Source Basis

- `docs/articles/flux-design-introduction.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/api-data-source.md`

## Security Boundary Principles

1. Layered responsibility is mandatory.

- Platform layer handles i18n, permission pruning, module composition.
- Renderer/runtime layer handles schema compilation, scope, action dispatch, rendering coordination.

2. Permission is not a renderer runtime responsibility.

- Runtime must not evaluate permission expressions.
- Runtime must not decide access control by local condition checks.
- Input schema is expected to be pre-pruned by upstream platform policy.

3. Dynamic code execution is forbidden in first-party source.

- Do not use `new Function`.
- Do not use `eval`.
- Do not rely on `with(scope)` style execution.

4. Expression execution must use approved compiler/evaluator paths.

- Only use formula compiler/evaluator abstractions already defined by architecture.
- Keep execution context explicit, narrow, and auditable.

5. Action namespace boundaries must remain explicit.

- Namespaced actions are resolved through action scope registration.
- Do not bypass scope resolution with global mutable registries.

6. Data flow must be explicit and minimally scoped.

- Prefer explicit includeScope/params/data shaping.
- Avoid implicit broad scope leakage to outbound requests.

## Mandatory Requirements

## R1. No runtime permission semantics

- Do not add new runtime fields that represent permission policy decisions.
- If legacy permission fields exist, treat migration/removal as prioritized architecture debt.

## R2. No dynamic code execution primitives

- Any introduction of `new Function` or `eval` in `packages/**/src` or `apps/**/src` is a design violation.

## R3. Fail-closed behavior for policy-like checks

- Where checks are unavoidable in runtime constraints, errors must not silently grant capability.
- Emit monitor diagnostics on validation/evaluation failure paths.

## R4. Observable failure paths

- Do not swallow security-relevant initialization failures silently.
- At least monitor-level telemetry is required in development and diagnostics contexts.

## R5. Contract clarity

- Security-sensitive assumptions must be documented at architecture boundary points.
- Public config/schema contracts must not imply unsupported security responsibilities.

## Prohibited Patterns

- Runtime permission expression evaluation in renderer/core.
- Inline JS execution for user-provided expressions.
- Silent catch that hides policy wiring failure.
- Security-by-UI-hiding (render-and-hide) for sensitive nodes.

## Design Review Checklist

Before merge, answer all:

- Does this change introduce or preserve runtime permission decisions?
- Does this change introduce `new Function`, `eval`, or equivalent dynamic execution?
- Are expression paths using approved compiler/evaluator interfaces?
- Are failures observable through monitor/diagnostic hooks?
- Does docs/index and architecture docs remain consistent with the boundary?

## Documentation Sync Requirements

When this document changes or related constraints change, review:

- `docs/index.md`
- `docs/references/maintenance-checklist.md`
- relevant architecture docs for affected modules
