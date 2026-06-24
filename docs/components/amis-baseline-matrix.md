# AMIS Component Baseline Matrix

## Purpose

This file is the durable routing table between `docs/amis-types/` and `docs/components/`.

It answers four questions:

1. Which AMIS types are retained as canonical Flux component families.
2. Which AMIS types are absorbed into renamed or merged Flux owners.
3. Which AMIS types are intentionally not retained as standalone component docs.
4. Which owner doc path and implementation status now represents each retained family.

Single-component contract details still belong to `docs/components/<type>/design.md`.

## Audit Baseline

- This matrix is based on a full audit of top-level `type` literals declared under `docs/amis-types/*.d.ts`.
- The current repo baseline contains 137 distinct AMIS type literals across layout, feedback, data, form, and miscellaneous families.
- This file now records an explicit retained or not-retained decision for every audited top-level AMIS type literal. There is no remaining undecided AMIS type in the current documentation baseline.

## Status Vocabulary

| Status                    | Meaning                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `runtime`                 | Renderer is registered in the current repo and has an owner doc plus example.                                             |
| `targetContract`          | Owner doc and example exist, but runtime implementation is not yet registered as a general renderer.                      |
| `declaredButUnregistered` | Owner doc and example exist, and a schema or contract entry exists, but the renderer is intentionally not registered yet. |
| `fluxOnly`                | Flux-only component family with no direct AMIS source type.                                                               |
| `notRetained`             | AMIS type is intentionally not kept as a standalone Flux component doc.                                                   |

## Retention Rules

An AMIS type is retained as a canonical Flux component family only when at least one of these is true:

- it has high product value and frequent schema usage
- it maps to a stable Flux owner boundary
- it avoids duplicate naming in the final DSL
- it does not require a host-specific SDK or heavy external dependency just to be baseline-worthy

An AMIS type is not retained as a standalone Flux component doc when it is primarily:

- a historical alias or duplicate entry point
- a subtype merged into a cleaner canonical Flux family
- better modeled by composition, structural nodes, or owner architecture
- strongly host-coupled, low-value, or dependency-heavy
- replaced by `code-editor`, field metadata, or existing composite-field architecture

## Normalization Rules

The canonicalization rules below explain why the same AMIS source type may appear both in a retained row and in the not-retained section.

- Retained rows describe the canonical Flux owner that absorbs an AMIS capability family.
- Not-retained rows describe AMIS names that are not kept as standalone Flux `type` names.
- Example: AMIS `action` is absorbed by retained Flux `button`, but `action` is still listed under `notRetained` because Flux does not keep `type: 'action'` as a canonical DSL name.

## Canonical Retained Flux Component Families

### 1. Structural And Layout

| Flux component | Role                           | AMIS source                                                                    | Status           | Owner doc                             | Implementation wave |
| -------------- | ------------------------------ | ------------------------------------------------------------------------------ | ---------------- | ------------------------------------- | ------------------- |
| `fragment`     | no-UI grouping node            | none; absorbs generic grouping and wrapper-like authoring patterns             | `runtime`        | `docs/components/fragment/design.md`  | landed              |
| `loop`         | repeated structural node       | `each`                                                                         | `runtime`        | `docs/components/loop/design.md`      | landed              |
| `recurse`      | lexical recursion node         | none; tree/recursive template support rather than a direct AMIS top-level type | `runtime`        | `docs/components/recurse/design.md`   | landed              |
| `page`         | page shell owner               | `page`                                                                         | `runtime`        | `docs/components/page/design.md`      | landed              |
| `container`    | generic visual container       | `container`, part of `wrapper` / `panel` composition scenes                    | `runtime`        | `docs/components/container/design.md` | landed              |
| `flex`         | generic layout container       | `flex`, `hbox`, `vbox`                                                         | `runtime`        | `docs/components/flex/design.md`      | landed              |
| `grid`         | explicit grid layout container | `grid`                                                                         | `runtime`        | `docs/components/grid/design.md`      | wave 3              |
| `separator`    | visual divider                 | `divider`                                                                      | `runtime`        | `docs/components/separator/design.md` | wave 1              |
| `card`         | single card container          | `card`                                                                         | `runtime`        | `docs/components/card/design.md`      | wave 1              |
| `cards`        | card collection renderer       | `cards`                                                                        | `runtime`        | `docs/components/cards/design.md`     | wave 2              |
| `tabs`         | tabbed interaction container   | `tabs`                                                                         | `runtime`        | `docs/components/tabs/design.md`      | landed              |
| `collapse`     | collapsible content group      | `collapse`, `collapse-group`                                                   | `runtime`        | `docs/components/collapse/design.md`  | wave 3              |
| `steps`        | step-progress renderer         | `steps`                                                                        | `targetContract` | `docs/components/steps/design.md`     | wave 4              |
| `timeline`     | timeline renderer              | `timeline`                                                                     | `targetContract` | `docs/components/timeline/design.md`  | wave 4              |
| `wizard`       | multi-step workflow container  | `wizard`                                                                       | `runtime`        | `docs/components/wizard/design.md`    | wave 2              |
| `dialog`       | modal surface owner            | `dialog`                                                                       | `runtime`        | `docs/components/dialog/design.md`    | landed              |
| `drawer`       | drawer surface owner           | `drawer`                                                                       | `runtime`        | `docs/components/drawer/design.md`    | landed              |

