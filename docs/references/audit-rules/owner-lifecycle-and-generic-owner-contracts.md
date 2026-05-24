# Owner Lifecycle And Generic Owner Contracts

## Purpose

This rule captures recurring failures where runtime owners publish an overly-advanced lifecycle state, or shared code reaches for subtype-only APIs instead of a supported generic owner contract.

Use it when reviewing validation owners, runtime-owned surfaces, or shared owner-facing APIs consumed across multiple owner families.

## Scope

Apply this rule when code changes touch any of the following:

- owner creation/publication paths
- lifecycle fields such as `bootstrapping`, `refreshing`, `active`, or `ready`
- shared runtime contracts in `flux-core`
- React/runtime code that calls owner APIs from generic paths
- participation/state channels shared across form and non-form owner families

## Required Pattern

### 1) Published lifecycle must stay honest until prerequisites exist

- Do not publish `active`, `ready`, or equivalent stable semantics before the required compiled model, runtime attachment, or prerequisite data exists.
- Transitional states must remain visible until activation preconditions are satisfied.
- Derived flags such as `ready` must respect lifecycle state, not only local validity flags.

Review checks:

- Search for owner construction that initializes lifecycle to `active` before model attachment.
- Check whether `ready`/`canSubmit`/similar flags depend on lifecycle, not only `valid`/`isValidating`.
- Add tests that assert pre-attach vs post-attach behavior explicitly.

### 2) Shared owner paths must use generic contracts, not subtype casts

- Shared code paths must not cast a generic owner to `FormRuntime` or another subtype just to publish a common policy/input.
- If multiple owner families need the capability, expose it through the generic runtime surface.
- Subtype-only APIs are allowed only in code paths that are truly subtype-specific.

Review checks:

- Search for casts from generic owner/runtime types to subtype-specific contracts.
- Check whether the cast is compensating for a missing generic API.
- Verify exported shared types reflect the actual shared capability.

## Allowed Exceptions

- Subtype-only APIs are allowed when the code path is truly owned by that subtype and cannot run for other owner families.
- Transitional lifecycle skipping is allowed only if the owner doc explicitly defines the owner as synchronously active at construction time.

## Review Checklist

- Lifecycle publication does not outrun required prerequisites.
- `ready`-like derived flags honor lifecycle state.
- Shared code does not depend on subtype casts for generic behavior.
- Generic runtime contracts expose the capabilities shared owner families actually need.
- Focused tests cover both transitional and activated owner states.

## Evidence From This Repository

- `docs/logs/2026/05-03.md`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/__tests__/runtime-status-and-imports.test.ts`

## Primary Architecture Anchors

- `docs/architecture/form-validation.md`
- `docs/architecture/flux-core.md`
- `docs/references/form-validation-runtime-types.md`
