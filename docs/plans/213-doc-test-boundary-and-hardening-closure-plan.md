# 213 Doc Test Boundary And Hardening Closure Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full-7/{02-module-responsibility.md,14-test-coverage.md,16-doc-code-consistency.md,17-naming.md}`, `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/167-test-quality-and-reliability-improvement-plan.md`, `docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md`, `docs/plans/210-deep-audit-full-7-confirmed-defect-remediation-program-plan.md`

## Purpose

收口 `full-7` 中 retained docs/test/boundary/public-vocabulary defects：新的 `>700` oversized test hard-gate 问题、retained coverage/test-hardening 缺口、active docs 与 live API/术语漂移、以及 `flux-code-editor` 公开 `dataPath` 词汇漂移。该计划完成后，这些问题不再只是审计命中，而是 live repo 与 active docs 的当前 supported baseline。

## Current Baseline

- plan `205` 已关闭上一轮的 active-doc path / CSS export / oversized dispatcher test defects，但 `full-7` 又确认了新的 hard-gate 和 doc/code drift，不能由 `205` 的 completed 状态代替处理。
- `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts` 当前仍超过 700 行，且聚合 13 组独立 renderer coverage；这已命中仓库 `check:oversized-code-files` 的不可降级硬阈值。
- retained test-hardening issues仍成立：`flux-action-core` 缺 coverage gate、`flux-formula` include 漏掉关键公开实现、多个高交互包缺 coverage gate、`word-editor-core` / `word-editor-renderers` 仍有全局污染未恢复、表单关键路径与 report designer 关键链路的 E2E 覆盖仍不足、多份 Playwright 仍依赖固定 sleep、`flux-i18n` 的公开语义只停留在冒烟测试。
- retained doc/code drift 仍成立：`renderer-runtime.md` 的 hook 列表与 error hook 签名落后于 live API，`terminology.md` 对 `RenderRegionHandle` / `ValidationContributor` 的定义仍落后，`flux-runtime-module-boundaries.md` 仍保留旧 `resolveGap` 与不存在测试文件的表述。
- retained naming/public vocabulary drift 仍成立：`flux-code-editor` 的公开 source-ref 仍使用 `dataPath`，与当前更 canonical 的 `path` 形成双词汇；这是 public contract cleanup，不是纯局部变量命名噪音。

## Goals

- 修复 in-scope hard-gate oversized-file defect。
- 修复 retained docs/test/public-vocabulary drift，并在需要时补 focused proof 和 guardrails。
- 只把 confirmed must-fix 项纳入 closure，不把 broader test quality campaign 或 generic doc gardening 一起塞进来。

## Non-Goals

- 不追求全仓覆盖率提升运动。
- 不处理 workbench/runtime/performance defects。
- 不把所有 docs 旧措辞或一般性风格改动都纳入 closure。

## Scope

### In Scope

