# 19-BEM-to-Tailwind Migration Plan

> **Design doc:** `docs/architecture/bem-removal.md`
>
> **Implementation Status: ⚠️ PARTIALLY COMPLETED (Phases 1–7)**
> **Done:** BEM CSS rules removed from `styles.css` (no `.app-shell`, `.hero-card`, `.nav-card` found); `field-frame.tsx` uses `data-field-*` attributes instead of BEM; `dialog-host.tsx` uses shadcn Dialog components; marker class system (`nop-*`) established; Tailwind + `classAliases` in production use.
> **Remaining:** `table-renderer.tsx` does NOT yet use shadcn Table components; playground page BEM class cleanup may be incomplete; test assertion migration (Phase 11) and final CSS audit (Phase 12) not verified.
>
> This status was verified against the codebase on 2026-03-30.

> Design doc: `docs/architecture/bem-removal.md`

## Exit Criteria

- [ ] All BEM CSS rules deleted (3 files)
- [ ] All renderer components use Tailwind + shadcn/ui
- [ ] State modifiers converted to `data-*` attributes
- [ ] shadcn/ui wrappers removed (checkbox, switch, radio, input, textarea)
- [ ] Dialog host refactored to shadcn Dialog
- [ ] Table renderer refactored to shadcn Table
- [ ] Playground pages rewritten with Tailwind
- [ ] All test assertions migrated (~16 BEM class assertions)
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all pass
- [ ] `docs/development-log.md` updated

---

## Phase Overview

| Phase | Scope | Files | Risk | Depends On |
|---|---|---|---|---|
| 1 | Core: `field-frame` + `field-utils` | 2 | Medium | None |
| 2 | Form renderers: BEM wrapper removal | 7 | Low | Phase 1 |
| 3 | Data renderers: table refactor | 1 | Medium | Phase 1 |
| 4 | Basic renderers: page/container | 2 | Low | Phase 1 |
| 5 | Dialog host: shadcn Dialog refactor | 1 | Medium | Phase 1 |
| 6 | Flow designer: CSS deletion | 2 | Low | Phase 2 |
| 7 | Report designer: CSS deletion + Tailwind rewrite | 2 | Medium | Phase 2 |
| 8 | Playground pages: Tailwind rewrite | 5 | Medium | Phase 1-5 |
| 9 | Test assertions: data-* migration | 2 | Low | Phase 1-2 |
| 10 | CSS cleanup: delete files + remove imports | 3 | Low | Phase 6-8 |
| 11 | Final verification | - | - | All |
| 12 | Docs update | 2 | Low | Phase 11 |

---

## Phase 1: Core Infrastructure — `field-frame` + `field-utils`

**Why first**: All renderer packages depend on these two files. Their return type changes cascade to every consumer.

### Files

| File | Change |
|---|---|
| `packages/flux-react/src/field-frame.tsx` | BEM state classes → `data-field-*` attributes + Tailwind `grid gap-2` |
| `packages/flux-renderers-form/src/field-utils.tsx` | `getFieldClassName` deleted; `getChildFieldUiState` returns `data-*` map |

### `field-frame.tsx` Change Detail

**Before:**
```tsx
const stateClasses = [
  'nop-field',
  fieldState.visited ? 'nop-field--visited' : '',
  fieldState.touched ? 'nop-field--touched' : '',
  fieldState.dirty ? 'nop-field--dirty' : '',
  showError ? 'nop-field--invalid' : ''
].filter(Boolean).join(' ');

<Tag className={mergedClassName}>
```

**After:**
```tsx
<Tag
  className={classNames('nop-field grid gap-2', className)}
  data-field-visited={fieldState.visited || undefined}
  data-field-touched={fieldState.touched || undefined}
  data-field-dirty={fieldState.dirty || undefined}
  data-field-invalid={showError || undefined}
>
```

Sub-elements remain unchanged:
- `nop-field__label` — keep
- `nop-field__control` — keep
- `nop-field__error` — keep
- `nop-field__hint` — keep
- `nop-field__description` — keep
- `nop-field__required` — keep

### `field-utils.tsx` Change Detail

**`getFieldClassName`** — Delete entirely. Consumers now set `className` and `data-*` directly.

**`getChildFieldUiState`** — Return type changes:

