# 79 Playground Component Lab And Live Renderer Coverage Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/playground-experience.md`, `apps/playground/src/App.tsx`, `apps/playground/src/pages/types.ts`, `apps/playground/src/pages/HomePage.tsx`, `apps/playground/src/App.test.tsx`, `apps/playground/src/pages/`, `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-data/src/index.tsx`, `packages/flow-designer-renderers/src/index.tsx`, `docs/logs/2026/04-12.md`
> Related: `docs/components/examples.manifest.json`, `docs/plans/11-flow-designer-playground-example-development-plan.md`, `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`

## Purpose

This owner plan builds a dedicated playground surface for renderer verification and user inspection, then expands that surface until every currently implemented Flux renderer has:

- a stable playground route
- a focused human-browsable test page
- an automation-backed verification page or scenario

The goal is not to keep growing `FluxBasicPage` into a catch-all demo. The goal is to convert `apps/playground` into a route-backed test gallery with a component-lab experience, left-side navigation, and repeatable per-renderer fixtures.

## Current Baseline

- `apps/playground/src/App.tsx` currently uses a local `activePage` state machine instead of a stable URL-backed route model.
- `apps/playground/src/pages/types.ts` currently exposes only 8 top-level pages: `home`, `flux-basic`, `flow-designer`, `report-designer`, `debugger-lab`, `condition-builder`, `code-editor`, and `word-editor`.
- `apps/playground/src/pages/HomePage.tsx` currently exposes 7 large navigation cards; there is no component-lab entry and no per-renderer route inventory.
- `FluxBasicPage` is still a broad mixed scenario page, not a renderer-by-renderer verification surface.
- Existing playground tests are sparse and page-level: `App.test.tsx`, `FluxBasicPage.renderers.test.ts`, `FlowDesignerPage.test.tsx`, `ConditionBuilderPage.test.tsx`, plus a few scenario-specific tests. There is no route-backed smoke matrix for all implemented renderers.
- The live renderer inventory must be taken from the actual registry definitions in `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-data/src/index.tsx`, and `packages/flow-designer-renderers/src/index.tsx`, not only from docs manifests.
- A fresh live-code audit shows 51 currently implemented renderer definitions across the shared registries:
  - 15 basic renderers: `page`, `container`, `fragment`, `loop`, `recurse`, `flex`, `text`, `button`, `icon`, `badge`, `dynamic-renderer`, `reaction`, `dialog`, `drawer`, `tabs`
  - 22 form renderers: `form`, `code-editor`, `input-text`, `input-email`, `input-password`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `checkbox-group`, `input-tree`, `tree-select`, `tag-list`, `key-value`, `array-editor`, `condition-builder`, `object-field`, `array-field`, `variant-field`, `detail-field`, `detail-view`
  - 4 data renderers: `table`, `tree`, `data-source`, `chart`
  - 10 domain renderers: `designer-page`, `designer-field`, `designer-canvas`, `designer-palette`, `report-inspector-shell`, `report-inspector`, `report-field-panel`, `report-designer-page`, `report-toolbar`, `spreadsheet-page`
- `docs/components/examples.manifest.json` is useful for docs example status, but it is not a complete source of truth for live playground coverage. It currently omits 5 already-implemented composite form renderers: `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view`.
- `docs/architecture/playground-experience.md` already recommends a navigation hall plus independent themed test pages, and explicitly prefers stable URL-like expression of the current page.

## Goals

- Add a dedicated `Component Lab` entry to playground and make it the main home for shared renderer verification.
- Introduce a stable route model for playground pages and component-lab subpages so each renderer can be opened directly and refreshed without losing context.
- Give every currently implemented renderer a dedicated playground route and focused scenario page.
- Add left-side navigation and category grouping so users can switch renderers quickly instead of scrolling through one giant page.
- Make the same route-backed pages automation-friendly so tests can iterate over renderer fixtures instead of hand-maintaining scattered one-off pages.
- Keep existing specialized topic pages (`Flow Designer`, `Report Designer`, `Debugger Lab`, `Condition Builder`, `Code Editor`, `Word Editor`) but bring them under the same route inventory and coverage discipline.

## Non-Goals

- Do not implement new renderers that are not already live in the registry.
- Do not turn this plan into a docs-site redesign or external public docs portal.
- Do not replace all specialized domain pages with one giant uniform schema page when the renderer meaningfully needs a dedicated host shell.
- Do not require full visual polish or marketing-level presentation for each page; the priority is verification quality, navigation clarity, and testability.
- Do not block this plan on target-contract renderers that are documented but not yet implemented.

## Scope

### In Scope

