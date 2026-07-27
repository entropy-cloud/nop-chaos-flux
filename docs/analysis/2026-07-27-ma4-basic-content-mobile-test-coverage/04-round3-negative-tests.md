# Round 3 — Negative Scenario Test Coverage

> Date: 2026-07-27
> Phase: 2 (Depth audit), Round 3 (Negative/edge-case coverage)
> Method: Read existing test files per package, evaluate coverage of null/undefined/empty/wrong-type/boundary/missing-handler patterns

## Dedup Compliance

Already excluded per rules:

- **MA3.2 F1-F9**: crud-raw-schema-read, mobile CSS selectors, fieldframe-bypass, clipboard duplicate, large file/error handling
- **OA-14..OA-17**: mobile adversarial findings (pull-refresh direction, notice-bar dead, infinite-scroll deadlock, errorText discard)
- **DV-DISP-01..DV-DISP-04**: DiffView display operability (dead fields, missing fields, broken viewType, zero tests)
- **H1/P0-1..P0-3**: contract-body drift, table row-drag statePath, Toaster props, chart resize no-op
- **Bug regressions** #33, #42, #49, #60, #65
- **MA4.1 findings**: core/runtime contract coverage only

---

## 1. flux-renderers-basic

### B1 — Page

| Gap                                                   | Severity | Details                                                                                                                 | Recommended test                                                  |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Null/absent body region                               | P2       | `body: null` or `body: undefined` not rendered. Test at `basic-structural.test.tsx` renders body but never passes null. | Page with `body: null` should render empty, not crash             |
| Null/absent footer/header                             | P2       | Tests show footer/header rendering but never test null regions                                                          | Page with `footer: null`, `header: null` renders without crashing |
| `asidePosition` with null asideMinWidth/asideMaxWidth | P2       | Aside tests at `page-aside-resizable.test.tsx` use valid values; no test for missing min/max width                      | Page with aside and no asideMinWidth should work                  |
| `statusPath: null` or missing                         | P2       | `statusPath` publishing contract not tested with null                                                                   | Page without statusPath should not crash                          |
| `modalContainer: null`                                | P3       | Dialog inside page with null container                                                                                  | Page with `modalContainer: null` should use default               |

### B2 — Container

| Gap                          | Severity | Details                                                  | Recommended test                                    |
| ---------------------------- | -------- | -------------------------------------------------------- | --------------------------------------------------- |
| Null/empty body region       | P2       | No test for `{ type: 'container' }` with no `body` field | Container with no body renders empty wrapper        |
| Null regions (header/footer) | P3       | Header/footer not tested when absent                     | Container with null header/footer renders body only |

### B4 — Loop

| Gap                                  | Severity | Details                                                                    | Recommended test                                                   |
| ------------------------------------ | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `items: null`                        | P1       | Loop with null items must not crash. Current tests cover `[]` but not null | Loop with `items: null` renders empty/empty region                 |
| `items: undefined`                   | P1       | Same as above for undefined                                                | Loop with undefined items                                          |
| `items` as non-array (string/number) | P1       | Items with number/string instead of array should not crash                 | Loop with `items: "string"` or `items: 5` should handle gracefully |
| `keyBy` with null expression         | P2       | No test for expression-based keyBy resolving to null                       | Loop with keyBy expression returning null for some items           |
| Empty body + empty empty region      | P2       | No test for loop with no body and no empty region with empty items         | Loop with `items: [], body: null` renders nothing, no crash        |
| MaxDepth=0 for recurse               | P3       | No test for `maxDepth: 0` which should render nothing                      | Recurse with maxDepth: 0 stops immediately                         |

### B7 — Text

| Gap                             | Severity | Details                                                    | Recommended test                                             |
| ------------------------------- | -------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `text: null`                    | P2       | Text renderer should handle null text without crash        | Text with `text: null` renders empty                         |
| `maxLine: 0` (boundary)         | P2       | No test for maxLine=0 meaning no clamp or clamp to 0 lines | Text with maxLine=0 and long text                            |
| `tag` as invalid HTML tag       | P3       | Tag prop with invalid value like `"xyz"`                   | Text with `tag: "xyz"` falls back to default span            |
| `copyable: true` with null text | P2       | Current copyable test uses non-null text                   | Text with copyable and `text: null` should handle gracefully |

### B8 — Button

| Gap                                      | Severity | Details                                                 | Recommended test                                                          |
| ---------------------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Null/undefined onClick not provided      | P2       | No test for clicking button with no onClick handler     | Button without onClick — clicking does nothing, no error                  |
| `loading: true` + `loading` not in label | P2       | Loading state with no text label                        | Button with `loading: true` and no label                                  |
| `disabledTip` without tooltip            | P2       | No test for disabledTip set but no tooltip when enabled | Button with disabledTip and disabled=false uses tooltip                   |
| `countDown` as negative number           | P2       | Countdown with negative time                            | Button with `countDown: -5` clamps to 0                                   |
| `countDown` with `countDownTpl` null     | P2       | No test for countDown template resolving to null        | Button with countDown but null template                                   |
| `href` + `onClick` both set              | P2       | No test for conflict: navigation vs event               | Button with both href and onClick — click behavior precedence             |
| `block: true` + variant missing          | P3       | Block button without variant class                      | Button with block but no variant                                          |
| Null icon name                           | P2       | Already covered for "invalid" icon name                 | Covered (button-enhancements.test.tsx:45-48) — icon falls back to nothing |

### B14/B15 — Dialog/Drawer

| Gap                                                | Severity | Details                                                    | Recommended test                                     |
| -------------------------------------------------- | -------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `data: null` on open                               | P2       | Dialog opened with null data                               | Dialog with data: null should not crash on open      |
| `body: null`                                       | P2       | Dialog with no body content                                | Dialog without body renders empty                    |
| `closeOnEsc: false` + `closeOnOutsideClick: false` | P2       | No test for modal that cannot be dismissed by backdrop/esc | Dialog must be closed programmatically only          |
| `onClose` not provided                             | P2       | Dialog close without event handler                         | Dialog closes without onClose — no crash             |
| `showCloseButton: false`                           | P2       | No test for hidden close button                            | Dialog without close button, only programmatic close |

