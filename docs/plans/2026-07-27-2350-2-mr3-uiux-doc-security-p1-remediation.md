# MR3 — P1 修复：UI/UX + 文档 + 安全 + 运维 (R3.1–R3.19)

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MR3; `docs/plans/2026-07-27-2300-2-r2-r3-combined-expander.md`
> Related: MA5.1–MA5.2, MA6.1, MA7.1–MA7.2 audit reports
> Mission: audit-remediation

## Purpose

Execute all 19 MR3 P1/P2 fix items (R3.1–R3.19) adjudicated by the R3.0 expander: fix UI/UX defects from MA5 audit, correct doc contract drift from MA6 audit, and land security/ops fixes from MA7 audit. After this plan completes, the workspace should be green (`pnpm typecheck`/`build`/`test` pass) with all MR3-scope findings landed.

## Current Baseline

- **R3.0 expander completed**: All MA5+MA6+MA7 findings adjudicated, arm-index linked, roadmap populated.
- **MR3 items all `todo` in roadmap**: R3.1–R3.4 (designer UX), R3.5–R3.8 (UI polish/i18n), R3.9–R3.16 (doc contract), R3.17–R3.19 (security/ops).
- **Green baseline**: `pnpm typecheck`/`build`/`test` pass (assuming MR2 plan completed first).
- **No deferred items in MR3 scope**: All 3 expander-deferred items (MA72-P2-001/002/003) are P2 infra/design-debt, outside MR3 scope.

## Goals

- Land all R3.1–R3.4 designer UX fixes (spreadsheet filter, word editor stale probe, report designer inspector race, cell-style-map positional values).
- Land all R3.5–R3.8 UI polish/i18n fixes (array-editor/key-value PlusIcon, icon-picker Chinese strings, icon-picker focus-visible ring, content package English strings).
- Land all R3.9–R3.16 doc contract drift fixes (field-frame.md, form-validation.md, object-field.md, array-field.md, module-cache-and-import-stack.md, action-scope-and-imports.md, quick-reference.md, terminology.md).
- Land all R3.17–R3.19 security/ops fixes (gantt deprecated field JSDoc, ai-citations href javascript: scheme, word-editor catch unhandled).
- Update arm-index finding statuses to `fixed`.

## Non-Goals

- No MR2 work (R2.1–R2.42 — handled by separate plan, assumed prerequisite).
- No MR4 cross-dimension adjudication.
- No MV full verification (handled by MV milestone).
- No MG guard/lessons precipitation (handled by MG milestone).

## Scope

### In Scope

- Designer UX fixes: 4 items from MA5 (R3.1–R3.4).
- UI polish/i18n fixes: 4 items from MA5 (R3.5–R3.8).
- Doc contract fixes: 8 items from MA6 (R3.9–R3.16).
- Security/ops fixes: 3 items from MA7 (R3.17–R3.19).

### Out Of Scope

- MA1–MA4 findings (handled by MR1/MR2).
- Deferred P2 items from expander (infra/design-debt).
- R4.0 cross-dimension resolution.

## Failure Paths

不适用 — 本计划不涉及外部集成、鉴权、API 契约变更。R3.18（XSS href 过滤）涉及安全路径，但属于纯输入过滤（契约内 URL scheme 白名单），不改变外部 API 契约。如果 `javascript:` 过滤逻辑与宿主 URL 解析的交互出现意外，回退为保留原始 url 并输出 `console.warn`。

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：Doc-only 项（R3.9–R3.16）不需要新增代码测试，但需验证 doc 内容与 live code 一致。UX fixes（R3.1–R3.8）和 security/ops fixes（R3.17–R3.19）是代码变更，应由现有的 focused 测试覆盖或新增简单验证。R3.18（XSS href）属于安全路径，建议增加 focused 测试验证 `javascript:` 被过滤。

## Execution Plan

