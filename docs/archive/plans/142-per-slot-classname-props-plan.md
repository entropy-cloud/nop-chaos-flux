# 142 Per-Slot ClassName Props for Layout Containers

> Plan Status: completed
> Last Reviewed: 2026-04-26
> Source: Design discussion following Plan 141 (container spacing defaults). The `className` on schema targets the root element, but layout control (grid, flex-row) needs to target inner body slots. `fluxBasicPageSchema.json` demonstrates this gap: `className="grid grid-cols-2"` is inert because it lands on `.nop-container` root instead of `[data-slot="container-body"]`.
> Related: `docs/plans/141-container-spacing-default-implementation-plan.md`

## Purpose

Add per-slot `className` props to all layout container schemas so schema authors can control the styling of individual slot wrappers (body, header, footer, actions, content) independently of the root element.

## Current Baseline

**Verified against live repo (2026-04-26):**

- `packages/flux-renderers-basic/src/schemas.ts` — `ContainerSchema` has `direction`, `wrap`, `align`, `gap` but no slot-specific className props. `PageSchema` has no slot props at all. `TabsSchema` has no slot className props.
- `packages/flux-renderers-form/src/schemas.ts` — `FormSchema` has `gap` but no slot className props.
- `packages/flux-renderers-form/src/renderers/fieldset.tsx` — `FieldsetSchema` has `gap` but no slot className props.
- All renderers place `props.meta.className` on the root element only (e.g., `cn('nop-container', props.meta.className)`). There is no mechanism to route a className to an inner slot wrapper like `[data-slot="container-body"]`.
- `apps/playground/src/pages/fluxBasicPageSchema.json:247` — Container with `className="grid grid-cols-2 gap-[18px]"` is inert because the grid class targets the root `.nop-container`, which has exactly one direct child (`container-body`).
- `docs/architecture/container-spacing-design.md` — documents spacing tokens and `@layer base` defaults but does not mention slot className props.
- `docs/architecture/renderer-runtime.md` — documents renderer contracts but does not mention per-slot styling.

**Result:** Schema authors cannot control inner slot layout or appearance. The only workaround is semantic props (`direction`, `gap`) which cover flex cases but not grid or arbitrary styling.

## Goals

- Schema authors can apply Tailwind classes to any named slot wrapper (body, header, footer, actions, content) via dedicated props like `bodyClassName`
- `className` continues to target the root element (no breaking change)
- All slot className props are optional; existing schemas work unchanged
- The grid container in `fluxBasicPageSchema.json` works correctly after migration

## Non-Goals

- Changing how `className` is routed (stays on root)
- Per-slot `style` or `data-*` props (only className for now)
- Dialog/Drawer slot className (these use UI component structure, not data-slot wrappers)
- Flex renderer (no body wrapper — children render directly into root)
- FieldFrame slot className (already has rich per-slot data-slot attributes)
- `slots` configuration object (deferred; per-slot props are simpler and sufficient)

## Scope

### In Scope

- `bodyClassName` prop on PageSchema, ContainerSchema, FormSchema, FieldsetSchema
- `headerClassName`, `footerClassName`, `toolbarClassName` props on PageSchema
- `headerClassName` and `footerClassName` props on ContainerSchema (also add `header?: BaseSchema[]` and `footer?: BaseSchema[]` to ContainerSchema interface)
- `actionsClassName` prop on FormSchema
- `contentClassName`, `toolbarClassName` props on TabsSchema
- `titleClassName` prop on FieldsetSchema
- Renderer code wiring each prop to the corresponding slot wrapper's `cn()` call
- Focused tests for each renderer's slot className application
- Migrate `fluxBasicPageSchema.json` grid container from `className` to `bodyClassName`
- Architecture docs updated

### Out Of Scope

- Dialog/Drawer per-slot className
- Flex per-slot className (no wrapper to target)
- FieldFrame per-slot className
- `slots` configuration object pattern
- Per-slot `style` or other HTML attributes

## Execution Plan

### Phase 1 - Schema Props and Renderer Wiring

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, `packages/flux-renderers-basic/src/page.tsx`, `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-basic/src/tabs.tsx`

- [x] Add `bodyClassName?: string`, `headerClassName?: string`, `footerClassName?: string`, `toolbarClassName?: string` to `PageSchema`
- [x] Add `bodyClassName?: string`, `headerClassName?: string`, `footerClassName?: string` to `ContainerSchema`; also add `header?: BaseSchema[]` and `footer?: BaseSchema[]` to `ContainerSchema` (regions already registered in `index.tsx:51` but interface lacks the fields)
- [x] Add `bodyClassName?: string`, `actionsClassName?: string` to `FormSchema`
- [x] Add `bodyClassName?: string`, `titleClassName?: string` to `FieldsetSchema`
- [x] Add `contentClassName?: string`, `toolbarClassName?: string` to `TabsSchema`
- [x] In `page.tsx`: apply `props.props.bodyClassName` to `[data-slot="page-body"]`, `headerClassName` to `[data-slot="page-header"]`, `footerClassName` to `[data-slot="page-footer"]`, `toolbarClassName` to `[data-slot="page-toolbar"]` — all via `cn()`
- [x] In `container.tsx`: apply `props.props.bodyClassName` to `[data-slot="container-body"]`, `headerClassName` to `[data-slot="container-header"]`, `footerClassName` to `[data-slot="container-footer"]` — all via `cn()`
- [x] In `form.tsx`: apply `props.props.bodyClassName` to `[data-slot="form-body"]`, `actionsClassName` to `[data-slot="form-actions"]` — all via `cn()`
- [x] In `fieldset.tsx`: apply `props.props.bodyClassName` to `[data-slot="fieldset-body"]`, `titleClassName` to `[data-slot="fieldset-title"]` — all via `cn()`
- [x] In `tabs.tsx`: apply `props.props.contentClassName` to `[data-slot="tabs-content"]`, `toolbarClassName` to `[data-slot="tabs-toolbar"]` — all via `cn()`