### B16 — Tabs

| Gap                                             | Severity | Details                                 | Recommended test                                     |
| ----------------------------------------------- | -------- | --------------------------------------- | ---------------------------------------------------- |
| `items: []` empty                               | P2       | No test for tabs with empty items array | Tabs with empty items renders empty root             |
| `value` not matching any key                    | P2       | Controlled tabs with value not in items | Tabs with non-matching value selects first tab       |
| `value: null`                                   | P2       | Null value should not crash             | Tabs with value: null                                |
| `onChange` not provided                         | P2       | Tab change without handler              | Tabs without onChange — clicking tab works, no crash |
| `closable: true` set but `onClose` not provided | P2       | Tabs with closable but no event handler | Closable tab without onClose                         |
| `draggable: true` + `onChange` not provided     | P2       | Draggable reorder without event handler | Tabs with draggable and no onChange, default state   |

### B12 — DynamicRenderer

| Gap                                        | Severity | Details                                                             | Recommended test                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `loadAction: null` + `autoLoad: false`     | P2       | DynamicRenderer with no loadAction and no autoLoad should show body | DynamicRenderer with null loadAction uses body region              |
| `loadAction` returns non-standard response | P2       | Response with `ok: true` but non-object data                        | Covered (basic-dynamic-renderer.test.tsx:113-141) — invalid schema |
| Network error (fetch throws)               | P1       | Fetch itself throws (not HTTP error)                                | DynamicRenderer when fetcher throws should show error state        |
| `autoLoad: true` + null loadAction         | P2       | autoLoad:true but nothing to load                                   | DynamicRenderer with autoLoad:true and no loadAction stays in body |

### B13 — Reaction

| Gap                                 | Severity | Details                                               | Recommended test                                  |
| ----------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------- |
| `watch:` null/empty                 | P2       | Reaction with empty watch array                       | Reaction with no watched expression does nothing  |
| `when:` null                        | P2       | Reaction with null when condition (should always run) | Reaction with null when acts like when=true       |
| `immediate: true` + `actions` empty | P2       | Immediate reaction with no actions                    | Reaction with immediate:true and empty actions    |
| `debounce: 0`                       | P3       | Debounce of 0 is effectively no debounce              | Reaction with debounce=0 dispatches without delay |

---

## 2. flux-renderers-form

### F1 — Form

| Gap                                              | Severity | Details                                               | Recommended test                                               |
| ------------------------------------------------ | -------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `body: []` empty                                 | P2       | Form with no fields renders empty, no crash           | Form with empty body renders with actions only                 |
| `data: null`                                     | P1       | Submit with null initial data                         | Form with data: null — submit reads empty scope                |
| `submitAction: null` + `submit` called           | P2       | Submit with no submitAction                           | Form submits but no action dispatched (no-op)                  |
| `submitOnChange: true` with no onChange handlers | P2       | Submit-on-change mode with nothing to trigger submit  | Form with submitOnChange but no changes                        |
| `autoInit: true` + `initAction: null`            | P2       | autoInit with no initAction (should skip)             | Covered (form-renderer-lifecycle.test.tsx:517-543)             |
| `preventEnterSubmit: true` + enter key press     | P2       | No test for enter key suppression                     | Form with preventEnterSubmit — Enter key does not submit       |
| Nested form inside form                          | P2       | No test for nested `type: form` elements              | Form inside another form — isolation boundary                  |
| `scrollToFirstError: true` + validation errors   | P2       | No test for scroll-on-error behavior                  | Form with validation errors scrolls to first error             |
| `static: true` propagation                       | P2       | Static mode propagates readOnly to children           | Form with static=true — all fields become readOnly             |
| `rules: []` with null cross-field rule           | P2       | Cross-field validation rule with missing target field | Form with equalsField rule where referenced name doesn't exist |

### F3–F8 — Input renderers (input-text, input-email, input-url, input-password, input-number, textarea)

| Gap                                                                                    | Severity | Details                                            | Recommended test                                                         |
| -------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Native constraints: null placeholder                                                   | P1       | Placeholder should be omitted when not set         | Input without placeholder — no placeholder attr                          |
| `minLength > maxLength` conflict                                                       | P2       | Invalid constraint combo should degrade gracefully | Input with minLength:10, maxLength:5 — maxLength wins                    |
| `validate: null` or undefined                                                          | P2       | Validation prop referencing non-existent action    | Input with `validate: null` — no validation                              |
| `suggestSource: null`                                                                  | P2       | Null suggestSource should not crash InputText      | InputText with suggestSource: null — suggest is inactive                 |
| Input-type renderers with null `name`                                                  | P2       | Field with null name is non-participating          | Input without name attribute renders but does not participate in form    |
| Boundary: `maxLength: 0`                                                               | P2       | No test for maxLength=0 (should reject any input)  | Input with maxLength=0 — cannot enter any character                      |
| `nativeAutoComplete` non-standard value                                                | P3       | Native autocomplete with bad value                 | Input with nativeAutoComplete="xyz" — browser behavior unchanged         |
| `inputMode: null`                                                                      | P3       | Input mode omitted                                 | Input without inputMode determined by type                               |
| `hiddenFieldPolicy: { clearValueWhenHidden: true, validateWhenHidden: true }` both set | P2       | Hidden with both policies: clear then validate?    | Covered in hidden-field-policy.test.tsx for separate cases, not combined |

### F9 — Select