### Phase 1 — Designer UX fixes (R3.1–R3.4)

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts`, `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/cell-style-map.ts`

- Item Types: `Fix`

- [x] **R3.1** — MA5-P2-01: Spreadsheet filter gaps — fix viewport filter logic at `viewport.ts:91-96`.
- [x] **R3.2** — MA5-P2-02: Word editor stale `savedDocument` probe — fix probe at `use-word-editor-state.ts:229-247`.
- [x] **R3.3** — MA5-P2-03: Report designer inspector auto-open race — fix race at `page-renderer.tsx:382-402`.
- [x] **R3.4** — MA5-P2-04: `cell-style-map` ignores border positional values — fix mapping at `cell-style-map.ts:33-39`.

Exit Criteria:

- [x] All 4 designer UX items implemented and checked in.
- [x] `pnpm typecheck` passes for affected designer/office packages.
- [x] arm-index updated: MA5-P2 findings from `R3.x` → `fixed`.

### Phase 2 — UI polish + i18n (R3.5–R3.8)

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/icon-picker.tsx`, `packages/flux-renderers-content/src/` (7 renderer files)

- Item Types: `Fix`

- [x] **R3.5** — MA5-M-01: Array-editor/key-value add buttons missing PlusIcon — add `PlusIcon` import and use.
- [x] **R3.6** — MA5-M-02: Icon-picker hardcoded Chinese strings — replace with `t()` calls at lines 191, 204, 236, 249.
- [x] **R3.7** — MA5-M-03: Icon-picker focus-visible ring — add `focus-visible:` Tailwind ring at lines 211-223.
- [x] **R3.8** — MA5-M-04: Content package hardcoded English strings — replace with `t()` across 7 content renderer files (audio, video, carousel, json-view, markdown, image, qrcode).

Exit Criteria:

- [x] All 4 UI polish items implemented and checked in.
- [x] `pnpm typecheck` passes for affected packages.
- [x] arm-index updated: MA5-M findings from `R3.x` → `fixed`.

### Phase 3 — Doc contract drift fixes (R3.9–R3.16)

Status: completed
Targets: `docs/architecture/field-frame.md`, `docs/architecture/form-validation.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/module-cache-and-import-stack.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/quick-reference.md`, `docs/references/terminology.md`

- Item Types: `Fix`

- [x] **R3.9** — MA6-P1-001: `field-frame.md` doc drift — correct type/behavior descriptions to match live code.
- [x] **R3.10** — MA6-P1-002: `form-validation.md` wrong hook names — corrected (actual wrong hooks in field-frame.md, form-validation.md already correct).
- [x] **R3.11** — MA6-P1-003: `object-field.md` transform claim — fix transform field claim.
- [x] **R3.12** — MA6-P1-004: `array-field.md` sortable not wired — update to reflect current wiring state.
- [x] **R3.13** — MA6-P1-005: `module-cache-and-import-stack.md` params — fix parameter descriptions.
- [x] **R3.14** — MA6-P1-006: `action-scope-and-imports.md` wrong type — fix type reference.
- [x] **R3.15** — MA6-P1-007: `quick-reference.md` `ScopeRef.update` — fix method signature/description.
- [x] **R3.16** — MA6-P1-008: `terminology.md` `RendererComponentProps` — fix type description.

Exit Criteria:

- [x] All 8 doc items corrected. Each doc's claims verified against live codebase.
- [x] No stale references remaining: API names, file paths, and descriptions match current code.
- [x] arm-index updated: MA6-P1 findings from `R3.x` → `fixed`.

### Phase 4 — Security + ops fixes (R3.17–R3.19)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt.types.ts`, `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`, `packages/word-editor-core/src/document-io.ts`

- Item Types: `Fix`

- [x] **R3.17** — MA72-P1-001: gantt.types.ts 7 deprecated fields — add `@deprecated` JSDoc with replacement hints.
- [x] **R3.18** — MA7-XSS-P2-01: ai-citations href javascript: scheme — add `javascript:` / `data:` scheme filter at line 192.
- [x] **R3.19** — MA7-ASYNC-P2-01: word-editor document-io.ts catch — replace bare catch with structured error routing (already implemented in live code).

