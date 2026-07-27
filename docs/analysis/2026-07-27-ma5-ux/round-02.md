# MA5.2 Basic+Content UX Audit — Round 02 (Recursive Expansion)

## Date: 2026-07-27

## Target: Recursive expansion of Round 01 findings; deep-dive into flux-renderers-content

## Files Checked

| File                                                                   | Lines           | Purpose                                 |
| ---------------------------------------------------------------------- | --------------- | --------------------------------------- |
| `packages/flux-renderers-form-advanced/src/array-editor.tsx`           | 38-195          | Delete/reorder button verification      |
| `packages/flux-renderers-form-advanced/src/key-value.tsx`              | 43-258, 595-628 | Delete/reorder button verification      |
| `packages/flux-renderers-form-advanced/src/icon-picker.tsx`            | 150-265         | ARIA, keyboard, and accessibility audit |
| `packages/flux-renderers-content/src/alert-renderer.tsx`               | 1-113           | Full read                               |
| `packages/flux-renderers-content/src/status.tsx`                       | 1-92            | Full read                               |
| `packages/flux-renderers-content/src/progress.tsx`                     | 1-67            | Full read                               |
| `packages/flux-renderers-content/src/empty.tsx`                        | 1-52            | Full read                               |
| `packages/flux-renderers-content/src/spinner.tsx`                      | 1-40            | Full read                               |
| `packages/flux-renderers-content/src/card.tsx`                         | 1-76            | Full read                               |
| `packages/flux-renderers-content/src/carousel.tsx`                     | 1-317           | Full read                               |
| `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx` | 1-438           | Full read                               |
| `packages/flux-renderers-content/src/json-view.tsx`                    | 1-97            | Full read                               |
| `packages/flux-renderers-content/src/link.tsx`                         | 1-66            | Full read                               |
| `packages/flux-renderers-content/src/markdown.tsx`                     | 1-112           | Full read                               |
| `packages/flux-renderers-content/src/mapping.tsx`                      | 1-106           | Full read                               |
| `packages/flux-renderers-content/src/separator.tsx`                    | 1-47            | Full read                               |
| `packages/flux-renderers-content/src/image.tsx`                        | 1-239           | Full read                               |
| `packages/flux-renderers-content/src/html.tsx`                         | 1-49            | Full read                               |
| `packages/flux-renderers-content/src/qrcode.tsx`                       | 1-121           | Full read                               |
| `packages/flux-renderers-content/src/audio.tsx`                        | 1-78            | Full read                               |
| `packages/flux-renderers-content/src/video.tsx`                        | 1-88            | Full read                               |
| `packages/flux-renderers-content/src/cards-renderer.tsx`               | 1-279           | Full read                               |

## Perspectives Verified

- **Perspective 1 (Icon Semantics)**: Alert, Status, Progress — all semantically correct. Alert uses `CheckCircleIcon`/`TriangleAlertIcon`/`CircleAlertIcon`/`InfoIcon` per level.
- **Perspective 2 (Button Style)**: Array-editor row delete `variant="ghost"` + `hover:text-destructive` + `Trash2Icon` ✅ — consistent with combo/input-table. Reorder `variant="ghost"` + `ChevronUpIcon`/`ChevronDownIcon` ✅. No additional drift found beyond Round 01's add-button finding.
- **Perspective 5 (Loading/Empty)**: Content package handles loading/empty/error states consistently. `data-state` attribute present on every state.
- **Perspective 7 (Colors/Tokens)**: No hardcoded color values. All use CSS variables (`bg-muted`, `text-muted-foreground`, `bg-primary`, `border-destructive`, etc.).
- **Perspective 8 (Spacing/Alignment)**: Consistent gap patterns, no floating buttons.
- **Perspective 11 (Product Completeness)**: Every content component has empty/error fallback.
- **Perspective 12 (Visual Originality)**: Intentional design patterns throughout.

## Findings

---

### [视角9-02] Content package hardcoded fallback strings (10+ locations across 7 files) — i18n gap

