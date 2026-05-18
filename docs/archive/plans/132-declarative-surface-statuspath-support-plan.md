# 132 Declarative Surface StatusPath Support Plan

> Plan Status: completed
> Last Reviewed: 2026-04-23
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`, `packages/flux-runtime/src/status-owner.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`
> Related: `docs/plans/129-detail-owner-and-surface-boundary-doc-alignment-plan.md`

## Purpose

为 declarative `type: 'dialog'` / `type: 'drawer'` 落地 live `statusPath` 支持，让它们在 renderer 路径上也能发布当前 surface summary，同时保持实现范围最小：不接入 `SurfaceRuntime`，不改 open-state 模型，只补齐现有 schema 已声明但当前未生效的能力。

## Current Baseline

- managed surface path (`openDialog` / `openDrawer`) 已通过 `SurfaceRuntime` 向 `statusPath` 发布 surface summary。
- declarative `dialog` / `drawer` renderer 已有 `statusPath` schema 字段，也已构造 `SurfaceStatusSummary`；本计划执行后，这条 renderer path 也会向 scope 发布 live summary。
- surface docs已经明确这两条路径是分开的，因此这次实现不应把 declarative renderers 强行迁移到 `SurfaceRuntime`。

## Goals

- 让 declarative `dialog` / `drawer` 的 `statusPath` 在 live renderer path 上真正生效。
- 让卸载/移除时写回 closed snapshot，而不是静默保留旧“open”状态。
- 保持实现最小，不扩大到 new surface runtime semantics。

## Non-Goals

- 不把 declarative `dialog` / `drawer` 接到 `SurfaceRuntime` / `DialogHost`。
- 不实现 declarative `data` own-scope 初始化。
- 不重做 dialog/drawer 的 controlled/uncontrolled open-state 模型。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/dialog.tsx`
- `packages/flux-renderers-basic/src/drawer.tsx`
- focused tests under `packages/flux-renderers-basic/src/__tests__/`
- `docs/architecture/surface-owner.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- `SurfaceRuntime` refactor
- declarative dialog/drawer own-scope/data support
- broader surface API redesign

## Execution Plan

### Phase 1 - Implement Declarative Status Publication

Status: completed
Targets: `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`

- [x] Published declarative surface summary to `statusPath` on the renderer path.
- [x] Published to `props.node.scope.parent ?? props.node.scope`.
- [x] Cleared by writing a closed snapshot on cleanup/unmount.

Exit Criteria:

- [x] Declarative `dialog` publishes `statusPath`.
- [x] Declarative `drawer` publishes `statusPath`.

### Phase 2 - Add Focused Tests And Sync Docs

Status: completed
Targets: focused tests, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`

- [x] Added focused tests covering declarative dialog/drawer `statusPath` publication.
- [x] Documented declarative `statusPath` as current live behavior while keeping the managed/declarative split.

Exit Criteria:

- [x] Tests prove declarative `statusPath` is live.
- [x] Docs no longer describe declarative `statusPath` as target-only.

### Phase 3 - Verification And Closure

Status: completed
Targets: verification commands, `docs/logs/2026/04-22.md`, this plan file

- [x] Ran focused tests plus required verification commands, and recorded unrelated workspace blockers outside this plan's scope.
- [x] Added a daily-log entry for the feature landing and closure outcome.
- [x] Ran an independent closure audit and recorded the evidence here.

Exit Criteria:

- [x] Focused in-scope verification is green.
- [x] Daily log and closure evidence are recorded.
- [x] No remaining plan-owned work remains; unrelated workspace verification failures are recorded as out of scope.

## Validation Checklist

- [x] Declarative `dialog` publishes `statusPath` summary.
- [x] Declarative `drawer` publishes `statusPath` summary.
- [x] Removal/unmount publishes a closed snapshot.
- [x] Focused tests cover the new behavior.
- [x] `pnpm typecheck` was rerun and the unrelated workspace blocker in `packages/flux-compiler/src/source-compiler.test.ts` is recorded below.
- [x] `pnpm build` was rerun and the unrelated workspace blocker in `packages/flux-compiler/src/source-compiler.test.ts` is recorded below.
- [x] `pnpm lint` was rerun and the unrelated workspace blocker in `packages/flux-core/src/types/compilation.ts` is recorded below.
- [x] Relevant tests pass.
- [x] `docs/logs/2026/04-23.md` records the landing and closure evidence.
- [x] Independent closure audit is completed and recorded before plan closure.

## Closure

Status Note: This plan is complete. Declarative `dialog` / `drawer` now publish live renderer-path `statusPath` summaries, default to closed when `open` and `defaultOpen` are omitted, write closed snapshots on cleanup, and keep `active` aligned with the top declarative surface through a minimal renderer-local stack helper. Focused in-scope tests are green. Workspace-wide `pnpm typecheck` and `pnpm build` remain blocked by unrelated `packages/flux-compiler/src/source-compiler.test.ts` errors, and `pnpm lint` remains blocked by an unrelated unused import in `packages/flux-core/src/types/compilation.ts`.

Closure Audit Evidence:

- Reviewer / Agent: independent `general` subagent closure audit
- Evidence: task `ses_2480d246effemQ3XbTRxHGolRO` reviewed `docs/plans/132-declarative-surface-statuspath-support-plan.md`, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`, `packages/flux-renderers-basic/src/declarative-surface-stack.ts`, and `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`; verdict `pass` with no remaining in-scope behavioral gaps.

Follow-up:

- No remaining plan-owned work.
- If future work migrates declarative surfaces onto `SurfaceRuntime` or adds declarative `data` own-scope support, land it in separate implementation plans.
- Fix the unrelated workspace blockers in `packages/flux-compiler/src/source-compiler.test.ts` and `packages/flux-core/src/types/compilation.ts` under separate owner work rather than reopening this plan.
