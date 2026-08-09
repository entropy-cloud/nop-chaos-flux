# Project Context

## Purpose

The static project baseline an AI agent needs before doing useful work: identity, technical stack, verification commands, and documentation freshness. Update in place. Do not create dated copies.

This file intentionally does **not** track "what is being worked on right now". That is found by scanning unfinished plans in `docs/plans/` (the goal-driver's SCAN_PLANS step does exactly this). Keeping high-churn active-work state here makes the file hard to maintain and prone to staleness.

## Project Identity

- Project name: `nop-chaos-flux`
- Product type: AMIS low-code renderer, modern rewrite (a schema-driven React rendering + compilation runtime)
- Primary users: application builders consuming the Flux DSL; framework developers extending renderers/actions
- Documentation freshness: `fresh` <!-- fresh | partially stale | stale | unknown -->
  - **DV full-green 实测基线（2026-08-09，`docs/plans/2026-08-08-2034-2-round2-dv-full-verification.md`，`--force` 零缓存执行，取代 2026-08-06 CV 基线）**：`pnpm typecheck`/`build`/`lint`（32/32，0 cached）、`pnpm test`（59/59 task，**10,703 passed / 0 failed**——CV 基线 10,397 + D3.x/DR 回归 306）全绿；`pnpm test:e2e` **1086 passed / 43 skipped / 3 failed（3 failed 全数落入 watch-only 终态清单：gantt-perf ×2 + kanban-perf ×1，主屏 50.00Hz rAF 50fps 上限致 60Hz 阈值不可达，需 60Hz 环境最终确认——w3d-editor/c3-5 ×2/ai-attachments 已 closed（DR bug 117 + D2 复核））**；component-lab **336/0**（Tiptap ×2 已由 DR bug 117 修复）、smoke+navigation **111/111**、host-surfaces **133/0**（30 spec 覆盖）；`pnpm check` exit 0（28 项 `check:*` 27/28 exit 0 + `check:duplicates:detail` 非门禁归因（jscpd dump 固有 exit 1）+ oversized 仅 2 条既有 locale 豁免）、`pnpm test:scripts` 6/15 全绿（harness `testTimeout: 30_000`，DV 裁决；DG 门禁升级后 6/18 全绿，2026-08-09）。**component-audit round-2 mission 状态：D0/D1/D2/DB/DL/D3.1–D3.4/DR/DV/DG 全部 `done`（37 张 host 面审计卡 closed，汇总索引 `docs/audits/round2-index.md`；guard 沉淀 `docs/lessons/` 06–10；checklist v2 §6 host 模板节；门禁升级 `check:audit-event-dispatch-ctx` 覆盖 14 个 renderer 包（2026-08-09 DG 扩展，committed 回归测试 6 用例先红后绿，全仓零命中））**。**工具治理轮次（plan `2026-08-09-0444-1`，2026-08-09）：扫描器注释/字符串盲区修复（styling/performance/broad-scope/react19/async，committed 回归测试 12 条先红后绿，`styles.css:110` 假阳性消失，全量复扫零新增命中）+ test-global-leaks const 容器识别校准（仅变异容器 + 泛型构造器，47 基线 + 11 landed 零悬挂）+ test-support 隐式 hook 显式化（form-advanced `installFormAdvancedTestHooks()` + 79 importer 迁移，6 模块 keep-with-reason）+ host 包覆盖 Proof（D3.1 闭合）；`pnpm test:scripts` **7 files/30 tests 全绿\*\*，`pnpm check` exit 0 维持。
  - **industrial-hmi mission 状态（feat-industrial-hmi 分支合并带入）**：C0 编排基线已建立（2026-08-02，`docs/plans/2026-08-02-2043-1-c0-orchestration-baseline.md`，组件审计路线图见 `docs/backlog/component-audit-roadmap.md`）。**industrial scada e2e 残留收口（2026-08-09，plan `docs/plans/2026-08-09-0121-1`）**：HCA-CV deferred 的 8 scada e2e 失败已消减 5（demo click/dblclick/hover×2 + perf:155 TE-1，经 2 Fix：scada-canvas ready 占位 DIV pointer-events 拦截 + use-scada-engine width/height effect container-driven DOM sizing），6 scada e2e 现 32 pass / 2 watch-only residual（edge line geometric + edge polygon leafer-render-timing，out-of-scope）。

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
