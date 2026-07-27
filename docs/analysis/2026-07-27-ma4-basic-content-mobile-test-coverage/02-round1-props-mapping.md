# Round 1: Renderer → Test Mapping & Contract Coverage Gaps

> Date: 2026-07-27
> Scope: flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-content, flux-renderers-mobile
> Method: Read all test files per package (glob `**/*.test.{ts,tsx}` + `**/__tests__/**`); cross-reference against Phase 1 contract baseline
> Dedup: MA3.2 F1-F9, OA-14..OA-17, DV-DISP-01..DV-DISP-04, H1/P0-1/P0-2/P0-3, bug notes #33/#42/#49/#60/#65, MA4.1 F01-F22 excluded

## 1. flux-renderers-basic (43 test files, 17 renderers)

### Renderer → Test Mapping

| Renderer                  | Type             | Test files covering it                                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B1 - Page**             | page             | `basic-page-layout.test.tsx`, `basic-page-layout-surfaces.test.tsx`, `basic-page-and-layout-structure.test.tsx`, `basic-page-and-tabs-status.test.tsx`, `page-responsive.test.tsx`, `page-aside-resizable.test.tsx`, `event-handler-contract.test.tsx`                                     |
| **B2 - Container**        | container        | `event-handler-contract.test.tsx`, `basic-coverage-gaps.test.tsx`, `basic-structural.test.tsx`                                                                                                                                                                                             |
| **B3 - Fragment**         | fragment         | `basic-structural.test.tsx` (data + isolate), `basic-coverage-gaps.test.tsx` (empty body)                                                                                                                                                                                                  |
| **B4 - Loop**             | loop             | `basic-structural.test.tsx` (scope params, keyBy, nested)                                                                                                                                                                                                                                  |
| **B5 - Recurse**          | recurse          | `basic-structural.test.tsx` (maxDepth, scope inheritance)                                                                                                                                                                                                                                  |
| **B6 - Flex**             | flex             | `flex-responsive.test.tsx`, `basic-coverage-gaps.test.tsx` (utils)                                                                                                                                                                                                                         |
| **B7 - Text**             | text             | `text-icon-visual-fields.test.tsx`, `text-maxline-toggle.test.tsx`, `basic-renderer-contracts.test.ts` (static fields)                                                                                                                                                                     |
| **B8 - Button**           | button           | `button-count-down.test.tsx`, `button-href.test.tsx`, `button-enhancements.test.tsx`, `button-tooltip-placement.test.tsx`, `button-touch-adaptation.test.tsx`, `component-handles-button.test.tsx`, `event-handler-contract.test.tsx`, `basic-renderer-contracts.test.ts` (static)         |
| **B9 - Icon**             | icon             | `icon-size-token.test.tsx`, `basic-class-alias-and-icon-markers.test.tsx`                                                                                                                                                                                                                  |
| **B10 - Badge**           | badge            | `basic-coverage-gaps.test.tsx` (level variants, undefined text)                                                                                                                                                                                                                            |
| **B11 - ScopeDebug**      | scope-debug      | `basic-reactions.test.tsx`, `scope-debug.test.tsx`                                                                                                                                                                                                                                         |
| **B12 - DynamicRenderer** | dynamic-renderer | `basic-dynamic-renderer.test.tsx`, `dynamic-renderer-refresh-race.test.tsx`, `dynamic-renderer-compile-once.test.ts`, `dynamic-renderer-lexical.test.tsx`                                                                                                                                  |
| **B13 - Reaction**        | reaction         | `basic-reactions.test.tsx`, `reaction.test.tsx`                                                                                                                                                                                                                                            |
| **B14 - Dialog**          | dialog           | `component-handles-surface.test.tsx` (open/close/toggle), `surface-enhancements.test.tsx`                                                                                                                                                                                                  |
| **B15 - Drawer**          | drawer           | `component-handles-surface.test.tsx` (open/close/toggle), `surface-enhancements.test.tsx`                                                                                                                                                                                                  |
| **B16 - Tabs**            | tabs             | `basic-tabs-behavior.test.tsx`, `tabs-controlled-value-matrix.test.tsx`, `tabs-owner-lifecycle.test.tsx`, `tabs-responsive.test.tsx`, `tabs-candidate-fix.test.tsx`, `basic-page-and-tabs-status.test.tsx`, `event-handler-contract.test.tsx`, `basic-renderer-contracts.test.ts` (static) |

### Gaps by Contract Domain

#### Props with `allowSource`, `sourceStateKey`, `lazyEval`

| #     | Renderer     | Prop                  | Test Status | Gap Severity | Description                                                                                          |
| ----- | ------------ | --------------------- | ----------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| GB-01 | Text (B7)    | `text` (allowSource)  | ❌ Untested | P2           | `allowSource` enables per-item text resolution via source state; only static string `text` is tested |
| GB-02 | Loop (B4)    | `itemData` (lazyEval) | ❌ Untested | P2           | `lazyEval` deferred itemData resolution — tests default to eager evaluation                          |
| GB-03 | Recurse (B5) | `itemData` (lazyEval) | ❌ Untested | P2           | Same as GB-02; lazy eval not exercised for recursive structures                                      |

#### Events (onClick, onChange, onOpen, onClose, onConfirm)

| #     | Renderer     | Event       | Test Status | Gap Severity | Description                                                                                                        |
| ----- | ------------ | ----------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| GB-04 | Dialog (B14) | `onOpen`    | ❌ Untested | P2           | Dialog onOpen event dispatched via action — only component:open action tested, not the declarative onOpen callback |
| GB-05 | Dialog (B14) | `onClose`   | ❌ Untested | P2           | Same — only component:close action tested                                                                          |
| GB-06 | Dialog (B14) | `onConfirm` | ❌ Untested | P2           | Confirm button event payloads (surfaceId/kind/open)                                                                |
| GB-07 | Drawer (B15) | `onOpen`    | ❌ Untested | P2           | Event payloads not validated                                                                                       |
| GB-08 | Drawer (B15) | `onClose`   | ❌ Untested | P2           |                                                                                                                    |
| GB-09 | Drawer (B15) | `onConfirm` | ❌ Untested | P2           |                                                                                                                    |

#### Regions

| #     | Renderer       | Region                    | Test Status | Gap Severity | Description                                                                    |
| ----- | -------------- | ------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------ |
| GB-10 | Loop (B4)      | `empty`                   | ❌ Untested | P2           | Empty region when items is empty/absent                                        |
| GB-11 | Flex (B6)      | `items` vs `body`         | ❌ Untested | P3           | `items` region vs `body` region rendering distinction untested                 |
| GB-12 | Page (B1)      | `title` (value-or-region) | ❌ Untested | P3           | Only body/footer regions tested; title, header, aside regions untested         |
| GB-13 | Page (B1)      | `aside`                   | ⚠️ Partial  | P2           | `aside` tested for resizable layout but slot naming (left vs right) not tested |
| GB-14 | Container (B2) | `header`/`footer`         | ❌ Untested | P3           | Only body region tested                                                        |

#### Capabilities (component capabilities like focus, clear, open, close)

