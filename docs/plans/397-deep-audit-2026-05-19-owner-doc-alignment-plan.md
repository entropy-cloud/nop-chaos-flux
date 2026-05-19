# 397 Deep Audit 2026-05-19 Owner-Doc Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `16-01` 与 `16-02`：让 renderer-runtime owner docs 回到 live baseline。

## Current Baseline

- `useCurrentImportFrame` docs 缺 public/internal surface adjudication。
- `useScopeSelector` docs 漏 `paths` 选项。

## Goals

- 修复 `16-01` 与 `16-02`。
- 让 renderer-runtime docs 回到 current supported baseline。

## Non-Goals

- 不处理 naming or cross-package i18n findings。

## Scope

### In Scope

- `16-01`, `16-02`
- `docs/architecture/renderer-runtime.md`
- any related reference docs if needed
- `docs/logs/2026/05-19.md`

### Out Of Scope

- code changes unless required to verify current baseline

## Execution Plan

### Phase 1 - Sync Renderer-Runtime Owner Docs

Status: completed
Targets: owner docs and live baseline references

- Item Types: `Fix | Proof`
- [x] Update `renderer-runtime.md` for `useCurrentImportFrame` public/internal adjudication.
- [x] Add the missing `useScopeSelector.paths` option to the docs.

Exit Criteria:

- [x] `16-01` and `16-02` are fixed.
- [x] Repo-observable proof shows the docs match the live baseline.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] `docs/architecture/renderer-runtime.md` is synced to the live baseline.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.

## Closure

Status Note: Completed. Landed code/doc alignment for the active hook surface. `useCurrentImportFrame` is now treated as part of the public root `@nop-chaos/flux-react` hook surface because the live repo exports it from the root entry and from `rendererHooks`; `useScopeSelector` docs and `RendererHookApi` now include the supported `paths` option.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: `pnpm --filter @nop-chaos/flux-react exec vitest run src/__tests__/public-surface.test.ts src/__tests__/schema-renderer-strictmode-form.test.tsx` passed; package-level `typecheck` passed; the closure audit confirmed docs and live exports now agree.