- `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`
- `packages/flux-action-core/vitest.config.ts`
- `packages/flux-formula/vitest.config.ts`
- `packages/report-designer-renderers/vitest.config.ts`
- `packages/spreadsheet-renderers/vitest.config.ts`
- `packages/word-editor-renderers/vitest.config.ts`
- `packages/flux-code-editor/vitest.config.ts`
- `packages/nop-debugger/vitest.config.ts`
- `packages/word-editor-core/src/__tests__/document-io.test.ts`
- `packages/word-editor-renderers/src/__tests__/editor-canvas.test.tsx`
- `tests/e2e/component-lab/simple-form.spec.ts`
- `tests/e2e/report-designer-demo.spec.ts`
- `tests/e2e/{word-editor.spec.ts,word-editor-template-expr.spec.ts,word-editor-dataset.spec.ts,debugger.spec.ts,performance-table.spec.ts}`
- `packages/flux-i18n/src/{i18n.ts,hooks.ts,i18n.test.ts}`
- `docs/architecture/renderer-runtime.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `packages/flux-code-editor/src/{types.ts,source-resolvers.ts}`
- directly affected tests, scripts, and logs/docs

### Out Of Scope

- full repo-wide coverage-threshold rollout beyond the retained must-fix set
- generic naming cleanup outside the retained `dataPath` public vocabulary issue
- unrelated active-doc routing/path fixes already closed by plan `205`

## Execution Plan

### Phase 1 - Close The Oversized Hard-Gate And Core Test Isolation Defects

Status: completed
Targets: oversized compiler test, word-editor test files, related verification

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Split `schema-compiler-prop-coverage.test.ts` into smaller owner-honest test modules while preserving focused coverage.
- [x] [Fix] Close the retained global-pollution defects in `word-editor-core` and `word-editor-renderers` tests.
- [x] [Proof] Re-run the relevant targeted test files plus `pnpm check:oversized-code-files` to prove the hard-gate defect is actually closed.

Exit Criteria:

- [x] No in-scope test file still violates the `>700` hard threshold.
- [x] The retained word-editor test isolation defects are closed.
- [x] Focused verification proves both the split coverage and the isolation fixes.
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Close Retained Test-Hardening Must-Fix Items

Status: in progress
Targets: in-scope vitest configs, Playwright files, i18n tests, related verification

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Add or restore the retained must-fix coverage gates for `flux-action-core`, `report-designer-renderers`, `spreadsheet-renderers`, `word-editor-renderers`, `flux-code-editor`, and `nop-debugger`.
- [x] [Fix] Expand `flux-formula` coverage include so the retained public compiler-entry gap is closed.
- [ ] [Fix] Expand retained must-fix test coverage where `full-7` identified real path gaps: form critical-path E2E, report-designer key writeback/action chain, and `flux-i18n` public semantic coverage.
- [ ] [Fix] Replace the retained fixed-sleep Playwright waits in the in-scope files with stable programmatic readiness conditions.
- [ ] [Decision] Record which broader test-hardening ideas remain out of scope so the plan does not silently expand into a repo-wide test modernization campaign.

Exit Criteria:

- [ ] The retained dim14 must-fix items are closed without being downgraded into optional hardening.
- [ ] Focused verification covers each landed retained test-hardening fix.
- [ ] No owner-doc update required, unless a testing reference doc genuinely changes supported verification baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Close Active Doc / API / Terminology Drift And Public Vocabulary Drift

Status: planned
Targets: in-scope docs and flux-code-editor public vocabulary files

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Update retained active docs to match the live renderer/runtime/type baseline for hooks, signatures, terminology, and removed historical notes.
- [x] [Fix] Close the retained `dataPath` public vocabulary drift in `flux-code-editor`, with explicit compatibility or migration handling if needed.
- [ ] [Proof] Add focused verification or searches proving the final doc/API vocabulary baseline is internally consistent.
- [x] [Decision] If the `dataPath` cleanup changes current supported authoring contract, update the directly affected owner docs and record the migration baseline honestly.

Exit Criteria:

- [ ] The retained active-doc and terminology drift is closed in the in-scope docs.
- [x] The retained `dataPath` public vocabulary drift is closed or explicitly migrated without parallel public contract ambiguity.
- [ ] Focused verification covers the final doc/API vocabulary baseline.
- [ ] Affected owner docs are updated where baseline changed.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained defects from dimensions `02`, `14`, `16`, and `17` are fixed, or moved to explicit successor ownership with recorded reasoning.
- [ ] The `>700` oversized-file hard gate is closed and not downgraded.
- [ ] Retained dim14 must-fix items are treated as in-scope defects, not optional hardening.
- [ ] The in-scope retained dim14 set is explicit and auditable: oversized compiler prop-coverage split, `flux-action-core` coverage gate, `flux-formula` include gap, retained high-interaction package coverage gates, word-editor test pollution, form/report critical E2E gaps, `tests/e2e/{word-editor.spec.ts,word-editor-template-expr.spec.ts,word-editor-dataset.spec.ts,debugger.spec.ts,performance-table.spec.ts}` fixed-sleep cleanup, and `flux-i18n` public semantic coverage.
- [ ] Retained active-doc / terminology / public-vocabulary drift is closed in the live baseline.
- [ ] Focused verification exists for oversized-file split, test isolation, retained hardening fixes, and doc/API vocabulary closure.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Broader Repository-Wide Test Uplift

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan owns only the retained `full-7` test-hardening defects, not a generalized coverage-quality program for every package.
- Successor Required: no

## Closure

Status Note: Partially completed. Phase 1 is closed: the oversized `flux-compiler` prop-coverage test was split into smaller modules, the `>700` hard-gate defect is gone, and the retained word-editor test-global pollution was fixed. Phase 2 is in progress with coverage-gate restoration landed and the in-scope Playwright fixed-sleep waits replaced by readiness-based assertions for `word-editor`, `debugger`, and `performance-table`. Phase 3 is also partially landed: active docs now reflect the current renderer/runtime baseline, and `flux-code-editor` source refs now use canonical `path` while still reading legacy `dataPath` for compatibility. Remaining test-hardening and `flux-i18n` semantic coverage still block full plan closure.

Closure Audit Evidence:

- Pending.

Follow-up:

- None yet. Confirmed in-scope defects must be fixed before closure.