Exit Criteria:

- [x] All schema interfaces have the new props
- [x] All renderers pass the props to their corresponding slot wrapper elements
- [x] `pnpm --filter @nop-chaos/flux-renderers-basic typecheck` passes
- [x] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` passes
- [x] `pnpm --filter @nop-chaos/flux-renderers-basic build` passes
- [x] `pnpm --filter @nop-chaos/flux-renderers-form build` passes
- [x] `docs/logs/2026/04-26.md` updated with Phase 1 entry

### Phase 2 - Focused Tests

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/`, `packages/flux-renderers-form/src/__tests__/`

- [x] Test: Container renders `bodyClassName` on `[data-slot="container-body"]`
- [x] Test: Container renders `headerClassName` on `[data-slot="container-header"]`
- [x] Test: Container renders `footerClassName` on `[data-slot="container-footer"]`
- [x] Test: Container `bodyClassName` works with flex-child path (`direction: "column"`)
- [x] Test: Container `bodyClassName` works with bare path (no semantic props)
- [x] Test: Container with all three slot classNames simultaneously (body + header + footer)
- [x] Test: Form renders `bodyClassName` on `[data-slot="form-body"]`
- [x] Test: Form renders `actionsClassName` on `[data-slot="form-actions"]`
- [x] Test: Page renders `bodyClassName` on `[data-slot="page-body"]`
- [x] Test: Page renders `headerClassName` on `[data-slot="page-header"]`
- [x] Test: Page renders `footerClassName` on `[data-slot="page-footer"]`
- [x] Test: FieldSet renders `bodyClassName` on `[data-slot="fieldset-body"]`
- [x] Test: FieldSet renders `titleClassName` on `[data-slot="fieldset-title"]`
- [x] Test: Tabs renders `contentClassName` on `[data-slot="tabs-content"]`
- [x] Test: All slot className props default to undefined (no class emitted when not set)
- [x] Test: `className` on root + `bodyClassName` on body coexist without conflict

Exit Criteria:

- [x] All new focused tests pass
- [x] Existing tests still pass
- [x] `pnpm --filter @nop-chaos/flux-renderers-basic test` passes
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` passes
- [x] `docs/logs/2026/04-26.md` updated with Phase 2 entry

### Phase 3 - Playground Migration and Visual Verification

Status: completed
Targets: `apps/playground/src/pages/fluxBasicPageSchema.json`, `docs/architecture/container-spacing-design.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`

- [x] In `fluxBasicPageSchema.json`: change grid container (line ~247) from `"className": "grid grid-cols-2 gap-[18px]"` to `"bodyClassName": "grid grid-cols-2 gap-[18px]"` and keep root `className` for margin/visual styling if any
- [x] In `fluxBasicPageSchema.json`: review all containers with `direction: "column"` and consider adding `bodyClassName` for consistent gap
- [x] Update `docs/architecture/container-spacing-design.md`: add "Per-Slot ClassName Override" section documenting the new props and their mapping to data-slot attributes
- [x] Update `docs/architecture/renderer-runtime.md`: add slot className props to renderer contract documentation
- [x] Update `docs/architecture/styling-system.md`: add slot className props to the styling contract table

Exit Criteria:

- [x] `fluxBasicPageSchema.json` grid container uses `bodyClassName` and renders two columns
- [x] `pnpm typecheck` passes (affected packages)
- [x] `pnpm build` passes (affected packages)
- [x] `pnpm lint` passes (affected packages)
- [x] `docs/architecture/container-spacing-design.md` documents per-slot className props
- [x] `docs/architecture/renderer-runtime.md` documents per-slot className contract
- [x] `docs/architecture/styling-system.md` updated with slot styling reference
- [x] `docs/logs/2026/04-26.md` updated with all phase entries

## Validation Checklist

- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] All slot className props are optional (existing schemas work unchanged)
- [x] `className` still targets root element (no breaking change)
- [x] Grid container in fluxBasicPageSchema renders two columns
- [x] Every `data-slot` in page/container/form/fieldset/tabs has a corresponding `{slotName}ClassName` prop
- [x] `docs/architecture/container-spacing-design.md` documents per-slot className
- [x] `docs/architecture/renderer-runtime.md` documents per-slot className contract
- [x] `docs/architecture/styling-system.md` updated
- [x] `docs/logs/2026/04-26.md` updated
- [x] Independent closure audit completed

## Closure

Status Note: All phases completed. 18 new tests passing. Pre-existing `spreadsheet-core` typecheck failure is unrelated.

Closure Audit Evidence:

- Reviewer / Agent: opencode (AI agent)
- Evidence: typecheck + build + lint pass on affected packages; 18 new focused tests pass; fluxBasicPageSchema.json migrated; 3 architecture docs updated; dev log created.

Follow-up:

- Dialog/Drawer per-slot className — deferred to future work
- `slots` configuration object pattern — deferred to future work
