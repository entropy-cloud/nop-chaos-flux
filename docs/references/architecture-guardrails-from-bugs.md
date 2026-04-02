# Architecture Guardrails From Historical Bugs

## Purpose

This reference consolidates recurring regression patterns from `docs/bugs/` into actionable guardrails.

It is a secondary execution-oriented companion.
Primary architecture intent still lives in `docs/architecture/`.

## How To Use

- Use architecture docs for design boundaries and ownership.
- Use this file for anti-pattern detection, review checklists, and regression test hints.
- When a new bug reveals a repeatable architecture-level failure mode, add a new guardrail entry here and update the corresponding architecture doc summary.

## Guardrails

### 1) Reactive Render Reads Must Subscribe

Rule:
- Render-time reactive data access must use selector/subscription APIs.
- Imperative reads can be used in event/command paths, not as reactive render dependencies.

Why:
- Non-subscribed reads cause stale UI and missing re-renders.

Bug evidence:
- `docs/bugs/22-spreadsheet-integration-test-scope-reactive-read-fix.md`
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`

Primary architecture anchors:
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`

### 2) Render Phase Must Be Side-Effect Free

Rule:
- Do not call store writers or state setters during React render.
- Buffer values and flush in effect phase when synchronization is required.

Why:
- Render-phase writes trigger warnings and can cause timing-dependent behavior.

Bug evidence:
- `docs/bugs/15-render-nodes-setstate-during-render-fix.md`

Primary architecture anchors:
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/performance-design-requirements.md`

### 3) Scope Identity And Parent-Child Reactivity Must Be Stable

Rule:
- Avoid unnecessary scope recreation in fragment/dialog paths.
- Child scopes that depend on parent data must preserve parent change notifications.

Why:
- Scope identity churn resets local state; broken parent notifications cause stale dialog/fragment views.

Bug evidence:
- `docs/bugs/03-fragment-scope-identity-form-reset-fix.md`
- `docs/bugs/04-dialog-scope-stale-render-fix.md`
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`

Primary architecture anchors:
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`

### 4) Mutating Async Methods Need Explicit Concurrency Policy

Rule:
- Every mutating async entrypoint must define concurrency strategy (reject, dedupe, or queue).
- Intentionally skipped calls should return consistent cancelled semantics.

Why:
- Uncontrolled overlap causes duplicate writes and inconsistent loading flags.

Bug evidence:
- `docs/bugs/07-submit-concurrent-guard-fix.md`

Primary architecture anchors:
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/performance-design-requirements.md`

### 5) Tailwind v4 Monorepo Scanning Must Be Verifiable

Rule:
- `@source` coverage and relative paths must be validated from the CSS file location.
- Keep semantic marker classes used by tests/integration contracts.

Why:
- Missing or wrong `@source` fails silently and produces partial styling with no build error.

Bug evidence:
- `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`
- `docs/bugs/18-tailwind-source-wrong-relative-path-flux-lib-unscanned.md`

Primary architecture anchors:
- `docs/architecture/styling-system.md`
- `docs/architecture/theme-compatibility.md`

### 6) No Build Artifacts In Source Directories

Rule:
- Do not emit `.js`, `.d.ts`, or `.js.map` into `packages/*/src/` (except intentional source exceptions).
- Keep artifact checks in CI to prevent source shadowing during tests.

Why:
- Resolver precedence can silently run stale generated files instead of current TypeScript source.

Bug evidence:
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`

Primary architecture anchors:
- `docs/architecture/frontend-baseline.md`

## Review Checklist

Use this quick checklist in reviews for high-risk changes:

- Reactive UI reads are subscription-based, not imperative snapshots.
- No render-phase setter/store writer calls.
- Scope recreation is intentional and lifecycle-safe.
- Mutating async calls define overlap behavior.
- Tailwind scanning config is path-verified in monorepo contexts.
- Source directories remain artifact-free.

## Related Docs

- `docs/index.md`
- `docs/references/maintenance-checklist.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/security-design-requirements.md`
- `docs/architecture/performance-design-requirements.md`