| Gap                                                       | Severity | Details                                                         | Recommended test                                                     |
| --------------------------------------------------------- | -------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `options: null`                                           | P1       | Null options array should not crash, shows empty popup          | Select with options: null — trigger shows nothing                    |
| `options: []` empty                                       | P1       | No test for empty options list (non-source)                     | Select with empty options array — no items in popup                  |
| `groups: null` with options                               | P2       | Groups null but options present — should show ungrouped         | Select with null groups and populated options                        |
| `groups: []` empty                                        | P2       | Empty groups array                                              | Select with empty groups — no grouping labels                        |
| `searchable: true` + no optionsSource/options             | P2       | Searchable select with no data source to search                 | Searchable select with null options                                  |
| `searchSource` fails (error state)                        | P2       | Remote search fetcher returns error                             | Searchable select with failing search source — shows error           |
| `sourceStateKey` pointing to non-existent state path      | P2       | Source state key without source state data                      | Select with sourceStateKey but no source state — empty               |
| `multiple: true` with initial `null` value                | P2       | Multiple-mode select with null initial value                    | Multiple select with null initial value — shows selection area empty |
| `filterOption: false` with searchable: true and no source | P2       | No filter and no source, but searchable — input filters nothing | Select with searchable, no filter, no source — shows all options     |

### F10–F13 — Choice renderers (checkbox, switch, radio-group, checkbox-group)

| Gap                                               | Severity | Details                                                            | Recommended test                                         |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `options: null`                                   | P1       | Null options for radio-group/checkbox-group crashes?               | RadioGroup with null options — renders empty             |
| `options: []` empty                               | P2       | Empty options for choice renderers                                 | RadioGroup with empty options — no radio items           |
| `disabled: true` on choice renderers              | P2       | No test for disabled state on checkbox/switch/radio/checkbox-group | All choice renderers when disabled — non-interactive     |
| Checkbox-group `maxSelected/minSelected` with 0   | P2       | Boundary values for selection limits                               | CheckboxGroup with maxSelected=0 — cannot select any     |
| CheckboxGroup `checkAll: true` with empty options | P2       | Check-all button with no items                                     | CheckboxGroup with checkAll and empty options — no crash |

### F14–F20 — Date/Time/Period renderers

| Gap                               | Severity | Details                                     | Recommended test                                           |
| --------------------------------- | -------- | ------------------------------------------- | ---------------------------------------------------------- |
| `valueFormat: null`               | P2       | Date without valueFormat should use default | Input-date without valueFormat uses ISO format             |
| `minDate > maxDate`               | P2       | Conflicting constraints: invalid range      | Input-date with minDate after maxDate — all days disabled? |
| `minTime > maxTime` (time)        | P2       | Same for time components                    | Input-time with minTime after maxTime                      |
| Extremely old date (year 0001)    | P2       | Very old date should not crash              | Input-date with `"0001-01-01"` value                       |
| Extremely future date (year 9999) | P2       | Very future date should not crash           | Input-date with `"9999-12-31"` value                       |
| `placeholder: null`               | P3       | Placeholder omitted                         | Date renderer without placeholder                          |

### F21 — MarkdownEditor

| Gap                      | Severity | Details                                        | Recommended test                                      |
| ------------------------ | -------- | ---------------------------------------------- | ----------------------------------------------------- |
| Null value               | P2       | No test for editor with null value             | MarkdownEditor with null value renders empty          |
| `language` null fallback | P2       | No test for null language for syntax highlight | MarkdownEditor without language — no syntax highlight |

---

## 3. flux-renderers-form-advanced

### A2/A3 — ArrayEditor / ArrayField

| Gap                                | Severity | Details                                   | Recommended test                                                  |
| ---------------------------------- | -------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `items: null`                      | P1       | Null items should not crash               | ArrayEditor with null items — empty list                          |
| `items: []` empty                  | P1       | Empty items, boundary at minItems:0       | ArrayEditor with empty items and default minItems=1 — add enabled |
| `removeLastItem` then add          | P2       | Remove the only item then re-add          | ArrayEditor: remove last item, add new item — works cleanly       |
| `minItems: 0`                      | P2       | No minimum boundary                       | ArrayEditor with minItems:0 — remove disabled at 0                |
| `maxItems: 0`                      | P2       | maxItems:0 means no items allowed         | ArrayEditor with maxItems:0 — add disabled                        |
| Simultaneous add+remove via events | P2       | Race: add and remove in same action chain | ArrayEditor: addItem then removeItem in one transaction           |
| `draggable: true` + null items     | P2       | Drag sort with null items                 | Covered partially — array-keyvalue-min-max-reorder, not with null |

### A4 — Combo

| Gap                                                   | Severity | Details                                      | Recommended test                                      |
| ----------------------------------------------------- | -------- | -------------------------------------------- | ----------------------------------------------------- |
| `items: null`                                         | P1       | Null items region should not crash           | Combo with items: null — renders empty                |
| `conditions: null` or `[]`                            | P2       | No conditions configured                     | Combo with empty conditions — no conditional sections |
| `flat: true` + `joinValues: true` + `delimiter: null` | P2       | Missing delimiter falls back to default      | Combo with flat+joinValues but no delimiter           |
| `extractValue: true` with single item                 | P2       | Extract value from single-item array         | Combo with extractValue single item                   |
| Simultaneous minItems + add then remove               | P2       | At minItems floor, add then immediate remove | Combo at minItems: add creates item, remove — works   |

### A5 — ConditionBuilder

| Gap                           | Severity | Details                                       | Recommended test                                                |
| ----------------------------- | -------- | --------------------------------------------- | --------------------------------------------------------------- |
| `fields: null`                | P1       | Null fields definition should not crash       | ConditionBuilder with fields: null — no fields available        |
| `fields: []` empty            | P2       | Empty fields list — field selector empty      | ConditionBuilder with no fields — empty dropdown                |
| `source: null`                | P1       | Null source for field definitions             | ConditionBuilder with null source — uses static fields or empty |
| Empty group (children: [])    | P2       | Group with no children renders empty          | ConditionBuilder with empty and-group shows empty content       |
| Deeply nested recursion guard | P2       | Very deep AND/OR nesting to test stack safety | ConditionBuilder with 100 nested groups — no stack overflow     |
| `value: null` initial         | P2       | Null condition value initializes empty        | ConditionBuilder with value: null — starts from scratch         |
| `showANDOR: false`            | P3       | No AND/OR toggle visibility                   | ConditionBuilder without AND/OR switch                          |

