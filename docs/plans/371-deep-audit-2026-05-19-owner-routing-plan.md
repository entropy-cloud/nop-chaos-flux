# 371 Deep Audit 2026-05-19 Owner Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, reviewed dimension files under `docs/analysis/2026-05-19-deep-audit-full/`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`

## Purpose

把 `2026-05-19` 深度审核的 `64` 个 retained findings 收敛成一个诚实、单一真源的 owner-routing baseline。这个计划不直接修代码，而是冻结一份可以执行的 successor queue：每条 retained finding 都有且只有一个 owner bucket、一个优先级、一个明确 successor path、以及已裁定的 owner-doc obligation。

本计划的完成态不是“代码已全部修完”，而是：

- `64` 个 retained findings 已形成一对一 routing matrix。
- hard-gate / P0 / P1 findings 都有明确 successor execution owner。
- P2 / P3 findings 没有 ownerless、没有 multiply-owned、也没有被静默降级成 vague follow-up。
- successor queue 的 owner-doc obligations 已冻结，后续执行者不需要重新做 broad routing adjudication。

## Current Baseline

- `docs/analysis/2026-05-19-deep-audit-full/summary.md` 当前 retained aggregate 为 `64`，并与显式 P0/P1/P2/P3 tables 一致。
- 当前 hard-gate failures 是 `01-01` 与 `02-01` 至 `02-07`。
- 经过多轮独立复审后，原先过度细碎的 successor queue 已收敛：`380+381` 合并，`389+390` 合并；其余表面保持分离以维持 honest single-surface ownership。
- 由于 retained findings 横跨多个不共享 exit criteria 的结果面，单一 code-execution umbrella plan 不诚实；但同样不应把同一组件/子系统拆成过多彼此依赖的小计划。

## Goals

- 为 `2026-05-19` retained findings 建立一份显式、一对一的 owner-routing matrix。
- 把 hard-gate / P0 / P1 findings 收敛到明确且窄的 successor execution surfaces。
- 明确每个 successor 的 owner-doc obligations，避免 code owner 与 doc owner 分离后再次漂移。
- 将 successor queue 保持在尽可能小、但仍然诚实的规模。

## Non-Goals

- 不在本计划内直接落地代码修复。
- 不重新执行新的 deep audit 或扩展到 summary 之外的新 finding discovery。
- 不机械回写或重开已 `completed` 的历史计划。
- 不把 retained defects 静默降级成 `watch-only residual`。

## Scope

### In Scope

