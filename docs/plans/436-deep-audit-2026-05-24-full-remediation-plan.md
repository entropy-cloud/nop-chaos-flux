# 436 Deep Audit 2026-05-24 Full Remediation Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-24
> Source: `docs/analysis/2026-05-24-deep-audit-full/summary.md`, `docs/analysis/2026-05-24-deep-audit-full/*.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`, `docs/plans/431-deep-audit-2026-05-23-maintenance-surface-remediation-plan.md`

## Purpose

收口 `docs/analysis/2026-05-24-deep-audit-full/` 独立复核后仍保留的全部 `152` 条 retained findings，让当前仓库重新满足以下基线：

- hard-gate docs 与 live repo 路径一致；
- 包依赖、host manifest/provider、renderer contract、state owner、styling token、a11y、test proof、error fidelity 与 owner docs 一致；
- 每条保留项都有明确修复 owner、验证方式、owner-doc obligation，且没有被降级成 vague follow-up。

这份计划是当前 `2026-05-24` full deep audit 的完整 remediation owner plan。它不是单纯 routing 表，也不声称当前已经修完任何代码。

## Current Baseline

- 本轮 full deep audit 已完成 `20/20` 维度复核，最终保留 `152` 条，其中 `P0=1`, `P1=26`, `P2=106`, `P3=19`。
- `维度05`、`维度08` 独立复核后为零保留项；`维度03-08`、`维度11-08`、`维度20-04`、`维度20-05` 已被驳回，不进入本计划修复范围。
- 当前唯一 `P0` 是 `维度16-01`：active docs 仍指向已归档 analysis 路径，导致 `pnpm check:active-doc-code-anchors` hard gate 失败。
- `P1` 集中在四类问题：dependency/cycle boundary、host manifest/provider contract、renderer raw-schema/action-slot bypass、复杂编辑器/设计器 a11y。
- 多个 finding 属于同一实际修复面，例如 `维度09-01` 与 `维度12-01` 均指向 `variant-field` raw `hint/description` 回读；执行时允许一个代码改动关闭多个 finding，但 coverage matrix 中每条 finding 仍只能有一个 owner workstream。
- 历史 completed plans 可作为背景证据，但不得替代本计划 closure；执行时必须基于 live repo 重新验证行为、owner docs、tests 与 static checks。

## Goals

- 修复全部 `152` 条 retained findings，并在 workstream 内逐项勾选 closure。
- 优先恢复 hard gate：先修 `维度16-01` 与 `维度16-02`，再处理所有 `P1`，随后处理 `P2/P3`。
- 对每个 code-affecting workstream 补必要 focused tests 或 static checks，验证正确结果而非仅验证“不报错”。
- 同步所有受影响 owner docs，且 `docs/architecture/` 与 `docs/components/` 只描述最终 live baseline，不写 proposed/current 叙事。
- 最终通过仓库级 verification，并由独立 fresh-session reviewer 完成 closure audit。

## Non-Goals

- 不重新打开已驳回 findings：`维度03-08`, `维度11-08`, `维度20-04`, `维度20-05`。
- 不把零发现维度 `05`、`08` 扩大成新的问题队列。
- 不为了修复 finding 顺手重写已 `completed` 的历史 plans；若历史计划与 live repo 冲突，以本计划和 live repo 为准。
- 不引入 backward-compatibility shim，除非 live repo 已有持久化数据、外部消费者、发布行为或用户明确要求。
- 不把 confirmed live defect、contract drift、owner-doc drift、hard gate failure 放入 non-blocking follow-up。

## Scope

### In Scope

- `docs/analysis/2026-05-24-deep-audit-full/summary.md` 中全部 `152` 条最终保留项。
- 受影响的 packages、apps、tests、scripts、owner docs、daily logs。
- 必要 focused tests、static checks、E2E proof truthfulness fixes、a11y assertions、docs anchor checks。
- 执行中发现的同一 root-cause 直接 dependent fixes，只要它们是关闭已保留 finding 的必要条件。

### Out Of Scope

- 新一轮 deep audit、open-ended adversarial review、UX audit，除非它们发现的是当前 workstream closure 的直接 blocker。
- 已驳回 finding 的重新论证。
- 与本轮 retained set 无关的 feature redesign、visual redesign、large-scale cleanup。
- 将本计划拆成大量 one-finding micro-plan；若执行中证明某个 workstream 真实 closure surface 不兼容，必须先在本计划记录 scope change，再建立 successor owner。

## Priority Policy

- `P0`: 先修，不能与普通 cleanup 混排，必须恢复 hard gate。
- `P1`: 修完后才能宣称当前 supported contract baseline 可信。
- `P2`: 已确认缺陷或 contract drift，允许排在 `P0/P1` 后，但仍属于本计划 closure 必修项。
- `P3`: 允许低优先级执行，但不能降级成 optional 或 vague residual。

## Retained Finding Coverage

