# Conformance Audit 02: Validation, Action, Theme

Date: 2026-03-29

## Baseline Documents

- `docs/architecture/form-validation.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/theme-compatibility.md`

## Findings

### 1) `validateOn: change` is gated by `touched`

Severity: High

Requirement summary:

- Validation timing (`validateOn`) and error visibility (`showErrorOn`) are separate axes.
- `change` trigger should control validation execution timing directly.

Evidence:

- `packages/flux-renderers-form/src/field-utils.tsx:96` only validates on change when `currentForm.isTouched(name)` is already true.

Impact:

- Fields configured to validate on change effectively behave closer to blur/touched-dependent validation.
- Violates documented decoupling of validation timing and visibility timing.

Recommendation:

- If `shouldValidateOn(name, currentForm, 'change')` is true, execute `validateField(name)` directly on change.
- Continue to gate error display through `showErrorOn` logic only.

---

### 2) Theme root class naming drift (`na-theme-root` vs `nop-theme-root`)

Severity: High

Requirement summary:

- Theme architecture defines `.na-theme-root` as canonical root.

Evidence:

- `apps/playground/src/App.tsx:43` uses `nop-theme-root`.
- `packages/flux-react/src/dialog-host.tsx:54` and `packages/flux-react/src/dialog-host.tsx:79` use `nop-theme-root`.
- `packages/nop-debugger/src/panel.tsx:7` styles are attached to `.nop-theme-root`.

Impact:

- Host integration docs and real integration hooks diverge.
- Theme troubleshooting and migration scripts become error-prone.

Recommendation:

- Normalize to `.na-theme-root` as primary selector.
- Optionally keep dual selector compatibility in transition window.

---

### 3) Token naming drift (`--na-*` / `--fd-*` expected, `--nop-*` active)

Severity: High

Requirement summary:

- Shared tokens should use `--na-*`.
- Flow Designer tokens should use `--fd-*` (typically derived from `--na-*`).

Evidence:

- `apps/playground/src/styles.css:53` defines `.nop-theme-root` with large `--nop-*` token set.
- `packages/nop-debugger/src/panel.tsx:8` defines/consumes `--nop-debugger-*` tokens.

Impact:

- Theming contract is not aligned with documented host-facing API.
- Delays true host-level theme consistency.

Recommendation:

- Introduce `--na-*` as canonical surface.
- Introduce `--fd-*` mapping in Flow Designer package root.
- Keep `--nop-*` as temporary alias map only.

---

### 4) Flow Designer root/theme and stable visuals still inline

Severity: Medium

Requirement summary:

- Flow Designer should mount `.fd-theme-root`.
- Stable visual styles (colors, backdrop, shadows) should prefer class/CSS token approach over inline style.

Evidence:

- `packages/flow-designer-renderers/src/designer-page.tsx:188` root class lacks `fd-theme-root`.
- `packages/flow-designer-renderers/src/designer-page.tsx:188` to `packages/flow-designer-renderers/src/designer-page.tsx:199` include stable visual inline styles (background, blur surfaces).

Impact:

- Host-level theming leverage is reduced.
- Visual customization remains partly hard-coded in renderer JSX.

Recommendation:

- Add `.fd-theme-root` to package root container.
- Move stable visuals into package CSS/tokens; keep inline styles for geometry/runtime-calculated values only.

## Conforming Areas (checked)

### A) Action dispatch chain already includes built-in, component-targeted, and namespaced stages

Evidence:

- `packages/flux-runtime/src/action-runtime.ts:374` to `packages/flux-runtime/src/action-runtime.ts:389` shows ordered handling: built-in -> component -> namespaced.

Assessment:

- Direction is consistent with action-scope model; remaining work is mainly doc-level consistency and naming normalization.

### B) `ActionSchema` supports `args` and component targeting fields

Evidence:

- `packages/flux-core/src/types.ts:781` to `packages/flux-core/src/types.ts:807` includes `args`, `componentId`, `componentName`, etc.

Assessment:

- Core type surface supports documented extension model.
