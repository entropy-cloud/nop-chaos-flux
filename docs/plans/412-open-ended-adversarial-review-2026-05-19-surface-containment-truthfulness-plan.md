# 412 Open-Ended Adversarial Review 2026-05-19 Surface Containment Truthfulness Plan

> Plan Status: completed
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

Status: completed
Targets: drawer implementation, focused tests, owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Decide the honest supported baseline: true contained geometry, not a narrowed fake-containment API.
- [x] Implement that decision so mounting target and geometry semantics no longer disagree.
- [x] Add focused proof for container-targeted drawer geometry/stacking behavior.
- [x] Update `docs/architecture/surface-owner.md` and `docs/architecture/renderer-runtime.md` if the supported public contract changed.

Exit Criteria:

- [x] `R01-06` is fixed.
- [x] Focused proof covers the final supported containment baseline.
- [x] `docs/architecture/surface-owner.md` and any affected owner docs are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: The in-scope containment finding is fixed, owner docs match the live baseline, independent closure-audit evidence is recorded, and repo-wide `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are confirmed green.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1bf53e4ebffeD4B124gU06sly4` independent closure audit
- Evidence: `Verdict: acceptable`, `Findings: none`; recommendation was to keep `Plan Status: partially completed` until repo-wide gates were confirmed, and that condition is now satisfied.