| Dimension                | Final Retained | Owner Workstream                         |
| ------------------------ | -------------: | ---------------------------------------- |
| 01 Dependency graph      |              7 | Workstream 1                             |
| 02 Module responsibility |             14 | Workstream 1                             |
| 03 API surface           |             13 | Workstream 1, Workstream 2               |
| 04 State ownership       |              5 | Workstream 4                             |
| 05 Reactive precision    |              0 | none; zero retained                      |
| 06 Async safety          |              2 | Workstream 3, Workstream 4               |
| 07 Lifecycle             |              1 | Workstream 3                             |
| 08 Validation            |              0 | none; zero retained                      |
| 09 Renderer contract     |              9 | Workstream 3                             |
| 10 Styling               |             18 | Workstream 5                             |
| 11 UI components         |              7 | Workstream 6                             |
| 12 Field/slot            |              7 | Workstream 3                             |
| 13 Type safety           |              7 | Workstream 4                             |
| 14 Test coverage         |             10 | Workstream 7                             |
| 15 Security/performance  |              5 | Workstream 4                             |
| 16 Doc-code consistency  |             16 | Workstream 0, Workstream 1, Workstream 8 |
| 17 Naming                |              1 | Workstream 8                             |
| 18 Cross-package         |             10 | Workstream 2, Workstream 3, Workstream 8 |
| 19 Error propagation     |              5 | Workstream 9                             |
| 20 Accessibility         |             15 | Workstream 6                             |

## Workstream Ownership Matrix

| Workstream | Theme                                                             | Exact Retained IDs                                                                                                                                                                                                                 | Count |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| 0          | P0 docs gate recovery                                             | `维度16-01`, `维度16-02`                                                                                                                                                                                                           |     2 |
| 1          | Package boundaries, cycles, and module ownership                  | `维度01-01` through `维度01-07`; `维度02-01` through `维度02-14`; `维度03-01`; `维度16-13`, `维度16-14`                                                                                                                            |    24 |
| 2          | Host manifest, capability, and provider contracts                 | `维度03-02`, `维度03-03`, `维度03-04`, `维度03-05`, `维度03-06`, `维度03-07`, `维度03-09`, `维度03-10`, `维度03-11`, `维度03-12`, `维度03-13`, `维度03-14`; `维度18-01`, `维度18-02`, `维度18-04`, `维度18-07`, `维度18-08`        |    17 |
| 3          | Renderer normalized contract, field slots, and runtime lifecycle  | `维度06-01`; `维度07-01`; `维度09-01` through `维度09-09`; `维度12-01` through `维度12-07`; `维度18-10`                                                                                                                            |    19 |
| 4          | State truth, type safety, async failure, and performance          | `维度04-01` through `维度04-05`; `维度06-02`; `维度13-01` through `维度13-07`; `维度15-01` through `维度15-05`                                                                                                                     |    18 |
| 5          | Styling, theme tokens, and public CSS contract                    | `维度10-01` through `维度10-18`                                                                                                                                                                                                    |    18 |
| 6          | UI primitive use and accessibility workflows                      | `维度11-01` through `维度11-07`; `维度20-01`, `维度20-02`, `维度20-03`, `维度20-06`, `维度20-07`, `维度20-08`, `维度20-09`, `维度20-10`, `维度20-11`, `维度20-12`, `维度20-13`, `维度20-14`, `维度20-15`, `维度20-16`, `维度20-17` |    22 |
| 7          | Test proof fidelity and test hygiene                              | `维度14-01` through `维度14-10`                                                                                                                                                                                                    |    10 |
| 8          | Active docs, component inventory, metadata, naming, and i18n copy | `维度16-03` through `维度16-12`; `维度16-15`, `维度16-16`; `维度17-01`; `维度18-03`, `维度18-05`, `维度18-06`, `维度18-09`                                                                                                         |    17 |
| 9          | Error propagation and monitor detail fidelity                     | `维度19-01` through `维度19-05`                                                                                                                                                                                                    |     5 |
| Total      |                                                                   |                                                                                                                                                                                                                                    |   152 |

## Execution Plan

### Workstream 0 - P0 Docs Gate Recovery

Status: in progress
Targets: `docs/index.md`, `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`, `scripts/check-active-doc-code-anchors.mjs`, affected active owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Fix `维度16-01` by replacing active-doc links to archived `docs/analysis/...` paths with live owner docs, archive paths, or explicitly historical references that pass the active-doc code-anchor gate.
- [ ] Fix `维度16-02` by expanding `check-active-doc-code-anchors` coverage to active owner docs while explicitly excluding archive/log/analysis/plans paths that should not be hard-gated, and document that policy in the audit tooling and maintenance references.
- [ ] Add or update focused tests/fixtures for the anchor checker so the current broken examples and newly covered active docs are observable.
- [x] Run `pnpm check:active-doc-code-anchors` and record the exact pass result in `docs/logs/2026/05-24.md` or the execution date log.

Exit Criteria:

