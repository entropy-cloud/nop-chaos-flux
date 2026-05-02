# Single Owner Styling Defaults And Marker Contracts

## Purpose

This rule captures recurring drift where visual defaults are split across renderer code and CSS, or where semantic marker contracts become inconsistent or incomplete.

Use it when reviewing layout/widget renderer styling, marker classes, and package-owned default visual baselines.

## Scope

Apply this rule when code changes touch any of the following:

- layout renderer default styles
- package-owned CSS baselines such as default spacing
- renderer root marker classes or `data-slot` marker contracts
- styling-system or marker-selector architecture docs

## Required Pattern

### 1) Each shipped visual default baseline must have one explicit owner path

- Do not split one default visual behavior across hidden renderer-code fallbacks and package-owned CSS.
- If CSS owns the shipped default, renderer code must not silently reintroduce a second fallback baseline.
- Marker classes are semantic hooks, not an excuse for ad-hoc hidden style injection.

Review checks:

- Search for renderer code injecting fallback layout styles that duplicate documented CSS ownership.
- Trace the final default baseline to one explicit owner path.
- Update docs when ownership moves.

### 2) Marker contracts must stay complete and mechanically checkable

- Renderer roots must provide the semantic markers their owner docs promise.
- Do not let marker families drift between old class names, partial migration states, and undocumented replacements.
- If markers change, tests/docs/selectors must move together.

Review checks:

- Compare live renderer roots against documented marker expectations.
- Search for stale selectors in tests/docs after marker migrations.
- Prefer marker conventions that can be verified mechanically.

## Allowed Exceptions

- Widget renderers may own internal layout styles as part of the widget design, as long as the owner docs define that boundary explicitly.
- Temporary compatibility selectors may survive during migration only if they are clearly documented as transitional.

## Review Checklist

- One explicit owner path defines each shipped default visual baseline.
- Renderer code does not silently reintroduce fallback styling that conflicts with CSS-owned defaults.
- Documented root markers exist in live code.
- Tests/docs/selectors move together when marker contracts change.

## Evidence From This Repository

- `docs/plans/179-container-default-gap-contract-successor-plan.md`
- `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/10-styling.md`

## Primary Architecture Anchors

- `docs/architecture/styling-system.md`
- `docs/architecture/renderer-markers-and-selectors.md`
