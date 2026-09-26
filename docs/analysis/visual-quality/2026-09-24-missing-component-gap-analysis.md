# Missing Component Gap Analysis

> Date: 2026-09-24
> Scope: research / analysis only — no product-behavior code changes.
> Method: live-repo renderer inventory (`*definitions*.ts` + package `index` registration faces) cross-checked against AMIS form/layout surface, Ant Design / shadcn control surface, Element Plus, Vant + antd-mobile/TDesign mobile surfaces, Form.io enterprise fields, DingTalk enterprise form fields, and VForm `formJson` widget list (same-session research, **not committed to repo**). Same-day independent multi-agent review (2026-09-24) aligned this file with `D2-closure`/C2 writebacks, matrix/roadmap O1, survey tiers, and the page-archetype companion (see §7–§8, §12); a second review round corrected the VForm evidence citation, the `color` P0 evidence cell, and the `input-tree`/`tree-select` package attribution.
> Authority: this file is a **comparative gap report**, not an owner contract. Retained/not-retained decisions stay in `docs/components/amis-baseline-matrix.md`; implementation waves stay in `docs/components/roadmap.md`; existing-control capability gaps stay in `docs/components/existing-components-improvement-analysis.md`.

---

## 1. Executive conclusion

**Direct answer:** Flux does not need “another generic container.” The real holes are:

1. **Three form atoms still missing as registered renderers:** `rate`, `slider`, `color`.
2. **One enterprise form layer:** contact/department pickers, region/city, signature, verification-code.
3. **One hierarchy select shape:** true cascader path UX (partially covered by tree controls).

Layout, data, AI, scheduling, industrial, and content families already **exceed** AMIS on several axes. Do not open parity work there.

**Beyond-AMIS libraries (Element/Vant/Form.io/antd-mobile) do not create a second gap class** — they confirm P0–P3 and add only demand-gated `skeleton` (type) and `image-preview` (**capability on `image`**, 2026-06-21 ruling — §9–§10). Tabbar/NavBar/ActionBar/SubmitBar/Sticky stay page-region templates, not types.

| Tier                              | Count                  | Verdict                                                                                                                                                 |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 form atoms                     | 3                      | Ship first; `slider` is pure registration debt (`@nop-chaos/ui` already exports `Slider`).                                                              |
| P1 enterprise inputs              | 5 core + 2 conditional | Product hole for OA/approval scenarios; not a styling hole. (§4 has 7 rows; `cascader` and `money`-format are conditional and may drop to P2/protocol.) |
| P2 optional / composition-covered | ~10                    | Add only with a concrete host demand.                                                                                                                   |
| P3 explicit non-goals             | many                   | Keep out unless a design contract is written first.                                                                                                     |

---

## 2. Live inventory baseline (2026-09-24)

Registered `type` literals harvested from definition faces (not from tests / test-support):

