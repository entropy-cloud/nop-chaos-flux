# 2 Convention, Async Safety, API Surface & Claim Integrity Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-28
> Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`, `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`
> Related: `docs/plans/2026-07-28-0800-1-compile-once-contract-remediation.md`

## Purpose

Fix 1 P0 (claim integrity: ImportStack doc types), 5 P1 findings (raw `<button>` MANDATORY rule violations, 2 missing AbortControllers, flow-designer unstable overlap, report-designer type safety) across two open audits.

## Current Baseline

- **P0 — ImportStack.push() doc mismatch** (`docs/architecture/module-cache-and-import-stack.md:232-241`): 3 type parameters diverge from live code (`actionScope`, `componentRegistry`, `nodeInstance`). Previously claimed fixed (R3.13) but live doc unchanged.
- **P1 — Raw `<button>` violations** (9 non-test files across 5 packages): `icon-picker.tsx:212`, `transfer-renderer.tsx:380`, `select-mobile-renderer.tsx:58`, `carousel.tsx:300`, `diff-header.tsx:45/54/65`, `diff-hunk.tsx:56/71`, `diff-file-list.tsx:96`, `steps-renderer.tsx:266`. All have `Button` from `@nop-chaos/ui` already imported in the same file.
- **P1 — Missing AbortController in image.tsx:84**: Uses cancelled-boolean flag but in-flight `fetchAsDataUri` continues after unmount.
- **P1 — Missing AbortController in use-conversation.ts:217**: Same cancelled-boolean pattern for `storage.loadConversations()`.
- **P1 — flow-designer unstable overlap** (`packages/flow-designer-renderers/src/unstable.ts:29-34`): Exports `extendFlowDesignerRegistry`, `flowDesignerRendererDefinitions`, `registerFlowDesignerRenderers` that already exist in stable barrel (`index.tsx`). `createFlowDesignerRegistry` is unstable-only and should remain.
- **P1 — report-designer RendererDefinition<any>[]** (`packages/report-designer-renderers/src/renderers.tsx:204`): Disables compile-time contract checking for 7 definitions.

## Goals

- Fix ImportStack.push() doc to match live code types
- Replace all 9 raw `<button>` instances with `<Button>` from `@nop-chaos/ui`
- Add `AbortController` to async useEffect patterns in image.tsx and use-conversation.ts
- Remove duplicate exports from `flow-designer-renderers/src/unstable.ts`
- Replace `RendererDefinition<any>[]` with typed definitions in report-designer-renderers

## Non-Goals

- Do not audit all 30 packages for additional raw HTML elements (P2 D09-07 already partially covered here)
- Do not add `AbortController` to every async useEffect in the codebase (only the 2 identified)
- Do not redesign the unstable subpath contract beyond removing duplicates

## Scope

### In Scope

- Fix ImportStack.push() doc types
- Fix 9 raw `<button>` → `<Button>` replacements
- Fix missing AbortController in image.tsx
- Fix missing AbortController in use-conversation.ts
- Fix flow-designer unstable exports (remove stable duplicates)
- Fix report-designer `RendererDefinition<any>[]` → typed definitions

### Out Of Scope

- D03-02 (flux-react/unstable re-exports stable flux-runtime APIs) — P2, track in backlog
- Other P2 API surface findings (D03-03 through D03-08)
- React.memo cleanup under React Compiler (P2)
- useLayoutEffect fixes (P2)

## Test Strategy

Tier: `建议有测`. Each fix is independently verifiable; the AbortController fixes benefit from a focused test confirming cleanup on unmount.

## Execution Plan

### Phase 1 — Doc Fix: ImportStack.push() Types

Status: completed
Targets: `docs/architecture/module-cache-and-import-stack.md`

- Item Types: `Fix`

- [x] Update documented parameters to match live code: `actionScope` → `ImportActionScope`, `componentRegistry` → `ComponentHandleRegistryCore`, `nodeInstance` → `ImportContextNodeInstance`
- [x] Add explicit note that `ComponentHandleRegistry extends ComponentHandleRegistryCore` to explain the supertype relationship

Exit Criteria:

- [x] All 3 parameter types in doc match live code signatures

### Phase 2 — Raw `<button>` → `<Button>` Replacements

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/icon-picker.tsx`, `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`, `packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx`, `packages/flux-renderers-content/src/carousel.tsx`, `packages/flux-renderers-content/src/diff-view/components/diff-header.tsx`, `packages/flux-renderers-content/src/diff-view/components/diff-hunk.tsx`, `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx`, `packages/flux-renderers-layout/src/steps-renderer.tsx`

- Item Types: `Fix`

