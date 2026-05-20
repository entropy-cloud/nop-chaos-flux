# 380 Deep Audit 2026-05-19 Input Renderer Decomposition And Stepper Accessibility Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-08` 与 `20-01`：拆分 `input.tsx` 的多控件 barrel surface，并恢复 input-number stepper 的 keyboard access。

## Current Baseline

- `packages/flux-renderers-form/src/renderers/input.tsx` 接近 hard gate，并聚合多个 control implementations。
- 同一 surface 里的 input-number stepper buttons 当前不可通过 Tab 聚焦。

## Goals

- 修复 `02-08`。
- 让 input renderer surface 回到更清晰的 owner boundary。
- 修复 `20-01`。
- 保留 input-number 的 supported keyboard path。

## Non-Goals

- 不扩展到其它 form tree-widget accessibility findings；那些由 Plan `388` owning。

## Scope

### In Scope

- `02-08`, `20-01`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- any extracted input renderer modules
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/styling-system.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- broader form tree-widget accessibility

## Execution Plan

### Phase 1 - Split Input Renderer Owners And Restore Stepper Keyboard Access

Status: completed
Targets: `input.tsx`, extracted modules, owner docs

- Item Types: `Fix | Proof`
- [x] Split `input.tsx` so the root file no longer carries all control implementations.
- [x] Restore keyboard focus access for input-number stepper controls.
- [x] Update the owner docs named in Plan `371` if the supported renderer structure changes.

Exit Criteria:

- [x] `02-08` and `20-01` are fixed.
- [x] The touched surface no longer sits at the oversized hotspot boundary.
- [x] Focused proof covers the supported stepper keyboard path.
- [x] `docs/architecture/renderer-runtime.md` and `docs/architecture/styling-system.md` are updated, or `No change required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope input renderer split and stepper accessibility fix remain landed, the independent closure audit found no remaining in-scope semantic gap, and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_1bfccaf68ffe9ARbI0y9NFyyzn`
- Evidence:
  - Split `packages/flux-renderers-form/src/renderers/input.tsx` into a thinner root registry file plus `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` and `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`.
  - Restored keyboard-focusable stepper buttons by removing the negative tab index from `input-number` stepper controls.
  - Focused proof passed in `packages/flux-renderers-form/src/__tests__/input-number.test.tsx` and `packages/flux-renderers-form/src/__tests__/input-classname-contract.test.tsx` (`2` files / `22` tests).
  - `pnpm --filter @nop-chaos/flux-renderers-form typecheck`, `build`, and `lint` passed.
  - Owner-doc adjudication: `docs/architecture/renderer-runtime.md` and `docs/architecture/styling-system.md` already describe the supported widget/root-className baseline; `No change required` is honest for this internal file split.
  - Workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.