| #     | Renderer              | Capability              | Test Status | Gap Severity | Description                                                                                                          |
| ----- | --------------------- | ----------------------- | ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| GB-15 | DynamicRenderer (B12) | `refresh`               | ❌ Untested | P2           | `component:refresh` on dynamic-renderer never tested (only data-source refresh tested)                               |
| GB-16 | Button (B8)           | `focus`                 | ✅ Tested   | —            | component-handles-button covers focus                                                                                |
| GB-17 | Dialog (B14)          | `open`/`close`/`toggle` | ✅ Tested   | —            | component-handles-surface covers all three                                                                           |
| GB-18 | Drawer (B15)          | `open`/`close`/`toggle` | ✅ Tested   | —            |                                                                                                                      |
| GB-19 | Tabs (B16)            | `setValue`/`getValue`   | ⚠️ Partial  | P2           | Static contract (basic-renderer-contracts.test.ts) declares them; no runtime test calls `component:setValue` on tabs |

#### Ownership contracts

| #     | Renderer   | Ownership        | Test Status | Gap Severity | Description                                                                                                                    |
| ----- | ---------- | ---------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| GB-20 | Tabs (B16) | `valueOwnership` | ✅ Tested   | —            | Matrix tested: local/controlled/defaultValue/numeric-index/string-key                                                          |
| GB-21 | Tabs (B16) | `valueStatePath` | ⚠️ Partial  | P2           | Status path writeback tested (basic-page-and-tabs-status) but scope-path ownership readback via `valueStatePath` not validated |

#### Other significant gaps

| #     | Renderer       | Contract                                         | Test Status | Gap Severity | Description                                                                                  |
| ----- | -------------- | ------------------------------------------------ | ----------- | ------------ | -------------------------------------------------------------------------------------------- |
| GB-22 | Page (B1)      | `collectDescendantValidation`                    | ❌ Untested | P1           | Core page validation contract — forms inside page expected to bubble up validation state     |
| GB-23 | Page (B1)      | `$page` scope injection                          | ❌ Untested | P2           | `$page` is documented as injected into child scope; no test reads `$page.*`                  |
| GB-24 | Page (B1)      | `subTitle`, `remark`                             | ❌ Untested | P3           | Display props                                                                                |
| GB-25 | Page (B1)      | `asideResizable` + `asideSticky` + min/max width | ⚠️ Partial  | P2           | Resizable tested (page-aside-resizable) but `asideSticky` + `minWidth`/`maxWidth` not tested |
| GB-26 | Page (B1)      | `modalContainer`                                 | ❌ Untested | P2           | Dialog mount target configuration                                                            |
| GB-27 | Button (B8)    | `loading` state UI                               | ❌ Untested | P2           | `loading` prop visual state not tested                                                       |
| GB-28 | Button (B8)    | `block`, `size`                                  | ❌ Untested | P3           | Block full-width, size variants not tested at runtime                                        |
| GB-29 | Button (B8)    | `active` state                                   | ❌ Untested | P3           | Active/pressed visual state                                                                  |
| GB-30 | Button (B8)    | `disabledTip`                                    | ❌ Untested | P3           | Tooltip on disabled button                                                                   |
| GB-31 | Text (B7)      | `copyable`                                       | ❌ Untested | P2           | Clipboard API interaction                                                                    |
| GB-32 | Tabs (B16)     | `closable`                                       | ❌ Untested | P2           | Tab close button + close behavior                                                            |
| GB-33 | Tabs (B16)     | `draggable`                                      | ❌ Untested | P2           | Tab reorder                                                                                  |
| GB-34 | Tabs (B16)     | `addable`                                        | ❌ Untested | P2           | Tab add functionality                                                                        |
| GB-35 | Tabs (B16)     | `sidePosition`                                   | ❌ Untested | P3           | Side tabs positioning                                                                        |
| GB-36 | Dialog (B14)   | `confirm` (auto-generated confirm btn)           | ❌ Untested | P2           | Confirm button auto-generation contract                                                      |
| GB-37 | Dialog (B14)   | `showMask`, `closeOnEsc`, `closeOnOutsideClick`  | ❌ Untested | P2           | Mask and dismiss behavior                                                                    |
| GB-38 | Dialog (B14)   | `statusPath`                                     | ❌ Untested | P2           | Status path publication for dialog state                                                     |
| GB-39 | Drawer (B15)   | `side`, `resizable`, `closeOnOutside`            | ❌ Untested | P2           | Drawer-specific props                                                                        |
| GB-40 | Reaction (B13) | `once`                                           | ❌ Untested | P2           | One-shot reaction                                                                            |
| GB-41 | Reaction (B13) | `debounce`                                       | ❌ Untested | P2           | Debounced reaction evaluation                                                                |
| GB-42 | Icon (B9)      | `size`, `color` runtime                          | ❌ Untested | P3           | Only static class/token test exists                                                          |

---

## 2. flux-renderers-form (62 test files, 21 renderers)

### Renderer → Test Mapping

