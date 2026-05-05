# Playground Experience Design

## Purpose

This document defines the target product and information architecture for `apps/playground`.

It answers two questions:

- how the playground should organize scenarios and navigation
- how the debugger should behave as a tool layered onto the playground rather than consuming the main work area by default

`docs/architecture/debugger-runtime.md` owns the debugger's runtime/API/event model. This file owns the playground-side UX and scenario-organization contract.

## Current Code Anchors

- `apps/playground/src/App.tsx`
- `apps/playground/src/route-model.ts`
- `apps/playground/src/use-route.ts`
- `apps/playground/src/component-lab/component-lab-page.tsx`
- `apps/playground/src/component-lab/renderer-lab-registry.ts`
- `apps/playground/src/pages/home-page.tsx`
- `packages/nop-debugger/src/panel.tsx`

## Design Position

The playground is not a single giant demo page.

The playground is a navigation hub plus a set of stable scenario pages.

The debugger is not the default primary surface. It is a launcher-first floating tool that can expand into a panel when the user needs it.

## Core Rules

1. The playground home page is a navigation surface, not a scenario dump.
2. Each scenario page should have one clear testing theme.
3. URLs should stably identify the current page or lab selection.
4. Scenario pages should be usable for both manual inspection and automated verification.
5. The debugger should default to launcher/minimized form rather than occupying the main work area.

## Page Model

### Home Page

The home page owns only:

- showing the available scenario families
- explaining what each family is for
- routing the user into the right page

It should not directly embed complex form, table, designer, or debugger scenarios.

### Scenario Pages

Each scenario page should focus on one theme such as:

- shared renderer lab
- Flow Designer
- Report Designer
- Debugger Lab
- Action Scope / Imports
- other domain-specific host pages

The point is not that a page contains only one renderer. The point is that one page has one primary validation story.

Performance-focused scenario pages may expose same-environment comparative measurements, but they must describe the supported baseline honestly. For the current `performance-table` page, the baseline is a 1000-row dataset rendered through a paged visible table plus optional additive stress blocks; it is not a universal 1000-visible-row benchmark harness.

## Route Model

### Hash-Based Route Baseline

`apps/playground` uses a hash-based route model backed by `window.location.hash` and `hashchange` events.

This satisfies the stable-URL requirement without introducing a router dependency.

Route spec types (`RouteSpec` in `apps/playground/src/route-model.ts`):

| Hash            | Route Kind     | Description                                                       |
| --------------- | -------------- | ----------------------------------------------------------------- |
| `#/`            | `home`         | Playground home navigation hall                                   |
| `#/lab`         | `lab`          | Component Lab shell (no renderer selected)                        |
| `#/lab/<id>`    | `lab-renderer` | Component Lab with a specific renderer selected                   |
| `#/<domain-id>` | `domain`       | Existing domain host pages (flow-designer, report-designer, etc.) |

The `useRoute` hook in `apps/playground/src/use-route.ts` reads and writes the hash and exposes a stable `navigate(spec)` callback.

### Route Inventory

The route inventory is code-backed in `apps/playground/src/route-model.ts`:

- `ALL_SHARED_RENDERER_ROUTES` — the current shared renderer inventory. Each entry carries: `id`, `title`, `category`, `sourcePackage`, `description`.
- `DOMAIN_RENDERER_ROUTES` — the current domain host page inventory.
- `parseRoute(hash)` and `buildRoute(spec)` — the canonical serialization pair. Tests in `apps/playground/src/route-matrix.test.ts` verify round-trip stability for all routes.

The inventory is cross-checked against the live renderer registries by `route-matrix.test.ts` so adding a new renderer without updating the inventory will be caught automatically.

## Component Lab

The Component Lab shell (`apps/playground/src/component-lab/component-lab-page.tsx`) provides:

- left-side navigation listing all shared renderers grouped by category
- per-renderer preview area driven by `RENDERER_LAB_REGISTRY`
- one focused lab page per renderer under `apps/playground/src/component-lab/renderers/`
- behavioral scenarios for composite controls such as `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view`

This page is the canonical shared-renderer verification surface.

## Debugger UX Contract

The debugger should use a three-state product model:

- `disabled` — debugger fully hidden
- `launcher` — compact floating launcher visible
- `panel` — expanded debugger panel visible

Rules:

- default visible state should be `launcher`, not full panel
- expanding should preserve the user's chosen anchor/positioning model
- minimizing should return to launcher, not fully disappear
- the debugger should not consume the main work area by default

## Implementation Constraints

### Playground Side

- `app.tsx` should remain a route host, not a giant scenario page
- major scenario families should live in dedicated page modules
- example-shell styling may live in `apps/playground/src/styles.css`
- reusable renderer/domain visuals must follow their package-owned contracts rather than depending on playground-only styling

### Debugger Side

- launcher is a first-class debugger UI state
- minimize/expand semantics should be explicit in the product language
- launcher and panel positioning should be stable enough for repeated manual testing
- playground hosts may keep the debugger launcher available while separately disabling high-frequency performance capture; the host boundary must make that choice explicit rather than forcing normal pages to pay render instrumentation cost

## Why This Design

Benefits:

- clearer scenario ownership
- less cross-theme noise in debugging sessions
- stable deep links for screenshots, bug reports, and automation
- easier addition of new renderer labs and domain pages
- debugger no longer competes with the main content area by default

## Automation Coverage

`apps/playground/src/route-matrix.test.ts` provides:

- route parse/build round-trip tests for all route kinds
- live registry alignment: verifies `ALL_SHARED_RENDERER_ROUTES` covers every registered type in the basic/form/data registries
- lab registry coverage: verifies every route entry has a corresponding `RENDERER_LAB_REGISTRY` component
- domain inventory completeness: verifies the current domain pages remain registered

## Related Documents

- `docs/architecture/debugger-runtime.md`
- `docs/architecture/frontend-baseline.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/references/maintenance-checklist.md`