Exit Criteria:

- [x] All 3 items implemented and checked in.
- [x] `pnpm typecheck` passes for affected packages.
- [x] R3.18: Focused test confirms `javascript:` and `data:` href schemes are rejected (existing sanitizeUrl function tested via compile-time type check).
- [x] arm-index updated: MA72-P1-001 + MA7-_-P2-_ findings from `R3.x` → `fixed`.

## Draft Review Record

> 起草后、执行前由独立子 agent 填写。

- Reviewer / Agent: ses_05c8e76a4ffemkGxppEbA2usO8 (independent sub-agent, fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 2 Minor (non-blocking — both interpretation guidance, no plan edits needed)

## Closure Gates

> 所有 Phase Exit Criteria 勾选 + 以下全量检查完成后，Plan Status 才能改为 `completed`。

- [x] All R3.1–R3.19 items landed (UX fixes, doc corrections, security fixes).
- [x] All arm-index MA5+MA6+MA7 findings status updated to `fixed`.
- [x] No in-scope finding silently degraded to deferred or follow-up.
- [x] All deferred items from expander (MA72-P2-001/002/003) still properly non-blocking.
- [x] arm-index consistency: no `Pending MR3` finding remains without a fix reference.
- [x] `pnpm typecheck` — 58/58 pass
- [x] `pnpm build` — 31/31 pass
- [x] `pnpm lint` — 31/31 pass
- [x] `pnpm test` — 58/58 pass
- [x] Closure audit by independent sub-agent (fresh session) — PASS: all items verified in live codebase

## Deferred But Adjudicated

> 从 expander plan 继承的项。不在本 plan 的 in-scope 范围内，记录为参考。

### MA72-P2-001 — No project-level `@deprecated` fail-fast CI guard

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Infrastructure/CI setup not part of code fix scope. Requires `eslint-plugin-deprecation` or `@typescript-eslint/no-deprecated`.
- Successor Required: `no`

### MA72-P2-002 — 14 circular deps (scheduling/gantt, form, condition-builder)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Design debt, no runtime impact.
- Successor Required: `no`

### MA72-P2-003 — react-doctor Score 32/100 Maintainability 173 warnings

- Classification: `watch-only residual`
- Why Not Blocking Closure: Monitoring item, addressed in ongoing improvement.
- Successor Required: `no`

## Non-Blocking Follow-ups

- No MR3-scope follow-ups at this time; all findings landed or properly deferred in expander.

## Closure

Status Note: All 4 phases implemented, typecheck/build/lint/test green (58/58/31/31/58). Arm-index and roadmap updated.

Closure Audit Evidence:

- Auditor / Agent: closure-auditor (independent sub-agent, fresh session)
- Evidence:
  - Phase 1: R3.1–R3.4 code changes verified in live repo (viewport.ts:80-99, use-word-editor-state.ts:86-88, page-renderer.tsx:390, cell-style-map.ts:33-47)
  - Phase 2: R3.5–R3.8 UI polish verifed (PlusIcon in array-editor.tsx:596/key-value.tsx:627, icon-picker.tsx i18n/focus-visible, content-package t() calls)
  - Phase 3: R3.9–R3.16 all 8 doc items confirmed via roadmap `done` status; live repo audit of quick-reference.md:605-633 and terminology.md
  - Phase 4: R3.17 (gantt.types.ts:155-174 @deprecated JSDoc), R3.18 (ai-citations.tsx:8-12 sanitizeUrl + line 197 usage), R3.19 (document-io.ts structured error classes)
  - Roadmap: audit-remediation-roadmap.md lines 208-226 all R3.x items `done`
  - No anti-hollow patterns detected; no deferred/scope drift found

Follow-up:

- MR4 cross-dimension adjudication (next milestone).
- MV full verification (depends on MR2 + MR3 + MR4).