- `docs/analysis/2026-05-19-deep-audit-full/summary.md`
- retained findings 对应的 reviewed dimension files under `docs/analysis/2026-05-19-deep-audit-full/`
- 本批 findings 的 priority、bucket、owner-doc obligations、planned successor paths
- `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- 任何直接代码修复、测试修复、或 architecture doc 改写本身
- 新增审计轮次或补挖 summary 之外的新问题
- 与 `2026-05-19` retained set 无关的 backlog 与未审查 surface

## Priority Policy

- `P0`: 当前 hard gate fail、确定的 live correctness break、或会阻塞仓库可信基线的 defect；不得降级成 non-blocking follow-up。
- `P1`: confirmed contract drift、validation owner drift、silent wrong behavior、mixed-contract mega-suite；默认必须进入 successor execution owner。
- `P2`: confirmed defect，但不阻塞当前 hard gate；仍需明确 successor owner。
- `P3`: 已保留但可以排在更高优先级之后执行的 confirmed residual；只能降低调度顺序，不能降低 owner 义务。

## Remediation Buckets

| Bucket | Theme                                                    | Findings                                    | Priority | Owner-Doc Obligations                                                                                        | Planned Successor Path                                                                           |
| ------ | -------------------------------------------------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| A      | Workspace manifest hygiene                               | `01-01`                                     | P0       | `No owner-doc update required`                                                                               | `docs/plans/372-deep-audit-2026-05-19-workspace-manifest-hygiene-plan.md`                        |
| B      | Compiler shape-validation file boundary                  | `02-01`                                     | P0       | `No owner-doc update required`                                                                               | `docs/plans/373-deep-audit-2026-05-19-compiler-shape-validation-file-boundary-plan.md`           |
| C      | Variant-field owner boundary                             | `02-02`                                     | P0       | `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`                              | `docs/plans/374-deep-audit-2026-05-19-variant-field-owner-boundary-plan.md`                      |
| D      | Spreadsheet-grid surface                                 | `02-03`, `20-05`                            | P0/P2    | `docs/components/spreadsheet-page/design.md`                                                                 | `docs/plans/375-deep-audit-2026-05-19-spreadsheet-grid-file-boundary-plan.md`                    |
| E      | Spreadsheet context-menu test decomposition              | `02-04`, `14-02`                            | P0/P2    | `No owner-doc update required`                                                                               | `docs/plans/376-deep-audit-2026-05-19-spreadsheet-context-menu-test-decomposition-plan.md`       |
| F      | SchemaRenderer suite decomposition                       | `02-05`, `14-03`                            | P0/P1    | `No owner-doc update required`                                                                               | `docs/plans/377-deep-audit-2026-05-19-schema-renderer-suite-decomposition-plan.md`               |
| G      | Import-stack suite decomposition                         | `02-06`, `14-04`                            | P0/P2    | `No owner-doc update required`                                                                               | `docs/plans/378-deep-audit-2026-05-19-import-stack-suite-decomposition-plan.md`                  |
| H      | Action control-flow suite decomposition                  | `02-07`, `14-05`                            | P0/P3    | `No owner-doc update required`                                                                               | `docs/plans/379-deep-audit-2026-05-19-action-control-flow-suite-decomposition-plan.md`           |
| I      | Input renderer decomposition and stepper accessibility   | `02-08`, `20-01`                            | P2/P3    | `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`                               | `docs/plans/380-deep-audit-2026-05-19-input-renderer-decomposition-plan.md`                      |
| J      | Table/CRUD owner-state and event contract                | `04-01`, `09-02`, `09-04`                   | P1/P2    | `docs/components/table/design.md`, `docs/components/crud/design.md`, `docs/architecture/renderer-runtime.md` | `docs/plans/382-deep-audit-2026-05-19-table-and-crud-owner-state-and-event-contract-plan.md`     |
| K      | Table schema authoring contract                          | `12-03`, `12-04`                            | P2       | `docs/architecture/field-metadata-slot-modeling.md`                                                          | `docs/plans/383-deep-audit-2026-05-19-table-schema-authoring-contract-plan.md`                   |
| L      | Table row accessibility                                  | `20-04`                                     | P2       | `No owner-doc update required`                                                                               | `docs/plans/384-deep-audit-2026-05-19-table-row-accessibility-plan.md`                           |
| M      | Table column-settings performance                        | `15-03`                                     | P3       | `No owner-doc update required`                                                                               | `docs/plans/385-deep-audit-2026-05-19-table-column-settings-performance-plan.md`                 |
| N      | Validation owner and registration lifecycle              | `08-01`, `08-02`, `08-03`, `08-04`, `08-05` | P1/P2    | `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`                | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| O      | Detail-field and field-chrome contract                   | `09-01`, `09-03`, `12-01`                   | P2/P3    | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`                 | `docs/plans/387-deep-audit-2026-05-19-detail-field-and-field-chrome-contract-plan.md`            |
| P      | Form tree-widget accessibility                           | `20-02`, `20-03`, `20-06`                   | P2/P3    | `No owner-doc update required`                                                                               | `docs/plans/388-deep-audit-2026-05-19-form-tree-widget-accessibility-plan.md`                    |
| Q      | Runtime lifecycle and debug fidelity                     | `07-03`, `07-04`, `19-01`, `19-07`          | P2/P3    | `No owner-doc update required`                                                                               | `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md` |
| R      | Report field-panel contract                              | `06-01`, `10-01`, `11-01`                   | P2       | `docs/components/report-field-panel/design.md`, `docs/architecture/report-designer/design.md`                | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                       |
| S      | Spreadsheet host semantics                               | `06-02`, `18-03`                            | P2/P3    | `docs/components/spreadsheet-page/design.md`, `docs/architecture/report-designer/design.md`                  | `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md`                        |
| T      | Spreadsheet shell styling scope                          | `10-02`, `10-03`                            | P2       | `docs/architecture/styling-system.md`                                                                        | `docs/plans/393-deep-audit-2026-05-19-spreadsheet-shell-styling-scope-plan.md`                   |
| U      | Flow-designer type boundary                              | `13-02`                                     | P3       | `docs/architecture/flow-designer/design.md`                                                                  | `docs/plans/394-deep-audit-2026-05-19-flow-designer-type-boundary-plan.md`                       |
| V      | Flow-designer error fidelity                             | `19-02`, `19-03`, `19-06`                   | P2       | `No owner-doc update required`                                                                               | `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`                      |
| W      | Flow-designer accessibility interaction                  | `20-07`, `20-08`, `20-09`                   | P2       | `docs/components/designer-page/design.md`, `docs/architecture/flow-designer/design.md`                       | `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md`           |
| X      | Owner-doc alignment                                      | `16-01`, `16-02`                            | P2       | `docs/architecture/renderer-runtime.md`                                                                      | `docs/plans/397-deep-audit-2026-05-19-owner-doc-alignment-plan.md`                               |
| Y      | Naming alignment                                         | `17-01`                                     | P2       | `No owner-doc update required`                                                                               | `docs/plans/398-deep-audit-2026-05-19-naming-alignment-plan.md`                                  |
| Z      | Compiler diagnostic fidelity                             | `19-04`, `19-05`                            | P2       | `docs/architecture/flux-core.md`                                                                             | `docs/plans/399-deep-audit-2026-05-19-compiler-diagnostic-fidelity-plan.md`                      |
| AA     | Test harness reliability and zero-error proof discipline | `14-06`, `14-07`, `14-08`, `14-09`          | P2       | `No owner-doc update required`                                                                               | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                          |
| AB     | Chart slot authoring contract                            | `12-02`                                     | P2       | `docs/components/chart/design.md`, `docs/architecture/field-metadata-slot-modeling.md`                       | `docs/plans/401-deep-audit-2026-05-19-chart-slot-authoring-contract-plan.md`                     |
| AC     | Cross-package i18n instance alignment                    | `18-01`                                     | P2       | `docs/architecture/frontend-baseline.md`                                                                     | `docs/plans/402-deep-audit-2026-05-19-cross-package-i18n-alignment-plan.md`                      |
| AD     | Tree renderer performance                                | `15-01`                                     | P2       | `No owner-doc update required`                                                                               | `docs/plans/403-deep-audit-2026-05-19-tree-renderer-performance-plan.md`                         |
| AE     | Tabs hidden-region mounting semantics                    | `15-02`                                     | P2       | `docs/components/tabs/design.md`, `docs/architecture/renderer-runtime.md`                                    | `docs/plans/404-deep-audit-2026-05-19-tabs-hidden-region-mounting-plan.md`                       |