| Renderer                 | Type            | Test files covering it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1 - Form**            | form            | `form-renderer-lifecycle.test.tsx`, `form-renderer-contracts.test.ts`, `form-renderer-definition-contracts.test.ts`, `form-submit-actions.semantic.test.tsx`, `form-submit-actions.values.test.tsx`, `form-submit-actions.data-expression.test.tsx`, `form-submit-actions.parent-scope.test.tsx`, `form-validation-rules.test.tsx`, `form-validation-ui.test.tsx`, `form-loadaction.test.tsx`, `form-status-publication.test.tsx`, `form-shell-enhancements.test.tsx`, `form-render-performance.test.tsx`, `form-init-inflight-race.test.tsx`, `form-field-handlers.test.tsx`, `form-markers-contract.test.tsx`, `hidden-field-policy.test.tsx`, `form-renderers-css.test.ts` |
| **F2 - Fieldset**        | fieldset        | `fieldset-renderer-contracts.test.ts`, `fieldset-interaction.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **F3-F8 - Input**        | input-\*        | `input-text-enhancements.test.tsx`, `input-controlled-value.test.tsx`, `input-reset-resync.test.tsx`, `input-validation-drift.test.tsx`, `input-classname-contract.test.tsx`, `input-touch-adaptation.test.tsx`, `input-source-state.test.tsx`, `input-password-reveal.test.tsx`, `input-number.test.tsx`, `input-number-long-press.test.tsx`, `input-number-precision-mode.test.tsx`, `textarea-enhancements.test.tsx`, `input-suggest.test.tsx`, `component-handles-input.test.tsx`, `component-handle-contracts.test.ts`                                                                                                                                                   |
| **F9 - Select**          | select          | `select-enhancements.test.tsx`, `select-option-template.test.tsx`, `select-option-template-click.test.tsx`, `select-remote-search.test.tsx`, `select-responsive.test.tsx`, `select-virtual-filter.test.tsx`, `select-dict-loading.test.tsx`, `select-controlled-value-echo.test.tsx`, `input-source-state.test.tsx`                                                                                                                                                                                                                                                                                                                                                           |
| **F10 - Checkbox**       | checkbox        | `boolean-control-value-contract.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F11 - Switch**         | switch          | `boolean-control-value-contract.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F12 - RadioGroup**     | radio-group     | `boolean-control-value-contract.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F13 - CheckboxGroup**  | checkbox-group  | `checkbox-group-selection.test.tsx`, `boolean-control-value-contract.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **F14 - InputDate**      | input-date      | `input-date.test.tsx`, `input-date-relative.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **F15 - InputDatetime**  | input-datetime  | `input-datetime.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F16 - InputTime**      | input-time      | `input-time.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **F17 - DateRange**      | date-range      | `date-range.test.tsx`, `input-period.test.tsx`, `m07-period-dispatch.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **F18 - InputMonth**     | month-period    | `input-period.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **F19 - InputQuarter**   | quarter-period  | `input-period.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **F20 - InputYear**      | year-period     | `input-period.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **F21 - MarkdownEditor** | markdown-editor | `markdown-editor.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Gaps by Contract Domain

#### Props with `allowSource`, `sourceStateKey`, `lazyEval`

| #     | Renderer            | Prop                                    | Test Status | Gap Severity | Description                                                            |
| ----- | ------------------- | --------------------------------------- | ----------- | ------------ | ---------------------------------------------------------------------- |
| GF-01 | Select (F9)         | `options` (allowSource, sourceStateKey) | ✅ Tested   | —            | input-source-state + select-dict-loading cover source state resolution |
| GF-02 | RadioGroup (F12)    | `options` (allowSource)                 | ❌ Untested | P3           | allowSource resolution for radio group options never tested            |
| GF-03 | CheckboxGroup (F13) | `options` (allowSource)                 | ❌ Untested | P3           | allowSource for checkbox group options never tested                    |

#### Events

| #     | Renderer  | Event             | Test Status | Gap Severity | Description                                                                               |
| ----- | --------- | ----------------- | ----------- | ------------ | ----------------------------------------------------------------------------------------- |
| GF-04 | Form (F1) | `onValidateError` | ❌ Untested | P2           | Form validation error callback not tested (onSubmitSuccess/onSubmitError are tested)      |
| GF-05 | Form (F1) | `initAction`      | ❌ Untested | P1           | Initialization action lifecycle before form render; only `loadAction` + `autoLoad` tested |

#### Regions

| #     | Renderer     | Region                          | Test Status | Gap Severity | Description                                                                           |
| ----- | ------------ | ------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------- |
| GF-06 | Input fields | `label` (value-or-region)       | ⚠️ Partial  | P2           | Label rendered via FieldFrame but value-or-region dual path (prop vs region) untested |
| GF-07 | Input fields | `description` (value-or-region) | ❌ Untested | P3           | Description as region not tested                                                      |
| GF-08 | Input fields | `hint` (value-or-region)        | ❌ Untested | P3           | Hint as region not tested                                                             |

#### Capabilities

| #     | Renderer     | Capability              | Test Status | Gap Severity | Description                                                                      |
| ----- | ------------ | ----------------------- | ----------- | ------------ | -------------------------------------------------------------------------------- |
| GF-09 | Form (F1)    | `submit`                | ✅ Tested   | —            | component:submit tested                                                          |
| GF-10 | Form (F1)    | `validate`              | ✅ Tested   | —            |                                                                                  |
| GF-11 | Form (F1)    | `reset`                 | ⚠️ Partial  | P2           | Reset action tested via input-reset-resync but not via `component:reset` on form |
| GF-12 | Form (F1)    | `setValues`/`getValues` | ⚠️ Partial  | P2           | `setValues` tested via reaction; `getValues` not tested                          |
| GF-13 | Input fields | `clear`                 | ✅ Tested   | —            | component-handles-input                                                          |
| GF-14 | Input fields | `reset`                 | ✅ Tested   | —            | component-handles-input                                                          |
| GF-15 | Input fields | `focus`                 | ✅ Tested   | —            | component-handle-contracts                                                       |

#### Ownership contracts

| #     | Renderer  | Ownership                 | Test Status | Gap Severity | Description                                                                  |
| ----- | --------- | ------------------------- | ----------- | ------------ | ---------------------------------------------------------------------------- |
| GF-16 | Form (F1) | `$form` scope export      | ❌ Untested | P2           | `$form` scope variable documented but never read in tests                    |
| GF-17 | Form (F1) | `valuesPath`/`statusPath` | ⚠️ Partial  | P2           | statusPath tested (form-status-publication); valuesPath writeback not tested |

#### Other significant gaps

| #     | Renderer              | Contract                               | Test Status | Gap Severity | Description                                                                                                                |
| ----- | --------------------- | -------------------------------------- | ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| GF-18 | Form (F1)             | `submitOnChange` debounce              | ❌ Untested | P1           | Auto-submit on field change with debounce timing                                                                           |
| GF-19 | Form (F1)             | `preventEnterSubmit`                   | ❌ Untested | P2           | Enter key prevention logic                                                                                                 |
| GF-20 | Form (F1)             | `scrollToFirstError`                   | ❌ Untested | P2           | Scroll-to-first-error behavior on validation failure                                                                       |
| GF-21 | Form (F1)             | `columnCount` grid mode                | ❌ Untested | P2           | Multi-column form layout                                                                                                   |
| GF-22 | Form (F1)             | `mode` (normal/horizontal/inline)      | ❌ Untested | P2           | Form layout modes                                                                                                          |
| GF-23 | Form (F1)             | `static` propagation                   | ❌ Untested | P2           | Static mode propagation to child fields                                                                                    |
| GF-24 | Form (F1)             | FieldFrame aria injection              | ❌ Untested | P1           | `aria-labelledby`/`aria-describedby`/`aria-errormessage`/`aria-invalid` wiring through FieldFrame (accessibility contract) |
| GF-25 | Fieldset (F2)         | `columnCount` grid                     | ❌ Untested | P3           | Multi-column fieldset layout                                                                                               |
| GF-26 | Select (F9)           | `groups` for grouped options           | ❌ Untested | P2           | Optgroup rendering                                                                                                         |
| GF-27 | Select (F9)           | `dict`                                 | ⚠️ Partial  | P3           | select-dict-loading tests dict loading but not dict→options transformation                                                 |
| GF-28 | Input-number (F7)     | `precisionMode` edge values            | ⚠️ Partial  | P2           | Basic precision tested; negative/zero/NaN edge cases untested                                                              |
| GF-29 | Date fields (F14-F20) | `valueFormat`/`displayFormat` mismatch | ❌ Untested | P2           | When valueFormat != displayFormat, display shows formatted but value keeps raw; no test for the roundtrip                  |
| GF-30 | Date fields (F14-F20) | `utc` flag behavior                    | ❌ Untested | P2           | UTC conversion tested? Need check                                                                                          |

---

## 3. flux-renderers-form-advanced (93+ test files, 18 renderers)

### Renderer → Test Mapping

| Renderer                  | Type              | Test files covering it                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1 - IconPicker**       | icon-picker       | `icon-picker.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **A2 - ArrayEditor**      | array-editor      | `form-array-validation.test.tsx`, `array-keyvalue-min-max-reorder.test.tsx`, `b32-array-combo-nested-isolation.test.tsx`, `b32-array-submit-and-validate.test.tsx`, `b32-v6-row-relative.test.tsx`, `composite-form.test.tsx`                                                                                                                                                                                                                                             |
| **A3 - ArrayField**       | array-field       | `composite-field/array-field.test.tsx`, `composite-field/array-field-runtime.test.ts`, `composite-field/array-field-schema-coverage.test.tsx`, `composite-field/array-field-object-items.test.tsx`, `composite-form-object-array.test.tsx`                                                                                                                                                                                                                                |
| **A4 - Combo**            | combo             | `combo-renderer.test.tsx`, `b32-combo-remove-when.test.tsx`, `b32-array-combo-nested-isolation.test.tsx`                                                                                                                                                                                                                                                                                                                                                                  |
| **A5 - ConditionBuilder** | condition-builder | 17+ test files in `condition-builder/`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **A6 - DetailField**      | detail-field      | `detail-view/detail-field-basic.test.tsx`, `detail-view/detail-field-commit.test.tsx`, `detail-view/detail-field-unmount.test.tsx`, `detail-view/value-adaptation-helper.test.ts`                                                                                                                                                                                                                                                                                         |
| **A7 - DetailView**       | detail-view       | `detail-view/detail-view-basic.test.tsx`, `detail-view/detail-view.test.tsx`, `detail-view/detail-view-transform.test.tsx`, `detail-view/detail-view-transform-concurrency.test.tsx`                                                                                                                                                                                                                                                                                      |
| **A8 - Editor**           | editor            | `editor-renderer.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **A9 - InputFile**        | input-file        | `upload-field.test.tsx`, `upload-file-enhancements.test.tsx`, `g1-g11-picker-upload.test.tsx`                                                                                                                                                                                                                                                                                                                                                                             |
| **A10 - InputImage**      | input-image       | `upload-field.test.tsx` (partial)                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **A11 - InputTable**      | input-table       | `input-table-renderer.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **A12 - KeyValue**        | key-value         | `key-value.test.tsx`, `array-keyvalue-min-max-reorder.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                           |
| **A13 - ObjectField**     | object-field      | `composite-field/object-field-render.test.tsx`, `composite-field/object-field-transform.test.tsx`, `composite-field/object-field-scope.test.tsx`, `composite-field/object-field-runtime.test.ts`                                                                                                                                                                                                                                                                          |
| **A14 - Picker**          | picker            | `picker-renderer.test.tsx`, `g1-g11-picker-upload.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                               |
| **A15 - TagList**         | tag-list          | `tag-list.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **A16 - Transfer**        | transfer          | `transfer-renderer.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **A17 - TreeControl**     | tree-\*           | `tree-structure.test.tsx`, `tree-lazy-children.test.tsx`, `tree-values.test.tsx`, `tree-async-lifecycle.test.tsx`, `tree-cascade.test.tsx`, `tree-select-responsive.test.tsx`, `tree-remote-search.test.tsx`, `tree-virtualization.test.tsx`, `tree-enable-node-path.test.tsx`, `component-handles-tree.test.tsx`, `form-tree-control-source-states.test.tsx`, `form-tree-value-binding.test.tsx`, `form-tree-ui-markers.test.tsx`, `form-tree-checkbox-fields.shared.ts` |
| **A18 - VariantField**    | variant-field     | `variant-field.test.tsx`, `variant-field-detection.test.tsx`, `variant-field-transform.test.tsx`, `variant-field-matching.test.ts`, `variant-field-selector.test.tsx`, `variant-field-field-frame.test.tsx`, `variant-field-owner-contract.test.tsx`, `variant-field-unmount.test.tsx`, `variant-field-runtime.test.ts`                                                                                                                                                   |

