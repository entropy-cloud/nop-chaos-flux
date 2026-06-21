# Codebase Map

## Purpose

A compact map of the live repo so agents do not rediscover structure each session. Update in place when entry points, common routes, or fragile files change.

## Entry Points

| Area                | Path                                     | Notes                                                       |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Playground app      | `apps/playground/`                       | Main dev surface; `pnpm dev` runs it                        |
| Package sources     | `packages/*/src/index.ts`                | Every package has a single source entry                     |
| Type lookup (quick) | `docs/references/quick-reference.md`     | Compressed types/hooks/store APIs — read this before source |
| Renderer interfaces | `docs/references/renderer-interfaces.md` | Contract index by name                                      |
| Workspace aliases   | `vite.workspace-alias.ts`                | Maps `@nop-chaos/*` to `packages/*`                         |
| E2E tests           | `tests/e2e/`                             | Playwright specs; config `playwright.config.ts`             |

## Common Change Routes

| Task type                  | Start here                                            | Then check                                              | Verify                                |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| Add/change a renderer      | `docs/architecture/renderer-runtime.md`               | `docs/references/renderer-implementation-guidelines.md` | `pnpm --filter @nop-chaos/<pkg> test` |
| Change form/validation     | `docs/architecture/form-validation.md`                | `docs/references/form-validation-runtime-types.md`      | typecheck + test                      |
| Change styling/markers     | `docs/architecture/styling-system.md`                 | `docs/architecture/renderer-markers-and-selectors.md`   | visual review + e2e                   |
| Change package boundaries  | `docs/architecture/flux-runtime-module-boundaries.md` | `docs/architecture/frontend-baseline.md`                | `pnpm typecheck && pnpm build`        |
| Add/change an action/event | `docs/architecture/action-scope-and-imports.md`       | `docs/architecture/renderer-runtime.md`                 | typecheck + test                      |
| Flow/Report/Word designer  | `docs/architecture/<family>/design.md`                | `docs/architecture/<family>/config-schema.md`           | e2e                                   |

## Large Or Fragile Files

| Path                                                     | Risk                                    | Preferred approach                                        |
| -------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `packages/flux-react/src/node-renderer-resolved.tsx`     | Uses `'use no memo'` — hand-memoized    | Do not strip its memoization; React Compiler is opted out |
| `packages/flux-react/src/render-nodes.tsx`               | Uses `'use no memo'`                    | Same as above                                             |
| `packages/flux-renderers-basic/src/dynamic-renderer.tsx` | Uses `'use no memo'`                    | Same as above                                             |
| `apps/playground/src/styles.css` (`@source` directive)   | Tailwind v4 monorepo content scan       | See `docs/bugs/14-*`; adding packages requires `@source`  |
| Any `packages/*/src/index.ts`                            | Public export surface — Protected Area  | `ask-first`; keep exports deliberate                      |
| `packages/flux-core/src/` (compiler)                     | Core compilation/scope — Protected Area | `plan-first`; owner doc `docs/architecture/flux-core.md`  |

## Update Rule

Add a row whenever you discover an entry point, route, or fragile file that cost you time to find. Missing paths, placeholders, or live contradictions here mean: **verify live before relying on the row.**