**Before:**
```tsx
return {
  error, touched, dirty, visited, showError,
  className: ['nop-child-field', ...modifiers].filter(Boolean).join(' ')
};
```

**After:**
```tsx
return {
  error, touched, dirty, visited, showError,
  className: 'grid gap-1.5',
  'data-child-field-visited': visited || undefined,
  'data-child-field-touched': touched || undefined,
  'data-child-field-dirty': dirty || undefined,
  'data-child-field-invalid': showError || undefined,
};
```

**`useFieldPresentation`** — Return type changes:

**Before:**
```tsx
return {
  fieldState: { ...fieldState, error: visibleError },
  showError,
  className: getFieldClassName({ ...fieldState, showError })
};
```

**After:**
```tsx
return {
  fieldState: { ...fieldState, error: visibleError },
  showError,
  className: 'nop-field',
  'data-field-visited': fieldState.visited || undefined,
  'data-field-touched': fieldState.touched || undefined,
  'data-field-dirty': fieldState.dirty || undefined,
  'data-field-invalid': showError || undefined,
};
```

### Consumers Affected (for Phase 2)

These files spread the return value of `getChildFieldUiState` and `useFieldPresentation`:

- `packages/flux-renderers-form/src/renderers/key-value.tsx` — `<div className={childUi.className}>`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx` — `<div className={childUi.className}>`
- `packages/flux-renderers-form/src/renderers/tag-list.tsx` — `<label className={presentation.className}>`

These need to spread `data-*` attributes in Phase 2.

### Verify

```bash
pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-renderers-form typecheck
```

Typecheck only — tests break here intentionally, fixed in Phase 9.

---

## Phase 2: Form Renderers — BEM Wrapper Removal

### Files

| File | BEM Classes Removed | Tailwind Replacement |
|---|---|---|
| `src/renderers/input.tsx` | `nop-checkbox`, `nop-checkbox__input`, `nop-checkbox__label`, `nop-checkbox-group`, `nop-switch`, `nop-switch__input`, `nop-switch__label`, `nop-radio-group`, `nop-radio`, `nop-radio__input`, `nop-radio__label` | `inline-flex items-center gap-2.5`, `grid gap-2.5` |
| `src/renderers/tag-list.tsx` | `nop-tag-list`, `nop-tag`, `nop-tag--active` | `flex flex-wrap gap-2.5` + Button variant |
| `src/renderers/key-value.tsx` | `nop-kv-list`, `nop-kv-row`, `nop-kv-add`, `nop-kv-remove`, `nop-input` | `grid gap-3`, `grid grid-cols-[1fr_1fr_auto] gap-2.5`, Button |
| `src/renderers/array-editor.tsx` | `nop-array-editor`, `nop-array-editor__row`, `nop-kv-add`, `nop-kv-remove`, `nop-input` | `grid gap-3`, `grid grid-cols-[1fr_auto] gap-2.5`, Button |
| `src/renderers/form.tsx` | `nop-form__body`, `nop-form__actions` (CSS rules) | `grid gap-4`, `flex flex-wrap gap-3` |
| `src/renderers/shared/label.tsx` | None (class names kept as semantic markers) | — |
| `src/renderers/shared/error.tsx` | None (class names kept as semantic markers) | — |
| `src/renderers/shared/help-text.tsx` | None (class names kept as semantic markers) | — |

### Key Changes in `input.tsx`

**Checkbox — Before:**
```tsx
<span className="nop-checkbox">
  <Checkbox className="nop-checkbox__input" ... />
  {optionLabel ? <span className="nop-checkbox__label">{optionLabel}</span> : null}
</span>
```

**Checkbox — After:**
```tsx
<span className="inline-flex items-center gap-2.5">
  <Checkbox ... />
  {optionLabel ? <span className="font-medium">{optionLabel}</span> : null}
</span>
```

Same pattern for Switch, RadioGroup, CheckboxGroup — remove BEM wrappers, add Tailwind layout.

### Key Changes in `key-value.tsx` + `array-editor.tsx`

Spread `data-*` from `getChildFieldUiState`:

**Before:**
```tsx
<div className={childUi.className}>
```

**After:**
```tsx
<div
  className={childUi.className}
  data-child-field-visited={childUi['data-child-field-visited']}
  data-child-field-touched={childUi['data-child-field-touched']}
  data-child-field-dirty={childUi['data-child-field-dirty']}
  data-child-field-invalid={childUi['data-child-field-invalid']}
