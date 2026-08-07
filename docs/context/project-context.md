# Project Context

## Purpose

The static project baseline an AI agent needs before doing useful work: identity, technical stack, verification commands, and documentation freshness. Update in place. Do not create dated copies.

This file intentionally does **not** track "what is being worked on right now". That is found by scanning unfinished plans in `docs/plans/` (the goal-driver's SCAN_PLANS step does exactly this). Keeping high-churn active-work state here makes the file hard to maintain and prone to staleness.

## Project Identity

- Project name: `nop-chaos-flux`
- Product type: AMIS low-code renderer, modern rewrite (a schema-driven React rendering + compilation runtime)
- Primary users: application builders consuming the Flux DSL; framework developers extending renderers/actions
- Documentation freshness: `fresh` <!-- fresh | partially stale | stale | unknown -->
  - **CV full-green 实测基线（2026-08-06，`docs/plans/2026-08-06-0329-2-cv-full-verification.md`，`--force` 新鲜执行）**：`pnpm typecheck`（32/32）、`pnpm build`（32/32）、`pnpm lint`（32/32）、`pnpm test`（59/59 task，**10,397 passed / 0 failed**）全绿；`pnpm test:e2e` **1054 passed / 43 skipped / 6 failed（6 failed 全部为 watch-only 归因清单：c3-5 Tiptap 批次 ×2、w3d-editor、gantt-perf/kanban-perf（本机主屏 50.00Hz，rAF 50fps 上限致阈值不可达）、ai-attachments 瞬时负载 flake——clean HEAD stash 同值复现，零悬空）**；component-lab 334/1/2（2 failed 即 Tiptap 已知批次）、smoke+navigation 111/111、各族 host-surfaces 42/42。**component-audit mission 状态：C0–C9 + CX-1..CX-12 + CR + CV + CG 全部 `done`（113 张审计卡 closed；guard 沉淀见 `docs/audits/per-component/pc-index.md`、`docs/lessons/` 02–05、`component-audit-checklist.md` v2；工具基线新增 `check:audit-renderer-browser-io`、`check:audit-event-dispatch-ctx`（2026-08-06，事件派发 ctx 全量扫描 plan `2026-08-06-2306-1` 落地，已并入 `pnpm check` 聚合，基线零命中 + 7 条原生 DOM 转发 allowlist））**。`pnpm check` 既有 pre-existing red 集：`check:oversized-code-files` **exit 0（2026-08-07 治理债收口：08-06 登记 14 个超限文件 → 0421-3 拆 2 → live 12 全部落定——10 拆 ≤700 行 + 2 豁免（`flux-i18n/src/locales/en-US.ts`/`zh-CN.ts`，`check:i18n-keys` 内联解析契约），见 `docs/logs/2026/08-07.md` plan `2026-08-07-1053-1`）**；`check:workspace-manifest-deps` exit 0（0529-1 已清零，原 5 条 ERROR 不再在案）。历史：C0 基线（2026-08-02）770 passed / 43 skipped / 9 pre-existing failed 已被 CV full-green 取代；audit-remediation 管线（M0→MV）2026-07-28 收尾。

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
- [x] `docs/audits/`
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