- [ ] `pnpm check:active-doc-code-anchors` passes.
- [ ] `维度16-01` and `维度16-02` no longer reproduce on live repo.
- [ ] The checker's active-doc inclusion/exclusion policy is documented in `docs/references/audit-tooling.md` and summarized in `docs/references/maintenance-checklist.md`.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 1 - Package Boundaries, Cycles, And Module Ownership

Status: in progress
Targets: `packages/flux-action-core`, `packages/flux-compiler`, `packages/flux-react`, `packages/flux-formula`, `packages/flux-core`, `packages/flux-runtime`, `packages/flux-code-editor`, `packages/flux-renderers-form-advanced`, `packages/flow-designer-core`, `packages/report-designer-renderers`, `packages/word-editor-core`, `packages/spreadsheet-renderers`, `packages/nop-debugger`, bundle docs and manifests

- Item Types: `Fix | Decision | Proof`

- [ ] Close all dependency manifest gaps from `维度01-01` and `维度01-02` by making runtime imports match package manifests or moving imports to true dev-only paths.
- [ ] Close `维度01-03` by removing `flux-action-core` runtime dependency on `flux-compiler`; action dispatch must consume precompiled action programs or an execution-layer contract, not invoke `compileActions` in dispatch.
- [ ] Close `维度01-04`, `维度01-05`, `维度01-06`, and `维度01-07` by breaking production value cycles in `flux-react`, `flux-formula`, `flux-core` type contract layers, and debugger diagnostics.
- [ ] Close `维度02-01` through `维度02-14` by extracting only the responsibilities needed to make current owners honest: runtime factory/import stack/page factories, compiler node aggregation, action dispatcher control flow, form owner modules, report/word/spreadsheet/code-editor ownership seams.
- [ ] Close `维度03-01` by stabilizing the production APIs currently consumed from `@nop-chaos/flux-react/unstable` or moving production renderers off that surface.
- [ ] Close `维度16-13` and `维度16-14` by deciding and implementing the actual `@nop-chaos/flux` facade stack and pack-check coverage; docs must match the chosen live bundle behavior.
- [ ] Run dependency and manifest checks: `pnpm audit:deps`, `pnpm check:workspace-manifest-deps`, `pnpm check:flux-bundle-pack`.

Exit Criteria:

- [ ] All Workstream 1 retained IDs are fixed or explicitly linked to the same landed code/docs change that fixes them.
- [ ] `pnpm audit:deps` passes or its remaining output is proven unrelated to this workstream and assigned to a new explicit owner before this workstream can close.
- [ ] Package manifests match production value imports.
- [ ] Affected owner docs are updated: at minimum `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/frontend-baseline.md`, `docs/architecture/renderer-runtime.md`, and package/component docs touched by bundle decisions.
- [ ] Focused tests cover any moved compile/runtime seam that can regress behavior.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 2 - Host Manifest, Capability, And Provider Contracts

Status: in progress
Targets: `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/spreadsheet-renderers`, `packages/word-editor-renderers`, `packages/flux-core/src/schema-diagnostics`, `packages/flux-compiler/src/schema-compiler`, host action providers and manifests

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: shared host payload validation now lives in `packages/flux-core/src/schema-diagnostics/value-shape-runtime.ts`, compiler/runtime both reject payloads for no-args methods, `FluxObjectShape` now publishes explicit `unknownKeys` semantics, spreadsheet/report/word manifests were tightened to live literal unions, and focused contract tests are green for `@nop-chaos/flux-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/report-designer-renderers`, and `@nop-chaos/word-editor-renderers`.
- Progress 2026-05-24 (continued): `designer-page` no longer publishes the drifted `$designer` `scopeExportContracts` alias and now matches the other domain-host renderers' hostContract-only publication model; table selection/sort/filter events now publish the same semantic `event + scope + evaluationBindings` context shape already used by pagination, with focused proof in `@nop-chaos/flow-designer-renderers` and `@nop-chaos/flux-renderers-data` (`维度18-07`, `维度18-08`).

- [ ] Close Flow contract drifts: `moveNodes.deltas`, `moveBranch.direction`, provider coercion, and command adapter bypasses from `维度03-02`, `维度03-06`, and `维度18-04`.
- [ ] Close Report contract drifts: `preview.mode`, no-args methods, projection `null/undefined` semantics, and manifest/runtime projection mismatch from `维度03-03`, `维度03-09`, and `维度03-14`.
- [ ] Close Spreadsheet contract drifts: missing method args, wide selection/search literals, and absent projection semantics from `维度03-04`, `维度03-05`, and `维度03-10`.
- [ ] Close Word host contract gaps from `维度03-07` and normalize host action errors from `维度18-02`.
- [ ] Close `维度03-11`, `维度03-12`, and `维度03-13` by defining and consuming shared host method/capability validation semantics, including no-args rejection and `FluxObjectShape` open/closed unknown-key behavior.
- [ ] Close cross-package validator drift from `维度18-01`, `$designer` host pattern drift from `维度18-07`, and table event payload model drift from `维度18-08`.
- [ ] Add contract tests that exercise valid payloads, invalid literals, unknown keys, no-args methods receiving payload, and absent projection fields.

