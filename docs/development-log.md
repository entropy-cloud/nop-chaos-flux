# Development Log

## Purpose

Use this file for short dated notes about:

- what document was added or updated
- what design decision was made
- what work is planned next
- small context that is useful to remember later but does not belong in a formal architecture doc

This file is intentionally lightweight.

- keep entries short
- prefer reverse chronological order
- link to the main doc or code path when possible
- do not treat this file as the source of truth for architecture contracts

## Entries





### 2026-03-28 (Flow Designer Node Visual Matching Prototype)

- Aligned FlowDesigner node CSS with prototype at `flow-editor-static.html`.
- Added system-level gradient/glass/glow utility classes to `packages/tailwind-preset/src/styles/base.css`:
  - `.nop-gradient-start/end/task/condition/parallel/loop` — node icon gradients
  - `.nop-glass-card` / `.nop-glass-card-glow` — glassmorphism card + selected glow ring
- Updated JSON schema `classAliases` in `apps/playground/src/schemas/workflow-designer-schema.json` to use new utility tokens.
- Rewrote `packages/flow-designer-renderers/src/styles.css` — glass card node style, gradient icon boxes, colored type chips, glow selection ring.
- Updated `apps/playground/src/flow-designer/FlowDesignerCanvas.tsx` — node structure now has header (icon+info), footer (chip+meta), actions (duplicate/delete).
- Removed obsolete split CSS files under `packages/flow-designer-renderers/src/styles/` and `tailwind-polyfill.css`.
- Key decision: three-layer CSS approach — Tailwind utilities in JSON `classAliases`, system-level CSS in tailwind-preset, hardcoded CSS in renderer stylesheet.
- Next step: visual verification via `pnpm dev`; potential dark mode chip refinement.

### 2026-03-28 (Flow Designer Button Theme Token Fix)

- Fixed flow designer button visuals/hover mismatch with shadcn/ui by restoring missing Tailwind utility generation for UI primitives.
- Updated `tailwind.config.ts` `content` to include `packages/ui/src/**/*.{ts,tsx}` so `Button` variant classes (`hover:bg-*`, `bg-*`, `text-*`) are emitted for playground/runtime usage.
- Impacted path: `tailwind.config.ts`.
- Key decision: keep flow-designer local CSS unchanged for button states and rely on shared shadcn/ui token-driven variants as the source of truth.
- Validation: ran `pnpm typecheck`, `pnpm build`, `pnpm lint`; `typecheck/build` still show pre-existing `apps/playground/vite.config.ts` TS2769 mismatch, lint passes with existing warnings only.

### 2026-03-28 (shadcn/ui Migration Execution - Phase 2/3 Expansion)

- Expanded `packages/ui` with migration-plan core components and exports:
  - Inputs/fields: `textarea`, `label`, `checkbox`, `switch`, `radio-group`, `select`
  - Overlay: `dialog`, `sheet`, `popover`, `tooltip`, `dropdown-menu`
  - Layout/feedback: `tabs`, `card`, `badge`, `avatar`, `separator`, `scroll-area`, `table`, `alert`, `progress`, `skeleton`, `spinner`
- Integrated additional renderer surfaces:
  - `packages/flux-renderers-basic/src/badge.tsx` now uses `@nop-chaos/ui` `Badge`.
  - flow-designer renderer controls updated to shadcn/ui primitives in:
    - `packages/flow-designer-renderers/src/designer-inspector.tsx`
    - `packages/flow-designer-renderers/src/designer-palette.tsx`
    - `packages/flow-designer-renderers/src/designer-toolbar.tsx`
    - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowNode.tsx`
    - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowEdge.tsx`
  - Added `@nop-chaos/ui` dependency to `packages/flow-designer-renderers/package.json`.
- Validation run succeeded for workspace-level `typecheck/build/lint/test/test:e2e` (lint remains with pre-existing warnings only).
- Key decision: keep form `select/checkbox/switch/radio-group` renderer behavior unchanged for now to preserve existing validation/test interaction semantics; continue incremental replacement in a dedicated follow-up.
- Next step: remove duplicated legacy `.nop-*` playground form/button style blocks after completing remaining renderer-side semantic alignment.

### 2026-03-28 (shadcn/ui Migration Follow-up - Form Controls + Duplicate Style Cleanup)

