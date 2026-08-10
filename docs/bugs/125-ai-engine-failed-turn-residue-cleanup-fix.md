# 125 AI Engine Failed-Turn Residue Cleanup (K-⑩ Family, K-⑩-1/2/3/4/5)

## Problem

- Failed / aborted / zero-chunk "completed" rounds left an **empty assistant message** (`content:''`, `loading:false`) in the message list. It then leaked into the **next request's history** (`buildContext` only excluded `loading:true` tails — strict backends reject empty blocks), into the **autoSave snapshot** (persisted across conversations), and as a **permanent `loading:true` ghost** when `onBeforeRequest` rejected before the stream try.
- K-⑩-4 was a data-loss form: `regenerate()` truncated the old answer, the connector threw, and the round committed only an empty placeholder — the original answer gone with no replacement.
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-⑩-1/2/3/4/5 (probe A / B / P3 / P4 / P6, all RED).

## Diagnostic Method

- Diagnosis difficulty: medium — five members of one family across three surfaces (request history / persistence / list ghost), each only visible in a specific scenario.
- Investigation path:
  1. I2 audit traced `runOnce`'s terminal commit paths: catch (`create-engine.ts:484-486`), post-stream abort check, and the `!firstChunkReceived → loading=false` branch all commit the same vacuous placeholder.
  2. `buildContext` (`:511`) was confirmed to exclude only the loading tail; autoSave (`use-conversation.ts:190-209`) snapshots the raw list.
  3. Decisive evidence: five RED probes (abort-before-first-chunk / onBeforeRequest rejection / autoSave arm / regenerate arm / zero-chunk round).

## Root Cause

- The engine's terminal commit treated "an assistant message that was pushed" as "must remain committed" — no distinction between a real product (content or finishReason present) and a vacuous residue (empty content, no finishReason).
- `onBeforeRequest` ran outside the stream `try`, so its rejection skipped the catch's cleanup entirely (loading ghost).
- autoSave persisted the raw snapshot with no residue filter, and `abort()` flips `requestState` synchronously — before the engine's own cleanup runs.

## Fix

- `packages/flux-renderers-ai/src/engine/utils.ts`: new shared predicate `isVacuousAssistantResidue(message)` — `role==='assistant' && isEmptyContent(content) && !metadata.finishReason`. **Design ruling (recorded for engine.md): vacuous empty products must never enter the request history nor an autoSave snapshot.**
- `create-engine.ts`:
  - `commitOrDropResidue()` — terminal commits (post-stream, runOnce catch, onBeforeRequest rejection) **drop** a vacuous residue instead of committing it; partial content is still committed (a partially-streamed answer is kept).
  - `onBeforeRequest` wrapped in a cleanup try/catch (drop + rethrow so runTurn settles the state).
  - `buildContext` tail-exclusion predicate extended to vacuous residues (defense in depth).
- `use-conversation.ts` `attachAutoSave`: strips trailing vacuous residues from the persisted snapshot (covers the synchronous-abort race).

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-i4.test.ts` — Invariant ⑩ block (I4 拆分新文件): existing member flipped `it.fails`→`it` + 4 new members (abort-before-first-chunk / onBeforeRequest ghost / regenerate arm / zero-chunk round); all RED before the fix.
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts` — K-⑩-3 autoSave arm member (failed-turn snapshot excludes the residue).

## Affected Files

- `packages/flux-renderers-ai/src/engine/utils.ts`
- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- the two test files above

## Notes For Future Refactors

- Any new assistant-message commit path must route through `commitOrDropResidue` (or apply `isVacuousAssistantResidue`), never a bare commit.
- `abort()`'s synchronous `requestState` flip happens BEFORE the engine cleanup — the autoSave tail-filter is what closes that window; do not remove it.
- The mid-stream per-chunk commit is intentionally a plain commit (dropping mid-loop would corrupt streaming).
