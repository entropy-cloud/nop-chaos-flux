# 158 Branching Fallback And Format Normalization Contract Fix

## Problem

- `branching.ts` had two undocumented, untested behaviors: (1) the fallback branch (`branchSeq.next` with a `prev` id carrying NO trailing number → mint a fresh `branch-<n>`) had **zero test coverage** — deleting it would leave the suite green (FIND-22, `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`); (2) leading-zero branch ids normalize via `parseInt` (`branch-01` advances to `branch-2`) and `findPriorAssistantBranchId` does not validate format — neither was documented in the A-16 contract (R2-F3, `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`).

## Diagnostic Method

- FIND-22 audited `engine-branches.test.ts:24-127`: the existing members covered mint / numeric-increment / explicit-pass-through / no-op / in-flight — the `branch-abc`-style fallback was reachable only via `regenerate()` following a custom non-numeric branchId and was never exercised.
- R2-F3 traced `branchSeq.next` (`branching.ts:32-35`): `parseInt(m[2], 10)` parses the trailing digits (leading zeros normalize: `branch-01` → `branch-2`), and `findPriorAssistantBranchId` (`:55-63`) passes any string through.

## Root Cause

- No behavior change required: the fallback mint and the parseInt normalization are CORRECT and intended; the defects were missing regression coverage (FIND-22) and missing contract documentation (R2-F3) — a display-level format drift (`branch-01` → `branch-2`) that hosts would otherwise read as a bug.

## Fix

- Behavior unchanged. Contract documented in three places: `engine/branching.ts` JSDoc (trailing-digit parseInt normalization / no-suffix fallback mint / no format validation in `findPriorAssistantBranchId`), `engine.md` §8.1 "A-16 branch id 契约" (same three rules, engine.md §Invariants history + adapter note sync), and behavior pinned by new tests.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-branches.test.ts` — 3 new members: (1) FIND-22: prior `branch-abc` → `regenerate()` mints `branch-1` on the new assistant; (2) R2-F3: prior `branch-01` → `regenerate()` advances to `branch-2` (parseInt normalization locked); (3) R2-F3: `findPriorAssistantBranchId` returns `branch-abc` verbatim (no format validation locked).

## Affected Files

- `packages/flux-renderers-ai/src/engine/branching.ts` (JSDoc)
- `packages/flux-renderers-ai/src/engine/__tests__/engine-branches.test.ts`
- `docs/components/flux-renderers-ai/engine.md` (§8.1 A-16 branch id 契约)

## Notes For Future Refactors

- The fallback mint is sequence-based, not derivation-based: `branch-abc` → `branch-1`, never `branch-abc-1`. Keep the parseInt-based advance (leading-zero normalization is contract, not drift).
- `findPriorAssistantBranchId`'s non-validation is contract: host-provided branch ids pass through verbatim; format enforcement is the host's job at injection time.