- Completed renderer-side migration for additional form surfaces while keeping behavior parity:
  - `packages/flux-renderers-form/src/renderers/input.tsx` now uses shadcn/ui components for `select`, `checkbox`, `switch`, `radio-group`, `checkbox-group` interactions.
  - `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `key-value.tsx`, `tag-list.tsx` now use `@nop-chaos/ui` `Input`/`Button` for control rendering.
- Updated form tests to align with radix/shadcn interaction semantics (option selection via popup items / radio roles) in `packages/flux-renderers-form/src/index.test.tsx`.
- Cleaned duplicated legacy playground styles in `apps/playground/src/styles.css`:
  - removed obsolete `.nop-button`, `.nop-select`, and old custom switch track/thumb blocks
  - narrowed dirty/invalid selectors to active classes still used by current renderers
- Updated flow-designer CSS selector compatibility for shadcn button variants in `packages/flow-designer-renderers/src/styles.css`.
- Key decision: preserve form runtime validation/state semantics while swapping UI primitives, then remove only confirmed-unused duplicate style blocks.

### 2026-03-28 (shadcn/ui Migration Follow-up - Flow Designer Hover + Schema Simplification)

- Fixed flow-designer button hover behavior regression by removing legacy visual overrides that flattened shadcn button interaction states in `packages/flow-designer-renderers/src/styles.css`.
- Kept only minimal layout/size constraints for toolbar/quick-action buttons and restored hover feedback (`hover:bg-*`) for node/edge quick actions.
- Simplified workflow schema styling config:
  - removed `themeStyles` from `apps/playground/src/schemas/workflow-designer-schema.json`
  - moved palette icon gradients into renderer stylesheet
  - replaced repeated node body utility class strings with `classAliases` tokens (`node-card`, `node-header`, `node-icon--*`, `node-badge--*`, etc.)
- Added/expanded automation for button behavior coverage:
  - `packages/flow-designer-renderers/src/designer-controls.test.tsx`
  - `tests/e2e/flow-designer-ui.spec.ts` button behavior scenario
- Validation: flow-designer unit suites and dedicated e2e spec pass after changes.

### 2026-03-28 (shadcn/ui Migration Execution - Phase 1 + Button/Input Integration)

- Executed migration plan Phase 1 by creating `packages/ui` and copying core files: `src/lib/utils.ts`, `src/styles/base.css`, `src/styles/index.css`.
- Migrated first Batch 1 components into workspace UI package: `packages/ui/src/components/ui/button.tsx` and `packages/ui/src/components/ui/input.tsx`, with exports in `packages/ui/src/index.ts`.
- Integrated renderers:
  - `packages/flux-renderers-basic/src/button.tsx` now uses `Button` from `@nop-chaos/ui` with variant/size mapping.
  - `packages/flux-renderers-form/src/renderers/input.tsx` now uses `Input` from `@nop-chaos/ui`.
- Wired workspace integration:
  - path/alias updates in `tsconfig.base.json`, `tsconfig.json`, `vite.workspace-alias.ts`
  - dependency wiring in `packages/flux-renderers-basic/package.json` and `packages/flux-renderers-form/package.json`
  - playground style import in `apps/playground/src/main.tsx` via `@nop-chaos/ui/styles.css`
- Updated progress checklist in `docs/plans/18-shadcn-ui-migration-plan.md`.
- Key decision: keep migration minimal and behavior-safe by only replacing component primitives for Button/Input while preserving flux-runtime state/action handling.
- Next step: migrate remaining Batch 1 form primitives (Textarea/Label/Checkbox/Switch/RadioGroup) and start overlay batch.

### 2026-03-28 (shadcn/ui Migration Planning)

- Added `docs/architecture/styling-system.md` section explaining why we framework uses shadcn/ui components.
- Created `docs/plans/18-shadcn-ui-migration-plan.md` with detailed migration plan from nop-chaos-next-master.
- Key decision: use shadcn/ui for UI interaction layer (hover/focus/accessibility) while keeping business logic in flux-runtime layer.
- Core dependencies: radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react.
- Excluded: react-hook-form, zod, recharts, cmdk, date-fns (not needed for basic rendering).
- Next step: execute Phase 1 (create packages/ui structure and copy core infrastructure).

### 2026-03-27 (Flow Designer Production-Parity Refactor Execution)

- Executed the production-parity refactor items on the `designer-page` main path:
  - wired palette drag source (`draggable` + `DESIGNER_PALETTE_NODE_MIME`) and canvas drop bridge to create nodes at drop point
  - switched XYFlow drop coordinates to `screenToFlowPosition` and made canvas background render follow `gridEnabled` + `config.canvas` (`background`, `gridSize`)
  - unified back navigation into toolbar action flow (`designer:navigate-back`) and removed floating page-level Back button
  - added runtime shortcut handling in `designer-page` for undo/redo/copy/paste/delete/save based on schema `shortcuts` and `features`
  - aligned toolbar JSON entry label and schema back item action
- Updated code paths:
  - `packages/flow-designer-core/src/types.ts`
  - `packages/flow-designer-renderers/src/designer-palette.tsx`
  - `packages/flow-designer-renderers/src/designer-canvas.tsx`
  - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
  - `packages/flow-designer-renderers/src/designer-toolbar.tsx`
  - `packages/flow-designer-renderers/src/designer-command-adapter.ts`
  - `packages/flow-designer-renderers/src/designer-page.tsx`
  - `packages/flow-designer-renderers/src/styles.css`
  - `apps/playground/src/pages/FlowDesignerPage.tsx`
  - `apps/playground/src/pages/FlowDesignerPage.test.tsx`
  - `apps/playground/src/schemas/workflow-designer-schema.json`
- Key decision: keep navigation and shortcut behavior renderer-scoped and schema-driven via existing `designer` action namespace, avoiding page-local ad hoc handlers.
- Validation: `pnpm typecheck && pnpm build && pnpm lint && pnpm test && pnpm test:e2e --reporter=line` passed.

### 2026-03-27 (Flow Designer Style JSON-Driven Migration Complete)

- Completed the style migration plan to make flow designer fully JSON-configurable:
  - Added `classAliases` and `themeStyles` fields to `DesignerConfig` and `NormalizedDesignerConfig`
  - Modified `designer-palette.tsx` to use `data-type` attribute instead of type-specific CSS classes
  - Added `themeStyles` injection in `designer-page.tsx` via `<style>` element
  - Updated `workflow-designer-schema.json` with palette icon gradients as theme styles
- Fixed test mock issue in `canvas-bridge.test.tsx` by adding `BackgroundVariant` to `@xyflow/react` mock
- Fixed lint errors in `DesignerXyflowEdge.tsx` by removing unused imports
- Files:
  - `packages/flow-designer-core/src/types.ts`
  - `packages/flow-designer-core/src/core.ts`
  - `packages/flow-designer-renderers/src/designer-palette.tsx`
  - `packages/flow-designer-renderers/src/designer-page.tsx`
  - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowEdge.tsx`
  - `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
  - `apps/playground/src/schemas/workflow-designer-schema.json`
  - `tailwind.config.ts`
  - `tailwind-safelist.txt`
- Key decision: palette icon gradients now live in `themeStyles` (schema-defined) instead of hardcoded CSS, making the designer fully theme-customizable per-schema
- Validation: `pnpm typecheck && pnpm build && pnpm lint && pnpm --filter @nop-chaos/flow-designer-renderers test` all pass

### 2026-03-27 (Flow Designer Production-Parity Refactor Plan)

- Added a new focused refactor plan for turning Flow Designer from demo-level capability into production-usable parity with legacy Flow Editor.
- Plan covers concrete gap closure for:
  - grid toggle vs canvas background consistency
  - explicit JSON toolbar entry
  - drag-from-palette and create-at-drop-position behavior
  - full-height three-panel layout with collapsible left/right side panels
  - moving "return to home" into unified toolbar actions
- New plan document:
  - `docs/plans/17-flow-designer-production-parity-refactor-plan.md`
- Key decision:
  - prioritize `flow-designer-renderers` + schema-driven integration path as the only primary implementation path, and avoid reintroducing page-local hardcoded behavior.
- Follow-up clarification:
  - confirmed current `designer-page` main path does not yet execute schema-defined shortcuts at runtime (shortcuts currently wired only in legacy `FlowDesignerExample` path)
  - updated plan to explicitly include shortcut runtime wiring and mandatory new automation coverage
  - updated pass criteria: all relevant automation (`typecheck/build/lint/test/test:e2e`) must succeed before marking completion

### 2026-03-27 (Flow Designer Visual Parity Closure: Node Semantics, Canvas, Minimap)

- Consolidated the final visual parity fixes against `flow-editor-static.html` and closed the remaining accepted gaps in one pass.
- Key outcomes:
  - unified node structure to vertical two-row semantics and moved size policy to JSON (`nodeType.appearance` + per-node overrides)
  - aligned selected state, palette icon chips, quick-actions default/hover style, edge dash/label tokens, and controls/minimap anchor positions
  - resolved minimap centered-square artifact by aligning shell/svg background tokens and forcing SVG mask mapping with `preserveAspectRatio="none"`
- Key decision:
  - keep rendering behavior schema-driven first; CSS is limited to scoped utility shims and deterministic XYFlow wrapper constraints
- Primary code paths:
  - `apps/playground/src/schemas/workflow-designer-schema.json`
  - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
  - `packages/flow-designer-renderers/src/styles.css`
  - `tests/e2e/flow-designer-ui.spec.ts`
- Validation summary:
  - `pnpm.cmd --filter @nop-chaos/flow-designer-renderers lint`
  - `pnpm.cmd typecheck`
  - `pnpm.cmd build`
  - `pnpm.cmd test:e2e --reporter=line` (`2 passed`)

### 2026-03-27 (Bug Note Standard Update: Diagnostic Method Is Mandatory)

- Updated bug note writing standard to require a dedicated `Diagnostic Method` section in every bug record:
  - captures why diagnosis was hard
  - records investigation path and rejected hypotheses
  - requires decisive runtime evidence used to confirm root cause
- Backfilled the requirement on current visual parity bug note with concrete diagnosis steps and evidence chain:
  - `docs/bugs/12-flow-designer-visual-parity-canvas-node-style-fix.md`
- Docs updated:
  - `docs/bugs/00-bug-fix-note-writing-guide.md`
  - `docs/bugs/12-flow-designer-visual-parity-canvas-node-style-fix.md`
- Key decision: bug notes must preserve not only conclusion and fix, but also reproducible diagnosis path for hard issues.



### 2026-03-27 (Canvas-Bridge Schema-Driven Rendering Refactor Complete)

- Completed the canvas bridge refactor to a schema-driven XYFlow module set.
- New submodules under `packages/flow-designer-renderers/src/designer-xyflow-canvas/`: `types.ts`, `xyflow-utils.ts`, `render-ports.tsx`, `DesignerXyflowNode.tsx`, `DesignerXyflowEdge.tsx`, `DesignerXyflowCanvas.tsx`, `index.ts`.
- Simplified integration points: `canvas-bridge.tsx`, `designer-canvas.tsx`, `designer-page.tsx`.
- Updated tests around the new bridge API (`canvas-bridge.test.tsx`, `index.test.tsx`).
- Key decision: node/edge rendering is config-first, with explicit fallback when schema `body` is missing.

### 2026-03-27 (Component Resolution Design)

- Added architecture doc `docs/architecture/component-resolution.md` to standardize component targeting.
- Defined mixed static/dynamic model: static lookup via `_cid`, dynamic lookup via `_templateId` + `instanceKey`.
- Kept scope boundary at page level and preserved runtime fallback (`componentId`/`componentName`) when compile-time resolution is unavailable.
- Documented edge-case strategy (nested dynamic paths, conditional mount state, dynamic schema loading, lifecycle cleanup).

### 2026-03-27 (Component Action Syntax Change)

- Switched component action syntax from `component:invoke + args.method` to `component:<method>`.
- Updated runtime dispatch implementation in `packages/flux-runtime/src/action-runtime.ts` and synced related tests.
- Updated architecture/reference docs to reflect the new contract.
- Key decision: keep concise syntax while preserving clear namespace separation from built-in actions.

### 2026-03-27 (nop-debugger: Pinned Error Buffer for AI/Automation)

- Added pinned error buffering to `@nop-chaos/nop-debugger` so earliest/latest errors survive sliding-window truncation.
- Exposed retrieval APIs: `getEarliestErrors()`, `getLatestErrors()`, `getPinnedErrors()` on controller and automation surfaces.
- Updated debugger types/store/controller/automation/diagnostics and added store regression tests.
- Key value: automation can fetch stable error snapshots without manual log extraction.

### 2026-03-27 (Flow Designer Page Fixes)

- Fixed Flow Designer page stability issues: optional event handling in canvas callbacks, guarded selection-change notifications, and full-height layout corrections.
- Removed two runtime failure modes: undefined `stopPropagation` and selection-triggered update loops.
- Updated files: `packages/flow-designer-renderers/src/designer-canvas.tsx`, `packages/flow-designer-renderers/src/canvas-bridge.tsx`, `packages/flow-designer-renderers/src/styles.css`, `apps/playground/src/styles.css`.

### 2026-03-27 (FieldFrame Component and wrap Property)

- Added `FieldFrame` in `flux-react` and introduced `RendererDefinition.wrap` to centralize form label/error/hint wrapping.
- `NodeRenderer` now auto-wraps renderers marked with `wrap: true`; form input renderers were simplified to input-only view logic.
- Documented the contract in `docs/architecture/field-frame.md`.
- Key decision: keep wrapper abstraction in `flux-react` (shared runtime layer), not in form-renderer package.

### 2026-03-27 (Formula Expression Parser Fix)

- Fixed formula parser edge cases in `packages/flux-formula/src/index.ts`:
  - nested-brace template parsing and ternary expressions
  - correct `ScopeRef` conversion in `toEvalContext`
  - robust pure-expression detection (replacing over-broad regex behavior)
- Added regression tests in `packages/flux-formula/src/index.test.ts`.

### 2026-03-26 (Flow Designer JSON Rendering)

- **Converted FlowDesignerPage to JSON-based rendering**:
  - Created `apps/playground/src/schemas/workflow-designer-schema.json`
  - Modified `FlowDesignerPage.tsx` to use `SchemaRenderer` instead of `FlowDesignerExample`
  - Schema references `docs/examples/workflow-designer/config.json` and `document.json`
  - Uses `designer-page` renderer from `@nop-chaos/flow-designer-renderers`

- **Key changes**:
  - FlowDesignerPage now uses `createSchemaRenderer` from `@nop-chaos/flux-react`
  - Config and document are loaded from JSON schema instead of hardcoded TypeScript
  - Registry is created locally with all required renderers registered

- Files: `apps/playground/src/pages/FlowDesignerPage.tsx`, `apps/playground/src/schemas/workflow-designer-schema.json`
- Reference: `docs/analysis/flow-designer-json-rendering-research.md`

### 2026-03-26 (Dynamic Renderer Implementation)

- **Implemented `dynamic-renderer` renderer** in `packages/flux-renderers-basic/src/index.tsx`:
  - Loads JSON schema dynamically via `schemaApi` property
  - Renders `body` content while loading
  - Replaces body with loaded schema on success
  - Shows error message on fetch failure

- **Added `DynamicRendererSchema` type** in `packages/flux-core/src/types.ts`:
  - `schemaApi: ApiObject` - API to fetch schema
  - `body?: SchemaInput` - Fallback content during loading

- **Added tests** for dynamic-renderer:
  - Body content rendering while loading
  - Schema replacement on successful load
  - Error message display on fetch failure

- Files: `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-renderers-basic/src/index.test.tsx`, `packages/flux-core/src/types.ts`

### 2026-03-26 (DataSource Renderer Implementation)

- **Implemented `data-source` renderer** in `packages/flux-renderers-data/src/index.tsx`:
  - Fetches data from API and injects into scope via `dataPath`
  - Supports `initialData` for immediate rendering before fetch
  - Supports `interval` for polling with `stopWhen` condition
  - Supports `silent` mode to suppress error notifications
  - Supports API caching via `cacheTTL` and `cacheKey`
  - Body region renders with fetched data in scope

- **Exported utilities from `flux-runtime`**:
  - `createApiCacheStore`, `resolveCacheKey` from `api-cache.ts`
  - `applyRequestAdaptor`, `applyResponseAdaptor`, `prepareApiData`, `buildUrlWithParams` from `request-runtime.ts`

- **Added tests** for data-source renderer:
  - Basic data fetching and body rendering
  - initialData handling
  - Error handling with/without silent mode
  - Cache behavior with cacheTTL

- Files: `packages/flux-renderers-data/src/index.tsx`, `packages/flux-renderers-data/src/index.test.tsx`, `packages/flux-runtime/src/index.ts`
- Key decision: data-source creates a child scope with fetched data for body region
- Key decision: use global cache store shared across all data-source instances

### 2026-03-26 (ApiObject and DataSource Design)

- **Revised `ApiObject` interface** in `packages/flux-core/src/types.ts`:
  - Removed `dataPath` (moved to ActionSchema/DataSourceSchema)
  - Added `params` for URL query parameters
  - Added `includeScope` for automatic scope variable injection (`'*' | string[]`)
  - Added `cacheTTL` for cache time-to-live (milliseconds)
  - Added `cacheKey` for custom cache key sharing
  
- **Added `DataSourceSchema` interface** in `packages/flux-core/src/types.ts`:
  - `type: 'data-source'` renderer for declarative data fetching
  - `api`, `dataPath`, `interval`, `stopWhen`, `silent`, `initialData`, `body`
  
- **Added `packages/flux-runtime/src/api-cache.ts`**:
  - `ApiCacheStore` interface and `createApiCacheStore()` factory
  - `generateCacheKey()` for auto-generating cache keys from ApiObject
  - `resolveCacheKey()` for determining effective cache key

- **Updated `packages/flux-runtime/src/request-runtime.ts`**:
  - Added `extractScopeData()` for includeScope processing
  - Added `buildUrlWithParams()` for URL query string construction
  - Added `prepareApiData()` for data/params preparation with scope merge

- **Added `docs/architecture/api-data-source.md`**:
  - Documents ApiObject design with includeScope, params, cacheTTL, cacheKey
  - Documents DataSourceSchema design with polling and stopWhen
  - Includes usage examples

- **Updated `AGENTS.md`**:
  - Added "Code Organization" section about separating independent modules

- **Updated related docs**:
  - `docs/references/renderer-interfaces.md` - added DataSourceSchema
  - `docs/references/terminology.md` - added DataSource, includeScope, params terms
  - `docs/index.md` - added api-data-source.md entry

- Key decision: `data` overrides `includeScope` for same keys in merge
- Key decision: `params` works for all HTTP methods, not just GET
- Key decision: `cacheTTL` (not `cache: boolean`) for explicit cache duration

### 2026-03-25 (flux-core Code Refactoring)

- **Refactored `packages/flux-core/src/index.ts`** (1183 lines → 20 lines + modular files):
  - Extracted all type definitions to `types.ts` (687 lines)
  - Extracted validation model functions to `validation-model.ts` (174 lines)
  - Extracted object utilities to `utils/object.ts` (isPlainObject, shallowEqual)
  - Extracted path utilities to `utils/path.ts` (parsePath, getIn, setIn)
  - Extracted schema utilities to `utils/schema.ts` (isSchema, isSchemaArray, isSchemaInput, createNodeId)
  - Extracted constants to `constants.ts` (META_FIELDS)
  - Main `index.ts` now only re-exports from modules
- **Key decision**: Keep all types in a single `types.ts` file instead of splitting into multiple type files to avoid circular dependency issues
- **Files**: `packages/flux-core/src/index.ts`, `types.ts`, `validation-model.ts`, `constants.ts`, `utils/object.ts`, `utils/path.ts`, `utils/schema.ts`
- **Verification**: All typecheck, build, and test pass

### 2026-03-25 (Rename AMIS to Flux)

- **Renamed package references in documentation**:
  - `amis-schema` → `flux-core`
  - `amis-formula` → `flux-formula`
  - `amis-runtime` → `flux-runtime`
  - `amis-react` → `flux-react`
  - `amis-renderers-*` → `flux-renderers-*`
  - `amis-debugger` → `nop-debugger`
  - `amis-testing` → `flux-testing`
- **Renamed architecture docs**:
  - `docs/architecture/amis-core.md` → `docs/architecture/flux-core.md`
  - `docs/architecture/amis-runtime-module-boundaries.md` → `docs/architecture/flux-runtime-module-boundaries.md`
- **Renamed window globals**:
  - `__NOP_AMIS_DEBUGGER__` → `__NOP_FLUX_DEBUGGER__`
  - `__NOP_AMIS_DEBUGGER_API__` → `__NOP_FLUX_DEBUGGER_API__`
  - `__NOP_AMIS_DEBUGGER_HUB__` → `__NOP_FLUX_DEBUGGER_HUB__`
- **Updated tsconfig.json references**:
  - `packages/flux-renderers-form/tsconfig.json`: `../amis-react/` → `../flux-react/`
  - `packages/flux-renderers-data/tsconfig.json`: `../amis-react/` → `../flux-react/`
- **Note**: `docs/amis-types/`, `docs/amis-ref/`, `docs/analysis/amis-vs-refactor1-architecture-comparison.md`, and historical plan docs retain AMIS naming because they reference the upstream AMIS project, not our internal packages.

### 2026-03-25 (AMIS TypeScript Type Definitions)

- **Created `docs/amis-types/`**: 精简的 TypeScript 类型定义，从 JSON Schema 转换而来
- **文件结构**:
  - `common.d.ts` - 基础类型 (BaseSchema, FormBaseControl, Option, SchemaApi 等)
  - `page.d.ts` - PageSchema 页面组件
  - `form.d.ts` - FormSchema 表单组件
  - `form-controls.d.ts` - 表单控件 (Text, Number, Select, Checkbox, Date 等)
  - `form-advanced.d.ts` - 高级表单控件 (Combo, Transfer, Tree, File, Image, Editor 等)
  - `button.d.ts` - 按钮组件 (Button, ButtonGroup, DropdownButton)
  - `table.d.ts` - 表格组件 (Table, CRUD)
  - `display.d.ts` - 展示组件 (Image, Video, Chart, Progress, Status 等)
  - `data.d.ts` - 数据组件 (List, Cards, Nav, Service 等)
  - `feedback.d.ts` - 反馈组件 (Dialog, Drawer, Alert, Spinner 等)
  - `tabs.d.ts` - 标签/折叠/步骤组件 (Tabs, Collapse, Steps, Wizard)
  - `layout.d.ts` - 布局组件 (Tpl, Container, Panel, Flex 等)
  - `index.ts` - 统一导出，包含 `AmisSchema` 联合类型和 `AmisSchemaByType` 类型映射
- **类型映射规则**:
  - JSON Schema `type: "string"` → `string`
  - JSON Schema `type: "number"` → `number`
  - JSON Schema `type: "boolean"` → `boolean`
  - JSON Schema `enum: [...]` → 联合类型
  - JSON Schema `allOf` → 交叉类型 `&`
  - JSON Schema `anyOf` → 联合类型 `|`
- **用途**: 为 flow-designer2 组件提供类型安全

### 2026-03-25 (AMIS Schema Reference v3)

- **AMIS JSON Schema Reference**: Split `docs/amis-ref/` with grouped definitions
- **Source**: Extracted from `amis@6.13.0` unified schema.json (301 definitions)
- **Structure**: 15 grouped definition files + 152 component files
  - Grouped files: `base.json`, `actions.json`, `api.json`, `expressions.json`, `events.json`, `form-base.json`, etc.
  - Component files: thin files that `$ref` to grouped definitions
- **Improvement**: Component files now ~100 lines instead of 30,000+ lines
- **Script**: `scripts/split_amis_schema_v3.py` - groups definitions by category
- **Index**: `docs/amis-ref/index.md` - explains file structure and reference relationships
- **Key files**:
  - `form.json` (114 lines) → refs `FormSchemaBase`, `ActionSchema`, `SchemaCollection`
  - `button.json` (small) → refs `ActionSchema` in `actions.json`

### 2026-03-25 (Styling System Design)

- Added `docs/architecture/styling-system.md` documenting the TailwindCSS-first styling approach:
  - Semantic props (`direction`, `gap`, `align`) as sugar for Tailwind classes
  - Two authoring modes: semantic props (visual editor users) vs raw className (developers)
  - Recommended `stylePresets` mechanism for reusable style definitions at page level
- **Current implementation analysis** (`packages/flux-renderers-basic/src/index.tsx`):
  - `ContainerSchema` has `direction`, `wrap`, `align`, `gap` semantic props
  - Props correctly convert to Tailwind classes (`flex-row`, `flex-col`, `flex-wrap`, `items-*`)
  - **Issue found**: `gap` uses inline `style.gap` instead of Tailwind `gap-*` classes
- **Key decision**: Keep both semantic props and raw className as valid authoring modes; semantic props convert to Tailwind internally
- **Next step**: Convert `gap` from inline style to Tailwind gap tokens, consider adding `stylePresets` support

### 2026-03-25 (classAliases Implementation)

- **Implemented `classAliases` mechanism** for reusable Tailwind class definitions:
  - Added `classAliases?: Record<string, string>` to `BaseSchema` in `flux-core`
  - Created `resolveClassAliases()` and `mergeClassAliases()` functions in `flux-core/src/class-aliases.ts`
  - Added `ClassAliasesContext` in `flux-react` for inheritance
  - Integrated alias resolution in `NodeRenderer` with parent-to-child inheritance
- **Naming decision**: Chose `classAliases` over `styles` or `stylePresets` because:
  - Accurately expresses "short name → long name" mapping
  - Avoids confusion with inline styles (`{color: red}`)
  - AI-friendly: `alias` is a common programming concept
  - Pairs naturally with `className`
- **Features**:
  - Nested alias expansion: `btn-primary` can reference `btn`
  - Scope inheritance: child components inherit parent aliases
  - Child override: local aliases override parent with same name
- **Files**: `packages/flux-core/src/class-aliases.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/index.tsx`
- **Tests**: Added coverage for single/multiple/nested aliases, inheritance, and override

### 2026-03-25 (TailwindCSS é›†æˆ)

- **æ–°å¢žåŒ…**ï¼š`packages/tailwind-preset/`
  - ä¸Ž `nop-chaos-next` å®Œå…¨ä¸€è‡´çš„ TailwindCSS preset
  - ç›¸åŒçš„ CSS å˜é‡å®šä¹‰ï¼ˆstyles.cssï¼‰
  - ç›¸åŒçš„ base.css å’Œ tailwind.css å…¥å£
- **é…ç½®æ–‡ä»¶**ï¼š
  - `tailwind.config.ts` - æ ¹ TailwindCSS é…ç½®
  - `postcss.config.cjs` - PostCSS é…ç½®
- **Flow Designer æ ·å¼**ï¼š
  - `packages/flow-designer-renderers/src/styles/` ç›®å½•
  - `flow-designer.css` - TailwindCSS ç‰ˆ Flow Designer æ ·å¼
- **æ–‡æ¡£æ›´æ–°**ï¼š
  - `config-schema.md` æ–°å¢žç¬¬ 18 ç«  TailwindCSS é›†æˆ
  - `workflow-designer/config.json` ç¤ºä¾‹ä½¿ç”¨ TailwindCSS ç±»
- **Token ä¸€è‡´æ€§**ï¼š
  - CSS å˜é‡ä¸Ž `nop-chaos-next` å®Œå…¨ä¸€è‡´
  - æ”¯æŒ classic/glass ä¸»é¢˜ã€light/dark æ¨¡å¼
  - å“åº”å¼æ–­ç‚¹ï¼šsm(640)ã€md(768)ã€lg(1024)ã€xl(1280)ã€2xl(1536)
- **ä¸‹ä¸€æ­¥**ï¼š
  - å®‰è£…ä¾èµ–ï¼š`pnpm install`
  - è¿ç§»çŽ°æœ‰ç»„ä»¶åˆ° TailwindCSS ç±»
  - éªŒè¯å“åº”å¼å¸ƒå±€

### 2026-03-25 (AMIS JSON çº¦å®šæ–‡æ¡£æ•´ç†)

- **é—®é¢˜æ¾„æ¸…**ï¼š
  - `DesignerFeatures.grid?: boolean` æ˜¯**åŠŸèƒ½å¼€å…³**ï¼Œä¸æ˜¯å¿«æ·é”®
  - `ShortcutsConfig.undo: string[]` æ˜¯**å¿«æ·é”®é…ç½®**ï¼Œå·²ç»æ˜¯ `string[]` æ ¼å¼
  - ä¸¤è€…èŒè´£ä¸åŒï¼Œæ²¡æœ‰ä¸ä¸€è‡´
- **æ–‡æ¡£å†—ä½™æ¸…ç†**ï¼š
  - `config-schema.md` åˆ é™¤ Icon å‘½åè§„èŒƒè¯¦ç»†å†…å®¹ï¼Œæ”¹ä¸ºå¼•ç”¨ `amis-json-conventions.md`
  - ä¿®æ­£ "æ–¹å¼äºŒ" ç¤ºä¾‹ï¼š`disabledOn` â†’ `disabled`ï¼Œ`level` â†’ `variant`
- **index.md æ›´æ–°**ï¼š
  - æ·»åŠ  `amis-json-conventions.md` ç´¢å¼•æ¡ç›®
  - æ·»åŠ  `complex-component-design-process.md` ç´¢å¼•æ¡ç›®
- **çº¦å®šç¡®è®¤**ï¼ˆå·²åœ¨ `amis-json-conventions.md`ï¼‰ï¼š
  - è¡¨è¾¾å¼ï¼š`${xxx}` æ—  `xxxOn` åŽç¼€
  - ç®€å• actionï¼š`{ "action": "designer:save" }`
  - Button ç”¨ `variant`ï¼ŒBadge ç”¨ `level`
  - Icon é…ç½®ç”¨ kebab-case

### 2026-03-25 (External Example Files & Icon Naming)

- Moved long JSON examples from `config-schema.md` to external files:
  - `docs/examples/workflow-designer/config.json` - DesignerConfig
  - `docs/examples/workflow-designer/document.json` - GraphDocument
- Document now references external files instead of inline JSON
- **Naming convention decisions**:
  - JSON keys: **camelCase** (consistent with TypeScript types and AMIS style)
    - `allowSelfLoop`, `gridSize`, `snapToGrid`, `fitView`
  - Icon names: **kebab-case** (string values, converts to PascalCase at runtime)
    - `rotate-ccw` â†’ `RotateCcw`
    - `git-branch` â†’ `GitBranch`
- Rationale: camelCase for keys matches TS interfaces, kebab-case for icons matches Lucide docs
- Added icon mapping table to config-schema.md

### 2026-03-25 (Toolbar & Shortcuts Configuration)

- Added `ToolbarConfig` and `ShortcutsConfig` types to `types.ts`
- Toolbar supports two modes:
  - Predefined items: `{ type: 'button', action: 'designer:undo', ... }`
  - Full AMIS schema: arbitrary renderer composition
- Shortcuts configurable per action with multiple key bindings
- Default toolbar and shortcuts provided when not configured
- Updated `config-schema.md` with complete workflow designer example based on nop-chaos-next flow editor
- Verified JSON schema can fully describe existing implementation:
  - 6 node types: start, end, task, condition, parallel, loop
  - Node body rendered via AMIS schema (flex + icon + tpl)
  - Edge with condition label and line style
  - Palette groups: basic, logic, execution
  - Full toolbar with back/title/badge/buttons/spacer

### 2026-03-25 (Complex Component Design Process & Flow Designer Schema Refinement)

- Created design process document: `docs/references/complex-component-design-process.md`
  - Defines standard workflow: Domain Analysis â†’ JSON Schema â†’ Compiled Config â†’ Runtime â†’ CSS
  - AMIS JSON is the core DSL, should be designed first before implementation
  - Emphasizes reuse of AMIS runtime capabilities
  - Applicable to all complex components (Flow Designer, Report Designer, etc.)
- Updated Flow Designer JSON Schema: `docs/architecture/flow-designer/config-schema.md`
  - Added `body: SchemaInput` to `NodeTypeConfig` - node component rendered via AMIS schema
  - Added `body?: SchemaInput` to `EdgeTypeConfig` - edge label rendered via AMIS schema
  - Removed deprecated `renderer.type/variant` and `NodeAppearanceConfig`
  - Added detailed examples for simple/complex/custom node components
  - Added node scope documentation (`id`, `type`, `data`, `position`, `selected`)
  - Added edge examples with labels and condition branches
- Updated `packages/flow-designer-core/src/types.ts` to match new schema
- Key design insight: Node components are AMIS schema fragments, not special renderer types
  - Can use `flex`, `container`, `tpl`, `icon`, `each`, etc. to compose nodes
  - Custom nodes just register normal AMIS renderer and reference by type
  - CSS is independent with `--fd-*` variables mapping to `--na-*` theme tokens

### 2026-03-25 (Flow Canvas Architecture Simplification)

- Refactored flow-designer playground to follow nop-chaos-next prototype pattern
- Created new simplified architecture with clear separation:
  - `useFlowCanvasStore.ts` - Pure logic hook, manages internal state with React Flow's native `applyNodeChanges`/`applyEdgeChanges`
  - `FlowCanvas.tsx` - Pure render component, receives store, no business logic
  - `flowNodeTypes.tsx` - Node/edge type definitions, separated from render code
  - `FlowDesignerExample.tsx` - Composition layer, uses store, handles shortcuts
- Key design decisions:
  - Internal state management only - external receives updates only on save/export
  - Direct React Flow state binding, no intermediate bridge layer
  - JS logic separated from render code in dedicated files
  - Built-in undo/redo history with dirty tracking
- Added `@xyflow/react` dependency directly to playground package
- Files: `apps/playground/src/flow-designer/useFlowCanvasStore.ts`, `FlowCanvas.tsx`, `flowNodeTypes.tsx`, `FlowDesignerExample.tsx`
- Ref: `c:/can/nop/nop-chaos-next-wt/nop-chaos-next-master/apps/main/src/pages/flow-editor/[id]/`

### 2026-03-25 (Report Designer Migration Complete)

- Added migration execution plan and acceptance record: `docs/plans/14-report-designer-to-flow-designer2-migration-plan.md`
- Migrated four packages from `report-designer` into `flow-designer2`:
  - `@nop-chaos/spreadsheet-core`
  - `@nop-chaos/spreadsheet-renderers`
  - `@nop-chaos/report-designer-core`
  - `@nop-chaos/report-designer-renderers`
- Integrated workspace configuration for new packages:
  - root project references (`tsconfig.json`)
  - path aliases (`tsconfig.base.json`)
  - Vite workspace aliases (`vite.workspace-alias.ts`)
- Fixed migration/runtime/test issues found during validation:
  - removed copied package-local `node_modules` to resolve React multi-instance `invalid hook call`
  - aligned `canvas-bridge` tests/mocks to current bridge callback behavior
  - added namespace providers in report/spreadsheet page renderers so namespaced actions dispatch correctly under action-scope runtime
- Acceptance result: package-by-package automated test sweep completed with final marker `ALL_TESTS_PASSED`
- Key decision: enforce runtime compatibility at the `ActionScope` namespace-provider layer instead of restoring legacy dispatch assumptions

### 2026-03-25 (React Flow v12 Canvas Fix)

- Fixed flow-designer playground not displaying nodes and edges
- Root cause 1: `DesignerXyflowCanvasBridge` used `viewport` prop on ReactFlow which doesn't exist in `@xyflow/react` v12. Changed to `defaultViewport` + `fitView`.
- Root cause 2: `.fd-xyflow-live` CSS used `display: grid` with padding, breaking the height chain for React Flow container. Changed to `display: flex; flex-direction: column` so `.fd-xyflow-live__surface` can properly fill available space via `flex: 1; min-height: 0`.
- Root cause 3: Missing `@xyflow/react/dist/style.css` import causing React Flow to not render properly. Added import to `canvas-bridge.tsx`.
- Root cause 4: Missing CSS styles for `.fd-xyflow-node` custom node component. Added styles to `apps/playground/src/styles.css`.
- Files changed: `packages/flow-designer-renderers/src/canvas-bridge.tsx`, `apps/playground/src/styles.css`
- Key decision: use `defaultViewport` (one-time initial viewport) instead of controlled `viewport` prop, letting React Flow manage its own viewport internally while syncing via `onMove` callback.
- Ref: `docs/architecture/flow-designer/canvas-adapters.md`

### 2026-03-24 (Flow Editor Parity Phase 1)

- Switched playground FlowDesignerExample to use xyflow adapter as the primary canvas renderer
- Added MiniMap and Controls to xyflow adapter (`canvas-bridge.tsx`)
- Added palette drag-drop support node creation (infrastructure exists, not wired)
 in the playground)
- Updated parity plan `docs/plans/13-flow-editor-parity-gap-analysis-and-migration-plan.md` with implementation status sections:
- Key decision: use xyflow adapter as the primary parity target instead of custom card canvas, keeping core package-focused
 and renderers package
- Next step: implement hover toolbars (Phase 3) and complete palette drag-drop (Phase 2.3)

### 2026-03-24 (Phase 4 & 6 Complete)

- Enhanced FlowDesignerInspector with type-specific editing (Phase 4.1):
  - Added NodeTypeBadge component to display node type with icon
  - Added NodeSpecificFields component for type-specific editors:
    - condition: condition expression textarea
    - loop: collection expression and variable name inputs
    - parallel: branch count input
    - task: service name input
  - Added description field for all nodes
- Added edge condition and style editing (Phase 4.2):
  - Added condition input field for edges
  - Added line style selector (solid/dashed/dotted)
- Added responsive inspector/mobile-sheet behavior (Phase 4.3):
  - CSS media query positions inspector as bottom sheet on mobile
  - max-height: 50vh to avoid covering entire screen
- Created FlowListPage component (Phase 6):
  - Flow list table with name, description, status, updated columns
  - Search and status filter functionality
  - CRUD actions: create, edit, duplicate, delete, toggle status
- Files: `apps/playground/src/flow-designer/FlowDesignerInspector.tsx`, `FlowListPage.tsx`, `styles.css`
- Key decision: use CSS media query for responsive behavior instead of JS detection
- Next step: all phases complete, ready for final verification and cleanup

### 2026-03-24 (Phase 5 Complete)

- Implemented keyboard shortcuts (Phase 5.1):
  - Ctrl+Z: Undo
  - Ctrl+Y or Ctrl+Shift+Z: Redo
  - Ctrl+S: Save
  - Ctrl+C: Copy selected node
  - Ctrl+V: Paste clipboard
  - Ctrl+D: Duplicate selected node
  - Delete/Backspace: Delete selected node or edge
  - Escape: Clear selection
- Added leave guard for dirty state (Phase 5.2):
  - beforeunload event listener shows confirmation when there are unsaved changes
  - Uses core.isDirty() to check if document has been modified
- Copy/paste UX already covered by keyboard shortcuts (Phase 5.3)
- Files: `apps/playground/src/FlowDesignerExample.tsx`
- Key decision: use window-level keyboard event listener instead of component-level to catch all shortcuts
- Next step: consider additional keyboard shortcuts or mobile touch gestures if needed

### 2026-03-24 (Phase 2.3, 3.1, 3.2 Complete)

- Implemented palette drag-drop for node creation:
  - Added `draggable` and `onDragStart` to palette items
  - Added `onDrop` and `onDragOver` to canvas
  - Nodes can now be dragged from palette to canvas
- Added hover toolbar for nodes and edges:
  - Created `FlowDesignerHoverToolbar.tsx` component
  - Added `onNodeHover` and `onEdgeHover` callbacks to canvas
  - Toolbar appears on hover with edit/duplicate/delete actions
- Connected double-click handlers:
  - xyflow adapter already had `onNodeDoubleClick` and `onEdgeDoubleClick` wired
  - Playground now uses these to open property editing via inspector
- Files: `apps/playground/src/flow-designer/FlowDesignerPalette.tsx`, `FlowDesignerCanvas.tsx`, `FlowDesignerHoverToolbar.tsx`, `FlowDesignerExample.tsx`
- Key decision: use HTML5 drag-drop API for palette, and custom hover state for toolbar
- Next step: implement keyboard shortcuts and leave guard (Phase 5)

### 2026-03-24 (FlowDesignerExample Refactoring)

- Refactored `apps/playground/src/FlowDesignerExample.tsx` (572 lines) into smaller focused components:
  - `apps/playground/src/flow-designer/FlowDesignerToolbar.tsx` - toolbar with undo/redo/save/restore/export
  - `apps/playground/src/flow-designer/FlowDesignerPalette.tsx` - node palette with grouping and search
  - `apps/playground/src/flow-designer/FlowDesignerCanvas.tsx` - custom SVG canvas with nodes/edges
  - `apps/playground/src/flow-designer/FlowDesignerInspector.tsx` - property editor for nodes/edges
  - `apps/playground/src/flow-designer/FlowDesignerToast.tsx` - toast notification component
  - `apps/playground/src/flow-designer/index.ts` - barrel export
- Kept original file as `.bak` backup, rewrote as ~220 line orchestrator
- Cleaned up unused imports in `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- Updated test mock to include `MiniMap` and `Controls` components
- Key decision: each UI concern is now a separate component with clear props interface
- Next step: implement palette drag-drop and hover toolbars with the refactored structure

