# Page Archetype Coverage Audit（常见页面能否用 Flux 直接精确实现）

> Date: 2026-09-24（同日三次修订：独立双评审核查后修正——hover-peek 回写编号 ⑫⑭、C2 I11 实例数 3、85–90% 推导补注、交叉引用路径、matrix L16 表述消歧；一/二次修订内容见 git 历史）
> Scope: research only — no product-behavior code changes.
> Question: 还有其他组件吗？所有页面功能 Flux 都支持了吗？任何常见页面都能用 Flux **直接、精确**实现了吗？
> Method: live type inventory (~100+ registered types) × 41 common page archetypes × cross-cutting host capabilities; cross-checked against playground `complex-pages/` replicas (AntD Pro / Linear / Notion / Cal / Stripe / Airtable / Sundial), `C2-capability-gaps.md` 初版+回写①–⑮, **`D2-closure.md` §2 终态**, `control-gap-survey.md`, matrix `notRetained` rows, and `page/design.md` §14.
> Authority: comparative report. Type retention stays in `amis-baseline-matrix.md` (human gate before any new retained type); waves stay in `roadmap.md`; capability/productization queue stays in `C2`/`D2`; existing-control gaps in `existing-components-improvement-analysis.md`. **Do not re-litigate closed D1 items (G-F/G-B1/G-A/G-B2/G-B3/G-C/G-D).**

---

## 1. Direct answer

**No. Three different "no"s:**

| Claim                                                                                               | Verdict                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every common **content page body** can be composed from registered types                            | **~85–90% yes**（推导：严格 Full+Full\* = 25/41 ≈ 61%；14 个 Partial 的 body 均可拼出 = 39/41 ≈ 95%；引用区间按「body 可拼但交互精度打折扣」折算） — playground already proves login/CRUD/detail/dashboard/wizard/chat/kanban/gantt/calendar/booking/notion-db shells. |
| Every common **page can be _precisely_ implemented** (pixel/interaction parity, no hand-simulation) | **No** — remaining precision holes are **density 语义档、calendar date-cell/6 周格、range/fill-handle、hover-peek、G-J Resizable、G-K graph 状态色**等 D1 后残留 + replica 未回灌已交付原语；**not** option-row/keyboard/batch-bar（those shipped, see §3.3 Closed）.  |
| Flux ships **all** components other low-code/UI libs ship                                           | **No** — form atoms P0/P1 still missing (matrix gate); page-level **host channels** (print/clipboard/URL-filter/app-shell) are not types _or_ actions; specialty types (pdf-viewer, org-tree, mind-map, cron) remain survey-only.                                      |

**One sentence:** Flux can already _draw_ most common pages; a minority of interaction patterns still lack schema-level precision or host I/O channels; app chrome (menu, multi-tab workbench, iframe) and some host I/O are **deliberate non-goals**, not coverage failures.

---

## 2. Page archetype matrix (A–G)

Coverage key: **Full** = registered composition is enough and replicas prove it · **Full\*** = body Full with a named residual · **Partial** = body works, one named hole · **Blocked** = missing type or host channel · **Host** = out of Flux schema scope by design.

### A. Admin / backoffice

| #   | Archetype            | Coverage    | Hole                                                                                                                                        |
| --- | -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Login                | **Full**    | form + tabs + navigate                                                                                                                      |
| A2  | Register + OTP       | **Partial** | P1 `verification-code` (`InputOtp` unregistered)                                                                                            |
| A3  | KPI dashboard        | **Full**    | `dashboard` / `stat-tile` / `sparkline` / `echarts`                                                                                         |
| A4  | List + filter + CRUD | **Full\***  | density 语义档 (G-E residual); filter↔URL (D1 pool 回写⑧) — select-all-**on-page** already shipped via `batch-bar` + `selectAllMode:'page'` |
| A5  | Detail drawer        | **Full**    | `drawer` + `detail-view`                                                                                                                    |
| A6  | Settings             | **Full**    | tabs + form composition (sundial-settings replica)                                                                                          |
| A7  | User / role mgmt     | **Partial** | P1 `user-select` / `department-select`                                                                                                      |
| A8  | Audit log            | **Full**    | `timeline` + `table` + `diff-view`                                                                                                          |
| A9  | System monitor       | **Full**    | charts + `env.stream` / `openSocket` (host-injects; quick-reference still notes P-1 wording)                                                |

