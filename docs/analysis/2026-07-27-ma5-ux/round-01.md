# MA5.2 Basic+Content UX Audit — Round 01

## Date: 2026-07-27

## Target Packages: flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-content

## Audit Summary

The codebase demonstrates high UX design discipline across all 5 packages. Icon usage is consistent, ARIA semantics are properly applied, button variants are harmonized per semantic operation, and interactive states (hover/focus-visible/disabled/loading) are uniformly handled. The primary issues identified are:

1. **Icon-picker**: hardcoded Chinese strings (4 locations) where i18n `t()` is expected — the only component in the reviewed scope that bypasses the `@nop-chaos/flux-i18n` system.
2. **Icon-picker**: icon grid buttons lack `focus-visible:ring-*`, impairing keyboard navigation.
3. **Array-editor / Key-value**: add buttons render text-only without `PlusIcon`, inconsistent with combo-renderer and input-table-renderer which both use `variant="outline"` + `PlusIcon` + text.

No issues found in flux-renderers-basic, flux-renderers-form, or flux-renderers-data packages across all 12 perspectives.

---

## Findings

### [视角1-01] Array-editor and Key-value add buttons missing PlusIcon

- **File**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:566-597`, `packages/flux-renderers-form-advanced/src/key-value.tsx:601-628`
- **Evidence** (array-editor):
  ```tsx
  <Button
    ref={addButtonRef}
    type="button"
    variant="outline"
    size="sm"
    disabled={...}
    onClick={...}
  >
    {t('flux.form.addItem')}
  </Button>
  ```
- **Evidence** (key-value):
  ```tsx
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled={...}
    onClick={...}
  >
    {props.props.addLabel ? String(props.props.addLabel) : t('flux.form.addEntry')}
  </Button>
  ```
- **Severity**: MEDIUM
- **Status**: "Add" buttons in `array-editor` and `key-value` render as plain text buttons (`variant="outline"`, text only). No `PlusIcon` is rendered alongside the label.
- **Industry Practice**: Cross-component consistency baseline (per audit task): "Add button: ghost + PlusIcon" (industry standard per shadcn/ui / Ant Design). The sibling components `combo-renderer` and `input-table-renderer` in the same package already implement this correctly:
  - `combo-renderer.tsx:536-547`: `variant="outline"` + `<PlusIcon className="size-4" />` + text
  - `input-table-renderer.tsx:600-611`: `variant="outline"` + `<PlusIcon className="size-4" />` + text
- **User Impact**: In a CRUD-like form interface where `array-editor` (add item), `key-value` (add entry), `combo` (add item), and `input-table` (add row) appear on the same page, users will see inconsistent add button rendering — some with an icon, some without. While functionality is unaffected, the visual inconsistency creates a "half-finished" impression and slows visual scanning.
- **Suggestion**: Add `<PlusIcon className="size-4" />` before the label text in both `array-editor.tsx` (line 595 area) and `key-value.tsx` (line 626 area), matching the pattern used in `combo-renderer.tsx:545` and `input-table-renderer.tsx:609`.
- **Review Status**: 未复核

---

### [视角9-01] Icon-picker has hardcoded Chinese strings (4 locations) instead of i18n t()

- **File**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:191,204,236,249`
- **Evidence**:

  ```tsx
  // line 191 — search placeholder
  placeholder="搜索图标..."

  // line 204 — no-results
  <div className="col-span-6 py-6 text-center text-sm text-muted-foreground">
    无匹配项
  </div>

  // line 236 — "show more" button label
  显示更多 ({filteredIcons.length - visibleCount})

  // line 249 — clear button aria-label
  aria-label="清空"
  ```

