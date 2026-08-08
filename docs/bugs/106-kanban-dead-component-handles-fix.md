# 106 Kanban Dead Component Handles Fix

## Problem

The kanban design doc declared seven `component:*` capability handles
(`scrollToCard` / `scrollToColumn` / `addCard` / `removeCard` / `moveCard` /
`collapseColumn` / `getData`), but **zero** were registered in code: invoking
any `component:*` handle at runtime resolved to nothing. The documented
`component:addCard` usage in `docs/components/kanban/example.json:40,74` was
dead — the component was the only scheduling-family member without handle
registration (gantt and calendar both register).

## Diagnostic Method

- Hard part: "declaration is contract" (phantom contract) — the docs
  promised capabilities the code never implemented, and nothing fails loudly;
  the handles simply never resolve.
- Cross-checked the design doc's handle list against the component's
  registration surface: `rg "componentRegistry|ComponentHandle|register\\("`
  in `kanban-board.tsx` returned zero hits.
- Compared with the family standard: gantt (`gantt.tsx:303-345`) and calendar
  (`calendar.tsx:194-252`) both register through `useCurrentComponentRegistry`.
- Decisive evidence: zero registration sites + example.json usage of
  `component:addCard` + family precedent = confirmed phantom contract.

## Root Cause

- `kanban-board.tsx` never registered a `ComponentHandle`, so the seven
  documented `component:*` capabilities were unreachable at runtime — the
  docs declared, the code was silent.

## Fix

- Registered the seven handles via `useCurrentComponentRegistry` following the
  gantt/calendar pattern (`kanban-board.tsx`), and added the
  `componentCapabilityContracts` entry to the kanban definition in
  `scheduling-renderer-definitions.ts`. `component:addCard` (and siblings)
  now resolve through the registry; `kanban-handle.ts` exposes the typed
  handle surface.

## Tests

- `packages/flux-renderers-scheduling/src/kanban/kanban-handle.test.tsx`
  (test-first, red before the fix): handle invoke behavior —
  `component:addCard` etc. resolvable through the registry; controlled-mode
  `onCardAdd` gating asserted through the handle path.

## Affected Files

- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`
- `packages/flux-renderers-scheduling/src/kanban/kanban-handle.ts`
- `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`

## Notes For Future Refactors

- Docs-declared `component:*` capabilities are contracts: every handle in
  design.md must have a registration site and a test that invokes it.
- When adding a new component with capabilities, register the handle in the
  same plan as the doc update — the "document first, implement later" pattern
  is how dead handles accumulate.