### 2026-03-24 (Flow Editor Parity Planning)

- Added `docs/plans/13-flow-editor-parity-gap-analysis-and-migration-plan.md` to lock the real target for the playground Flow Designer against `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\docs\03-flow-editor.md`, the legacy `flow-editor` page components, and `tests/e2e/flow-editor.spec.ts`.
- The new plan separates parity work into concrete capability buckets: list shell, xyflow canvas baseline, grouped drag-drop palette, node/edge hover toolbars, schema-driven inspector parity, productivity features, and leave-guard behavior.
- Key decision: treat `apps/playground/src/FlowDesignerExample.tsx` as a temporary integration harness rather than the final place where core editor behavior lives; parity-critical behavior should migrate into `@nop-chaos/flow-designer-core` and `@nop-chaos/flow-designer-renderers` so the final showcase is configuration-driven instead of another hardcoded page.
- Next step: implement the first parity slice by making the main showcase explicitly `xyflow`-first, with grouped palette drag-drop, visible minimap/controls, and reusable hover-toolbar behavior.

### 2026-03-24 (Theme Compatibility Slice)

- Added `docs/architecture/theme-compatibility.md` to define the active styling contract for host theming: `.na-theme-root` is the shared subtree theme scope, `.fd-theme-root` is the Flow Designer specialization layer, and theme compatibility stays a CSS-variable contract instead of a runtime/provider concern.
- Updated `docs/index.md` and `docs/references/maintenance-checklist.md` so future renderer, debugger, dialog, and playground styling work now points to the new theme-compatibility doc explicitly.
- Applied the first `.na-theme-root` migration slice across `apps/playground/src/App.tsx`, `packages/flux-react/src/index.tsx`, `packages/amis-debugger/src/panel.tsx`, `packages/flow-designer-renderers/src/index.tsx`, `packages/flow-designer-renderers/src/canvas-bridge.tsx`, and `packages/flow-designer-renderers/src/styles.css`, keeping current colors as token defaults while moving package-owned Flow Designer chrome toward class-based CSS.
- Added consistent return navigation from each playground detail page back to the home chooser: inline back buttons for `apps/playground/src/pages/AmisBasicPage.tsx` and `apps/playground/src/pages/DebuggerLabPage.tsx`, plus a floating back button wrapper for `apps/playground/src/pages/FlowDesignerPage.tsx` so the designer canvas stays intact.
- Continued the same migration in `apps/playground/src/FlowDesignerExample.tsx` and `apps/playground/src/styles.css`, replacing most remaining demo-only visual inline styles with class-based toolbar, palette, canvas, inspector, JSON, and toast styling while keeping position geometry inline.
- Key decision: do not add theme state to `RendererEnv`, `ActionScope`, `ScopeRef`, page/form runtime, or `DesignerCore`; host theming remains a DOM/CSS responsibility carried by stable classes and variables.
- Next step: manually spot-check the standalone Flow Designer and debugger pages to confirm the class-based migration still matches the previous appearance across desktop and narrow-width layouts.