| Package                        | Registered types (summary)                                                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flux-renderers-basic`         | `page` `container` `fragment` `loop` `recurse` `flex` `text` `button` `icon` `badge` `scope-debug` `dynamic-renderer` `reaction` `keyboard` `tabs` `dialog` `drawer` `command-palette`                                                                                                                  |
| `flux-renderers-form`          | `form` `fieldset` `hidden` `input-text` `input-email` `input-password` `select` `textarea` `checkbox` `switch` `radio-group` `checkbox-group` `button-group-select` `input-number` `input-date` `input-datetime` `input-time` `date-range` `input-month` `input-quarter` `input-year` `markdown-editor` |
| `flux-renderers-form-advanced` | `tag-list` `key-value` `array-editor` `condition-builder` `object-field` `array-field` `variant-field` `detail-field` `detail-view` `editor` `input-file` `input-image` `combo` `input-table` `transfer` `picker` `icon-picker` `input-tree` `tree-select`                                              |
| `flux-code-editor`             | `code-editor` (retained in matrix L150 / roadmap wave label “L0”, landed baseline)                                                                                                                                                                                                                      |
| `flux-renderers-data`          | `table` `data-source` `chart` `tree` `list` `crud` `pagination` `statistics` `batch-bar` `query-filter` `sparkline` `stat-tile` `echarts`                                                                                                                                                               |
| `flux-renderers-layout`        | `wizard` `grid` `collapse` `button-group` `dropdown-button` `responsive` `steps` `timeline`                                                                                                                                                                                                             |
| `flux-renderers-content`       | `separator` `spinner` `progress` `empty` `result` `card` `link` `image` `json-view` `markdown` `html` `cards` `alert` `mapping` `status` `audio` `video` `carousel` `qrcode` `diff-view`                                                                                                                |
| `flux-renderers-mobile`        | `pull-refresh` `infinite-scroll` `swipe-cell` `countdown` `notice-bar`                                                                                                                                                                                                                                  |
| `flux-renderers-scheduling`    | `gantt` `kanban` `calendar` `barcode-input`                                                                                                                                                                                                                                                             |
| `flux-renderers-ai`            | `ai-chat` `ai-message-list` `ai-bubble` `ai-sender` `ai-conversations` `ai-welcome` `ai-prompts` `ai-feedback` `ai-tool-call` `ai-attachments` `ai-citations` `ai-voice-input` `ai-token-usage` `ai-suggestions`                                                                                        |
| Domain / specialty             | `map` `pivot-table` `graph` `dashboard` `scada-canvas` `three-canvas` (+ flow/report/word host surfaces)                                                                                                                                                                                                |

**UI package already exports (not all wired as flux types):** `Slider`, `InputOtp`, `Avatar`, `Breadcrumb`, `Combobox`, `Command`, `Skeleton`, `Accordion`, `AlertDialog`, `HoverCard`, `NavigationMenu`, `Popover`, `Tooltip`, `Resizable`, …

**Built-in capabilities that are not separate types (do not re-count as gaps):**

- `input-text` + `suggestSource` → AMIS `input-suggest` / autocomplete family.
- `date-range.rangeKind: 'date' | 'datetime' | 'time'` + period `selectionMode: 'single' | 'range'` → AMIS `input-datetime-range` / `input-time-range` / month-quarter-year range **as modes, not second types** (see `date-range.test.tsx` and matrix not-retained rows).
- `input-number` `prefix`/`suffix`/`precision`/`precisionMode` → partial money UX without a separate `money` type.
- AI rich-text mentions live under `flux-renderers-ai`, not under a form `mentions` field.

---

## 3. Benchmarks used

| Benchmark                             | Role in this report                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AMIS**                              | Broad low-code form/layout surface; retained vs not-retained already decided in `amis-baseline-matrix.md`. Used mainly for **shape** (slider/rating/color/city/signature/otp/cascader).                                                                                        |
| **Ant Design**                        | Modern control completeness (`Rate`, `Slider`, `ColorPicker`, `Cascader`, `Mentions`, `InputOTP`, `FloatButton`, …). Naming pressure: prefer shadcn-aligned names over AMIS names.                                                                                             |
| **shadcn/ui**                         | Naming / composition baseline already mandated by existing improvement analysis. Several flux gaps are “UI has component, no renderer type.”                                                                                                                                   |
| **DingTalk enterprise fields**        | `MoneyField`, `AddressField`, `StarRatingField`, `InnerContactField`, `DepartmentField`, signature-style approval controls — **OA realism check**.                                                                                                                             |
| **VForm**                             | Small pure-form surface (22 fields + 6 containers) researched the same session — **session-local evidence, not committed to repo** (no `docs/analysis/vform-*` file exists; do not cite as a repo path). Confirms only a thin atom gap vs Flux, **not** an enterprise gap.     |
| **Element Plus / Antd (desktop web)** | Completeness pressure for `Rate`/`Slider`/`ColorPicker`/`Cascader`/`Mentions`/`FloatButton`/`Tour`/`Watermark`/`Splitter`/`Descriptions`/`Segmented` — feeds §9. **InputOTP** is **antd/shadcn only** (Element Plus does not ship it) — feeds P1 `verification-code` via §9.1. |
| **Vant + antd-mobile (mobile web)**   | Touch-native surface (Form/Picker/Area/Rate/Slider/Stepper/ImagePreview/IndexBar/NumberKeyboard/PasswordInput/SubmitBar…) — feeds §10; deep Vant survey already in `2026-06-21-flux-mobile-gap-analysis-vs-vant.md`.                                                           |
| **Form.io**                           | Enterprise form-as-data surface (Signature, Address, Currency mask, Survey, Nested Forms, reCAPTCHA) — OA/ERP realism cross-check only.                                                                                                                                        |

Out of scope: backend process runtime (`nop-wf` / nop-entropy), NoCode DDL layer, Warm-Flow engine.

---

## 4. Gap register

### P0 — form atoms (ship next)

| Proposed type                     | Evidence (live)                                                                                                                                                                       | Benchmarks                                                                                                    | Effort                                            | Notes                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slider` (or `input-slider`)      | `packages/ui/src/components/ui/slider.tsx` exported; **zero** `type: 'slider'` in renderer packages                                                                                   | AMIS `input-range`/`slider`, VForm `slider`, antd Slider, control-gap-survey Tier1                            | **Small** — registration + schema + propContracts | Matrix currently `notRetained` “future optional field”; this report **proposes re-opening** that decision as P0 registration debt (pending matrix human gate) because UI is already present. |
| `rate` (or `input-rate` / rating) | No rating component under `packages/ui` or any flux renderer                                                                                                                          | AMIS `input-rating`, VForm `rate`, antd Rate, DingTalk `StarRatingField`, control-gap-survey Tier1 (`rating`) | Medium — needs UI primitive + renderer            | Name: prefer `rate` (shadcn-ish) over AMIS `input-rating`; matrix currently `notRetained` “future optional field”.                                                                           |
| `color` (or `input-color`)        | No form type; SCADA inspector widget only — **table editable rejects `color-picker`** (invalid-editor fallback to read-only with warning `gd-cell-edit-no-editor`; tests assert this) | AMIS `input-color`, VForm `color`, antd ColorPicker, control-gap-survey (mid)                                 | Medium                                            | When a designer/host palette needs it, promote to first-class field type; SCADA usage proves display-side demand, table must not be cited as production support.                             |