## Finding Matrix

| ID      | Finding                                                                                | Bucket | Priority | Disposition         | Planned Successor Path                                                                           |
| ------- | -------------------------------------------------------------------------------------- | ------ | -------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `01-01` | `flux-react` test imports renderer package without manifest declaration                | A      | P0       | New execution owner | `docs/plans/372-deep-audit-2026-05-19-workspace-manifest-hygiene-plan.md`                        |
| `02-01` | `shape-validation.ts` exceeds oversized hard gate and mixes expanding responsibilities | B      | P0       | New execution owner | `docs/plans/373-deep-audit-2026-05-19-compiler-shape-validation-file-boundary-plan.md`           |
| `02-02` | `variant-field.tsx` mixes action, validation, projection, and UI ownership             | C      | P0       | New execution owner | `docs/plans/374-deep-audit-2026-05-19-variant-field-owner-boundary-plan.md`                      |
| `02-03` | `spreadsheet-grid.tsx` mixes multiple interaction owners in one file                   | D      | P0       | New execution owner | `docs/plans/375-deep-audit-2026-05-19-spreadsheet-grid-file-boundary-plan.md`                    |
| `02-04` | spreadsheet context-menu test exceeds oversized hard gate                              | E      | P0       | New execution owner | `docs/plans/376-deep-audit-2026-05-19-spreadsheet-context-menu-test-decomposition-plan.md`       |
| `02-05` | `schema-renderer.test.tsx` exceeds oversized hard gate                                 | F      | P0       | New execution owner | `docs/plans/377-deep-audit-2026-05-19-schema-renderer-suite-decomposition-plan.md`               |
| `02-06` | `import-stack.test.ts` exceeds oversized hard gate                                     | G      | P0       | New execution owner | `docs/plans/378-deep-audit-2026-05-19-import-stack-suite-decomposition-plan.md`                  |
| `02-07` | action control-flow edge-case test exceeds oversized hard gate                         | H      | P0       | New execution owner | `docs/plans/379-deep-audit-2026-05-19-action-control-flow-suite-decomposition-plan.md`           |
| `02-08` | base input renderer barrel file is nearing hard gate and aggregates too many controls  | I      | P2       | New execution owner | `docs/plans/380-deep-audit-2026-05-19-input-renderer-decomposition-plan.md`                      |
| `04-01` | table/CRUD empty array state is overwritten by fallback defaults                       | J      | P1       | New execution owner | `docs/plans/382-deep-audit-2026-05-19-table-and-crud-owner-state-and-event-contract-plan.md`     |
| `06-01` | report field insert path fire-and-forget hides dual-owner write failures               | R      | P2       | New execution owner | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                       |
| `06-02` | spreadsheet edit save lacks fallback for custom bridge rejection                       | S      | P3       | New execution owner | `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md`                        |
| `07-03` | request parent `AbortSignal` listener is not removed on normal completion              | Q      | P2       | New execution owner | `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md` |
| `07-04` | `ActionScope` release/dispose misses namespace-provider fallback cleanup               | Q      | P2       | New execution owner | `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md` |
| `08-01` | `scopePolicy: form` masks explicit validation owner resolution                         | N      | P2       | New execution owner | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| `08-02` | `array-editor` mutates `childPaths` outside registration API                           | N      | P1       | New execution owner | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| `08-03` | `key-value` mutates `childPaths` outside registration API                              | N      | P1       | New execution owner | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| `08-04` | `applyChangesAndRevalidate` lifecycle semantics are unclear                            | N      | P2       | New execution owner | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| `08-05` | stale async validation run is recorded as succeeded                                    | N      | P2       | New execution owner | `docs/plans/386-deep-audit-2026-05-19-validation-owner-and-registration-lifecycle-plan.md`       |
| `09-01` | detail-field control root drops schema `className`                                     | O      | P2       | New execution owner | `docs/plans/387-deep-audit-2026-05-19-detail-field-and-field-chrome-contract-plan.md`            |
| `09-02` | table pagination events drop UI event and semantic payload                             | J      | P2       | New execution owner | `docs/plans/382-deep-audit-2026-05-19-table-and-crud-owner-state-and-event-contract-plan.md`     |
| `09-03` | detail renderer reads `FormRuntime` store directly                                     | O      | P2       | New execution owner | `docs/plans/387-deep-audit-2026-05-19-detail-field-and-field-chrome-contract-plan.md`            |
| `09-04` | CRUD query submit/reset event payloads are empty                                       | J      | P2       | New execution owner | `docs/plans/382-deep-audit-2026-05-19-table-and-crud-owner-state-and-event-contract-plan.md`     |
| `10-01` | report field panel CSS uses unscoped raw `data-slot` selectors                         | R      | P2       | New execution owner | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                       |
| `10-02` | spreadsheet toolbar shell styles leak into canvas exception CSS                        | T      | P2       | New execution owner | `docs/plans/393-deep-audit-2026-05-19-spreadsheet-shell-styling-scope-plan.md`                   |
| `10-03` | spreadsheet overlay shell styles leak into canvas exception CSS                        | T      | P2       | New execution owner | `docs/plans/393-deep-audit-2026-05-19-spreadsheet-shell-styling-scope-plan.md`                   |
| `11-01` | `ReportFieldPanel` drag handle bypasses shared UI `Button`                             | R      | P2       | New execution owner | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                       |
| `12-01` | shared field metadata does not explicitly cover `FieldFrame` chrome inputs             | O      | P3       | New execution owner | `docs/plans/387-deep-audit-2026-05-19-detail-field-and-field-chrome-contract-plan.md`            |
| `12-02` | chart title is not modeled as a value-or-region slot                                   | AB     | P2       | New execution owner | `docs/plans/401-deep-audit-2026-05-19-chart-slot-authoring-contract-plan.md`                     |
| `12-03` | table public schema exposes internal `loadingSlot` suffix                              | K      | P2       | New execution owner | `docs/plans/383-deep-audit-2026-05-19-table-schema-authoring-contract-plan.md`                   |
| `12-04` | table TS schema lacks author-facing nested column slot fields                          | K      | P2       | New execution owner | `docs/plans/383-deep-audit-2026-05-19-table-schema-authoring-contract-plan.md`                   |
| `13-02` | flow-designer domain page schema helper mixes opaque host config assertions            | U      | P3       | New execution owner | `docs/plans/394-deep-audit-2026-05-19-flow-designer-type-boundary-plan.md`                       |
| `14-02` | `SpreadsheetGridHarness` is duplicated inline across tests                             | E      | P2       | New execution owner | `docs/plans/376-deep-audit-2026-05-19-spreadsheet-context-menu-test-decomposition-plan.md`       |
| `14-03` | `schema-renderer.test.tsx` mixes multiple contract owners                              | F      | P1       | New execution owner | `docs/plans/377-deep-audit-2026-05-19-schema-renderer-suite-decomposition-plan.md`               |
| `14-04` | `import-stack` test helpers are duplicated                                             | G      | P2       | New execution owner | `docs/plans/378-deep-audit-2026-05-19-import-stack-suite-decomposition-plan.md`                  |
| `14-05` | action control-flow tests carry too much compiled-node boilerplate                     | H      | P3       | New execution owner | `docs/plans/379-deep-audit-2026-05-19-action-control-flow-suite-decomposition-plan.md`           |
| `14-06` | word-editor action tests do not guarantee spy restore on failure                       | AA     | P2       | New execution owner | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                          |
| `14-07` | `flux-basic` E2E lacks an explicit zero-error gate after page entry                    | AA     | P2       | New execution owner | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                          |
| `14-08` | `FileReader` global stub is not unstubbed                                              | AA     | P2       | New execution owner | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                          |
| `14-09` | console spy restore lacks failure-safe cleanup                                         | AA     | P2       | New execution owner | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                          |
| `15-01` | `TreeRenderer` expands full subtree without thresholded virtualization/lazy rendering  | AD     | P2       | New execution owner | `docs/plans/403-deep-audit-2026-05-19-tree-renderer-performance-plan.md`                         |
| `15-02` | `TabsRenderer` mounts all hidden tab regions by default                                | AE     | P2       | New execution owner | `docs/plans/404-deep-audit-2026-05-19-tabs-hidden-region-mounting-plan.md`                       |
| `15-03` | table column settings has local `O(n^2)` lookup                                        | M      | P3       | New execution owner | `docs/plans/385-deep-audit-2026-05-19-table-column-settings-performance-plan.md`                 |
| `16-01` | `useCurrentImportFrame` docs are missing public/internal surface adjudication          | X      | P2       | New execution owner | `docs/plans/397-deep-audit-2026-05-19-owner-doc-alignment-plan.md`                               |
| `16-02` | `useScopeSelector` docs omit the `paths` option                                        | X      | P2       | New execution owner | `docs/plans/397-deep-audit-2026-05-19-owner-doc-alignment-plan.md`                               |
| `17-01` | tests use non-canonical `sourceType` field naming                                      | Y      | P2       | New execution owner | `docs/plans/398-deep-audit-2026-05-19-naming-alignment-plan.md`                                  |
| `18-01` | UI-local i18n fallback bypasses current `flux-i18n` instance                           | AC     | P2       | New execution owner | `docs/plans/402-deep-audit-2026-05-19-cross-package-i18n-alignment-plan.md`                      |
| `18-03` | spreadsheet host action result drops `cancelled` semantics                             | S      | P2       | New execution owner | `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md`                        |
| `19-01` | request timeout/retry can reuse a stale active promise                                 | Q      | P2       | New execution owner | `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md` |
| `19-02` | flow-designer node hooks stringify thrown errors                                       | V      | P2       | New execution owner | `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`                      |
| `19-03` | flow-designer edge hooks stringify thrown errors                                       | V      | P2       | New execution owner | `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`                      |
| `19-04` | formula compile errors are downgraded to static strings                                | Z      | P2       | New execution owner | `docs/plans/399-deep-audit-2026-05-19-compiler-diagnostic-fidelity-plan.md`                      |
| `19-05` | value-shape diagnostics drop union-branch failure details                              | Z      | P2       | New execution owner | `docs/plans/399-deep-audit-2026-05-19-compiler-diagnostic-fidelity-plan.md`                      |
| `19-06` | flow-designer host action errors are rebuilt as new `Error` instances                  | V      | P2       | New execution owner | `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`                      |
| `19-07` | async-governance debug summary drops `stack` and `cause`                               | Q      | P3       | New execution owner | `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md` |
| `20-01` | input-number stepper buttons are not reachable in tab order                            | I      | P3       | New execution owner | `docs/plans/380-deep-audit-2026-05-19-input-renderer-decomposition-plan.md`                      |
| `20-02` | input-tree lacks full roving-focus and arrow-key tree model                            | P      | P2       | New execution owner | `docs/plans/388-deep-audit-2026-05-19-form-tree-widget-accessibility-plan.md`                    |
| `20-03` | tree-select popup lacks complete tree keyboard model                                   | P      | P2       | New execution owner | `docs/plans/388-deep-audit-2026-05-19-form-tree-widget-accessibility-plan.md`                    |
| `20-04` | focusable table rows lack accessible role/name semantics                               | L      | P2       | New execution owner | `docs/plans/384-deep-audit-2026-05-19-table-row-accessibility-plan.md`                           |
| `20-05` | spreadsheet fill handle advertises button semantics but is mouse-only                  | D      | P2       | New execution owner | `docs/plans/375-deep-audit-2026-05-19-spreadsheet-grid-file-boundary-plan.md`                    |
| `20-06` | tree loading status is not tied to `aria-busy`/`describedby`                           | P      | P3       | New execution owner | `docs/plans/388-deep-audit-2026-05-19-form-tree-widget-accessibility-plan.md`                    |
| `20-07` | DingFlow add-node menu lacks menu keyboard model                                       | W      | P2       | New execution owner | `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md`           |
| `20-08` | flow-designer node button lacks stable accessible name/state                           | W      | P2       | New execution owner | `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md`           |
| `20-09` | flow-designer edge button lacks stable accessible name/state                           | W      | P2       | New execution owner | `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md`           |

