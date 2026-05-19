# 410 Open-Ended Adversarial Review 2026-05-19 Flow-Designer Host Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-03.md,round-06.md}`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}`, `docs/components/designer-page/design.md`, `docs/architecture/capability-projection-manifest.md`

## Purpose

收口 `R03-01`、`R03-02`、`R06-01`：让 flow-designer 的 status publication、toolbar action path、manifest publication 和 host summary vocabulary 回到单一支持契约。

## Current Baseline

- `R03-01`: Flow Designer 对同一 live selection / busy state 发布了彼此矛盾的 host summaries。
- `R03-02`: built-in toolbar 大量绕过 `ActionScope`，与文档要求的统一 `designer:*` 写路径不一致。
- `R06-01`: runtime 动态公开 `designer:navigate-back`，但 manifest 仍未声明该 public action。

## Goals

- 修复 `R03-01`、`R03-02`、`R06-01`。
- 让 flow-designer host summary、built-in toolbar、manifest publication 和 docs 使用同一 vocabulary / action path。
- 同步 flow-designer owner docs。

## Non-Goals

- 不处理 flow-designer accessibility or error-fidelity finding；它们属于其他 active plans。
- 不处理 flow-designer E2E truthfulness；那属于 Plan `408`。

## Scope

### In Scope

- `R03-01`, `R03-02`, `R06-01`
- flow-designer manifest/provider/page shell/toolbar code and focused tests
- `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}`
- `docs/components/designer-page/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- accessibility interaction semantics
- error propagation fidelity
- product-facing E2E rewrites

## Execution Plan

### Phase 1 - Unify Flow-Designer Host Summary And Action Path

Status: planned
Targets: flow-designer summary publication, toolbar path, focused tests, owner docs

- Item Types: `Fix | Proof`

- [ ] Make all host summary surfaces publish one consistent selection / busy / canUndo / canRedo baseline.
- [ ] Route built-in toolbar actions through the same supported `designer:*` / `ActionScope` path used by schema fragments, or explicitly narrow the supported contract and update docs accordingly.
- [ ] Add focused proof for host summary publication and toolbar write path.
- [ ] Update `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md` for the final supported baseline.

Exit Criteria:

- [ ] `R03-01` and `R03-02` are fixed.
- [ ] Focused proof covers summary publication and built-in toolbar action routing.
- [ ] `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Close Manifest Publication Drift

Status: planned
Targets: flow-designer manifest/provider tests/docs

- Item Types: `Fix | Proof`

- [ ] Either publish `designer:navigate-back` in the manifest as part of the supported public surface, or remove it from runtime publication and dependent callers.
- [ ] Add focused proof for the final manifest/runtime publication baseline.

Exit Criteria:

- [ ] `R06-01` is fixed.
- [ ] Focused proof covers final manifest/runtime publication parity.
- [ ] `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md` are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
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
