# 436 Deep Audit 2026-05-24 Full Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-26
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

Status: completed
Targets: `docs/index.md`, `docs/architecture/playground-experience.md`, `docs/architecture/debugger-runtime.md`, `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`, `scripts/check-active-doc-code-anchors.mjs`, affected active owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Fix `维度16-01` by replacing active-doc links to archived `docs/analysis/...` paths with live owner docs, archive paths, or explicitly historical references that pass the active-doc code-anchor gate.
- [x] Fix `维度16-02` by expanding `check-active-doc-code-anchors` coverage to active owner docs while explicitly excluding archive/log/analysis/plans paths that should not be hard-gated, and document that policy in the audit tooling and maintenance references.
- [x] Add or update focused tests/fixtures for the anchor checker so the current broken examples and newly covered active docs are observable.
- [x] Run `pnpm check:active-doc-code-anchors` and record the exact pass result in `docs/logs/2026/05-24.md` or the execution date log.

Exit Criteria:

- [x] `pnpm check:active-doc-code-anchors` passes.
- [x] `维度16-01` and `维度16-02` no longer reproduce on live repo.
- [x] The checker's active-doc inclusion/exclusion policy is documented in `docs/references/audit-tooling.md` and summarized in `docs/references/maintenance-checklist.md`.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 1 - Package Boundaries, Cycles, And Module Ownership

Status: completed
Targets: `packages/flux-action-core`, `packages/flux-compiler`, `packages/flux-react`, `packages/flux-formula`, `packages/flux-core`, `packages/flux-runtime`, `packages/flux-code-editor`, `packages/flux-renderers-form-advanced`, `packages/flow-designer-core`, `packages/report-designer-renderers`, `packages/word-editor-core`, `packages/spreadsheet-renderers`, `packages/nop-debugger`, bundle docs and manifests

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-25: closed the remaining dependency/cycle verification fallout for this workstream and revalidated the live boundary baseline. `packages/flux-action-core/src/action-dispatcher/{types.ts,program-utils.ts,action-execution.ts}` now stay compiler-independent at runtime while `packages/flux-runtime/src/runtime-factory.ts` injects `actionProgramCompiler` / `expressionCompiler`; `packages/flux-core/src/types/{schema-base-types.ts,expression-env-types.ts,compiled-value-types.ts,resolved-node-types.ts,renderer-definition-types.ts,schema-diagnostics-types.ts}` now hold the structural seam contracts used to break the retained `flux-core` type cycles; `packages/flux-renderers-data/src/{crud-renderer-state.ts,table-renderer/use-table-handle.ts,table-renderer/capability-action-context.ts}` now bridge component-capability context to the renderer event `Partial<ActionContext>` contract explicitly instead of depending on widened core types; `packages/flux-code-editor/src/index.ts`, `packages/flux-renderers-form-advanced/src/index.tsx`, `packages/flux-react/src/node-renderer-resolved.tsx`, `packages/flux-react/src/hooks.ts`, `packages/nop-debugger/src/{adapters.ts,controller-component-inspector.ts,explanations.ts}`, `packages/flux-formula/src/evaluate.ts`, and `packages/report-designer-renderers/src/page-renderer.tsx` were tightened so the new boundary contracts survive workspace `typecheck`/`build`/`lint`. Live verification is now green for `pnpm audit:deps`, `pnpm check:workspace-manifest-deps`, `pnpm check:flux-bundle-pack`, `pnpm typecheck`, `pnpm build`, and `pnpm lint`.
- Progress 2026-05-25 (continued): closed `维度03-01` by stabilizing the renderer-facing subset that had already become a production contract. `packages/flux-react/src/index.tsx` now exports `RenderNodes`, `FormContext`, `ScopeContext`, `ValidationContext`, `FormLayoutContext`, `createFormComponentHandle`, and `createReadonlyScopeBinding` from the root entry, while the production renderer paths in `packages/flux-renderers-form`, `packages/flux-renderers-form-advanced`, `packages/flux-renderers-data`, and `packages/flow-designer-renderers` now import those symbols from `@nop-chaos/flux-react` instead of `@nop-chaos/flux-react/unstable`. Focused proof is green for `packages/flux-react/src/__tests__/public-surface.test.ts`, package `typecheck` in `@nop-chaos/flux-react`, `@nop-chaos/flow-designer-renderers`, `@nop-chaos/flux-renderers-form`, `@nop-chaos/flux-renderers-form-advanced`, and `@nop-chaos/flux-renderers-data`, plus focused renderer package tests covering the touched stable surface.

- [x] Close all dependency manifest gaps from `维度01-01` and `维度01-02` by making runtime imports match package manifests or moving imports to true dev-only paths.
- [x] Close `维度01-03` by removing `flux-action-core` runtime dependency on `flux-compiler`; action dispatch must consume precompiled action programs or an execution-layer contract, not invoke `compileActions` in dispatch.
- [x] Close `维度01-04`, `维度01-05`, `维度01-06`, and `维度01-07` by breaking production value cycles in `flux-react`, `flux-formula`, `flux-core` type contract layers, and debugger diagnostics.
- [x] Close `维度02-01` through `维度02-14` by extracting only the responsibilities needed to make current owners honest: runtime factory/import stack/page factories, compiler node aggregation, action dispatcher control flow, form owner modules, report/word/spreadsheet/code-editor ownership seams.
- [x] Close `维度03-01` by stabilizing the production APIs currently consumed from `@nop-chaos/flux-react/unstable` or moving production renderers off that surface.
- [x] Close `维度16-13` and `维度16-14` by deciding and implementing the actual `@nop-chaos/flux` facade stack and pack-check coverage; docs must match the chosen live bundle behavior.
- [x] Run dependency and manifest checks: `pnpm audit:deps`, `pnpm check:workspace-manifest-deps`, `pnpm check:flux-bundle-pack`.

Exit Criteria:

- [x] All Workstream 1 retained IDs are fixed or explicitly linked to the same landed code/docs change that fixes them.
- [x] `pnpm audit:deps` passes or its remaining output is proven unrelated to this workstream and assigned to a new explicit owner before this workstream can close.
- [x] Package manifests match production value imports.
- [x] Affected owner docs are updated: at minimum `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/frontend-baseline.md`, `docs/architecture/renderer-runtime.md`, and package/component docs touched by bundle decisions.
- [x] Focused tests cover any moved compile/runtime seam that can regress behavior.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 2 - Host Manifest, Capability, And Provider Contracts

Status: completed
Targets: `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/spreadsheet-renderers`, `packages/word-editor-renderers`, `packages/flux-core/src/schema-diagnostics`, `packages/flux-compiler/src/schema-compiler`, host action providers and manifests

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: shared host payload validation now lives in `packages/flux-core/src/schema-diagnostics/value-shape-runtime.ts`, compiler/runtime both reject payloads for no-args methods, `FluxObjectShape` now publishes explicit `unknownKeys` semantics, spreadsheet/report/word manifests were tightened to live literal unions, and focused contract tests are green for `@nop-chaos/flux-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/report-designer-renderers`, and `@nop-chaos/word-editor-renderers`.
- Progress 2026-05-24 (continued): `designer-page` no longer publishes the drifted `$designer` `scopeExportContracts` alias and now matches the other domain-host renderers' hostContract-only publication model; table selection/sort/filter events now publish the same semantic `event + scope + evaluationBindings` context shape already used by pagination, with focused proof in `@nop-chaos/flow-designer-renderers` and `@nop-chaos/flux-renderers-data` (`维度18-07`, `维度18-08`).
- Progress 2026-05-25: closed `维度18-02` by moving `packages/word-editor-renderers/src/word-editor-action-provider.ts` onto the same provider-boundary error template already used by spreadsheet/report host providers. All published `word-editor:*` methods now normalize bridge/store throws into stable `ActionResult` failures instead of allowing `insertField`, `insertChart`, `insertCode`, `undo`, or `redo` to reject past the namespace boundary. Focused proof is green in `packages/word-editor-renderers/src/__tests__/word-editor-action-provider.test.ts`, and package `typecheck` plus `build` are green for `@nop-chaos/word-editor-renderers`.
- Progress 2026-05-25 (continued): closed the remaining `moveNodes.deltas` contract gap from `维度03-02` by extending `FluxValueShape` with a shared `record` dictionary shape in `packages/flux-core/src/schema-diagnostics/{manifest.ts,value-shape-runtime.ts}` and `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts`, then publishing Flow `designer:moveNodes` as a true `record<{ dx: number; dy: number }>` contract in `packages/flow-designer-renderers/src/designer-manifest.ts`. Focused proof is green in `packages/flux-core/src/schema-diagnostics/manifest.test.ts`, `packages/flux-compiler/src/{schema-compiler-shape-validation-value-shape.test.ts,schema-compiler-host-action-validation.test.ts}`, and `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx`, with package `typecheck` and `build` green for `@nop-chaos/flux-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/flow-designer-core`, and `@nop-chaos/flow-designer-renderers`.
- Progress 2026-05-25 (continued): re-audited the Report host contract slices and confirmed `维度03-03` / `维度03-09` were already closed live (`preview.mode` is now a literal union and no-args methods reject payloads through the shared validator). Closed the remaining projection-truthfulness gap from `维度03-14` by normalizing nested `designer.selectionKind` and `designer.inspectorPanels` to `null` in `packages/report-designer-renderers/src/host-data.ts` so the runtime-published scope matches the manifest's `string | null` and `unknown | null` contracts. Focused proof is green in `packages/report-designer-renderers/src/{host-data.test.ts,host-action-provider.test.ts}`, with package `typecheck` and `build` green for `@nop-chaos/report-designer-renderers`.
- Progress 2026-05-25 (continued): re-audited the remaining Workstream 2 checklist and confirmed the spreadsheet contract slices were already closed live (`维度03-04`, `维度03-05`, `维度03-10`), then closed the last Flow provider-tail drift from `维度18-04` by normalizing direct-core `designer:*` failures onto the same ActionResult-shaped `{ ok: false, error, cause }` boundary used by adapter-backed commands. `packages/flow-designer-renderers/src/designer-action-provider.ts` now returns structured `cause.reason` payloads for failed transaction, selection-toggle, and batch selection/update calls instead of leaking ad hoc bare `{ ok:false, reason }` objects. Focused proof is green in `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx`, with package `typecheck` and `build` green for `@nop-chaos/flow-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度03-12` end-to-end. `packages/flux-runtime/src/action-adapter.ts` now resolves the invoked handle's renderer definition via `runtime.registry.get(handle.type)` and enforces published `componentCapabilityContracts` args/result shapes at the component-action boundary, while `packages/flux-compiler/src/schema-compiler/{shape-validation-traversal.ts,shape-validation-analyze.ts,shape-validation-rules.ts,action-selector-validation.ts}` now build a validation-only index of unique schema `componentId -> renderer definition` bindings and consume the same published contracts for compile-time method/args validation when the target id is statically unique. Duplicate ids and `componentName` targets intentionally remain on the existing `unvalidated-component-target` warning path because they still lack stable target-binding metadata. Focused proof is green in `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts` and `packages/flux-compiler/src/{schema-compiler-host-action-validation.test.ts,schema-compiler-registry-compilation.test.ts}`, with package `typecheck` and `build` green for both `@nop-chaos/flux-runtime` and `@nop-chaos/flux-compiler`.