Exit Criteria:

- [ ] All Workstream 2 retained IDs are fixed with shared or explicitly documented per-host semantics.
- [ ] Compiler/runtime/provider behavior agrees for host method args, literal unions, object extra keys, and absent projection values.
- [ ] Contract tests fail on the audited bad payloads and pass on documented valid payloads.
- [ ] Owner docs are updated: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/action-scope-and-imports.md`, and affected complex component docs.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 3 - Renderer Normalized Contract, Field Slots, And Runtime Lifecycle

Status: planned
Targets: `packages/flux-renderers-form-advanced`, `packages/flux-renderers-data`, `packages/flux-renderers-basic`, `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/flux-code-editor`, renderer definitions and compiler output where needed

- Item Types: `Fix | Decision | Proof`

- [ ] Close `variant-field` contract drift from `维度09-01`, `维度09-02`, `维度09-03`, and `维度12-01`: `hint/description`, `detectVariantAction`, and variant transform actions must flow through normalized props/regions/events/action channels.
- [ ] Close composite field drift from `维度09-04` and `维度12-06` by compiling scalar item validation metadata instead of peeking into raw region schema.
- [ ] Close CRUD/table raw schema fallback drifts from `维度09-05`, `维度09-08`, and `维度09-09` by compiling nested query form, quick edit, and buttons as explicit regions/events or rejecting unsupported raw schema surfaces.
- [ ] Close designer/report dynamic schema drifts from `维度09-06` and `维度09-07` by separating static compiled regions from explicitly dynamic host schema channels.
- [ ] Close detail-view async/slot drift from `维度06-01` and `维度12-05` by modeling value-adaptation actions as events/action channels and surfacing confirm failures to users.
- [ ] Close `维度07-01` by moving declarative surface child scope allocation out of render/useMemo and into a commit-safe runtime-owned lifecycle.
- [ ] Close wrapped field identity and participation drifts from `维度12-02`, `维度12-03`, `维度12-04`, `维度12-07`, and `维度18-10`.
- [ ] Add focused renderer tests that assert normalized channel usage and fail if raw authored schema is re-read in the audited paths.

Exit Criteria:

- [ ] All Workstream 3 retained IDs are fixed without introducing new raw schema render paths.
- [ ] Renderer components continue to follow `RendererComponentProps`: schema-driven values from `props.props`, state from `props.meta`, children from `props.regions`, handlers from `props.events`.
- [ ] Lifecycle-sensitive scope allocation is after-commit and cleaned up correctly.
- [ ] Owner docs are updated: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/surface-owner.md`, and affected component docs.
- [ ] Focused tests cover correct rendered result, event dispatch path, and failure UI where applicable.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 4 - State Truth, Type Safety, Async Failure, And Performance

Status: planned
Targets: `packages/spreadsheet-renderers`, `packages/spreadsheet-core`, `packages/report-designer-renderers`, `packages/report-designer-core`, `packages/word-editor-core`, `packages/word-editor-renderers`, `apps/playground/src/taskflow-designer-lib`, `packages/flux-code-editor`, `packages/flux-renderers-data`, `packages/flux-renderers-form`, `packages/flow-designer-renderers`

- Item Types: `Fix | Decision | Proof`

- [ ] Close state-owner truth issues from `维度04-01` through `维度04-05`: spreadsheet viewport, table visible columns, report/spreadsheet dirty save, word current page, and word chart/code count truth.
- [ ] Close playground Report Designer async failure handling from `维度06-02` with observable user feedback and rollback/error reporting where writes can partially fail.
- [ ] Close TaskFlow type/data loss issues from `维度13-01`, `维度13-02`, and `维度13-03` by aligning unions, preserving node data, and strengthening validation.
- [ ] Close runtime input guard issues from `维度13-04` through `维度13-07`: spreadsheet page props, code-editor configs/source arrays, chart series/data, and choice options.
- [ ] Close performance redlines from `维度15-01` through `维度15-05`: tree-mode stringify, whole-tree cloning, TreeRenderer O(n²) set creation, report designer broad subscriptions, spreadsheet whole-snapshot/repeated-selection updates.
- [ ] Add focused tests or performance-oriented regression checks that verify the actual bounded behavior or state owner result.

Exit Criteria:

- [ ] All Workstream 4 retained IDs are fixed with one clear owner for each state truth.
- [ ] Invalid dynamic inputs are normalized, rejected, or safely ignored according to documented contract.
- [ ] Performance fixes remove the audited O(n²), whole-graph stringify/clone, or whole-snapshot subscription pattern rather than only masking symptoms.
- [ ] Owner docs are updated: `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/word-editor/design.md`, and affected component docs as needed.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 5 - Styling, Theme Tokens, And Public CSS Contract

