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

### 2026-03-21

- Finished the `@nop-chaos/amis-debugger` entry-point refactor so `packages/amis-debugger/src/controller.ts` is now the single controller implementation and `packages/amis-debugger/src/index.tsx` is a thin re-export layer.
- Added the missing controller-level exports for `installAmisDebuggerWindowFlag()` and `createAmisDiagnosticReport()` so package consumers keep the same public API after the split.
- Key decision: keep diagnostics, redaction, panel UI, types, and controller assembly in separate modules, but preserve the existing top-level package surface from `packages/amis-debugger/src/index.tsx`.
- Continued the split by extracting controller assembly dependencies into `packages/amis-debugger/src/store.ts`, `packages/amis-debugger/src/controller-helpers.ts`, `packages/amis-debugger/src/automation.ts`, and `packages/amis-debugger/src/adapters.ts`.
- Key decision: keep `controller.ts` focused on orchestration while moving event-store state, window/bootstrap helpers, environment decoration, plugin hooks, and automation hub wiring into dedicated modules.
- Added focused module tests in `packages/amis-debugger/src/store.test.ts`, `packages/amis-debugger/src/automation.test.ts`, and `packages/amis-debugger/src/adapters.test.ts` to cover store state transitions, automation delegation/window registration, and adapter-level event capture/redaction behavior.
- Key decision: keep the high-level integration coverage in `packages/amis-debugger/src/index.test.ts` while adding small module tests for the newly extracted files instead of over-expanding the single integration suite.
- Added pure helper coverage in `packages/amis-debugger/src/controller-helpers.test.ts` and `packages/amis-debugger/src/redaction.test.ts` so window-config parsing, network summary shaping, session id formatting, and redaction edge cases are checked directly.
- Key decision: keep pure functions under direct unit tests so future refactors can change controller composition without weakening behavior checks for config parsing and data masking.
- Added direct diagnostics coverage in `packages/amis-debugger/src/diagnostics.test.ts` for event query matching, overview aggregation, node diagnostics, interaction traces, redacted session export, and empty-report fallback behavior.
- Key decision: test `diagnostics.ts` at the pure-function level so AI-facing query/report/export semantics stay stable even if controller wiring changes again.
- Next step: if we extend AI diagnostics further, add tests for any new correlation heuristics at this same pure diagnostics layer before wiring them into the controller.

### 2026-03-20 (Bug Fixes)

- Extended Bug #1 coverage and fix scope: `array-editor` and `key-value` now resync local state from plain scope updates as well as managed form updates.
  - Files: `packages/amis-renderers-form/src/renderers/array-editor.tsx`, `packages/amis-renderers-form/src/renderers/key-value.tsx`, `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
  - Docs: `docs/bugs/06-array-editor-key-value-dual-state-fix.md`
  - Key decision: dual-state renderers must subscribe to whichever source of truth is active (`form.store` or scope), not just the form path.
- Tightened Bug #3 semantics: `validateForm()` now includes side-effect validation errors in its returned `errors`/`fieldErrors`, so `submit()` cannot pass while the store still contains validation failures.
  - Files: `packages/amis-runtime/src/form-runtime.ts`, `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
  - Docs: `docs/bugs/08-validate-form-destructive-error-merge-fix.md`
  - Key decision: end-of-pass error merges must keep store state and returned validation results consistent, not just preserve external paths in the store.
- Corrected Bug #2 semantics: duplicate `submit()` calls now return `cancelled` instead of a normal error so guarded re-clicks do not masquerade as business failures in action chains or monitor output.
  - Files: `packages/amis-runtime/src/form-runtime.ts`, `packages/amis-runtime/src/index.test.ts`, `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
  - Docs: `docs/bugs/07-submit-concurrent-guard-fix.md`
  - Key decision: guarded duplicate submits share the project's existing cancelled-action semantics instead of introducing a new failure mode.
- **Bug #1 Fixed**: ArrayEditor/KeyValue now subscribe to form store via `useCurrentFormState` with deep equality. External `reset()`/`setValue()` properly syncs to local state.
  - Files: `packages/amis-renderers-form/src/renderers/array-editor.tsx`, `packages/amis-renderers-form/src/renderers/key-value.tsx`
  - Tests: 4 passing in `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 Fixed**: `submit()` now checks `store.getState().submitting` and rejects concurrent calls.
  - File: `packages/amis-runtime/src/form-runtime.ts:248`
  - Test: 1 passing in `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 Fixed**: `validateForm()` uses merge (`{...existing, ...fieldErrors}`) instead of replacement for error map.
  - File: `packages/amis-runtime/src/form-runtime.ts:177`
  - Tests: 5 passing in `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- All 117 tests pass (75 runtime + 42 form). Typecheck/lint pass for changed packages.
- Note: `amis-debugger` has pre-existing typecheck failures unrelated to these changes.

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
- Added `packages/amis-debugger/src/index.test.ts` to cover event querying, diagnostic report generation, async event waiting, and global automation hub registration.
- Added a playground-facing reminder that AI tooling can read `window.__NOP_AMIS_DEBUGGER_API__` and `window.__NOP_AMIS_DEBUGGER_HUB__` directly.
- Added structured network summaries to debugger events so AI can read request/response shape without parsing free-form strings.
- Added node-level diagnostics aggregation to the debugger API so AI can inspect one node's recent render/action/api/error history in one call.
- Added a visible AI debug script example card in the playground to demonstrate how agents can call the debugger API from the browser context.
- Added higher-level AI automation APIs for interaction tracing and session export so agents can capture one diagnostic chain or the whole current debugger state as JSON.
- Expanded debugger tests to cover `getInteractionTrace()` and `exportSession()` behavior.
- Added configurable redaction support for exported debugger payloads so AI can analyze structure without leaking obvious secrets.
- Kept exported session data useful by preserving request/response shape metadata while masking sensitive values in `exportedData`.
- Started splitting `packages/amis-debugger/src/index.tsx` into dedicated modules for shared types, diagnostics helpers, redaction logic, and the floating panel UI to reduce the monolithic package entry.
- Next likely step: add focused tests for debugger event collection and refine API response summaries so the network tab shows more useful payload metadata.
