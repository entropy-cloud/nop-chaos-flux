# Owner Registration Containment And Validation Participation

## Purpose

This rule captures recurring failures where runtime registration paths accept field paths, child paths, or participation descriptors outside the receiving owner's subtree.

Use it when reviewing validation owner registration, runtime field registration, runtime child participation, or owner-local validation indexing.

## Scope

Apply this rule when code changes touch any of the following:

- `registerField(...)`, `updateFieldRegistration(...)`, or equivalent registration helpers
- runtime registration maps keyed by field path or child path
- owner-local validation participation sets
- runtime overlays or opaque validation descriptors that declare target paths
- owner contracts that derive validation work from registered paths

## Required Pattern

### 1) Runtime registration must reject paths outside the receiving owner's subtree

- The receiving owner must validate that every accepted `path` belongs to its owned subtree.
- Child participation paths such as `childPaths` must be checked with the same containment rules as the root registration path.
- Do not rely on later validation passes to silently ignore foreign paths once they have already entered owner-local maps.

Review checks:

- Search for registration helpers that write `path` or `childPaths` into owner-local maps.
- Check whether the write path calls a shared containment helper such as `isPathOwned(...)`.
- Confirm both initial registration and patch/update flows enforce the same containment rule.

### 2) Foreign paths must not enter owner-local participation, touched, or validation target sets

- Once a foreign path is accepted into runtime registration maps, the bug already exists even if the later validation result looks harmless.
- Owner-local `validateAll`, `validateSubtree`, submit touched-state construction, and runtime-child validation must all assume registration maps are already containment-safe.
- If ownership is ambiguous, reject or normalize at registration time rather than letting later flows guess.

Review checks:

- Trace where registered paths feed `validateAll`, child validation, submit touched derivation, or external error participation.
- Check whether owner-local scans iterate over registration maps without rechecking ownership.
- Add focused tests that attempt to register a path outside the current owner subtree.

## Allowed Exceptions

- Truly root owners whose documented subtree is the whole scope may accept any path inside that global root.
- Compatibility aliases are allowed only if they normalize to a validated owned path before entering owner-local maps.

## Review Checklist

- Registration helpers validate subtree containment before mutating owner-local maps.
- `path` and `childPaths` use the same containment rules.
- Owner-local validation flows do not depend on post-hoc filtering of foreign paths.
- Focused tests cover out-of-owner registration rejection.

## Evidence From This Repository

- `docs/archive/analysis/2026-05-03-deep-audit-full/08-validation.md`
- `docs/archive/analysis/2026-05-03-deep-audit-full/summary.md`

## Primary Architecture Anchors

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`