### 2026-03-24 (Debugger Launcher Fixes)

- Fixed debugger launcher drag/click interaction issues:
  - Changed from return-value-based detection to ref-based `wasDraggedRef` tracking
  - Launcher now correctly distinguishes click (opens panel) from drag (repositions)
  - Moved active drag lifecycle onto window-level `pointermove` / `pointerup` / `pointercancel` listeners so releasing the mouse always ends drag even if the element loses the local event sequence
  - Added a `buttons === 0` fallback in move handlers so stuck drag state clears immediately if the browser misses `pointerup`
- Reduced launcher size to a compact pill shape:
  - Smaller padding (`8px 12px`), rounded (`border-radius: 20px`)
  - Added warning icon + event count display instead of verbose text
  - Added `touch-action: none` and `user-select: none` for reliable dragging
- Changed Minimize button to use a shrink icon instead of text label
- Limited panel dragging to the title handle instead of the full header so `Pause`, `Clear`, and `Minimize` clicks are no longer intercepted by drag start
- Files: `packages/amis-debugger/src/panel.tsx`
- Added focused panel interaction coverage in `packages/amis-debugger/src/panel.test.tsx` for overview rendering, launcher click-open, and minimize click behavior
- Key decision: use window-level pointer cleanup plus a dedicated title drag handle instead of relying on pointer capture alone, because the original element-scoped flow was too fragile across real browser interaction sequences
- Next step: verify manually in the playground that launcher drag feels smooth on Windows pointer devices and touchpads