Status: planned
Targets: `packages/spreadsheet-renderers`, `packages/flow-designer-renderers`, `packages/flux-code-editor`, `packages/nop-debugger`, `packages/word-editor-renderers`, `packages/flux-bundle`, `packages/flux-react`, `packages/flux-renderers-form`, `packages/ui`, `packages/theme-tokens`, `packages/tailwind-preset`, `apps/playground/src/styles.css`

- Item Types: `Fix | Decision | Proof`

- [ ] Close Spreadsheet CSS scope/token issues from `维度10-01` through `维度10-04`.
- [ ] Close Flow Designer token/focus/palette issues from `维度10-05`, `维度10-06`, and `维度10-14`.
- [ ] Close Code Editor, Debugger, Word Editor theme inheritance issues from `维度10-07`, `维度10-08`, `维度10-09`, and `维度10-18`.
- [ ] Close public bundle/UI/theme token issues from `维度10-10` through `维度10-13`, `维度10-15`, `维度10-16`, and `维度10-17`.
- [ ] Add token validity tests or CSS-focused checks for default root tokens, full color values, popover/sidebar/destructive/toaster/base.css, and package root scoping.

Exit Criteria:

- [ ] All Workstream 5 retained IDs are fixed without violating the renderer styling contract.
- [ ] Layout renderers still emit marker classes only; widget renderers keep internal UI styling where appropriate.
- [ ] Public CSS exports resolve required colors under default theme roots without playground-only selectors.
- [ ] Owner docs are updated: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/renderer-markers-and-selectors.md`, and package CSS docs touched by the fix.
- [ ] `pnpm check:package-css-exports` passes.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 6 - UI Primitive Use And Accessibility Workflows

Status: in progress
Targets: `packages/flux-renderers-data`, `packages/flow-designer-renderers`, `packages/nop-debugger`, `packages/word-editor-renderers`, `packages/flux-renderers-form`, `packages/flux-renderers-form-advanced`, `packages/flux-code-editor`, `packages/ui`, `packages/spreadsheet-renderers`, accessibility-focused tests

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: closed the current debugger/word tabs slice from `维度11-03`, `维度11-04`, `维度11-05`, and `维度20-17` by migrating `packages/nop-debugger/src/panel.tsx` from a handwritten `div role="tablist" + Button` implementation onto `@nop-chaos/ui` `Tabs/TabsList/TabsTrigger/TabsContent`, and by converting `packages/word-editor-renderers/src/word-editor-page.tsx` plus `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx` to the supported controlled `Tabs value/onValueChange` contract with stable `TabsContent value="..."` panels. Focused proof now lives in `packages/nop-debugger/src/panel.test.tsx`, `packages/word-editor-renderers/src/__tests__/expr-insert-dialog.test.tsx`, and `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx`.
- Progress 2026-05-24 (continued): closed the base field error-linkage gap from `维度20-01` by updating `packages/flux-renderers-form/src/renderers/input.tsx` and `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` so text inputs and `textarea` now publish `aria-describedby` plus `aria-errormessage` when field validation errors are shown, matching the stable contract already used by `input-number` and choice controls. Focused proof now lives in `packages/flux-renderers-form/src/__tests__/form-validation-ui.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-renderers-form test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the fieldset disclosure primitive drift from `维度11-06` by migrating `packages/flux-renderers-form/src/renderers/fieldset.tsx` onto the shared `@nop-chaos/ui` `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` contract while preserving the `fieldset/legend` host shape through the trigger `render` path. Focused proof remains green in `packages/flux-renderers-form/src/__tests__/fieldset-interaction.test.tsx` and `packages/flux-renderers-form/src/__tests__/form-package-exports.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-renderers-form test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the DingFlow add-node focus-return gap from `维度20-08` by threading the opening trigger ref through `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx` into `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx`, so `Escape`, outside click, and item selection now restore focus to the branch/merge trigger button when it still exists. Focused proof now lives in `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.test.tsx` together with the existing overlay/control tests, and focused verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/dingflow/ding-flow-add-node-menu.test.tsx src/dingflow/ding-flow-add-branch-overlay.test.tsx src/designer-controls.test.tsx` plus package `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Code Editor accessibility bridge from `维度20-12` by extending `packages/flux-code-editor/src/use-code-mirror.ts` with CodeMirror `contentAttributes` support and forwarding field error semantics into the real `.cm-content` focus target from `packages/flux-code-editor/src/code-editor-renderer.tsx`. Focused regression proof now lives in `packages/flux-code-editor/src/code-editor.integration.test.tsx`, with the hook mock updated in `packages/flux-code-editor/src/use-code-mirror.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-code-editor test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Spreadsheet toolbar state-semantics gap from `维度20-15` by teaching the shared `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx` to publish `aria-pressed` whenever a style/alignment control is active, so bold/italic/underline and alignment buttons no longer rely on `data-toolbar-active` plus visual variants alone. Focused proof now lives in `packages/spreadsheet-renderers/src/spreadsheet-toolbar.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/spreadsheet-renderers test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Flow palette primitive drift from `维度11-07` by migrating `packages/flow-designer-renderers/src/designer-palette.tsx` group disclosure onto the shared `@nop-chaos/ui` `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` contract instead of a renderer-local `Button + aria-expanded` implementation. Focused proof remains green in `packages/flow-designer-renderers/src/designer-controls.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers test`, `lint`, `typecheck`, and `build`.

- [ ] Close UI primitive bypasses from `维度11-01` through `维度11-07`, using `@nop-chaos/ui` primitives where available or adding missing primitives following repo conventions.
- [ ] Close field/error/loading accessibility issues from `维度20-01`, `维度20-02`, and `维度20-03`.
- [ ] Close Flow keyboard/focus workflows from `维度20-06`, `维度20-08`, `维度20-09`, `维度20-13`, and `维度20-14`.
- [ ] Close draggable dialog keyboard accessibility from `维度20-07`.
- [ ] Close Word and Code Editor accessible boundary/editor semantics from `维度20-10` and `维度20-12`.
- [ ] Close Report/Spreadsheet non-color state and toolbar/sheet tab accessibility from `维度20-11`, `维度20-15`, and `维度20-16`.
- [ ] Close Debugger tab semantics from `维度20-17`, coordinating with `维度11-03` so one primitive migration closes both issues.
- [ ] Add focused RTL/unit/E2E accessibility proof for keyboard equivalent flows, focus return, `aria-*` state, and accessible editor names.

Exit Criteria:

- [ ] All Workstream 6 retained IDs are fixed with keyboard and screen-reader observable behavior, not only visual changes.
- [ ] Raw HTML is not used where `@nop-chaos/ui` provides a suitable primitive.
- [ ] Focus management is deterministic after add/delete/close/rename workflows.
- [ ] Owner docs are updated: relevant component docs, `docs/architecture/renderer-runtime.md`, `docs/components/code-editor/design.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/word-editor/design.md`, and `docs/testing/e2e-standards.md` if test standards changed.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 7 - Test Proof Fidelity And Test Hygiene

Status: planned
Targets: `tests/e2e`, `packages/ui/src/components/ui`, `packages/flux-renderers-basic/src/__tests__`, `packages/flux-renderers-data/src/__tests__`, `packages/flux-code-editor`, `packages/flux-react/src/__tests__`, affected test helpers

- Item Types: `Fix | Proof`

- [ ] Close `维度14-01` by replacing the skipped synthetic-only Flow edge creation proof with a real supported handle-to-handle user path.
- [ ] Close broad test-file maintenance findings from `维度14-02` and `维度14-06` by splitting by renderer/contract owner while preserving assertions.
- [ ] Close primitive test gaps from `维度14-03` with minimal behavior/ARIA/data-slot coverage for high-use UI primitives.
- [ ] Close proof truthfulness issues from `维度14-04` and `维度14-05` by asserting user-visible content/status instead of probe/debug JSON as the primary proof.
- [ ] Close mock cleanup and default-suite hygiene issues from `维度14-07`, `维度14-08`, `维度14-09`, and `维度14-10`.
- [ ] Update E2E standards or project tags if diagnostic specs are moved out of the default supported suite.

Exit Criteria:

- [ ] All Workstream 7 retained IDs are fixed without weakening prior assertions.
- [ ] Supported E2E tests prove supported user paths; diagnostic/probe-only specs are isolated or explicitly tagged.
- [ ] Test cleanup restores mocks/spies even on failing assertions.
- [ ] Owner docs are updated: `docs/testing/e2e-standards.md`, `docs/references/e2e-test-diagnostic-guide.md`, and affected test docs if behavior changed.
- [ ] Relevant package tests and E2E tests pass.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 8 - Active Docs, Component Inventory, Metadata, Naming, And I18n Copy

Status: in progress
Targets: `docs/architecture`, `docs/components`, `docs/references`, `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/word-editor-renderers`, `packages/flux-renderers-form`, examples manifests and component registries

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: closed the current retained metadata/i18n/naming/docs slice from `维度16-03`, `维度16-05`, `维度16-06`, `维度16-07`, `维度16-08`, `维度16-09`, `维度16-10`, `维度16-11`, `维度16-12`, `维度16-15`, `维度16-16`, `维度17-01`, `维度18-03`, `维度18-05`, `维度18-06`, and `维度18-09` by updating `docs/architecture/flux-runtime-module-boundaries.md` so compiler/runtime owner paths and validation-test references match the live `schema-compiler` split plus current runtime test layout; rewriting `docs/components/package-splitting-strategy.md` so it distinguishes live packages from target-state `content/layout` packages, records Phase 3 `form-advanced` as already completed, and splits runtime vs dev/test dependency truth tables to match current manifests; rewriting `docs/architecture/surface-owner.md` and `docs/components/dialog/design.md` so surface control truthfully reflects the current `openDialog` / `openDrawer` / `closeSurface` baseline instead of claiming `component:open/close/toggle` are already published component handles; removing stale `input-number` “not yet implemented” claims from `docs/components/index.md` and `docs/components/roadmap.md`; replacing drifted `flux-react/src/index.tsx:479` architecture anchors with the current `schema-renderer/hooks/dialog-host/workbench` owner files; updating `action-scope-and-imports.md` to point `RendererRuntime.dispatch()` at `packages/flux-core/src/types/renderer-core.ts`; rewriting `docs/components/data-source/design.md` so its refresh contract matches the live runtime-owned `refreshSource + targetId` baseline instead of promising `component:refresh`; adding the live `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view` registrations to the active component runtime inventory and `examples.manifest.json`; updating `docs/architecture/renderer-runtime.md` so its renderer metadata baseline no longer pretends coverage stops at the original four pilots and instead reflects the live `tabs/table/chart/code-editor` expansion; moving Report field panel field-count chrome, Word Editor dataset dialog placeholder/remove-column labels, and Flow Designer branch action `aria-label`s onto the repository's `@nop-chaos/flux-i18n` pattern; publishing `sourcePackage: '@nop-chaos/flux-renderers-form'` on all 10 base form input renderer definitions; and removing the deprecated `createFlowDesignerRegistry()` alias from the stable `@nop-chaos/flow-designer-renderers` root export while preserving it behind `./unstable`. Focused proof now lives in `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`, `packages/word-editor-renderers/src/__tests__/dialog-accessibility.test.tsx`, `packages/flow-designer-renderers/src/designer-controls.test.tsx`, `packages/flux-renderers-form/src/__tests__/form-renderer-definition-contracts.test.ts`, and `packages/flow-designer-renderers/src/public-surface.test.ts`.

- [ ] Close stale doc path/status issues from `维度16-03` through `维度16-12`, including deleted tests, package splitting state, surface capabilities, input-number roadmap status, stale anchors, package topology, action dispatch anchors, data-source refresh contract, and component inventory.
- [ ] Close metadata/inventory docs drift from `维度16-15`, `维度16-16`, and `维度18-09`.
- [ ] Close naming/API clarity issue from `维度17-01` by either renaming `createFlowDesignerRegistry` to match behavior or documenting/exporting a truthful alias strategy.
- [ ] Close hardcoded English/i18n copy findings from `维度18-03`, `维度18-05`, and `维度18-06` with the repository's supported i18n/message pattern.
- [ ] Re-run active doc anchor checks after docs edits and add focused proof for component registry inventory if a script already exists or is added by Workstream 0.

Exit Criteria:

- [ ] All Workstream 8 retained IDs are fixed; active docs describe live repo behavior only.
- [ ] Component status, examples manifest, renderer metadata, and package matrices agree with registered definitions and package manifests.
- [ ] i18n/a11y strings use the repository's supported localization pattern; documented bad baseline is not an acceptable closure path for these retained defects.
- [ ] `pnpm check:active-doc-code-anchors` passes after this workstream's doc edits.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 9 - Error Propagation And Monitor Detail Fidelity

Status: planned
Targets: `packages/flux-runtime`, `packages/flow-designer-renderers`, `packages/word-editor-renderers`, `packages/flux-react`, `packages/nop-debugger`, monitor adapters/helpers

- Item Types: `Fix | Proof`

- [ ] Close `维度19-01` by preserving non-Error cause/details in formula data-source async failures.
- [ ] Close `维度19-02` by preserving original failure cause in Flow auto-layout errors.
- [ ] Close `维度19-03` by preserving non-Error cause in Word save exception wrapping.
- [ ] Close `维度19-04` by preserving schema/runtime import load monitor rejection cause/details.
- [ ] Close `维度19-05` by propagating `Error.cause` and monitor details through Debugger events.
- [ ] Add tests that assert the propagated cause/details are visible to the consumer, not merely that an error is thrown.

Exit Criteria:

- [ ] All Workstream 9 retained IDs are fixed with observable diagnostic fidelity.
- [ ] Error wrapping preserves cause/details consistently across runtime, renderer, and debugger monitor boundaries.
- [ ] Owner docs are updated: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/api-data-source.md`, and package-specific docs if public behavior changed.
- [ ] `docs/logs/` corresponding date entry is updated.

