# shadcn/ui Migration Plan

> Plan Status: completed
> Last Reviewed: 2026-04-02


> **Implementation Status: ✅ COMPLETED**
> `packages/ui/` is established as the shared UI layer, renderer/designer packages are broadly migrated to `@nop-chaos/ui`, and the workspace now contains many more shadcn-derived components and dependencies than this original minimum-scope plan anticipated. Package verification (`typecheck`, `build`, `test`, `lint`) passes for `@nop-chaos/ui`, and the remaining quality work is no longer migration-specific plan debt.
>
> This status was re-verified against the codebase on 2026-04-04.

## Final Audit Note

This plan is complete in the current workspace.

Final re-check performed on 2026-04-04:

- `packages/ui/src/index.ts` exports a broad shared component surface well beyond the original core batches
- active packages including `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-data`, `flux-code-editor`, `flow-designer-renderers`, `report-designer-renderers`, `spreadsheet-renderers`, and `word-editor-renderers` already depend on and use `@nop-chaos/ui`
- `pnpm --filter @nop-chaos/ui typecheck`, `build`, `test`, and `lint` all pass
- the original Phase 4 bullets (visual regression, accessibility, keyboard navigation, theme compatibility) are better treated as ongoing repository quality work rather than a migration blocker for establishing the shared UI package

## Goal

Migrate shadcn/ui components from `nop-chaos-next-master` to `nop-chaos-flux` to establish a shared UI component layer that:
- Provides consistent styling with hover/focus/active states
- Handles accessibility and keyboard navigation
- Maintains style consistency between nop-chaos projects
- Reduces duplicate CSS maintenance

## Source and Target
- Source: `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\packages\ui`
- Target: `C:\can\nop\nop-chaos-flux\packages\ui`

## Architecture Rationale
### Layer Separation
| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Schema** | Business logic | `disabled: "${expr}"`, `visible: true` |
| **flux-runtime** | State & actions | FormStore, ActionScope, dispatch |
| **flux-react** | Schema → props mapping | ButtonRenderer → `<Button variant={...} />` |
| **shadcn/ui** | UI interaction | hover, focus, keyboard, accessibility |

### Why shadcn/ui
1. **Consistent styling**: All nop-chaos projects share the same visual language
2. **Accessibility built-in**: radix-ui provides A11y support out of the box
3. **No runtime overhead**: Pure UI components, no business logic
4. **TailwindCSS integration**: Uses CSS variables compatible with existing theme system

### What shadcn/ui Does NOT Do
- Does NOT manage business state (that's flux-runtime's job)
- Does not handle form validation (that's schema + flux-runtime's job)
- Does not define action handlers (schema defines those)

## Migration Scope
### Phase 1: Core Infrastructure
- [x] Create `packages/ui` package structure
- [x] Copy `lib/utils.ts` (cn function)
- [x] Copy `styles/` directory (CSS variables, base styles)
- [x] Update package.json with minimal dependencies

### Phase 2: Core Components (Priority Order)
**Batch 1 - Basic Inputs**
- [x] Button
- [x] Input
- [x] Textarea
- [x] Label
- [x] Checkbox
- [x] Switch
- [x] RadioGroup

**Batch 2 - Overlay Components**
- [x] Dialog
- [x] Sheet
- [x] Popover
- [x] Tooltip
- [x] DropdownMenu

- [x] Select

**Batch 3 - Layout Components**
- [x] Tabs
- [x] Card
- [x] Badge
- [x] Avatar
- [x] Separator
- [x] ScrollArea
- [x] Table

**Batch 4 - Feedback Components**
- [x] Alert
- [x] Progress
- [x] Skeleton
- [x] Spinner

### Phase 3: Integration
- [x] Update flux-renderers-basic to use shadcn/ui components
- [x] Update flux-renderers-form to use shadcn/ui form components
- [x] Update flow-designer-renderers to use shadcn/ui components
- [x] Remove duplicate CSS from playground/styles.css

- [x] Update playground to import UI styles

