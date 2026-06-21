# Project Context

## Purpose

The static project baseline an AI agent needs before doing useful work: identity, technical stack, verification commands, and documentation freshness. Update in place. Do not create dated copies.

This file intentionally does **not** track "what is being worked on right now". That is found by scanning unfinished plans in `docs/plans/` (the goal-driver's SCAN_PLANS step does exactly this). Keeping high-churn active-work state here makes the file hard to maintain and prone to staleness.

## Project Identity

- Project name: `nop-chaos-flux`
- Product type: AMIS low-code renderer, modern rewrite (a schema-driven React rendering + compilation runtime)
- Primary users: application builders consuming the Flux DSL; framework developers extending renderers/actions
- Documentation freshness: `partially stale` <!-- fresh | partially stale | stale | unknown -->

**Freshness gating:**

- If freshness is `stale` or `unknown`, agents may research, audit, and draft alignment docs, but must not implement product behavior until the baseline is re-established or a human confirms intended behavior.
- If freshness is `partially stale`, agents may implement only slices whose owner doc, codebase-map route, and touched code area have been verified fresh; otherwise treat the slice as `plan-first`.
- AI may not mark stale docs fresh without human confirmation or human-approved owner-doc evidence.

## Current Technical Baseline

- Frontend stack: React 19 + React Compiler, TypeScript 6.0, Vite 8, Zustand (vanilla stores via `use-sync-external-store`)
- Build/monorepo: pnpm workspace + turbo; packages under `packages/` as `@nop-chaos/<name>`
- Styling: Tailwind v4, shadcn/ui (`@nop-chaos/ui`), CSS variables (no React ThemeProvider)
- Testing: Vitest (unit), Playwright (e2e under `tests/e2e/`)
- Key layer chain: `flux-core` → `flux-formula` → `flux-compiler` → `flux-action-core` → `flux-runtime` → `flux-react` → `flux-renderers-*`

## Verification Commands

| Purpose                  | Command                                    |
| ------------------------ | ------------------------------------------ |
| Install dependencies     | `pnpm install`                             |
| Run playground           | `pnpm dev`                                 |
| Typecheck (all packages) | `pnpm typecheck`                           |
| Typecheck (one package)  | `pnpm --filter @nop-chaos/<pkg> typecheck` |
| Build (all)              | `pnpm build`                               |
| Unit tests (all)         | `pnpm test`                                |
| E2E tests                | `pnpm test:e2e`                            |
| Lint (all)               | `pnpm lint`                                |
| Repo-wide static checks  | `pnpm check`                               |

## Optional Layers Currently In Use

- [x] `docs/discussions/`
- [ ] `docs/audits/`
- [x] `docs/testing/`
- [x] `docs/skills/`
- [x] `docs/analysis/`
- [ ] `docs/retrospectives/` (use `docs/lessons/` instead)
- [x] `docs/lessons/`

## AI Block Conditions

AI MUST stop and wait for human input before proceeding when:

- a change touches a Protected Area (see `ai-autonomy-policy.md`) with no owner doc describing expected behavior
- a change alters the public export surface of `@nop-chaos/ui` or any package `src/index.ts` without a plan
- verification commands above are observed to fail and the failure is not yet understood

## Notes For AI Agents

- **Current work in progress**: inspect unfinished plans in `docs/plans/` (status not `completed`), not this file.
- AI autonomy defaults to `implement`; it is gated by freshness (above) and Protected Areas (`ai-autonomy-policy.md`). No per-slice autonomy value is maintained here.
- AI may correct factual context from live repo evidence, but must not mark stale docs fresh or downgrade protected areas without human confirmation.
- Do not report verification success while a command is still failing.