### Gaps by Contract Domain

#### Props with `allowSource`, `sourceStateKey`

| #     | Renderer          | Prop                             | Test Status | Gap Severity | Description                                                                  |
| ----- | ----------------- | -------------------------------- | ----------- | ------------ | ---------------------------------------------------------------------------- |
| GA-01 | TagList (A15)     | `source`/`options` (allowSource) | ❌ Untested | P2           | Source-driven options resolution not tested                                  |
| GA-02 | Transfer (A16)    | `source`/`options` (allowSource) | ❌ Untested | P2           | Source-driven options for dual-list not tested                               |
| GA-03 | Picker (A14)      | `source`/`options` (allowSource) | ⚠️ Partial  | P2           | Picker tested for schema rendering but source-driven options path not tested |
| GA-04 | TreeControl (A17) | `source`/`options` (allowSource) | ✅ Tested   | —            | form-tree-control-source-states                                              |

#### Capabilities

| #     | Renderer       | Capability                     | Test Status | Gap Severity | Description                                                            |
| ----- | -------------- | ------------------------------ | ----------- | ------------ | ---------------------------------------------------------------------- |
| GA-05 | Picker (A14)   | Component handle (open dialog) | ⚠️ Partial  | P2           | Picker tested for dialog rendering but not via `component:open` action |
| GA-06 | InputFile (A9) | Component handles              | ❌ Untested | P2           | File upload capabilities not exposed/tested via component handles      |

#### InputFile/InputImage specific gaps

| #     | Renderer         | Contract                                                | Test Status | Gap Severity | Description                                        |
| ----- | ---------------- | ------------------------------------------------------- | ----------- | ------------ | -------------------------------------------------- |
| GA-07 | InputFile (A9)   | `uploadAction` progress states                          | ❌ Untested | P2           | Upload progress/success/error UI states not tested |
| GA-08 | InputFile (A9)   | `downloadBtn`                                           | ❌ Untested | P3           | Download button behavior                           |
| GA-09 | InputFile (A9)   | `fileField`/`nameField`/`valueField`/`urlField` mapping | ❌ Untested | P2           | Custom field name mapping for file value           |
| GA-10 | InputImage (A10) | `crop`/`cropFormat`/`cropQuality`                       | ❌ Untested | P2           | Image crop dialog and settings                     |
| GA-11 | InputImage (A10) | `limit`                                                 | ❌ Untested | P3           | Image count limits                                 |

#### Other significant gaps

| #     | Renderer              | Contract                                 | Test Status | Gap Severity | Description                                                                                |
| ----- | --------------------- | ---------------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------ |
| GA-12 | ConditionBuilder (A5) | `scrollOnFocus`                          | ❌ Untested | P3           | Auto-scroll to focused condition                                                           |
| GA-13 | Editor (A8)           | `language`/`theme`/`fontSize`/`readOnly` | ⚠️ Partial  | P2           | Editor tested for basic render but code language/theme settings not validated              |
| GA-14 | DetailField (A6)      | `value` expression evaluation            | ⚠️ Partial  | P2           | DetailField value binding tested but expression-based `value` from scope not tested        |
| GA-15 | InputTable (A11)      | Column edit validation                   | ❌ Untested | P2           | Inline editing validation per column                                                       |
| GA-16 | VariantField (A18)    | FieldFrame bypass (F4)                   | ⚠️ Partial  | P2           | variant-field-field-frame tests FieldFrame interaction; bypass finding is MA3.2 F4 (dedup) |

---

## 4. flux-renderers-data (80+ test files, 9 renderers)

### Renderer → Test Mapping