### 2. Actions, Content, And Feedback

| Flux component    | Role                                  | AMIS source                                                                       | Status    | Owner doc                                   | Implementation wave |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------- | --------- | ------------------------------------------- | ------------------- |
| `button`          | canonical action trigger              | `button`, `action`, `submit`, `reset`                                             | `runtime` | `docs/components/button/design.md`          | landed              |
| `button-group`    | grouped action container              | `button-group`                                                                    | `runtime` | `docs/components/button-group/design.md`    | wave 3              |
| `dropdown-button` | menu-style action trigger             | `dropdown-button`                                                                 | `runtime` | `docs/components/dropdown-button/design.md` | wave 3              |
| `text`            | plain text display                    | `text`, `plain`, part of `tpl`                                                    | `runtime` | `docs/components/text/design.md`            | landed              |
| `markdown`        | markdown display                      | split from rich `tpl` display scenes rather than a standalone AMIS top-level type | `runtime` | `docs/components/markdown/design.md`        | wave 1              |
| `html`            | controlled HTML display               | `html`, part of `tpl`                                                             | `runtime` | `docs/components/html/design.md`            | wave 1              |
| `link`            | link display or navigation trigger    | `link`                                                                            | `runtime` | `docs/components/link/design.md`            | wave 1              |
| `image`           | single-image display                  | `image`, `static-image`                                                           | `runtime` | `docs/components/image/design.md`           | wave 1              |
| `icon`            | icon display                          | `icon`                                                                            | `runtime` | `docs/components/icon/design.md`            | landed              |
| `badge`           | small status badge                    | part of `tag` / `status` / badge display scenes                                   | `runtime` | `docs/components/badge/design.md`           | landed              |
| `progress`        | progress display                      | `progress`                                                                        | `runtime` | `docs/components/progress/design.md`        | wave 1              |
| `spinner`         | loading indicator                     | `spinner`                                                                         | `runtime` | `docs/components/spinner/design.md`         | wave 1              |
| `empty`           | empty-state renderer                  | no single AMIS top-level type; absorbs placeholder/no-result scenes               | `runtime` | `docs/components/empty/design.md`           | wave 1              |
| `json-view`       | JSON display                          | `json`, `static-json`                                                             | `runtime` | `docs/components/json-view/design.md`       | wave 1              |
| `alert`           | inline feedback block                 | `alert`                                                                           | `runtime` | `docs/components/alert/design.md`           | wave 2              |
| `mapping`         | value-to-label/status mapping display | `map`, `mapping`                                                                  | `runtime` | `docs/components/mapping/design.md`         | wave 3              |
| `status`          | business status display               | `status`                                                                          | `runtime` | `docs/components/status/design.md`          | wave 3              |
| `audio`           | audio media renderer                  | `audio`                                                                           | `runtime` | `docs/components/audio/design.md`           | wave 4              |
| `video`           | video media renderer                  | `video`                                                                           | `runtime` | `docs/components/video/design.md`           | wave 4              |
| `carousel`        | carousel renderer                     | `carousel`                                                                        | `runtime` | `docs/components/carousel/design.md`        | wave 4              |
| `qrcode`          | QR code renderer                      | `qrcode`, `qr-code`                                                               | `runtime` | `docs/components/qrcode/design.md`          | wave 4              |

### 3. Data And Workflow