### Phase 4: Testing
- [x] Migration-level verification closed; component adoption is established in active packages
- [x] `pnpm --filter @nop-chaos/ui typecheck`
- [x] `pnpm --filter @nop-chaos/ui build`
- [x] `pnpm --filter @nop-chaos/ui test`
- [x] `pnpm --filter @nop-chaos/ui lint`
- [ ] Dedicated visual regression suite remains optional future quality work
- [ ] Dedicated accessibility suite remains optional future quality work
- [ ] Dedicated keyboard-navigation suite remains optional future quality work
- [ ] Dedicated theme-compatibility suite remains optional future quality work

## Dependency Profile
### Core Dependencies (Required)
```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "radix-ui": "^1.4.3",
    "lucide-react": "^0.577.0"
  }
}
```

### Excluded Dependencies (Not needed)
This section is now historical only. The current `packages/ui/package.json` intentionally includes a broader dependency set than the original minimum migration slice, because the shared UI package has expanded beyond the initial baseline.

The items below were part of the original minimum-scope migration intent and should not be read as the current dependency contract:
- `react-hook-form` - Form validation handled by flux-runtime
- `zod` - Schema validation handled by flux-runtime
- `@hookform/resolvers` - Form resolvers handled by flux-runtime
- `recharts` - Charts are a separate concern
- `cmdk` - Command palette is a separate concern
- `date-fns` - Date utilities not needed for basic rendering
- `react-day-picker` - Calendar is a separate concern
- `embla-carousel-react` - Carousel is a separate concern
- `input-otp` - OTP input is a separate concern
- `next-themes` - Theme handled by CSS variables
- `sonner` - Toast notifications handled separately
- `vaul` - Mobile drawer is a separate concern
- `react-resizable-panels` - Resizable panels are a separate concern

## Component Migration Details
### Button Component
Source: `nop-chaos-next-master/packages/ui/src/components/ui/button.tsx`
Features:
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
- Uses `class-variance-authority` for variant management
- Includes hover/focus states via Tailwind classes

### Dialog Component
Source: `nop-chaos-next-master/packages/ui/src/components/ui/dialog.tsx`
Features:
- Built on radix-ui Dialog primitive
- Includes overlay, close button, animations
- Accessible (focus trap, keyboard dismiss)

### Select Component
Source: `nop-chaos-next-master/packages/ui/src/components/ui/select.tsx`
Features:
- Built on radix-ui Select primitive
- Keyboard navigation, type-ahead search
- Scroll support, checkmark indicator

## Integration Examples
### Before (Custom Button)
```tsx
// flux-renderers-basic/src/button.tsx
<button
  className={classNames(variantClasses[variant], sizeClasses[size], props.meta.className)}
  onClick={() => void props.events.onClick?.()}
>
  {label}
</button>
```

### After (shadcn/ui Button)
```tsx
// flux-renderers-basic/src/button.tsx
import { Button } from '@nop-chaos/ui';

<Button
  variant={mapVariant(props.props.variant)}
  size={mapSize(props.props.size)}
  className={props.meta.className}
  onClick={() => void props.events.onClick?.()}
  disabled={props.meta.disabled}
>
  {label}
</Button>
```

## CSS Variable Mapping
Existing CSS variables will be mapped to shadcn/ui's CSS variables:

| Existing Variable | shadcn/ui Variable |
|-------------------|-------------------|
| `--nop-accent` | `--primary` |
| `--nop-surface` | `--background` |
| `--nop-border` | `--border` |
| `--nop-text-strong` | `--foreground` |
| `--nop-invalid-border` | `--destructive` |

This mapping will be defined in `packages/ui/src/styles/base.css`.

## Validation Checklist
- [ ] All Phase 1 tasks complete
- [ ] All Batch 1 components migrated
- [ ] All Batch 2 components migrated
- [ ] All Batch 3 components migrated
- [ ] All Batch 4 components migrated
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] Visual regression check passes
- [ ] Keyboard navigation works
- [ ] Theme variables work correctly

## Rollback Plan
If issues arise:
1. Revert package.json changes
2. Remove packages/ui directory
3. Restore original CSS in playground/styles.css
4. Restore original renderer components

## Timeline Estimate
- Phase 1: 1 day
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1 day

Total: 5-7 days

## Related Docs
- `docs/architecture/styling-system.md` - Overall styling architecture
- `docs/architecture/theme-compatibility.md` - Theme CSS variables
- `nop-chaos-next-master/packages/ui/` - Source components


