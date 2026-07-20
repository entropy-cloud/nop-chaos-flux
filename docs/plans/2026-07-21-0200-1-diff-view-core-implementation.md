# Diff-view Standard Implementation (S9.1–S9.7, S9.9, S10.5)

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/components/roadmap-scheduling.md`, `docs/components/diff-view/design.md`
> Related: `docs/plans/2026-07-21-0200-2-diff-view-three-column-compare.md`

## Purpose

Implement the standard diff-view renderer in `@nop-chaos/flux-renderers-content`: unified-diff parsing, syntax highlighting, character-level inline diff, split/unified dual views, hunk expand/collapse, virtual scrolling, view switch animation, content debounce, and a playground demo page. Deliver a complete two-pane text comparison component.

## Current Baseline

- `docs/components/diff-view/design.md` — design doc exists covering all S9 items, including §11 file structure, §12.1 three-column (v3), §12.2 cross-file (v4)
- `docs/components/diff-view/example.json` — example schema exists
- `packages/flux-renderers-content/` — existing package; no `diff-view/` directory yet
- `apps/playground/src/pages/` — no `diff-demo.tsx` yet
- S9.1–S9.9 on roadmap are all `proposed`; no code exists
- No `diff-match-patch` or `lowlight` dependency in `flux-renderers-content/package.json`
- Scheduling roadmap S0–S8 all `done`; S9 is the next unstarted phase

## Goals

- Deliver a complete two-pane (split + unified) diff-view renderer with syntax highlighting, inline diffs, hunk folding, virtual scrolling for large files, and view switch animation
- Register the renderer in `@nop-chaos/flux-renderers-content` and the Flux renderer registry
- Create a `diff-demo` playground page covering core props, view switching, and events
- Move S9.1–S9.7, S9.9 from `proposed` to `done` on the scheduling roadmap
- Move S10.5 from `proposed` to `done`

## Non-Goals

- Three-column compare (S9.8) — covered by successor plan `2026-07-21-0200-2-diff-view-three-column-compare.md`
- Cross-file diff list (design doc §12.2) — v4, out of scope
- Inline annotations/widgets system — deferred per design doc §12
- Gantt/Kanban/Calendar/Barcode changes — not part of this plan
- Common date-utils extraction or other non-diff-view cross-cutting

## Scope

### In Scope

- S9.1: `DiffFile` data model + GNU unified diff parser (`model/diff-file.ts`, `model/diff-parse.ts`)
- S9.2: Syntax highlighting via `lowlight` with 50-entry cache (`adapters/syntax-highlight.ts`)
- S9.3: Character-level inline diff via `diff-match-patch` (`model/diff-inline.ts`)
- S9.4: Split-view and unified-view React containers (`components/diff-split-view.tsx`, `components/diff-unified-view.tsx`)
- S9.5: Hunk expand/collapse controller with `defaultCollapsedLines` threshold (`components/diff-hunk.tsx`)
- S9.6: Virtual scrolling with `virtualizationThreshold=500` (`components/diff-virtual-list.tsx`)
- S9.7: Split↔unified view switch CSS Grid transition 150ms ease-out
- S9.9: 150ms debounce on `oldContent`/`newContent` change triggering re-parse + re-highlight
- S10.5: `apps/playground/src/pages/diff-demo.tsx` with SchemaRenderer, registered in playground domain routing
- Add `diff-view` type to `content-renderer-definitions.ts`, `schemas.ts`, and `index.ts`
- Add `diff-match-patch`, `lowlight`, and `@tanstack/react-virtual` dependencies to `flux-renderers-content/package.json`
- Update `docs/components/roadmap-scheduling.md` S9/S10 status after delivery
- Pre-rendered HTML template strategy (`diff-template.ts`) with XSS-safe escaping via inline `escapeHtml()` utility
- React.memo on DiffLine (by content + type + inline diff tokens) and DiffHunk (by index + isHidden)

### Out Of Scope

- Three-column compare (Plan 2)
- Cross-file diff navigation
- Annotation/widget system
- iCal/timezone integration
- Performance baseline measurement for diff-view
- Playwright e2e tests for diff-view (deferred to test-enhancement plan)

## Failure Paths

| Trigger                                  | Behaviour                                                                       | Retry | User Visible                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- |
| `oldContent` === `newContent`            | Show empty-diff state: grey background + "No changes" text                      | N/A   | Empty diff view                                                 |
| Invalid/malformed unified diff input     | Gracefully fall back to side-by-side raw text with all lines marked as context  | N/A   | Both panes show identical content with no highlighting          |
| `lowlight` fails/language not found      | Skip syntax highlighting; show plain diff with only add/delete/context coloring | N/A   | No syntax coloring, line types still visible                    |
| `diff-match-patch` throws on large input | Catch + fall back to line-level diff; inline highlight suppressed               | N/A   | Missing char-level inline highlights; line-level diff preserved |
| 5000-line diff file                      | Virtual scrolling activates at 500-line threshold; only visible rows render     | N/A   | Smooth scrolling with fixed 24px row height                     |

## Test Strategy

**建议有测** — core model functions (parse, inline diff, stats) get focused unit tests; rendering and interaction through playground demo page. Virtual scrolling behavior validated by manual inspection.

## Execution Plan

### Phase 1 — Pure Logic Layer: Model, Parser, Inline Diff, Syntax Highlight

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/model/`, `adapters/`, `utils/`