| Flux component     | Role                                    | AMIS source                                                                            | Status    | Owner doc                                    | Implementation wave |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------- | --------- | -------------------------------------------- | ------------------- |
| `reaction`         | declarative side-effect watcher         | no single AMIS top-level type; absorbs local linkage and reaction-style patterns       | `runtime` | `docs/components/reaction/design.md`         | landed              |
| `dynamic-renderer` | runtime renderer switching              | no single AMIS top-level type; absorbs dynamic schema indirection scenes               | `runtime` | `docs/components/dynamic-renderer/design.md` | landed              |
| `data-source`      | non-visual named source owner           | part of AMIS `service` data-loading semantics plus the Flux source/runtime model       | `runtime` | `docs/components/data-source/design.md`      | landed              |
| `service`          | visual data-composition container       | `service`                                                                              | `runtime` | `docs/components/service/design.md`          | wave 2              |
| `table`            | structured table renderer               | `table`, `static-table`, `table2`                                                      | `runtime` | `docs/components/table/design.md`            | landed              |
| `crud`             | composite data-workflow renderer        | `crud`, `crud2`                                                                        | `runtime` | `docs/components/crud/design.md`             | landed              |
| `list`             | ordered collection renderer             | `list`, `static-list`                                                                  | `runtime` | `docs/components/list/design.md`             | landed              |
| `pagination`       | standalone pagination interaction owner | `pagination`                                                                           | `runtime` | `docs/components/pagination/design.md`       | wave 2              |
| `tree`             | hierarchical display renderer           | no direct audited AMIS top-level display tree type; Flux canonical tree display family | `runtime` | `docs/components/tree/design.md`             | landed              |
| `chart`            | chart renderer                          | `chart`                                                                                | `runtime` | `docs/components/chart/design.md`            | landed              |

### 4. Form Core

| Flux component   | Role                             | AMIS source                                                              | Status    | Owner doc                                  | Implementation wave |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------ | --------- | ------------------------------------------ | ------------------- |
| `form`           | form owner                       | `form`                                                                   | `runtime` | `docs/components/form/design.md`           | landed              |
| `input-text`     | single-line text field           | `input-text`, `input-url`                                                | `runtime` | `docs/components/input-text/design.md`     | landed              |
| `input-email`    | email field                      | `input-email`                                                            | `runtime` | `docs/components/input-email/design.md`    | landed              |
| `input-password` | password field                   | `input-password`, `password`                                             | `runtime` | `docs/components/input-password/design.md` | landed              |
| `textarea`       | multiline text field             | `textarea`                                                               | `runtime` | `docs/components/textarea/design.md`       | landed              |
| `input-number`   | numeric field                    | `input-number`, `native-number`                                          | `runtime` | `docs/components/input-number/design.md`   | landed              |
| `select`         | select field                     | `select`, `multi-select`                                                 | `runtime` | `docs/components/select/design.md`         | landed              |
| `checkbox`       | single checkbox field            | `checkbox`                                                               | `runtime` | `docs/components/checkbox/design.md`       | landed              |
| `radio-group`    | radio-group field                | `radio`, `radios`                                                        | `runtime` | `docs/components/radio-group/design.md`    | landed              |
| `checkbox-group` | checkbox-group field             | `checkboxes`, `matrix-checkboxes`                                        | `runtime` | `docs/components/checkbox-group/design.md` | landed              |
| `switch`         | switch field                     | `switch`                                                                 | `runtime` | `docs/components/switch/design.md`         | landed              |
| `input-tree`     | tree field                       | `input-tree`                                                             | `runtime` | `docs/components/input-tree/design.md`     | landed              |
| `tree-select`    | popup tree field                 | `tree-select`, `nested-select`, `chained-select`                         | `runtime` | `docs/components/tree-select/design.md`    | landed              |
| `tag-list`       | lightweight tag collection field | no direct single AMIS top-level type; absorbs tag-list-like field scenes | `runtime` | `docs/components/tag-list/design.md`       | landed              |
| `key-value`      | key-value editor field           | no direct single AMIS top-level type; absorbs KV editing scenes          | `runtime` | `docs/components/key-value/design.md`      | landed              |
| `array-editor`   | array value editor               | `input-array`                                                            | `runtime` | `docs/components/array-editor/design.md`   | landed              |

### 5. Form Advanced And Composite

