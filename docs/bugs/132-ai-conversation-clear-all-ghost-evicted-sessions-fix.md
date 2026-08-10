# 132 AI Conversation clearAll Ghosts: Evicted In-flight Saves + Never-Opened Sessions (P1-3/P1-4)

## Problem

- **P1-3** — `clearAll` enumerated only `engineCache.keys()` (`use-conversation.ts:578`). A conversation evicted by `switchConversation` (its in-flight autoSave still pending) was NOT in the cache → its pending save landed in storage AFTER the storage clear → ghost resurrection on remount.
- **P1-4** — bootstrap builds engines only for the active conversation; other loaded conversations never enter `engineCache`. `clearAll`'s per-id fallback (`:622-633`, storage without a `clearAll` implementation) iterated `engineCache.keys()` → those sessions' storage records survived the clear → ghost rehydration (FP-2 family, previously uncovered member).
- Probe evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-3/P1-4.

## Diagnostic Method

- Diagnosis difficulty: medium — P1-3 needs an evicted session with a gated in-flight save; P1-4 needs a bootstrap-loaded-but-never-opened session and a storage without `clearAll`.
- Investigation path:
  1. `:578` `ids = [...engineCache.keys()]` confirmed as the sole enumeration source (drain `:612-615` + per-id fallback `:622-633` both iterated `ids`).
  2. `:615` `pendingSavesRef.current.clear()` dropped in-flight entries without settling them; `saveMessages` (`:225-232`) had NO settlement-time mirror re-check (contrast create `:411-413` / rename `:565-567`).
  3. `:330-336` bootstrap builds engines only for the active conversation — never-opened sessions have no cache entry.
  4. Decisive evidence: 2 RED regression tests (evicted-session late save / never-opened session × clearAll).

## Root Cause

- The fan-out enumeration source (engine cache) ≠ the storage conversation set (list mirror). The cache holds only sessions that built an engine; evicted-but-still-listed and loaded-but-never-opened sessions hold storage state without a cache entry — and `pendingSavesRef.current.clear()` dropped pending saves instead of letting them settle (then landing after the clear).

## Fix

- `use-conversation.ts` — `clearAll`'s enumeration source changed to the FULL storage set: `[...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map(c => c.id)])]`; drain and per-id fallback share the same source.
- `saveMessages` — settlement-time mirror re-check: if the conversation is no longer in `conversationsRef`, skip the write (parity with create/rename; an EVICTED-but-still-listed session still saves — its landing is ordered before the clear by the K3 drain).
- Gate: invariant ④ extended with the fan-out source members (runtime ×2 in `conversation-invariants-i4.test.ts` + new static scanner rule `scanClearAllFanOutSource` — clearAll body must contain `conversationsRef.current.map(` — with committed regression fixtures ×2).

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts` — fan-out source members (evicted-session in-flight save × clearAll / never-opened session × clearAll).
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` — `scanClearAllFanOutSource` violating/clean fixtures (exit 1 / exit 0).
- All RED before the fix, GREEN after; full suite green.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs` (new `scanClearAllFanOutSource`)

## Notes For Future Refactors

- Storage fan-out enumeration must always use the list mirror (`conversationsRef.current`) ∪ pending-save keys ∪ engine cache — never `engineCache.keys()` alone.
- Any new storage write path needs settlement-time mirror re-checks; `pendingSavesRef.current.clear()` must never be used to cancel in-flight writes (drain, don't drop).