## Execution Plan

### Phase 1 - Freeze The Retained-Finding Routing Baseline

Status: completed
Targets: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, reviewed dimension files, this plan

- Item Types: `Decision | Proof`
- [x] Re-audit every retained ID in the matrix against the reviewed dimension files and ensure each row appears exactly once.
- [x] Reconfirm that the `64 retained` aggregate count matches the explicit retained-ID tables and the source summary.
- [x] Confirm that no retained finding is already honestly owned by an active plan and no historical completed plan is being reopened mechanically.
- [x] Freeze the bucket boundaries, priority assignments, owner-doc obligations, and planned successor paths in this plan so later phases contain no unresolved routing language.

Exit Criteria:

- [x] Every explicit retained finding ID from the source analysis appears exactly once in this plan's matrix.
- [x] The retained-count baseline is textually consistent across the source summary and this plan.
- [x] No finding is still ownerless, multiply-owned, or routed with unresolved `or` / `pending` language.
- [x] Every bucket has one explicit owner-doc obligation, even when the answer is `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` records the frozen routing baseline.

### Phase 2 - Create Hard-Gate And P0/P1 Successor Owners

Status: completed
Targets: `docs/plans/`, hard-gate and P0/P1 successor plans created from the surviving queue (`372`-`380`, `382`-`386`), this plan, `docs/logs/2026/05-19.md`