### B. OA / workflow

| #   | Archetype         | Coverage    | Hole                                                                                                                                                            |
| --- | ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Approval form     | **Partial** | P1 assignee pickers; `approval-tasks.json` exists                                                                                                               |
| B2  | Process tracking  | **Partial** | graph node data-driven color = **G-K open** (D2 §2.2 #12)                                                                                                       |
| B3  | Calendar schedule | **Partial** | registered calendar has month/week/day views; **Booker 6-week grid / date-cell select** still open (C2 回写④ source; _not_ G-C multi-view DB which is ✅ 回写⑭) |
| B4  | Meeting booking   | **Full\***  | Cal.com replica; _focus-refetch not simulated_ (interval covers; C2 回写④ 裁定不模拟)                                                                           |
| B5  | Notice feed       | **Full**    | list/cards/markdown/notice-bar                                                                                                                                  |
| B6  | Org directory     | **Partial** | P1 org protocol; `index-bar` P3 via picker                                                                                                                      |
| B7  | Todo center       | **Full**    | list/tabs/countdown (sundial family; some static-demo debt is replica quality, not type gap)                                                                    |
| B8  | Message inbox     | **Full**    | list + detail + badge; live push via env                                                                                                                        |

### C. ERP / commerce

| #   | Archetype                | Coverage    | Hole                                                                                                                            |
| --- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Product list             | **Full**    | crud/cards/query-filter (`query-filter` + `result` shipped G-A 回写⑪)                                                           |
| C2  | Product detail + gallery | **Partial** | gallery pinch/lightbox = **`image` preview capability** (2026-06-21 mobile-infra proposal 已裁定不立独立 type)                  |
| C3  | Cart                     | **Full**    | list + input-number + swipe-cell + SubmitBar template                                                                           |
| C4  | Checkout wizard          | **Partial** | wizard OK (`mountOnEnter` footgun documented); P1 `region` address                                                              |
| C5  | Order list               | **Partial** | body Full; **filter↔URL channel missing** (D1 pool 回写⑧)                                                                       |
| C6  | Order detail + print     | **Blocked** | **no `RendererEnv.print` channel** (buttons static in AntD Pro replica; print/clipboard verified absent from `renderer-api.ts`) |
| C7  | Inventory grid           | **Full**    | table group + inline edit (G-D productized 回写⑮)                                                                               |
| C8  | Invoice / finance        | **Partial** | P1 money format; PDF out = print-designer track not page body                                                                   |
| C9  | Supplier master          | **Partial** | same as A7 contact fields                                                                                                       |

### D. BI / analytics

| #   | Archetype          | Coverage       | Hole                                                                                                                                                                    |
| --- | ------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | KPI board          | **Full**       |                                                                                                                                                                         |
| D2  | Report page        | **Full\***     | _export = host_ (naming-conventions: 前端不做导出); `downloadBlob` + blob `responseType` exist — declarative download **action** still thin                             |
| D3  | Pivot              | **Full**       | `pivot-table` exceeds AMIS                                                                                                                                              |
| D4  | Chart drill-down   | **Partial**    | linkage expressible but friction (C1-8); **page-header `breadcrumb` field ✅** (G-A 回写⑪) — standalone body-level Breadcrumb type still unregistered / host-IA posture |
| D5  | Print / PDF report | **Host track** | separate `web-print-research` / `flux-print-*` designer (P0–P4 **closed** in `web-print-roadmap`) — **not** the runtime page type set                                   |

### E. Content / CMS

| #   | Archetype             | Coverage    | Hole                                                            |
| --- | --------------------- | ----------- | --------------------------------------------------------------- |
| E1  | Article list + editor | **Full**    | markdown-editor / editor / word-editor-page                     |
| E2  | Media gallery         | **Partial** | lightbox = same `image` preview **capability** (not a new type) |
| E3  | Form-builder preview  | **Full**    | designer-\* family                                              |

### F. Messaging / AI

| #   | Archetype         | Coverage | Hole                       |
| --- | ----------------- | -------- | -------------------------- |
| F1  | Chat              | **Full** | 14 AI types (exceeds AMIS) |
| F2  | Notification feed | **Full** | list/badge + socket        |

### G. Mobile shells

| #   | Archetype                                  | Coverage             | Hole                                          |
| --- | ------------------------------------------ | -------------------- | --------------------------------------------- |
| G1  | Tab / Nav / Action / Submit / Sticky shell | **Full (by design)** | `page` §14 templates — **not types** (locked) |
| G2  | List–detail push                           | **Full**             | M1 bottom-sheet / full-screen dialog          |
| G3  | Mobile wizard + sticky CTA                 | **Full**             | wizard + footer template                      |
| G4  | Pull-refresh feed                          | **Full**             | M5 five-pack done                             |
| G5  | Gallery lightbox                           | **Partial**          | same as C2 — `image` preview capability       |

**Scoreboard (body-level, 41 rows):** Full 22 · Full\* 3 (A4/B4/D2) · Partial 14 · Blocked 1 (C6 print) · Host 1 (D5). Partial holes collapse to **~10 root causes**, not 30 missing widgets.

---

## 3. Root causes behind every Partial/Blocked row

### 3.1 Missing types (companion `visual-quality/2026-09-24-missing-component-gap-analysis.md` P0/P1/P2)

| Root                                   | Hits archetypes                           | Gate                                                                     |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| P0 `rate` / `slider` / `color`         | any rating/price-filter/theming form      | matrix re-open (human) then register                                     |
| P1 `user-select` / `department-select` | A7 B1 B6 C9                               | org data-source protocol                                                 |
| P1 `region` / city                     | C4 C8 address                             | matrix (one type; do not fork `area`)                                    |
| P1 `signature`                         | OA 收货/审批                              | **matrix L284 notRetained — flip before implementation**                 |
| P1 `verification-code`                 | A2                                        | register ui `InputOtp`                                                   |
| P1 `cascader`                          | hierarchy pickers                         | conditional — tree-select may be permanent answer                        |
| P1 `money` format on `input-number`    | C8                                        | format protocol, not new type (align companion Wave)                     |
| P2 `skeleton` (ui exists, no type)     | A3 E2 G4 first paint                      | demand-gated registration                                                |
| P2 body-level `breadcrumb` type        | D4 only if page-header field insufficient | page-header breadcrumb already ✅                                        |
| P2 `location-picker` / `input-excel`   | logistics / BI import                     | demand-gated                                                             |
| — `image-preview` as **type**          | C2 E2 G5                                  | **NOT a type** — 2026-06-21 proposal 已裁定为 `image` preview capability |

Survey-only specialty still unowned (`control-gap-survey`): **`pdf-viewer`** (Tier1), **`org-tree`** (Tier1), **`mind-map`** (Tier1), **`cron-editor`** (Tier2), **`excel-importer`** (Tier3). **`iframe`** = matrix host-owned (iframe row L293; “L16 裁定” is the matrix's own signal label, not the file line) — not a Flux registration gap.

### 3.2 Host channels — not renderer types, still page-blocking

These are **not** fixed by inventing widgets. They need `RendererEnv` / action vocabulary (D1 pool 回写③④⑤⑧ + C2 I11):

| Channel                  | Evidence                                                                                                                                                                                                   | Blocks                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **print**                | C2 回写③: AntD Pro detail print button static; **no `env.print`** (verified absent from `renderer-api.ts`)                                                                                                 | C6 order/invoice print                     |
| **clipboard**            | C2 I11 three copy-link instances (Cal/Linear/Notion): “已复制” without write; **no env/action channel**                                                                                                    | share/copy-link patterns                   |
| **download / export UI** | `downloadBlob` + `ApiSchema.responseType:'blob'` + `downloadFileName` **exist**; missing = declarative download **action** sugar + export toolbar honesty (export itself = backend per naming-conventions) | D2 toolbar honesty                         |
| **filter ↔ URL sync**    | C2 回写⑧ D1 pool #9                                                                                                                                                                                        | A4/C5 deep-link filters                    |
| **window focus refetch** | C2 回写④: interval covers; focus watch **裁定不模拟**                                                                                                                                                      | booking freshness edge (accepted residual) |
| **host toast container** | C2 回写③④⑤: toast dies on navigate unless debounce hack                                                                                                                                                    | multi-step flows                           |
| **theme switch entry**   | C2 G-I narrowed / D2: tokens OK, playground hardcodes light                                                                                                                                                | dark product pages                         |
| **PDF / Office preview** | no flux type; word/spreadsheet are editors not viewers                                                                                                                                                     | ERP attachment preview (survey Tier1)      |
| **input phone mask**     | `input-text` mask = **暂不实现** (`input-text/design.md` §2) — not a shipped protocol                                                                                                                      | checkout precision (capability, not type)  |

### 3.3 Interaction primitives — Open vs Closed-with-residuals (D1)

**Authority:** `D2-closure.md` §2.1 (terminal map) + `C2` 回写⑨–⑮. **Do not re-open closed items as “missing primitives.”**

#### Closed with residuals (D1 productized — cite, don’t re-propose)

| ID                   | Terminal state                                                                                                                                          | Residual only                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| G-F / G-F2           | ✅ option-row productized (`OptionRowConfig` + flux-react helpers; list/table/ai-feedback adopters; G-F2 absorbed) — plan `2026-08-30-1333-2` completed | gantt `selectedClass` adoption; calendar drop-target CSS successor; **replica retrofit** |
| G-B1                 | ✅ `command-palette` type (cmdk ↑↓/Enter/`data-selected`, 回写⑩)                                                                                        | custom fuzzy scoring / recent sort / app-level palette singleton                         |
| G-B2                 | ✅ `keyboard` type (chord/`when`/`allowInInput`/action dispatch; `modifierSelect`; 回写⑫)                                                               | hover-peek; range/fill-handle deferred; kanban gesture variants; shared roving           |
| G-B3                 | ✅ `batch-bar` + `selectAllMode:'all'\|'page'` (回写⑬)                                                                                                  | **zero replica retrofit** (explicitly deferred)                                          |
| G-C (multi-view DB)  | ✅ tabs collection mgmt + kanban aggregate (回写⑭) — **this ID is NOT the calendar gap**                                                                | —                                                                                        |
| G-D (grid edit core) | ✅ group/aggregate + in-place edit (回写⑮)                                                                                                              | column **drag-sort + fixed columns** (show/hide+up/down already in columnSettings)       |
| G-A                  | ✅ `page.breadcrumb`/`extra`, `query-filter`, `result` (回写⑪)                                                                                          | body-level breadcrumb type optional/host-IA                                              |

#### Still open — precision gaps + deferred residuals (as of 2026-09-24)

> Note: rows marked _residual_ are deferred adoption/docs work, not missing primitives; they stay listed here so the N3 bucket in §5 is exhaustive.

| ID / topic                                                                | Gap                                                             | Why not precise                                                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **calendar date-cell grid** (C2 回写④ source; _disambiguate from G-C DB_) | Booker-style 6-week grid / date-cell select                     | month/week/day resource views exist; **date-cell selection API absent**                                   |
| **G-E density 语义字段**                                                  | density enum + table prop                                       | CSS tokens proven (回写⑧); semantic field still in D1 input-pool — **no `density` prop on renderers yet** |
| **G-J**                                                                   | Resizable schema                                                | ui primitive exists; multi-pane schema not productized (D2 §2.2 #12)                                      |
| **G-K**                                                                   | graph node status color                                         | process tracking partial (D2 §2.2 #12)                                                                    |
| range / fill-handle                                                       | table range selection model                                     | D1 deferred (回写⑫ / D2 #3)                                                                               |
| hover-peek                                                                | view↔peek hover linkage                                         | explicit deferred (回写⑫ timer residual + 回写⑭ linkage 裁定)                                             |
| kanban gesture variants                                                   | card drag semantics                                             | deferred with G-B2 residuals                                                                              |
| cardTemplate **per-card params**                                          | region params binding                                           | 回写⑪ residual                                                                                            |
| wizard `mountOnEnter` footgun                                             | step data wipe without flag                                     | documented; guide note unverified                                                                         |
| `refreshSource` parent chain                                              | form→page refresh must use `component:refresh`                  | known API shape                                                                                           |
| **replica retrofit**                                                      | option-row / keyboard / batch-bar not wired into older replicas | deferred in 回写⑬ — not a missing primitive                                                               |

### 3.4 Deliberate non-goals (do **not** count as “Flux can’t do pages”)

| Item                                                       | Why out                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Global menu / ProLayout chrome / multi-tab workbench shell | matrix `nav`/`anchor-nav` notRetained; host navigation; `WorkbenchShell` is designer-only React (`2026-08-05-page-vs-workbench-layout-analysis.md` §3) |
| `iframe` embed                                             | matrix iframe row (L293) security/host policy                                                                                                          |
| Excel/CSV export in table                                  | naming-conventions: 后端职责                                                                                                                           |
| App router / route params isolation                        | host nav; A16 in `docs/components/amis-bug-driven-improvements/11-api-data-and-scope.md` (not bug-15)                                                  |
| Tabbar family as types                                     | `page/design.md` §14 locked                                                                                                                            |
| Backend print service / silent printer                     | print-designer track (web-print-roadmap P0–P4 **closed**) — distinct from N2 `RendererEnv.print` host channel                                          |
| `image-preview` as standalone type                         | 2026-06-21 mobile-infra proposal **已裁定** = `image` preview behavior                                                                                 |

### 3.5 Third-party reference map (design inputs — not dependencies)

Borrow API shape / state contracts / vocabularies for the **open** rows above; do **not** vendor libraries into Flux packages. Closed D1 items already chose their references historically (cmdk for palette, etc.).

| Flux gap (open)                                                       | First-class references                                                                                                 | Semantic to borrow                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| calendar date-cell grid                                               | **react-day-picker**, React Aria Calendar                                                                              | ARIA key map; `mode='single\|range'`; Day cell slots keep focus/keyboard    |
| density tiers                                                         | Carbon (4 row heights), Ant Design Table `size`, Fluent                                                                | Density = **token-level enum** + toolbar pairing rules                      |
| range / fill-handle / modifier select                                 | TanStack `isRowRangeSelectionEvent`, AG Grid range selection                                                           | Modifier → selection-semantics as configurable predicate                    |
| batch-bar dual select-all (**shipped** — reference for retrofit only) | TanStack `toggleAllPageRowsSelected` vs `toggleAllRowsSelected`, AG Grid `selectAll: 'all'\|'filtered'\|'currentPage'` | Two APIs: page vs dataset; selected-id map survives pagination              |
| option-row markers (**shipped** — adopter reference)                  | Radix Select, Headless UI Select                                                                                       | `data-state` / `data-highlighted` first-class DOM contract                  |
| keyboard chords (**shipped** — residual gestures)                     | react-hotkeys-hook                                                                                                     | Chord → action-id registry (already how `keyboard` type works)              |
| command-palette (**shipped**)                                         | cmdk, react-command-palette                                                                                            | Unstyled component with internal React context; no app-level store required |

### 3.6 Redesign principles for residual N3 work (how — not “one widget per gap”)

Third-party libs are headless _applications_. Flux is a **schema runtime**. Closing remaining §3.3 Open rows must follow the **same shared-substrate pattern that already closed G-F/G-B2/G-B3** — never a per-renderer bespoke implementation:

1. **Unified substrate, not component-local engines.** Interaction state sources (selection set, keyboard pointer/focus, hover, density, select-all scope) live once in owner/runtime state + scope bindings. Renderers subscribe; they do not each invent a state machine.
2. **Reuse schema compile → render pipeline.** New expressiveness enters as **compiled schema fields / action plans / reaction `dependsOn` roots** (`flux-compiler` + `TemplateNode.reactionPlans`), not as ad-hoc React props drilled per component. If it cannot be compiled, it is not a schema feature.
3. **Reuse the action vocabulary.** Chords, batch-bar commands, print/clipboard, refresh chains dispatch through the existing `xui:actions` program model (lexical names, runtime data bindings, `component:<id>` capability contracts) — not document-level `addEventListener` islands inside each renderer. **Keyboard action dispatch already exists** (`keyboard` type); extend it, don’t fork a second registry.
4. **Coordination = binding; component body = render + thin local state.** Cross-component behavior is **declarative binding** (`name` / `optionRow.value` / region `render({ bindings })` / reaction `dependsOn`). A control’s own body stays: resolve `props`/`meta`, emit markers/classes, manage only UI-local ephemeral state (open, typing, drag threshold).
5. **One primitive kills a family; adoption via shared helpers.** Proven: **G-F `option-row`** (`OptionRowConfig` + `getOptionRowStateTokens`; markers `data-option-row`/`data-state`/`aria-selected`; list + table + ai-feedback; G-F2 absorbed; J/K × optionRow test) — plan `2026-08-30-1333-2-d1-gf-option-row-primitive.md` **completed + closure audit APPROVED**. Remaining Open work follows this shape: shared contract in `renderer-interfaces`/flux-react helpers → N adopters → unit matrix — **not** N hand-rolled patches. Same for G-B2/G-B3: retrofit adopters onto shipped primitives.
6. **Reference libraries supply semantics, Flux supplies ownership.** Map Carbon density onto theme tokens + one table density prop; map TanStack range predicates onto selection bindings; do not re-implement React Aria’s full a11y machine inside each field renderer.

**Anti-patterns (reject in review):** per-renderer local `useState` that duplicates an owner-level concept; new prop that only one control understands without a shared contract; coordination via parent re-render side effects instead of bindings; “temporary” global key handlers bypassing the `keyboard` action registry; copying a third-party component body into `flux-renderers-*`; **re-opening G-F/G-B2/G-B3/G-C/G-D as if unimplemented**; minting types before matrix flip (signature, slider, …).

---

## 4. What playground already proves (so don’t re-litigate)

Live `apps/playground/src/complex-pages/page-schemas/` includes working replicas for:

`standard-crud`, `antdpro-{list,detail-*,dashboard,form-*,result}`, `linear-{issues,board,detail,inbox,projects,settings}`, `notion-database`, `airtable-grid`, `cal-{booking,confirm,success}`, `stripe-payments`, `sundial-*`, `approval-tasks`, `form-wizard`, `complex-form`, `combo-editor`, `dashboard`, `tree-crud`, `master-detail`, `advanced-query`, `business-document`, `dynamic-tabs`, …

D2 counts **26 app-replica pages** + 14 enterprise complex pages (40 schemas total). Implication: the open question is no longer “can Flux build a CRUD page?” — it is the **Open-side root causes in §3** (few types + host channels + density/calendar/range residuals + replica retrofit of shipped primitives).

---

## 5. Recommended prioritization (page-shaped, not widget-shaped)

| Tier                                           | Work                                                                                                                                                                                                                                                                               | Unblocks                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **N0**                                         | P0 atoms `slider`→`rate`→`color` (after matrix re-open)                                                                                                                                                                                                                            | any evaluation/filter form                                   |
| **N1**                                         | P1 org + `region` + `signature`_(matrix flip first)_ + OTP + money format + cascader decision                                                                                                                                                                                      | OA/ERP checkout/approval                                     |
| **N2 (host, plan-first)**                      | `RendererEnv.print` + `clipboard` (+ declarative download action on existing `downloadBlob`); toast host container; filter↔URL                                                                                                                                                     | C6, share flows, deep links, multi-step UX                   |
| **N3 (residual only — shared substrate §3.6)** | density token enum + table prop; calendar date-cell/6-week mode (react-day-picker semantics); range/fill-handle; hover-peek; kanban gestures; G-J; G-K; cardTemplate params; **replica retrofit** of option-row/keyboard/batch-bar — **do not re-implement shipped D1 primitives** | “precise” parity on list/booking pages                       |
| **N4 (demand-gated)**                          | `skeleton`; body-level `breadcrumb` only if page-header field insufficient; `input-excel`; `pdf-viewer` (survey Tier1) as **viewer capability**                                                                                                                                    | gallery skeleton / ERP preview/import                        |
| **N5 (docs-only)**                             | wizard `mountOnEnter` guide note (verify + land); `refreshSource` parent-chain doc note                                                                                                                                                                                            | closes §3.3 open rows that are documentation debts, not code |
| **Never as types**                             | menu shell, multi-tab workbench, iframe, export backend, Tabbar family, **`image-preview` (→ `image` capability)**                                                                                                                                                                 | stay host / templates / capabilities                         |

**Definition of done for “any common page precise”:** every Partial/Blocked row in §2 either moves to Full via N0–N3, or is explicitly reclassified Host/Non-goal with a written matrix/`design.md` decision — not left as an unwired static button. Closed D1 residuals close via **retrofit + guide notes**, not new plans re-proposing the primitive.

---

## 6. Confidence

| Item                                                                     | Confidence                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Type inventory                                                           | High (definition-face harvest + live grep this audit)                                                   |
| Replica proves Full rows                                                 | High (schemas + e2e exist; D2 26-replica census)                                                        |
| Host channel blockers (print/clipboard)                                  | High (verified absent from `renderer-api.ts`; C2 writebacks)                                            |
| download partial (blob exists)                                           | High (`blob-download.ts` + schema `responseType`)                                                       |
| Open interaction residuals (density, calendar date-cell, range, G-J/G-K) | High (range/G-J/G-K per D2 §2.1/§2.2 terminal map; calendar date-cell per C2 回写④ — closed ≠ residual) |
| Closed D1 items (G-F/B1/B2/B3/C/DB, G-D core)                            | High (7 completed plans + C2 回写⑨–⑮)                                                                   |
| pdf-viewer/org-tree/mind-map/cron unregistered                           | High (live grep this audit: zero `type:` matches)                                                       |
| Exact % “85–90% body coverage”                                           | Medium (archetype sampling, not formal metric)                                                          |
| `env.stream`/`openSocket` Full vs quick-reference “待 P-1” wording       | Medium (contract live; docs lag — flag discrepancy)                                                     |

---

## 7. Related

- `docs/backlog/missing-components-and-designer-roadmap.md` — **本文 N0–N5 + 缺失类型 + playground/设计器缺口的实施 roadmap**（2026-09-24 用户下达排期）。
- `docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md` — widget-level P0–P3 + multi-library + mobile addendum.
- `docs/analysis/ui-review/C2-capability-gaps.md` — L1–L4 adjudications + **append-only 回写①–⑮** (do not edit §1 table).
- `docs/analysis/ui-review/D2-closure.md` — **§2.1 closed map / §2.2 open-candidates ledger** (authoritative for §3.3).
- `docs/backlog/ui-review-roadmap.md` — four work lines `done`.
- `docs/analysis/ui-review/R2-consistency-audit.md` — family 2 evidence base for option-row premise.
- `docs/analysis/ui-review/P1-reference-apps/cal-booking.md` — calendar/date-cell reference wording source.
- `docs/analysis/2026-08-04-control-gap-survey.md` — specialty candidates (Tier1 pdf-viewer/org-tree/mind-map; Tier2 cron; Tier3 excel-importer).
- `docs/components/amis-baseline-matrix.md` — notRetained nav/iframe/**signature** rows + Maintenance Rule.
- `docs/components/page/design.md` §14 — mobile shell templates (locked).
- `docs/components/mobile-roadmap.md` — M0–M5 done baseline.
- `docs/analysis/2026-08-05-page-vs-workbench-layout-analysis.md` — page ≠ workbench decision.
- `docs/analysis/web-print-research.md` + `docs/backlog/web-print-roadmap.md` — print/PDF product track P0–P4 closed (separate from N2 host channel).
- `docs/architecture/renderer-env.md` — **required reading before any `RendererEnv.print/clipboard` extension** (N2).
- `docs/architecture/action-scope-and-imports.md` — `xui:actions` / binding model.
- `docs/architecture/field-metadata-slot-modeling.md` — reaction `dependsOn` + region `render({ bindings })`.
- `docs/references/renderer-interfaces.md` — §Option-Row, §Keyboard Binding, §Batch Bar, §Table Select-All, §Page Header/Query Filter/Result.
- D1 plans (completed): `2026-08-30-1333-2` (G-F), `2026-08-30-1737-1` (G-B1), `2026-08-30-1737-2` (G-A), `2026-08-30-2312-1` (G-B2), `2026-08-30-2312-2` (G-B3), `2026-08-31-0721-1` (G-C DB), `2026-08-31-0721-2` (G-D).
- `docs/components/amis-bug-driven-improvements/11-api-data-and-scope.md` — A16 host-nav residual path.
- `docs/analysis/2026-06-21-mobile-infra-and-skeleton-proposal.md` — **image-preview capability ruling** (not a type).
- `docs/analysis/2026-09-05-framework-completeness/README.md` — parallel completeness report.
- `apps/playground/src/complex-pages/` — living proof of composition coverage.
