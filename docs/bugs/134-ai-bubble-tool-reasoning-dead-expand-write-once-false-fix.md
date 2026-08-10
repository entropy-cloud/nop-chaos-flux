# 134 AI Bubble Tool Card / Reasoning Panel Dead Expand Controls (write-once-false `open` field, P1-7 + P1-8)

## Problem

- **P1-7** — the bubble-path tool card expand chevron was dead: clicking it never revealed the `function.arguments` JSON, `aria-expanded` stayed `false`. Three production write paths all set `open: false` and nobody ever wrote `open: true` — `ChatToolCallUIState.open` was a write-once-false orphan.
- **P1-8** — with `thinkingPlugin` registered, the reasoning panel was permanently collapsed AND disabled: `reasoning.tsx` treated `controlled !== undefined` as authoritative → button `disabled`, panel never expanded, `internalOpen` dead code.
- Root mechanism (shared): `state?.open ?? internalOpen` — `false ?? internalOpen` never falls through to local state. `toolPlugin` (`onCompletionChunk` + `onAfterRequest`) and `resolveToolState` (map-missing-key default) wrote `{ status:'running', open:false }`; `thinkingPlugin` wrote `{ open:false, startedAt }` on the first chunk and only refreshed `endedAt` afterwards.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-7/P1-8 (cross-cutting pattern 1: engine-held UI state must have live write-back or be local-only).

## Diagnostic Method

- Diagnosis difficulty: low-medium — the write-once-false pattern is greppable (`open: false` across `tool-plugin.ts` ×2 / `thinking-plugin.ts` / `tools.tsx`), but the _consumer-side_ short-circuit (`false ?? internalOpen`) is the subtle half; a code search for `open: true` writers returned zero production hits.
- Decisive evidence: RED regression — bubble-path click on the chevron produced no `ai-tool-call-args`; plugin-path reasoning button was `disabled`.

## Root Cause

- Engine plugins pinned `open:false` (write-once) while the renderer merged with `??` (falsey values never fall through) and there was no write-back API — a dead interactive control + orphan state field combination.

## Fix

- **Decision (方案 A)**: plugins stop pinning `open` entirely (undefined-absent); renderer keeps local expand state. Rationale: no verified engine write-back API for `message.state.toolCall/thinking` (only `setMessageEditing` exists); virtualized row recycling (>200 messages) does drop local expand state on recycle, but the upgrade-to-write-back condition ("可用写回 API 存在") does not hold → 方案 A with the documented trade-off (host-explicit `open` survives recycle via the engine snapshot; local-only expansion resets).
- `tool-plugin.ts` — both write sites: `{ status: 'running' }` (no `open`).
- `thinking-plugin.ts` — first chunk: `{ startedAt }` (no `open`).
- `ai-tool-call.tsx` — merge: `state?.open !== undefined ? state.open : internalOpen`.
- `reasoning.tsx` — merge: `controlled?.open !== undefined ? controlled.open : internalOpen`; `toggle()` always flips local state; `disabled` only when the engine explicitly holds `open` (never on the plugin path).
- `tools.tsx` `resolveToolState` — map-missing-key default: `{ status: 'running' }` (no `open`).

## Tests

- `tool-call-and-content.test.tsx` — P1-7 bubble-path expand (map-missing-key + tool-plugin-written entry + engine-`open`-survives-remount recycle spot check).
- `phase5-deepening.test.tsx` — P1-8 plugin-path expand/disabled (via real `createThinkingPlugin().onCompletionChunk` output) + A-10 fixtures updated to the undefined-absent contract with expand assertions.
- `plugins.test.ts` — `open` undefined-absent assertions for thinkingPlugin + toolPlugin (both hooks), plus not-overwriting-engine-status guard.
- RED→GREEN evidence: 8 failed pre-fix (2 P1-7 + 2 P1-8 + A-10 extension + 3 plugin-write-surface) → all green; AI package 70 files / 600 tests.

## Affected Files

- `packages/flux-renderers-ai/src/engine/plugins/tool-plugin.ts`
- `packages/flux-renderers-ai/src/engine/plugins/thinking-plugin.ts`
- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/tools.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/reasoning.tsx`
- Tests: `tool-call-and-content.test.tsx` / `phase5-deepening.test.tsx` / `plugins.test.ts`

## Notes For Future Refactors

- The `open` field contract is **undefined-absent-or-live-write-back** — never write `open: false` from engine plugins or default state resolvers again; `?? internalOpen` short-circuits on falsey values.
- Merge pattern must stay `state?.open !== undefined ? state.open : internalOpen` — if a write-back API for `message.state.toolCall/thinking` is ever added (multi P2-10 family), revisit 方案 A and re-evaluate the virtualized-row-recycling trade-off.