| Flux component      | Role                                             | AMIS source                                                         | Status           | Owner doc                                     | Implementation wave |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ---------------- | --------------------------------------------- | ------------------- |
| `condition-builder` | condition editor                                 | `condition-builder`                                                 | `runtime`        | `docs/components/condition-builder/design.md` | landed              |
| `code-editor`       | code, expression, formula, or schema text editor | `editor` in code/text mode, `formula`, `json-schema-editor`, `diff` | `runtime`        | `docs/components/code-editor/design.md`       | landed              |
| `combo`             | composite repeated/object field container        | `combo`                                                             | `targetContract` | `docs/components/combo/design.md`             | wave 4              |
| `picker`            | popup picker field                               | `picker`                                                            | `targetContract` | `docs/components/picker/design.md`            | wave 4              |
| `transfer`          | transfer-selection field                         | `transfer`                                                          | `targetContract` | `docs/components/transfer/design.md`          | wave 4              |
| `input-table`       | table-shaped array/object field                  | `input-table`                                                       | `targetContract` | `docs/components/input-table/design.md`       | wave 4              |
| `input-date`        | date field                                       | `input-date`, `native-date`                                         | `runtime`        | `docs/components/input-date/design.md`        | wave 2              |
| `input-datetime`    | datetime field                                   | `input-datetime`                                                    | `runtime`        | `docs/components/input-datetime/design.md`    | wave 2              |
| `input-time`        | time field                                       | `input-time`, `native-time`                                         | `runtime`        | `docs/components/input-time/design.md`        | wave 2              |
| `date-range`        | canonical range date/time field family           | `input-date-range`, `input-datetime-range`, `input-time-range`      | `runtime`        | `docs/components/date-range/design.md`        | wave 2              |
| `input-month`       | month field                                      | `input-month`, `input-month-range`                                  | `runtime`        | `docs/components/input-month/design.md`       | landed              |
| `input-quarter`     | quarter field                                    | `input-quarter`, `input-quarter-range`                              | `runtime`        | `docs/components/input-quarter/design.md`     | landed              |
| `input-year`        | year field                                       | `input-year`                                                        | `runtime`        | `docs/components/input-year/design.md`        | landed              |
| `input-file`        | file-upload field                                | `input-file`                                                        | `runtime`        | `docs/components/input-file/design.md`        | landed              |
| `input-image`       | image-upload field                               | `input-image`                                                       | `runtime`        | `docs/components/input-image/design.md`       | landed              |
| `editor`            | rich-text editor field                           | `input-rich-text`                                                   | `runtime`        | `docs/components/editor/design.md`            | landed              |

Notes:

- The retained Flux `editor` family is rich-text only.
- The audited AMIS top-level `editor` type is not retained as a standalone Flux type name; its code/text-editing semantics are absorbed by retained Flux `code-editor`.

### 6. Flux-Only Domain Components

| Flux component           | Role                          | AMIS source | Status                    | Owner doc                                          |
| ------------------------ | ----------------------------- | ----------- | ------------------------- | -------------------------------------------------- |
| `designer-page`          | Flow Designer host renderer   | none        | `runtime`                 | `docs/components/designer-page/design.md`          |
| `designer-field`         | designer field renderer       | none        | `runtime`                 | `docs/components/designer-field/design.md`         |
| `designer-canvas`        | designer canvas bridge        | none        | `runtime`                 | `docs/components/designer-canvas/design.md`        |
| `designer-palette`       | designer palette renderer     | none        | `runtime`                 | `docs/components/designer-palette/design.md`       |
| `designer-node-card`     | designer node-card contract   | none        | `declaredButUnregistered` | `docs/components/designer-node-card/design.md`     |
| `designer-edge-row`      | designer edge-row contract    | none        | `declaredButUnregistered` | `docs/components/designer-edge-row/design.md`      |
| `report-inspector-shell` | report inspector shell        | none        | `runtime`                 | `docs/components/report-inspector-shell/design.md` |
| `report-inspector`       | report inspector              | none        | `runtime`                 | `docs/components/report-inspector/design.md`       |
| `report-field-panel`     | report field panel            | none        | `runtime`                 | `docs/components/report-field-panel/design.md`     |
| `report-toolbar`         | report toolbar                | none        | `runtime`                 | `docs/components/report-toolbar/design.md`         |
| `report-designer-page`   | report-designer host renderer | none        | `runtime`                 | `docs/components/report-designer-page/design.md`   |
| `spreadsheet-page`       | spreadsheet host renderer     | none        | `runtime`                 | `docs/components/spreadsheet-page/design.md`       |
| `word-editor-page`       | word-editor host renderer     | none        | `runtime`                 | `docs/components/word-editor-page/design.md`       |