### 2026-03-24

- Implemented the playground refactor and debugger UX improvements described in `docs/architecture/playground-experience.md`:
  - Split `apps/playground/src/App.tsx` into a navigation home page and separate test pages (`AmisBasicPage`, `FlowDesignerPage`, `DebuggerLabPage`)
  - Changed default debugger config to launcher mode (`defaultOpen: false`)
  - Changed debugger button from "Hide" to "Minimize" for clearer semantics
  - Made debugger launcher draggable with shared position state between launcher and panel
- Added navigation styles to `apps/playground/src/styles.css` for the home page cards
- Updated `apps/playground/src/App.test.tsx` to test `AmisBasicPage` directly instead of the old monolithic `App`
- Key decision: use simple state-based routing instead of URL routing for now, since the playground is a dev tool and URL stability is not critical
- Next step: if playground grows more test pages, consider adding URL-based routing for shareable deep links

### 2026-03-23

- Added `docs/architecture/playground-experience.md` to capture the proposed playground refactor and debugger UX direction: the playground should become a navigation hub with large entry buttons for focused test pages, and `@nop-chaos/amis-debugger` should default to a draggable left-bottom launcher that expands into a full panel and can minimize back without occupying the main workspace.
- Updated `docs/index.md`, `docs/references/maintenance-checklist.md`, and `docs/architecture/frontend-baseline.md` so future playground or debugger UX work points to the new active design doc instead of burying those decisions only in chat or old analysis notes.
- Key decision: treat playground information architecture and debugger interaction model as active architecture guidance, not just one-off implementation preferences, because both directly shape how future examples and diagnostics are introduced across the repo.
- Next step: implement the playground home-page split and debugger launcher/panel three-state behavior against this new doc, then record any deviations discovered during implementation.

- Added a compact â€œRegion capability matrixâ€ to `docs/architecture/flow-designer/runtime-snapshot.md` and linked it from `docs/architecture/flow-designer/collaboration.md`, so the current tested contract for mounted regions and shared dialog popups is visible in one place instead of being scattered across paragraphs.
- Key decision: put the matrix in `runtime-snapshot.md` rather than `design.md`, because it describes current verified behavior rather than long-term target architecture.
- Next step: if playground starts demonstrating `dialogs` region UX patterns, extend the matrix with a short â€œintended UI roleâ€ column without mixing that into the runtime contract itself.

- Added an explicit inspector read-path regression in `packages/flow-designer-renderers/src/index.test.tsx` proving inspector fragments can read injected designer host scope values such as `${activeNode.data.label}`, completing the read-path matrix for toolbar, inspector, and dialogs regions.
- Updated `docs/architecture/flow-designer/collaboration.md` and `docs/architecture/flow-designer/runtime-snapshot.md` so they now describe the full tested region matrix more accurately: all three mounted regions can read injected designer snapshot fields, while write-path coverage remains explicit for the regions/actions already exercised by tests.
- Key decision: make the region guarantees explicit as a matrix instead of scattering one-off examples, because once all three region mounts exist the useful contract is symmetry, not individual anecdotes.
- Next step: if we want a stricter guarantee, add a small table to the Flow Designer docs that lists each region and whether read/write/dialog-popup inheritance is covered by regression tests.

- Added a dialogs read-path regression in `packages/flow-designer-renderers/src/index.test.tsx` proving mounted `dialogs` fragments can read injected designer host scope values such as `${activeNode.data.label}`, so the read/write symmetry now covers toolbar, inspector, and dialogs regions.
- Updated `docs/architecture/flow-designer/collaboration.md` and `docs/architecture/flow-designer/runtime-snapshot.md` to reflect that dialogs fragments now have explicit regression coverage for both action dispatch and expression reads.
- Key decision: lock dialogs read-path behavior immediately after locking its write-path, because the host-scope contract is only really trustworthy when both sides are tested together.
- Next step: if we introduce a designer-specific overlay model for dialogs, keep these scope guarantees and add layout-specific tests on top rather than replacing them.

- Added one more symmetric renderer regression in `packages/flow-designer-renderers/src/index.test.tsx` proving the mounted `dialogs` region is not just visible but also writable through the same namespaced action path: a button inside `dialogs` can dispatch `designer:addNode` and mutate the canvas just like toolbar and inspector fragments.
- Updated `docs/architecture/flow-designer/collaboration.md` to state that toolbar, inspector, mounted dialogs fragments, and shared dialog-action popups are all now covered by explicit renderer regressions for the designer action-scope path.
- Key decision: lock the `dialogs` region write path immediately after introducing the region mount, so the three region entry points stay behaviorally symmetric and future refactors cannot accidentally regress only one of them.
- Next step: if `dialogs` grows a more opinionated overlay role, add separate tests for visibility/positioning semantics without weakening this shared action-path guarantee.

- Implemented a real `dialogs` region mount in `packages/flow-designer-renderers/src/index.tsx`, so `designer-page` now renders `dialogs` fragments through the same injected host `scope` and `actionScope` path as `toolbar` and `inspector`.
- Replaced the earlier negative regression in `packages/flow-designer-renderers/src/index.test.tsx` with a positive one that proves `designer-page.dialogs` content now renders, and updated `docs/architecture/flow-designer/api.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/collaboration.md`, and `docs/architecture/flow-designer/runtime-snapshot.md` to reflect that `dialogs` is now a live region mount while shared `dialog` actions still remain a separate popup path.
- Key decision: keep both concepts explicitly documented â€” mounted `dialogs` region vs shared `dialog` action runtime â€” because they now coexist and solve different authoring needs.
- Next step: decide whether `dialogs` should stay as a lightweight always-mounted fragment area or evolve into a more opinionated designer-specific overlay shell.

- Added a renderer regression in `packages/flow-designer-renderers/src/index.test.tsx` locking the current reserved-`dialogs` behavior: passing `designer-page.dialogs` schema does not mount visible content by default, which now matches the updated docs that describe `dialogs` as a declared-but-not-mounted region path.
- Updated `docs/architecture/flow-designer/config-schema.md` and `docs/architecture/flow-designer/collaboration.md` to reference that locked behavior explicitly, so future work can intentionally flip both tests and docs together if a true dialogs mount path is added.
- Key decision: prefer an explicit regression for the current non-mounted `dialogs` behavior rather than only documenting it, because this is exactly the kind of schema-shape-vs-runtime-behavior mismatch that can silently drift again during refactors.
- Next step: if `DesignerPageRenderer` later gains a real dialogs mount, replace this regression with a positive rendering test and update the corresponding docs in the same change.

- Clarified `dialogs` semantics across `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/collaboration.md`, and `docs/architecture/flow-designer/runtime-snapshot.md`: the schema field and renderer region key exist today, but `DesignerPageRenderer` still only mounts toolbar/inspector directly, while real dialog behavior comes from shared `dialog` actions inheriting the same designer action scope.
- Key decision: stop describing `dialogs` as if it were already a first-class always-mounted Flow Designer region, because that blurs the line between declared schema shape and the current live renderer shell.
- Next step: either add a true `dialogs` mount path inside `DesignerPageRenderer` or keep the field explicitly documented as reserved until a designer-specific dialog-host use case appears.

- Added another Flow Designer regression in `packages/flow-designer-renderers/src/index.test.tsx` proving dialogs opened from schema toolbar content still inherit the same designer action path, so a button inside the shared dialog runtime can dispatch `designer:addNode` successfully.
- Updated `docs/architecture/flow-designer/api.md` and `docs/architecture/flow-designer/design.md` so they now describe the live host wiring more precisely: toolbar/inspector regions explicitly receive host `scope` + `actionScope`, while dialogs inherit the same action boundary through the shared dialog runtime.
- Key decision: document dialogs as part of the same effective `designer:*` dispatch chain even though they are not mounted through a permanent `dialogs` region render today, because what matters for authoring is the inherited action-scope behavior, not the shell implementation detail.
- Next step: decide whether `designer-page` should start rendering a dedicated `dialogs` region itself or whether that schema key should remain declarative-only until there is a concrete designer-specific dialog host use case.

- Tightened `packages/flow-designer-renderers/src/index.tsx` so `designer-page` now passes both the injected designer host `scope` and the current `actionScope` explicitly into toolbar / inspector region renders, then added `packages/flow-designer-renderers/src/index.test.tsx` coverage proving schema-driven inspector fragments can dispatch `designer:*` actions through the same boundary as toolbar fragments.
- Updated `docs/architecture/flow-designer/collaboration.md` to call out that this region wiring is now both context-inherited and explicitly forwarded, reducing the chance of future render-path refactors accidentally dropping the designer namespace boundary.
- Key decision: keep the explicit `actionScope` handoff even though current context inheritance already works, because Flow Designer region rendering is a host integration seam where being explicit is safer than depending on incidental placement inside the same React tree.
- Next step: align `api.md` / `design.md` wording so toolbar and inspector docs describe the now-explicit host scope plus action-scope forwarding path consistently.