**P0 decision rule:** all three are **interaction shapes no other field can honestly emulate**. Do not fake them with `input-number` or free text.

### P1 — enterprise form layer (OA / approval / ERP)

| Proposed type                  | Current state                                                                                                               | Benchmarks                                                               | Why P1                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user-select` / contact picker | `contact-group` appears only in **test-support probes**, not production definitions; generic `picker` ≠ directory semantics | DingTalk `InnerContactField`                                             | Approval assignee / owner fields are first-class in nop workflow UX.                                                                                                                                                                                                                  |
| `department-select`            | None                                                                                                                        | DingTalk `DepartmentField`                                               | Same family as user-select; share org data-source protocol.                                                                                                                                                                                                                           |
| `region` / `city` (省市区)     | None                                                                                                                        | AMIS `input-city`, DingTalk `AddressField`                               | Logistics / billing address; dataset-coupled (matrix: location dataset coupling).                                                                                                                                                                                                     |
| `signature`                    | None                                                                                                                        | AMIS `input-signature`, vant signature, ERP 收货/审批                    | Canvas + pointer events; matrix deferred as “device/canvas,” but OA demand is real.                                                                                                                                                                                                   |
| `verification-code` / OTP      | `packages/ui/.../input-otp.tsx` exists, **unregistered** as flux type                                                       | AMIS `input-verification-code`, shadcn InputOTP                          | Auth / mobile bind flows; again UI-first debt.                                                                                                                                                                                                                                        |
| `cascader`                     | No dedicated type; `input-tree`/`tree-select` ≈ path select for many cases                                                  | AMIS `cascader`/`nested-select`, formily, vant, nocobase, VForm cascader | Distinct **column-by-column** interaction; matrix absorbed hierarchical selects into tree families — **L2.6 裁决（plan 510，`cascader-vs-tree-select-decision.md`）：认定为独立交互形态，登记 demand-gated（待 host 需求立 type，数据面复用 org 协议）；`chained-select` 维持折叠**。 |
| `money` format                 | `input-number` has precision + prefix only                                                                                  | DingTalk `MoneyField`, antd InputNumber formatter                        | Prefer **format protocol on `input-number`** (`format: 'currency'`) over a new type unless display/validation diverges.                                                                                                                                                               |

**P1 boundary:** this layer is **not** about “AMIS has it.” It is about “nop ERP/OA forms cannot ship clean schemas without it.”

### P2 — useful, composition exists or demand is optional

| Item                                                                                        | Nearest existing                                                    | When to open                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chained-select`                                                                            | `tree-select` / composition / cascader P1                           | Only if cascader columns rejected —— **L2.6 裁决（plan 510）：维持折叠（依赖联动 ≠ 级联浏览，composition 为正解）；cascader 另行 demand-gated 登记（见 ：98 行注记）**        |
| `location-picker`                                                                           | `map` package exists; no form field                                 | Map SDK + product demand                                                                                                                                                      |
| `input-excel`                                                                               | none                                                                | Import-heavy BI workflows                                                                                                                                                     |
| `input-formula`                                                                             | expressions already in core; `editor`/`code-editor` family          | Designer formula UX demand                                                                                                                                                    |
| `iframe`                                                                                    | dashboard palette internal only                                     | Matrix host-owned (iframe row L293; “L16 裁定” is the matrix's own signal label, not the file line): **not** a retained flux renderer                                         |
| `nav` / `anchor-nav` / `breadcrumb` / `avatar`                                              | ui `Breadcrumb`/`Avatar` unregistered; `tabs`/`page` for nav shells | Host IA demand; matrix keeps nav family out of retained baseline                                                                                                              |
| `tooltip-wrapper` / `popover-wrapper`                                                       | ui Tooltip/Popover                                                  | Decorator sugar only                                                                                                                                                          |
| `mentions` (form field)                                                                     | AI tiptap mentions only                                             | Collaborative comments, not core form                                                                                                                                         |
| `log` / `tasks` / `search-box`                                                              | `query-filter` + form composition                                   | Ops/domain-specific                                                                                                                                                           |
| Survey specialty: `pdf-viewer` / `org-tree` / `mind-map` / `cron-editor` / `excel-importer` | no registered type                                                  | Stay **survey-owned** (`control-gap-survey` Tier1–3); open only on concrete host demand + matrix decision. Companion N4 lists `pdf-viewer` as demand-gated viewer capability. |

### P3 — keep out (with current rationale)

| Item                                                                                                                                      | Rationale                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Separate `datetime-range` / `time-range` / `month-range` types                                                                            | **Already by design** collapsed into `date-range` + period `selectionMode`. Tests assert absence of parallel types.              |
| `uuid` / `repeat` / `matrix-checkboxes` / `json-schema-editor` / `web-component` / `portlet` / `hbox` / `static` / `service` as new types | Covered by defaults+actions, `combo`/`array-field`, `checkbox-group`, `code-editor`, composition, `flex`, `text`, `data-source`. |
| Backend workflow runtime                                                                                                                  | Belongs to `nop-entropy` / `nop-wf`, **not** flux gap.                                                                           |

---

## 5. False gaps (do not open work)

These were candidates in casual comparison but are **not** gaps on the live repo:

1. **AMIS range-type fan-out** — one canonical `date-range` + period modes.
2. **Autocomplete / suggest** — built into `input-text` via `suggestSource` (+ refreshSource action).
3. **`service`** — `data-source` + actions.
4. **`subform` / `combo` / `input-array`** — `object-field` / `array-field` / `combo` / `input-table` already owned.
5. **Sparkline / calendar / icon-picker** — already registered despite older matrix `notRetained` / optional wording; matrix rows need a **maintenance pass** (see §7), not a new implementation.
6. **VForm-only extras** — essentially none beyond the three P0 atoms; Flux’s unique surface is data/AI/domain, not missing VForm widgets.

---

## 6. Where Flux already exceeds the benchmarks

Do not fund “parity” here:

- **AI conversation family** (14 types) — no AMIS equivalent.
- **SCADA / industrial editor**, **3D**, **pivot**, **map**, **dashboard**, **graph**.
- **Scheduling** Gantt / Kanban / Calendar / BarcodeInput as first-class renderers.
- **CRUD composition**: `crud` + `query-filter` + `batch-bar` + `stat-tile` + ownership/validation graph.
- **Composite value owners**: `condition-builder`, `object-field`/`array-field`/`variant-field`, `detail-field`/`detail-view`.
- **Mobile-native interaction** five-pack.
- **Content/feedback media** (qrcode, diff-view, result, carousel, …).

---

## 7. Doc consistency notes (maintenance debt, not new features)

| Issue                                                                                                                                                                                                                                                                                              | Action                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amis-baseline-matrix.md` still marks `slider`/`rating`/`input-color` as “future optional” / notRetained while this report P0-reopens atoms.                                                                                                                                                       | After human prioritization, update matrix rows **before** implementation (matrix is the retention authority).                                                                                               |
| Matrix / older survey list `icon-picker`, `sparkline`, `calendar`, **`hidden`** as optional/notRetained but live definitions register them.                                                                                                                                                        | Matrix maintenance pass: flip status to `runtime` where registered, keep `notRetained` only for true non-goals. (`hidden` was missed in earlier debt notes — add it.)                                       |
| Matrix `color` **display** row ≠ `input-color` form row — P0 targets the form field only.                                                                                                                                                                                                          | Clarify in matrix when flipping.                                                                                                                                                                            |
| `roadmap.md` O1 still lists `icon-picker`/`calendar` as optional-unimplemented (they’re registered) and `slider`/`rating`/`input-color` as non-retained (P0-reopened); O1 also lists `area` / `number-keyboard` / `back-top` as on-demand candidates that this report’s P3 wording may understate. | Roadmap O1 maintenance after human gate — **AI does not re-arbitrate priority** (Backlog Selection Rule).                                                                                                   |
| `control-gap-survey.md` (2026-08-04) Tier1 still valid as specialty source; header notes supersession/overlap by this report.                                                                                                                                                                      | Link both ways; do not fork a third survey. Specialty leftovers (`pdf-viewer`/`org-tree`/`mind-map`/`cron`/`excel-importer`) stay **survey-owned** — listed here for completeness, not promoted into P0/P1. |
| `existing-components-improvement-analysis.md` owns **capability gaps inside existing controls** (e.g. select filter, table resize).                                                                                                                                                                | Do not mix those into this missing-type report.                                                                                                                                                             |
| `roadmap.md` “0 retained-but-unimplemented” is true for **AMIS-retained** waves.                                                                                                                                                                                                                   | P0/P1 types are mostly **outside** retained AMIS baseline → need a new work-item wave only after matrix update.                                                                                             |
| **Wave label collision:** this report’s §8 “Wave N2” (cascader only; money sits in Wave N1) ≠ companion archetype report’s “N2 host channels.”                                                                                                                                                     | See mapping note under §8.                                                                                                                                                                                  |
| **Cross-package schema residual:** `flux-renderers-form/src/schemas.ts` still declares `InputTreeSchema`/`TreeSelectSchema` interfaces while the definitions register in `flux-renderers-form-advanced` (see §2).                                                                                  | Maintenance pass candidate: move the schema interfaces beside their registration face (or re-export) so package boundaries stay honest. Docs-only note; no behavior change.                                 |

---

## 8. Recommended sequencing

> **Wave label mapping (avoid collision with companion):** this report’s `Wave N0/N1/N2` are **type-registration waves**. Companion `page-archetype-coverage-audit` §5 uses `N0 atoms / N1 enterprise / N2 host channels / N3 interaction residuals / N4 demand-gated / N5 docs-only`. Mapping: **our N0 ≡ their N0**; **our N1 ≡ their N1** (includes money format); **our N2 (cascader only) ≡ their N1 conditional tail**; **their N2 (print/clipboard) is host-channel work outside this type register**; their N3/N4/N5 carry no type-registration waves.

1. **Wave N0 (P0, small→medium):** register `slider` → add `rate` UI+renderer → add `color` UI+renderer. Each with owner `design.md`, example, focused unit test, playground entry.
2. **Wave N1 (P1 enterprise):** design **one org data-source protocol** first, then `user-select` + `department-select`; then `region`; then `signature` (**matrix flip first**); then register `verification-code` on existing `InputOtp`; then `money` format protocol if required.
3. **Wave N2 (conditional types):** `cascader` column UX **or** document tree-select as the permanent answer. _(Not host channels — see mapping note.)_
4. **Explicit non-work:** P3 list; iframe/nav host shells; separate range types; `image-preview` as a type (capability ruling); Tabbar family.
5. **Survey leftovers (not this report’s waves):** `pdf-viewer`, `org-tree`, `mind-map`, `cron-editor`, `excel-importer` — stay in `control-gap-survey` until a host demand opens a plan.

**Definition of done for any P0/P1 item:** matrix row updated → `design.md` + `example.json` → registered definition → `pnpm typecheck` / `build` / `lint` / `test` → roadmap work item marked only after closure audit (human gate).

---

## 9. Multi-library cross-check (beyond AMIS)

> Second-pass benchmark: Element Plus, Ant Design, Vant, antd-mobile/TDesign, Form.io, Radix/shadcn. **Verdict:** these libraries mostly **confirm** the P0–P3 register; they add a small set of decoration/guide candidates and a few registration debts, not a second gap class.

### 9.1 Confirms existing tiers (no new work item)

| Library signal                                              | Already decided in this report                                                                                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| antd/Element `Rate`/`Slider`/`ColorPicker`                  | **P0** atoms (`rate`/`slider`/`color`).                                                                                                                                                                                      |
| antd/Element/Vant `Cascader`                                | **P1** `cascader` (tree-select ≈ partial).                                                                                                                                                                                   |
| antd `InputOTP` / shadcn InputOTP                           | **P1** `verification-code` (ui `InputOtp` unregistered). Note: Element Plus ships no InputOTP control, so this cell draws on antd/shadcn only.                                                                               |
| Form.io Signature / Address / Currency                      | **P1** `signature` / `region` / `money` format.                                                                                                                                                                              |
| antd/Element `Mentions` (form field)                        | **P2** (AI tiptap mentions ≠ form field).                                                                                                                                                                                    |
| Element `InputTag`                                          | near `tag-list` / `combo` — not a new type.                                                                                                                                                                                  |
| antd/Element `Descriptions`                                 | near `detail-view` (key-value display) — composition, not P0.                                                                                                                                                                |
| antd/Element `Segmented`                                    | near `button-group-select` — composition.                                                                                                                                                                                    |
| antd/Element `Statistic`                                    | **already registered**: `statistics` + `stat-tile`.                                                                                                                                                                          |
| antd `Steps`/`Timeline`/`Progress`/`Empty`/`QRCode`/`Alert` | **already registered** in content/layout packages.                                                                                                                                                                           |
| Form.io Survey / Nested forms                               | `matrix-checkboxes`/`combo`/`object-field` family — **P3** keep-out.                                                                                                                                                         |
| Form.io reCAPTCHA / phone mask                              | host/auth concern; `input-text` input-mask = **暂不实现** (`input-text/design.md` §2) — not a shipped mask protocol; phone mask remains an open **capability** item on the companion host-channel list — **not** a new type. |

### 9.2 New candidates from multi-library (fold into tiers, not a parallel backlog)

| Candidate                                  | Signal                                                                               | Tier                          | Action                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skeleton`                                 | ui `Skeleton` exported; no flux `type`; `components-audit.md` P1; Vant/antd common   | **P2 registration debt**      | Register like `slider` when a loading-placeholder host demand appears; `spinner`/`empty` already cover feedback.                                                                                                                                                                                               |
| `watermark`                                | antd/Element/Vant all ship; no flux type; print package has private `watermark` only | **P3**                        | Screen watermark is decorative; open only if compliance (anti-screenshot) demand is explicit.                                                                                                                                                                                                                  |
| `tour` / first-use guide                   | antd/Element tour; no flux type                                                      | **P3**                        | Host can compose with Dialog/Popover steps; open only for product onboarding wave.                                                                                                                                                                                                                             |
| `float-button`                             | antd; no flux type                                                                   | **P3**                        | Mobile/desktop floating action; page footer / sticky templates cover primary cases.                                                                                                                                                                                                                            |
| `splitter`                                 | antd Splitter; ui `Resizable` + `page.asideResizable` exist                          | **P2 composition**            | Prefer schema on page/grid over a new type unless multi-pane form editor demand appears.                                                                                                                                                                                                                       |
| `anchor` / `affix` / `back-top`            | antd/Element/Vant                                                                    | **P3 / O1 demand-gated**      | Sticky patterns via `page`/`container` className; nav family stays host-owned (matrix). `back-top` remains an on-demand O1 Flux-native candidate in `roadmap.md` — reword from “not worth” to “O1 demand-gated.”                                                                                               |
| `image-preview` / `lazyload`               | Vant core for galleries                                                              | **P2 capability, not a type** | **2026-06-21 mobile-infra proposal §3/§4 已裁定**: preview = behavior on `image` (pinch/lightbox), **not** a standalone renderer type. `lazyload` = `image`/`list` props. Do not open a type unless that ruling is explicitly superseded (human gate + matrix/roadmap update). Interim: `image` + Dialog zoom. |
| `password-input` (PIN) / `number-keyboard` | Vant payment flows                                                                   | **P3 / O1 demand-gated**      | Niche; use `input-password` + `inputmode` until a payment host is concrete. `number-keyboard` stays an on-demand **O1** candidate in `roadmap.md` — not a hard non-goal.                                                                                                                                       |
| `index-bar`                                | Vant contact list                                                                    | **P3**                        | Contacts go through P1 `user-select` picker, not a standalone list type.                                                                                                                                                                                                                                       |
| `area` (省市区 wheel picker)               | Vant `Area`                                                                          | **P1 `region`**               | Same as city/region — dataset-coupled, do not fork a second type. **Note:** `roadmap.md` O1 still lists a separate `area` candidate — reconcile O1 row with this fold-in at the next roadmap maintenance gate (human).                                                                                         |

### 9.3 Explicit non-goals from multi-library

Do **not** open: antd `Menu`/`PageHeader`/`Comment`/`Popconfirm` as types (host shell / Dialog+Popover composition); Element virtualized Select/Table/Tree as separate types (already table/tree performance path); Form.io Nested Forms as a new container (existing `object-field`/`combo`); Radix/shadcn playground-only widgets with no schema story.

---

## 10. Mobile + web gap consolidation

> Mobile baseline is **M0–M5 done** (`mobile-roadmap.md`): five native types live (`pull-refresh` `infinite-scroll` `swipe-cell` `countdown` `notice-bar`), responsive adaptation done for select/table/dialog/tabs/page/crud/chart/form-touch. **Tabbar/NavBar/ActionBar/SubmitBar/Sticky are NOT types** — `page/design.md` §14 region templates (human decision, locked). Do not re-open them as missing renderers.

### 10.1 Mobile gaps that are real (and who owns them)

| Gap                                           | Verdict                                                                                                                                                                                         | Owner                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Form atoms (`rate`/`slider`/`color`) on touch | **Same as web P0** — no separate `*-mobile` types (mobile-roadmap Rule).                                                                                                                        | Wave N0                                                 |
| `signature` (touch pad)                       | **P1** — canvas + pointer events; Vant `signature` + Form.io both ship it.                                                                                                                      | Wave N1                                                 |
| `region` / `area`                             | **P1** — one type, mobile wheel/desktop cascader UX via responsive branch.                                                                                                                      | Wave N1                                                 |
| `verification-code`                           | **P1** — ui `InputOtp` already; mobile bind flows.                                                                                                                                              | Wave N1                                                 |
| `skeleton`                                    | **P2 registration** — ui `Skeleton` exists; first-screen loading placeholder for mall/home.                                                                                                     | Demand-gated                                            |
| `image-preview` (pinch zoom gallery)          | **P2 capability on `image`** — per 2026-06-21 proposal ruling; product gallery not covered by `carousel` alone.                                                                                 | Demand-gated (capability)                               |
| `lazyload` images                             | **P2 capability** — belongs on `image`/`list` props (`loading="lazy"` + IntersectionObserver), not a new type.                                                                                  | improvement roadmap, not gap register                   |
| `cascader` column UX on small screens         | **P1 conditional** — if tree-select bottom-sheet rejected.                                                                                                                                      | Wave N2 (type-conditional; ≠ companion host-channel N2) |
| `money` format                                | **P1 format on `input-number`** — mobile checkout shows price precision.                                                                                                                        | Wave N1 (enterprise sequence; table P1)                 |
| Cell/list row pattern (`van-cell`)            | **Not a type** — `list` + `card`/`container` composition; document as template if demand repeats.                                                                                               | templates, not renderers                                |
| 宫格导航 (grid-nav)                           | **Proposed template on `grid`** — Vant analysis §3.3 notes it; source checkbox still **【需人确认】** (not a closed decision). Not a new type unless human closes the checkbox as “needs type.” | docs template (open confirm)                            |

### 10.2 Mobile false gaps (do not open)

| Item                                                                 | Why not a gap                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Tabbar / NavBar / ActionBar / SubmitBar / Sticky                     | `page.design.md` §14 — region + schema template, locked decision. |
| Stepper / number box                                                 | `input-number` already.                                           |
| ActionSheet / ShareSheet                                             | ui `Sheet` / `DropdownMenu` already.                              |
| Pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar | M5 **done**.                                                      |
| Select/Tree/Table/Dialog/Tabs bottom-sheet & card-stack              | M1 **done**.                                                      |
| Touch targets / inputmode / haptics / safe-area / z-index            | M0.1 + M2 **done**.                                               |
| Separate mobile component package beyond the five natives            | Architecture rejects `*-mobile` dual implementations.             |

### 10.3 Direct answer — what mobile+web is still worth adding

**Ship (same list, no mobile fork):** `slider` → `rate` → `color` (P0); then org pickers, `region`, `signature`, `verification-code`, optional `cascader`/`money` format (P1).

**Worth registering when demanded:** `skeleton` (P2 type); `image-preview` **as capability on `image`** (2026-06-21 ruling — not a type).

**Not worth adding as types:** Tabbar family, watermark, tour, float-button, index-bar, menu/page-header/comment types, second range types, `*-mobile` variants. **O1 demand-gated (roadmap, not hard non-goals):** `number-keyboard`, `back-top`.

**Desktop-only leftovers that stay composition:** splitter/anchor/back-top/descriptions/segmented — document patterns, do not mint types (back-top still O1-on-demand per roadmap).

---

## 11. Confidence and residuals

| Item                                                           | Confidence                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Live type inventory                                            | **High** — harvested from definition faces.                                          |
| P0 slider/rate/color absence                                   | **High** — zero production `type:` matches; slider UI confirmed.                     |
| Enterprise P1 absence                                          | **High** — no user/department/signature/city form types; contact-group is test-only. |
| Cascader “80% covered”                                         | **Medium** — interaction shape differs; product may reject tree UX.                  |
| Matrix stale rows (icon-picker etc.)                           | **Medium-high** — code shows registration; matrix text lags.                         |
| AMIS sidebar extras beyond form (log/tasks/portlet)            | **Medium** — deliberately P2/P3 under Flux principles.                               |
| Multi-library (Element/Vant/Form.io) adds no new P0            | **High** — signals fold into existing tiers (§9).                                    |
| Mobile skeleton/image-preview as only extra demand-gated items | **Medium-high** — ui Skeleton exists; gallery zoom unproven without a host.          |

**Open residuals (not blockers):**

- Exact canonical type names (`rate` vs `input-rate`, `slider` vs `input-slider`) need a naming pass against `docs/references/naming-conventions.md` before matrix edits.
- Org/directory data contract (backend API shape) is outside this frontend analysis.
- Whether money becomes a type or an `input-number` format is a product API decision.
- Whether `skeleton`/`image-preview` graduate from demand-gated P2 needs a host demo request, not a benchmark alone.

---

## 12. Related documents

- `docs/backlog/missing-components-and-designer-roadmap.md` — **P0–P2 + host channels + playground/设计器缺口的实施 roadmap**（2026-09-24 用户下达排期；含每组件 design.md/example 交付铁律）。
- `docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` — **page-level end-to-end** companion: 41 archetypes, host channels, interaction residuals (“有类型 ≠ 能精确拼页”). **Wave label mapping in its §5 / this §8.**
- VForm/Warm-Flow schema research — same-session work, **not committed to repo** (see §3 VForm row).
- `docs/analysis/2026-08-04-control-gap-survey.md` — broader multi-project candidate survey (Tier1–3; specialty leftovers owned here).
- `docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md` — full Vant mobile survey feeding §10.
- `docs/analysis/2026-06-21-mobile-mall-component-analysis-for-flux.md` / `2026-06-21-flux-vs-vant-full-comparison.md` — mall + infra companions.
- `docs/analysis/2026-06-21-mobile-infra-and-skeleton-proposal.md` — **image-preview capability ruling** + skeleton proposal (status 已裁定).
- `docs/components/mobile-roadmap.md` — M0–M5 status (all `done` for native five-pack).
- `docs/components/amis-baseline-matrix.md` — retention authority (must be updated before new retained types).
- `docs/components/roadmap.md` — implementation waves / phase status / **O1 candidate pool**.
- `docs/components/existing-components-improvement-analysis.md` — gaps **inside** existing controls.
- `docs/components/components-audit.md` — coverage-gate rule (gap counts only after matrix flip).
- `docs/references/new-renderer-introduction-audit.md` — mandatory audit when introducing a new renderer/package.
- `docs/references/naming-conventions.md` — naming pass before matrix edits (`rate` vs `input-rate`, …).
- `docs/architecture/renderer-env.md` — mandatory before any `RendererEnv` host-channel extension (companion N2).
- `docs/analysis/ui-review/C2-capability-gaps.md` + `docs/analysis/ui-review/D2-closure.md` — D1 pool / open-candidates ledger (host channels + density overlap).
- `docs/analysis/2026-09-05-framework-completeness/README.md` — parallel completeness report (index-routed).
- `docs/context/project-context.md` / `docs/context/ai-autonomy-policy.md` — freshness / autonomy gate before implementation.