>
```

Remove `className="nop-input"` from `<Input>` components — let shadcn Input handle its own styling.

### Verify

```bash
pnpm --filter @nop-chaos/flux-renderers-form typecheck
```

---

## Phase 3: Data Renderers — Table Refactor

### File

| File | Change |
|---|---|
| `packages/flux-renderers-data/src/table-renderer.tsx` | Replace HTML `<table>` with shadcn Table components; keep semantic class names |

### Change Detail

Import shadcn Table components:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
```

Replace:
- `<table className="nop-table">` → `<Table className="nop-table">`
- `<thead>` → `<TableHeader className="nop-table__header">`
- `<tbody>` → `<TableBody>`
- `<tr className="nop-table__row ...">` → `<TableRow className="nop-table__row ...">`
- `<th>` → `<TableHead>`
- `<td>` → `<TableCell>`
- `<div className="nop-table-wrap">` → `<div className="nop-table-wrap grid gap-4">`
- `<div className="nop-table__actions">` → `<div className="nop-table__actions flex flex-wrap gap-3">`

Semantic class names (`nop-table`, `nop-table__row`, `nop-table__empty-row`, etc.) are **kept**.

### Verify

```bash
pnpm --filter @nop-chaos/flux-renderers-data typecheck
```

---

## Phase 4: Basic Renderers — Page/Container

### Files

| File | Change |
|---|---|
| `packages/flux-renderers-basic/src/page.tsx` | Add Tailwind utilities alongside semantic classes |
| `packages/flux-renderers-basic/src/container.tsx` | Add Tailwind utilities alongside semantic classes |

### Change Detail

`page.tsx`:
```tsx
<section className={classNames('nop-page grid gap-4', props.meta.className)}>
  <header className="nop-page__header">
  <div className="nop-page__toolbar">{headerContent}</div>
  <div className="nop-page__body">{props.regions.body?.render()}</div>
  <footer className="nop-page__footer">{footerContent}</footer>
</section>
```

`container.tsx`:
```tsx
<div className={classNames('nop-container grid gap-4', props.meta.className)}>
  <div className="nop-container__header">{headerContent}</div>
  <div className="nop-container__footer">{footerContent}</div>
</div>
```

Semantic classes kept. Visual styling via Tailwind.

### Verify

```bash
pnpm --filter @nop-chaos/flux-renderers-basic typecheck
```

---

## Phase 5: Dialog Host — shadcn Dialog Refactor

### File

| File | Change |
|---|---|
| `packages/flux-react/src/dialog-host.tsx` | Replace custom dialog markup with shadcn Dialog components |

### Change Detail

Import:
```tsx
import { Dialog, DialogContent, DialogOverlay, DialogClose } from '@nop-chaos/ui';
```

Replace:
- `<div className="nop-dialog-host nop-theme-root">` → keep class name, wrap with Dialog
- `<div className="nop-dialog-backdrop nop-theme-root">` → `<DialogOverlay>`
- `<div className="nop-dialog-card">` → `<DialogContent>`
- `<button className="nop-dialog-close">` → `<DialogClose>`

Keep semantic class names as additional classes for test identification.

### Verify

```bash
pnpm --filter @nop-chaos/flux-react typecheck
```

---

## Phase 6: Flow Designer — CSS Deletion

### Files

| File | Change |
|---|---|
| `packages/flow-designer-renderers/src/styles.css` | **Delete entirely** |
| `packages/flow-designer-renderers/src/index.tsx` | Remove `import './styles.css'` |
| `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx` | `fd-xyflow-surface` etc. → Tailwind inline |

### BEM → Tailwind Mapping

| BEM Class | Tailwind Replacement |
|---|---|
| `.fd-xyflow-surface .react-flow__controls` | Inline style or Tailwind on Controls wrapper |
| `.fd-xyflow-surface .react-flow__controls-button` | Tailwind via className prop |
| `.fd-xyflow-surface .react-flow__minimap` | Tailwind via className prop |
| `.fd-xyflow-minimap` | Tailwind classes on Minimap wrapper |
| `.fd-xyflow-controls` | Tailwind classes on Controls wrapper |

