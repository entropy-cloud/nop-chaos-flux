# NOP Chaos Flux Documentation Index

## Purpose

This `docs/` tree is the curated entry point for the current repository state.

- start here before changing architecture docs
- prefer active files under `docs/architecture/`, `docs/references/`, and `docs/examples/`
- use `docs/logs/` for short dated notes about recent documentation, decisions, and next implementation steps (one file per day: `docs/logs/{year}/{month}-{day}.md`)
- treat `docs/archive/` as preserved draft history
- treat `docs/plans/` as working or historical planning material, not the default source of truth for current behavior

## Read This First

Choose the smallest document that matches the task.

| If you need to... | Read this first | Then read |
| --- | --- | --- |
| Understand the current architecture baseline | `docs/architecture/flux-core.md` | `docs/architecture/renderer-runtime.md` |
| Design API requests, scope injection (includeScope), params, or DataSource polling | `docs/architecture/api-data-source.md` | `docs/architecture/renderer-runtime.md` |
| 了解基于 SchemaRenderer 的图设计器规划架构 | `docs/architecture/flow-designer/design.md` | `docs/architecture/flow-designer/config-schema.md` |
| 看清 Flow Designer 各层协作细节、命名空间动作流转、画布/Inspector 调用链 | `docs/architecture/flow-designer/collaboration.md` | `docs/architecture/flow-designer/canvas-adapters.md` |
| 核对 Flow Designer 当前真实的 snapshot 契约、host scope 落地状态、哪些字段已接线 | `docs/architecture/flow-designer/runtime-snapshot.md` | `docs/architecture/flow-designer/collaboration.md` |
| Understand Flow Designer canvas adapter defaults, bridge variants, or `xyflow` integration | `docs/architecture/flow-designer/canvas-adapters.md` | `docs/architecture/flow-designer/api.md` |
| Plan parity work against `nop-chaos-next` `flow-editor` and identify which behaviors must become configuration-driven | `docs/plans/13-flow-editor-parity-gap-analysis-and-migration-plan.md` | `docs/architecture/flow-designer/design.md` |
| Design theme-compatible styling, host CSS variable integration, or `.na-theme-root` migration strategy | `docs/architecture/theme-compatibility.md` | `docs/architecture/renderer-runtime.md` |
| Design semantic props vs Tailwind className, custom style presets, or shadcn/ui integration | `docs/architecture/styling-system.md` | `docs/architecture/theme-compatibility.md` |
| Plan shadcn/ui migration from nop-chaos-next-master | `docs/plans/18-shadcn-ui-migration-plan.md` | `docs/architecture/styling-system.md` |
| 了解基于 SchemaRenderer 的报表设计器与 spreadsheet editor 规划架构 | `docs/architecture/report-designer/design.md` | `docs/architecture/report-designer/contracts.md` |
| 了解通用 report designer 如何适配 nop-report | `docs/architecture/report-designer/nop-report-profile.md` | `docs/analysis/excel-report-designer-research.md` |
| 了解 report designer 与 nop-report 的导入导出/round-trip 设计 | `docs/architecture/report-designer/codec-design.md` | `docs/architecture/report-designer/nop-report-profile.md` |
| 设计 report designer 的右侧属性面板与 expression/reference 字段编辑边界 | `docs/architecture/report-designer/inspector-design.md` | `docs/architecture/report-designer/contracts.md` |
| Change React integration, renderer props, hooks, or fragment rendering | `docs/architecture/renderer-runtime.md` | `docs/references/renderer-interfaces.md` |
| Design namespaced action extension, host action scopes, or `xui:import` semantics | `docs/architecture/action-scope-and-imports.md` | `docs/architecture/renderer-runtime.md` |
| Change slot-like fields such as `title`, `empty`, or `onClick` | `docs/architecture/field-metadata-slot-modeling.md` | `docs/architecture/renderer-runtime.md` |
| Change validation behavior or form field participation | `docs/architecture/form-validation.md` | `docs/architecture/flux-runtime-module-boundaries.md` |
| Decide where runtime or validation code should live | `docs/architecture/flux-runtime-module-boundaries.md` | `docs/architecture/form-validation.md` |
| Check workspace structure, package roles, or tooling baseline | `docs/architecture/frontend-baseline.md` | `package.json` |
| Plan playground information architecture or debugger UX | `docs/architecture/playground-experience.md` | `docs/analysis/framework-debugger-design.md` |
| Check shared terminology such as `CompiledValueNode`, `RenderRegionHandle`, `value-or-region`, or `FormRuntime` | `docs/references/terminology.md` | `docs/references/renderer-interfaces.md` |
| Check which docs must be updated after a code change | `docs/references/maintenance-checklist.md` | the most relevant file in `docs/architecture/` |
| Check AMIS JSON conventions (expression, action, variant/level, icon) | `docs/references/flux-json-conventions.md` | `docs/architecture/flow-designer/config-schema.md` |
| Look up AMIS component TypeScript type definitions | `docs/amis-types/` | specific component `.d.ts` file |
| Check complex component design process (Flow Designer, Report Designer) | `docs/references/complex-component-design-process.md` | `docs/architecture/flow-designer/design.md` |
| Plan or review a refactoring, or check low-code-specific design guidelines | `docs/references/refactoring-guidelines.md` | `docs/plans/23-architecture-audit-fix-plan.md` |
| Review current renderer and runtime contracts by name | `docs/references/renderer-interfaces.md` | `packages/flux-core/src/index.ts` |
| Inspect a representative schema example | `docs/examples/user-management-schema.md` | `apps/playground/src/App.tsx` |
| Review prototype lessons or external research notes | `docs/references/` | the related architecture file for the active baseline |
| Quickly review recent doc work, design notes, or near-term next steps | `docs/logs/` (daily files) | the most relevant active doc |

## Active Source Of Truth

Architecture intent lives primarily in:

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/playground-experience.md`
- `docs/architecture/theme-compatibility.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/report-designer/design.md`

Code-level contracts live primarily in:

- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/index.tsx`

Example behavior is best cross-checked with:

- `apps/playground/src/App.tsx`

## Directory Roles

- `docs/architecture/` - current normative design and package ownership notes
- `docs/references/` - stable lookup material such as terminology, interface maps, maintenance guidance, and source-specific reference notes; useful, but secondary to architecture docs
- `docs/amis-types/` - AMIS component TypeScript type definitions extracted from amis@6.13.0, useful for understanding upstream AMIS schema structure
- `docs/examples/` - small representative schemas and usage notes
- `docs/analysis/` - comparative, investigatory, or decision-oriented reports; primarily for conclusions and tradeoff records, not the active contract
- `docs/logs/` - per-day development logs (`{year}/{month}-{day}.md`), see `docs/logs/index.md` for writing guide and index
- `docs/bugs/` - numbered defect histories and fix notes for non-obvious regressions; useful for root-cause context and regression tracking, but secondary to architecture docs
- start new bug notes from `docs/bugs/00-bug-fix-note-writing-guide.md`
- `docs/plans/` - implementation plans, checklists, and completion records; historical unless a plan is being actively executed
- `docs/archive/` - preserved original drafts and legacy source material

## Archive Sources

The original root-level source materials are preserved under `docs/archive/` for cross-checking and historical context:

- `docs/archive/nop-chaos-amis.md`
- `docs/archive/nop-chaos-amis-renderer-design.md`
- `docs/archive/nop-chaos-frontend-arch.md`
- `docs/archive/nop-chaos-amis-renderer-interfaces.ts`
- `docs/archive/expression-processor.js`

When updating documentation, edit the active curated file first and consult the archive only when you need original draft context.

