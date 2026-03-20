# Development Log

## Purpose

Use this file for short dated notes about:

- what document was added or updated
- what design decision was made
- what work is planned next
- small context that is useful to remember later but does not belong in a formal architecture doc

This file is intentionally lightweight.

- keep entries short
- prefer reverse chronological order
- link to the main doc or code path when possible
- do not treat this file as the source of truth for architecture contracts

## Entries

### 2026-03-20 (Bug Analysis)

- Completed frontend bug analysis across all packages. Found 5 confirmed runtime bugs.
- **Bug #1 (HIGH)**: ArrayEditor/KeyValue dual-state desync — `useState` initialized once, external `reset()`/`setValue()` doesn't update local state. Failing tests: `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 (HIGH)**: `submit()` no concurrent guard — rapid double-click fires two API calls. Failing test: `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 (MEDIUM-HIGH)**: `validateForm()` calls `store.setErrors(fieldErrors)` which destructively replaces entire errors map, wiping errors for paths not in traversal. Tests: `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- **Bug #4 (MEDIUM)**: `remapArrayFieldState` makes 5+ independent store updates causing intermediate state visible to `useSyncExternalStore` subscribers.
- **Bug #5 (MEDIUM)**: Table `key={index}` fallback causes row state misalignment on sort/delete.
- Key decision: complex fields must NOT maintain parallel local state; read from store only.
- Next step: implement fixes for Bug #1 and #2, starting with dual-state sync.

### 2026-03-20

- Fixed `checkbox-group` value handling so arrays no longer round-trip through JSON strings in `packages/amis-renderers-form/src/renderers/input.tsx` and `packages/amis-renderers-form/src/field-utils.tsx`.
- Added regression coverage for non-string checkbox-group values and plain-scope updates in `packages/amis-renderers-form/src/index.test.tsx` and recorded the defect note in `docs/bugs/05-checkbox-group-value-type-drift-fix.md`.
- Key decision: shared field handlers must preserve typed values because array-valued controls cannot safely share a string-only update pipeline.
- Next step: audit other multi-value renderers for hidden coercion paths before reusing generic field helpers.

- Fixed `checkbox-group` shared field handling so array values are passed through without JSON stringification in `packages/amis-renderers-form/src/renderers/input.tsx`.
- Added regression coverage for form and plain-scope checkbox-group updates, including non-string option values, in `packages/amis-renderers-form/src/index.test.tsx`.
- Key decision: shared field handlers now accept typed values so array-valued controls do not drift into string payloads on either the form or scope update path.
- Next step: if more multi-value controls are added, reuse the typed handler path instead of introducing serializer-specific glue.

- Added `docs/analysis/framework-debugger-design.md` as the first framework-level debugger design draft.
- Confirmed the debugger should live in a separate package, proposed as `@nop-chaos/amis-debugger`.
- Confirmed the main integration boundary should be the `SchemaRenderer` host layer rather than a specific renderer package.
- Recorded the recommended debugger shape: `window` global switch, floating draggable panel, hide-to-launcher behavior, and a left-bottom launcher entry.
- Identified the first key event groups for the debugger: `compile`, `render`, `action`, `api`, `notify`, and `error`.
- Planned next implementation direction: create the package skeleton, add controller and timeline event model, then wire the first version into `apps/playground/src/App.tsx`.
- Created the first `packages/amis-debugger/` package skeleton, including workspace package metadata, TypeScript configs, and alias wiring.
- Implemented a first debugger controller with `env` decoration, plugin hooks, timeline event storage, and root action error capture.
- Added a floating debugger panel with tabs for `overview`, `timeline`, and `network`, plus pause, clear, hide, and left-bottom launcher behavior.
- Wired the playground to the new debugger package and removed the old local right-side activity panel from `apps/playground/src/App.tsx`.
- Verified the first version with `pnpm --filter @nop-chaos/amis-debugger typecheck`, `pnpm --filter @nop-chaos/amis-playground typecheck`, `pnpm --filter @nop-chaos/amis-debugger build`, and `pnpm --filter @nop-chaos/amis-playground build`.
- Extended the debugger design and implementation direction to support AI-first diagnostics through structured automation APIs instead of UI scraping.
- Added automation-facing concepts to the design: `queryEvents`, `getLatestError`, `waitForEvent`, `createDiagnosticReport`, and `window`-level debugger hub access.
- Updated the package API plan so the debugger can serve both human operators and AI agents during automatic diagnosis and guided debugging.
- Next likely step: add focused tests for debugger event collection and refine API response summaries so the network tab shows more useful payload metadata.
