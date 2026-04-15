# NOP Chaos Flux Documentation Index

## Purpose

This `docs/` tree is the curated entry point for the current repository state.

- start here before changing architecture docs
- prefer active files under `docs/architecture/`, `docs/references/`, and `docs/examples/`
- use `docs/logs/` for short dated notes about recent documentation, decisions, and next implementation steps (one file per day: `docs/logs/{year}/{month}-{day}.md`)
- treat `docs/plans/` as execution documents; draft and audit plan files using `docs/plans/00-plan-authoring-and-execution-guide.md`, and keep plan status inside each file aligned with the current execution state
- non-`plans` and non-`bugs` docs should describe the latest design baseline only

## Read This First

Choose the smallest document that matches the task.

| If you need to... | Read this first | Then read |
| --- | --- | --- |
| Understand the architecture hierarchy, reading order, or which architecture docs own precedence | `docs/architecture/README.md` | `docs/references/architecture-doc-status-matrix.md` |
| Understand the current architecture baseline | `docs/architecture/flux-design-principles.md` | `docs/architecture/frontend-programming-model.md` for top-level precedence, then `docs/architecture/flux-core.md` for the codebase-wide baseline |
| Understand Flux's top-level frontend programming model, primitive categories, macro layering, and how the primitives compose into one execution model | `docs/architecture/frontend-programming-model.md` | `docs/architecture/flux-core.md` |
| Understand action control flow such as `when`, `then`, `onError`, `parallel`, result classes, and chained result context | `docs/architecture/action-algebra-formal-spec.md` | `docs/architecture/action-scope-and-imports.md` |
| 设计 action 可视化编排、optional step、graph lowering，或判断是否要把 `parallel` 改成 `steps` | `docs/architecture/action-graph-authoring.md` | `docs/architecture/action-algebra-formal-spec.md` |
| 设计值转换、字段 draft 生命周期、组合式详情字段/详情视图，或判断哪些控件应采用 `transformInAction` / `transformOutAction` / `validateValueAction` 的 staged owner 语义 | `docs/architecture/value-adaptation-and-detail-field.md` | `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md` |
| 从零设计 `object-field` / `variant-field` / `array-field` / `detail-view` / `table` 的统一运行时，并明确每个控件如何取值、校验、提交 | `docs/architecture/composite-value-owner-clean-slate.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/form-validation.md`, `docs/architecture/table-row-identity-and-scope-performance.md` |
| 设计 field binding、`name` vs `value`、shared field schema base，或判断哪些字段属于 `props` / `meta` | `docs/architecture/field-binding-and-renderer-contract.md` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md` |
| 设计多态值字段、`string | object`/`string | ActionSchema` 这类 union-like 编辑、自动识别变体，或切换不同编辑器 | `docs/architecture/variant-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-scope-and-imports.md` |
| 设计对象字段、局部 subform、一个字段内部再拆多个属性编辑，或相对对象根的子字段命名 | `docs/architecture/object-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/renderer-runtime.md` |
| 设计数组字段、标量数组/对象数组编辑，或判断它与 `list` / `loop` / AMIS `combo` / `input-array` 的边界 | `docs/architecture/array-field.md` | `docs/architecture/object-field.md`, `docs/components/list/design.md`, `docs/components/loop/design.md` |
| 设计按钮 / 表单 / 选择控件的 async pending、loading、disabled 语义 | `docs/architecture/action-interaction-state.md` | `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md` |
| 设计 dialog / drawer / future sheet 的打开态、surface status、`statusPath` 或局部 `$surface` 规则 | `docs/architecture/surface-owner.md` | `docs/architecture/action-interaction-state.md` |
| 设计 scope 继承、`data` 初始化、`isolate`、row scope，或判断是否需要 `$parentScope` | `docs/architecture/scope-ownership-and-isolation.md` | `docs/architecture/renderer-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md` |
| 设计 dialog / drawer 的 `data`、open-state、surface status 与 scope 边界 | `docs/architecture/surface-owner.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/components/dialog/design.md` |
| Design API requests, scope injection (includeScope), params, DataSource polling, unified formula/api source semantics, or non-rendering reaction/watch nodes | `docs/architecture/api-data-source.md` | `docs/architecture/renderer-runtime.md` |
| 了解基于 SchemaRenderer 的图设计器规划架构，或判断 graph designer 与 domain-specific codec / value editor 的边界 | `docs/architecture/flow-designer/README.md` | `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md` |
| Design or update the `designer-page` renderer contract | `docs/components/designer-page/design.md` | `docs/architecture/flow-designer/README.md`, `docs/architecture/flow-designer/design.md` |
| 看清 Flow Designer 各层协作细节、命名空间动作流转、画布/Inspector 调用链 | `docs/architecture/flow-designer/collaboration.md` | `docs/architecture/flow-designer/canvas-adapters.md` |
| 核对 Flow Designer 当前真实的 snapshot 契约、host scope 落地状态、哪些字段已接线 | `docs/architecture/flow-designer/runtime-snapshot.md` | `docs/architecture/flow-designer/collaboration.md` |
| Design Flow Designer tree mode (chain + fan-out branches), TreeDocument data model, tree-to-graph projection, or decide tree vs graph for a domain | `docs/architecture/flow-designer/tree-mode.md` | `docs/architecture/flow-designer/config-schema.md` |
| Understand Flow Designer React Flow integration, callback translation, or canvas failure semantics | `docs/architecture/flow-designer/canvas-adapters.md` | `docs/architecture/flow-designer/api.md` |
| Plan Flow Designer tree mode implementation (TreeDocument, tree-projection, playground examples) | `docs/plans/71-flow-designer-tree-mode-implementation-plan.md` | `docs/architecture/flow-designer/tree-mode.md` |
| Draft, execute, or audit a plan under `docs/plans/` | `docs/plans/00-plan-authoring-and-execution-guide.md` | `docs/logs/index.md` |
| Plan parity work against `nop-chaos-next` `flow-editor` and identify which behaviors must become configuration-driven | `docs/plans/13-flow-editor-parity-gap-analysis-and-migration-plan.md` | `docs/architecture/flow-designer/design.md` |
| Plan implementation of compiler-integrated schema diagnostics | `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md` | `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md` |
| Design theme-compatible styling, host CSS variable integration, or `.nop-theme-root` / `.fd-theme-root` migration strategy | `docs/architecture/theme-compatibility.md` | `docs/architecture/renderer-runtime.md` |
| Design semantic props vs Tailwind className, custom style presets, or shadcn/ui integration | `docs/architecture/styling-system.md` | `docs/architecture/renderer-markers-and-selectors.md` |
| Plan shadcn/ui migration from nop-chaos-next-master | `docs/plans/18-shadcn-ui-migration-plan.md` | `docs/architecture/styling-system.md` |
| Plan dependency-tracking runtime convergence under the root-binding model | `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` | `docs/architecture/dependency-tracking.md` |
| 了解基于 SchemaRenderer 的报表设计器与 spreadsheet editor 规划架构 | `docs/architecture/report-designer/README.md` | `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/contracts.md` |
| Design or update the `report-designer-page` renderer contract | `docs/components/report-designer-page/design.md` | `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md` |
| Design or update the `spreadsheet-page` renderer contract | `docs/components/spreadsheet-page/design.md` | `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md` |
| 了解通用 report designer 如何适配 nop-report | `docs/architecture/report-designer/nop-report-profile.md` | `docs/analysis/2026-03-21-excel-report-designer-research.md` |
| 了解 report designer 与 nop-report 的导入导出/round-trip 设计 | `docs/architecture/report-designer/codec-design.md` | `docs/architecture/report-designer/nop-report-profile.md` |
| 设计 report designer 的右侧属性面板与 expression/reference 字段编辑边界 | `docs/architecture/report-designer/inspector-design.md` | `docs/architecture/report-designer/contracts.md` |
| Change React integration, renderer props, hooks, or fragment rendering | `docs/architecture/renderer-runtime.md` | `docs/references/renderer-interfaces.md` |
| Design or update the `condition-builder` component contract | `docs/components/condition-builder/design.md` | `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md` |
| Design or update the `code-editor` component contract | `docs/components/code-editor/design.md` | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md` |
| Design compile-once/runtime-instantiation behavior, `cid`/template-node identity, repeated-instance identity, or future `type: 'loop'` rules | `docs/architecture/template-instantiation-and-node-identity.md` | `docs/architecture/component-resolution.md` |
| 设计或收敛运行时路径绑定、`resolvePath` 服务、复合字段的 prefix wrapper 收敛方式，或判断 `cid` / `instancePath` / 绝对值路径各自职责 | `docs/architecture/unified-runtime-indexing-and-path-binding.md` | `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/form-validation.md`, `docs/architecture/composite-value-owner-clean-slate.md` |
| Design `loop` node schema, item scope, `itemName` / `indexName`, or `itemData` | `docs/components/loop/design.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design scoped render slots, nested slot scope, render-prop-like region params, or `$slot` semantics | `docs/architecture/scoped-render-slots.md` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md` |
| Design recursive structural rendering, `recurse`, or nearest-enclosing-loop recursion rules | `docs/components/recurse/design.md` | `docs/components/loop/design.md`, `docs/components/fragment/design.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design a no-UI grouping node, grouped `when` usage, or decide `fragment` versus `container` | `docs/components/fragment/design.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/components/container/design.md` |
| Design `list` as a visual collection renderer, or decide its boundary versus `loop` / `table` | `docs/components/list/design.md` | `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design `crud` as a composite data workflow renderer, including query form, table, source, toolbar, and create/edit/detail surfaces | `docs/components/crud/design.md` | `docs/components/table/design.md`, `docs/components/form/design.md`, `docs/components/dialog/design.md`, `docs/architecture/action-interaction-state.md` |
| Audit which AMIS components are retained, renamed, merged, or dropped in Flux component docs | `docs/components/amis-baseline-matrix.md` | `docs/components/index.md`, `docs/components/roadmap.md`, `docs/amis-types/` |
| Design `tree` as a visual hierarchical renderer, or decide its boundary versus `loop` / `recurse` / future `input-tree` | `docs/components/tree/design.md` | `docs/components/recurse/design.md`, `docs/components/loop/design.md` |
| Design `input-tree` / `tree-select` as form tree controls, or decide their boundary versus `tree` / `select` | `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md` | `docs/components/tree/design.md`, `docs/components/select/design.md`, `docs/components/form/design.md` |
| Design high-performance table row identity, `rowKey`, row-scope reuse, row-local invalidation, or same-row field access inside tables | `docs/architecture/table-row-identity-and-scope-performance.md` | `docs/architecture/dependency-tracking.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| 设计或实现某个具体组件的 schema 契约、核心能力和落地路线 | `docs/components/index.md` | 对应组件目录下的 `docs/components/<component>/design.md`，再回看相关 `docs/architecture/*.md` |
| Design namespaced action extension, host action scopes, `xui:imports` semantics, or dynamic domain libraries loaded into owner semantic actions | `docs/architecture/action-scope-and-imports.md` | `docs/architecture/renderer-runtime.md`, `docs/architecture/flow-designer/config-schema.md` |
| 设计 Flux schema 文件校验器、导入前结构校验或命名空间属性忽略策略 | `docs/architecture/schema-file-validator.md` | `docs/architecture/action-scope-and-imports.md`, `docs/references/flux-json-conventions.md` |
| Change slot-like fields such as `title`, `empty`, or `onClick` | `docs/architecture/field-metadata-slot-modeling.md` | `docs/architecture/renderer-runtime.md` |
| Change validation behavior, hidden-field submit/validate/clear semantics, or form field participation | `docs/architecture/form-validation.md` | `docs/architecture/flux-runtime-module-boundaries.md` |
| Decide where runtime or validation code should live | `docs/architecture/flux-runtime-module-boundaries.md` | `docs/architecture/form-validation.md` |
| Check workspace structure, package roles, or tooling baseline | `docs/architecture/frontend-baseline.md` | `package.json` |
| Plan playground information architecture or debugger UX | `docs/architecture/playground-experience.md` | `docs/architecture/debugger-runtime.md` |
| Design debugger automation API, inspect capability, or AI/E2E diagnostics | `docs/architecture/debugger-runtime.md` | `docs/analysis/2026-03-21-framework-debugger-design.md` |
| Review security boundary and runtime safety requirements | `docs/architecture/security-design-requirements.md` | `docs/architecture/action-scope-and-imports.md` |
| Review performance design constraints and hot-path rules | `docs/architecture/performance-design-requirements.md` | `docs/architecture/renderer-runtime.md` |
| Review recurring regression guardrails distilled from historical bug fixes | `docs/references/architecture-guardrails-from-bugs.md` | `docs/architecture/renderer-runtime.md` |
| Review general UI interaction quality, workspace layout priority, collapsibility, or obvious convention violations | `docs/references/ui-interaction-review-checklist.md` | the relevant file in `docs/architecture/` |
| Check shared terminology such as `CompiledValueNode`, `RenderRegionHandle`, `value-or-region`, or `FormRuntime` | `docs/references/terminology.md` | `docs/references/renderer-interfaces.md` |
| Understand how `RendererRuntime`, `PageRuntime`, `SurfaceRuntime`, `SurfaceEntry`, and schema renderers such as `type: 'page'` fit together | `docs/references/runtime-and-renderer-faq.md` | `docs/references/terminology.md`, `docs/architecture/renderer-runtime.md` |
| Check which docs must be updated after a code change | `docs/references/maintenance-checklist.md` | the most relevant file in `docs/architecture/` |
| Check AMIS JSON conventions (expression, action, variant/level, icon) | `docs/references/flux-json-conventions.md` | `docs/architecture/flow-designer/config-schema.md` |
| Look up AMIS component TypeScript type definitions | `docs/amis-types/` | specific component `.d.ts` file |
| Check complex component design process (Flow Designer, Report Designer) | `docs/references/complex-component-design-process.md` | `docs/architecture/flow-designer/design.md` |
| Design Flux as the final DSL runtime, decide loader-vs-runtime extensibility boundaries, or model complex controls/design tools as special schema types | `docs/architecture/flux-dsl-vm-extensibility.md` | `docs/architecture/complex-control-host-protocol.md`, `docs/articles/flux-design-introduction.md` |
| Plan or review a refactoring, or check low-code-specific design guidelines | `docs/references/refactoring-guidelines.md` | `docs/plans/23-architecture-audit-fix-plan.md` |
| Review current renderer and runtime contracts by name | `docs/references/renderer-interfaces.md` | `packages/flux-core/src/index.ts` |
| Inspect a representative schema example | `docs/examples/user-management-schema.md` | `apps/playground/src/App.tsx` |
| Inspect a DingTalk workflow tree example (TreeDocument JSON, DesignerConfig, FlowLong conversion) | `docs/examples/dingtalk-workflow-tree.md` | `docs/architecture/flow-designer/tree-mode.md` |
| Inspect an action flow tree example (TreeDocument JSON, lowering to ActionSchema) | `docs/examples/action-flow-tree.md` | `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/action-algebra-formal-spec.md` |
| Inspect a DingTalk workflow tree example (TreeDocument JSON, DesignerConfig, FlowLong conversion) | `docs/examples/dingtalk-workflow-tree.md` | `docs/architecture/flow-designer/tree-mode.md` |
| Inspect an action flow tree example (TreeDocument JSON, lowering to ActionSchema) | `docs/examples/action-flow-tree.md` | `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/action-algebra-formal-spec.md` |
| Review prototype lessons or external research notes | `docs/references/` | the related architecture file for the active baseline |
| Quickly review recent doc work, design notes, or near-term next steps | `docs/logs/` (daily files) | the most relevant active doc |
| Understand nop-chaos-flux's architecture position vs industry frameworks | `docs/analysis/2026-04-04-nop-chaos-flux-comparison-report.md` | `docs/architecture/flux-core.md` |

## Active Source Of Truth

Architecture intent lives primarily in:

- `docs/architecture/README.md` (architecture hierarchy and reading order)

- `docs/architecture/flux-design-principles.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/architecture/action-interaction-state.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/surface-owner.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/scoped-render-slots.md`
- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
- `docs/architecture/component-resolution.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/playground-experience.md`
- `docs/architecture/theme-compatibility.md`
- `docs/architecture/security-design-requirements.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/tree-mode.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/report-designer/design.md`
- `docs/references/architecture-doc-status-matrix.md`

Component contract intent lives primarily in:

- `docs/components/index.md`
- `docs/components/amis-baseline-matrix.md`
- `docs/components/condition-builder/design.md`
- `docs/components/code-editor/design.md`
- `docs/components/crud/design.md`
- `docs/components/designer-page/design.md`
- `docs/components/report-designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`

Code-level contracts live primarily in:

- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/index.tsx`

Example behavior is best cross-checked with:

- `apps/playground/src/App.tsx`

## Directory Roles

- `docs/architecture/` - governing principles, normative architecture, platform-extension architecture, and focused subsystem docs for the current baseline
- start architecture navigation from `docs/architecture/README.md`; use `docs/references/architecture-doc-status-matrix.md` for role/owner/placement decisions
- `docs/components/` - per-component design inputs; each component keeps its own directory with schema, capability, and implementation notes
- `docs/references/` - stable lookup material such as terminology, interface maps, maintenance guidance, and source-specific reference notes; useful, but secondary to architecture docs
- `docs/amis-types/` - AMIS component TypeScript type definitions extracted from amis@6.13.0, useful for understanding upstream AMIS schema structure
- `docs/examples/` - small representative schemas and usage notes
- `docs/analysis/` - comparative, investigatory, or decision-oriented reports; primarily for conclusions and tradeoff records, not the active contract
- `docs/articles/` - architecture rationale and principle essays used as boundary references
- `docs/logs/` - per-day development logs (`{year}/{month}-{day}.md`), see `docs/logs/index.md` for writing guide and index
- `docs/bugs/` - numbered defect histories and fix notes for non-obvious regressions; useful for root-cause context and regression tracking, but secondary to architecture docs
- start new bug notes from `docs/bugs/00-bug-fix-note-writing-guide.md`
- `docs/plans/` - implementation plans and execution checklists; start new plans from `docs/plans/00-plan-authoring-and-execution-guide.md`, and ensure every plan file includes explicit status
- `docs/skills/` - reusable internal workflow prompts and task playbooks