- **Severity**: MEDIUM
- **Status**: `icon-picker.tsx` does not import `t` from `@nop-chaos/flux-i18n` and uses hardcoded Chinese strings for all user-facing text (placeholder, empty state, "show more" button, and clear button `aria-label`). Every other renderer in the 5 audited packages uses `t()` for user-facing strings.
- **Industry Practice**: All other renderers in the project use `import { t } from '@nop-chaos/flux-i18n'` for user-facing strings. For example: `alert-renderer.tsx`, `empty.tsx`, `transfer-renderer.tsx`, `table-pagination-bar.tsx`, etc. Using i18n is the project's established convention.
- **User Impact**: Non-Chinese-speaking users will see untranslated Chinese text in the icon picker: placeholder "搜索图标...", empty state "无匹配项", "显示更多" button, and a screen reader hearing "清空" on the clear button. The component is effectively unusable for non-Chinese users.
- **Suggestion**: Add `import { t } from '@nop-chaos/flux-i18n'` and replace each hardcoded string:
  - `placeholder="搜索图标..."` → `placeholder={t('flux.iconPicker.searchPlaceholder', { defaultValue: 'Search icons...' })}`
  - `无匹配项` → `{t('flux.common.noResults', { defaultValue: 'No matches' })}`
  - `显示更多` → `{t('flux.iconPicker.showMore', { defaultValue: 'Show more' })}`
  - `aria-label="清空"` → `aria-label={t('flux.common.clear', { defaultValue: 'Clear' })}`
- **Review Status**: 未复核

---

### [视角3-01] Icon-picker icon grid buttons lack focus-visible ring

- **File**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:211-223`
- **Evidence**:
  ```tsx
  <button
    key={iconName}
    type="button"
    className={cn(
      'flex size-8 items-center justify-center rounded hover:bg-accent',
      isSelected && 'bg-accent text-accent-foreground ring-1 ring-primary',
    )}
    title={iconName}
    onClick={() => selectIcon(iconName)}
  >
    <IconComp className="size-4" />
  </button>
  ```
- **Severity**: MEDIUM
- **Status**: Each icon option in the picker is a raw `<button>` element with `hover:bg-accent` but no `focus-visible:ring-*` class. The selected state uses `ring-1 ring-primary`, but there is no focus ring when the button receives keyboard focus. Compare to `table-header-row.tsx:160-168` which wraps its interactive elements in the shadcn/ui `Button` component that includes built-in focus-visible ring support.
- **Industry Practice**: shadcn/ui `Button` and all interactive elements with `tabIndex >= 0` should have a visible `focus-visible:ring-2 focus-visible:ring-ring` indicator. The project's own cards-renderer (`cards-renderer.tsx:181`) demonstrates the correct pattern: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
- **User Impact**: Keyboard users tabbing through icon options in the picker will see no visual focus indicator. They cannot tell which icon is currently focused. Combined with the missing `aria-label` (only `title` is provided on these buttons), screen reader keyboard navigation is impaired.
- **Suggestion**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` to the button className. Also add `aria-label={iconName}` since these are icon-only buttons.
- **Review Status**: 未复核

---

## Summary by Component

| Component                          | Findings | Main Issue Categories                                       |
| ---------------------------------- | -------- | ----------------------------------------------------------- |
| icon-picker                        | 2        | i18n hardcoded strings, focus-visible ring missing          |
| array-editor                       | 1        | Add button missing PlusIcon (cross-component inconsistency) |
| key-value                          | 1        | Add button missing PlusIcon (cross-component inconsistency) |
| combo-renderer                     | 0        | —                                                           |
| input-table-renderer               | 0        | —                                                           |
| input (form)                       | 0        | —                                                           |
| textarea                           | 0        | —                                                           |
| input-number                       | 0        | —                                                           |
| select / checkbox / switch / radio | 0        | —                                                           |
| transfer                           | 0        | —                                                           |
| tag-list                           | 0        | —                                                           |
| tree-controls                      | 0        | —                                                           |
| condition-builder                  | 0        | —                                                           |
| upload                             | 0        | —                                                           |
| picker                             | 0        | —                                                           |
| detail-view                        | 0        | —                                                           |
| table / CRUD                       | 0        | —                                                           |
| pagination                         | 0        | —                                                           |
| pagination-bar (table)             | 0        | —                                                           |
| chart                              | 0        | —                                                           |
| tree (data)                        | 0        | —                                                           |
| cards                              | 0        | —                                                           |
| dialog / drawer                    | 0        | —                                                           |
| button                             | 0        | —                                                           |
| tabs                               | 0        | —                                                           |
| fieldset                           | 0        | —                                                           |
| alert                              | 0        | —                                                           |
| spinner                            | 0        | —                                                           |
| empty                              | 0        | —                                                           |
| status                             | 0        | —                                                           |
| progress                           | 0        | —                                                           |