- Item Types: `Fix | Proof`

- [x] Add `diff-match-patch`, `lowlight`, and `@tanstack/react-virtual` to `packages/flux-renderers-content/package.json`
- [x] Implement `model/diff-file.ts` — `DiffFile` data model with `DiffHunk`, `DiffLine` types (add/delete/context), line number mapping
- [x] Implement `model/diff-parse.ts` — GNU unified diff parser, input string → `IRawDiff[]` (reference: git-diff-view parser)
- [x] Implement `model/diff-inline.ts` — character-level inline diff via `diff-match-patch`, produces token arrays for template rendering
- [x] Implement `adapters/syntax-highlight.ts` — lowlight adapter with 50-entry LRU cache, `highlight(language, code) → HTML`
- [x] Implement `utils/diff-template.ts` — pre-rendered HTML template generator with XSS-safe escaping (write `escapeHtml()` inline utility; the existing `sanitize.ts` is a DOMPurify-based full HTML sanitizer, not an HTML escaper)
- [x] Implement `utils/diff-stats.ts` — diff statistics (added/removed line counts)
- [x] Unit tests: parse → IRawDiff round-trip for known unified diff input, inline diff token correctness, stats accuracy

Exit Criteria:

- [x] `model/diff-file.ts`, `diff-parse.ts`, `diff-inline.ts` compile with `pnpm --filter @nop-chaos/flux-renderers-content typecheck`
- [x] Unit tests for parse + inline diff + stats pass (focused `pnpm --filter @nop-chaos/flux-renderers-content test`)
- [x] `lowlight`, `diff-match-patch`, and `@tanstack/react-virtual` are listed in `package.json` dependencies and resolve

### Phase 2 — Core React Rendering: Split/Unified Views, Hunk Fold, Gutter, Header

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/components/`

- Item Types: `Fix`

- [x] Implement `diff-view-renderer.tsx` — main renderer component wired to schema props via RendererComponentProps pattern
- [x] Implement `DiffViewSchema` in `schemas.ts` (type: `diff-view`, fields per design §4)
- [x] Register `diff-view` type in `content-renderer-definitions.ts` with fields, defaultSchema, and DiffViewRenderer component
- [x] Export `DiffViewSchema`, `DiffViewRenderer` from `index.ts`
- [x] Implement `components/diff-split-view.tsx` — two-pane grid with old (left) + new (right), `data-view="split"` marker
- [x] Implement `components/diff-unified-view.tsx` — single-column with alternating add/delete/context rows, `data-view="unified"` marker
- [x] Implement `components/diff-line.tsx` — renders a single diff line from pre-rendered HTML template via `dangerouslySetInnerHTML`, React.memo on content + type + inline tokens reference
- [x] Implement `components/diff-gutter.tsx` — line number column (old/new paired in split, single column in unified), `data-slot="diff-gutter"`
- [x] Implement `components/diff-hunk.tsx` — expand/collapse controller, `defaultCollapsedLines` threshold, `data-slot="diff-hunk-header"`, `data-expanded="true|false"`
- [x] Implement `components/diff-header.tsx` — file header with stats (changed lines count)
- [x] Wire `utils/diff-template.ts` into `diff-line.tsx` rendering — generate plainTemplate/syntaxTemplate for each diff line type

Exit Criteria:

- [x] `diff-view` type compiles and integrates into content-renderer-definitions
- [x] Split view shows old/new side-by-side with correct line numbers; unified view shows single column
- [x] Hunk fold/collapse toggles on long unchanged blocks (`defaultCollapsedLines`)
- [x] Syntax highlighting visible when `language` prop is set; absent when unset
- [x] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` passes

### Phase 3 — Virtual Scrolling, View Switch Animation, Content Debounce

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/components/`

- Item Types: `Fix | Follow-up`

- [x] Implement `components/diff-virtual-list.tsx` — `virtualizationThreshold=500` lines; under threshold uses full DOM render, over threshold uses `FixedSizeList` with fixed 24px row height
- [x] Integrate virtual list into split/unified view containers
- [x] Implement view switch animation: CSS Grid `grid-template-columns: 1fr 1fr ↔ 1fr` with 150ms ease-out transition, `data-view` marker swap
- [x] Implement hunk expand/collapse animation: `max-height` + `opacity` 200ms ease-in-out with `overflow: hidden`
- [x] Wire 150ms debounce in `diff-view-renderer.tsx` on `oldContent`/`newContent`/`language` changes: `useEffect` + `setTimeout`/`clearTimeout` pattern (not `useMemo`, which is a memoization hook, not a debouncing mechanism)
- [x] DOM markers per design §10: `data-diff-type`, `data-diff-inline`, `data-diff-gutter`, `data-slot`, root `nop-diff-view` class

Exit Criteria:

- [x] Virtual scrolling component created with `virtualizationThreshold=500`
- [x] `data-view` attribute switches between `"split"` and `"unified"` on view toggle
- [x] View switch transition style set as column width animation (~150ms)
- [x] Hunk expand/collapse animation style set (~200ms)
- [x] Debounce prevents re-render on rapid oldContent/newContent changes
- [x] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` passes

