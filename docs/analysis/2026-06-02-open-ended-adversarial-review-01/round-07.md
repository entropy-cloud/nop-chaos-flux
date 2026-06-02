# Open-Ended Adversarial Review — 2026-06-02 — Round 07

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: nested surface stacking, E2E test coverage, accessibility static analysis, file upload/download  
**Discovery source**: sub-agent scans of 4 previously untouched codebase dimensions

---

## Finding 1: Drawer overlay uses `z-40` while all other surface overlays use `z-50`, contradicting documented design principle and creating a fragile stacking tier

**Severity**: Medium

**Where**:

- `packages/ui/src/components/ui/drawer.tsx:95` — overlay: `'z-40 bg-surface-overlay ...'`
- `packages/ui/src/components/ui/dialog.tsx:93` — overlay: `'z-50 bg-surface-overlay ...'`
- `packages/ui/src/components/ui/alert-dialog.tsx:24` — overlay: `'z-50 bg-surface-overlay ...'`
- `packages/ui/src/components/ui/sheet.tsx:30` — overlay: `'z-50 bg-surface-overlay ...'`
- Design doc at `docs/architecture/surface-owner.md:137-144` — states no artificial stacking tiers across surfaces

**What**:  
The Drawer overlay's z-index (`z-40`) is a full 10 levels below every other surface overlay (Dialog, AlertDialog, Sheet all use `z-50`). Furthermore, the Drawer's own content viewport sits at `z-50` (drawer.tsx:117) — meaning the Drawer **content** outranks its own **overlay** by 10 z-levels.

The design doc states: "不为不同 surface 人为制造额外 stacking context" and "同 family surface 的前后关系优先通过根 host 内的渲染顺序解决，而不是每次打开都递增 z-index" (surface-owner.md, lines 137-144). The `z-40` on Drawer overlay is an artificial extra stacking tier that directly contradicts this principle.

The theme-contract test (`theme-contract.test.tsx:49-56`) tests all four overlay types together but does not catch this z-index discrepancy.

**Why it matters**:  
If a Dialog (overlay z-50) opens while a Drawer is open, the Dialog's backdrop sits at z-50 — the same level as the Drawer's content viewport. Full visual stacking depends entirely on DOM order rather than z-index, which is fragile. More importantly, if the Drawer content contains positioned children with their own z-index values, the Drawer content at z-50 and the Drawer overlay at z-40 create a stacking context inversion that can cause visual layering bugs.

**Confidence**: Certain  
**Non-duplication note**: No prior round addressed CSS layering, z-index, or surface stacking. This is a purely visual/structural finding.

**Recommendation**:  
Change Drawer overlay to `z-50` to match all other surfaces, or (if the intent was for Drawer to be "below" other surfaces) document this as an intentional design choice and add a theme-contract test that asserts all surface overlays share the same z-index tier.

---

## Finding 2: No component in the UI library respects `prefers-reduced-motion` — systematic WCAG 2.3.3 compliance gap

**Severity**: Medium-High (WCAG 2.1 SC 2.3.3)

**Where**:

- `packages/ui/src/components/ui/dialog.tsx:93,154,160` — `duration-100`, `animate-in`, `fade-in-0`, `zoom-in-95`
- `packages/ui/src/components/ui/tooltip.tsx:41` — `animate-in`, `fade-in-0`, `zoom-in-95`
- `packages/ui/src/components/ui/popover.tsx:35` — same animation classes
- `packages/ui/src/components/ui/dropdown-menu.tsx:63` — same animation classes
- `packages/ui/src/components/ui/select.tsx:85` — same animation classes
- `packages/ui/src/components/ui/combobox.tsx:102` — same animation classes
- `packages/ui/src/components/ui/sheet.tsx:55` — `transition duration-200`, `data-starting-style:opacity-0`
- `packages/ui/src/components/ui/drawer.tsx:124-128` — `duration-300`, `animate-in`
- `packages/ui/src/components/ui/alert-dialog.tsx:46` — same animation classes
- `packages/ui/src/components/ui/accordion.tsx:55` — `animate-accordion-down/up`