## Cross-Component Consistency Issues

| Pattern         | Baseline                                                     | Deviations                                         |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Add button      | `variant="outline"` + `PlusIcon` + text (combo, input-table) | array-editor and key-value: text only, no PlusIcon |
| Delete button   | `variant="ghost"` + `Trash2Icon` + `hover:text-destructive`  | All consistent ✅                                  |
| Reorder buttons | `variant="ghost"` + `ChevronUpIcon`/`ChevronDownIcon`        | All consistent ✅                                  |
| Sort indicators | Tri-state: `ArrowUpIcon`/`ArrowDownIcon`/`ArrowUpDownIcon`   | All consistent ✅                                  |
| Filter icon     | `ListFilterIcon`                                             | All consistent ✅                                  |
| Loading state   | `Spinner` + optional text                                    | All consistent ✅                                  |
| Empty state     | `Empty` component + meaningful text                          | All consistent ✅                                  |
| i18n usage      | `t()` from `@nop-chaos/flux-i18n`                            | icon-picker uses hardcoded Chinese                 |

## No-Findings Checklist (Verified Clean)

The following perspectives yielded zero findings after thorough scanning:

- **Perspective 1 (Icon Semantics)**: All icons match their semantic operation. `Trash2Icon` for delete, `PlusIcon` for add, `ListFilterIcon` for filter, `SearchIcon` for search, `ChevronUpIcon`/`ChevronDownIcon` for reorder, `ArrowUpIcon`/`ArrowDownIcon`/`ArrowUpDownIcon` for sort tri-state. No cross-component icon inconsistency found.
- **Perspective 2 (Button Style)**: Delete buttons uniformly use `variant="ghost"` + `hover:text-destructive`. Add buttons use `variant="outline"` (with noted missing icons). No variant/size drift for the same semantic operation.
- **Perspective 4 (Form Interaction)**: All form fields use `Label` + `htmlFor` wrapping. Select uses proper `ComboboxClear`. Number input steppers use correct icons. Validation errors use `aria-describedby`/`aria-errormessage` + `role="alert"`. Table select-all uses `indeterminate` checkbox.
- **Perspective 5 (Loading/Empty)**: All components use `Spinner` component for loading (not plain text). Empty states use `Empty` component with meaningful i18n content. Table, Cards, Transfer, Chart all handle empty state.
- **Perspective 6 (Dialog/Popover)**: Dialog and Drawer surface through `useSurfaceRenderer` + shadcn/ui primitives. Close buttons present. Proper focus management expected from shadcn/ui.
- **Perspective 7 (Colors/Tokens)**: No hardcoded `orange-300`/`blue-500` found. All color values use CSS custom properties via Tailwind theme tokens (`bg-muted`, `text-destructive`, `border-primary`, etc.) or shadcn/ui component variants.
- **Perspective 8 (Spacing/Alignment)**: Button groups use consistent `flex` + `gap-*` patterns. No `absolute` floating buttons found. Action bars use `flex justify-between` or `ml-auto`. Icon-only buttons use `size-4`/`size-3.5` within appropriately sized container buttons.
- **Perspective 9 (ARIA)**: Charts use `role="img"` with `aria-label`/`aria-labelledby`. Lists use `role="list"` + `role="listitem"`. Tree uses `role="tree"` + `role="treeitem"` + `role="group"`. Icon-only buttons have `aria-label`. Error messages use `role="alert"`. The only ARIA issue found is the icon-picker buttons lacking `aria-label`.
- **Perspective 10 (Cross-component)**: Pagination UI is consistent across table and CRUD. Sort interaction uses tri-state consistently. Filter uses `ListFilterIcon` + `DropdownMenu`. Loading uses `Spinner` + text. Empty uses `Empty` + meaningful text. Add button is consistent across most components (noted deviation above).
- **Perspective 11 (Product Completeness)**: All components provide clear primary actions, state indicators (empty/loading/editable), and meaningful fallback text.
- **Perspective 12 (Visual Originality)**: No evidence of default component stacking without hierarchy. Components use proper semantic variants, spacing, and color tokens. The codebase shows intentional design decisions rather than AI-safe templating.