### Verify

```bash
pnpm --filter @nop-chaos/flow-designer-renderers typecheck
```

---

## Phase 7: Report Designer — CSS Deletion + Tailwind Rewrite

### Files

| File | Change |
|---|---|
| `packages/report-designer-renderers/src/styles.css` | **Delete entirely** (702 lines) |
| `packages/report-designer-renderers/src/index.ts` | Remove `import './styles.css'` |
| `apps/playground/src/pages/ReportDesignerDemo.tsx` | All BEM classes → Tailwind inline |

### BEM → Tailwind Key Mappings (from 702 lines)

| BEM Class | Tailwind Replacement |
|---|---|
| `.report-designer-demo` | `w-full max-w-[1400px] mx-auto` |
| `.report-designer-demo__header` | `mb-4` |
| `.report-designer-demo__toolbar` | `flex gap-2 items-center flex-wrap` |
| `.report-designer-demo__body` | `grid grid-cols-[200px_1fr_280px] gap-4 mb-4` |
| `.report-designer-demo__field-panel` | `bg-white border border-border rounded-xl p-4 overflow-y-auto max-h-[500px]` |
| `.report-designer-demo__canvas` | `bg-white border border-border rounded-xl p-4 overflow-auto` |
| `.report-designer-demo__inspector` | `bg-white border border-border rounded-xl p-4 overflow-y-auto max-h-[500px]` |
| `.report-designer-demo__log` | `bg-white border border-border rounded-xl p-4` |
| `.spreadsheet-grid table` | `border-collapse w-full text-xs table-fixed` |
| `.spreadsheet-grid td/th` | `border border-border p-1 h-6 overflow-hidden text-ellipsis whitespace-nowrap` |
| `.cell--selected` | `outline-2 outline-accent outline -outline-offset-1 bg-amber-50` |
| `.cell--bound` | `bg-blue-50` |
| `.cell--editing` | `outline-2 outline-primary -outline-offset-1 p-0` |
| `.sheet-tab` / `.sheet-tab.active` | Button with variant |
| `.toolbar` | `flex gap-3 items-center flex-wrap p-2 px-3 bg-muted rounded-lg mb-2` |
| `.toolbar button` | `<Button variant="outline" size="sm">` |
| `.find-replace-panel` | `bg-muted border border-border rounded-xl p-3 mt-2` |
| `.comment-text` | `text-xs text-muted-foreground bg-amber-50 p-2 rounded` |

Responsive:
```tsx
// Replace @media (max-width: 980px)
<div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-4 mb-4">
```

### Verify

```bash
pnpm --filter @nop-chaos/report-designer-renderers typecheck
```

---

## Phase 8: Playground Pages — Tailwind Rewrite

### Files

| File | BEM Classes Removed |
|---|---|
| `apps/playground/src/styles.css` | Strip all BEM rules (lines 145–828). Keep: `@import`, `@theme inline`, `:root`, `.nop-theme-root`, `*`, `body`, `#root` |
| `apps/playground/src/pages/HomePage.tsx` | `app-shell`, `hero-card`, `eyebrow`, `body-copy`, `nav-grid`, `nav-card`, `nav-card__*` |
| `apps/playground/src/pages/FluxBasicPage.tsx` | `app-shell`, `hero-card`, `page-back`, `eyebrow`, `body-copy`, `playground-stage`, `playground-layout`, `nop-ai-debug-card__*` |
| `apps/playground/src/pages/ReportDesignerPage.tsx` | `app-shell`, `hero-card`, `page-back`, `eyebrow`, `body-copy` |
| `apps/playground/src/pages/FlowDesignerPage.tsx` | (if it uses BEM classes) |

### BEM → Tailwind Mapping