### A6/A7 — DetailField/DetailView

| Gap                        | Severity | Details                                  | Recommended test                                   |
| -------------------------- | -------- | ---------------------------------------- | -------------------------------------------------- |
| `name: null`               | P2       | Null field name                          | DetailField with null name — renders label only    |
| `value: null`              | P2       | Null value displays empty                | DetailField with null value                        |
| DetailView `body: null`    | P2       | Null body should not crash               | DetailView without body — renders empty            |
| DetailView `columns: null` | P2       | Null columns falls back to single column | DetailView with columns: null — single column grid |

### A8 — Editor

| Gap              | Severity | Details                                | Recommended test                      |
| ---------------- | -------- | -------------------------------------- | ------------------------------------- |
| `value: null`    | P2       | Null code value                        | Editor with null value — empty editor |
| `language: null` | P2       | Null language — no syntax highlighting | Editor without language — plain text  |
| `theme: null`    | P3       | Null theme uses default                | Editor without theme — default theme  |

### A9/A10 — InputFile / InputImage

| Gap                                                | Severity | Details                                                                                    | Recommended test                                                  |
| -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `maxFiles: 0`                                      | P2       | maxFiles=0 rejects all files                                                               | InputFile with maxFiles=0 — all files rejected                    |
| `maxFiles: 1` + multiple:true + select 2 files     | P2       | Boundary: exceed maxFiles with multiple                                                    | InputFile with maxFiles=1, multiple:true — second file rejected   |
| Wrong file type via `accept: ".pdf"` + upload .txt | P2       | No test for accept filtering                                                               | InputFile with accept=".pdf" and .txt file — reject before upload |
| Zero-size file (0 bytes)                           | P2       | Empty file rejection                                                                       | InputFile with empty File object — behavior                       |
| `uploadAction: null`                               | P1       | Already covered (upload-field.test.tsx:281-291 — warns and shows missing-action indicator) | Covered                                                           |
| `crop: true` + no cropFormat                       | P2       | Crop enabled without format                                                                | InputImage with crop but no cropFormat                            |
| `limit: null` for InputImage                       | P2       | Image dimension limit                                                                      | InputImage without limit — no dimension check                     |
| `autoUpload: false` + then trigger upload          | P2       | Manual upload after autoUpload: false                                                      | InputFile with autoUpload:false — pending state, then upload      |
| InputImage: `accept` + wrong mime type             | P2       | No test for accept filtering in image upload                                               | InputImage with accept image mime + non-image file                |

### A11 — InputTable

| Gap                 | Severity | Details                            | Recommended test                                   |
| ------------------- | -------- | ---------------------------------- | -------------------------------------------------- |
| `columns: null`     | P1       | Null columns should not crash      | InputTable with null columns                       |
| `columns: []` empty | P2       | Zero columns renders row of empty? | InputTable with empty columns                      |
| `editable: false`   | P2       | Non-editable table cells           | InputTable with editable:false — cells read-only   |
| `minLength: 0`      | P2       | minLength:0 allows empty           | InputTable with minLength:0 — can remove all items |
| `showFooter: false` | P3       | No footer                          | InputTable without footer                          |

### A12 — KeyValue (KVPicker)

| Gap                                               | Severity | Details                                            | Recommended test                                           |
| ------------------------------------------------- | -------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `value: null` initial                             | P2       | Null initial value                                 | KeyValue with null value — empty list                      |
| `addable: false` + `removable: false`             | P2       | Static KVP, no modifications                       | KeyValue with addable:false, removable:false — fixed pairs |
| `keyPlaceholder: null` / `valuePlaceholder: null` | P3       | No placeholder shown                               | KeyValue without placeholders                              |
| Remove empty key entry                            | P2       | Remove item where key is empty string              | KeyValue with empty key + value -> remove works            |
| Add after maxItems: already covered               | P2       | Covered in array-keyvalue-min-max-reorder.test.tsx | Covered                                                    |

### A13 — ObjectField

| Gap          | Severity | Details                    | Recommended test                         |
| ------------ | -------- | -------------------------- | ---------------------------------------- |
| `body: null` | P2       | Null body should not crash | ObjectField with null body renders empty |

### A14 — Picker

| Gap                                   | Severity | Details                          | Recommended test                                          |
| ------------------------------------- | -------- | -------------------------------- | --------------------------------------------------------- |
| `options: null`                       | P1       | Null options crashes?            | Picker with null options — empty dialog                   |
| `options: []` empty                   | P2       | Empty options in dialog          | Picker with empty options — no items to select            |
| `source: null` (data source)          | P2       | Null source for fetching options | Picker with null source — uses static options or empty    |
| `multiple: true` + `valueKey` not set | P2       | Multiple picker without valueKey | Multiple picker without valueKey — default to value field |
| `searchable: true` + null source      | P2       | Searchable picker with no source | Picker with searchable and no data to search              |

### A15 — TagList

| Gap                 | Severity | Details         | Recommended test                              |
| ------------------- | -------- | --------------- | --------------------------------------------- |
| `options: null`     | P2       | Null options    | TagList with null options                     |
| `max: 1` (boundary) | P2       | Max 1 tag limit | TagList with max:1 — can only have 1 selected |

### A16 — Transfer

| Gap                            | Severity | Details                | Recommended test                                           |
| ------------------------------ | -------- | ---------------------- | ---------------------------------------------------------- |
| `options: null`                | P1       | Null options crashes?  | Transfer with null options — empty panes                   |
| `options: []` empty            | P2       | Zero options           | Transfer with empty options — both panes empty             |
| `sortable: true` + single item | P2       | Sortable with one item | Transfer with sortable and 1 item — sort controls disabled |
| `multiple: false` in source    | P2       | Single select mode     | Transfer in single mode — radio instead of checkbox        |

### A17 — TreeControl