### Workstream 10 - Final Integration Verification And Closure Audit

Status: planned
Targets: entire workspace, this plan, affected owner docs, daily log

- Item Types: `Proof | Decision`

- [ ] Re-read all source dimension files and this plan, confirming the `152` retained findings remain one-to-one owned and closed.
- [ ] Run required verification after all code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [ ] Run relevant audit/static checks: `pnpm audit:deps`, `pnpm check:active-doc-code-anchors`, `pnpm check:workspace-manifest-deps`, `pnpm check:package-css-exports`, `pnpm check:flux-bundle-pack`, `pnpm check:schema-prop-coverage`, `pnpm check:oversized-code-files`, and the `pnpm check:audit-*` scripts used as source guards when applicable.
- [ ] Run relevant E2E tests for changed supported flows, including Flow Designer connection keyboard/drag paths, Word Editor canvas accessibility, Code Editor accessibility, Spreadsheet toolbar/sheet tabs, CRUD proof truthfulness, and diagnostic suite isolation.
- [ ] If unit tests and E2E tests both pass completely, follow repository full-green protocol: record the full-green status and counts/package summary in `docs/logs/{year}/{month}-{day}.md`, then commit all current changes with a commit subject that explicitly includes `full-green verification`.
- [ ] Launch a fresh independent closure-audit reviewer that checks live code, owner docs, focused tests, this plan, and deferred/follow-up honesty.