| BEM Class | Tailwind Replacement |
|---|---|
| `.app-shell` | `min-h-screen grid place-items-center p-6` |
| `.app-shell--home` | `min-h-screen flex items-center justify-center` |
| `.hero-card` | `<Card>` + `max-w-[720px] p-10 rounded-3xl` |
| `.hero-card--wide` | `max-w-[1100px]` |
| `.hero-card--home` | `max-w-[800px] text-center` |
| `.eyebrow` | `mb-3 uppercase tracking-[0.16em] text-xs text-accent-muted` |
| `.body-copy` | `text-lg leading-relaxed text-muted-foreground` |
| `.body-copy--compact` | `mt-2.5 text-[15px]` |
| `.page-back` | `<Button variant="outline" size="sm" className="rounded-full">` |
| `.page-back--floating` | `fixed top-6 left-6 z-40` |
| `.nav-grid` | `grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mt-6` |
| `.nav-card` | `<Card>` with hover transition + `cursor-pointer` |
| `.nav-card__eyebrow` | `mb-2 uppercase tracking-[0.14em] text-[11px] font-bold text-accent-muted` |
| `.nav-card__title` | `mb-2 text-xl font-bold text-foreground` |
| `.nav-card__copy` | `text-sm leading-relaxed text-muted-foreground` |
| `.nav-card__arrow` | `absolute right-4 bottom-4 text-xl text-accent opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0` |
| `.playground-stage` | `p-6 rounded-[20px] bg-card/96 border border-border` |
| `.playground-layout` | `mt-8 grid grid-cols-[minmax(0,2fr)_minmax(280px,360px)] gap-6 items-start` |
| `.nop-ai-debug-card` | `mt-4 p-4 rounded-[18px] bg-gradient-to-b from-slate-900/94 to-slate-950/98 border border-amber-200/18` |
| `.nop-ai-debug-card__eyebrow` | `mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-amber-300` |
| `.nop-ai-debug-card__code` | `p-3.5 rounded-[14px] bg-black/30 text-sky-200 text-[13px] leading-relaxed overflow-x-auto` |

Responsive:
```tsx
// Replace @media (max-width: 980px) for playground-layout
<div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)] gap-6 items-start">

// Replace @media (max-width: 640px) for demo-grid
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Verify

```bash
pnpm --filter @nop-chaos/playground-app typecheck
```

---

## Phase 9: Test Assertions — data-* Migration

### Files

| File | Assertions to Update |
|---|---|
| `packages/flux-renderers-form/src/index.test.tsx` | ~12 assertions |
| `packages/flux-renderers-form/src/renderers/shared/index.test.tsx` | ~2 assertions |

### Assertion Migration Map

| Old | New |
|---|---|
| `field?.className).toContain('nop-field--visited')` | `field?.hasAttribute('data-field-visited')).toBe(true)` |
| `field?.className).toContain('nop-field--touched')` | `field?.hasAttribute('data-field-touched')).toBe(true)` |
| `field?.className).toContain('nop-field--dirty')` | `field?.hasAttribute('data-field-dirty')).toBe(true)` |
| `field?.className).toContain('nop-field--invalid')` | `field?.hasAttribute('data-field-invalid')).toBe(true)` |
| `keyField?.className).toContain('nop-child-field--visited')` | `keyField?.hasAttribute('data-child-field-visited')).toBe(true)` |
| `keyField?.className).toContain('nop-child-field--touched')` | `keyField?.hasAttribute('data-child-field-touched')).toBe(true)` |
| `keyField?.className).toContain('nop-child-field--invalid')` | `keyField?.hasAttribute('data-child-field-invalid')).toBe(true)` |
| `valueField?.className ?? '').not.toContain('nop-child-field--invalid')` | `expect(valueField?.hasAttribute('data-child-field-invalid')).toBe(false)` |
| `keyField?.className).toContain('nop-child-field--dirty')` | `keyField?.hasAttribute('data-child-field-dirty')).toBe(true)` |
| `childField?.className).toContain('nop-child-field--visited')` | `childField?.hasAttribute('data-child-field-visited')).toBe(true)` |
| `childField?.className).toContain('nop-child-field--touched')` | `childField?.hasAttribute('data-child-field-touched')).toBe(true)` |
| `childField?.className).toContain('nop-child-field--dirty')` | `childField?.hasAttribute('data-child-field-dirty')).toBe(true)` |
| `childField?.className).toContain('nop-child-field--invalid')` | `childField?.hasAttribute('data-child-field-invalid')).toBe(true)` |
| `screen.getByText('Username is required').className).toContain('nop-field__error')` | **No change** — `nop-field__error` is kept |
| `screen.getByText('Validating...').className).toContain('nop-field__hint')` | **No change** — `nop-field__hint` is kept |

### DOM Traversal Updates

| Old | New |
|---|---|
| `input.closest('.nop-field')` | **No change** |
| `keyInput.closest('.nop-child-field')` | `keyInput.closest('[data-child-field-dirty]')` or keep structural approach |

### Verify

```bash
pnpm --filter @nop-chaos/flux-renderers-form test
```

---

## Phase 10: CSS Cleanup

### Files to Delete

| File | Action |
|---|---|
| `packages/flow-designer-renderers/src/styles.css` | Delete |
| `packages/report-designer-renderers/src/styles.css` | Delete |

### Imports to Remove

| File | Line to Remove |
|---|---|
| `packages/flow-designer-renderers/src/index.tsx` | `import './styles.css';` |
| `packages/report-designer-renderers/src/index.ts` | `import './styles.css';` |

### `apps/playground/src/styles.css` — Strip BEM Rules

Keep lines:
- `@import "tailwindcss";` (line 1)
- `@theme inline { ... }` (lines 3-26)
- `:root { ... }` CSS variables (lines 28-48)
- `.nop-theme-root { ... }` (lines 50-127)
- `* { box-sizing: border-box; }` (lines 129-131)
- `body { ... }` (lines 133-139)
- `#root { ... }` (lines 141-143)

