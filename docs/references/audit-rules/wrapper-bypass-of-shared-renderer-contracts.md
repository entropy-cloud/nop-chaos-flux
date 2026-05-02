# Wrapper Bypass Of Shared Renderer Contracts

## Purpose

This rule captures recurring drift where components manually bypass shared renderer wrappers or shared contract paths instead of using the standard `wrap` / `frameWrap` / metadata / region contract.

Use it when reviewing complex renderers, field-like surfaces, or any component that looks similar to a standard renderer surface but implements its own wrapper path.

## Scope

Apply this rule when code changes touch any of the following:

- manual `FieldFrame` or wrapper instantiation inside renderer components
- custom wrapper logic that bypasses standard root metadata forwarding
- field-like surfaces that render outside the common `wrap` / `frameWrap` path
- renderer code that duplicates wrapper-owned className, marker, or metadata behavior

## Required Pattern

### 1) Shared renderer/wrapper contracts must be the default path

- If a component is a normal renderer/field surface, it should use the standard shared wrapper contract.
- Do not manually recreate wrapper behavior unless there is a clear contract reason.
- Local wrapper code must not silently fork metadata, marker, or interaction semantics.

Review checks:

- Search for manual `FieldFrame` or wrapper usage in renderer code.
- Check whether the same behavior already exists through the standard shared wrapper path.
- If the shared path is bypassed, require an explicit reason in docs or code comments.

### 2) Bypasses must preserve the shared contract surface, not just visual output

- If a bypass is legitimate, it still must honor the shared semantics for className, markers, metadata, and wrapper-owned interactions where applicable.
- A visually similar result is not enough if the semantic contract drifts.
- Tests should confirm the preserved contract behavior, not just render success.

Review checks:

- Compare the bypassed implementation against the shared wrapper contract.
- Verify className, marker, metadata, and interaction behavior remain aligned.
- Add focused tests when the bypass path is accepted but non-standard.

## Allowed Exceptions

- A renderer may bypass the shared wrapper path when the owner docs explicitly define it as a different surface family.
- Temporary compatibility carriers are allowed only when they are documented as transitional and have explicit follow-up ownership.

## Review Checklist

- Shared wrapper/renderer contracts remain the default path.
- Any bypass is explicit, justified, and documented.
- Accepted bypasses still preserve className, marker, metadata, and interaction semantics where required.
- Focused tests cover accepted non-standard wrapper behavior.

## Evidence From This Repository

- `docs/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full/12-field-slot.md`
- `docs/analysis/2026-05-02-deep-audit-full/09-renderer-contract.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/field-metadata-slot-modeling.md`
