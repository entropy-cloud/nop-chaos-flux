# 154 Ai Bubble contentResolverName Dead Field Drop + Dual Interface Adjudication

## Problem

- `AiBubbleSchema.contentResolverName` was declared in three surfaces (schema, renderer definition registry, renderers.md) with a promised "register-by-name content resolver" mechanism that never existed — the real mechanism is the injected `contentRenderers` matcher array (hosts pass `BubbleContentRendererMatch[]` via the `ai-bubble` prop).
- `ConversationStorageErrorEvent` was referenced by the public `UseConversationOptions.onStorageError` signature but was not exported from the package entry, so hosts could not name the type.
- Two public interfaces, `AiConversationController` (consumption surface) and `AiConversationControllerBridge` (hook product surface), coexisted without documented relationship (FIND-19).

## Diagnostic Method

- `rg contentResolver` across `packages/flux-renderers-ai/src/` found only the two declarations, zero consumers; `ai-bubble/index.tsx` reads `contentRenderers ?? defaultBubbleContentRenderers` — the named-resolver mechanism does not exist anywhere in the package.
- Grep of the package entry `index.ts` against the types referenced by exported option interfaces found `ConversationStorageErrorEvent` referenced but not re-exported (asymmetric with `ConversationStorageStrategy`).
- `rg AiConversationController` enumerated every consumption surface (index export / ai-action-provider input / ai-chat props / docs) — structurally assignable Bridge→Controller proven by the playground binding `controller={conversations.controller}`.

## Root Cause

- Dead contract field carried over from a design sketch (named-resolver registry) that was superseded by the injected matcher-array mechanism; three declaration surfaces were never pruned.
- Entry-point export list was maintained manually; the event type referenced by a public callback signature was never added to Group 3c of `index.ts`.
- The Bridge was introduced as the hook's product shape while the Controller remained the namespace consumption shape; the ~4-member isomorphism made them silently interchangeable without documentation.

## Fix

- Dropped `contentResolverName` from `schemas.ts` / `ai-renderer-definitions.ts` / `renderers.md` / `flux-guide/flux-types/schema.d.ts` / `flux-guide/design-patterns/ai.md` (zero-consumption dead field, no behavior change — 1606-3 autofocus-drop precedent).
- Added `export type { ConversationStorageErrorEvent }` to the entry's Group 3c (aligned with `ConversationStorageStrategy` precedent); engine.md §8.6 note added.
- FIND-19 adjudication (no structural merge — public export surface change needs human confirmation): documented the two-interface relationship in engine.md §8.6 / renderers.md §1.4 and added a lockstep doc-comment on the Bridge definition. `@tiptap/core` promoted to optional peer (FIND-09) and `jsonrepair` devDependency deduped (FIND-14) in the same family pass.

## Tests

- RED→positive typecheck assertion: scratch file importing `ConversationStorageErrorEvent` from the package entry failed with TS2305 before the export, passed after (scratch removed).
- `@nop-chaos/flux-renderers-ai` typecheck/test (80 files / 704 tests) green; `@nop-chaos/flux-playground` typecheck green (Bridge→Controller assignability exercised).
- Grep gates: `contentResolver` / `registerImport` / stale line anchors zero residue on live surfaces (historical records exempt).

## Affected Files

- `packages/flux-renderers-ai/src/schemas.ts`, `src/ai-renderer-definitions.ts`, `src/index.ts`, `src/adapters/use-conversation.ts`, `package.json`
- `flux-guide/flux-types/schema.d.ts`, `flux-guide/design-patterns/ai.md`
- `docs/components/flux-renderers-ai/engine.md`, `renderers.md`, `design.md`, `implementation.md`
- `docs/audits/ai-invariants/invariant-catalog.md`, `gates.md`, `cycle2-findings.md`, `cycle2-adjudication.md`

## Notes For Future Refactors

- Do NOT re-add `contentResolverName` (or a "register-by-name" resolver) without first building the actual registry; the injected `contentRenderers` matcher array is the mechanism.
- `AiConversationController` and `AiConversationControllerBridge` members must stay in lockstep — adding a member to only one silently forks the public contract (watch-only residual from FIND-19).
- `ConversationStorageErrorEvent` must remain exported from the entry as long as `UseConversationOptions.onStorageError` references it.