- [x] Close Flow contract drifts: `moveNodes.deltas`, `moveBranch.direction`, provider coercion, and command adapter bypasses from `维度03-02`, `维度03-06`, and `维度18-04`.
- [x] Close Report contract drifts: `preview.mode`, no-args methods, projection `null/undefined` semantics, and manifest/runtime projection mismatch from `维度03-03`, `维度03-09`, and `维度03-14`.
- [x] Close Spreadsheet contract drifts: missing method args, wide selection/search literals, and absent projection semantics from `维度03-04`, `维度03-05`, and `维度03-10`.
- [x] Close Word host contract gaps from `维度03-07` and normalize host action errors from `维度18-02`.
- [x] Close `维度03-11`, `维度03-12`, and `维度03-13` by defining and consuming shared host method/capability validation semantics, including no-args rejection and `FluxObjectShape` open/closed unknown-key behavior.
- [x] Close cross-package validator drift from `维度18-01`, `$designer` host pattern drift from `维度18-07`, and table event payload model drift from `维度18-08`.
- [x] Add contract tests that exercise valid payloads, invalid literals, unknown keys, no-args methods receiving payload, and absent projection fields.

Exit Criteria:

- [x] All Workstream 2 retained IDs are fixed with shared or explicitly documented per-host semantics.
- [x] Compiler/runtime/provider behavior agrees for host method args, literal unions, object extra keys, and absent projection values.
- [x] Contract tests fail on the audited bad payloads and pass on documented valid payloads.
- [x] Owner docs are updated: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/action-scope-and-imports.md`, and affected complex component docs.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 3 - Renderer Normalized Contract, Field Slots, And Runtime Lifecycle

Status: completed
Targets: `packages/flux-renderers-form-advanced`, `packages/flux-renderers-data`, `packages/flux-renderers-basic`, `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/flux-code-editor`, renderer definitions and compiler output where needed

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-26: re-audited the remaining open Flow Designer renderer-contract slice (`维度09-06`) against the live compiler/runtime seam. The first attempt to lower `designer-page.config` nested schema-bearing leaves (`nodeType.body`, `quickActions`, `edgeType.body`, `createDialog.body`, inspector bodies) through `compileDesignerConfig()` into compiled template nodes initially failed because the ordinary `propsProgram` runtime-value tree compiler recursively rewrote embedded `TemplateNode` fragments. That seam is now closed with a minimal explicit contract extension instead of a renderer-only hack: `packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts` now preserves precompiled `CompiledActionProgram` and `TemplateNode`-bearing artifacts as atomic static leaves, and `packages/flow-designer-renderers/src/renderer-definitions.ts` now precompiles the audited schema-bearing `config` leaves through `context.compileSchema(...)`. Existing Flow consumption paths (`RenderNodes` / `helpers.render(...)`) therefore receive compiled fragments rather than recompiling raw authored schema at render time. Focused proof is green for `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/edge-label-expression.test.tsx src/designer-page-rendering.test.tsx src/designer-page-failures.test.tsx` and `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`.
- Progress 2026-05-26 (continued): re-audited the rest of the parent Workstream 3 checklist against live code/docs instead of assuming the remaining unchecked lines were all still open. Confirmed `维度09-07` is already closed live: `packages/report-designer-renderers/src/renderers.tsx` now models `report-inspector.body` as a compiled `region`, while `packages/report-designer-renderers/src/report-designer-inspector.tsx` keeps host-provided `inspectorPanels` / `resolvedSchema` on a separate dynamic schema channel. Closed `维度18-10` on the live code path by teaching `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` to register the editor with the active form or validation owner whenever `code-editor` publishes `validation.kind = 'field'`; focused proof is green in `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.test.tsx`, with package `typecheck` / `build` / `lint` green for `@nop-chaos/flux-code-editor`. Closed `维度12-05` on the live code path by giving `detail-field` / `detail-view` value-adaptation slots an honest compiled owner-action channel without pretending they are DOM event handlers: `packages/flux-core/src/types/schema.ts` and `packages/flux-compiler/src/schema-compiler/node-compiler.ts` now let custom field compilers precompile action programs, `packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts` preserves `CompiledActionProgram` values as atomic static leaves instead of recursively rewriting them, and `packages/flux-renderers-form-advanced/src/detail-view/{detail-field.tsx,detail-view.tsx,value-adaptation-helper.ts,detail-draft-controller.ts}` now consume precompiled action programs while preserving the existing default-payload vs explicit-args contract for owner-managed transform/validate/commit flows. Focused proof is green in `pnpm --filter @nop-chaos/flux-renderers-form-advanced exec vitest run src/detail-view/value-adaptation-helper.test.ts src/detail-view/detail-field-commit.test.tsx src/detail-view/detail-view-transform.test.tsx src/detail-view/detail-view-basic.test.tsx src/detail-view/detail-revalidation.test.tsx` and `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`.

- Progress 2026-05-26 (closure sync): re-audited the remaining unchecked Workstream 3 checklist lines against the live repo and synchronized the stale parent text to the verified baseline instead of reopening already-closed seams. `variant-field` now consumes normalized `hint` / `description` content via `resolveRendererSlotContent(...)`, models `detectVariantAction` on the event channel, and uses the resolved nested `transformInAction` from normalized variants rather than authored-schema fallbacks; `array-field` now derives scalar item validation from compile-time `scalarItemValidation` metadata instead of peeking into `region.templateNode.schema`; `crud` now compiles `queryForm` through `queryFormRegion`; table quick-edit/buttons paths are covered by the compiled `quickEditBodyRegionKey` / `buttonsRegionKey` contracts already enforced in the data renderer definitions and focused tests; `use-surface-renderer.ts` now allocates declarative surface child scopes after commit and focused surface tests cover the no-render-phase-allocation baseline; wrapped field identity drifts are closed live because `code-editor`, `input-number`, and picker-mode `condition-builder` no longer duplicate node-level `testid` / `cid` onto inner control roots, while `dynamic-renderer.loadAction` is modeled on the event channel and covered by focused proof. Focused verification for this closure sync is green for `pnpm --filter @nop-chaos/flux-renderers-form-advanced exec vitest run src/variant-field/variant-field-owner-contract.test.tsx src/variant-field/variant-field-detection.test.tsx src/variant-field/variant-field-transform.test.tsx src/composite-field/array-field.test.tsx src/composite-field/array-field-schema-coverage.test.tsx src/condition-builder/condition-builder-renderer.test.tsx`, `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/data-renderer-definition-contracts.test.ts src/__tests__/table-quick-edit-cell.unit.test.tsx src/__tests__/table-data-and-layout.test.tsx`, `pnpm --filter @nop-chaos/flux-renderers-basic exec vitest run src/__tests__/basic-dynamic-renderer.test.tsx src/__tests__/basic-page-layout-surfaces.test.tsx`, `pnpm --filter @nop-chaos/flux-code-editor exec vitest run src/code-editor.integration.test.tsx src/code-editor-renderer/use-code-editor-binding.test.tsx`, and `pnpm --filter @nop-chaos/flux-renderers-form exec vitest run src/__tests__/input-number.test.tsx`.
- [x] Close `variant-field` contract drift from `维度09-01`, `维度09-02`, `维度09-03`, and `维度12-01`: `hint/description`, `detectVariantAction`, and variant transform actions must flow through normalized props/regions/events/action channels.
- [x] Close composite field drift from `维度09-04` and `维度12-06` by compiling scalar item validation metadata instead of peeking into raw region schema.
- [x] Close CRUD/table raw schema fallback drifts from `维度09-05`, `维度09-08`, and `维度09-09` by compiling nested query form, quick edit, and buttons as explicit regions/events or rejecting unsupported raw schema surfaces.
- [x] Close Flow Designer dynamic schema drift from `维度09-06` by providing a supported compiled transport for schema-bearing `designer-page.config` leaves instead of routing them through ordinary prop evaluation.
- [x] Close Report Designer authored-vs-dynamic inspector schema drift from `维度09-07` by separating authored compiled regions from explicitly dynamic host schema channels.
- [x] Close detail-view async/slot drift from `维度06-01` and `维度12-05` by keeping confirm failures user-visible and moving value-adaptation actions onto an honest compiled execution channel rather than raw prop metadata.
- [x] Close `维度07-01` by moving declarative surface child scope allocation out of render/useMemo and into a commit-safe runtime-owned lifecycle.
- [x] Close wrapped field identity drifts from `维度12-02`, `维度12-03`, `维度12-04`, and `维度12-07`.
- [x] Close field participation drift from `维度18-10` by registering `code-editor` with the active form/validation owner when it publishes field validation.
- [x] Add focused renderer tests that assert normalized channel usage and fail if raw authored schema is re-read in the audited paths.

Exit Criteria:

- [x] All Workstream 3 retained IDs are fixed without introducing new raw schema render paths.
- [x] Renderer components continue to follow `RendererComponentProps`: schema-driven values from `props.props`, state from `props.meta`, children from `props.regions`, handlers from `props.events`.
- [x] Lifecycle-sensitive scope allocation is after-commit and cleaned up correctly.
- [x] Owner docs are updated: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/surface-owner.md`, and affected component docs.
- [x] Focused tests cover correct rendered result, event dispatch path, and failure UI where applicable.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 4 - State Truth, Type Safety, Async Failure, And Performance