Exit Criteria:

- [ ] Every Workstream 0-9 is `completed` and every workstream exit criterion is checked.
- [ ] No retained finding remains ownerless, multiply-owned, partially fixed, or moved to non-blocking follow-up.
- [ ] All required verification commands listed in Closure Gates pass before this plan can close.
- [ ] Independent closure audit passes and evidence is recorded in this plan or the corresponding daily log.
- [ ] Only after the prior items are true may `Plan Status` be changed to `completed`.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] All `152` retained findings from `docs/analysis/2026-05-24-deep-audit-full/summary.md` are fixed or explicitly closed by the same landed code/docs change that fixes them.
- [ ] `维度16-01` P0 hard gate is fixed and `pnpm check:active-doc-code-anchors` passes.
- [ ] All `P1` contract/runtime/a11y findings are fixed before lower-priority residual cleanup is considered closed.
- [ ] No in-scope confirmed live defect, contract drift, owner-doc drift, or hard-gate failure is deferred or downgraded to follow-up.
- [ ] Required owner docs are updated to the final live baseline.
- [ ] Necessary focused tests and static checks prove the corrected result.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] Relevant E2E tests for changed supported flows pass.
- [ ] Relevant `pnpm check:*` and `pnpm audit:deps` commands pass.
- [ ] `docs/logs/` has a dated entry for the remediation execution and final closure state.
- [ ] Independent fresh-session closure audit is complete and recorded.
- [ ] Text consistency check confirms `Plan Status`, every Workstream `Status`, every Exit Criteria checklist, Closure Gates, and daily log evidence agree.

