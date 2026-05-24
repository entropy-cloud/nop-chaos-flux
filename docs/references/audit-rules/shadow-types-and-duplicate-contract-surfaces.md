# Shadow Types And Duplicate Contract Surfaces

## Purpose

This rule captures recurring drift where local shadow types, duplicated constants, or duplicate helper flows grow beside an already-canonical shared contract.

Use it when reviewing cross-package contracts, shared constants, helper extraction, or any code that appears to redefine an existing owner surface locally.

## Scope

Apply this rule when code changes touch any of the following:

- package-local shadow types that mirror canonical exported types
- duplicated constants or namespace strings already defined in shared modules
- duplicate helper flows that already have a canonical shared owner
- convenience aliases that risk drifting from their canonical source

## Required Pattern

### 1) Canonical shared contracts must be imported, not redefined locally

- If a shared package already exports the type or constant, use it instead of creating a shadow copy.
- Local shadow types and magic strings drift over time even when they start identical.
- Duplicate helper logic should be collapsed before semantic differences appear.

Review checks:

- Search for local types/constants whose names or shapes mirror canonical exports.
- Check whether an existing shared contract or helper already owns the behavior.
- Replace the local copy with the canonical import when no true boundary prevents it.

### 2) If an alias survives, it must be explicit and documented

- Some aliases may remain for compatibility or readability, but they must be intentional.
- Silent parallel surfaces are not acceptable because they create ambiguous ownership.
- Closure should record why the alias still exists and which contract remains canonical.
- Public facade re-exports are allowed only when the facade status is explicit and the canonical owner package remains named in docs and review notes.

Review checks:

- Distinguish true compatibility aliases from accidental local duplication.
- Document any retained alias and its owner relationship.
- Add focused tests if the alias is part of the public surface.

## Allowed Exceptions

- A local adapter type is allowed when it intentionally narrows or reshapes a canonical contract for a package boundary, and the distinction is documented.
- Public compatibility aliases may remain when migration is still active and the canonical owner is clear.

## Review Checklist

- Canonical shared types/constants/helpers are imported rather than redefined.
- Duplicate contract surfaces are collapsed or explicitly documented as aliases/adapters.
- Public aliases are intentional and tested when they remain part of the exported surface.

## Evidence From This Repository

- `docs/archive/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`
- `docs/archive/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`
- `docs/archive/analysis/2026-05-02-deep-audit-full/03-api-surface.md`

## Primary Architecture Anchors

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