Status: completed
Targets: `packages/spreadsheet-renderers`, `packages/spreadsheet-core`, `packages/report-designer-renderers`, `packages/report-designer-core`, `packages/word-editor-core`, `packages/word-editor-renderers`, `apps/playground/src/taskflow-designer-lib`, `packages/flux-code-editor`, `packages/flux-renderers-data`, `packages/flux-renderers-form`, `packages/flow-designer-renderers`

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-25: closed `维度04-01` and `维度15-05` by moving spreadsheet viewport/selection reads onto narrower owner-aware paths. `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts` now exports `useSnapshotSelector()`, `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts` composes selector-based snapshot reads instead of subscribing to the whole snapshot object, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` now treats runtime viewport state as the single scroll truth instead of mirroring `scrollTop/scrollLeft` in local React state, and `packages/spreadsheet-core/src/command-handlers/selection-handlers.ts` now returns `{ ok: true, changed: false }` for unchanged selections so repeated selection writes stop dirtying state. Focused proof is green in `packages/spreadsheet-renderers/src/{spreadsheet-interactions/use-snapshot.test.tsx,__tests__/grid-selection.test.tsx,page-renderer-selector.test.tsx}` and `packages/spreadsheet-core/src/__tests__/new-commands-mutation.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/spreadsheet-renderers` and `@nop-chaos/spreadsheet-core`.
- Progress 2026-05-25 (continued): closed `维度04-02` by fixing local table column-visibility ownership so schema default changes no longer invert prior user intent. `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts` now stores local visible-column overrides as an explicit `columnKey -> visible` map instead of an undirected delta list, preserving the difference between “hide a default-visible column” and “show a default-hidden column” when `columns` or `hidden` defaults change across rerenders. Focused proof is green in `packages/flux-renderers-data/src/__tests__/data-table-columns.test.tsx`, including the local schema-change reconcile case, and package `typecheck` plus `build` are green for `@nop-chaos/flux-renderers-data`.
- Progress 2026-05-25 (continued): closed `维度04-03` by adding a real report/spreadsheet save acknowledgement boundary instead of weakening the published dirty contract. `packages/spreadsheet-core/src/core.ts` now exposes `acceptCurrentDocumentAsSaved()` to clear local spreadsheet dirty without resetting selection/history/view state, and `packages/report-designer-renderers/src/page-renderer.tsx` now calls that bridge-level acknowledgement after a successful `report-designer:save`. This keeps the documented `runtime.dirty = designer.dirty || spreadsheet.runtime.dirty` rule intact while ensuring report save advances both owners' saved baseline together. Focused proof is green in `packages/spreadsheet-core/src/__tests__/core-advanced.test.ts` and `packages/report-designer-renderers/src/{page-renderer-host-projection.test.tsx,host-data.test.ts,bridge.test.ts}`, with package `typecheck` and `build` green for `@nop-chaos/spreadsheet-core` and `@nop-chaos/report-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度15-04` by narrowing the Report Designer page shell's spreadsheet subscription surface. `packages/report-designer-renderers/src/page-renderer.tsx` now subscribes the page shell only to spreadsheet `document + history + dirty` for sync/status work, while a lightweight host-scope sync child owns the higher-frequency spreadsheet projection updates (`selection`, `viewport`, `layout`, `readonly`) through `scope.replace()` instead of waking the whole page shell. `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx` now reads the spreadsheet host snapshot directly from the bridge instead of receiving the runtime snapshot as a parent prop, and focused selector/canvas/host-projection proof is green in `packages/report-designer-renderers/src/{page-renderer-selector.test.tsx,report-spreadsheet-canvas.test.tsx,page-renderer-host-projection.test.tsx,host-data.test.ts,bridge.test.ts}` with package `typecheck` and `build` green for `@nop-chaos/report-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度15-02` by removing JSON round-trip tree cloning from the live tree command path. `packages/flow-designer-renderers/src/tree-commands.ts` now uses an explicit `TreeDocument` / `TreeNode` / `TreeNodeBranch` clone helper that copies only the supported tree structure instead of `JSON.parse(JSON.stringify(tree))`, preserving current tree-edit behavior while eliminating the audited full-tree serialization hot path. Focused proof is green in `packages/flow-designer-renderers/src/{designer-page.tree-history.test.tsx,designer-page.tree.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/flow-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度15-01` by replacing tree-mode host-sync stringify checks with an explicit structural graph compare in `packages/flow-designer-renderers/src/designer-tree-mode.tsx`. The wrapper still keeps the existing “only accept host replacement when local graph still matches the last accepted host graph” semantics used by the tree-history tests, but it no longer serializes the full projected graph twice per host update. Focused proof remains green in `packages/flow-designer-renderers/src/{designer-page.tree-history.test.tsx,designer-page.tree.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/flow-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度15-03` by replacing `TreeRenderer`'s recursive Set merge with a single-accumulator DFS in `packages/flux-renderers-data/src/tree-renderer.tsx`. `collectTreeNodeIdsInto(...)` now writes into one shared `Set` instead of recursively creating subtree Sets and copying them back up the chain, removing the audited O(n^2) id-collection pattern while preserving active-node fallback behavior. Focused proof is green in `packages/flux-renderers-data/src/__tests__/{data-tree-interaction.test.tsx,data-tree-large-render.test.tsx,data-tree-rendering-and-status.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/flux-renderers-data`.
- Progress 2026-05-25 (continued): closed `维度04-05` by removing the extra renderer-local chart/code owner drift from the Word Editor host summary path. `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts` now derives host `document`, `runtime.chartCount`, and `runtime.codeCount` from the persisted/autosaved `savedDocument.data` baseline, while `packages/word-editor-renderers/src/word-editor-page.tsx` and `packages/word-editor-renderers/src/word-editor-action-provider.ts` keep autosave/save success as the only persisted baseline refresh path. Focused proof is green in `packages/word-editor-renderers/src/__tests__/{word-editor-action-provider.test.ts,word-editor-page-host-scope-projections.test.tsx,word-editor-page-actions.test.tsx,use-word-editor-save.test.tsx,editor-canvas.test.tsx}`, with package `lint`, `typecheck`, and `build` green for `@nop-chaos/word-editor-renderers`.
- Progress 2026-05-25 (continued): re-audited `维度04-04` against the live Word Editor manifest/runtime surface and confirmed it is already closed as a stale finding rather than an active renderer-host bug. `packages/word-editor-renderers/src/word-editor-manifest.ts` no longer publishes `runtime.currentPage`; remaining `currentPage` state exists only inside `packages/word-editor-core/src/editor-store.ts` and matching test-support snapshots, so no renderer/manifest code change was required for this closure.
- Progress 2026-05-26: re-audited the remaining Workstream 4 queue against the live repo and confirmed the code closures had already landed for the retained async/type/input/performance slices, but the parent plan checklist had not yet been synchronized. `apps/playground/src/pages/report-designer-demo.tsx` now catches field insert/drop failures and publishes inline `role="alert"` feedback for the live playground entry (`维度06-02`); `apps/playground/src/taskflow-designer-lib/{types.ts,sync.ts,validation.ts,index.ts}` now align the live supported step subset around `script` / `invoke` / `sequential` / `graph` / `parallel` / `if` / `choose` / `delay` / `end`, preserve node step payload through graph flush, validate unsupported step unions, and explicitly reject unsupported imported DSL step types instead of silently downgrading them (`维度13-01`, `维度13-02`, `维度13-03` honest minimal closure); `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/flux-code-editor/src/{code-editor-renderer.tsx,source-resolvers.ts}`, `packages/flux-renderers-data/src/chart-renderer.tsx`, and `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` now all guard or normalize malformed dynamic inputs before they enter owner logic (`维度13-04` through `维度13-07`). Owner-doc sync for the TaskFlow subset now lives in `docs/architecture/taskflow-visual-designer.md`, which no longer claims the broader planned step union is already implemented live.

- [x] Close state-owner truth issues from `维度04-01` through `维度04-05`: spreadsheet viewport, table visible columns, report/spreadsheet dirty save, word current page, and word chart/code count truth.
- [x] Close playground Report Designer async failure handling from `维度06-02` with observable user feedback and rollback/error reporting where writes can partially fail.
- [x] Close TaskFlow type/data loss issues from `维度13-01`, `维度13-02`, and `维度13-03` by aligning unions, preserving node data, and strengthening validation.
- [x] Close runtime input guard issues from `维度13-04` through `维度13-07`: spreadsheet page props, code-editor configs/source arrays, chart series/data, and choice options.
- [x] Close performance redlines from `维度15-01` through `维度15-05`: tree-mode stringify, whole-tree cloning, TreeRenderer O(n²) set creation, report designer broad subscriptions, spreadsheet whole-snapshot/repeated-selection updates.
- [x] Add focused tests or performance-oriented regression checks that verify the actual bounded behavior or state owner result.

Exit Criteria:

- [x] All Workstream 4 retained IDs are fixed with one clear owner for each state truth.
- [x] Invalid dynamic inputs are normalized, rejected, or safely ignored according to documented contract.
- [x] Performance fixes remove the audited O(n²), whole-graph stringify/clone, or whole-snapshot subscription pattern rather than only masking symptoms.
- [x] Owner docs are updated: `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/word-editor/design.md`, and affected component docs as needed.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 5 - Styling, Theme Tokens, And Public CSS Contract

Status: completed
Targets: `packages/spreadsheet-renderers`, `packages/flow-designer-renderers`, `packages/flux-code-editor`, `packages/nop-debugger`, `packages/word-editor-renderers`, `packages/flux-bundle`, `packages/flux-react`, `packages/flux-renderers-form`, `packages/ui`, `packages/theme-tokens`, `packages/tailwind-preset`, `apps/playground/src/styles.css`

- Item Types: `Fix | Decision | Proof`

- [x] Close Spreadsheet CSS scope/token issues from `维度10-01` through `维度10-04`.
- [x] Close Flow Designer token/palette issues from `维度10-05` and `维度10-06`.
- [x] Close the Flow Designer branch-focus token drift from `维度10-14`.
- [x] Close Code Editor, Debugger, Word Editor theme inheritance issues from `维度10-07`, `维度10-08`, `维度10-18`.
- [x] Close public bundle/UI/theme token issues from `维度10-10` through `维度10-13`, `维度10-15`, `维度10-16`, and `维度10-17`.
- Progress 2026-05-25 (continued): closed `维度10-15` by updating `packages/ui/src/components/ui/sonner.tsx` so Sonner `--normal-*` variables now resolve through valid theme color functions (`hsl(var(--popover, var(--card)))`, `hsl(var(--popover-foreground, var(--card-foreground)))`, `hsl(var(--border))`) instead of consuming bare HSL fragment tokens. Focused proof is green in `packages/ui/src/components/ui/sonner.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/ui`.
- Progress 2026-05-25 (continued): closed `维度10-17` by updating `packages/tailwind-preset/src/index.ts` so Tailwind `popover` utilities now map to public `--popover*` tokens with `--card*` fallback (`hsl(var(--popover, var(--card)))`, `hsl(var(--popover-foreground, var(--card-foreground)))`) instead of bypassing them entirely. Focused proof is green in `packages/tailwind-preset/src/index.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/tailwind-preset`.
- Progress 2026-05-25 (continued): closed `维度10-13` by updating `packages/tailwind-preset/src/index.ts` so Tailwind `destructive` utilities now map to public `--destructive*` tokens with `--danger` / `--primary-foreground` fallback instead of binding only to the legacy pair. Focused proof is green in `packages/tailwind-preset/src/index.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/tailwind-preset`.
- Progress 2026-05-25 (continued): closed `维度10-11` by updating `packages/ui/src/components/ui/{dialog.tsx,alert-dialog.tsx,drawer.tsx}` so shared overlay chrome now reads package/public backdrop tokens (`--nop-dialog-backdrop`, `--nop-drawer-backdrop`) instead of hardcoded `bg-black/10`. Focused proof is green in `packages/ui/src/components/ui/{dialog.test.tsx,drawer.test.tsx,alert-dialog.test.ts,sonner.test.ts}`, with package `typecheck` and `build` green for `@nop-chaos/ui`.
- Progress 2026-05-25 (continued): closed `维度10-16` by extending `packages/theme-tokens/src/styles.css` root defaults with the baseline HSL tokens required by public consumers such as `@nop-chaos/ui/base.css` (`--background`, `--foreground`, `--card*`, `--popover*`, `--muted*`, `--accent*`, `--border`, `--input`, `--ring`, `--primary*`). Focused proof is green in `packages/theme-tokens/src/styles.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/theme-tokens`.
- Progress 2026-05-25 (continued): closed `维度10-14` by updating `packages/flow-designer-renderers/src/{designer-xyflow-canvas/designer-xyflow-edge.tsx,dingflow/ding-flow-edge.tsx}` so branch-focused Flow edge chrome now resolves through the public primary color function (`hsl(var(--primary))`) instead of consuming the bare `var(--primary)` HSL fragment token directly. Focused proof is green in `packages/flow-designer-renderers/src/{edge-label-xyflow.test.tsx,dingflow/ding-flow-edge.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/flow-designer-renderers`.
- [x] Add token validity tests or CSS-focused checks for default root tokens, full color values, popover/sidebar/destructive/toaster/base.css, and package root scoping.

- Progress 2026-05-25: closed `维度10-09` by moving `packages/word-editor-renderers/src/styles.css` token fallbacks from shared `.nop-theme-root` onto `.nop-word-editor-page`, so the package no longer re-declares shared `--nop-*` theme tokens at the global theme root. The same slice also fixed invalid fallback color derivations by wrapping shared HSL fragment tokens with `hsl(var(...))` before using them in page chrome/background defaults. Focused proof is green in `packages/word-editor-renderers/src/{styles.test.ts,__tests__/doc-preview-page.test.tsx,__tests__/word-editor-page-actions.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/word-editor-renderers`.
- Progress 2026-05-25 (continued): closed `维度10-05` and `维度10-06` by removing Flow Designer root-local `--fd-*` token publication from `packages/flow-designer-renderers/src/designer-theme.css`, moving those defaults to fallback reads at each usage site, and replacing the palette's hardcoded `nodeType.id -> fd-palette-appearance-*` gradient map with a shared accent-token path derived from `resolveNodeTypeAccent()` in `packages/flow-designer-renderers/src/designer-palette.tsx`. The minimap/background fallbacks now also read `--fd-*` via fallback values instead of depending on `.fd-theme-root` local token writes. Focused proof is green in `packages/flow-designer-renderers/src/{designer-controls.test.tsx,designer-theme.test.ts,edge-label-xyflow.test.tsx,dingflow/ding-flow-edge.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/flow-designer-renderers`.
- Progress 2026-05-25 (continued): closed `维度10-07` by updating `packages/flux-code-editor/src/code-editor-styles.css` so default code-editor chrome tokens now derive from shared semantic theme variables (`--background`, `--foreground`, `--muted*`, `--accent`, `--border`, `--ring`) instead of fixed light-only rgba/hex values at the component root. Focused proof is green in `packages/flux-code-editor/src/code-editor-styles.test.ts`, with package `typecheck` and `build` green for `@nop-chaos/flux-code-editor`.
- Progress 2026-05-25 (continued): closed `维度10-08` and `维度10-18` by updating `packages/nop-debugger/src/panel/styles-css.ts` so runtime-injected debugger CSS no longer writes default tokens onto `.nop-theme-root`, and package-internal `.ndbg-*` selectors are now anchored under `.nop-debugger` or `.nop-debugger-launcher` instead of publishing bare global class hooks. Debugger chrome now uses `var(--nop-debugger-*, fallback)` at the component surfaces themselves, preserving host token overrides even when the stylesheet is appended later. Focused proof is green in `packages/nop-debugger/src/{panel/styles.test.ts,panel.test.tsx,panel-minimized.test.tsx,panel-timeline.test.tsx}`, with package `typecheck` and `build` green for `@nop-chaos/nop-debugger`.
- Progress 2026-05-25 (continued): closed `维度10-10` and `维度10-12` by tightening the public CSS/token contract around `@nop-chaos/flux` and shared sidebar utilities. `packages/flux-bundle/src/index.test.tsx` now treats the facade stylesheet as a composition layer only and verifies canonical styles stay package-owned rather than pretending `.nop-flux-root` rewrites them; `packages/theme-tokens/src/styles.css` now publishes `--sidebar*` defaults as raw HSL fragments compatible with root defaults, and `packages/tailwind-preset/src/index.ts` converts sidebar utilities back into valid `hsl(var(--sidebar...))` color functions with fallback to the public card/foreground/border/ring token family. Focused proof is green in `packages/{flux-bundle/src/index.test.tsx,theme-tokens/src/styles.test.ts,tailwind-preset/src/index.test.ts}`, with package `typecheck` and `build` green for `@nop-chaos/flux`, `@nop-chaos/theme-tokens`, and `@nop-chaos/tailwind-preset`.

Exit Criteria:

- [x] All Workstream 5 retained IDs are fixed without violating the renderer styling contract.
- [x] Layout renderers still emit marker classes only; widget renderers keep internal UI styling where appropriate.
- [x] Public CSS exports resolve required colors under default theme roots without playground-only selectors.
- [x] Owner docs are updated: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/renderer-markers-and-selectors.md`, and package CSS docs touched by the fix.
- [x] `pnpm check:package-css-exports` passes.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 6 - UI Primitive Use And Accessibility Workflows

Status: completed
Targets: `packages/flux-renderers-data`, `packages/flow-designer-renderers`, `packages/nop-debugger`, `packages/word-editor-renderers`, `packages/flux-renderers-form`, `packages/flux-renderers-form-advanced`, `packages/flux-code-editor`, `packages/ui`, `packages/spreadsheet-renderers`, accessibility-focused tests

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: closed the current debugger/word tabs slice from `维度11-03`, `维度11-04`, `维度11-05`, and `维度20-17` by migrating `packages/nop-debugger/src/panel.tsx` from a handwritten `div role="tablist" + Button` implementation onto `@nop-chaos/ui` `Tabs/TabsList/TabsTrigger/TabsContent`, and by converting `packages/word-editor-renderers/src/word-editor-page.tsx` plus `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx` to the supported controlled `Tabs value/onValueChange` contract with stable `TabsContent value="..."` panels. Focused proof now lives in `packages/nop-debugger/src/panel.test.tsx`, `packages/word-editor-renderers/src/__tests__/expr-insert-dialog.test.tsx`, and `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx`.
- Progress 2026-05-24 (continued): closed the base field error-linkage gap from `维度20-01` by updating `packages/flux-renderers-form/src/renderers/input.tsx` and `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` so text inputs and `textarea` now publish `aria-describedby` plus `aria-errormessage` when field validation errors are shown, matching the stable contract already used by `input-number` and choice controls. Focused proof now lives in `packages/flux-renderers-form/src/__tests__/form-validation-ui.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-renderers-form test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the fieldset disclosure primitive drift from `维度11-06` by migrating `packages/flux-renderers-form/src/renderers/fieldset.tsx` onto the shared `@nop-chaos/ui` `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` contract while preserving the `fieldset/legend` host shape through the trigger `render` path. Focused proof remains green in `packages/flux-renderers-form/src/__tests__/fieldset-interaction.test.tsx` and `packages/flux-renderers-form/src/__tests__/form-package-exports.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-renderers-form test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the DingFlow add-node focus-return gap from `维度20-08` by threading the opening trigger ref through `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx` into `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx`, so `Escape`, outside click, and item selection now restore focus to the branch/merge trigger button when it still exists. Focused proof now lives in `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.test.tsx` together with the existing overlay/control tests, and focused verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/dingflow/ding-flow-add-node-menu.test.tsx src/dingflow/ding-flow-add-branch-overlay.test.tsx src/designer-controls.test.tsx` plus package `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the remaining DingFlow add-node primitive drift from `维度11-02` by migrating `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx` off the renderer-local `role="menu"` shell and onto the shared `@nop-chaos/ui` dropdown/menu primitive surface, using a point-anchored `DropdownMenuPositioner`/`DropdownMenuPopup` path so the overlay keeps its existing screen-position behavior while inheriting the supported menu roving-focus contract. The shared wrapper surface now exposes `DropdownMenuPositioner` and `DropdownMenuPopup` from `packages/ui/src/components/ui/dropdown-menu.tsx`, and focused proof remains green in `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.test.tsx` together with `src/dingflow/ding-flow-add-branch-overlay.test.tsx` and `src/designer-controls.test.tsx`; package verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers lint`, `typecheck`, and `build`, with `pnpm --filter @nop-chaos/ui build` and `typecheck` also passing for the new shared exports.
- Progress 2026-05-24 (continued): closed the remaining table radio primitive drift from `维度11-01` by migrating `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` off the `Checkbox shape="circle" + role="radio"` shim and onto shared `@nop-chaos/ui` radio primitives. `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx` now hosts radio selection under a controlled `RadioGroup` rendered as the real `TableBody`, while each radio row publishes a `RadioGroupItem` instead of a checkbox override; this preserves table markup and existing selection ownership logic while restoring the supported shared radio contract. Focused proof is green in `src/__tests__/table-internal-components.test.tsx`, `src/__tests__/use-table-controls.selection.test.tsx`, `src/__tests__/data-table-pagination-selection.test.tsx`, `src/__tests__/table-data-and-layout.test.tsx`, and `src/__tests__/crud-selection-and-features.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-renderers-data lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the Flow destructive-focus residual from `维度20-09` and `维度20-14` by giving `packages/flow-designer-renderers/src/designer-canvas.tsx` a stable focusable canvas region plus a registered `focusDesignerCanvasSurface(...)` helper, then routing `packages/flow-designer-renderers/src/designer-xyflow-canvas/{designer-xyflow-edge.tsx,designer-xyflow-node.tsx}` delete actions through that canvas fallback. Edge/node quick-action toolbars now also publish stable `aria-label`s tied to the current edge/node label so the focused toolbar context remains inspectable before deletion. Focused proof is green in `src/edge-label-xyflow.test.tsx`, `src/canvas-bridge.test.tsx`, `src/designer-controls.test.tsx`, `src/dingflow/ding-flow-add-node-menu.test.tsx`, and `src/dingflow/ding-flow-add-branch-overlay.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Code Editor accessibility bridge from `维度20-12` by extending `packages/flux-code-editor/src/use-code-mirror.ts` with CodeMirror `contentAttributes` support and forwarding field error semantics into the real `.cm-content` focus target from `packages/flux-code-editor/src/code-editor-renderer.tsx`. Focused regression proof now lives in `packages/flux-code-editor/src/code-editor.integration.test.tsx`, with the hook mock updated in `packages/flux-code-editor/src/use-code-mirror.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flux-code-editor test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Spreadsheet toolbar state-semantics gap from `维度20-15` by teaching the shared `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx` to publish `aria-pressed` whenever a style/alignment control is active, so bold/italic/underline and alignment buttons no longer rely on `data-toolbar-active` plus visual variants alone. Focused proof now lives in `packages/spreadsheet-renderers/src/spreadsheet-toolbar.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/spreadsheet-renderers test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Spreadsheet sheet-tab rename accessibility gap from `维度20-16` by teaching `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx` to expose a keyboard-equivalent rename entry on `F2`, focus/select the rename input when edit mode opens, and publish an i18n-backed accessible name for that textbox. Focused proof now lives in `packages/spreadsheet-renderers/src/sheet-tab-bar.test.tsx` together with `src/spreadsheet-toolbar.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/spreadsheet-renderers exec vitest run src/sheet-tab-bar.test.tsx src/spreadsheet-toolbar.test.tsx`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Report/Spreadsheet bound-cell accessibility gap from `维度20-11` by teaching `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx` to publish binding metadata through `gridcell` accessible names and a visible non-color `fx` marker, instead of exposing bound state only through `data-cell-bound` plus background color. Report Designer continues to feed cell metadata through `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`, and focused proof is green in `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx` plus `packages/report-designer-renderers/src/report-spreadsheet-canvas.test.tsx`; package verification is green for `pnpm --filter @nop-chaos/spreadsheet-renderers lint`, `typecheck`, and `build`, with `pnpm --filter @nop-chaos/flux-i18n typecheck` also passing for the new i18n strings.
- Progress 2026-05-24 (continued): closed the current Flow palette primitive drift from `维度11-07` by migrating `packages/flow-designer-renderers/src/designer-palette.tsx` group disclosure onto the shared `@nop-chaos/ui` `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` contract instead of a renderer-local `Button + aria-expanded` implementation. Focused proof remains green in `packages/flow-designer-renderers/src/designer-controls.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers test`, `lint`, `typecheck`, and `build`.
- Progress 2026-05-24 (continued): closed the current Word Editor canvas host accessibility gap from `维度20-10` by teaching `packages/word-editor-renderers/src/editor-canvas.tsx` to wrap the third-party editor mount in a focusable named `region` with a stable helper description, so the renderer now truthfully marks the document editing area and provides fallback guidance when the embedded canvas surface is not fully exposed to assistive technology. Focused proof is green in `packages/word-editor-renderers/src/__tests__/editor-canvas.test.tsx` together with the existing host-scope/expr dialog suites, and package verification is green for `pnpm --filter @nop-chaos/word-editor-renderers exec vitest run src/__tests__/editor-canvas.test.tsx src/__tests__/word-editor-page-host-scope.test.tsx src/__tests__/expr-insert-dialog.test.tsx`, `lint`, `typecheck`, and `build`, with `pnpm --filter @nop-chaos/flux-i18n typecheck` also passing for the new strings.
- Progress 2026-05-24 (continued): closed the shared draggable-dialog keyboard gap from `维度20-07` by teaching `packages/ui/src/components/ui/dialog.tsx` and `use-dialog-drag.ts` to expose a real keyboard-focusable drag handle button inside `DialogHeader`, with arrow-key movement, `Shift` larger movement steps, and `Home` reset semantics backed by the same clamped offset model as pointer dragging. Focused proof is green in `packages/ui/src/components/ui/dialog.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/ui exec vitest run src/components/ui/dialog.test.tsx`, `lint`, `typecheck`, and `build`, with `pnpm --filter @nop-chaos/flux-i18n typecheck` also passing for the new drag-handle strings.
- Progress 2026-05-24 (continued): closed the current Flow palette keyboard-placement gap from `维度20-06` by teaching `packages/flow-designer-renderers/src/designer-palette.tsx` to use deterministic insertion anchors for click/keyboard add-node actions: new nodes now open near the current active node when one exists, otherwise at the stable default insert position, instead of landing at random coordinates unrelated to the current authoring context. Focused proof is green in `packages/flow-designer-renderers/src/designer-controls.test.tsx`, and package verification is green for `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/designer-controls.test.tsx`, `lint`, `typecheck`, and `build`, with `pnpm --filter @nop-chaos/flux-i18n typecheck` also passing for the updated hint copy.
- Progress 2026-05-25: closed the remaining Flow keyboard connection/reconnect accessibility gap from `维度20-13` by making graph-mode Xyflow ports real focusable controls with localized accessible names and keyboard-equivalent `Enter` / `Space` / `Escape` connect/reconnect flows. `packages/flow-designer-renderers/src/designer-xyflow-canvas/{render-ports.tsx,designer-xyflow-canvas.tsx,designer-xyflow-node.tsx,port-connection-a11y-context.tsx}` now drive start/complete/cancel connect and reconnect through the same host command path as pointer interactions, `packages/flow-designer-renderers/src/designer-canvas.tsx` tracks `pendingConnectionSourcePortId` and aligns the reconnect test seam with live edge selection, and focused proof is green in `src/{canvas-bridge.test.tsx,index.xyflow.test.tsx,designer-controls.test.tsx}` with package `lint`, `typecheck`, and `build` plus `pnpm --filter @nop-chaos/flux-i18n typecheck` all passing.

- [x] Close UI primitive bypasses from `维度11-01` through `维度11-07`, using `@nop-chaos/ui` primitives where available or adding missing primitives following repo conventions.
- [x] Close field/error/loading accessibility issues from `维度20-01`, `维度20-02`, and `维度20-03`.
- [x] Close Flow keyboard/focus workflows from `维度20-06`, `维度20-08`, `维度20-09`, `维度20-13`, and `维度20-14`.
- [x] Close draggable dialog keyboard accessibility from `维度20-07`.
- [x] Close Word and Code Editor accessible boundary/editor semantics from `维度20-10` and `维度20-12`.
- [x] Close Report/Spreadsheet non-color state and toolbar/sheet tab accessibility from `维度20-11`, `维度20-15`, and `维度20-16`.
- [x] Close Debugger tab semantics from `维度20-17`, coordinating with `维度11-03` so one primitive migration closes both issues.
- [x] Add focused RTL/unit/E2E accessibility proof for keyboard equivalent flows, focus return, `aria-*` state, and accessible editor names.

Exit Criteria:

- [x] All Workstream 6 retained IDs are fixed with keyboard and screen-reader observable behavior, not only visual changes.
- [x] Raw HTML is not used where `@nop-chaos/ui` provides a suitable primitive.
- [x] Focus management is deterministic after add/delete/close/rename workflows.
- [x] Owner docs are updated: relevant component docs, `docs/architecture/renderer-runtime.md`, `docs/components/code-editor/design.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/word-editor/design.md`, and `docs/testing/e2e-standards.md` if test standards changed.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 7 - Test Proof Fidelity And Test Hygiene

Status: completed
Targets: `tests/e2e`, `packages/ui/src/components/ui`, `packages/flux-renderers-basic/src/__tests__`, `packages/flux-renderers-data/src/__tests__`, `packages/flux-code-editor`, `packages/flux-react/src/__tests__`, affected test helpers

- Item Types: `Fix | Proof`

- Progress 2026-05-25: closed `维度14-01` by replacing the previously skipped synthetic-only Flow edge-creation proof with a real supported keyboard handle-to-handle user path in `tests/e2e/flow-designer-edge-creation.spec.ts`. The synthetic `nop-designer:test-connect` case remains only as a skipped diagnostic entry, while the supported spec now enters the live Flow Designer page, starts a connection from the real source port button, completes it on the real target port button, and proves the visible edge/document counts update. Focused E2E proof is green for `pnpm exec playwright test "tests/e2e/flow-designer-edge-creation.spec.ts" --reporter=list`.
- Progress 2026-05-25 (continued): closed the current mock-cleanup/failure-path hygiene slice from `维度14-07`, `维度14-09`, and the remaining downgraded residual in `维度14-10` by adding file-level `afterEach(() => { cleanup(); vi.restoreAllMocks(); })` guards to `packages/flux-code-editor/src/code-editor.integration.test.tsx`, `packages/flux-renderers-basic/src/__tests__/basic-structural.test.tsx`, and `packages/flux-react/src/__tests__/schema-renderer.test.tsx`. Console/runtime spies and DOM cleanup no longer depend on success-path `mockRestore()` calls, and focused proof is green for the three affected suites.
- Progress 2026-05-25 (continued): closed the current default-suite diagnostic isolation slice from `维度14-08` by keeping supported Flow Designer user-path coverage active while explicitly skipping the probe/capture-only specs in `tests/e2e/flow-designer-ui.spec.ts`, `tests/e2e/component-lab/crud-table-body-diag.spec.ts`, and `tests/e2e/debugger-meta-diagnostic.spec.ts`. `docs/testing/e2e-standards.md` and `docs/references/e2e-test-diagnostic-guide.md` now state that screenshot/HTML dump/console dump/internal debugger API specs are diagnostic helpers and must stay isolated until a dedicated non-supported Playwright project exists.
- Progress 2026-05-25 (continued): closed `维度14-04` and `维度14-05` by moving the supported Word Editor and CRUD E2E proofs onto visible user-facing result channels. `packages/word-editor-renderers/src/word-editor-page.tsx` now publishes a stable saved-preview/status strip for the persisted document baseline, while `tests/e2e/{word-editor.spec.ts,word-editor-persistence.spec.ts}` assert typed markers and save/reload persistence through that visible surface instead of `__NOP_WORD_EDITOR_PROBE__` or `localStorage`. `tests/e2e/component-lab/crud-query-and-ownership.spec.ts` now proves query/filter/refresh/client-mode behavior entirely through visible row/footer changes, and `tests/e2e/component-lab/crud-test-utils.ts` no longer exports the `scope-debug-json` helper as a supported oracle.
- Progress 2026-05-25 (continued): closed `维度14-02` and `维度14-06` by splitting the mixed-responsibility basic/data renderer test files into focused owner-aligned suites. `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx` is replaced by `basic-page-and-layout-structure.test.tsx`, `basic-page-and-tabs-status.test.tsx`, `basic-tabs-behavior.test.tsx`, `basic-class-alias-and-icon-markers.test.tsx`, and shared `basic-page-layout.test-support.tsx`; `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx` is replaced by `data-tree-rendering-and-status.test.tsx`, `data-chart-handles.test.tsx`, `data-repeated-instance-path.test.tsx`, `data-tree-interaction.test.tsx`, and `data-tree-large-render.test.tsx`, with `src/index.test.tsx` updated to aggregate the focused files.
- Progress 2026-05-25 (continued): closed `维度14-03` by adding direct `@nop-chaos/ui` primitive tests for the previously uncovered high-use shared components: `packages/ui/src/components/ui/{accordion.test.tsx,dropdown-menu.test.tsx,table.test.tsx,radio-group.test.tsx,textarea.test.tsx,sheet.test.tsx}` now cover data-slot markers, open/close behavior, ARIA roles/state, and representative layout/variant contracts instead of relying only on export-level or indirect renderer coverage.

- [x] Close `维度14-01` by replacing the skipped synthetic-only Flow edge creation proof with a real supported handle-to-handle user path.
- [x] Close broad test-file maintenance findings from `维度14-02` and `维度14-06` by splitting by renderer/contract owner while preserving assertions.
- [x] Close primitive test gaps from `维度14-03` with minimal behavior/ARIA/data-slot coverage for high-use UI primitives.
- [x] Close proof truthfulness issues from `维度14-04` and `维度14-05` by asserting user-visible content/status instead of probe/debug JSON as the primary proof.
- [x] Close mock cleanup and default-suite hygiene issues from `维度14-07`, `维度14-08`, `维度14-09`, and `维度14-10`.
- [x] Update E2E standards or project tags if diagnostic specs are moved out of the default supported suite.

Exit Criteria:

- [x] All Workstream 7 retained IDs are fixed without weakening prior assertions.
- [x] Supported E2E tests prove supported user paths; diagnostic/probe-only specs are isolated or explicitly tagged.
- [x] Test cleanup restores mocks/spies even on failing assertions.
- [x] Owner docs are updated: `docs/testing/e2e-standards.md`, `docs/references/e2e-test-diagnostic-guide.md`, and affected test docs if behavior changed.
- [x] Relevant package tests and E2E tests pass.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 8 - Active Docs, Component Inventory, Metadata, Naming, And I18n Copy

Status: completed
Targets: `docs/architecture`, `docs/components`, `docs/references`, `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/word-editor-renderers`, `packages/flux-renderers-form`, examples manifests and component registries

- Item Types: `Fix | Decision | Proof`
- Progress 2026-05-24: closed the current retained metadata/i18n/naming/docs slice from `维度16-03`, `维度16-05`, `维度16-06`, `维度16-07`, `维度16-08`, `维度16-09`, `维度16-10`, `维度16-11`, `维度16-12`, `维度16-15`, `维度16-16`, `维度17-01`, `维度18-03`, `维度18-05`, `维度18-06`, and `维度18-09` by updating `docs/architecture/flux-runtime-module-boundaries.md` so compiler/runtime owner paths and validation-test references match the live `schema-compiler` split plus current runtime test layout; rewriting `docs/components/package-splitting-strategy.md` so it distinguishes live packages from target-state `content/layout` packages, records Phase 3 `form-advanced` as already completed, and splits runtime vs dev/test dependency truth tables to match current manifests; rewriting `docs/architecture/surface-owner.md` and `docs/components/dialog/design.md` so surface control truthfully reflects the current `openDialog` / `openDrawer` / `closeSurface` baseline instead of claiming `component:open/close/toggle` are already published component handles; removing stale `input-number` “not yet implemented” claims from `docs/components/index.md` and `docs/components/roadmap.md`; replacing drifted `flux-react/src/index.tsx:479` architecture anchors with the current `schema-renderer/hooks/dialog-host/workbench` owner files; updating `action-scope-and-imports.md` to point `RendererRuntime.dispatch()` at `packages/flux-core/src/types/renderer-core.ts`; rewriting `docs/components/data-source/design.md` so its refresh contract matches the live runtime-owned `refreshSource + targetId` baseline instead of promising `component:refresh`; adding the live `object-field`, `array-field`, `variant-field`, `detail-field`, and `detail-view` registrations to the active component runtime inventory and `examples.manifest.json`; updating `docs/architecture/renderer-runtime.md` so its renderer metadata baseline no longer pretends coverage stops at the original four pilots and instead reflects the live `tabs/table/chart/code-editor` expansion; moving Report field panel field-count chrome, Word Editor dataset dialog placeholder/remove-column labels, and Flow Designer branch action `aria-label`s onto the repository's `@nop-chaos/flux-i18n` pattern; publishing `sourcePackage: '@nop-chaos/flux-renderers-form'` on all 10 base form input renderer definitions; and removing the deprecated `createFlowDesignerRegistry()` alias from the stable `@nop-chaos/flow-designer-renderers` root export while preserving it behind `./unstable`. Focused proof now lives in `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`, `packages/word-editor-renderers/src/__tests__/dialog-accessibility.test.tsx`, `packages/flow-designer-renderers/src/designer-controls.test.tsx`, `packages/flux-renderers-form/src/__tests__/form-renderer-definition-contracts.test.ts`, and `packages/flow-designer-renderers/src/public-surface.test.ts`.

- [x] Close stale doc path/status issues from `维度16-03` through `维度16-12`, including deleted tests, package splitting state, surface capabilities, input-number roadmap status, stale anchors, package topology, action dispatch anchors, data-source refresh contract, and component inventory.
- [x] Close metadata/inventory docs drift from `维度16-15`, `维度16-16`, and `维度18-09`.
- [x] Close naming/API clarity issue from `维度17-01` by either renaming `createFlowDesignerRegistry` to match behavior or documenting/exporting a truthful alias strategy.
- [x] Close hardcoded English/i18n copy findings from `维度18-03`, `维度18-05`, and `维度18-06` with the repository's supported i18n/message pattern.
- [x] Re-run active doc anchor checks after docs edits and add focused proof for component registry inventory if a script already exists or is added by Workstream 0.

Exit Criteria:

- [x] All Workstream 8 retained IDs are fixed; active docs describe live repo behavior only.
- [x] Component status, examples manifest, renderer metadata, and package matrices agree with registered definitions and package manifests.
- [x] i18n/a11y strings use the repository's supported localization pattern; documented bad baseline is not an acceptable closure path for these retained defects.
- [x] `pnpm check:active-doc-code-anchors` passes after this workstream's doc edits.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 9 - Error Propagation And Monitor Detail Fidelity

Status: completed
Targets: `packages/flux-runtime`, `packages/flow-designer-renderers`, `packages/word-editor-renderers`, `packages/flux-react`, `packages/nop-debugger`, monitor adapters/helpers

- Item Types: `Fix | Proof`

- Progress 2026-05-25: closed the retained error-fidelity slice from `维度19-01` through `维度19-05` by normalizing all remaining audited non-`Error` failure wrappers onto `Error.cause` instead of flattening them into message-only synthetic errors. `packages/flux-runtime/src/async-data/formula-data-source-controller.ts` now preserves startup `failureReason.cause` for formula source failures, `packages/flux-runtime/src/runtime-factory.ts` and `packages/flux-react/src/schema-renderer.tsx` preserve non-`Error` import loader rejections through schema-preload/runtime import wrappers, `packages/flow-designer-renderers/src/{use-designer-auto-layout.ts,designer-page-body.tsx}` now keep the normalized auto-layout `Error` for host reporting while still publishing a short UI message, `packages/word-editor-renderers/src/word-editor-action-provider.ts` preserves non-`Error` save/persist failures through nested causes, and `packages/nop-debugger/src/{controller-helpers.ts,adapters.ts}` now export redacted structured error payloads containing nested cause plus monitor `details` instead of only a flattened stack/message string. Focused proof is green in `packages/flux-runtime/src/__tests__/{formula-data-source-recovery.test.ts,runtime-factory-utils.test.ts}`, `packages/flux-react/src/schema-renderer-imports-errors.test.tsx`, `packages/nop-debugger/src/{controller-helpers.test.ts,adapters.test.ts}`, `packages/word-editor-renderers/src/__tests__/word-editor-action-provider.test.ts`, and `packages/flow-designer-renderers/src/auto-layout-guards.test.tsx`; workspace `pnpm typecheck` and `pnpm build` are green, and `pnpm lint` is green after also fixing the pre-existing `flux.common.unsaved` locale drift and one unrelated unused test import needed to restore the required workspace gate.

- [x] Close `维度19-01` by preserving non-Error cause/details in formula data-source async failures.
- [x] Close `维度19-02` by preserving original failure cause in Flow auto-layout errors.
- [x] Close `维度19-03` by preserving non-Error cause in Word save exception wrapping.
- [x] Close `维度19-04` by preserving schema/runtime import load monitor rejection cause/details.
- [x] Close `维度19-05` by propagating `Error.cause` and monitor details through Debugger events.
- [x] Add tests that assert the propagated cause/details are visible to the consumer, not merely that an error is thrown.

Exit Criteria:

- [x] All Workstream 9 retained IDs are fixed with observable diagnostic fidelity.
- [x] Error wrapping preserves cause/details consistently across runtime, renderer, and debugger monitor boundaries.
- [x] Owner docs are updated: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/api-data-source.md`, and package-specific docs if public behavior changed.
- [x] `docs/logs/` corresponding date entry is updated.

### Workstream 10 - Final Integration Verification And Closure Audit

Status: completed
Targets: entire workspace, this plan, affected owner docs, daily log

- Item Types: `Proof | Decision`

- Progress 2026-05-25: revalidated the current integrated workspace baseline after the follow-on regression fixes needed to restore the shared verification chain. `packages/flux-renderers-basic/src/__tests__/basic-page-layout-surfaces.test.tsx` now uses stable dialog status/close selectors, `packages/spreadsheet-renderers/src/canvas-styles.css` no longer republishes package-local `--nop-*` fallback tokens, `packages/flux-renderers-data/src/table-renderer/capability-action-context.ts` now accepts missing capability context for direct unit-level invokes, `packages/nop-debugger/src/adapters.test.ts` now matches the live error event surface, `apps/playground/src/pages/report-designer-demo.tsx` now publishes spreadsheet cell binding metadata via `field`, and `packages/flux-action-core/src/__tests__/action-dispatcher-error-guard.test.ts` now uses narrower schema test casts. Focused recovery proof is green for `pnpm --filter @nop-chaos/flux-renderers-basic test`, `pnpm --filter @nop-chaos/spreadsheet-renderers test`, `pnpm --filter @nop-chaos/flux-renderers-data test`, `pnpm --filter @nop-chaos/nop-debugger test`, and `pnpm --filter @nop-chaos/flux-playground test -- src/pages/report-designer-demo.test.tsx`.
- Progress 2026-05-25 (continued): workspace verification is now green for `pnpm test`, `pnpm build`, `pnpm lint`, and `pnpm typecheck`, restoring the plan's current full-green workspace proof surface. This does not close the parent plan by itself because Workstreams 1, 3, and 4 still have unchecked retained findings/exit criteria, several closure-gate audit/static/E2E items listed below have not yet been re-run and recorded under this workstream, and no fresh independent closure-audit reviewer has rechecked the post-recovery live repo.
- Progress 2026-05-26: reran the remaining closure verification chain on the current live repo and recorded the final supported proof surface. Workspace gates are green for `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`. Required static/audit commands are green for `pnpm audit:deps`, `pnpm check:active-doc-code-anchors`, `pnpm check:workspace-manifest-deps`, `pnpm check:package-css-exports`, `pnpm check:flux-bundle-pack`, `pnpm check:schema-prop-coverage`, `pnpm check:oversized-code-files`, `pnpm check:audit-suspects`, `pnpm check:audit-reactive-render-reads`, `pnpm check:audit-async-failure-paths`, `pnpm check:audit-fieldframe-bypasses`, `pnpm check:audit-test-global-leaks`, `pnpm check:audit-missing-renderer-markers`, `pnpm check:audit-performance-suspects`, `pnpm check:audit-styling-suspects`, `pnpm check:audit-non-retained-renderer-references`, `pnpm check:audit-react19-optimization-candidates`, `pnpm check:audit-runtime-raw-schema-reads`, and `pnpm check:audit-hardcoded-type-dispatch`. The `check:audit-*` scripts still emit suspect inventories, but they exited successfully and no output here established a still-open in-scope retained finding.
- Progress 2026-05-26 (continued): reran the relevant supported E2E closure suite serially on an isolated port to avoid Playwright webServer reuse noise: `PLAYWRIGHT_PORT=4185 pnpm exec playwright test "tests/e2e/flow-designer-edge-creation.spec.ts" "tests/e2e/flow-designer-ui.spec.ts" "tests/e2e/code-editor.spec.ts" "tests/e2e/word-editor.spec.ts" "tests/e2e/component-lab/crud-query-and-ownership.spec.ts" "tests/e2e/report-designer-demo.spec.ts" --reporter=list --workers=1` completed with `43 passed`, `4 skipped`, `0 failed`. The four skipped cases are the already-isolated diagnostic specs inside `flow-designer-edge-creation.spec.ts`, `flow-designer-ui.spec.ts`, and `code-editor.spec.ts`, so the supported closure surface is fully green.
- Progress 2026-05-26 (continued): one stale E2E proof had to be corrected honestly during closure verification. `tests/e2e/report-designer-demo.spec.ts` no longer asserts that all `30` spreadsheet row headers are mounted simultaneously, because the live spreadsheet shell is virtualized and only exposes mounted visible headers. The spec now proves the supported surface by asserting mounted row/column headers exist and the first visible labels remain `1` / `A`.
- Progress 2026-05-26 (final closure): after the user explicitly authorized continuing through the final repository protocol, this plan was synchronized to its completed state and the required full-green verification commit was prepared with the supporting daily-log evidence already recorded below.

- [x] Re-read all source dimension files and this plan, confirming the `152` retained findings remain one-to-one owned and closed.
- [x] Run required verification after all code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [x] Run relevant audit/static checks: `pnpm audit:deps`, `pnpm check:active-doc-code-anchors`, `pnpm check:workspace-manifest-deps`, `pnpm check:package-css-exports`, `pnpm check:flux-bundle-pack`, `pnpm check:schema-prop-coverage`, `pnpm check:oversized-code-files`, and the `pnpm check:audit-*` scripts used as source guards when applicable.
- [x] Run relevant E2E tests for changed supported flows, including Flow Designer connection keyboard/drag paths, Word Editor canvas accessibility, Code Editor accessibility, Spreadsheet toolbar/sheet tabs, CRUD proof truthfulness, and diagnostic suite isolation.
- [x] If unit tests and E2E tests both pass completely, follow repository full-green protocol: record the full-green status and counts/package summary in `docs/logs/{year}/{month}-{day}.md`, then commit all current changes with a commit subject that explicitly includes `full-green verification`.
- [x] Launch a fresh independent closure-audit reviewer that checks live code, owner docs, focused tests, this plan, and deferred/follow-up honesty.

Exit Criteria:

- [x] Every Workstream 0-9 is `completed` and every workstream exit criterion is checked.
- [x] No retained finding remains ownerless, multiply-owned, partially fixed, or moved to non-blocking follow-up.
- [x] All required verification commands listed in Closure Gates pass before this plan can close.
- [x] Independent closure audit passes and evidence is recorded in this plan or the corresponding daily log.
- [x] Only after the prior items are true may `Plan Status` be changed to `completed`.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All `152` retained findings from `docs/analysis/2026-05-24-deep-audit-full/summary.md` are fixed or explicitly closed by the same landed code/docs change that fixes them.
- [x] `维度16-01` P0 hard gate is fixed and `pnpm check:active-doc-code-anchors` passes.
- [x] All `P1` contract/runtime/a11y findings are fixed before lower-priority residual cleanup is considered closed.
- [x] No in-scope confirmed live defect, contract drift, owner-doc drift, or hard-gate failure is deferred or downgraded to follow-up.
- [x] Required owner docs are updated to the final live baseline.
- [x] Necessary focused tests and static checks prove the corrected result.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] Relevant E2E tests for changed supported flows pass.
- [x] Relevant `pnpm check:*` and `pnpm audit:deps` commands pass.
- [x] `docs/logs/` has a dated entry for the remediation execution and final closure state.
- [x] Independent fresh-session closure audit is complete and recorded.
- [x] Text consistency check confirms `Plan Status`, every Workstream `Status`, every Exit Criteria checklist, Closure Gates, and daily log evidence agree.

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

Status Note: Completed. The live repo now has a full green closure baseline for this plan: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`, the required `pnpm check:*` / `pnpm audit:deps` gates, and the relevant supported E2E closure suite are all green and recorded in `docs/logs/2026/05-26.md`. Workstreams 0 through 10 are synchronized as completed.

Additional Progress Note: follow-up execution advanced through the final Workstream 10 closure gates, including the stale virtualized spreadsheet E2E proof correction, the serial supported E2E rerun on an isolated Playwright port, and the final text-consistency sync required before plan close.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj` reviewed the child-plan closures and confirmed this deep-audit parent must remain incomplete after the current session.
- Evidence: fresh-session audit confirmed only partial execution under this plan: the active-doc gate now passes, but the remaining retained-finding queue is still open, so the honest parent status is `partially completed`, not `completed`.
- Reviewer / Agent: independent closure audit subagent `ses_19d08a29bffeNkCb61zTy3oZXF` re-audited the current post-verification baseline.
- Evidence: the fresh-session reviewer confirmed the code/docs/test remediation surface was already effectively closed and identified the final required actions as text synchronization plus the repository full-green commit protocol. Those actions were then completed in the same closure pass.

Follow-up:

- No remaining plan-owned work may be listed here until all retained findings are either fixed or moved through an explicit scope-change decision with successor ownership.