### 7. Flux-Only Form Component Families

| Flux component | Role                 | AMIS source | Status    | Owner doc                            |
| -------------- | -------------------- | ----------- | --------- | ------------------------------------ |
| `fieldset`     | form group container | none        | `runtime` | `docs/components/fieldset/design.md` |

## Not Retained As Standalone Flux Component Types

### 1. Alias Or Duplicate Type Names

| AMIS type       | Decision                               | Canonical Flux owner                                     |
| --------------- | -------------------------------------- | -------------------------------------------------------- |
| `action`        | not retained as a standalone type name | `button`                                                 |
| `submit`        | not retained as a standalone type name | `button`                                                 |
| `reset`         | not retained as a standalone type name | `button`                                                 |
| `plain`         | not retained as a standalone type name | `text`                                                   |
| `static-image`  | not retained as a standalone type name | `image`                                                  |
| `static-images` | not retained as a standalone type name | composition with `image` / `list` / `cards` / `carousel` |
| `static-list`   | not retained as a standalone type name | `list`                                                   |
| `static-table`  | not retained as a standalone type name | `table`                                                  |
| `static-json`   | not retained as a standalone type name | `json-view`                                              |
| `crud2`         | not retained as a standalone type name | `crud`                                                   |
| `table2`        | not retained as a standalone type name | `table`                                                  |
| `qr-code`       | not retained as a standalone type name | `qrcode`                                                 |
| `map`           | not retained as a standalone type name | `mapping`                                                |
| `multi-select`  | not retained as a standalone type name | `select`                                                 |
| `radio`         | not retained as a standalone type name | `radio-group`                                            |
| `radios`        | not retained as a standalone type name | `radio-group`                                            |
| `checkboxes`    | not retained as a standalone type name | `checkbox-group`                                         |
| `input-array`   | not retained as a standalone type name | `array-editor`                                           |
| `password`      | not retained as a standalone type name | `input-password`                                         |

### 2. Folded Into Canonical Retained Families

| AMIS type              | Why not retained standalone                                                                         | Canonical Flux owner                            |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `input-url`            | URL is treated as a text-field specialization, not a separate top-level type                        | `input-text`                                    |
| `native-date`          | host-native rendering mode should not become a second canonical date family                         | `input-date`                                    |
| `native-time`          | host-native rendering mode should not become a second canonical time family                         | `input-time`                                    |
| `native-number`        | host-native rendering mode should not become a second canonical number family                       | `input-number`                                  |
| `input-date-range`     | range variants converge under one canonical range family                                            | `date-range`                                    |
| `input-datetime-range` | range variants converge under one canonical range family                                            | `date-range`                                    |
| `input-time-range`     | range variants converge under one canonical range family                                            | `date-range`                                    |
| `input-month-range`    | month range should be a mode of the month family, not a second canonical type                       | `input-month`                                   |
| `input-quarter-range`  | quarter range should be a mode of the quarter family, not a second canonical type                   | `input-quarter`                                 |
| `matrix-checkboxes`    | matrix presentation does not justify a second checkbox-group owner                                  | `checkbox-group`                                |
| `nested-select`        | specialized select hierarchies should stay within retained select/tree-select families              | `tree-select` / composition                     |
| `chained-select`       | specialized select hierarchies should stay within retained select/tree-select families              | `tree-select` / composition                     |
| `json`                 | JSON display should use one canonical Flux display component                                        | `json-view`                                     |
| `images`               | image collections should use collection/media composition rather than a second canonical image type | composition with `image` / `cards` / `carousel` |
| `tag`                  | small-tag display should not split from badge/tag-list semantics                                    | `badge` / `tag-list`                            |
| `button-toolbar`       | toolbar layout is better modeled by `toolbar` regions plus grouped buttons                          | `button-group` / region composition             |

### 3. Replaced By Composition Or Owner Architecture

