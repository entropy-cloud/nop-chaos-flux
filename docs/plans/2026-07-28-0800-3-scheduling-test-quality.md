# 3 Scheduling Test Quality Remediation

> Plan Status: active
> Last Reviewed: 2026-07-28
> Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
> Related: `docs/plans/2026-07-28-0800-2-convention-async-api-remediation.md`

## Purpose

Fix 2 P1 findings in the scheduling package test infrastructure: mocked integration boundaries that mask defects, and E2E tests that assert structural presence instead of correct rendering.

## Current Baseline

- **D14-01 P1** — `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx:6-35`: All 4 interaction hooks (`useGanttDrag`, `useGanttLinkDraw`, `useGanttScroll`, `useGanttKeyboard`) AND 3 `@nop-chaos/flux-react` hooks are mocked. Tests verify component shell presence only. Matches the pattern from bug #71 where mocked integration boundaries masked 12 P0s.
- **D14-05 P1** — `tests/e2e/calendar-demo.spec.ts:48-59`: Calendar event test uses conditional assertion that silently passes if no events render. Kanban E2E does not test drag-and-drop. Calendar allows 100 console errors.

## Goals

- Add at least one integration test per scheduling component using `createSchemaRenderer` with realistic schema asserting DOM output
- Add E2E assertions for specific bar positions/counts (Gantt), card drag-reorder (Kanban), event block count/position (Calendar)
- Remove blanket console error suppression in Calendar E2E

## Non-Goals

- Do not rewrite all scheduling unit tests
- Do not address D14-02 (calendar layout tests assert implementation values) — P2, track in backlog
- Do not address the `allowConsoleErrors(100)` in `diff-perf.spec.ts` — P3

## Scope

### In Scope

- Gantt: add integration test with `createSchemaRenderer` + realistic schema, assert DOM output
- Kanban: add integration test with `createSchemaRenderer` + realistic schema, assert DOM output
- Calendar: add integration test with `createSchemaRenderer` + realistic schema, assert DOM output
- Calendar E2E: add assertions for event block count/position, remove blanket `allowConsoleErrors(100)`
- Gantt E2E: add assertions for bar positions/counts
- Kanban E2E: add drag-and-drop card reorder assertion

### Out Of Scope

- Barcode input integration tests (P2 D14-09)
- Test-global leak suspects (P2 D14-03, D14-04)
- Tooling gap for test-global leaks (P2 D14-10)
- Calendar layout unit test refactoring (P2 D14-02)

## Test Strategy

Tier: `必须自动化`. Test quality and integration boundaries are the core of this plan.

## Execution Plan

### Phase 1 — Scheduling Integration Tests (Unit Level)

Status: planned
Targets: `packages/flux-renderers-scheduling/src/`

- Item Types: `Fix | Proof`

- [ ] Gantt: add integration test using `createSchemaRenderer` with a realistic Gantt schema, assert DOM contains expected bar elements
- [ ] Kanban: add integration test using `createSchemaRenderer` with a realistic Kanban schema, assert DOM contains expected card elements
- [ ] Calendar: add integration test using `createSchemaRenderer` with a realistic Calendar schema, assert DOM contains expected event blocks

Exit Criteria:

- [ ] Each scheduling component has at least one integration test that exercises `createSchemaRenderer` and asserts DOM output
- [ ] All new tests pass without mocking scheduling interaction hooks

### Phase 2 — Scheduling E2E Assertion Accuracy

Status: planned
Targets: `tests/e2e/`

- Item Types: `Fix | Proof`

- [ ] calendar-demo.spec.ts: Replace conditional assertion that silently passes with specific event block count/position assertions
- [ ] calendar-demo.spec.ts: Remove `allowConsoleErrors(100)` and use `assertTrackedPageErrors(page)` pattern
- [ ] Gantt E2E: Add assertions for specific bar positions and counts
- [ ] Kanban E2E: Add drag-and-drop card reorder test with position assertion

Exit Criteria:

- [ ] Calendar E2E fails when events fail to render (no silent pass)
- [ ] Calendar E2E does not blanket-suppress console errors
- [ ] Gantt E2E asserts bar positions
- [ ] Kanban E2E asserts card reorder result

## Draft Review Record

- Reviewer / Agent: current mission_driver (fresh sub-agent)
- Verdict: pass
- Rounds: 1
- Findings addressed:
  - **Blocker**: D14-06 removed from Follow-up Backlog — it was listed as "outside scope" while Phase 2 directly addresses `allowConsoleErrors(100)`. Resolved by removing the duplicate entry.

## Closure Gates

- [ ] All 3 scheduling components have integration tests with DOM assertions
- [ ] All scheduling E2E tests assert specific rendered content
- [ ] Calendar E2E no longer uses `allowConsoleErrors(100)`
- [ ] `pnpm typecheck && pnpm build` passes
- [ ] `pnpm test` passes (unit + integration)
- [ ] E2E tests pass (`npx playwright test` on scheduling specs)
- [ ] Independent closure audit (fresh sub-agent) completed

## Deferred But Adjudicated

_None._

## Non-Blocking Follow-ups

_None (all P2 items tracked in follow-up backlog)._

## Follow-up Backlog

The following P2 findings from open audits are outside scope of this plan. They are recorded here for traceability, each with source audit path.

### Compile-Once Pattern (P2 sibling violations)

- [ ] **D09-03** — `flux-renderers-form/src/renderers/form.tsx:143-145` reads `templateNode.schemaUrl` at runtime. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D09-04** — Test-support files use `props.schema.name` fallback reads. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`

### API Surface Cleanup (D03)

- [ ] **D03-02** — flux-react/unstable re-exports stable `@nop-chaos/flux-runtime` APIs. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-03** — flux-renderers-data leaks `createCrudNormalizedSourceContext`. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-04** — flux-renderers-basic exposes `copyToClipboard` utility. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-05** — flux-renderers-content exposes internal `sanitizeHtml`. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-06** — flux-react stable barrel re-exports flux-runtime functions. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-07** — form-advanced `as RendererDefinition[]` cast loses generics. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D03-08** — flux-renderers-data `export *` leaks internal functions. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`

### Test Coverage & Quality (D14)

- [ ] **D14-02** — calendar layout tests assert implementation values, not rendered layout. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D14-03** — 28 files with module-top mutable `let` leaking state across tests. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D14-04** — 16 patches across 10 files without cleanup. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D14-09** — barcode-scanner-overlay missing integration test. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D14-10** — 48 test-global-leak suspects unenforced; graduate to lint gate. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`

### React Best Practices (D09)

- [ ] **D09-08** — textarea-renderer uses `useEffect` for synchronous `scrollHeight` measurement; should be `useLayoutEffect`. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **useLayoutEffect needed** — `textarea-renderer.tsx:71` + `use-auto-scroll.ts:53`. Source: `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`
- [ ] **4 redundant React.memo instances** under React Compiler. Source: `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`
- [ ] **200+ redundant useCallback/useMemo** under React Compiler (systemic, evaluate). Source: `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`

### Doc-Code Consistency (D16)

- [ ] **D16-01** — `form-validation.md:575` `ValidationContributor` reference points to wrong file. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **D16-02** — `renderer-runtime.md:472` `RendererDefinition` field references wrong file. Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`
- [ ] **ComponentCapabilities missing `getDebugData`** — `action-scope-and-imports.md:287-296` missing field from `component-handle-core.ts:37-46`. Source: `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`