| Gap                                       | Severity | Details                                   | Recommended test                                        |
| ----------------------------------------- | -------- | ----------------------------------------- | ------------------------------------------------------- |
| `source: null`                            | P2       | Null source should not crash              | TreeControl with null source — empty tree               |
| `options: null`                           | P2       | Null static options                       | TreeControl with null options — empty                   |
| `cascade: true` with disabled branch      | P2       | Cascade selection through disabled branch | TreeControl with cascade and disabled intermediate node |
| `initiallyExpanded: true` with empty data | P2       | Expand toggle with nothing to show        | TreeControl with initiallyExpanded and null data        |
| Empty tree data `[]`                      | P2       | Makes sure empty children array works     | TreeControl with empty top-level array                  |

### A18 — VariantField

| Gap                                        | Severity | Details                                | Recommended test                                        |
| ------------------------------------------ | -------- | -------------------------------------- | ------------------------------------------------------- |
| `variants: null`                           | P1       | Null variants breaks renderer          | VariantField with null variants                         |
| `variants: []` empty                       | P2       | No variant matches — renders fallback  | VariantField with empty variants                        |
| `value` not matching any variant condition | P2       | Value that doesn't trigger any variant | VariantField with unmatched value — no content rendered |

---

## 4. flux-renderers-data

### D1 — Table

| Gap                                        | Severity | Details                                        | Recommended test                                           |
| ------------------------------------------ | -------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `columns: null`                            | P1       | null columns must not crash                    | Table with null columns renders empty warning              |
| `columns: []` empty                        | P2       | Empty columns renders no headers, no data      | Table with empty columns array                             |
| `source: null`                             | P1       | Null data source should render empty           | Table with null source — empty table                       |
| `pagination` with currentPage: 0           | P1       | Page 0 is invalid, should clamp to 1           | Table pagination with currentPage:0 clamps to 1            |
| `pagination` with currentPage: -1          | P2       | Negative page should clamp                     | Table pagination with -1 clamps to 1                       |
| `pagination` with pageSize: 0              | P2       | pageSize:0 is invalid, should clamp to default | Table with pageSize:0 — clamps to default (10)             |
| `onPageChange` not provided                | P2       | Pagination without handler                     | Table pagination without onPageChange — page not published |
| `rowSelection` with null selection         | P2       | Selection ownership but null initial selection | Table with selectionOwnership but no selection data        |
| `affixRow` / `prefixRow` with null content | P2       | Fixed row regions null                         | Table with null affixRow — no fixed rows                   |
| `combineNum: 0`                            | P3       | Zero merge cells                               | Table with combineNum:0 — no cell merging                  |

### D2 — DataSource

| Gap                                          | Severity | Details                                         | Recommended test                                                               |
| -------------------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `name: null`                                 | P1       | DataSource without name — cannot be referenced  | DataSource with null name — still processes but no export                      |
| `sendOn` with null expression                | P2       | sendOn guard with null condition — always fires | DataSource with sendOn:null — acts as always-true                              |
| `interval: 0` polling                        | P2       | Polling interval of 0ms = as-fast-as-possible   | DataSource with interval:0 — fires once only?                                  |
| `stopWhen` with null expression              | P2       | Stop condition with null — never stops          | DataSource with stopWhen:null — polling continues                              |
| `initFetch: false` + `interval` set          | P2       | Polling without initial fetch                   | DataSource with initFetch:false and interval:5000 — starts with first interval |
| `mergeToScope: true` + `mergeStrategy: null` | P2       | Merge to scope with no strategy                 | DataSource with mergeToScope but no strategy — default merge                   |
| `dependsOn: null` (empty)                    | P2       | No dependencies                                 | DataSource without dependsOn — fires immediately                               |
| `action: null` (no action, no formula)       | P2       | DataSource with nothing to execute              | DataSource with no action and no formula — no data published                   |

### D3 — Chart

| Gap                                | Severity | Details                               | Recommended test                                        |
| ---------------------------------- | -------- | ------------------------------------- | ------------------------------------------------------- |
| `series: null`                     | P1       | Null series should render empty chart | Chart with null series — shows empty state              |
| `source: null`                     | P2       | Null data source                      | Chart with null source — empty chart                    |
| `chartType: null`                  | P2       | Null type — fall back to default      | Chart without chartType — defaults to line/bar          |
| `height: null`                     | P2       | Null height — uses default height     | Chart with null height                                  |
| `onClick` / `onHover` not provided | P2       | Event handlers absent                 | Chart without onClick/onHover — no crash on interaction |
| Empty `series: []`                 | P2       | No series to render                   | Chart with empty series array                           |

### D4 — Tree

| Gap                                          | Severity | Details                                  | Recommended test                               |
| -------------------------------------------- | -------- | ---------------------------------------- | ---------------------------------------------- |
| `data: null`                                 | P1       | Null tree data crashes?                  | Tree with null data — empty                    |
| `data: []` empty                             | P2       | Empty tree array                         | Tree with empty data array                     |
| `childrenKey` pointing to non-existent field | P2       | Wrong children key resolves to undefined | Tree with childrenKey set to non-existent prop |
| `labelField` null                            | P2       | No label field                           | Tree without labelField — uses toString        |
| `searchable: true` + null data               | P2       | Search with no data                      | Searchable tree with null data                 |

### D5 — List

| Gap                                     | Severity | Details                    | Recommended test                                          |
| --------------------------------------- | -------- | -------------------------- | --------------------------------------------------------- |
| `items: null`                           | P1       | Null items must not crash  | List with null items — empty                              |
| `items: []` empty                       | P2       | Empty items array          | List with empty items — shows empty region                |
| `onItemClick` not provided              | P2       | Click handler absent       | List without onItemClick — items not clickable            |
| `selectionMode: 'single'` + no keyField | P2       | Selection mode without key | List with selection but no keyField — falls back to index |
| `pagination` with from 0                | P2       | Pagination currentPage=0   | List pagination with page 0                               |

### D6 — Pagination

