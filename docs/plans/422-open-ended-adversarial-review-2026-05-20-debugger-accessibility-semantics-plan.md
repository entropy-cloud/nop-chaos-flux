# 422 Open-Ended Adversarial Review 2026-05-20 Debugger Accessibility Semantics Plan

> Plan Status: planned
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-07.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/plans/405-ux-audit-2026-05-19-remediation-plan.md`, `docs/architecture/debugger-runtime.md`

## Purpose

收口 `R07-01`：让 debugger expanded detail panels 的键盘/ARIA 语义与真实交互行为重新一致。

## Current Baseline

- expanded detail wrappers 当前是 focusable nested `role="button"` elements。
- 它们会 stop propagation，但没有真实 activation behavior。
- 该问题与 2026-05-19 UX remediation 邻接，但不是同一个 owner surface。

## Goals

- 修复 `R07-01`。
- 移除或替换错误的 interactive semantics。
- 为最终 keyboard/ARIA behavior 补 focused proof，并同步 docs if required。

## Non-Goals

- 不做 debugger 全面 accessibility 重审。
- 不处理 debugger styling、z-index、或 runtime fidelity 历史问题。

## Scope

### In Scope

- `R07-01`
- affected debugger panel files and focused proof
- `docs/architecture/debugger-runtime.md` if the supported debugger interaction baseline changes
- `docs/logs/2026/05-20.md`

### Out Of Scope

- unrelated debugger runtime/controller issues
- unrelated UX audit findings outside debugger expanded-detail semantics

## Execution Plan

### Phase 1 - Restore Honest Debugger Detail-Panel Semantics

Status: planned
Targets: debugger panel code, focused proof, affected docs

- Item Types: `Fix | Proof`

- [ ] Remove false button semantics or replace them with an honest semantic/interaction model.
- [ ] Add focused proof for the final keyboard and accessibility behavior.
- [ ] Update `docs/architecture/debugger-runtime.md` if the supported debugger semantics baseline changes, or explicitly adjudicate `No owner-doc update required`.

Exit Criteria:

- [ ] `R07-01` is fixed.
- [ ] Focused proof covers the final keyboard/semantic behavior.
- [ ] `docs/architecture/debugger-runtime.md` is updated if needed, or `No owner-doc update required` is explicitly recorded.
- [ ] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
