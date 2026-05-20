# 418 Open-Ended Adversarial Review 2026-05-20 Automation Guardrail Truthfulness Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-02.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`

## Purpose

收口 `R02-01`、`R02-02`、`R02-03`：让仓库 automation / verification guardrail 的名称、覆盖范围、check-chain 位置与真实保护面重新对齐。

## Current Baseline

- `check-finite-prop-contracts` 是抽样脚本，不是派生式 finite-contract guard。
- `check-workspace-manifest-deps` 漏 bare side-effect import 语法。
- schema prop coverage guard 已从 100% 基线回退，且不在主 check chain。

## Goals

- 修复 `R02-01`、`R02-02`、`R02-03`。
- 让 guardrail 名称、文档、和 active verification chain 只表达真实保护面。
- 为 automation contract 恢复 focused proof。

## Non-Goals

- 不处理 compiler schema semantics 本身。
- 不把所有 suspect scripts 都并入同一计划。
- 不把脚本问题降级成 vague “future tooling cleanup”。

## Scope

### In Scope

- `R02-01`, `R02-02`, `R02-03`
- affected `scripts/*.mjs`
- root `package.json` verification chain if required
- `docs/references/audit-tooling.md` and `docs/references/maintenance-checklist.md` if the supported guardrail baseline changes
- `docs/logs/2026/05-20.md`

### Out Of Scope

- compiler runtime semantics
- unrelated packaging or workspace hygiene issues

## Execution Plan

### Phase 1 - Restore Automation Guardrail Truthfulness

Status: completed
Targets: automation scripts, check-chain wiring, focused proof, relevant docs

- Item Types: `Fix | Proof`

- [x] Make each in-scope automation guard either honestly named/scoped or actually cover the contract it claims to protect.
- [x] Decide which guards belong in the main verification chain and wire them accordingly.
- [x] Add focused proof for the in-scope false-negative / stale-chain cases.
- [x] Update `docs/references/audit-tooling.md` and `docs/references/maintenance-checklist.md` for the current guardrail baseline.

Exit Criteria:

- [x] `R02-01`, `R02-02`, and `R02-03` are fixed.
- [x] Focused proof covers the final guardrail behavior and check-chain placement.
- [x] `docs/references/audit-tooling.md` and `docs/references/maintenance-checklist.md` are updated to match the live guardrail baseline.
- [x] `docs/logs/2026/05-20.md` is updated.

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

Status Note: The automation guardrail surface is now truthful again: `check-workspace-manifest-deps` covers bare side-effect imports, `check-schema-prop-coverage` is wired into root `check` and `lint`, and `check-finite-prop-contracts` is documented as a curated finite-prop sample guard instead of a complete proof. Focused proof, repo-wide verification, and independent closure audit are all complete.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `ses_1bb02c7feffeSJyOIc1GfmNQsL` (`Verdict: acceptable`, `Findings: none`), recorded in `docs/logs/2026/05-20.md`

Follow-up:

- no remaining plan-owned work
