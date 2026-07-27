# MA5.2 UI/UX — 基础+内容渲染器 UX 审计

> **Audit Date**: 2026-07-27
> **Plan Reference**: `docs/plans/2026-07-27-1900-1-ma5-ui-ux-audit.md`
> **Target Packages**: flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-content
> **Audit Methodology**: `docs/skills/ux-design-pattern-audit-prompt.md` + `check:audit-missing-renderer-markers`
> **Baseline**: Full verification GREEN at M0 (2026-07-27)

---

## Audit Summary

2 rounds of iterative discovery + independent review (fresh session sub-agent) analyzed all 5 packages across 12 UX perspectives. **6 findings total: 0 HIGH, 4 MEDIUM, 2 LOW. All retained after independent review.**

**`check:audit-missing-renderer-markers`**: 0 issues.

---

## MEDIUM Findings

### [M-01] Array-editor and Key-value add buttons missing PlusIcon

- **Files**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:566-597`, `key-value.tsx:601-628`
- **Severity**: MEDIUM
- **Status**: Add buttons render as plain text `variant="outline"` without `PlusIcon`. Sibling components `combo-renderer` and `input-table-renderer` correctly include `<PlusIcon className="size-4" />`.
- **User Impact**: Cross-component visual inconsistency in CRUD forms — some add buttons have icons, some don't.
- **Suggestion**: Add `<PlusIcon className="size-4" />` before label text in both files.

### [M-02] Icon-picker hardcoded Chinese strings (4 locations) instead of i18n t()

- **Files**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:191,204,236,249`
- **Severity**: MEDIUM
- **Status**: 4 hardcoded Chinese strings: placeholder `"搜索图标..."`, empty state `"无匹配项"`, show-more button `"显示更多"`, clear button `aria-label="清空"`. No `t()` import from `@nop-chaos/flux-i18n`.
- **User Impact**: Non-Chinese users see untranslated Chinese text. Component unusable for non-Chinese users.
- **Suggestion**: Replace all 4 strings with `t()` calls.

### [M-03] Icon-picker icon grid buttons lack focus-visible ring

- **Files**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:211-223`
- **Severity**: MEDIUM
- **Status**: Raw `<button>` elements with `hover:bg-accent` but no `focus-visible:ring-*`. Selected state has `ring-1 ring-primary`, but no focus indicator.
- **User Impact**: Keyboard users cannot see which icon is focused while tabbing through the picker.
- **Suggestion**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` to button className.

### [M-04] Content package hardcoded English fallback strings (10+ locations across 7 files)

- **Files**: `audio.tsx:47`, `video.tsx:57`, `carousel.tsx:228`, `json-view.tsx:90`, `markdown.tsx:85`, `image.tsx:199`, `qrcode.tsx:89`
- **Severity**: MEDIUM
- **Status**: 7 content components hardcode English fallback strings instead of using `t()`. Sibling components (empty, spinner, cards, diff-view) correctly use `t()`.
- **User Impact**: Chinese users see English from these components alongside Chinese from correctly-localized components.
- **Suggestion**: Replace all hardcoded English strings with `t()` calls.

---

## LOW Findings

### [L-01] Icon-picker icon grid missing ARIA role and keyboard navigation grouping

- **Files**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:168,201`
- **Severity**: LOW
- **Status**: Trigger declares `aria-haspopup="listbox"` but grid container has no `role="listbox"` and PopoverContent defaults to `role="dialog"` — ARIA role mismatch.
- **User Impact**: Screen reader users navigating the icon picker lack grouping context.
- **Suggestion**: Add `role="listbox"` to grid container, `role="option"` with `aria-selected` to buttons, change trigger to `aria-haspopup="dialog"`.

### [L-02] Carousel indicator buttons lack focus-visible ring

- **Files**: `packages/flux-renderers-content/src/carousel.tsx:298-312`
- **Severity**: LOW
- **Status**: Custom `<button>` indicator dots have no `focus-visible:ring-*`. 8×8px dots with only `bg-primary` vs `bg-muted-foreground/30` for state.
- **User Impact**: Keyboard users tabbing to indicator dots see no focus marker.
- **Suggestion**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` to button className.

---

## Assessment

| Perspective                | Verdict       | Key Issues                                                                                     |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| Icon Semantics (P1)        | ✅ Acceptable | 1 cross-component inconsistency (array-editor/key-value)                                       |
| Button Style (P2)          | ✅ Acceptable | Minor add-button icon inconsistency                                                            |
| State Indicators (P3)      | ✅ Acceptable | 2 focus-visible ring gaps (icon-picker, carousel)                                              |
| Form Interaction (P4)      | ✅ Acceptable | No issues                                                                                      |
| Loading/Empty States (P5)  | ✅ Acceptable | No issues                                                                                      |
| Dialog/Popover (P6)        | ✅ Acceptable | No issues                                                                                      |
| Color/Tokens (P7)          | ✅ Acceptable | No hardcoded colors found                                                                      |
| Spacing/Alignment (P8)     | ✅ Acceptable | No issues                                                                                      |
| ARIA (P9)                  | **at-risk**   | Icon-picker hardcoded Chinese + content 7-file English strings; icon-picker ARIA role mismatch |
| Cross-component (P10)      | **at-risk**   | Add button PlusIcon inconsistency; i18n fragmentation                                          |
| Product Completeness (P11) | ✅ Acceptable | No issues                                                                                      |
| Visual Originality (P12)   | ✅ Acceptable | No issues                                                                                      |

---

## Round Artifacts

- `docs/analysis/2026-07-27-ma5-ux/round-01.md` — 3 findings (3 MEDIUM)
- `docs/analysis/2026-07-27-ma5-ux/round-02.md` — 3 findings (1 MEDIUM, 2 LOW)
- `docs/analysis/2026-07-27-ma5-ux/review.md` — independent review: all 6 retained
- `docs/analysis/2026-07-27-ma5-ux/summary.md` — aggregated summary