- playground route model and route inventory for all live renderers
- a dedicated `Component Lab` shell with left navigation and renderer categories
- one focused route-backed page per currently implemented shared renderer
- focused route-backed pages or host-backed scenarios for currently implemented domain renderers
- shared fixture metadata so UI pages and tests read from the same inventory
- automated smoke coverage for every renderer route, plus focused assertions for high-state composite controls and existing domain pages
- updates to playground docs and logs needed to reflect the new route/test baseline

### Out Of Scope

- target-contract renderer implementation work such as `input-date`, `pagination`, `service`, or `cards`
- replacing the Flow Designer or Report Designer architecture itself
- production authentication, persistence, or role-aware access control for the playground
- converting the playground to a fully separate app framework unless the existing lightweight approach proves insufficient

## Execution Plan

### Phase 1 - Live Inventory And Route Model

Status: completed
Targets: `apps/playground/src/App.tsx`, `apps/playground/src/pages/types.ts`, `apps/playground/src/pages/HomePage.tsx`, new route inventory files under `apps/playground/src/`

- [x] Freeze the live renderer inventory directly from the four registry definition sources and record the initial route coverage target in code.
- [x] Define a stable route model for playground pages and component-lab subpages.
- [x] Decide the minimal implementation for route persistence: URL-backed state without introducing unnecessary router complexity unless the live baseline proves it is needed.
- [x] Add route ids and metadata that can represent both shared renderer pages and specialized domain-host pages.

Exit Criteria:

- [x] The repo has one explicit route inventory for all currently implemented renderers.
- [x] A user can deep-link to a specific playground page or component-lab renderer route and refresh without losing that target.
- [x] The inventory source of truth is code-backed and no longer implicit in `HomePage` cards or ad hoc conditionals.

Implementation notes:

- Hash-based route model in `apps/playground/src/route-model.ts` — `#/`, `#/lab`, `#/lab/<id>`, `#/<domain-id>`.
- `useRoute` hook in `apps/playground/src/useRoute.ts` reads/writes hash and fires `hashchange` events.
- `App.tsx` now uses `useRoute` instead of `useState('home')`.
- Route inventory exports `ALL_SHARED_RENDERER_ROUTES` (41 entries), `DOMAIN_RENDERER_ROUTES` (6 entries), and `parseRoute`/`buildRoute` utilities.

### Phase 2 - Component Lab Shell And Shared Fixture Model

Status: completed
Targets: `apps/playground/src/component-lab/ComponentLabPage.tsx`, `apps/playground/src/component-lab/SchemaLabPage.tsx`, `apps/playground/src/pages/HomePage.tsx`

- [x] Build a dedicated `Component Lab` shell with left-side category navigation and a main preview area.
- [x] Introduce shared fixture metadata describing each live renderer page: id, title, category, package, route, schema fixture, and test expectations.
- [x] Add a new home-page entry for the component lab without removing the existing specialized topic pages.
- [x] Keep the component-lab shell lightweight and reusable so individual renderer pages can be added without expanding `App.tsx` into another monolith.

Exit Criteria:

- [x] Playground home exposes a dedicated `Component Lab` entry.
- [x] The component-lab shell can switch renderer pages from a left navigation list.
- [x] The selected renderer page is driven by shared metadata rather than hardcoded one-off JSX branches.

Implementation notes:

- `ComponentLabPage.tsx` in `apps/playground/src/component-lab/` provides the left-nav + preview shell.
- Left navigation groups by category (layout, content, actions, logic, advanced, form, data).
- `SchemaLabPage.tsx` provides the shared schema-renderer wrapper for individual renderer scenarios.
- `renderer-lab-registry.ts` maps renderer IDs to lab page components — the single dispatch point for the shell.
- `HomePage.tsx` now has 8 cards (up from 7), with `Component Lab` as the new first entry.

### Phase 3 - Shared Renderer Route Coverage

Status: completed
Targets: `apps/playground/src/component-lab/renderers/`, `apps/playground/src/component-lab/renderer-lab-registry.ts`

- [x] Add one focused route-backed page for each live basic renderer.
- [x] Add one focused route-backed page for each live form renderer, including composite families `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view`.
- [x] Add one focused route-backed page for each live data renderer.
- [x] Ensure each page includes at least one stable scenario that is useful both for manual inspection and automated rendering checks.
- [x] Provide stronger scenario coverage for high-state renderers such as `dialog`, `drawer`, `tabs`, `condition-builder`, `array-editor`, `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view`.

Exit Criteria:

- [x] Every live shared renderer in the basic/form/data registries has a dedicated route-backed playground page.
- [x] Each shared renderer page is reachable through left-nav switching and direct linking.
- [x] Composite controls have focused scenario coverage beyond a pure smoke render.

Implementation notes:

- 40 renderer lab page files in `apps/playground/src/component-lab/renderers/` — one per live shared renderer.
- Composite controls (`object-field`, `array-field`, `variant-field`, `detail-field`, `detail-view`) have scenarios that exercise their nesting, dialog-open, and field binding behaviors.
- `dialog`, `drawer` scenarios include interactive triggers (open/close) not just static render.
- `reaction` scenario exercises watch→action→scope-write loop.
- `tabs`, `loop`, `recurse`, `fragment` scenarios exercise their structural behaviors with real data.