**Every** animated component in `packages/ui/src/components/ui/` uses Tailwind animation utilities (`animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95`, `duration-*`, `transition`) with **zero** `motion-reduce:` variants. The experimental design doc `docs/experiments/v10/v10-vs-current-flux-comparison.md:335` explicitly states "Renderers respect `prefers-reduced-motion`" as a requirement — but this is not implemented in any component.

**Why it matters**:  
WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions) requires that users can disable non-essential motion animations. Users who set `prefers-reduced-motion: reduce` in their system/browser settings will still see all dialog opens, popover reveals, tooltip fades, sheet slides, drawer slides, accordion expansions, and dropdown animations at full speed — potentially triggering vestibular disorders or simply violating user preference. The requirement exists in the project's own design docs but was never wired into the component library.

**Confidence**: Certain  
**Non-duplication note**: The deep audit (2026-05-24) closed many accessibility issues in Workstream 6 but focused on form field ARIA attributes, keyboard navigation, and Flow Designer Canvas accessibility. It did not identify the systematic `prefers-reduced-motion` gap across all UI components.

**Recommendation**:  
Add `motion-reduce:transition-none motion-reduce:animate-none` to animated component class lists, or add a single global CSS rule:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Finding 3: Tree renderer does not publish `aria-multiselectable` or `aria-selected` in multi-select mode

**Severity**: Medium (WCAG 4.1.2 — Name, Role, Value)

**Where**:

- `packages/flux-renderers-data/src/tree-renderer.tsx:274` — `role="treeitem"` missing `aria-selected`
- `packages/flux-renderers-data/src/tree-renderer.tsx:511,527` — `role="tree"` missing `aria-multiselectable`

**What**:  
The tree renderer's root `role="tree"` element never receives `aria-multiselectable="true"` even when the tree is configured for multi-selection. Individual `role="treeitem"` nodes do not publish `aria-selected` state even though selected state is tracked internally via `selectedRowKeys`. Assistive technology (screen readers) cannot determine which items are selected or whether the tree supports multiple selection.

This was previously tagged as `维度20-03` (P3) in the deep audit at `docs/analysis/2026-05-24-deep-audit-full/20-accessibility.md` with the recommendation "当 multiple 为 true 时添加 aria-multiselectable，且每个 tree item 使用 aria-selected". It remains unresolved in the current codebase.

**Why it matters**:  
The ARIA Tree View Pattern (WAI-ARIA Authoring Practices) requires `aria-selected` on treeitem roles and `aria-multiselectable` on the tree role. Without these attributes, the tree is inaccessible to screen reader users for the most basic operation: knowing which items are selected. Since the tree's internal selection state is fully functional, this is purely a missing metadata bridge between the React state and the accessibility tree.

**Confidence**: Certain  
**Non-duplication note**: This was previously found in the deep audit but never addressed. It's worth filing as an active finding in this review because the gap persists across plans.

**Recommendation**:  
Add `aria-multiselectable` to the root `role="tree"` element when multi-select is enabled, and pass `aria-selected` to each `role="treeitem"` based on `selectedRowKeys.has(rowKey)`.

---

## Synthesis: Round Assessment

This round explored 4 new dimensions (surface stacking, E2E coverage, accessibility, file handling). File handling yielded nothing (feature does not exist). E2E coverage analysis produced important strategic observations but no code-level bug. Surface stacking and accessibility each produced concrete, verifiable code issues.

**Updated Final Tally**:

| Round     | New Findings    | Cumulative |
| --------- | --------------- | ---------- |
| 01        | 4               | 4          |
| 02        | 1               | 5          |
| 03        | (stop-check, 0) | 5          |
| 04        | 3               | 8          |
| 05        | 1               | 9          |
| 06        | 3               | 12         |
| 07        | 3               | 15         |
| **Total** | **15**          |            |

Explored dimensions count: **16 distinct codebase areas** across 7 rounds.

## Blind-Spot Self-Assessment

Remaining blind spots, increasingly narrow:

- Performance profiling (requires running benchmarks)
- CSS/Tailwind monorepo deep scanning (narrow, already partially checked)
- E2E test coverage gap remediation (strategic, not code-level)
- Undo/redo state management
- Drag-and-drop in Flow Designer
- WebSocket/realtime data paths
- Server-side rendering impact of the CodeMirror widget (single finding, narrow)