- Fixed namespaced action payload compatibility in `packages/flux-runtime/src/action-runtime.ts` so runtime dispatch now falls back to evaluating non-reserved top-level action fields when `args` is omitted, which makes existing Flow Designer schema actions like `{ action: 'designer:addNode', nodeType: 'task', position: ... }` actually reach namespace providers with the intended payload.
- Added regression coverage in `packages/flux-runtime/src/index.test.ts` and re-ran `pnpm --filter @nop-chaos/flux-runtime test` plus `pnpm --filter @nop-chaos/flow-designer-renderers test` to prove both the generic runtime path and the Flow Designer toolbar-region path now pass.
- Updated `docs/architecture/action-scope-and-imports.md` to document the compatibility rule: `args` remains the preferred structured shape, but top-level non-reserved fields are still accepted as payload for namespaced actions.
- Key decision: preserve top-level payload compatibility in the dispatcher instead of forcing every existing namespaced action schema to migrate to `args` immediately, because current docs and tests already show both authoring styles in the repo.
- Next step: align the remaining Flow Designer API examples toward one preferred authoring shape while keeping runtime support for both forms.

- Added renderer-level tests in `packages/flow-designer-renderers/src/index.test.tsx` that lock two current Flow Designer behaviors: schema toolbar props can render via generic basic renderers but still do not make `designer:*` mutations effective in that path, and schema expressions still do not receive injected designer snapshot variables such as `activeNode` by default.
- Key decision: test the current limitation explicitly so future work on real host-scope injection or region wiring can intentionally flip these assertions instead of silently changing behavior.
- Next step: when `designer-page` starts creating a real child scope or rendering toolbar/inspector through compiled regions, update these tests to assert the new effective action path and snapshot-variable visibility.

- Refined `docs/architecture/flow-designer/design.md` so the bridge, inspector, and fixed-host-scope sections now explicitly label host scope as target architecture and point current-state readers to `docs/architecture/flow-designer/runtime-snapshot.md` for the live snapshot truth.
- Key decision: keep `design.md` aspirational where appropriate, but always add an explicit pointer when the live implementation has not yet caught up to the target host-scope model.
- Next step: if host scope injection is implemented in code, remove the current-state caveats from `design.md` only after `runtime-snapshot.md` confirms the new scope fields are actually wired.

- Refined `docs/architecture/flow-designer/api.md` so its host-scope section now points to `docs/architecture/flow-designer/runtime-snapshot.md` and `docs/architecture/flow-designer/collaboration.md` instead of restating a mixed current-state/target-state scope contract.
- Key decision: keep `api.md` focused on integration-facing surfaces and move snapshot-truth caveats into the dedicated runtime-snapshot doc, so the same contract is not duplicated with drifting wording.
- Next step: if Flow Designer eventually lands real schema-readable host scope injection, update `docs/architecture/flow-designer/runtime-snapshot.md` first, then decide whether `api.md` should inline a shorter stabilized subset again.

- Added `docs/architecture/flow-designer/runtime-snapshot.md` to separate the live `DesignerSnapshot` / `DesignerContextValue` contracts from the broader â€œfixed host scopeâ€ design goal, explicitly marking which snapshot fields are real today and which schema-scope projections are still aspirational.
- Updated `docs/index.md` and `docs/architecture/flow-designer/README.md` so future readers can jump straight to the new runtime-snapshot note when they need current-state answers instead of the broader design narrative.
- Key decision: document current snapshot truth separately because the code already has a stable React-facing snapshot contract, but it has not yet fully materialized the same data as schema-readable host scope variables.
- Next step: if `designer-page` later starts creating a real child scope for `doc` / `selection` / `activeNode` / `activeEdge` / `runtime`, update `docs/architecture/flow-designer/runtime-snapshot.md` first and then simplify overlapping caveats in `docs/architecture/flow-designer/api.md`.