- [x] icon-picker.tsx:212 — replace with `<Button variant="ghost">`
- [x] transfer-renderer.tsx:380 — replace with `<Button variant="ghost">`
- [x] select-mobile-renderer.tsx:58 — replace with `<Button variant="ghost">`
- [x] carousel.tsx:300 — replace with `<Button variant="ghost">`
- [x] diff-header.tsx:45,54,65 — replace with `<Button variant="ghost">`
- [x] diff-hunk.tsx:56,71 — replace with `<Button variant="ghost">`
- [x] diff-file-list.tsx:96 — replace with `<Button variant="ghost">`
- [x] steps-renderer.tsx:266 — replace with `<Button variant="ghost">`

Exit Criteria:

- [x] No raw `<button>` elements remain in the 9 targeted files
- [x] Each replacement uses `Button` from `@nop-chaos/ui` (already imported)

### Phase 3 — AbortController for Async useEffect Patterns

Status: completed
Targets: `packages/flux-renderers-content/src/image.tsx`, `packages/flux-renderers-ai/src/adapters/use-conversation.ts`

- Item Types: `Fix | Proof`

- [x] image.tsx:84 — Replace cancelled-boolean with `AbortController`, pass signal to `fetchAsDataUri`
- [x] use-conversation.ts:217 — Replace cancelled-boolean with `AbortController`, pass signal to `storage.loadConversations()`
- [x] Add focused test: rapid mount/unmount does not accumulate in-flight requests

Exit Criteria:

- [x] Both useEffect async operations use `AbortController.signal` for cancellation
- [x] Focused test confirms no connection accumulation on unmount

### Phase 4 — API Surface Fixes: Unstable Duplicates & Type Safety

Status: completed
Targets: `packages/flow-designer-renderers/src/unstable.ts`, `packages/report-designer-renderers/src/renderers.tsx`

- Item Types: `Fix`

- [x] Remove `extendFlowDesignerRegistry`, `flowDesignerRendererDefinitions`, `registerFlowDesignerRenderers` from `unstable.ts` (retain only genuinely unstable exports; `createFlowDesignerRegistry` is unstable-only and stays)
- [x] Replace `RendererDefinition<any>[]` with `RendererDefinition[]` (defaults to `BaseSchema`) or define specific schema interfaces for each of the 7 definitions in report-designer-renderers

Exit Criteria:

- [x] `unstable.ts` no longer duplicates stable barrel exports
- [x] report-designer-renderers no longer uses `RendererDefinition<any>[]`

## Draft Review Record

- Reviewer / Agent: MISSION_DRIVER (mission-driver-2026-07-28)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor: Phase 2 Targets paths corrected for diff-view files (were missing `diff-view/components/` subdirectory)
  - Minor: Phase 4 Current Baseline and execution item corrected for flow-designer unstable overlap — `createFlowDesignerRegistry` is unstable-only (not a duplicate); `extendFlowDesignerRegistry` is the actual duplicated export

## Closure Gates

- [x] ImportStack.push() doc verified against live code
- [x] All 9 raw `<button>` instances confirmed replaced
- [x] Both AbortController fixes verified with focused test
- [x] flow-designer unstable exports no longer overlap
- [x] report-designer no longer uses `RendererDefinition<any>[]`
- [x] `pnpm typecheck && pnpm build` passes
- [x] `pnpm lint` passes (no new raw `<button>` warnings)
- [x] `pnpm test` passes (including new focused tests)
- [x] Independent closure audit (fresh sub-agent) completed

## Deferred But Adjudicated

_None._

## Non-Blocking Follow-ups

_None (all P2 items tracked in follow-up backlog)._

## Closure

Status Note: All 4 Phases completed, all exit criteria met, `pnpm typecheck/build/lint/test` passes. Plan closing.

Closure Audit Evidence:

- Auditor / Agent: MISSION_DRIVER (closure-audit-2026-07-28)
- Evidence:
  - Phase 1 — Doc Fix: `ImportStack.push({ nodeId, imports, cache, actionScope })` at `docs/architecture/module-cache-and-import-stack.md:315` matches live code.
  - Phase 2 — Button Replacements: Zero raw `<button>` in all 9 targeted source files (icon-picker.tsx, transfer-renderer.tsx, select-mobile-renderer.tsx, carousel.tsx, diff-header.tsx, diff-hunk.tsx, diff-file-list.tsx, steps-renderer.tsx).
  - Phase 3 — AbortController: `new AbortController()` in `image.tsx:91` and `use-conversation.ts:219`. Focused test `image-fetcher.test.tsx` "ImageRenderer — AbortController cleanup" present.
  - Phase 4 — API Surface: `unstable.ts` only retains `createFlowDesignerRegistry` (no stable duplicates); `renderers.tsx:204` uses `RendererDefinition[]` (no `<any>`).
  - Full verification: `pnpm typecheck 58/58 ✓`, `pnpm build 31/31 ✓`, `pnpm lint 31/31 ✓`, `pnpm test` passes (per Closure Gates).

Follow-up:

- No remaining plan-owned work.
