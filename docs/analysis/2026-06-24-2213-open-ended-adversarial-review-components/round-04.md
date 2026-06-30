# Round 04 — structural renderers (`flux-renderers-basic`) — no new high-value finding

> Execution: `2026-06-24-2213-open-ended-adversarial-review-components`
> Lens: _contract archaeologist_ + _combination-explosion tester_ (template-instantiation identity).

## Scope probed

- `packages/flux-renderers-basic/src/loop.tsx` (full), `recurse.tsx` (full), `structural-loop.tsx` (full).
- Template-instantiation identity and key resolution are a known historical bug source (`docs/architecture/template-instantiation-and-node-identity.md`).

## Conclusion: no new high-value defect

The structural renderers are carefully built:

- **`structural-loop.tsx:54-85` `resolveItemKey`** uses a sane precedence (`keyBy: item.*` path → `keyBy: item` scalar → record `id`/`key`/`name` fallback → **full-array `String(index)`**). Critically, the index fallback is over the _whole_ `items` array (`:142`), not a paginated window, so it does **not** suffer the list renderer's cross-page key collision (R1 P0-4). Safe.
- **`recurse.tsx`** threads `depth`/`maxDepth` correctly (`structural-loop.tsx:130-132` short-circuits at `maxDepth`), inherits/overrides bindings and `itemData`/`keyBy` from the loop context, and re-keys each level by `itemKey`. No infinite-recursion / identity hazard found.
- **`loop.tsx`** threads `instancePath` and `repeatedTemplateId` per item correctly.

## Minor items noted (not high-value, not re-reported)

- `LoopProvider`/`RecurseProvider` wrap their context in a hand-written `useMemo` (`loop.tsx:36-55`, `recurse.tsx:39-58`) whose deps include inline closures created every render — the memo is effectively a no-op. Redundant under React Compiler; folded into S-7 of the consolidated report.
- `resolveItemKey` `keyBy` only honours `item.*` paths and the literal `item`; a bare field name that isn't `id`/`key`/`name` is silently ignored (falls through to the record fallback). Minor contract gap; documented here only.

## Stop decision

Per `docs/skills/open-ended-adversarial-review-prompt.md` rule #8/#14: this round found no new high-value issue. The audit concludes here. Final consolidated report: `docs/audits/2026-06-24-2213-open-audit-components.md` (status `open`).