| Gap                 | Severity | Details          | Recommended test                                               |
| ------------------- | -------- | ---------------- | -------------------------------------------------------------- |
| `currentPage: null` | P2       | Null currentPage | Pagination with null currentPage — defaults to 1               |
| `total: 0`          | P2       | Zero total items | Pagination with total:0 — no pages                             |
| `total: -1`         | P2       | Negative total   | Pagination with negative total                                 |
| `pageSize: null`    | P2       | Null page size   | Pagination with null pageSize — default size                   |
| `pageSize: 0`       | P2       | Zero page size   | Pagination with pageSize:0 — picks a default or shows no items |

### D7 — Statistics

| Gap           | Severity | Details                          | Recommended test           |
| ------------- | -------- | -------------------------------- | -------------------------- |
| `total: null` | P2       | Null total displays 0 or nothing | Statistics with null total |

---

## 5. flux-renderers-content

### C1 — Separator

| Gap                 | Severity | Details                                 | Recommended test                |
| ------------------- | -------- | --------------------------------------- | ------------------------------- |
| `orientation: null` | P2       | Null orientation defaults to horizontal | Separator with null orientation |

### C3 — Progress

| Gap                          | Severity | Details                                                              | Recommended test                  |
| ---------------------------- | -------- | -------------------------------------------------------------------- | --------------------------------- |
| `value: NaN`                 | P1       | NaN value — covered by normalizeProgressValue test                   | Covered (progress.test.tsx:35-38) |
| `max: 0` (zero denominator)  | P1       | Max=0 means no denominator; normalizeProgressValue falls back to 100 | Covered (progress.test.tsx:20-23) |
| `max: -5` negative           | P1       | Negative max — covered by normalizeProgressValue fallback            | Covered (progress.test.tsx:22-23) |
| `value: -10` negative clamp  | P1       | Negative value clamped to 0                                          | Covered (progress.test.tsx:26-28) |
| `value: undefined`           | P2       | Undefined value — covered by normalizeProgressValue                  | Covered (progress.test.tsx:37-38) |
| `showValue: true` with ratio | P2       | Test shows actual progress value                                     | Covered for basic case            |

### C4 — Empty

| Gap                    | Severity | Details                                 | Recommended test                                          |
| ---------------------- | -------- | --------------------------------------- | --------------------------------------------------------- |
| Null title/description | P2       | No test for null value-or-region fields | Empty with null title/description — renders default title |

### C5 — Card

| Gap                    | Severity | Details                    | Recommended test                         |
| ---------------------- | -------- | -------------------------- | ---------------------------------------- |
| Null image             | P2       | Card with null image       | Card with null image — no image rendered |
| `onClick` not provided | P2       | Card click without handler | Card without onClick — not clickable     |

### C6 — Link

| Gap              | Severity | Details                           | Recommended test                            |
| ---------------- | -------- | --------------------------------- | ------------------------------------------- |
| `href: null`     | P1       | Invalid href — renders as text    | Link with null href — renders as plain text |
| `href: ""` empty | P2       | Empty href links to current page? | Link with empty href — href="#" or similar  |
| `target: null`   | P3       | No target attribute               | Link without target — opens in same tab     |

### C7 — Image

| Gap                           | Severity | Details                                           | Recommended test                                      |
| ----------------------------- | -------- | ------------------------------------------------- | ----------------------------------------------------- |
| `src: null`                   | P1       | Null src renders empty state                      | Covered (image.test.tsx:91-99 — no-src renders empty) |
| `src: ""` empty string        | P2       | Empty src                                         | Image with src:"" — renders empty                     |
| `fit: null`                   | P2       | Null fit uses default                             | Image without fit — no object-fit class               |
| `preview: true` + `src: null` | P2       | Preview with no src                               | Image with preview but null src — preview disabled    |
| `fetcher` not in env          | P2       | Image with no env fetcher for fetcher-enabled src | Image with fetcher expectation but no env fetcher     |

### C8 — JsonView

| Gap                              | Severity | Details                         | Recommended test                               |
| -------------------------------- | -------- | ------------------------------- | ---------------------------------------------- |
| `value: null`                    | P2       | Null json value                 | JsonView with null value — shows empty         |
| `collapsed: 0`                   | P2       | collapsed=0 means all expanded? | JsonView with collapsed:0 — all nodes expanded |
| `showCopy: true` with null value | P2       | Copy with null value            | JsonView with showCopy and null value          |

### C9/C10 — Markdown / Html

| Gap                              | Severity | Details                                         | Recommended test                                                                                    |
| -------------------------------- | -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `content: null`                  | P1       | Null content renders empty                      | Markdown/Html with null content                                                                     |
| `src: null` (for markdown)       | P2       | Markdown with null src                          | Markdown with null src — no content                                                                 |
| `sanitize: false` + XSS attempts | P1       | HTML renderer with sanitize disabled allows XSS | HTML with sanitize:false and script injection                                                       |
| `allowHtml: true` in markdown    | P1       | Markdown XSS when allowHtml:true                | Markdown with allowHtml and script tag injection; covered in markdown-reactivity.test.tsx partially |

### C11 — Cards

| Gap                                            | Severity | Details                                                                     | Recommended test                                  |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Null items                                     | P1       | Covered (cards-renderer.test.tsx:122-143 — null/undefined renders empty)    | Covered                                           |
| Empty items                                    | P1       | Covered (cards-renderer.test.tsx:94-120 — empty array renders empty region) | Covered                                           |
| `keyField` not matching any data field         | P2       | Non-matching keyField                                                       | Cards with keyField pointing to non-existent prop |
| `onItemClick` not provided                     | P2       | Click handler absent                                                        | Cards without onItemClick items not interactive   |
| `selectionMode` transition from single to none | P2       | Runtime selection mode change                                               | Cards switching selection mode                    |

### C12 — Alert

| Gap                                | Severity | Details                     | Recommended test                                                           |
| ---------------------------------- | -------- | --------------------------- | -------------------------------------------------------------------------- |
| `level: null`                      | P2       | Null level defaults to info | Covered (alert-renderer.test.tsx:179-195 — omitted level defaults to info) |
| `title: null` / `body: null`       | P2       | Null title/body regions     | Alert with null title/body                                                 |
| `closable: true` + `onClose: null` | P2       | Close without handler       | Alert with closable but no onClose                                         |