| Renderer            | Type        | Test files covering it (representative)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1 - Table**      | table       | `data-table.test.tsx`, `data-table-columns.test.tsx`, `data-table-row-scope-identity.test.tsx`, `data-table-pagination-selection.test.tsx`, `data-table-pagination-clamp.test.tsx`, `data-table-b33-source-refresh-anchor.test.tsx`, `table-data-and-layout.test.tsx`, `table-responsive.test.tsx`, `table-auto-fill-height.test.tsx`, `table-selection-invariants.test.tsx`, `table-selection-phantom-prune.test.tsx`, `table-body-rows-virtual.test.tsx`, `table-click-dispatch-priority.test.tsx`, `table-row-drag-sort-persist.test.tsx`, `table-row-drag-sort.test.tsx`, `table-e1c-*.test.tsx` (7 files), `use-table-controls.*.test.tsx` (4 files), `toggle-on-row-click.test.tsx`, `table-cell-popover.test.tsx`, `table-expandable-when.test.tsx`, `table-quick-edit-*.test.tsx` (4 files), `table-t11-lazy-children.test.tsx`, `table-t28-dynamic-columns.test.tsx`, `table-b33-advanced-boundary.test.tsx`, `table-pagination-pages.test.ts`, `table-row-key-resolution.test.ts`, `crud-selection-and-features.test.tsx`, `table-tree-selection-*.test.tsx` (2 files) |
| **D2 - DataSource** | data-source | `data-source.test.tsx`, `data-source-capabilities.test.tsx`, `crud-loadaction.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **D3 - Chart**      | chart       | `chart-renderer.unit.test.tsx`, `chart-renderer-config.unit.test.tsx`, `chart-responsive.test.tsx`, `data-chart-handles.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **D4 - Tree**       | tree        | `data-tree-rendering-and-status.test.tsx`, `data-tree-interaction.test.tsx`, `data-tree-large-render.test.tsx`, `tree-display-ux.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **D5 - List**       | list        | `data-list-rendering.test.tsx`, `list-pagination-infinite.test.tsx`, `list-cross-page-key.test.tsx`, `list-responsive.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **D6 - Pagination** | pagination  | `data-pagination-rendering.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **D7 - Statistics** | statistics  | `data-package-units.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **D8 - CRUD**       | crud        | `data-crud-rendering.test.tsx`, `data-crud-source-runtime.test.tsx`, `data-crud-request-owned.test.tsx`, `data-crud-quick-edit.test.tsx`, `data-crud-header-forwarding.test.tsx`, `crud-lifecycle.test.tsx`, `crud-binding-and-status.test.tsx`, `crud-list-mode.test.tsx`, `crud-responsive.test.tsx`, `crud-selection-and-features.test.tsx`, `crud-selection-drift-*.test.*` (3 files), `crud-loadaction.test.tsx`, `crud-loadaction-ajax.test.tsx`, `crud-loadaction-reaction-regression.test.tsx`, `crud-query-and-pagination.test.tsx`, `crud-confirm-gate.test.tsx`, `crud-item-card-compile-contract.test.ts`, `crud-renderer-state.unit.test.tsx`, `crud-b33-nested-isolation.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                 |

### Gaps by Contract Domain

#### Props with `allowSource`

| #     | Renderer  | Prop                         | Test Status | Gap Severity | Description                            |
| ----- | --------- | ---------------------------- | ----------- | ------------ | -------------------------------------- |
| GD-01 | CRUD (D8) | `source` (allowSource)       | ✅ Tested   | —            | data-crud-source-runtime               |
| GD-02 | List (D5) | `items` (expression binding) | ✅ Tested   | —            | Standard expression-based items tested |

#### Events

| #     | Renderer        | Event                 | Test Status | Gap Severity | Description                                                                                                       |
| ----- | --------------- | --------------------- | ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| GD-03 | DataSource (D2) | `onSuccess`/`onError` | ❌ Untested | P1           | H1 finding — events are compiled into artifact but never consumed/delivered. No test validates the contract path. |
| GD-04 | Chart (D3)      | `onClick`/`onHover`   | ❌ Untested | P2           | Chart click/hover events never tested — baseline lists them but zero tests fire them                              |
| GD-05 | CRUD (D8)       | `onError`             | ❌ Untested | P2           | CRUD onError event tested? Not found in loadaction tests                                                          |

#### Regions

| #     | Renderer   | Region                              | Test Status | Gap Severity | Description                                                |
| ----- | ---------- | ----------------------------------- | ----------- | ------------ | ---------------------------------------------------------- |
| GD-06 | Table (D1) | `empty` (value-or-region)           | ❌ Untested | P2           | Empty table state rendering                                |
| GD-07 | Table (D1) | `loading` (value-or-region)         | ❌ Untested | P2           | Custom loading state rendering                             |
| GD-08 | Table (D1) | `header`/`footer` (value-or-region) | ❌ Untested | P2           | Custom table header/footer via region                      |
| GD-09 | Chart (D3) | `title`/`empty` (value-or-region)   | ❌ Untested | P2           | Chart title/empty as regions not tested                    |
| GD-10 | List (D5)  | `empty` (value-or-region)           | ❌ Untested | P2           | Empty list rendering                                       |
| GD-11 | CRUD (D8)  | `card`/`item` region params         | ✅ Tested   | —            | crud-item-card-compile-contract validates compile contract |

#### Capabilities

| #     | Renderer        | Capability                                        | Test Status | Gap Severity | Description                                                            |
| ----- | --------------- | ------------------------------------------------- | ----------- | ------------ | ---------------------------------------------------------------------- |
| GD-12 | DataSource (D2) | `refresh`/`cancel`/`start`                        | ✅ Tested   | —            | data-source-capabilities                                               |
| GD-13 | Table (D1)      | `refresh`                                         | ✅ Tested   | —            | data-table-b33-source-refresh-anchor                                   |
| GD-14 | Table (D1)      | `getSelection`/`setSelection`                     | ✅ Tested   | —            | use-table-controls.selection                                           |
| GD-15 | CRUD (D8)       | `refresh`                                         | ✅ Tested   | —            |                                                                        |
| GD-16 | CRUD (D8)       | `getSelection`/`clearSelection`/`toggleSelection` | ✅ Tested   | —            | crud-selection-and-features                                            |
| GD-17 | CRUD (D8)       | `loadMore`                                        | ❌ Untested | P2           | loadMore capability for CRUD list mode with infinite scroll            |
| GD-18 | List (D5)       | `gotoPage`/`getPagination`                        | ❌ Untested | P2           | List pagination capabilities via component handles                     |
| GD-19 | Chart (D3)      | `resize`                                          | ❌ Untested | P2           | P0-3 — resize is documented no-op; no test verifies the no-op behavior |

#### Ownership contracts

| #     | Renderer   | Ownership                                                                    | Test Status | Gap Severity | Description                                                                                         |
| ----- | ---------- | ---------------------------------------------------------------------------- | ----------- | ------------ | --------------------------------------------------------------------------------------------------- |
| GD-20 | Table (D1) | `paginationOwnership`                                                        | ✅ Tested   | —            | use-table-controls.pagination                                                                       |
| GD-21 | Table (D1) | `selectionOwnership`                                                         | ✅ Tested   | —            | use-table-controls.selection                                                                        |
| GD-22 | Table (D1) | `sortOwnership`                                                              | ✅ Tested   | —            | use-table-controls.sort-filter-expand                                                               |
| GD-23 | Table (D1) | `filterOwnership`                                                            | ✅ Tested   | —            |                                                                                                     |
| GD-24 | Table (D1) | `columnWidthsOwnership`                                                      | ✅ Tested   | —            | table-e1c-column-widths-persistence                                                                 |
| GD-25 | Table (D1) | `orderOwnership`                                                             | ✅ Tested   | —            | table-e1c-row-drag-sort                                                                             |
| GD-26 | CRUD (D8)  | `paginationOwnership`/`selectionOwnership`/`sortOwnership`/`filterOwnership` | ✅ Tested   | —            | crud-selection-and-features + crud-query-and-pagination                                             |
| GD-27 | List (D5)  | `paginationOwnership` (local)                                                | ✅ Tested   | —            | list-pagination-infinite (local tested; controlled/scope not tested)                                |
| GD-28 | List (D5)  | `paginationOwnership` (controlled/scope)                                     | ❌ Untested | P2           | Only local ownership tested; controlled via `paginationStatePath` and scope ownership not validated |

#### Other significant gaps

| #     | Renderer        | Contract                                      | Test Status | Gap Severity | Description                                                                                    |
| ----- | --------------- | --------------------------------------------- | ----------- | ------------ | ---------------------------------------------------------------------------------------------- |
| GD-29 | Table (D1)      | `affixHeader`/`prefixRow`/`affixRow`          | ❌ Untested | P2           | Fixed table header/prefix/affix rows                                                           |
| GD-30 | Table (D1)      | `combineNum`/`combineFromIndex`               | ❌ Untested | P2           | Cell merging                                                                                   |
| GD-31 | Table (D1)      | `showHeader`                                  | ❌ Untested | P3           | Hiding table header                                                                            |
| GD-32 | Table (D1)      | `bordered`/`stripe`                           | ❌ Untested | P3           | Visual variants                                                                                |
| GD-33 | Table (D1)      | `virtualThreshold`                            | ❌ Untested | P2           | Virtual scrolling threshold                                                                    |
| GD-34 | Table (D1)      | `childrenSource`/`rowChildrenField`           | ❌ Untested | P2           | Async children loading for tree table                                                          |
| GD-35 | CRUD (D8)       | `autoGenerateQueryForm`                       | ❌ Untested | P2           | Auto-generated query form from columns                                                         |
| GD-36 | CRUD (D8)       | `clientMode`                                  | ❌ Untested | P2           | Client-side filtering/sorting                                                                  |
| GD-37 | CRUD (D8)       | `syncLocation`                                | ❌ Untested | P2           | URL sync for CRUD state                                                                        |
| GD-38 | CRUD (D8)       | `autoJumpToTopOnPagerChange`                  | ❌ Untested | P2           | Auto-scroll on page change                                                                     |
| GD-39 | CRUD (D8)       | `dataStatePath`/`totalField`                  | ❌ Untested | P2           | CRUD data path mapping                                                                         |
| GD-40 | CRUD (D8)       | `columnSettings`                              | ❌ Untested | P3           | Per-user column settings                                                                       |
| GD-41 | Chart (D3)      | Lazy-load rendering                           | ❌ Untested | P2           | LazyChartRenderer lazy-load (Suspense/fallback) not tested                                     |
| GD-42 | Chart (D3)      | `series`/`chartType` config → ECharts options | ⚠️ Partial  | P2           | Config tested (chart-renderer-config.unit) but rendering + option transformation not validated |
| GD-43 | DataSource (D2) | `interval`/`stopWhen` (polling)               | ❌ Untested | P2           | Polling lifecycle not tested independently (only via CRUD polling orchestration)               |
| GD-44 | DataSource (D2) | `mergeToScope`/`mergeStrategy`/`mergeKey`     | ❌ Untested | P2           | Data merge into scope not tested                                                               |
| GD-45 | DataSource (D2) | `dependsOn` reactivity                        | ❌ Untested | P2           | Dependent data-source re-fetch when dependency changes                                         |
| GD-46 | Pagination (D6) | `pageSizeOptions`/`mode`                      | ❌ Untested | P3           | H1 finding — pagination variants                                                               |
| GD-47 | Pagination (D6) | `statusPath`                                  | ❌ Untested | P2           | H1 finding — statusPath readback                                                               |
| GD-48 | Tree (D4)       | `showGuideLine`                               | ❌ Untested | P3           | Tree guide lines                                                                               |
| GD-49 | Tree (D4)       | `expandOnClickNode`                           | ❌ Untested | P3           | Click-to-expand toggle                                                                         |
| GD-50 | Statistics (D7) | `total` prop display                          | ✅ Tested   | —            | data-package-units covers basic rendering                                                      |

---

## 5. flux-renderers-content (32 test files, 20 renderers)

### Renderer → Test Mapping

| Renderer            | Type                  | Test file(s)                                                                                                                                                                        |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1 - Separator**  | separator             | `separator.test.tsx`                                                                                                                                                                |
| **C2 - Spinner**    | spinner               | `spinner.test.tsx`                                                                                                                                                                  |
| **C3 - Progress**   | progress              | `progress.test.tsx`                                                                                                                                                                 |
| **C4 - Empty**      | empty                 | `empty.test.tsx`                                                                                                                                                                    |
| **C5 - Card**       | card                  | `card.test.tsx`                                                                                                                                                                     |
| **C6 - Link**       | link                  | `link.test.tsx`                                                                                                                                                                     |
| **C7 - Image**      | image                 | `image.test.tsx`, `image-fetcher.test.tsx`                                                                                                                                          |
| **C8 - JsonView**   | json-view             | `json-view.test.tsx`                                                                                                                                                                |
| **C9 - Markdown**   | markdown              | `markdown.test.tsx`, `markdown-src.test.tsx`, `markdown-reactivity.test.tsx`                                                                                                        |
| **C10 - Html**      | html                  | `html.test.tsx`, `sanitize.test.ts`                                                                                                                                                 |
| **C11 - Cards**     | cards                 | `cards-renderer.test.tsx`, `cards-selection-itemaction.test.tsx`                                                                                                                    |
| **C12 - Alert**     | alert                 | `alert-renderer.test.tsx`                                                                                                                                                           |
| **C13 - Mapping**   | mapping               | `mapping.test.tsx`, `mapping-source.test.tsx`                                                                                                                                       |
| **C14 - Status**    | status                | `status.test.tsx`                                                                                                                                                                   |
| **C15 - Audio**     | audio                 | `audio.test.tsx`                                                                                                                                                                    |
| **C16 - Video**     | video                 | `video.test.tsx`                                                                                                                                                                    |
| **C17 - Carousel**  | carousel              | `carousel.test.tsx`, `carousel-autoplay.test.tsx`                                                                                                                                   |
| **C18 - QrCode**    | qrcode                | `qrcode.test.tsx`                                                                                                                                                                   |
| **C19 - DiffView**  | diff-view             | `diff-view/__tests__/diff-view-renderer.test.tsx`, `diff-view/__tests__/diff-core.test.ts`, `diff-view/__tests__/diff-cross-file.test.tsx`, `diff-view/__tests__/diff-3way.test.ts` |
| **C20 - Reactions** | (diff-view reactions) | Not tested                                                                                                                                                                          |

### Gaps by Contract Domain

#### Events

| #     | Renderer       | Event                                            | Test Status | Gap Severity | Description                                                               |
| ----- | -------------- | ------------------------------------------------ | ----------- | ------------ | ------------------------------------------------------------------------- |
| GC-01 | Carousel (C17) | `onChange`                                       | ❌ Untested | P2           | Carousel slide change event never tested                                  |
| GC-02 | DiffView (C19) | `onLineClick`                                    | ❌ Untested | P2           | Line click event never tested                                             |
| GC-03 | DiffView (C19) | `onHunkExpand`                                   | ❌ Untested | P2           | Hunk expand event never tested                                            |
| GC-04 | DiffView (C19) | Reactions (toggleViewType/expandAll/collapseAll) | ❌ Untested | P1           | DV-DISP-03 — reaction actions defined but zero tests for their invocation |

#### Regions

| #     | Renderer       | Region                    | Test Status | Gap Severity | Description                   |
| ----- | -------------- | ------------------------- | ----------- | ------------ | ----------------------------- |
| GC-05 | Separator (C1) | `label` (value-or-region) | ❌ Untested | P3           | Label region not tested       |
| GC-06 | Spinner (C2)   | `label` (value-or-region) | ❌ Untested | P3           | Label region not tested       |
| GC-07 | Progress (C3)  | `label` (value-or-region) | ❌ Untested | P3           | Label region not tested       |
| GC-08 | JsonView (C8)  | `empty` (value-or-region) | ❌ Untested | P3           | Empty state region not tested |
| GC-09 | Html (C10)     | `empty` (value-or-region) | ❌ Untested | P3           | Empty state region not tested |
| GC-10 | Audio (C15)    | `title` (value-or-region) | ❌ Untested | P3           | Title region not tested       |
| GC-11 | Video (C16)    | `title` (value-or-region) | ❌ Untested | P3           | Title region not tested       |
| GC-12 | QrCode (C18)   | `label` (value-or-region) | ❌ Untested | P3           | Label region not tested       |

#### Capabilities

| #     | Renderer       | Capability                                               | Test Status | Gap Severity | Description                                                                                            |
| ----- | -------------- | -------------------------------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| GC-13 | DiffView (C19) | `toggleViewType`/`setViewType`/`expandAll`/`collapseAll` | ❌ Untested | P1           | DV-DISP-03 — these are documented reactions but never verified via component handle or action dispatch |

#### Props with untested edge cases

| #     | Renderer           | Prop                                | Test Status | Gap Severity | Description                                                                                                              |
| ----- | ------------------ | ----------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| GC-14 | Carousel (C17)     | `interval`                          | ❌ Untested | P2           | Auto-play interval value not tested (carousel-autoplay tests autoPlay on/off but not interval duration)                  |
| GC-15 | Carousel (C17)     | `loop`                              | ❌ Untested | P3           | Carousel loop behavior                                                                                                   |
| GC-16 | QrCode (C18)       | `size`                              | ❌ Untested | P3           | QR code pixel size                                                                                                       |
| GC-17 | QrCode (C18)       | `level` (L/M/Q/H)                   | ❌ Untested | P2           | Error correction level mapping                                                                                           |
| GC-18 | QrCode (C18)       | `foreground`/`background`           | ❌ Untested | P3           | QR color customization                                                                                                   |
| GC-19 | DiffView (C19)     | `language`                          | ❌ Untested | P3           | Syntax highlighting language                                                                                             |
| GC-20 | DiffView (C19)     | `files`/`activeFileIndex`           | ❌ Untested | P2           | DV-DISP-02 — multi-file diff navigation never tested (these fields exist in schema but no test validates file switching) |
| GC-21 | DiffView (C19)     | `defaultCollapsedLines`/`wrapLines` | ❌ Untested | P3           | Collapse/line-wrap configuration                                                                                         |
| GC-22 | Pack (All content) | Static definition contracts         | ✅ Tested   | —            | content-renderer-definitions.test.tsx covers declaration contracts                                                       |

---

## 6. flux-renderers-mobile (10 test files, 5 renderers)

### Renderer → Test Mapping

| Renderer                | Type            | Test file(s)                                                                                |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| **M1 - PullRefresh**    | pull-refresh    | `pull-refresh.test.tsx` (528 lines), `__tests__/pull-refresh-geometry.test.tsx` (163 lines) |
| **M2 - InfiniteScroll** | infinite-scroll | `infinite-scroll.test.tsx` (203 lines), `infinite-scroll-advanced.test.tsx`                 |
| **M3 - SwipeCell**      | swipe-cell      | `swipe-cell.test.tsx` (520 lines)                                                           |
| **M4 - Countdown**      | countdown       | `countdown.test.tsx` (523 lines)                                                            |
| **M5 - NoticeBar**      | notice-bar      | `notice-bar.test.tsx` (573 lines)                                                           |

### Gaps by Contract Domain

**NOTE**: OA-14..OA-17 findings are already deduped. The following are additional gaps.

#### Events

| #     | Renderer       | Event              | Test Status | Gap Severity | Description                   |
| ----- | -------------- | ------------------ | ----------- | ------------ | ----------------------------- |
| GM-01 | SwipeCell (M3) | `onAction`         | ✅ Tested   | —            | Tested at swipe-cell.test.tsx |
| GM-02 | SwipeCell (M3) | `onOpen`/`onClose` | ✅ Tested   | —            | Tested                        |

#### Capabilities

No component capability contracts defined for mobile renderers in baseline.

#### Ownership contracts

None defined for mobile renderers in baseline.

#### Other significant gaps

| #     | Renderer            | Contract                                          | Test Status | Gap Severity | Description                                                                                                    |
| ----- | ------------------- | ------------------------------------------------- | ----------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| GM-03 | PullRefresh (M1)    | PTR text states (pulling/loosing/success) display | ✅ Tested   | —            | Tested via data-indicator-text assertions                                                                      |
| GM-04 | PullRefresh (M1)    | `disabled` prop                                   | ❌ Untested | P2           | disabled state — touch events suppressed when disabled=true                                                    |
| GM-05 | SwipeCell (M3)      | `closeOnOutside`                                  | ❌ Untested | P2           | closeOnOutside click behavior never validated                                                                  |
| GM-06 | SwipeCell (M3)      | `disabled` prop                                   | ❌ Untested | P2           | Swipe disabled — gestures suppressed                                                                           |
| GM-07 | InfiniteScroll (M2) | `disabled` prop                                   | ❌ Untested | P3           | Intersection observer disabled                                                                                 |
| GM-08 | InfiniteScroll (M2) | `distance` threshold edge values                  | ❌ Untested | P3           | Distance = 0, negative, or extremely large values                                                              |
| GM-09 | Countdown (M4)      | `autoStart: false`                                | ❌ Untested | P2           | Countdown that doesn't start automatically (paused at mount)                                                   |
| GM-10 | Countdown (M4)      | `millisecond: true` display format                | ⚠️ Partial  | P3           | formatCountdown tested with SSS but the millisecond prop effect on countdown timer tick granularity not tested |
| GM-11 | NoticeBar (M5)      | Multi-text carousel with `scrollable: false`      | ⚠️ Partial  | P2           | OA-15 — basic carousel tested but switching between texts when scrollable=false not validated                  |
| GM-12 | NoticeBar (M5)      | `speed` edge values                               | ❌ Untested | P3           | Speed = 0 or negative                                                                                          |

---

## 7. Summary of Gap Severity Distribution

| Severity | Count | Notable                                                                                                                                                                                                                           |
| -------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | 5     | Form FieldFrame aria (GF-24), DataSource onSuccess/onError (GD-03), CRUD submitOnChange (GF-18), DiffView reactions (GC-04/GC-13), Page collectDescendantValidation (GB-22)                                                       |
| **P2**   | 53    | Tab closable/draggable/addable (GB-32..34), Dialog/Drawer event payloads (GB-04..09), Chart onClick/onHover (GD-04), Loop/Recurse lazyEval (GB-02/03), Mobile disabled states (GM-04/06), CRUD clientMode/syncLocation (GD-36/37) |
| **P3**   | 22    | Visual variant props, region patterns, edge-case values                                                                                                                                                                           |

---

## 8. Recommended Test Additions

### P1 Priority

| Rec | Gap(s)   | Recommended Test                                                                                             | Description                                                                                                   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| R1  | GB-22    | Page renders form with `collectDescendantValidation` → validation status propagates to page toolbar          | Render page → form → field; trigger field validation; assert page-level validation state                      |
| R2  | GF-24    | FieldFrame renders `aria-labelledby`/`aria-describedby`/`aria-errormessage`/`aria-invalid` matching field id | Create form with input having label+hint+error; assert DOM aria attributes                                    |
| R3  | GF-18    | Form with `submitOnChange` triggers submitAction after debounce delay                                        | Set submitOnChange: true, change a field value, assert submitAction fires after debounce period               |
| R4  | GD-03    | DataSource with `onSuccess`/`onError` events compiled into artifact path                                     | Compile data-source schema; assert artifact contains onSuccess/onError handlers; optionally wire mock handler |
| R5  | GC-04/13 | DiffView reactions: `toggleViewType`/`setViewType`/`expandAll`/`collapseAll`                                 | Mount diff-view schema; dispatch each reaction; assert viewType attr / collapsed lines change                 |

### P2 Priority (selected)

| Rec | Gap(s)    | Recommended Test                                                                        | Description                                                                                                               |
| --- | --------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| R6  | GB-02/03  | Loop/Recurse with `lazyEval: true` on `itemData` resolves data lazily                   | Set lazyEval + itemData that references parent scope; assert parent scope changes re-evaluate itemData                    |
| R7  | GB-04..09 | Dialog event `onOpen` fires with surfaceId/kind/open payload                            | Mount dialog with onOpen handler; open via declarative change or action; assert handler called with correct payload shape |
| R8  | GB-32     | Tabs `closable: true` renders close button, clicking it removes tab                     | Render tabs with closable + onChange; click close; assert item removed and onChange fires                                 |
| R9  | GB-33     | Tabs `draggable: true` enables drag reorder                                             | Render tabs with draggable; simulate drag-and-drop; assert items reordered                                                |
| R10 | GD-04     | Chart `onClick`/`onHover` wired through ECharts events                                  | Mount chart; simulate ECharts click/hover via chart instance; assert handler called                                       |
| R11 | GD-27/28  | List `paginationOwnership: 'controlled'` via `paginationStatePath` writes back to scope | Render list with paginationStatePath; change page; assert scope data at path updated                                      |
| R12 | GD-43     | DataSource `interval` polling re-fetches + `stopWhen` condition stops                   | Set interval + stopWhen expression; assert fetcher called repeatedly then stops when condition met                        |
| R13 | GD-44     | DataSource `mergeToScope` merges data with `mergeStrategy`/`mergeKey`                   | Set mergeToScope with mergeStrategy: 'merge' / 'override' / 'union'; assert scope data shape                              |
| R14 | GD-35     | CRUD `autoGenerateQueryForm` produces fields from column definitions                    | Set autoGenerateQueryForm: true; assert query form region renders input for each column name                              |
| R15 | GB-40     | Reaction `once: true` fires only one time                                               | Set once + watch on incrementing value; trigger twice; assert action fires only once                                      |
| R16 | GB-41     | Reaction with `debounce: 300ms` batches rapid changes                                   | Set watch + debounce; change value rapidly; assert action fires once after debounce                                       |
| R17 | GC-01     | Carousel `onChange` fires when slide changes (auto or manual)                           | Mount carousel; slide changes programmatically or via indicator click; assert onChange with new index                     |
| R18 | GC-20     | DiffView `files` array with `activeFileIndex` switches displayed diff                   | Mount diff-view with multi-file schema; change activeFileIndex; assert shown diff changes                                 |
| R19 | GA-07     | InputFile `uploadAction` progress/success/error UI states                               | Mock uploadAction; simulate progress event; assert progress bar displays; simulate error; assert error state              |
| R20 | GM-04     | PullRefresh `disabled: true` suppresses touch response                                  | Mount disabled pull-refresh; simulate pull gesture; assert onRefresh not called, status remains normal                    |

---

## 9. Package Coverage Summary

| Package                      | Renderers | Test Files | Coverage Strength                                                | Key Weaknesses                                                                                                                                                                  |
| ---------------------------- | --------- | ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-basic         | 17        | 43         | Strong: Button, Tabs, Dialog/Drawer, DynamicRenderer             | Page contracts (collectDescendantValidation, aside), Reaction debounce/once, Loop lazyEval, Text copyable, Tabs closable/draggable                                              |
| flux-renderers-form          | 21        | 62         | Strong: Form lifecycle, input validation, select, dates          | Form FieldFrame aria, submitOnChange, submit/validate caps via component handle, mode/columnCount, $form scope                                                                  |
| flux-renderers-form-advanced | 18        | 93+        | Strong: ConditionBuilder, Tree, VariantField, DetailView         | InputFile/InputImage upload states & crop, Picker search + pickerSchema, TagList/Transfer source-driven options                                                                 |
| flux-renderers-data          | 9         | 80+        | Very strong: Table, CRUD, selection, pagination ownership matrix | Chart onClick/onHover, DataSource onSuccess/onError polling/merge/dependsOn, List pagination ownership (controlled/scope), Table affixRow/combineNum/virtualThreshold           |
| flux-renderers-content       | 20        | 32         | Good: Image, Video/Audio, Cards, Mapping, Status, Markdown, Html | DiffView reactions + multi-file navigation + line events, Carousel onChange/interval/loop, QrCode level/size, value-or-region patterns for separator/spinner/progress/json-view |
| flux-renderers-mobile        | 5         | 10         | Good: all 5 renderers have comprehensive unit tests              | SwipeCell closeOnOutside + disabled, PullRefresh disabled, InfiniteScroll disabled + distance edge values, NoticeBar speed edge cases, Countdown autoStart:false                |
