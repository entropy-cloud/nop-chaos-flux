# 412 Open-Ended Adversarial Review 2026-05-19 Surface Containment Truthfulness Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/round-01.md`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`

## Purpose

收口 `R01-06`：让 drawer `containerElement` targeting API 与真实 overlay geometry 语义重新对齐，不再出现“看起来支持容器挂载，实际仍是 viewport-fixed surface”的 public contract lie。

## Current Baseline

- `DrawerPortal` 可以挂进指定 container，但 overlay、viewport、popup 仍按 `position: fixed` 贴到 viewport 几何，而不是容器几何。
- 这不是旧的 container-registry stale-ref 问题；即使 container 正确，geometry 仍不受 containment 控制。
- 该 finding 属于 surface containment truthfulness，不应混入 surface lifecycle、validation owner、或 dialog/drawer input interaction 结果面。

## Goals

- 修复 `R01-06`。
- 让 drawer container targeting API 与真实几何/stacking 语义一致。
- 同步 surface-family owner docs，明确最终支持基线。

## Non-Goals

- 不处理 dialog/drawer validation owner lifecycle。
- 不处理 dialog/drawer supported E2E writeback assertions。
- 不处理 generic portal/container registry cleanup beyond the in-scope geometry truthfulness gap。

## Scope

### In Scope

- `R01-06`
- drawer host / UI containment implementation and focused tests
- `docs/architecture/surface-owner.md`
- `docs/architecture/renderer-runtime.md` if the supported surface rendering contract changes
- `docs/logs/2026/05-19.md`

### Out Of Scope

- dialog/drawer body writeback tests
- surface lifecycle ownership fixes already handled elsewhere
- unrelated drawer input/focus regressions

## Execution Plan

### Phase 1 - Align Drawer Targeting API With Real Geometry Semantics

Status: planned
Targets: drawer implementation, focused tests, owner docs

- Item Types: `Fix | Decision | Proof`

- [ ] Decide the honest supported baseline: true contained geometry, or narrowed API/contract that no longer claims containment.
- [ ] Implement that decision so mounting target and geometry semantics no longer disagree.
- [ ] Add focused proof for container-targeted drawer geometry/stacking behavior.
- [ ] Update `docs/architecture/surface-owner.md` and `docs/architecture/renderer-runtime.md` if the supported public contract changed.

Exit Criteria:

- [ ] `R01-06` is fixed.
- [ ] Focused proof covers the final supported containment baseline.
- [ ] `docs/architecture/surface-owner.md` and any affected owner docs are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
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