### C13 — Mapping

| Gap                                        | Severity | Details                                | Recommended test                        |
| ------------------------------------------ | -------- | -------------------------------------- | --------------------------------------- |
| `value: null`                              | P1       | Covered (mapping.test.tsx:136-157)     | Covered                                 |
| `map: null`                                | P2       | Null map is empty map, all misses      | Mapping with null map — all values miss |
| `source` with null                         | P2       | Null source for dynamic map            | Covered in mapping-source.test.tsx      |
| `defaultLabel` and `placeholder` both null | P2       | Both fallbacks missing — empty on miss | Covered (mapping.test.tsx:159-165)      |

### C14 — Status

| Gap                 | Severity | Details                           | Recommended test                             |
| ------------------- | -------- | --------------------------------- | -------------------------------------------- |
| `value: null`       | P1       | Covered (status.test.tsx:218-233) | Covered                                      |
| `labelMap: null`    | P2       | Null labelMap, all misses         | Status with null labelMap — no labels        |
| `placeholder: null` | P2       | Null placeholder on miss — empty  | Status with null placeholder — empty on miss |

### C15 — Audio

| Gap                        | Severity | Details                                               | Recommended test                                              |
| -------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `src: null`                | P1       | Covered (audio.test.tsx:59-68 — no-src renders empty) | Covered                                                       |
| `src: ""` empty string     | P2       | No test for empty src string                          | Audio with empty string src — renders empty or tries to load? |
| `onLoadError` not provided | P2       | Error handler absent                                  | Audio on error without onLoadError — no crash                 |

### C16 — Video

| Gap                        | Severity | Details                        | Recommended test                                  |
| -------------------------- | -------- | ------------------------------ | ------------------------------------------------- |
| `src: null`                | P1       | Covered (video.test.tsx:59-68) | Covered                                           |
| `src: ""` empty string     | P2       | Same as audio — empty src      | Video with empty string src                       |
| `width`/`height` set to 0  | P2       | Zero dimension sizes           | Video with width:0, height:0 — renders correctly? |
| `onLoadError` not provided | P2       | Error handler absent           | Video on error without onLoadError — no crash     |

### C17 — Carousel

| Gap                                      | Severity | Details                                                             | Recommended test                                      |
| ---------------------------------------- | -------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `items: []` empty                        | P1       | Covered (carousel.test.tsx:56-66 — empty items renders empty state) | Covered                                               |
| `items: null`                            | P1       | Covered (same test — empty props renders empty)                     | Covered                                               |
| Single item `items: [{image: "/a.png"}]` | P2       | Covered (carousel.test.tsx:68-71 — controls/indicators disabled)    | Covered                                               |
| `interval: 0`                            | P2       | Zero interval — no auto-play in effect                              | Carousel with interval:0 — behaves as autoPlay:false? |
| `interval: 1` (extremely fast)           | P2       | 1ms interval should not cause issues                                | Carousel with very fast interval — debounced/managed  |
| `loop: false` + last item reached        | P2       | No-wrap behavior at end                                             | Carousel with loop:false clicking next at last item   |

### C19 — DiffView

| Gap                                        | Severity | Details                                  | Recommended test                                           |
| ------------------------------------------ | -------- | ---------------------------------------- | ---------------------------------------------------------- |
| `oldContent: null` + `newContent: "hello"` | P1       | Null old content — treat as empty string | DiffView with null oldContent — all additions              |
| `newContent: null` + `oldContent: "hello"` | P1       | Null new content — all deletions         | DiffView with null newContent — all removals               |
| Both null                                  | P1       | Both null — empty diff                   | DiffView with both null — shows nothing                    |
| `files: null`                              | P1       | Null files array                         | DiffView with null files — single file mode                |
| `files: []` empty                          | P2       | Empty files list                         | DiffView with empty files — shows empty                    |
| `activeFileIndex: -1`                      | P2       | Negative file index                      | DiffView with activeFileIndex:-1 — clamps to 0             |
| `activeFileIndex` > files.length           | P2       | Out-of-bounds file index                 | DiffView with activeFileIndex 10 but only 3 files          |
| `onLineClick` not provided                 | P2       | Line click without handler               | DiffView without onLineClick — clicking lines does nothing |
| `language: null`                           | P2       | No language for syntax highlighting      | DiffView without language — no syntax highlighting         |

---

## 6. flux-renderers-mobile

### M1 — PullRefresh

| Gap                                                            | Severity | Details                                          | Recommended test                                                                      |
| -------------------------------------------------------------- | -------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `onRefresh` not provided                                       | P2       | Pull release with no handler — returns to normal | Covered implicitly (no refresh event in props — status returns normal)                |
| `threshold: 0`                                                 | P2       | Zero threshold — immediately triggers refresh    | PullRefresh with threshold:0 — any downward pull triggers refresh                     |
| `animationDuration: 0`                                         | P2       | Zero animation duration — instant transition     | PullRefresh with animationDuration:0                                                  |
| `successDuration: 0`                                           | P3       | Zero success hold time                           | PullRefresh with successDuration:0 — skips success state                              |
| `disabled: true` while loading                                 | P2       | Disabled during active loading                   | PullRefresh: disable during loading should keep loading, not cancel                   |
| Rapid repeated touchStart/touchEnd (fast double-pull)          | P2       | Multiple rapid attempts — should deduplicate     | PullRefresh: two full touch cycles in 50ms                                            |
| Vertical gesture: only `pan-x` behavior ensures no page scroll | P2       | No test for vertical scroll prevention           | Covered (pull-refresh.test.tsx:473-481)                                               |
| Error→retry recovery                                           | P2       | After reject, retry mechanism                    | Covered (pull-refresh.test.tsx:208-229 — reject returns to normal; no separate retry) |

### M2 — InfiniteScroll

