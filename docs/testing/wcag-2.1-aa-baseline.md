# WCAG 2.1 AA Baseline

> Status: current baseline (plan 780, roadmap PH-16)
> Scope: the standard the repository holds itself to for accessibility, the mechanical guarantees that enforce it today, the registered gaps, and the acceptance requirements for new renderers.
> This document is a **baseline standard + gap registry** — it deliberately does **not** claim repo-wide AA compliance (that claim needs the axe surface, roadmap PH-17, and the focus ledger, roadmap PH-18).

## Target and scope matrix

| Surface                                                                                    | WCAG 2.1 AA applicability                | Notes                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget renderers (`flux-renderers-*`, `ui`)                                                | Full target                              | Keyboard operability, labels, roles, focus visibility; Base UI primitives supply the ARIA/focus foundation.                                                                  |
| Layout renderers                                                                           | Limited (container semantics, landmarks) | No interactive behavior of their own; a11y comes from children.                                                                                                              |
| Canvas-heavy families (`flux-renderers-3d`, map, scada, flow-designer canvas, code-editor) | Partial + documented exemptions          | Inherently canvas/SVG surfaces; the wrapper chrome must stay accessible (enforced by `check:audit-canvas-wrapper-a11y-gaps`), in-canvas semantics are exempt with rationale. |
| Playground host pages                                                                      | Full target for demo pages               | The `console.error`-gate e2e fixtures and `eslint-plugin-jsx-a11y` cover them.                                                                                               |

## Mechanical guarantees today (each re-runnable)

| Guarantee                      | Command / file                                                                                                                                                                                                           | Live state (2026-10-27)                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| jsx-a11y lint rules            | `pnpm lint` → `eslint.config.js:161-165` — `click-events-have-key-events`, `no-static-element-interactions`, `no-autofocus`, `no-redundant-roles`, `label-has-associated-control` (all `error`; test files relax 4 of 5) | green                                                                        |
| Canvas wrapper a11y scanner    | `pnpm check:scanner-baselines` (ratchet; `find-canvas-wrapper-a11y-gaps` baseline 0, plan 754)                                                                                                                           | 0 hits                                                                       |
| Base UI primitives             | `packages/ui/package.json` (`@base-ui/react`)                                                                                                                                                                            | ARIA/focus foundation for overlays/menus                                     |
| Scheduling package WCAG 2.1 AA | `docs/plans/2026-07-21-0800-2-scheduling-accessibility-plan.md` (completed) + reaudit `2026-07-23-0000-1`                                                                                                                | package-level AA achieved (5 P0 keyboard blockers + 9 P1 + 10 P2 remediated) |
| aria coverage                  | `grep -l aria- packages apps -r --include=*.tsx`                                                                                                                                                                         | 538 `.tsx` files (2026-10-27; 517 on 10-19)                                  |

## Registered gaps

| Gap                                                                                                                                                                                                                                                                                                                                                                                                                              | Successor                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ~~No axe surface in the test pipeline~~ **landed (plan 781, 2026-10-27)**: `tests/e2e/a11y-axe-baseline.spec.ts` scans 7 representative routes (`@axe-core/playwright`, WCAG 2.1 A/AA tags) against a violation-count ratchet (`tests/e2e/__fixtures__/axe-baseline.json`). Registered stock violations: flux-basic 7, dashboard-demo 6, ai-widgets 1 (fixes belong to component owners); map-demo excluded (>120 s axe timeout) | closed; remaining gap: focus ledger → PH-18 |
| No repo-wide focus-management ledger (Base UI covers primitives; the renderer composition surface is unverified)                                                                                                                                                                                                                                                                                                                 | roadmap PH-18                               |
| No cross-package consistency check for aria contracts (aria-usage density varies 12–72 files per package without a semantic audit)                                                                                                                                                                                                                                                                                               | open; re-evaluate after PH-17/18            |

## Acceptance requirements for new renderers

1. Keyboard operability for every interactive state (the `jsx-a11y/click-events-have-key-events` lint rule is the mechanical floor; manual Tab/Enter walkthrough is the review expectation).
2. Form controls carry associated labels (`label-has-associated-control`).
3. No `autofocus`; no redundant roles; static-element interactions need explicit keyboard handlers.
4. Canvas-wrapper chrome stays accessible — the wrapper scanner must stay at 0.
5. Widget renderers follow the scheduling package's AA practice (keyboard-first interaction model, visible focus, labeled states) as the extracted rule set.

## Promoting the scheduling precedent

The scheduling plan's remediation pattern (P0 keyboard blockers first, then labeling/roles, then AA verification via automated + manual keyboard testing) is the template package-level audits follow. Repo-wide AA compliance is **not** claimed here; the promotion path is: axe surface (PH-17) → focus ledger (PH-18) → per-family audits against this baseline.