Delete everything from line 145 onward (all BEM rules).

### Verify

```bash
pnpm typecheck
```

---

## Phase 11: Final Verification

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

All four must pass with zero errors.

### Per-Package Verification Order

```bash
# Core packages first
pnpm --filter @nop-chaos/flux-react typecheck && pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-renderers-form typecheck && pnpm --filter @nop-chaos/flux-renderers-form build && pnpm --filter @nop-chaos/flux-renderers-form test
pnpm --filter @nop-chaos/flux-renderers-data typecheck && pnpm --filter @nop-chaos/flux-renderers-data build
pnpm --filter @nop-chaos/flux-renderers-basic typecheck && pnpm --filter @nop-chaos/flux-renderers-basic build && pnpm --filter @nop-chaos/flux-renderers-basic test

# Feature packages
pnpm --filter @nop-chaos/flow-designer-renderers typecheck && pnpm --filter @nop-chaos/flow-designer-renderers build
pnpm --filter @nop-chaos/report-designer-renderers typecheck && pnpm --filter @nop-chaos/report-designer-renderers build

# Playground
pnpm --filter @nop-chaos/playground-app typecheck && pnpm --filter @nop-chaos/playground-app build

# Full suite
pnpm typecheck && pnpm build && pnpm lint && pnpm test
```

---

## Phase 12: Docs Update

### Files to Update

| File | Update |
|---|---|
| `docs/development-log.md` | Add entry describing the BEM removal |
| `docs/references/maintenance-checklist.md` | Add link to `docs/architecture/bem-removal.md` |
| `docs/architecture/bem-removal.md` | Mark as current (update if any deviations occurred) |

---

## Rollback Strategy

Each phase is independent and reversible:

1. **Per-phase backup**: Before modifying a file, create `<file>.bak` alongside it
2. **Phase failure**: If verification fails, restore `.bak` files for that phase only
3. **Full rollback**: `git checkout -- .` reverts all changes (no commits until complete)
4. **No partial commits**: Do not commit until Phase 11 passes fully

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `getChildFieldUiState` return type breaks consumers | Medium | High | Phase 1 typecheck catches all consumers |
| shadcn Dialog API differs from custom dialog | Medium | Medium | Phase 5 isolated; Dialog has well-known API |
| Report designer CSS (702 lines) Tailwind conversion misses edge cases | Medium | Low | Visual verification in playground |
| Tailwind `data-*` variants not configured | Low | Medium | Verify `@tailwindcss` v4 supports `data-[field-dirty]:` natively |
| Test assertion format change introduces false positives | Low | High | Phase 9 runs full test suite |

---

## File Count Summary

| Category | Count |
|---|---|
| TSX source files modified | ~15 |
| CSS files deleted | 2 |
| CSS files stripped | 1 |
| Test files modified | 2 |
| Doc files updated | 3 |
| **Total** | **~23 files** |
