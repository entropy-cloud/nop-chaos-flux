# Status Path Publication Cleanup

## Purpose

This rule captures recurring failures where host or renderer effects publish a `statusPath` summary but never clear it when the publishing owner unmounts or stops owning that summary.

Use it when reviewing `statusPath` publication, host summary projection, or any effect that writes owner summaries into a parent scope.

## Scope

Apply this rule when code changes touch any of the following:

- `publishOwnerStatus(...)` or equivalent status publication helpers
- renderer or host `useEffect(...)` blocks that write summary objects to a parent scope
- host shells such as designer, spreadsheet, report designer, word editor, CRUD, or tree summaries
- owner summary helpers that project `dirty`, `ready`, selection, or count metadata outward

## Required Pattern

### 1) Status publication must define its teardown behavior explicitly

- If an effect publishes a summary to `statusPath`, it must also define what happens when that publisher unmounts.
- The default expectation is cleanup that clears the published summary or republishes `undefined`.
- Do not assume parent-scope consumers will infer unmount from unrelated state.

Review checks:

- Search for `publishOwnerStatus(...)` inside `useEffect(...)` blocks.
- Check whether the effect returns a cleanup function.
- Verify the cleanup path clears the same `statusPath` that the effect writes.

### 2) Summary ownership must stay single-source across mount and unmount

- A parent scope must not keep a stale summary after the publishing renderer or host shell is gone.
- If multiple summaries share one helper, prefer a shared cleanup-safe helper rather than repeating ad-hoc `useEffect(...)` logic.
- Summary cleanup is required even when the published object is small or low-risk; stale semantics are still stale semantics.

Review checks:

- Trace whether the parent scope survives after the child host/renderer unmounts.
- Confirm stale summaries cannot outlive conditional rendering, route changes, or surface closure.
- Add focused tests that mount, publish, unmount, and then assert the parent scope no longer exposes the old summary.

## Allowed Exceptions

- Process-lifetime owners may omit cleanup only when the owner truly lives for the lifetime of the parent scope and cannot unmount independently.
- A documented owner may intentionally preserve the last summary only when the owning architecture doc explicitly defines that behavior.

## Review Checklist

- `statusPath` publication paths define explicit cleanup semantics.
- Unmounting the publisher does not leave stale summaries in the parent scope.
- Shared helpers are preferred over repeated one-off publication effects.
- Focused tests cover publish then unmount behavior.

## Evidence From This Repository

- `docs/analysis/2026-05-03-deep-audit-full/07-lifecycle.md`
- `docs/analysis/2026-05-03-deep-audit-full/summary.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