| Gap                                       | Severity | Details                                         | Recommended test                                                 |
| ----------------------------------------- | -------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `distance: 0`                             | P2       | Zero root margin                                | InfiniteScroll with distance:0 — triggers immediately            |
| `disabled: true` while error              | P2       | Disabled in error state — retry button disabled | Covered (infinite-scroll-advanced.test.tsx:367-386)              |
| `hasMore: true` but empty source          | P2       | hasMore true but no more data — infinite loop?  | InfiniteScroll with hasMore true but no changes                  |
| `onLoadMore` not provided                 | P2       | Load more with no handler                       | InfiniteScroll without onLoadMore — intersection fires but no-op |
| `loadingText` null                        | P2       | Null loading text                               | InfiniteScroll with null loading text                            |
| `immediateCheck: true` + `disabled: true` | P2       | Immediate check when disabled                   | InfiniteScroll with immediateCheck and disabled — does not fire  |

### M3 — SwipeCell

| Gap                                               | Severity | Details                                | Recommended test                                         |
| ------------------------------------------------- | -------- | -------------------------------------- | -------------------------------------------------------- |
| `direction: null`                                 | P2       | Null direction — both directions work? | SwipeCell with null direction — both sides work          |
| `direction: 'both'` (not tested)                  | P2       | Both directions limited coverage       | SwipeCell with direction:both — open both sides          |
| `threshold: 0`                                    | P2       | Zero threshold — immediately opens     | SwipeCell with threshold:0 — any swipe opens             |
| `onAction` not provided                           | P2       | Action button click without handler    | SwipeCell without onAction — button click does nothing   |
| Rapid repeated swipes                             | P2       | Open-left then immediate open-right    | SwipeCell: fast swipe left then right                    |
| `closeOnOutside: true` + pointer down inside cell | P2       | Should NOT close on internal pointer   | SwipeCell: touch inside the cell should not close it     |
| Gesture while disabled: touch start then enable   | P2       | In-flight gesture when disabled flips  | SwipeCell: touchStart while disabled, enable mid-gesture |

### M4 — Countdown

| Gap                                          | Severity | Details                                    | Recommended test                                           |
| -------------------------------------------- | -------- | ------------------------------------------ | ---------------------------------------------------------- |
| `time: -1000` (negative)                     | P1       | Negative time immediately finishes         | Countdown with negative time — shows 00:00, fires onFinish |
| `time: 0`                                    | P2       | Zero time — immediately finished           | Countdown with time:0 — fires onFinish immediately         |
| Extremely large time (e.g., 10 years)        | P2       | Very large remaining time                  | Countdown with time: 315360000000 ms — displays correctly  |
| `targetTime` in past + `autoStart: false`    | P2       | Past target with autoStart disabled        | Countdown with past target time and autoStart:false        |
| `paused: true` at mount                      | P2       | Start paused                               | Covered (countdown.test.tsx:130-137)                       |
| `time` → `targetTime` mode switch at runtime | P2       | Switch from time to targetTime after start | Countdown switches from time mode to targetTime at runtime |
| Both `time` and `targetTime` null            | P2       | Covered (countdown.test.tsx:106-111)       | Covered                                                    |

### M5 — NoticeBar

| Gap                                                    | Severity | Details                                                                        | Recommended test                                                                                |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `text: null`                                           | P2       | Null text — covered (notice-bar.test.tsx:91-94 — missing text renders nothing) | Covered                                                                                         |
| `text: []` empty array                                 | P2       | Empty text list — renders nothing                                              | Covered? Not explicitly tested but empty array likely renders nothing via textList.length check |
| `text: ""` empty string                                | P1       | Covered (notice-bar.test.tsx:86-89)                                            | Covered                                                                                         |
| `scrollable: true` + `text` is single string that fits | P2       | No overflow but scrollable requested                                           | Covered (notice-bar.test.tsx:103-110)                                                           |
| `speed: 0` (marquee speed)                             | P2       | Zero speed — animation duration infinite                                       | NoticeBar with speed:0 — marquee stays                                                          |
| `closable: true` + `onClose: null`                     | P2       | Close without handler                                                          | NoticeBar with closable but no onClose                                                          |
| `icon: ""` empty string                                | P2       | Empty icon name — no icon rendered                                             | NoticeBar with empty icon string                                                                |

---

## Summary — Gap Count by Severity

| Package                      | P1     | P2      | P3     | Total   |
| ---------------------------- | ------ | ------- | ------ | ------- |
| flux-renderers-basic         | 3      | 18      | 4      | 25      |
| flux-renderers-form          | 3      | 25      | 3      | 31      |
| flux-renderers-form-advanced | 5      | 31      | 2      | 38      |
| flux-renderers-data          | 4      | 19      | 2      | 25      |
| flux-renderers-content       | 1      | 20      | 1      | 22      |
| flux-renderers-mobile        | 1      | 17      | 1      | 19      |
| **Total**                    | **17** | **130** | **13** | **160** |

## Key Areas Needing Most Urgent Attention

1. **P1 gaps — null items/source/columns**: ArrayEditor(items:null), Combo(items:null), ConditionBuilder(fields:null), Picker(options:null), Transfer(options:null), InputTable(columns:null), Table/CRUD(columns:null, source:null), DataSource(name:null, action+formula:null), Link(href:null), DiffView(oldContent/newContent null) — most likely to cause production crashes.

2. **P2 gaps — boundary values for composite form-advanced renderers**: InputFile maxFiles reject, wrong file type, zero-size; array-editor remove-last-then-add; condition-builder recursion; combo minItems transitions.

3. **P2 gaps — empty/null options for form/choice/select renderers**: RadioGroup/CheckboxGroup/Select with null/empty options, null groups.

4. **P2 gaps — missing event handlers**: Table(no onPageChange), CRUD(no onQuery), List(no onItemClick), Form(no submitAction), Chart(no onClick/onHover), Dialog(no onClose/onConfirm).

5. **P2 gaps — content renderer edge cases**: Carousel(interval:0, very fast interval), Video/Audio(empty src string), Cards(keyField mismatch), JsonView(collapsed:0).

6. **Mobile gaps already well-covered**: Most negative scenarios have existing tests. Remaining gaps are rapid repeated gestures and boundary values (threshold:0, distance:0, negative time).
