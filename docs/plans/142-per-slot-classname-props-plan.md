# 142 Per-Slot ClassName Props for Layout Containers

> Plan Status: planned
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

Status: planned
Targets: `packages/flux-renderers-basic/src/schemas.ts`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, `packages/flux-renderers-basic/src/page.tsx`, `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-basic/src/tabs.tsx`

- [ ] Add `bodyClassName?: string`, `headerClassName?: string`, `footerClassName?: string`, `toolbarClassName?: string` to `PageSchema`
- [ ] Add `bodyClassName?: string`, `headerClassName?: string`, `footerClassName?: string` to `ContainerSchema`; also add `header?: BaseSchema[]` and `footer?: BaseSchema[]` to `ContainerSchema` (regions already registered in `index.tsx:51` but interface lacks the fields)
- [ ] Add `bodyClassName?: string`, `actionsClassName?: string` to `FormSchema`
- [ ] Add `bodyClassName?: string`, `titleClassName?: string` to `FieldsetSchema`
- [ ] Add `contentClassName?: string`, `toolbarClassName?: string` to `TabsSchema`
- [ ] In `page.tsx`: apply `props.props.bodyClassName` to `[data-slot="page-body"]`, `headerClassName` to `[data-slot="page-header"]`, `footerClassName` to `[data-slot="page-footer"]`, `toolbarClassName` to `[data-slot="page-toolbar"]` — all via `cn()`
- [ ] In `container.tsx`: apply `props.props.bodyClassName` to `[data-slot="container-body"]`, `headerClassName` to `[data-slot="container-header"]`, `footerClassName` to `[data-slot="container-footer"]` — all via `cn()`
- [ ] In `form.tsx`: apply `props.props.bodyClassName` to `[data-slot="form-body"]`, `actionsClassName` to `[data-slot="form-actions"]` — all via `cn()`
- [ ] In `fieldset.tsx`: apply `props.props.bodyClassName` to `[data-slot="fieldset-body"]`, `titleClassName` to `[data-slot="fieldset-title"]` — all via `cn()`
- [ ] In `tabs.tsx`: apply `props.props.contentClassName` to `[data-slot="tabs-content"]`, `toolbarClassName` to `[data-slot="tabs-toolbar"]` — all via `cn()`

Exit Criteria:

- [ ] All schema interfaces have the new props
- [ ] All renderers pass the props to their corresponding slot wrapper elements
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic typecheck` passes
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` passes
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic build` passes
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form build` passes
- [ ] `docs/logs/2026/04-26.md` updated with Phase 1 entry

### Phase 2 - Focused Tests

Status: planned
Targets: `packages/flux-renderers-basic/src/__tests__/`, `packages/flux-renderers-form/src/__tests__/`

- [ ] Test: Container renders `bodyClassName` on `[data-slot="container-body"]`
- [ ] Test: Container renders `headerClassName` on `[data-slot="container-header"]`
- [ ] Test: Container renders `footerClassName` on `[data-slot="container-footer"]`
- [ ] Test: Container `bodyClassName` works with flex-child path (`direction: "column"`)
- [ ] Test: Container `bodyClassName` works with bare path (no semantic props)
- [ ] Test: Container with all three slot classNames simultaneously (body + header + footer)
- [ ] Test: Form renders `bodyClassName` on `[data-slot="form-body"]`
- [ ] Test: Form renders `actionsClassName` on `[data-slot="form-actions"]`
- [ ] Test: Page renders `bodyClassName` on `[data-slot="page-body"]`
- [ ] Test: Page renders `headerClassName` on `[data-slot="page-header"]`
- [ ] Test: Page renders `footerClassName` on `[data-slot="page-footer"]`
- [ ] Test: FieldSet renders `bodyClassName` on `[data-slot="fieldset-body"]`
- [ ] Test: FieldSet renders `titleClassName` on `[data-slot="fieldset-title"]`
- [ ] Test: Tabs renders `contentClassName` on `[data-slot="tabs-content"]`
- [ ] Test: All slot className props default to undefined (no class emitted when not set)
- [ ] Test: `className` on root + `bodyClassName` on body coexist without conflict

Exit Criteria:

- [ ] All new focused tests pass
- [ ] Existing tests still pass
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic test` passes
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form test` passes
- [ ] `docs/logs/2026/04-26.md` updated with Phase 2 entry

### Phase 3 - Playground Migration and Visual Verification

Status: planned
Targets: `apps/playground/src/pages/fluxBasicPageSchema.json`, `docs/architecture/container-spacing-design.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`

- [ ] In `fluxBasicPageSchema.json`: change grid container (line ~247) from `"className": "grid grid-cols-2 gap-[18px]"` to `"bodyClassName": "grid grid-cols-2 gap-[18px]"` and keep root `className` for margin/visual styling if any
- [ ] In `fluxBasicPageSchema.json`: review all containers with `direction: "column"` and consider adding `bodyClassName` for consistent gap
- [ ] Update `docs/architecture/container-spacing-design.md`: add "Per-Slot ClassName Override" section documenting the new props and their mapping to data-slot attributes
- [ ] Update `docs/architecture/renderer-runtime.md`: add slot className props to renderer contract documentation
- [ ] Update `docs/architecture/styling-system.md`: add slot className props to the styling contract table

Exit Criteria:

- [ ] `fluxBasicPageSchema.json` grid container uses `bodyClassName` and renders two columns
- [ ] `pnpm typecheck` passes (affected packages)
- [ ] `pnpm build` passes (affected packages)
- [ ] `pnpm lint` passes (affected packages)
- [ ] `docs/architecture/container-spacing-design.md` documents per-slot className props
- [ ] `docs/architecture/renderer-runtime.md` documents per-slot className contract
- [ ] `docs/architecture/styling-system.md` updated with slot styling reference
- [ ] `docs/logs/2026/04-26.md` updated with all phase entries

## Validation Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] All slot className props are optional (existing schemas work unchanged)
- [ ] `className` still targets root element (no breaking change)
- [ ] Grid container in fluxBasicPageSchema renders two columns
- [ ] Every `data-slot` in page/container/form/fieldset/tabs has a corresponding `{slotName}ClassName` prop
- [ ] `docs/architecture/container-spacing-design.md` documents per-slot className
- [ ] `docs/architecture/renderer-runtime.md` documents per-slot className contract
- [ ] `docs/architecture/styling-system.md` updated
- [ ] `docs/logs/2026/04-26.md` updated
- [ ] Independent closure audit completed

## Closure

Status Note:

Closure Audit Evidence:

- Reviewer / Agent:
- Evidence:

Follow-up:

- Dialog/Drawer per-slot className — deferred to future work
- `slots` configuration object pattern — deferred to future work
