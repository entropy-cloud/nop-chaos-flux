# Snapshot Key And Change Token Publication

## Purpose

This rule captures recurring bugs where state mutates correctly, but the snapshot key or change token used by subscribers does not advance, so subscribed renders silently fail to update.

Use it when reviewing mutation helpers, store update utilities, and any reactive path where subscribers depend on a derived snapshot token rather than the raw store object.

## Scope

Apply this rule when code changes touch any of the following:

- mutation helpers like `setValue`, `setValues`, `patchValue`, `resetField`, or bulk updates
- store snapshot keys such as `lastChange`, model generation, or equivalent change tokens
- `useSyncExternalStoreWithSelector` consumers that rely on a change token snapshot
- helpers that batch writes before publication

## Required Pattern

### 1) Every reactive mutation path must advance the corresponding snapshot/change token

- If subscribers depend on a change token, every mutation path that should trigger rerendering must update that token.
- Do not fix only one mutation helper and assume sibling helpers are safe.
- Audit the mutation family as a group.

Review checks:

- Identify the snapshot key used by subscribed renders.
- Search every mutation helper that can affect those subscribed values.
- Confirm each helper advances the token before or with the write, according to the store contract.

### 2) Repeated writes to the same path must still publish a fresh observable change

- Subscribers that compare snapshot references by identity must receive a new snapshot token even when the changed path is the same as before.
- “Store fired” is not enough if the snapshot key stays referentially identical.

Review checks:

- Add tests for repeated writes to the same field/path.
- Confirm selector reevaluation happens on the second write, not only the first.

## Allowed Exceptions

- Purely internal mutations that never feed a subscribed render path may skip a publication token if the owner contract explicitly says so.
- Snapshot keys may be omitted only when the subscription path reads directly from a store that already guarantees observable identity change for the relevant data.

## Review Checklist

- The subscribed snapshot key/change token is identified explicitly.
- Every reactive mutation helper advances that token consistently.
- Repeated writes to the same path still trigger subscribed rerendering.
- Focused tests cover at least one repeated-write scenario.

## Evidence From This Repository

- `docs/bugs/30-form-runtime-setvalue-setlastchange-missing-rerender-fix.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