- Extended `docs/architecture/flow-designer/collaboration.md` with a file-level call-chain diagram that links `apps/playground/src/App.tsx`, `packages/flux-react/src/index.tsx`, `packages/flow-designer-renderers/src/index.tsx`, `packages/flow-designer-renderers/src/canvas-bridge.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, and `packages/flow-designer-core/src/core.ts` into one source-reading path.
- Refreshed `docs/architecture/flow-designer/api.md` and `docs/architecture/flow-designer/README.md` to remove stale `designerActionHandlers` / root `actionHandlers` wording and replace it with the current `designer-page` + local `ActionScope` provider model; also corrected the exported renderer-definition name and the active playground entry path.
- Key decision: keep the API doc aligned to the live provider-based integration model so future readers do not mistake old `actionHandlers` examples for supported Flow Designer wiring.
- Next step: if `designer-page` later exposes a richer host snapshot contract or additional exported helpers, update `docs/architecture/flow-designer/api.md` and `docs/architecture/flow-designer/collaboration.md` together.

- Added `docs/architecture/flow-designer/collaboration.md` to explain the live collaboration boundary between `SchemaRenderer`, `designer-page`, `ActionScope`, `DesignerCommandAdapter`, `DesignerCore`, and the canvas adapters, including call-chain diagrams for mount, toolbar actions, canvas connect/reconnect, inspector updates, and dialog-confirmed mutations.
- Updated `docs/index.md`, `docs/architecture/flow-designer/README.md`, and `docs/references/maintenance-checklist.md` so future Flow Designer work now has an explicit doc entry for runtime collaboration details instead of spreading those explanations only across design, API, and adapter notes.
- Key decision: treat collaboration flow as its own maintained architecture topic because the most failure-prone behavior in Flow Designer is no longer individual APIs, but the handoff between generic runtime boundaries and graph-specific command ownership.
- Next step: if the host scope snapshot shape or `designer:*` command surface changes, refresh `docs/architecture/flow-designer/collaboration.md` first and then sync the narrower API or adapter docs.

- Added `docs/architecture/flow-designer/canvas-adapters.md` as the dedicated architecture note for `card`, `xyflow-preview`, and live `xyflow` canvas variants, including default-adapter rules, failure-intent retention, and callback translation boundaries.
- Updated `docs/index.md` and `docs/references/maintenance-checklist.md` so future canvas-adapter work has an explicit documentation entry point instead of relying only on `docs/architecture/flow-designer/api.md` and the development log.
- Refreshed `docs/architecture/flow-designer/README.md` and `docs/architecture/flow-designer/design.md` so they no longer describe real `@xyflow/react` integration as â€œnext stageâ€ work; both docs now reflect the live `xyflow` default plus the retained `card` / `xyflow-preview` adapter roles.
- Refreshed `docs/architecture/flow-designer/api.md` to remove remaining card-first / pre-xyflow wording, so the API doc now matches the current state: live `xyflow` is the default canvas, while `card` and `xyflow-preview` remain explicit adapter variants under the same bridge contract.
- Expanded `packages/flow-designer-renderers/src/canvas-bridge.tsx` so the extracted `DesignerCardCanvasBridge` contract now covers start/cancel/complete connection and reconnect flows in addition to selection, delete, move, and viewport callbacks.
- Updated `packages/flow-designer-renderers/src/index.tsx` to keep renderer-local pending connection and reconnect shell state, then map those bridge callbacks back onto adapter-backed `addEdge` and `reconnectEdge` commands.
- Hardened `packages/flow-designer-renderers/src/designer-command-adapter.ts` so reconnect dispatch reports `missing-edge` before shared validation runs, and refreshed `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` to pin the new follow-up actions (`Cancel connection`, `Connect here`, `Reconnect here`).
- Expanded `packages/flow-designer-renderers/src/index.test.tsx` with renderer-level jsdom coverage proving duplicate-edge failures raised during bridge-driven connect/reconnect completion still surface through host `env.notify('warning', ...)`.
- Added `DesignerXyflowPreviewBridge` and `canvasAdapter` selection in `packages/flow-designer-renderers/src/canvas-bridge.tsx` and `packages/flow-designer-renderers/src/index.tsx`, so `designer-page` can now swap between the card bridge and a target-side xyflow preview while reusing the same callback contract.
- Expanded `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` and `packages/flow-designer-renderers/src/index.test.tsx` to pin preview-bridge callbacks plus `designer-page` adapter switching.
- Adjusted `packages/flow-designer-renderers/src/index.tsx` so failed connect/reconnect completions keep their pending bridge intent active instead of clearing local shell state immediately after a rejected command, and extended `packages/flow-designer-renderers/src/index.test.tsx` to prove the follow-up action remains visible after duplicate-edge failures.
- Extended `packages/flow-designer-renderers/src/index.test.tsx` again so the same failure-intent rule is now pinned for `canvasAdapter: 'xyflow-preview'`; duplicate-edge failures leave preview connect/reconnect affordances active until the user retries or cancels.
- Added real `@xyflow/react` wiring to `packages/flow-designer-renderers/src/canvas-bridge.tsx` and exposed `canvasAdapter: 'xyflow'` from `packages/flow-designer-renderers/src/index.tsx`, so the target renderer can now switch from card/preview shells to a live controlled React Flow surface without changing the shared command callback contract.
- Added basic render coverage in `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` and `packages/flow-designer-renderers/src/index.test.tsx` for the new live `xyflow` adapter selection path.
- Expanded `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` with mocked `@xyflow/react` callback-translation coverage, locking how live `onConnect`, `onReconnect`, `onSelectionChange`, `onNodesChange`, `onEdgesChange`, and viewport movement map back onto the shared bridge contract.
- Switched the default `designer-page` / `designer-canvas` adapter in `packages/flow-designer-renderers/src/index.tsx` from `card` to `xyflow`, while keeping explicit `canvasAdapter: 'card'` available for parity tests and fallback usage; updated `packages/flow-designer-renderers/src/index.test.tsx` to pin the new default behavior.
- Tightened the reconnect bridge contract in `packages/flow-designer-renderers/src/canvas-bridge.tsx` and `packages/flow-designer-renderers/src/index.tsx` so live `xyflow` reconnect callbacks now pass both source and target ids instead of assuming the original source is unchanged; updated `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` and `docs/architecture/flow-designer/canvas-adapters.md` to lock the new rule.
- Added `packages/flow-designer-renderers/src/index.xyflow.test.tsx` to pin renderer-level live `xyflow` failure-intent retention: duplicate-edge failures now prove the default `xyflow` host keeps pending connect or reconnect state visible instead of clearing it after a rejected command.
- Verified the renderer package again with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: keep transient connect/reconnect intent as bridge-host UI state while all actual graph mutations still flow through the shared command adapter, so future xyflow work can reuse the same callback contract without introducing a second mutation path.
- Next step: deepen live `xyflow` regression coverage around selection changes, drag-stop movement commits, and connect/reconnect callback translation now that the dependency is wired.

- Expanded `packages/flow-designer-renderers/src/canvas-bridge.tsx` and `packages/flow-designer-renderers/src/designer-command-adapter.ts` so the extracted bridge contract now covers node movement and viewport changes in addition to selection and delete actions.
- Updated `packages/flow-designer-renderers/src/index.tsx` to bind the new `onMoveNode` and `onViewportChange` bridge callbacks back onto adapter-backed `moveNode` and `setViewport` commands.
- Added regression coverage in `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.test.ts`, and `packages/flow-designer-renderers/src/index.test.tsx` for move-node and viewport bridge/provider behavior.
- Key decision: continue extending the extracted bridge by adding explicit callback contracts first, then mapping them onto command adapter results, so future xyflow work inherits stable callback semantics instead of raw core method coupling.
- Next step: add connect/reconnect and richer viewport synchronization callbacks to the same bridge surface before introducing a target-side xyflow preview implementation.

- Added `packages/flow-designer-renderers/src/canvas-bridge.tsx` with a dedicated `DesignerCardCanvasBridge` contract so the current card canvas consumes only snapshot data plus explicit bridge callbacks for pane, node, edge, duplicate, and delete interactions.
- Rewired `packages/flow-designer-renderers/src/index.tsx` so `DesignerCanvasContent` now acts as a bridge host that binds adapter-backed commands to the extracted canvas bridge component instead of inlining the full card canvas DOM.
- Added `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` to pin the extracted bridge callback contract, and updated `docs/architecture/flow-designer/api.md` to record the bridge-facing canvas boundary.
- Key decision: keep card canvas rendering behind the same explicit bridge callback surface we want for future xyflow work, so the view layer can swap implementations without reintroducing direct graph mutation paths.
- Next step: extend the new bridge surface beyond select/delete actions so connection, reconnect, move, and viewport synchronization can migrate onto the same contract before the real xyflow adapter lands.

- Rewired `packages/flow-designer-renderers/src/index.tsx` so palette, canvas, default inspector, and `designer-field` no longer mutate `core.*` directly; all renderer-side graph writes now go through the shared command adapter dispatch path used by the provider layer.
- Kept renderer-side warning behavior aligned with provider behavior by routing adapter failures through the same notify helper, so shared semantic rejections stay host-visible regardless of whether they originate from ActionScope dispatch or direct renderer UI events.
- Expanded `packages/flow-designer-renderers/src/index.test.tsx` with provider coverage for normalized viewport return values after `setViewport`, and re-verified the package after the renderer adapter rewiring.
- Verified the renderer package again with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: renderer UI events should reuse the same target-owned command normalization layer as namespace providers, instead of creating a second â€œlocal UI shortcutâ€ mutation path that could drift from provider and future xyflow bridge semantics.
- Next step: start extracting a dedicated canvas bridge surface so future xyflow integration can dispatch adapter commands without depending on the card/list renderer implementation details.

- Added `packages/flow-designer-renderers/src/designer-command-adapter.ts` as the target-side command normalization layer, giving provider and future canvas bridges a shared result shape with `ok`, `snapshot`, `data`, `error`, `reason`, and `exported` fields.
- Rewired `packages/flow-designer-renderers/src/index.tsx` so the `designer` namespace provider now dispatches through the command adapter instead of open-coding raw core mutations, and warning notifications are emitted only for shared semantic rejections such as missing-node, self-loop, and duplicate-edge failures.
- Added regression coverage in `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` and expanded `packages/flow-designer-renderers/src/index.test.tsx` to pin adapter reconnect/viewport outcomes plus provider-level warning notification behavior.
- Verified the renderer package with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: provider and later xyflow bridge code should normalize onto one target-owned adapter surface before richer renderer migration continues, so validation visibility and command semantics do not fragment across host entry points.
- Next step: migrate direct renderer interactions that still call `core.*` inline onto the command adapter and then expand the provider surface toward fuller source parity.

- Extended `packages/flow-designer-core/src/core.ts` viewport handling so `setViewport(...)` now normalizes x/y/zoom, writes through shared document state, participates in undo/redo history, and restores normalized viewport state from undo/redo and `restore()`.
- Added viewport-parity coverage in `packages/flow-designer-core/src/core.test.ts` for normalization, history no-op suppression, dirty-state interaction, and save/restore semantics.
- Verified the target core slice with `pnpm --filter @nop-chaos/flow-designer-core test`, `pnpm --filter @nop-chaos/flow-designer-core typecheck`, `pnpm --filter @nop-chaos/flow-designer-core build`, and `pnpm --filter @nop-chaos/flow-designer-core lint`.
- Key decision: keep viewport as shared core-owned document state rather than renderer-local UI state, so later command-adapter and xyflow work can reuse the same history and dirty semantics already pinned by tests.
- Next step: introduce the target-side command adapter that normalizes provider and future canvas-bridge mutations onto the now-tested reconnect, validation, and viewport core surface.

- Extended `packages/flow-designer-core/src/core.ts` with shared edge validation and a first-class `reconnectEdge(...)` API, then pinned the behavior in `packages/flow-designer-core/src/core.test.ts` for duplicate-edge rejection, self-loop rejection, missing-node rejection, reconnect success, reconnect no-op, and reconnect failure cases.
- Key decision: target core now owns reconnect and duplicate-edge semantics directly instead of leaving them as later renderer-only concerns, so the command-adapter and real xyflow migration can build on a tested shared graph contract.
- Next step: implement viewport-history parity in target core and then start the command-adapter layer on top of the now-tested reconnect/validation surface.

- Added the first pure Flow Designer core safety-net in `packages/flow-designer-core/src/core.test.ts`, covering baseline node mutation, edge history, and save/restore/export behavior before reconnect and validation migration begins.
- Key decision: start `flow-designer2` implementation with a target-owned core test harness instead of continuing to rely on the thin provider smoke test in `packages/flow-designer-renderers/src/index.test.tsx`.
- Next step: expand the new core suite with reconnect, shared edge validation, and viewport-history parity tests as the corresponding target core upgrades land.

- Implemented first-pass `xui:imports` loading/error UX semantics across `packages/flux-runtime/src/imports.ts` and `packages/flux-react/src/index.tsx`, including placeholder providers, explicit loading failures, persisted load-error results, and render-time notify/monitor reporting.
- Updated `docs/architecture/action-scope-and-imports.md` to record the now-active runtime behavior for loading, failure, collision reporting, and refcounted release.
- Added regression coverage for loading-state dispatch errors and failed-loader diagnostics in `packages/flux-react/src/index.test.tsx`.
- Added runtime-level import-manager coverage in `packages/flux-runtime/src/index.test.ts` for same-scope refcounted release, child-scope shadowing/restoration, and deterministic alias-collision failures.
- Key decision: import lifecycle semantics are now pinned at both the React boundary layer and the runtime API layer so future refactors cannot keep dedupe/disposal behavior only as an incidental React effect detail.
- Added `xui:imports` lifecycle regression coverage in `packages/flux-react/src/index.test.tsx` for same-scope dedupe, descendant visibility, child-scope isolation, and unmount disposal/fallback behavior.
- Key decision: imported namespaces now follow the same owned mount/unmount lifecycle as host namespace providers, so scope-local import registrations are reference-counted and released when the declaring React boundary disappears.
- Added dialog lifecycle regression coverage in `packages/flux-react/src/index.test.tsx` to verify dialog-scoped namespace/handle providers are recreated on reopen and that captured dialog dispatchers fall back to outer providers after dialog close.
- Key decision: dialog reopen semantics should produce a fresh child boundary rather than reusing a prior dialog-owned dispatch path or registrations, matching the existing fresh dialog data-scope behavior.
- Added nested React regression coverage in `packages/flux-react/src/index.test.tsx` for action-scope/component-registry boundary precedence and teardown fallback behavior.
- Key decision: teardown verification should assert that a child-scoped dispatch path falls back to still-live parent providers after the child subtree unmounts, instead of keeping stale namespace/handle registrations alive.
- Next step: extend the same boundary-focused coverage to dialog reopen/unmount cases and imported namespace lifecycle once `xui:imports` gets richer loading/error semantics.
- Implemented the first action-scope, component-handle, and import-declaration runtime pass across `packages/flux-core/src/index.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-react/src/index.tsx`, and `packages/flow-designer-renderers/src/index.tsx`.
- Added explicit runtime primitives for `ActionScope`, `ComponentHandleRegistry`, `ComponentHandle`, `XuiImportSpec`, import loading, and extended monitor payloads so built-in, component-targeted, and namespaced dispatch paths are diagnosable.
- Key decision: keep dispatch order fixed as built-in -> `component:<method>` -> namespaced action, and keep form/public component invocation limited to explicit handle methods instead of exposing arbitrary store methods.
- Proved the component-target path with form handle registration and `component:<method>` syntax, including `submit`, `validate`, `reset`, and `setValue` support through `packages/flux-runtime/src/form-component-handle.ts` and React lifecycle registration in `packages/flux-react/src/index.tsx`.
- Proved the namespaced host path with Flow Designer by adding a local `designer` action provider registered from `packages/flow-designer-renderers/src/index.tsx` rather than relying on root-level handler injection.
- Added initial `xui:imports` plumbing with trusted loader hooks and scope-local namespace registration; current pass focuses on declaration handling and deduped registration, not full example adoption yet.
- Added regression coverage in `packages/flux-runtime/src/index.test.ts`, `packages/flux-react/src/index.test.tsx`, and `packages/flow-designer-renderers/src/index.test.tsx`.
- Next step: tighten import collision/loading state UX, add richer Flow Designer schema-driven command coverage, and document concrete `xui:imports` authoring examples once a first imported library example lands.

### 2026-03-22 (Action Scope And Import Design)

- Replaced the earlier lexical-method-dispatch note with a single active design doc at `docs/architecture/action-scope-and-imports.md`.
- Key decision: keep `ScopeRef` as a data scope only, and introduce a separate action-scope layer for namespaced host actions and imported library capabilities.
- Defined `xui:import` as declaration-style import semantics rather than execution-order semantics: imports are order-independent, repeatable, deduplicated by normalized import key, and visible by container-owned action scope.
- Clarified that complex hosts such as Flow Designer and future Report/Spreadsheet Designer should expose namespaced action providers on top of bridge contracts instead of pushing more domain behavior into the built-in action dispatcher or into `ScopeRef` itself.
- Expanded the same doc with component-targeted invocation rules: runtime may resolve `componentId` or `componentName` through a separate component-handle registry, and externally callable methods must be explicitly exposed through capabilities instead of implicitly falling through to store methods.
- Added the execution plan `docs/plans/12-action-scope-imports-and-component-invocation-plan.md` to stage the work across contract lock, dispatcher refactor, React host integration, form targeting, Flow Designer namespace adoption, and later `xui:import` loading.
- Updated navigation and maintenance guidance in `docs/index.md` and `docs/references/maintenance-checklist.md` so future action-scope and import changes have one canonical documentation target.
- Next step: if implementation starts, add minimal runtime contracts for action-scope resolution plus component-handle lookup, prove the model first with one host namespace such as `designer:*` and one targeted capability such as form submit before adding `xui:import` loading.

### 2026-03-22 (Superseded Design Note)

- The earlier lexical-method-dispatch draft was later superseded by `docs/architecture/action-scope-and-imports.md`.
- Key decision after review: do not turn `ScopeRef` into a general method registry; keep data scope and action scope separate.
- Historical context only: the superseded draft helped identify the need for non-built-in host action extension, but its main mechanism was intentionally replaced.

### 2026-03-22

- Created `@nop-chaos/flow-designer-core` package with pure graph runtime including:
  - `GraphDocument`, `GraphNode`, `GraphEdge`, `DesignerConfig` types
  - `createDesignerCore()` factory with node/edge CRUD, selection, undo/redo, copy/paste, save/restore/export
  - Start-node uniqueness constraint, grid toggle, dirty tracking
- Created `@nop-chaos/flow-designer-renderers` package with:
  - `designer-page`, `designer-field`, `designer-canvas`, `designer-palette` renderer definitions
  - `registerFlowDesignerRenderers()` for registry integration
- Added Flow Designer example to playground (`apps/playground/src/FlowDesignerExample.tsx`) demonstrating:
  - Six legacy node types (start, end, task, condition, parallel, loop)
  - Palette with search and expandable groups
  - Canvas with node/edge rendering, selection, quick actions
  - Inspector panel for node/edge property editing
  - Toolbar with undo/redo/save/restore/export actions
  - JSON view for document inspection
- Updated `vite.workspace-alias.ts` to include flow-designer package aliases
- Key decision: implemented a direct React component approach in the playground example rather than using SchemaRenderer, to avoid type complexity with designer-specific document/config props
- Next step: integrate `@xyflow/react` canvas adapter for richer graph interaction, add schema-driven inspector forms, implement connection validation rules

### 2026-03-21

- Added `docs/plans/11-flow-designer-playground-example-development-plan.md` to define a phased plan for a playground Flow Designer example that reimplements the practical behavior of the legacy `FlowEditor` from `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master` using the new `nop-amis` Flow Designer architecture.
- Key decision: scope parity around the real legacy editor feature set first, then use the new architecture to re-express toolbar and inspector behavior as schema/config instead of copying the old hardcoded page structure.
- Next step: turn the plan into an implementation backlog starting with core graph commands, history/dirty tracking, the xyflow bridge, and a schema-driven playground example.

- Reworked the temporary Flow Designer review note into `docs/analysis/flow-designer-documentation-review.md` and moved the accepted conclusions into the active flow-designer docs.
- Updated `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/api.md`, and `docs/architecture/flow-designer/README.md` to clarify the xyflow adapter boundary, graph/schema bridge contract, migration rules, expression scope, transaction/history expectations, event hooks, and large-graph guidance.
- Key decision: only record claims that still hold after re-reading the active design set; keep composite-node structure and patch-vs-snapshot storage as intentionally open extension areas instead of pretending they are finalized.
- Next step: if implementation starts, turn the new bridge, lifecycle hook, migration registry, and transaction notes into concrete TypeScript contracts under the future flow-designer packages.

- Finished the `@nop-chaos/amis-debugger` entry-point refactor so `packages/amis-debugger/src/controller.ts` is now the single controller implementation and `packages/amis-debugger/src/index.tsx` is a thin re-export layer.
- Added the missing controller-level exports for `installAmisDebuggerWindowFlag()` and `createAmisDiagnosticReport()` so package consumers keep the same public API after the split.
- Key decision: keep diagnostics, redaction, panel UI, types, and controller assembly in separate modules, but preserve the existing top-level package surface from `packages/amis-debugger/src/index.tsx`.
- Continued the split by extracting controller assembly dependencies into `packages/amis-debugger/src/store.ts`, `packages/amis-debugger/src/controller-helpers.ts`, `packages/amis-debugger/src/automation.ts`, and `packages/amis-debugger/src/adapters.ts`.
- Key decision: keep `controller.ts` focused on orchestration while moving event-store state, window/bootstrap helpers, environment decoration, plugin hooks, and automation hub wiring into dedicated modules.
- Added focused module tests in `packages/amis-debugger/src/store.test.ts`, `packages/amis-debugger/src/automation.test.ts`, and `packages/amis-debugger/src/adapters.test.ts` to cover store state transitions, automation delegation/window registration, and adapter-level event capture/redaction behavior.
- Key decision: keep the high-level integration coverage in `packages/amis-debugger/src/index.test.ts` while adding small module tests for the newly extracted files instead of over-expanding the single integration suite.
- Added pure helper coverage in `packages/amis-debugger/src/controller-helpers.test.ts` and `packages/amis-debugger/src/redaction.test.ts` so window-config parsing, network summary shaping, session id formatting, and redaction edge cases are checked directly.
- Key decision: keep pure functions under direct unit tests so future refactors can change controller composition without weakening behavior checks for config parsing and data masking.
- Added direct diagnostics coverage in `packages/amis-debugger/src/diagnostics.test.ts` for event query matching, overview aggregation, node diagnostics, interaction traces, redacted session export, and empty-report fallback behavior.
- Key decision: test `diagnostics.ts` at the pure-function level so AI-facing query/report/export semantics stay stable even if controller wiring changes again.
- Extended the AI-facing trace model so `packages/amis-debugger/src/diagnostics.ts` can infer a latest interaction anchor, resolve a richer trace query, and include `latestInteractionTrace` inside diagnostic reports without forcing callers to handcraft trace filters every time.
- Key decision: automatic interaction correlation stays in the pure diagnostics layer, using explicit `mode`, `eventId`, and `inferFromLatest` inputs so controller wiring remains thin while AI clients get higher-level defaults.
- Refreshed the playground AI example in `apps/playground/src/App.tsx` to demonstrate inferred traces, exact event-anchored traces, and `latestInteractionTrace` coming back from `createDiagnosticReport()`.
- Key decision: keep the playground snippet aligned with the public automation surface so the in-browser example doubles as living documentation for AI agents.
- Surfaced the inferred trace summary directly in the debugger overview via `packages/amis-debugger/src/panel.tsx` and added `packages/amis-debugger/src/panel.test.tsx` to pin the new UI summary behavior.
- Key decision: render the latest inferred trace in the overview tab using the existing diagnostic-report API instead of duplicating correlation logic inside the panel.
- Next step: if the overview gets crowded, split trace-specific UI into a dedicated summary block or future trace tab instead of overloading the metric-card grid.

### 2026-03-20 (Bug Fixes)

- Extended Bug #1 coverage and fix scope: `array-editor` and `key-value` now resync local state from plain scope updates as well as managed form updates.
  - Files: `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `packages/flux-renderers-form/src/renderers/key-value.tsx`, `packages/flux-renderers-form/src/__tests__/bug-dual-state.test.tsx`
  - Docs: `docs/bugs/06-array-editor-key-value-dual-state-fix.md`
  - Key decision: dual-state renderers must subscribe to whichever source of truth is active (`form.store` or scope), not just the form path.