### Phase 4 — Playground Demo Page + Roadmap Update

Status: completed
Targets: `apps/playground/src/pages/diff-demo.tsx`, `docs/components/roadmap-scheduling.md`

- Item Types: `Fix | Follow-up`

- [x] Create `apps/playground/src/pages/diff-demo.tsx` — use SchemaRenderer with `example.json` schema, add interactive controls for `viewType`, `showInlineDiff`, `showLineNumbers` toggles
- [x] Register `diff-demo` route in playground domain routing (following pattern from `gantt-demo`, `kanban-demo`, etc.)
- [x] Update `docs/components/roadmap-scheduling.md`: set S9.1–S9.7, S9.9 to `done`, S10.5 to `done`
- [x] Run `pnpm typecheck` and `pnpm build` to verify workspace integrity
- [x] Update `docs/context/project-context.md` freshness note if needed (freshness already `partially stale`, not changed by this plan)

Exit Criteria:

- [x] Playground page wired at diff-demo route with SchemaRenderer and interactive controls
- [x] View type toggle (split↔unified) wired to interactive controls on the playground page
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes (0 errors, 1 known warning for react-virtual)
- [x] Roadmap S9 status reflects `done` for in-scope work items
- [x] `docs/logs/` updated at `docs/logs/2026/07-21.md`

## Draft Review Record

- Reviewer / Agent: `ses_07f573f0dffesXs4Rza0icKG4C` (round 1), `ses_07f551820ffeRBidD98yJ7ax5q` (round 2)
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - Major 1: Added `@tanstack/react-virtual` dependency to Phase 1 items and Exit Criteria
  - Major 2: Replaced `useMemo` debounce with `useEffect` + `setTimeout`/`clearTimeout` pattern
  - Major 3: Replaced `sanitize.ts` reference with inline `escapeHtml()` utility
  - Minor: Updated In Scope summary to match fixes (added `@tanstack/react-virtual`, replaced `sanitize.ts` with `escapeHtml()`)

## Closure Gates

- [x] All in-scope confirmed live defects fixed
- [x] All in-scope confirmed contract drifts converged
- [x] Diff-view renders both split and unified modes, with virtual scrolling, inline diff, syntax highlighting, and hunk fold
- [x] Exposed schema fields match design doc §4
- [x] DOM markers match design doc §10
- [x] No in-scope live defect or contract drift silently degraded to deferred/follow-up
- [x] `docs/components/diff-view/design.md` is consistent with live implementation (no owner-doc drift)
- [x] `docs/components/roadmap-scheduling.md` S9.1–S9.7, S9.9, S10.5 status updated to `done`
- [x] By independent sub-agent (fresh session) executed closure audit with evidence recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Inline annotation/widget system

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Annotations are explicitly deferred in design doc §12; not needed for standard diff display
- Successor Required: `no`

### Playwright E2E tests for diff-view

- Classification: `optimization candidate`
- Why Not Blocking Closure: Unit tests + playground demo provide sufficient verification for initial delivery; full e2e coverage belongs in a dedicated test-enhancement plan
- Successor Required: `no`

## Non-Blocking Follow-ups

- Diff-view could potentially share `date-utils` or other cross-cutting code with Gantt's date tools, but no consumer exists yet

## Closure

Status Note: All 4 phases completed. Diff-view renderer fully implemented and registered. Playground demo page operational. Roadmap updated.

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session (closure auditor, no execution context)
- Evidence:
  - Live code: 17 files under `packages/flux-renderers-content/src/diff-view/` cover model, parser, inline diff, syntax highlighting, template rendering, stats, split/unified views, hunk fold, virtual list, gutter, header, and main renderer
  - Schema: `DiffViewSchema` in `schemas.ts` with fields matching design doc §4
  - Registration: `diff-view` type registered in `content-renderer-definitions.ts`, exported from `index.ts`
  - Playground: `apps/playground/src/pages/diff-demo.tsx` with interactive viewType/showInlineDiff/showLineNumbers controls
  - Roadmap: `docs/components/roadmap-scheduling.md` S9.1–S9.7, S9.9 → done, S10.5 → done
  - Daily log: `docs/logs/2026/07-21.md` records full implementation summary
  - Typecheck: `pnpm typecheck` ✓ (56/56)
  - Build: `pnpm build` ✓ (30/30)
  - Lint: `pnpm lint` ✓ (0 errors, 1 known warning for react-virtual)
  - Test: `pnpm --filter @nop-chaos/flux-renderers-content test` ✓ (193/193, 25 files)
  - Anti-hollow check: No empty function bodies; all components have real logic (parse, diff, highlight, template, render, virtual scroll, animation)

Follow-up:

- No remaining plan-owned work; deferred items (inline annotation/widget system, Playwright e2e tests) are correctly classified as out-of-scope/optimization-candidate
