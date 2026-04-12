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
| Understand the current architecture baseline | `docs/architecture/flux-design-principles.md` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-core.md` |
| Understand Flux's top-level frontend programming model, primitive categories, macro layering, and how the primitives compose into one execution model | `docs/architecture/frontend-programming-model.md` | `docs/architecture/flux-core.md` |
| Understand action control flow such as `when`, `then`, `onError`, `parallel`, result classes, and chained result context | `docs/architecture/action-algebra-formal-spec.md` | `docs/architecture/action-scope-and-imports.md` |
| è®¾è®¡ action å¯è§†åŒ–ç¼–è¾‘ã€optional stepã€graph loweringï¼Œæˆ–åˆ¤æ–­æ˜¯å¦è¦æŠŠ `parallel` æ”¹æˆ `steps` | `docs/architecture/action-graph-authoring.md` | `docs/architecture/action-algebra-formal-spec.md` |
| è®¾è®¡å€¼è½¬æ¢ã€å­—æ®µ draft ç”Ÿå‘½å‘¨æœŸã€ç»„åˆå¼è¯¦æƒ…å­—æ®µ/è¯¦æƒ…è§†å›¾ã€æˆ– `transformInAction` / `transformOutAction` / `validateValueAction` | `docs/architecture/value-adaptation-and-detail-field.md` | `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md` |
| è®¾è®¡ field bindingã€`name` vs `value`ã€shared field schema baseã€æˆ–åˆ¤æ–­å“ªäº›å­—æ®µå±žäºŽ `props` / `meta` | `docs/architecture/field-binding-and-renderer-contract.md` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md` |
| è®¾è®¡å¤šæ€å€¼å­—æ®µã€`string | object`/`string | ActionSchema` è¿™ç±» union-like ç¼–è¾‘ã€è‡ªåŠ¨è¯†åˆ«å˜ä½“ã€æˆ–åˆ‡æ¢ä¸åŒç¼–è¾‘å™¨ | `docs/architecture/variant-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-scope-and-imports.md` |
| è®¾è®¡å¯¹è±¡å­—æ®µã€å±€éƒ¨ subformã€ä¸€ä¸ªå­—æ®µå†…éƒ¨å†æ‹†å¤šä¸ªå±žæ€§ç¼–è¾‘ã€æˆ–ç›¸å¯¹å¯¹è±¡æ ¹çš„å­å­—æ®µå‘½å | `docs/architecture/object-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/renderer-runtime.md` |
| è®¾è®¡æ•°ç»„å­—æ®µã€æ ‡é‡æ•°ç»„/å¯¹è±¡æ•°ç»„ç¼–è¾‘ã€æˆ–åˆ¤æ–­å®ƒä¸Ž `list` / `loop` / AMIS `combo` / `input-array` çš„è¾¹ç•Œ | `docs/architecture/array-field.md` | `docs/architecture/object-field.md`, `docs/components/list/design.md`, `docs/components/loop/design.md` |
| è®¾è®¡æŒ‰é’® / è¡¨å• / é€‰æ‹©æŽ§ä»¶çš„ async pendingã€loadingã€disabled è¯­ä¹‰ | `docs/architecture/action-interaction-state.md` | `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md` |
| è®¾è®¡ dialog / drawer / future sheet çš„æ‰“å¼€æ€ã€surface statusã€`statusPath` æˆ–å±€éƒ¨ `$surface` è§„åˆ™ | `docs/architecture/surface-owner.md` | `docs/architecture/action-interaction-state.md` |
| è®¾è®¡ scope ç»§æ‰¿ã€`data` åˆå§‹åŒ–ã€`isolate`ã€row scopeã€æˆ–åˆ¤æ–­æ˜¯å¦éœ€è¦ `$parentScope` | `docs/architecture/scope-ownership-and-isolation.md` | `docs/architecture/renderer-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md` |
| è®¾è®¡ dialog / drawer çš„ `data`ã€open-stateã€surface status ä¸Ž scope è¾¹ç•Œ | `docs/architecture/surface-owner.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/components/dialog/design.md` |
| Design API requests, scope injection (includeScope), params, DataSource polling, unified formula/api source semantics, or non-rendering reaction/watch nodes | `docs/architecture/api-data-source.md` | `docs/architecture/renderer-runtime.md` |
| äº†è§£åŸºäºŽ SchemaRenderer çš„å›¾è®¾è®¡å™¨è§„åˆ’æž¶æž„ï¼Œæˆ–åˆ¤æ–­ graph designer ä¸Ž domain-specific codec / value editor çš„è¾¹ç•Œ | `docs/architecture/flow-designer/README.md` | `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md` |
| çœ‹æ¸… Flow Designer å„å±‚åä½œç»†èŠ‚ã€å‘½åç©ºé—´åŠ¨ä½œæµè½¬ã€ç”»å¸ƒ/Inspector è°ƒç”¨é“¾ | `docs/architecture/flow-designer/collaboration.md` | `docs/architecture/flow-designer/canvas-adapters.md` |
| æ ¸å¯¹ Flow Designer å½“å‰çœŸå®žçš„ snapshot å¥‘çº¦ã€host scope è½åœ°çŠ¶æ€ã€å“ªäº›å­—æ®µå·²æŽ¥çº¿ | `docs/architecture/flow-designer/runtime-snapshot.md` | `docs/architecture/flow-designer/collaboration.md` |
| Understand Flow Designer React Flow integration, callback translation, or canvas failure semantics | `docs/architecture/flow-designer/canvas-adapters.md` | `docs/architecture/flow-designer/api.md` |
| Draft, execute, or audit a plan under `docs/plans/` | `docs/plans/00-plan-authoring-and-execution-guide.md` | `docs/logs/index.md` |
| Plan parity work against `nop-chaos-next` `flow-editor` and identify which behaviors must become configuration-driven | `docs/plans/13-flow-editor-parity-gap-analysis-and-migration-plan.md` | `docs/architecture/flow-designer/design.md` |
| Plan implementation of compiler-integrated schema diagnostics | `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md` | `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md` |
| Design theme-compatible styling, host CSS variable integration, or `.na-theme-root` migration strategy | `docs/architecture/theme-compatibility.md` | `docs/architecture/renderer-runtime.md` |
| Design semantic props vs Tailwind className, custom style presets, or shadcn/ui integration | `docs/architecture/styling-system.md` | `docs/architecture/renderer-markers-and-selectors.md` |
| Plan shadcn/ui migration from nop-chaos-next-master | `docs/plans/18-shadcn-ui-migration-plan.md` | `docs/architecture/styling-system.md` |
| Plan dependency-tracking runtime convergence under the root-binding model | `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` | `docs/architecture/dependency-tracking.md` |
| äº†è§£åŸºäºŽ SchemaRenderer çš„æŠ¥è¡¨è®¾è®¡å™¨ä¸Ž spreadsheet editor è§„åˆ’æž¶æž„ | `docs/architecture/report-designer/README.md` | `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/contracts.md` |
| äº†è§£é€šç”¨ report designer å¦‚ä½•é€‚é… nop-report | `docs/architecture/report-designer/nop-report-profile.md` | `docs/analysis/2026-03-21-excel-report-designer-research.md` |
| äº†è§£ report designer ä¸Ž nop-report çš„å¯¼å…¥å¯¼å‡º/round-trip è®¾è®¡ | `docs/architecture/report-designer/codec-design.md` | `docs/architecture/report-designer/nop-report-profile.md` |
| è®¾è®¡ report designer çš„å³ä¾§å±žæ€§é¢æ¿ä¸Ž expression/reference å­—æ®µç¼–è¾‘è¾¹ç•Œ | `docs/architecture/report-designer/inspector-design.md` | `docs/architecture/report-designer/contracts.md` |
| Change React integration, renderer props, hooks, or fragment rendering | `docs/architecture/renderer-runtime.md` | `docs/references/renderer-interfaces.md` |
| Design compile-once/runtime-instantiation behavior, `cid`/template-node identity, repeated-instance identity, or future `type: 'loop'` rules | `docs/architecture/template-instantiation-and-node-identity.md` | `docs/architecture/component-resolution.md` |
| Design `loop` node schema, item scope, `itemName` / `indexName`, or `itemData` | `docs/components/loop/design.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design scoped render slots, nested slot scope, render-prop-like region params, or `$slot` semantics | `docs/architecture/scoped-render-slots.md` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md` |
| Design recursive structural rendering, `recurse`, or nearest-enclosing-loop recursion rules | `docs/components/recurse/design.md` | `docs/components/loop/design.md`, `docs/components/fragment/design.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design a no-UI grouping node, grouped `when` usage, or decide `fragment` versus `container` | `docs/components/fragment/design.md` | `docs/architecture/scope-ownership-and-isolation.md`, `docs/components/container/design.md` |
| Design `list` as a visual collection renderer, or decide its boundary versus `loop` / `table` | `docs/components/list/design.md` | `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| Design `tree` as a visual hierarchical renderer, or decide its boundary versus `loop` / `recurse` / future `input-tree` | `docs/components/tree/design.md` | `docs/components/recurse/design.md`, `docs/components/loop/design.md` |
| Design `input-tree` / `tree-select` as form tree controls, or decide their boundary versus `tree` / `select` | `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md` | `docs/components/tree/design.md`, `docs/components/select/design.md`, `docs/components/form/design.md` |
| Design high-performance table row identity, `rowKey`, row-scope reuse, row-local invalidation, or same-row field access inside tables | `docs/architecture/table-row-identity-and-scope-performance.md` | `docs/architecture/dependency-tracking.md`, `docs/architecture/template-instantiation-and-node-identity.md` |
| è®¾è®¡æˆ–å®žçŽ°æŸä¸ªå…·ä½“ç»„ä»¶çš„ schema å¥‘çº¦ã€æ ¸å¿ƒèƒ½åŠ›å’Œè½åœ°è·¯çº¿ | `docs/components/index.md` | å¯¹åº”ç»„ä»¶ç›®å½•ä¸‹çš„ `docs/components/<component>/design.md`ï¼Œå†å›žçœ‹ç›¸å…³ `docs/architecture/*.md` |
| Design namespaced action extension, host action scopes, `xui:imports` semantics, or dynamic domain libraries loaded into owner semantic actions | `docs/architecture/action-scope-and-imports.md` | `docs/architecture/renderer-runtime.md`, `docs/architecture/flow-designer/config-schema.md` |
| è®¾è®¡ Flux schema æ–‡ä»¶æ ¡éªŒå™¨ã€å¯¼å…¥å‰ç»“æž„æ ¡éªŒæˆ–å‘½åç©ºé—´å±žæ€§å¿½ç•¥ç­–ç•¥ | `docs/architecture/schema-file-validator.md` | `docs/architecture/action-scope-and-imports.md`, `docs/references/flux-json-conventions.md` |
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
| Check which docs must be updated after a code change | `docs/references/maintenance-checklist.md` | the most relevant file in `docs/architecture/` |
| Check AMIS JSON conventions (expression, action, variant/level, icon) | `docs/references/flux-json-conventions.md` | `docs/architecture/flow-designer/config-schema.md` |
| Look up AMIS component TypeScript type definitions | `docs/amis-types/` | specific component `.d.ts` file |
| Check complex component design process (Flow Designer, Report Designer) | `docs/references/complex-component-design-process.md` | `docs/architecture/flow-designer/design.md` |
| Design Flux as the final DSL runtime, decide loader-vs-runtime extensibility boundaries, or model complex controls/design tools as special schema types | `docs/architecture/flux-dsl-vm-extensibility.md` | `docs/architecture/complex-control-host-protocol.md`, `docs/articles/flux-design-introduction.md` |
| Plan or review a refactoring, or check low-code-specific design guidelines | `docs/references/refactoring-guidelines.md` | `docs/plans/23-architecture-audit-fix-plan.md` |
| Review current renderer and runtime contracts by name | `docs/references/renderer-interfaces.md` | `packages/flux-core/src/index.ts` |
| Inspect a representative schema example | `docs/examples/user-management-schema.md` | `apps/playground/src/App.tsx` |
| Review prototype lessons or external research notes | `docs/references/` | the related architecture file for the active baseline |
| Quickly review recent doc work, design notes, or near-term next steps | `docs/logs/` (daily files) | the most relevant active doc |
| Understand nop-chaos-flux's architecture position vs industry frameworks | `docs/analysis/2026-04-04-nop-chaos-flux-comparison-report.md` | `docs/architecture/flux-core.md` |

## Active Source Of Truth

Architecture intent lives primarily in:

- `docs/architecture/README.md` (architecture hierarchy and reading order)

- `docs/architecture/flux-design-principles.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/frontend-programming-model.md`
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
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/report-designer/design.md`
- `docs/references/architecture-doc-status-matrix.md`

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