- Tightened Bug #3 semantics: `validateForm()` now includes side-effect validation errors in its returned `errors`/`fieldErrors`, so `submit()` cannot pass while the store still contains validation failures.
  - Files: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`
  - Docs: `docs/bugs/08-validate-form-destructive-error-merge-fix.md`
  - Key decision: end-of-pass error merges must keep store state and returned validation results consistent, not just preserve external paths in the store.
- Corrected Bug #2 semantics: duplicate `submit()` calls now return `cancelled` instead of a normal error so guarded re-clicks do not masquerade as business failures in action chains or monitor output.
  - Files: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/index.test.ts`, `packages/flux-runtime/src/__tests__/bug-submit-race.test.ts`
  - Docs: `docs/bugs/07-submit-concurrent-guard-fix.md`
  - Key decision: guarded duplicate submits share the project's existing cancelled-action semantics instead of introducing a new failure mode.
- **Bug #1 Fixed**: ArrayEditor/KeyValue now subscribe to form store via `useCurrentFormState` with deep equality. External `reset()`/`setValue()` properly syncs to local state.
  - Files: `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `packages/flux-renderers-form/src/renderers/key-value.tsx`
  - Tests: 4 passing in `packages/flux-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 Fixed**: `submit()` now checks `store.getState().submitting` and rejects concurrent calls.
  - File: `packages/flux-runtime/src/form-runtime.ts:248`
  - Test: 1 passing in `packages/flux-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 Fixed**: `validateForm()` uses merge (`{...existing, ...fieldErrors}`) instead of replacement for error map.
  - File: `packages/flux-runtime/src/form-runtime.ts:177`
  - Tests: 5 passing in `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- All 117 tests pass (75 runtime + 42 form). Typecheck/lint pass for changed packages.
- Note: `amis-debugger` has pre-existing typecheck failures unrelated to these changes.

### 2026-03-20 (Bug Analysis)

- Completed frontend bug analysis across all packages. Found 5 confirmed runtime bugs.
- **Bug #1 (HIGH)**: ArrayEditor/KeyValue dual-state desync â€” `useState` initialized once, external `reset()`/`setValue()` doesn't update local state. Failing tests: `packages/flux-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 (HIGH)**: `submit()` no concurrent guard â€” rapid double-click fires two API calls. Failing test: `packages/flux-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 (MEDIUM-HIGH)**: `validateForm()` calls `store.setErrors(fieldErrors)` which destructively replaces entire errors map, wiping errors for paths not in traversal. Tests: `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- **Bug #4 (MEDIUM)**: `remapArrayFieldState` makes 5+ independent store updates causing intermediate state visible to `useSyncExternalStore` subscribers.
- **Bug #5 (MEDIUM)**: Table `key={index}` fallback causes row state misalignment on sort/delete.
- Key decision: complex fields must NOT maintain parallel local state; read from store only.
- Next step: implement fixes for Bug #1 and #2, starting with dual-state sync.

### 2026-03-20

- Fixed `checkbox-group` value handling so arrays no longer round-trip through JSON strings in `packages/flux-renderers-form/src/renderers/input.tsx` and `packages/flux-renderers-form/src/field-utils.tsx`.
- Added regression coverage for non-string checkbox-group values and plain-scope updates in `packages/flux-renderers-form/src/index.test.tsx` and recorded the defect note in `docs/bugs/05-checkbox-group-value-type-drift-fix.md`.
- Key decision: shared field handlers must preserve typed values because array-valued controls cannot safely share a string-only update pipeline.
- Next step: audit other multi-value renderers for hidden coercion paths before reusing generic field helpers.

- Fixed `checkbox-group` shared field handling so array values are passed through without JSON stringification in `packages/flux-renderers-form/src/renderers/input.tsx`.
- Added regression coverage for form and plain-scope checkbox-group updates, including non-string option values, in `packages/flux-renderers-form/src/index.test.tsx`.
- Key decision: shared field handlers now accept typed values so array-valued controls do not drift into string payloads on either the form or scope update path.
- Next step: if more multi-value controls are added, reuse the typed handler path instead of introducing serializer-specific glue.

- Added `docs/analysis/framework-debugger-design.md` as the first framework-level debugger design draft.
- Confirmed the debugger should live in a separate package, proposed as `@nop-chaos/amis-debugger`.
- Confirmed the main integration boundary should be the `SchemaRenderer` host layer rather than a specific renderer package.
- Recorded the recommended debugger shape: `window` global switch, floating draggable panel, hide-to-launcher behavior, and a left-bottom launcher entry.
- Identified the first key event groups for the debugger: `compile`, `render`, `action`, `api`, `notify`, and `error`.
- Planned next implementation direction: create the package skeleton, add controller and timeline event model, then wire the first version into `apps/playground/src/App.tsx`.
- Created the first `packages/amis-debugger/` package skeleton, including workspace package metadata, TypeScript configs, and alias wiring.
- Implemented a first debugger controller with `env` decoration, plugin hooks, timeline event storage, and root action error capture.
- Added a floating debugger panel with tabs for `overview`, `timeline`, and `network`, plus pause, clear, hide, and left-bottom launcher behavior.
- Wired the playground to the new debugger package and removed the old local right-side activity panel from `apps/playground/src/App.tsx`.
- Verified the first version with `pnpm --filter @nop-chaos/amis-debugger typecheck`, `pnpm --filter @nop-chaos/flux-playground typecheck`, `pnpm --filter @nop-chaos/amis-debugger build`, and `pnpm --filter @nop-chaos/flux-playground build`.
- Extended the debugger design and implementation direction to support AI-first diagnostics through structured automation APIs instead of UI scraping.
- Added automation-facing concepts to the design: `queryEvents`, `getLatestError`, `waitForEvent`, `createDiagnosticReport`, and `window`-level debugger hub access.
- Updated the package API plan so the debugger can serve both human operators and AI agents during automatic diagnosis and guided debugging.
- Added `packages/amis-debugger/src/index.test.ts` to cover event querying, diagnostic report generation, async event waiting, and global automation hub registration.
- Added a playground-facing reminder that AI tooling can read `window.__NOP_FLUX_DEBUGGER_API__` and `window.__NOP_FLUX_DEBUGGER_HUB__` directly.
- Added structured network summaries to debugger events so AI can read request/response shape without parsing free-form strings.
- Added node-level diagnostics aggregation to the debugger API so AI can inspect one node's recent render/action/api/error history in one call.
- Added a visible AI debug script example card in the playground to demonstrate how agents can call the debugger API from the browser context.
- Added higher-level AI automation APIs for interaction tracing and session export so agents can capture one diagnostic chain or the whole current debugger state as JSON.
- Expanded debugger tests to cover `getInteractionTrace()` and `exportSession()` behavior.
- Added configurable redaction support for exported debugger payloads so AI can analyze structure without leaking obvious secrets.
- Kept exported session data useful by preserving request/response shape metadata while masking sensitive values in `exportedData`.
- Started splitting `packages/amis-debugger/src/index.tsx` into dedicated modules for shared types, diagnostics helpers, redaction logic, and the floating panel UI to reduce the monolithic package entry.
- Next likely step: add focused tests for debugger event collection and refine API response summaries so the network tab shows more useful payload metadata.
