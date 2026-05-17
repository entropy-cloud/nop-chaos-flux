# 346 Deep Audit 2026-05-17 Flux Bundle API Typing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-full/{13-type-safety.md,summary.md}`, live code verification of `packages/flux-bundle/src/{index.tsx,types.ts}`, `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/320-deep-audit-2026-05-16-bundle-facade-contract-plan.md`

## Purpose

收口 `2026-05-17/13-01` 的 retained residual：Plan `320` 已关闭 renderer-definition over-promise surface，但当前 bundle facade 对 env/schema/action callback bridge 的 shipped declaration surface 仍依赖类型抹除或宽松桥接，导致 facade API 对跨包兼容性的 supported baseline 仍不够显式。

## Current Baseline

- `packages/flux-bundle/src/index.tsx:34-35,50-52,65-72` 仍包含多处 bundle-to-core cast bridge；其中 successor scope 只 owning env cast、schema cast、`onActionError` cast。`registry cast` 只有在 Phase 1 复核证明它仍构成 env/schema/action callback bridge residual 时才允许重新进入 scope，否则默认沿用 Plan `320` 的 closure baseline。
- `packages/flux-bundle/package.json:16-20` 当前对外发布 `./dist/index.d.ts`，而 `scripts/prepare-flux-bundle-dist.mjs:9-14` 会把 `packages/flux-bundle/types/public-types.d.ts` 复制为 shipped declaration surface。
- `packages/flux-bundle/types/public-types.d.ts:42-79` 当前仍用宽松 facade declarations 暴露 renderer registry / schema renderer / env bridge surface，说明 successor 必须以 shipped `.d.ts` baseline 为主，而不是只修改 `src/types.ts`。
- `packages/flux-bundle/src/types.ts` 仍是 source-side bridge evidence，但不是最终发布的唯一 public contract。
- Plan `320` 已关闭 `2026-05-16/03-04` 与 `2026-05-16/13-01` 的 renderer-definition over-promise surface；本计划只 owning `2026-05-17/13-01` 的 remaining env/schema/action callback bridge typing residual，而不是重开 renderer registration contract。

## Goals

- Replace the remaining bundle facade `as unknown as` bridge points with explicit supported typing where feasible.
- Ensure the supported bundle API surface states exactly how schema/env/action callback types map onto the lower runtime contract.
- Add focused proof for the touched bundle API bridge surface.

## Non-Goals

- 不重开 Plan `320` 已 closure 的 renderer-definition contract narrowing。
- 不把 low-code dynamic boundaries 全量收紧为 zero-cast policy。
- 不接管 `13-02` 或其它 renderer-local typing cleanup。

## Scope

### In Scope

- `2026-05-17/13-01` bundle bridge-typing residual
- `packages/flux-bundle/src/{index.tsx,types.ts}` limited to env/schema/action callback bridge typing
- `packages/flux-bundle/types/public-types.d.ts`
- focused tests in `packages/flux-bundle/src/` and shipped declaration proof as needed
- relevant docs only if the supported facade typing contract needs clarification
- `docs/logs/2026/05-17.md`

### Out Of Scope

- `2026-05-16/03-04`
- `13-02`
- private package root export cleanup
- workspace manifest dependency hygiene

## Execution Plan

### Phase 1 - Freeze Bundle API Bridge Typing Baseline

Status: completed
Targets: `packages/flux-bundle/src/{index.tsx,types.ts}`, focused tests/docs

- Item Types: `Decision | Proof`

- [x] Re-audit the remaining env/schema/action callback bridge cast sites together with `types/public-types.d.ts`, and record which ones are true unsupported type erasure versus acceptable boundary adaptation on the shipped declaration surface.
- [x] Define one supported bundle API bridge baseline that is narrower than raw `unknown` casting and explicitly bounded against Plan `320`'s renderer-definition closure.

Exit Criteria:

- [x] The plan records a clean boundary against Plan `320`.
- [x] Each in-scope cast site is adjudicated as `remove`, `replace with explicit adapter type`, or `retain with explicit boundary rationale`.
- [x] Affected owner docs are updated if the public facade typing contract changes; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Bundle API Typing Fixes

Status: completed
Targets: `packages/flux-bundle/src/{index.tsx,types.ts}`, focused tests

- Item Types: `Fix | Proof`

- [x] Replace the in-scope env/schema/action callback type-erasure bridge points with explicit facade typing or a narrower supported adapter surface across both source bridge code and shipped declaration output.
- [x] Add or update focused proof for the touched bundle API bridge contract, including the shipped declaration surface.

Exit Criteria:

- [x] The supported bundle API and shipped declaration surface no longer depend on unjustified `as unknown as` / over-wide bridge points for the in-scope surface.
- [x] Focused proof is green for the final facade typing baseline.
- [x] Affected owner docs match the final baseline, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched bundle files/tests/docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fix lands.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plan `320`, linked analysis, live code/tests/docs, and verification output.

Exit Criteria:

- [x] Focused verification for `2026-05-17/13-01` has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining bundle API typing blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defect (`2026-05-17/13-01` bundle bridge-typing residual) is fixed.
- [x] Flux bundle facade typing converges to one supported API bridge baseline.
- [x] Necessary focused verification exists for the touched facade typing surface.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The flux bundle facade now exposes the supported env/schema/action typing surface directly in both source and shipped declaration output, with no remaining in-scope `unknown` bridge residual.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1c9c98c7dffeT2tkRiULA7FBJX` (`general` subagent)
- Evidence: Final independent closure audit found no remaining bundle facade typing blocker; focused facade proof and final workspace verification remained green (`tool_e362d7ff6001MPuSig14CcdoVo`).

Follow-up:

- None.