## Deferred But Adjudicated

None at draft time. Every retained finding is in scope for this plan. A finding can leave scope only through an explicit recorded scope change with successor ownership; it cannot be moved here merely because it is lower priority.

## Non-Blocking Follow-ups

None at draft time.

## Draft Review Record

- Initial draft created from `docs/analysis/2026-05-24-deep-audit-full/summary.md` and retained-finding extraction across all 20 dimensions.
- Independent draft review iteration 1: `needs revision` (`ses_1a89b0bddffe05kh357FjjtXSJ`) because i18n retained defects could be closed by documenting the bad baseline, Workstream 0 made hard-gate policy docs conditional, and final verification allowed scoped-out failures. The draft was revised to require real i18n fixes, unconditional audit-tooling/maintenance docs, and unconditional Closure Gates verification before completion.
- Independent draft review iteration 2: `needs revision` (`ses_1a898dac9ffed9fe19m7Mm1H0n`) because final verification still allowed Closure Gates to be revised around unrelated failures. The draft was revised again so plan completion requires every command listed in Closure Gates to pass.
- Independent draft review iteration 3: `accept` (`ses_1a89774b4ffeksHGxobVoPNWDI`). The final review confirmed the planned code remediation plan owns exactly `152` retained findings once, excludes rejected and zero-retained findings, keeps confirmed defects in scope, and has honest Closure Gates.

## Closure

Status Note: Partial progress only. The current session fixed the `维度16-01` docs-gate blocker and restored a green workspace verification chain (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`), but Workstream 0 still has open items and the remaining retained-finding workstreams are untouched, so this full remediation plan cannot be marked `completed`.

Additional Progress Note: follow-up execution has now started Workstreams 1, 2, and 6. The live repo now closes `维度01-01` by moving `@nop-chaos/flux-runtime` into `packages/flux-renderers-form-advanced/package.json` runtime dependencies, closes the literal-union host drift for `维度03-03` and `维度03-06` by tightening `preview.mode` and `moveBranch.direction` in published manifests with provider regression tests, and closes the focused form accessibility gaps from `维度20-02` and `维度20-03` by wiring `input-number` error `aria-describedby` and making async select/radio/checkbox-group loading states explicit polite status messages. Workstreams 1, 2, and 6 remain open because the rest of their retained findings are still outstanding.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj` reviewed the child-plan closures and confirmed this deep-audit parent must remain incomplete after the current session.
- Evidence: fresh-session audit confirmed only partial execution under this plan: the active-doc gate now passes, but the remaining retained-finding queue is still open, so the honest parent status is `partially completed`, not `completed`.

Follow-up:

- No remaining plan-owned work may be listed here until all retained findings are either fixed or moved through an explicit scope-change decision with successor ownership.
