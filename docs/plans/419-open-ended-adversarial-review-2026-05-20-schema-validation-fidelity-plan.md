# 419 Open-Ended Adversarial Review 2026-05-20 Schema Validation Fidelity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/{round-03.md,round-05.md}`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/plans/399-deep-audit-2026-05-19-compiler-diagnostic-fidelity-plan.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/api-data-source.md`

## Purpose

收口 `R03-01`、`R03-02`、`R03-03`、`R05-01`：让 schema authoring validation 与 live compile/runtime semantics 重新对齐。

## Current Baseline

- lifecycle actions 会 compile/run，但不经过等价 shape validation。
- `RendererPropContract.required` 公开为 authoring contract，却没有缺失字段校验。
- `reaction` 仅校验 `actions`，不校验 `watch` 与 control fields。
- built-in `ajax` action contract 声明 `args: ApiSchema`，但 validation 仍按 generic action object 处理。

## Goals

- 修复 `R03-01`, `R03-02`, `R03-03`, `R05-01`。
- 让 compile/validate/runtime 的语义边界重新一致。
- 补齐 focused proof，并同步受影响 owner docs。

## Non-Goals

- 不处理 compiler diagnostic fidelity；那属于 Plan `399` 已完成 surface。
- 不处理 repository automation / check-chain wiring；那属于 Plan `418`。
- 不在本计划内泛化到 every possible schema special-case unless required by the retained findings.

## Scope

### In Scope

- `R03-01`, `R03-02`, `R03-03`, `R05-01`
- relevant compiler/core/runtime validation files and focused proof
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-algebra-formal-spec.md` if the supported action authoring baseline changes
- `docs/logs/2026/05-20.md`

### Out Of Scope

- unrelated compiler diagnostics
- unrelated automation guardrail scripts

## Execution Plan

### Phase 1 - Restore Schema Validation Parity

Status: planned
Targets: schema validation code, focused proof, affected owner docs

- Item Types: `Fix | Proof`

- [ ] Add honest validation paths for the in-scope lifecycle, required-prop, reaction, and built-in ajax payload contracts.
- [ ] Add focused proof that invalid authored shapes fail at validation time rather than degrading into runtime-only failures.
- [ ] Update `docs/architecture/flux-core.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/complex-control-host-protocol.md`, and `docs/architecture/api-data-source.md` as needed to match the final supported validation baseline, or explicitly adjudicate `No owner-doc update required` for any unchanged owner doc.

Exit Criteria:

- [ ] `R03-01`, `R03-02`, `R03-03`, and `R05-01` are fixed.
- [ ] Focused proof covers the final validation behavior for all retained in-scope contracts.
- [ ] The named owner docs are updated as needed, or `No owner-doc update required` is explicitly recorded for each unchanged owner doc.
- [ ] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
