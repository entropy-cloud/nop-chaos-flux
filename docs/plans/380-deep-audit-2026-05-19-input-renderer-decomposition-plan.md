# 380 Deep Audit 2026-05-19 Input Renderer Decomposition And Stepper Accessibility Plan

> Plan Status: planned
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

Status: planned
Targets: `input.tsx`, extracted modules, owner docs

- Item Types: `Fix | Proof`
- [ ] Split `input.tsx` so the root file no longer carries all control implementations.
- [ ] Restore keyboard focus access for input-number stepper controls.
- [ ] Update the owner docs named in Plan `371` if the supported renderer structure changes.

Exit Criteria:

- [ ] `02-08` and `20-01` are fixed.
- [ ] The touched surface no longer sits at the oversized hotspot boundary.
- [ ] Focused proof covers the supported stepper keyboard path.
- [ ] `docs/architecture/renderer-runtime.md` and `docs/architecture/styling-system.md` are updated, or `No change required` is explicitly adjudicated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
