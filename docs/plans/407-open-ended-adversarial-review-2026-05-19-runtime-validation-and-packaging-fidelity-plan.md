# 407 Open-Ended Adversarial Review 2026-05-19 Runtime Validation And Packaging Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-01.md}`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/frontend-baseline.md`

## Purpose

收口 `R01-01`、`R01-02`、`R01-03`、`R01-05`：让 root validation owner lifecycle、scope identity、compile-vs-validate plugin semantics、以及 packed-tarball proof 回到诚实且可验证的 baseline。

## Current Baseline

- `R01-01`: page-root validation owner 在 schema replacement 后仍可能保留旧 compiled model。
- `R01-02`: `scopeKey` 被当成真实 `scope.id`，导致 repeated child scopes collision / dispose 串扰。
- `R01-03`: `validate()` 路径会双跑 `beforeCompile` plugins，而正常 compile 只跑一次。
- `R01-05`: `check-flux-bundle-pack` 校验 tarball 中是否有 `dist/style.css`，但内容断言实际读取 workspace source CSS，不是真实 packed artifact。
- 这四条都属于 runtime/compiler/release-proof fidelity，同面且共享 focused verification，但不应混入 surface UI、host contract、或 supported E2E assertion fidelity。

## Goals

- 修复 `R01-01`、`R01-02`、`R01-03`、`R01-05`。
- 让 validation owner refresh / replace 生命周期与 `scope.id` 身份语义保持单真源。
- 让 validate/compile 的 plugin execution semantics 收敛到单一支持基线。
- 让 `check:flux-bundle-pack` 真正读取 packed tarball payload。

## Non-Goals

- 不处理 `R01-06` drawer containment / geometry truthfulness。
- 不处理 supported E2E false-confidence finding。
- 不处理 flow/report/word host-family contract drift。

## Scope

### In Scope

- `R01-01`, `R01-02`, `R01-03`, `R01-05`
- `packages/flux-react/src/` root validation owner wiring
- `packages/flux-runtime/src/` runtime/scope identity wiring
- `packages/flux-compiler/src/` validation compile path
- `scripts/check-flux-bundle-pack.mjs` and related proof
- `docs/architecture/form-validation.md` if validation-owner semantics change
- `docs/architecture/frontend-baseline.md` if packed-tarball proof baseline changes
- `docs/logs/2026/05-19.md`

### Out Of Scope

- surface-family geometry / portal containment
- host-manifest/provider drift
- product-facing E2E scenario rewrites

## Execution Plan

### Phase 1 - Restore Validation Owner And Scope Identity Fidelity

Status: completed
Targets: `packages/flux-react/src/`, `packages/flux-runtime/src/`, focused tests, owner docs if required

- Item Types: `Fix | Proof`

- [x] Fix schema replacement so page-root validation owners cannot keep using stale compiled models after refresh.
- [x] Restore stable separation between `scopeKey` and canonical `scope.id` so repeated child scopes cannot collide or dispose each other.
- [x] Add focused proof for schema replacement, owner refresh, and repeated child-scope disposal behavior.
- [x] `docs/architecture/form-validation.md`: No owner-doc update required; the supported owner lifecycle wording did not change in this slice.

Exit Criteria:

- [x] `R01-01` and `R01-02` are fixed.
- [x] Focused proof covers validation-owner refresh and repeated child-scope identity/disposal semantics.
- [x] `docs/architecture/form-validation.md` and/or `docs/architecture/flux-runtime-module-boundaries.md` are updated if the supported owner baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Unify Compile/Validate Plugin Semantics And Packed-Tarball Proof

Status: completed
Targets: `packages/flux-compiler/src/`, `scripts/check-flux-bundle-pack.mjs`, focused tests/docs

- Item Types: `Fix | Proof`

- [x] Make validation and normal compile paths use one supported `beforeCompile` execution semantics instead of validate-only double execution.
- [x] Make `check-flux-bundle-pack` read and compare the real packed tarball stylesheet payload rather than workspace source CSS.
- [x] Add focused proof for compile/validate plugin parity and packed-artifact CSS verification.
- [x] `docs/architecture/frontend-baseline.md`: No owner-doc update required; the supported pack-proof contract wording did not change in this slice.

Exit Criteria:

- [x] `R01-03` and `R01-05` are fixed.
- [x] Focused proof covers plugin execution parity and real tarball payload verification.
- [x] `docs/architecture/frontend-baseline.md` is updated if the supported release-proof baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed, or each phase explicitly records `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Phase 1 and Phase 2 are complete; all in-scope runtime/compiler findings are fixed; the repo log is refreshed; independent closure audit is clean; and repo-wide `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are confirmed green.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1bf2da6e3ffe1YAgiwrpi5QIO3` independent closure audit
- Evidence: `Verdict: acceptable`, `Findings: none`; recording repo-wide gates is justified and the plan can honestly move to `completed` once closure text is synced.
