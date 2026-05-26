# 443 Open-Ended Adversarial Review 2026-05-26 Package CSS Export Gate Coverage Plan

> Plan Status: completed
> Last Reviewed: 2026-05-26
> Source: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/round-05.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `scripts/check-package-css-exports.mjs`, `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`

## Purpose

修复 `check-package-css-exports` hard gate 的 coverage blind spot，让当前仓库已经使用的 object-form / conditional CSS exports 被同等收集、计数、验证，避免 `pnpm check` / `pnpm lint` 在 public CSS subpath 指向 `src` 或 missing target 时仍报告 green。

## Current Baseline

- `R26-05-F1`: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/round-05.md` 已确认 `scripts/check-package-css-exports.mjs` 只验证 target 为 string 的 `.css` subpath exports。
- 当前 workspace has 11 CSS export subpaths in package manifests. The live checker collects only the 6 direct string targets and skips 5 object-form targets: `@nop-chaos/spreadsheet-renderers` `./canvas-styles.css`, `@nop-chaos/flux-renderers-form` `./form-renderers.css`, `@nop-chaos/flux-code-editor` `./code-editor-styles.css`, `@nop-chaos/report-designer-renderers` `./report-field-panel.css`, and `@nop-chaos/flow-designer-renderers` `./designer-theme.css`.
- The expected post-fix live baseline is still 11 CSS subpaths, but all 11 resolved string targets must be counted and validated. The success output should make both subpath count and resolved target count visible.
- The script is wired into root hard gates via `pnpm check` and `pnpm lint`, so this is a non-degradable hard-gate fidelity defect, not an advisory tooling cleanup.

## Goals

- 修复 `R26-05-F1`。
- Recursively collect CSS export string leaves from object/conditional export targets while preserving enough condition-path information for actionable diagnostics.
- Make the success output coverage-sensitive so a sudden drop in CSS subpath/target count is visible.
- Add focused fixture tests proving object-form exports that point to `src` or missing files fail the gate.

## Non-Goals

- 不重新设计 package export policy beyond validating CSS subpaths already claimed by package manifests.
- 不放宽 `dist` target requirement or remove the checker from `pnpm check` / `pnpm lint`.
- 不把 current object-form blind spot 降级成 follow-up；它是 hard-gate coverage defect。

## Scope

### In Scope

- `scripts/check-package-css-exports.mjs`.
- Tests/fixtures for package CSS export validation, wherever current script tests live or should be added.
- `package.json` scripts only if needed to expose focused script tests without weakening existing gates.
- `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`, and daily logs if checker policy/output changes.

### Out Of Scope

- Changing production package CSS exports unless live re-audit finds an actual invalid export after the checker is fixed.
- Broad audit of every hard-gate script; that can be a successor plan if needed, but does not block closing this specific checker defect.

## Execution Plan

### Phase 1 - Re-verify CSS Export Surface And Checker Baseline

Status: completed
Targets: current package manifests, `scripts/check-package-css-exports.mjs`, root scripts

- Item Types: `Decision | Proof`

- [x] Re-run or inspect the live checker and package manifests to confirm current CSS subpath count, collected target count, skipped object-form target count, and expected post-fix target count; write any changed counts back into `Current Baseline` before implementation proceeds.
- [x] Re-verify that the checker remains wired into `pnpm check` and `pnpm lint`; this hard-gate status must not be weakened.
- [x] Identify existing test harness patterns for scripts and decide the smallest focused test location for checker fixtures.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Live repo baseline confirms or explicitly updates the `R26-05-F1` scope.
- [x] Current coverage counts are recorded in `Current Baseline` or phase evidence before implementation proceeds.
- [x] The checker's hard-gate wiring is recorded and preserved.
- [x] Test location and fixture approach are chosen before implementation.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Fix Recursive CSS Export Collection And Diagnostics

Status: completed
Targets: `scripts/check-package-css-exports.mjs`, focused script tests/fixtures

- Item Types: `Fix | Proof`

- [x] Update `collectCssExports()` to recursively collect string leaves under object/conditional export targets for CSS subpaths.
- [x] Include condition path or export branch information in diagnostics so failures such as `./foo.css.default -> ./src/foo.css` are clear.
- [x] Preserve validation of direct string CSS exports and existing failure behavior for non-`dist` targets and missing files.
- [x] Add focused tests/fixtures covering direct string exports, object-form valid exports, object-form `src` regressions, and object-form missing targets; fixtures must isolate test package manifests from the live workspace so failures prove checker behavior, not incidental repo state.
- [x] Update success output to report CSS subpaths and resolved target count separately or otherwise make coverage drops visible.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-05-F1` is fixed.
- [x] Object-form CSS export targets are validated with the same policy as direct string targets.
- [x] Focused tests fail on the audited blind spot and pass on final behavior.
- [x] Fixture tests isolate package manifests from the live workspace.
- [x] `pnpm check:package-css-exports` passes against the live workspace with the expanded target count recorded in logs.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Policy Docs, Workspace Verification, And Closure Audit

Status: completed
Targets: audit tooling docs, maintenance checklist, workspace verification, this plan

- Item Types: `Proof | Decision`

- [x] Update audit tooling / maintenance docs if the checker output or covered export-shape policy changes.
- [x] Run `pnpm check:package-css-exports` and any focused script test command.
- [x] Run required workspace verification for code/tooling changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and relevant `pnpm test` scope before full test closure.
- [x] Perform independent closure audit with a fresh subagent or reviewer after all code/docs/tests are landed.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Checker policy/output docs are synced or `No owner-doc update required` is explicitly justified.
- [x] `pnpm check:package-css-exports` passes and validates object-form CSS exports.
- [x] Focused script tests pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] Relevant/full test command passes or any non-plan-owned failure has explicit successor ownership before closure.
- [x] Independent closure audit evidence is recorded.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] The in-scope hard-gate coverage defect `R26-05-F1` is fixed.
- [x] Object-form / conditional CSS export targets are collected, counted, and validated.
- [x] Existing hard-gate wiring through `pnpm check` / `pnpm lint` is preserved.
- [x] Necessary focused verification is complete.
- [x] No in-scope hard-gate defect is silently downgraded to deferred/follow-up.
- [x] Affected docs/logs are synced or `No owner-doc update required` is explicitly recorded.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Execution Notes

- `scripts/check-package-css-exports.mjs` now recursively walks object-form CSS export targets and reports both CSS subpath count and resolved target count. Live workspace output is `Verified 11 CSS export subpaths across 11 resolved targets`.
- Focused script proof passed in `scripts/__tests__/check-package-css-exports.test.ts` via `pnpm test:scripts`.
- Workspace `build` passed. Workspace `lint` and `check` remain blocked by the pre-existing oversized-file hard gate outside this plan's scope, led by `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts` already exceeding the repository hard limit.
- Independent closure audit recorded after implementation; no remaining in-scope CSS export gate coverage defect was found open.

## Draft Review Record

- Initial draft created from the 2026-05-26 open-ended adversarial review result set.
- Independent draft review: `accept with required revisions` (`ses_19dba036dffeS8Em2fMOI7kM26`). Required revisions applied: recorded exact current and expected CSS export coverage counts, and required Phase 1 to write count changes back before implementation. Non-blocking suggestion applied: isolated fixture tests.
- Independent follow-up review: `accept` (`ses_19dba036dffeS8Em2fMOI7kM26`). Consensus reached; no remaining blocking revisions.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- A broader hard-gate script audit for other “green but skipped current shape” patterns is useful but does not block this plan once CSS export object-form coverage is fixed and verified.