| AMIS type            | Why not retained standalone                                                          | Replacement                                  |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `each`               | structural repetition already has a no-UI owner                                      | `loop`                                       |
| `wrapper`            | generic wrapper semantics do not justify a standalone canonical type                 | `container` / `fragment`                     |
| `panel`              | panel semantics are better expressed by card/container/collapse composition          | composition                                  |
| `hbox`               | duplicated layout naming                                                             | `flex`                                       |
| `vbox`               | duplicated layout naming                                                             | `flex`                                       |
| `group`              | generic grouping is better expressed structurally or by layout/container families    | `container` / `flex` / `fragment`            |
| `input-group`        | group chrome belongs to field composition, not a top-level owner                     | composition                                  |
| `pagination-wrapper` | wrapper-plus-pagination should not become its own canonical type                     | `pagination` + collection renderer           |
| `switch-container`   | conditional rendering belongs to declarative branching and dynamic rendering         | `dynamic-renderer` / conditional composition |
| `subform`            | Flux already has object/detail/composite field architecture                          | object/detail/composite field families       |
| `search-box`         | search UI should be authored as `form` + `input-text` + `button` or `crud.queryForm` | composition                                  |
| `words`              | specialized display does not justify a canonical owner                               | `text` / `tag-list` / composition            |
| `multiline-text`     | specialized display does not justify a canonical owner                               | `text` / `textarea` / composition            |

### 4. Replaced By `code-editor` Or Editor Infrastructure

| AMIS type            | Why not retained standalone                                                                                                  | Replacement                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `formula`            | formula editing should not live as a second canonical editor family                                                          | `code-editor`                                                                 |
| `editor`             | audited top-level `editor` remains the code/text-editing family, not the canonical rich-text type name                       | `code-editor`                                                                 |
| `json-schema-editor` | structured schema text editing should stay in the code-editor family until a dedicated designer is justified                 | `code-editor`                                                                 |
| `diff`               | compare/diff editing should stay in the code-editor family or a future specialized tool, not a baseline standalone component | `code-editor` (`diffValue` MergeView landed in E2h) / future specialized tool |

### 5. Low-Value, Host-Coupled, Security-Sensitive, Or Deferred Optional Types

| AMIS type         | Why not retained in the current canonical baseline                                                                     | Replacement or note                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `slider`          | keep out of the retained AMIS baseline until a dedicated `input-slider` contract is justified                          | future optional field                   |
| `input-range`     | keep out of the retained AMIS baseline until a dedicated `input-slider` or range field contract is justified           | future optional field                   |
| `rating`          | optional field, not part of the retained baseline                                                                      | future optional field                   |
| `avatar`          | easy to express with existing image/badge composition; no strong owner boundary yet                                    | `image` / composition                   |
| `color`           | color chip display is too small to justify a canonical owner now                                                       | text/badge decoration                   |
| `input-color`     | optional field, not part of the retained baseline                                                                      | future optional field                   |
| `uuid`            | generation behavior belongs to defaults/actions, not a top-level field type                                            | `input-text` + generated default/action |
| `icon-picker`     | optional picker variant, not part of the retained baseline                                                             | `select` / future optional field        |
| `location-picker` | heavy map SDK coupling                                                                                                 | future optional integration             |
| `input-city`      | location dataset coupling                                                                                              | future optional integration             |
| `input-signature` | specialized device/canvas behavior                                                                                     | future optional integration             |
| `calendar`        | optional specialized surface, not part of the retained baseline                                                        | future optional family                  |
| `nav`             | host navigation and IA coupling is too strong for the retained baseline                                                | future navigation family                |
| `anchor-nav`      | host navigation and anchor coupling is too strong for the retained baseline                                            | future navigation family                |
| `portlet`         | host dashboard shell coupling is too strong for the retained baseline                                                  | future optional family                  |
| `tasks`           | business-specific and narrow                                                                                           | future domain renderer if needed        |
| `remark`          | better modeled as metadata or tooltip/description behavior                                                             | metadata / field chrome                 |
| `tooltip-wrapper` | better modeled as metadata or decorator behavior                                                                       | metadata / wrapper behavior             |
| `sparkline`       | small-chart specialization should stay under the chart family if needed                                                | `chart`                                 |
| `iframe`          | security and host embedding policy make it a poor retained baseline component                                          | host-specific optional integration      |
| `hidden`          | hidden-field behavior belongs to field metadata and validation/submit policy, not a standalone visible renderer family | hidden-field policy on normal fields    |

## Maintenance Rule

When a new retained component owner doc is added or an old retained/not-retained decision changes:

1. update this file first
2. then update `docs/components/<type>/design.md` and `example.json`
3. then update `docs/components/index.md`, `docs/components/roadmap.md`, and `docs/components/examples.manifest.json`

Skipping this file re-opens the same process gap that previously allowed a high-value type like `crud` to be missing from the owner-doc system without being caught.