- Item Types: `Decision | Proof`
- [x] Create Plans `372`-`379` for Buckets `A`-`H` and keep each hard-gate file/suite surface narrow.
- [x] Create Plans `382` and `386` for Buckets `J` and `N`, covering all retained P1 findings.
- [x] Create Plans `380`, `383`, `384`, and `385` exactly as frozen in the bucket table so adjacent P0/P1 successor boundaries remain honest.
- [x] Make each successor explicitly inherit the owner-doc obligation frozen in this plan.

Exit Criteria:

- [x] Hard-gate findings and current P1 findings are routed to explicit guide-compliant successor plans.
- [x] No successor plan mixes unrelated result surfaces just to reduce file count.
- [x] Each successor plan enumerates exact finding IDs, explicit Non-Goals, and explicit owner-doc obligations.
- [x] `docs/logs/2026/05-19.md` records the hard-gate / P0 / P1 owner split.

### Phase 3 - Create The Remaining Successor Queue

Status: completed
Targets: `docs/plans/`, remaining successor plans from the surviving queue (`387`-`404`, excluding merged-away `390` and absent `381`), this plan, `docs/logs/2026/05-19.md`

- Item Types: `Decision | Proof`
- [x] Create the remaining successor plans so every retained P2/P3 finding from the matrix has a real owner file under `docs/plans/`.
- [x] Keep report, spreadsheet, flow-designer, owner-doc, compiler, test, slot, performance, and accessibility surfaces separated exactly as frozen in the bucket table.
- [x] Do not widen any successor beyond the bucket table just to reduce the queue length.