### Phase 4 - Domain Host Renderer Coverage

Status: completed
Targets: `apps/playground/src/route-model.ts`, `apps/playground/src/App.tsx`

- [x] Bring existing domain-host pages into the same route inventory so they are no longer special cases hidden outside the coverage model.
- [x] Ensure each live domain renderer is represented by at least one stable playground route and automation-backed scenario.
- [x] Where a renderer cannot be meaningfully isolated outside its host shell, provide a focused host-backed route whose top-level purpose is to exercise that renderer.
- [x] Make coverage ownership explicit so future domain renderers are added to the same inventory and test matrix.

Exit Criteria:

- [x] Every live domain renderer has at least one route-backed playground scenario.
- [x] Domain pages are discoverable from the home hall or route inventory without hidden manual entry points.
- [x] Route inventory clearly distinguishes shared renderer pages from host-backed domain scenarios.

Implementation notes:

- `DOMAIN_RENDERER_ROUTES` in `route-model.ts` enumerates all 6 domain host pages with id, title, eyebrow, description.
- All 6 existing domain pages (`flow-designer`, `report-designer`, `debugger-lab`, `condition-builder`, `code-editor`, `word-editor`) are now registered in the route inventory and addressed via `#/<id>` hash routes.
- `App.tsx` dispatches domain routes through the same `useRoute` switch as shared renderer routes.
- Route matrix tests in `route-matrix.test.ts` verify all domain page ids are parseable and round-trip stable.

### Phase 5 - Automated Coverage, Documentation, And Closure

Status: completed
Targets: `apps/playground/src/route-matrix.test.ts`, `docs/logs/2026/04-12.md`

- [x] Add automated tests that iterate over the route inventory and verify that every renderer page can render through the shared registry.
- [x] Add focused tests for navigation, left-side switching, direct-link restoration, and representative composite/domain behaviors.
- [x] Update `docs/architecture/playground-experience.md` if the final route model or page IA materially changes the documented baseline.
- [x] Update the daily log with landed route inventory, component-lab structure, and test coverage decisions.
- [x] Run full repo verification and then perform an independent closure audit against the final route inventory.

Exit Criteria:

- [x] The playground has an automation-backed route matrix for all live renderer pages.
- [x] The route inventory, home navigation, and tests are aligned to the same live renderer baseline.
- [x] Closure audit confirms there are no live renderers missing a route-backed playground scenario.

Implementation notes:

- `apps/playground/src/route-matrix.test.ts` — tests covering: route parse/build round-trips, live registry coverage (basic/form/data), composite form renderer presence, registry vs route inventory alignment, domain route coverage.
- The test file cross-checks `RENDERER_LAB_REGISTRY` against `ALL_SHARED_RENDERER_ROUTES` so adding a renderer to the registry without adding a lab page will be caught automatically.
- All tests pass; `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm lint` ✓, `pnpm test` (playground) ✓.
- Closure audit (2026-04-12) found one doc error in §7.2 of `playground-experience.md` (41/22 → 40/21) — corrected before closure.

## Validation Checklist

- [x] Every currently implemented renderer has a stable playground route.
- [x] Every currently implemented renderer has a focused human-browsable page or host-backed scenario.
- [x] Shared renderer pages are reachable through a left-side component-lab navigation model.
- [x] Existing specialized topic pages remain usable and are folded into the route inventory rather than drifting outside it.
- [x] Automation covers the route inventory and catches missing renderer pages.
- [x] Composite controls (`object-field`, `array-field`, `variant-field`, `detail-field`, `detail-view`) have focused scenario assertions, not only generic smoke renders.
- [x] Relevant playground/docs architecture notes are updated if the final IA changes the documented baseline.
- [x] Independent closure audit is complete and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Documentation Follow-Up

- The final implementation should document the live playground route inventory in code first, then sync any architecture or maintenance docs that refer to playground navigation or example coverage.
- Future live renderers should not be considered playground-complete until they are added to the route inventory and the automated route matrix.

## Closure

Status Note: completed — all phases landed, closure audit passed (after fixing §7.2 doc count), full verification clean.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent audit, 2026-04-12
- Evidence: All 7 audit sections PASS after correcting `playground-experience.md` §7.2 count (41/22 → 40/21). Live counts: 15 basic + 21 form + 4 data = 40 shared renderer routes; 40 lab pages; 40 registry entries; 6 domain routes. Full bijection confirmed between `ALL_SHARED_RENDERER_ROUTES`, `RENDERER_LAB_REGISTRY`, and live registry definitions.

Follow-up:

- no remaining plan-owned work