- **Files**: `packages/flux-renderers-content/src/audio.tsx:47`, `video.tsx:57`, `carousel.tsx:228`, `json-view.tsx:90`, `markdown.tsx:85`, `image.tsx:199`, `qrcode.tsx:89`
- **Evidence**:

  **audio.tsx:47**

  ```tsx
  {
    errored ? 'Audio failed to load' : 'No audio source';
  }
  ```

  **video.tsx:57**

  ```tsx
  {
    errored ? 'Video failed to load' : 'No video source';
  }
  ```

  **carousel.tsx:228-229**

  ```tsx
  <div data-slot="carousel-empty" className="text-sm text-muted-foreground">
    {'No items to display'}
  </div>
  ```

  **json-view.tsx:90**

  ```tsx
  <Button type="button" variant="outline" size="xs" onClick={() => void handleCopy()}>
    {copied ? 'Copied' : 'Copy'}
  </Button>
  ```

  **markdown.tsx:85**

  ```tsx
  {
    fetchError ? 'Failed to load markdown content' : hasEmpty ? emptyContent : null;
  }
  ```

  **image.tsx:199**

  ```tsx
  <span data-slot="image-fallback">{alt || 'image'}</span>
  ```

  **qrcode.tsx:89**

  ```tsx
  {
    failed ? 'QR code failed' : 'No value';
  }
  ```

- **Severity**: MEDIUM
- **Status**: These 7 content-package components hardcode English user-facing strings (error messages, empty-state text, button labels, fallback labels) instead of using `t()` from `@nop-chaos/flux-i18n`. Sibling components in the same package correctly demonstrate the pattern: `empty.tsx` uses `t('flux.common.noData')`, `spinner.tsx` uses `t('flux.common.loading')`, `cards-renderer.tsx` uses `t('flux.common.noData')`, `diff-view` components consistently use `t()` for all user-facing strings.
- **Industry Practice**: Project convention (established across all packages): all user-facing strings use `t()` from `@nop-chaos/flux-i18n`. Hardcoded strings fragment the i18n boundary and create an incomplete internationalization surface. When the UI language is set to Chinese via the i18n system, these 7 components will still show English fallback strings — the same class of issue as the icon-picker Chinese strings (Round 01, [视角9-01]).
- **User Impact**: Non-Chinese users see Chinese from icon-picker; Chinese users see English from these 7 content components. Any localization effort (e.g., Japanese, Korean) will miss these strings since they bypass the `t()` lookup entirely.
- **Suggestion**: Add `import { t } from '@nop-chaos/flux-i18n'` where missing (audio, video, carousel, json-view, qrcode) and replace each hardcoded string:
  - `'No audio source'` → `t('flux.audio.noSource')`
  - `'Audio failed to load'` → `t('flux.audio.loadError')`
  - `'No video source'` → `t('flux.video.noSource')`
  - `'Video failed to load'` → `t('flux.video.loadError')`
  - `'No items to display'` → `t('flux.carousel.noItems')`
  - `'Copy'` / `'Copied'` → `t('flux.common.copy')` / `t('flux.common.copied')`
  - `'Failed to load markdown content'` → `t('flux.markdown.loadError')`
  - `alt \|\| 'image'` → `alt || t('flux.common.imageFallback')`
  - `'QR code failed'` → `t('flux.qrcode.generateError')`
  - `'No value'` → `t('flux.qrcode.empty')`
- **Review Status**: 未复核

---

### [视角3-02] Icon-picker icon grid missing ARIA role and keyboard navigation grouping