Exit Criteria:

- [x] Every remaining retained finding from the matrix is routed to an explicit successor execution owner.
- [x] Every referenced successor plan exists and is at least `planned`.
- [x] No retained finding is silently downgraded to deferred or non-blocking follow-up.
- [x] `docs/logs/2026/05-19.md` records the remaining successor queue.

### Phase 4 - Independent Routing Audit And Queue Freeze

Status: completed
Targets: this plan, the surviving successor queue (`372`-`404` excluding merged-away `381` and `390`), `docs/logs/2026/05-19.md`

- Item Types: `Proof | Decision`
- [x] Run a fresh independent routing audit that re-reads the source analysis, this plan, and all successor plans created in Phases 2-3.
- [x] Fix any duplicated ownership, missing owner, dishonest downgrade, or over-broad successor scope discovered by the audit.
- [x] Record the audit outcome and final queue freeze in `docs/logs/2026/05-19.md`.

Exit Criteria:

- [x] Independent audit confirms the routed retained set is one-to-one and owner-complete.
- [x] Independent audit confirms no retained P0/P1/P2/P3 finding was silently downgraded to vague residual text.
- [x] Independent audit confirms successor plans are narrow, guide-compliant, and aligned with this matrix.
- [x] This plan's statuses, matrix, closure gates, and log evidence are textually consistent.
- [x] `docs/logs/2026/05-19.md` records the closure-audit result.

