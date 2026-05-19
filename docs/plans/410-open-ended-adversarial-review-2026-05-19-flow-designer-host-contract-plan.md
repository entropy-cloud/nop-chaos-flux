# 410 Open-Ended Adversarial Review 2026-05-19 Flow-Designer Host Contract Plan

> Plan Status: completed
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

Status: completed
Targets: flow-designer summary publication, toolbar path, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Make all host summary surfaces publish one consistent selection / busy / canUndo / canRedo baseline.
- [x] Route built-in toolbar actions through the same supported `designer:*` / `ActionScope` path used by schema fragments, or explicitly narrow the supported contract and update docs accordingly.
- [x] Add focused proof for host summary publication and toolbar write path.
- [x] `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md`: No additional owner-doc update required beyond the `$designer.busy` cleanup already landed in this plan; the toolbar/action-path baseline was already documented.

Exit Criteria:

- [x] `R03-01` and `R03-02` are fixed.
- [x] Focused proof covers summary publication and built-in toolbar action routing.
- [x] `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Close Manifest Publication Drift

Status: completed
Targets: flow-designer manifest/provider tests/docs

- Item Types: `Fix | Proof`

- [x] Either publish `designer:navigate-back` in the manifest as part of the supported public surface, or remove it from runtime publication and dependent callers.
- [x] Add focused proof for the final manifest/runtime publication baseline.

Exit Criteria:

- [x] `R06-01` is fixed.
- [x] Focused proof covers final manifest/runtime publication parity.
- [x] `docs/architecture/flow-designer/{design.md,runtime-snapshot.md,api.md}` and `docs/components/designer-page/design.md` are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
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

Status Note: Completed. Flow-designer host summary publication, toolbar action routing, and manifest publication now share one supported contract: `statusPath` and `$designer` both preserve branch selection semantics, `$designer.busy` is no longer advertised in the static scope contract, `designer:navigate-back` is published in the manifest, focused flow-designer proof is green, and repo-wide `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green. No remaining plan-owned work remains.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1bf184934ffeei8wx3yTJyTdPP`
- Evidence: Initial audit blocked closure on a live `R03-01` contract drift: `statusPath` collapsed active branch selection to `none`, while `$designer` and focused manifest tests already preserved `branch`, and renderer definitions still advertised removed `$designer.busy`. The live repo is now corrected in `packages/flow-designer-core/src/types.ts`, `packages/flow-designer-renderers/src/designer-context.ts`, `packages/flow-designer-renderers/src/designer-page-body.tsx`, and `packages/flow-designer-renderers/src/renderer-definitions.ts`, with focused proof in `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `src/designer-provider-and-manifest.test.tsx`, and `src/designer-controls.test.tsx`, plus green workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.