- **File**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:168,201`
- **Evidence**:

  Trigger declares `aria-haspopup="listbox"` (line 168):

  ```tsx
  aria-haspopup="listbox"
  ```

  But the icon grid container has no matching role (lines 201):

  ```tsx
  <div className="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto p-2">
    {visibleIcons.length === 0 ? (
      // empty state
    ) : (
      visibleIcons.map((iconName) => (
        <button ... title={iconName} ...>
  ```

  The grid container lacks `role="listbox"` or `role="grid"`, and the individual buttons lack `role="option"` / `role="gridcell"`. The popover content (from shadcn `PopoverContent`) defaults to `role="dialog"`, creating an ARIA role mismatch: the trigger promises a `listbox` but the content is a `dialog`.

- **Severity**: LOW
- **Status**: The trigger `aria-haspopup="listbox"` is semantically inconsistent with the PopoverContent default `role="dialog"`. The 200+ icon buttons are rendered as a flat sequence of `<button>` elements with `title` but no `aria-label`, no `role` grouping, and no keyboard arrow navigation within the grid. Tab navigation cycles through every visible icon one-by-one rather than supporting grid-like arrow-key movement. Each button does have `title={iconName}` (partial screen reader support) and the search input provides filtering, which mitigates the grouping issue somewhat.
- **Industry Practice**: Icon pickers (e.g., Ant Design, shadcn/ui examples) typically use `role="listbox"` with `aria-label="Select icon"` on the container, `role="option"` on each icon, and `aria-selected` for the selected state. The `aria-haspopup` value on the trigger should match the popup role.
- **User Impact**: Screen reader users navigating the icon picker via arrow keys cannot navigate row-by-row. The flat button list provides no grouping context ("which icons section am I in?"). The ARIA role mismatch may cause some screen readers to misinterpret the popup content.
- **Suggestion**: (a) Add `role="listbox"` and `aria-label={t('flux.iconPicker.selectIcon')}` to the grid container. (b) Add `role="option"` and `aria-selected={isSelected}` to each icon button. (c) Change trigger to `aria-haspopup="dialog"` (since the popover contains a search input + grid) or add `role="dialog"` to the PopoverContent to match. (d) Consider enabling arrow-key navigation within the grid for keyboard power users.
- **Review Status**: 未复核

---

### [视角3-03] Carousel indicator buttons lack focus-visible ring

- **File**: `packages/flux-renderers-content/src/carousel.tsx:298-312`
- **Evidence**:
  ```tsx
  <button
    key={toSlideKey(item, index)}
    type="button"
    data-slot="carousel-indicator"
    data-index={index}
    data-active={index === activeIndex ? 'true' : undefined}
    aria-label={`Go to slide ${index + 1}`}
    onClick={() => api?.scrollTo(index)}
    className={cn(
      'h-2 w-2 rounded-full transition-colors',
      index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30',
    )}
  />
  ```
  No `focus-visible:ring-*` classes. The buttons are 8×8px dots (`h-2 w-2`) and the only visual indicator is `bg-primary` vs `bg-muted-foreground/30` for selected state. On keyboard focus, no ring appears.
- **Severity**: LOW
- **Status**: Same class of issue as [视角3-01] (icon-picker grid buttons). The carousel indicator dots have zero focus-visible indicator. The `aria-label` is present (good), and previous/next buttons (`CarouselPrevious`/`CarouselNext`) from shadcn/ui wrap the shadcn `Button` which includes built-in focus-visible ring. Only the custom indicator `<button>` elements are affected.
- **Industry Practice**: All interactive elements with `tabIndex >= 0` should show `focus-visible:ring-2 focus-visible:ring-ring`. The project's own `cards-renderer.tsx:181` and shadcn/ui `Button` both demonstrate this pattern.
- **User Impact**: Keyboard users tabbing to slide indicator dots see no focus marker. Combined with the tiny 8px target size, this creates a poor keyboard-navigation experience.
- **Suggestion**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-offset-1` to the button className.
- **Review Status**: 未复核

---

## Cross-Component Consistency Update

| Pattern                | Baseline                                                    | Round 01 Deviations                        | Round 02 Additions                                               |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Add button             | `variant="outline"` + `PlusIcon` + text                     | array-editor/key-value: text only          | —                                                                |
| Delete button          | `variant="ghost"` + `Trash2Icon` + `hover:text-destructive` | All consistent ✅                          | Still consistent ✅                                              |
| Reorder buttons        | `variant="ghost"` + `ChevronUpIcon`/`ChevronDownIcon`       | All consistent ✅                          | Still consistent ✅                                              |
| i18n usage             | `t()` from `@nop-chaos/flux-i18n`                           | icon-picker: hardcoded Chinese (4 strings) | **NEW**: 7 content files hardcode English fallback (10+ strings) |
| Focus-visible ring     | Required on all interactive elements                        | icon-picker grid buttons missing           | **NEW**: carousel indicator dots missing                         |
| ARIA grid/listbox role | Appropriate role + keyboard navigation                      | —                                          | **NEW**: icon-picker grid missing listbox role                   |

## Row-Level Fine-Grained Check Results

| Component        | Action buttons checked                                                                             | Verdict                                         |
| ---------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Array-editor row | Delete (`Trash2Icon` + `hover:text-destructive`), Move up/down (`ChevronUpIcon`/`ChevronDownIcon`) | ✅ Consistent with combo/input-table            |
| Key-value row    | Delete (`Trash2Icon` + `hover:text-destructive`), Move up/down (`ChevronUpIcon`/`ChevronDownIcon`) | ✅ Consistent with combo/input-table            |
| Alert close      | `XIcon` + `variant="ghost"` + `size="icon"`                                                        | ✅ Consistent with dialog/drawer close patterns |

## No New Findings

The following components were re-checked against Round 01's verified-clean status and remain clean with no additional issues found:

- **combo-renderer** (form-advanced) — re-checked delete/reorder/add patterns, all consistent
- **input-table-renderer** (form-advanced) — re-checked delete/reorder/add patterns, all consistent
- **alert-renderer** (content) — icon semantics correct per level; `aria-hidden="true"` on decorative icons; close button pattern consistent
- **status** (content) — Badge variant mapping correct; icon support via iconMap; `aria-hidden` on optional icons
- **progress** (content) — uses shadcn `Progress` primitive; value normalization safe
- **empty** (content) — correctly uses `t('flux.common.noData')`; structured via `EmptyPrimitive` sub-components
- **spinner** (content) — correctly uses `t('flux.common.loading')` via `aria-label={ariaLabel}` on the visual `Spinner`
- **card** (content) — `onClick` with proper `role`/`tabIndex` for interactive cards; header/body/footer structure clean
- **diff-view** (content) — all sub-components use `t()`; three-column/split/unified views handle empty state via `t('flux.diff.noChanges')`
- **link** (content) — `aria-disabled` for disabled state; `rel="noopener noreferrer"` for `_blank` targets; security-aware
- **mapping** (content) — three states (empty/hit/miss) tracked via `data-state`; proper null/undefined handling
- **separator** (content) — decorative prop correctly sets `aria-hidden` + `role="none"`; label-orientation coherence guard
- **html** (content) — DOMPurify gate; `data-trusted` marker when sanitize disabled
- **image** (content) — loading/error/empty states handled; preview dialog; lazy loading with IntersectionObserver fallback; keyboard handler for interactive mode; proper `role="button"` + `tabIndex`
- **cards-renderer** (content) — `role="list"` on container; `role="listitem"` + `aria-selected` on cards; `focus-visible:ring-2` on card items; `t('flux.common.noData')` for empty state
- **Audio/Video** (content) — consistent pattern with `<figure>` + `<figcaption>` structure; `data-state` (empty/error); error event surface; same minor i18n issue noted above
- **condition-builder** (form-advanced) — not re-visited (already 0 findings in R01)

## Summary

| Component    | Round 01                                  | Round 02 Additions                     | Total |
| ------------ | ----------------------------------------- | -------------------------------------- | ----- |
| icon-picker  | 2 (hardcoded Chinese, focus-visible ring) | 1 (ARIA role mismatch)                 | 3     |
| array-editor | 1 (add button missing PlusIcon)           | 0                                      | 1     |
| key-value    | 1 (add button missing PlusIcon)           | 0                                      | 1     |
| audio        | 0                                         | 1 (i18n: 2 strings)                    | 1     |
| video        | 0                                         | 1 (i18n: 2 strings)                    | 1     |
| carousel     | 0                                         | 2 (i18n: 1 string, focus-visible ring) | 2     |
| json-view    | 0                                         | 1 (i18n: 2 strings)                    | 1     |
| markdown     | 0                                         | 1 (i18n: 1 string)                     | 1     |
| image        | 0                                         | 1 (i18n: 1 string)                     | 1     |
| qrcode       | 0                                         | 1 (i18n: 2 strings)                    | 1     |
| All others   | 0                                         | 0                                      | 0     |
