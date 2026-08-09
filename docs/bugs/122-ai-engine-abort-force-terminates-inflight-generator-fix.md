# 122 AI Engine Abort Does Not Force-Terminate the In-Flight Generator (K2)

## Problem

- The chunk loop (`create-engine.ts:417-429`) had no per-iteration abort check: a signal-ignoring connector kept yielding after `abort()`, and its late chunks were still applied/committed to the aborted round's message.
- A never-settling generator kept `for await` running forever → the catch/finally never ran → placeholder `loading=true` permanently + `abortController` residue (`isProcessing=false` but controller non-null), breaking the "aborted = terminal" contract (F1.6).
- Probe evidence: `docs/audits/ai-invariants/cycle1-findings.md` K2 — not scripted at audit time (needs a signal-ignoring generator); this plan's regression test provides the scripted RED evidence.

## Diagnostic Method

- Diagnosis difficulty: medium — requires a connector that ignores the abort signal; the I1 gate tests all used "well-behaved" gated connectors that settle, so the blind spot was structural.
- Investigation path:
  1. I2 audit traced the abort path: `abort()` only called `controller.abort()` + sync state reset; nothing held the in-flight `connector.stream()` generator.
  2. Inspected the `for await` loop: no per-iteration `signal.aborted` check, so any chunk yielded after abort is consumed and applied.
  3. Decisive evidence: scripted signal-ignoring connector (yields N more chunks after abort, then settles) — late chunks landed on the message (RED).

## Root Cause

- Two missing pieces in the abort contract:
  1. The consume loop had no per-iteration abort check, so post-abort yields were applied.
  2. `abort()` held no handle on the in-flight generator, so it could not force-terminate a generator suspended at a `yield` (preemptible via `.return()`) — the loop would only settle if the connector cooperated.

## Fix

- `create-engine.ts`: per-iteration `if (abortController.signal.aborted) break;` in the chunk loop (late chunks suppressed; `break` triggers AsyncIteratorClose so cooperative generators settle via `.return()`).
- `let activeGenerator` closure handle: registered after `connector.stream()` resolves, cleared in a `finally` around the consume loop (a consumed generator's `.return()` is a no-op; the null-out prevents a stale handle).
- `abort()` (`:533-552`) now calls `activeGenerator?.return()` best-effort (swallowed rejection — the stream's own catch reports it) before the existing synchronous reset.
- Design ruling: a generator stuck inside its own internal `await` cannot be preempted from outside — that is a **connector contract violation** (recorded in `engine.md` §Invariants Failure Path), not an engine defect.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts` — "abort forces in-flight generator termination: late chunks after abort are not applied" (signal-ignoring finite-yield connector; asserts settle + late-chunk suppression; RED before fix).
- Hardened `engine.test.ts` "abort → requestState aborted and content retained" and `use-message.test.tsx` "abortRequest sets requestState to aborted": now poll until the first chunk is actually consumed before aborting, and assert exact pre-abort content — the old fixed 2-microtask wait relied on the buggy late-chunk behavior.

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts`
- `packages/flux-renderers-ai/src/engine/__tests__/engine.test.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-message.test.tsx`

## Notes For Future Refactors

- Any new consumer of `connector.stream()` must register its generator on `activeGenerator` and clear it on every exit — otherwise `abort()` loses its termination handle.
- The engine CANNOT guarantee settlement for connectors that never yield — that is a connector-contract violation by ruling; tests must use finite-yield signal-ignoring connectors (a never-settling one hangs the test).
- W1 (watch-only abortController residue) is expected to be partially converged by this fix's finally-cleanup surface — re-check at I5/I6 before removing from the watch-only list.