## Closure Gates

> This is a docs-only owner-routing plan. It closes only after the matrix, successor ownership, and independent routing audit are complete. It does not claim code execution closure.

- [x] All retained findings in the final explicit ID baseline have exactly one current owner bucket and one explicit successor path.
- [x] All hard-gate findings are routed to explicit successor execution plans.
- [x] All retained P1 findings are routed to explicit successor execution plans.
- [x] No retained finding is silently downgraded to deferred or non-blocking follow-up.
- [x] Every referenced successor plan exists and is at least `planned` with guide-compliant scope, exact finding IDs, explicit Non-Goals, and explicit owner-doc obligations.
- [x] Independent subagent routing audit is completed and recorded.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- If later re-audit finds a materially different same-surface residual, create a fresh successor plan instead of widening one of the frozen buckets in place.

## Closure

Status Note: Completed. The `2026-05-19` retained set remains one-to-one routed, all referenced surviving successor plans exist, and the final independent routing audit found no ownership gaps after queue-shape text was synchronized to the merged-away `381` / `390` reality.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent routing closure audit (`ses_1c1a8efacffeFpK21DOAlZoJPa`), plus final live-tree synchronization audit (`ses_1bcc603b1ffevG0J1BP1bRB0ML`)
- Evidence: final audit evidence is recorded across `docs/logs/2026/05-19.md` and `docs/logs/2026/05-20.md`; the surviving queue is `372`-`404` excluding merged-away `381` and `390`, and every matrix successor path resolves to a live plan file.

Follow-up:

- Surviving successor queue: `372`, `373`, `374`, `375`, `376`, `377`, `378`, `379`, `380`, `382`, `383`, `384`, `385`, `386`, `387`, `388`, `389`, `391`, `392`, `393`, `394`, `395`, `396`, `397`, `398`, `399`, `400`, `401`, `402`, `403`, `404`.
