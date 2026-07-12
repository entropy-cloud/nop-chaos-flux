# Complex Pages Design

## Purpose

Complex Pages is a schema-driven business scenario showcase for the Flux low-code renderer. It validates Flux's CRUD/form/table/view patterns against real-world ERP business workflows drawn from `~/sources/` — the curated collection of open-source reference projects (amis, odoo, erpnext, carbon-erp, formily, nocobase, etc.).

The exhibit validates three claims:

1. Flux schema can express the full CRUD lifecycle (query/table/cards/form/export) that amis supports, without requiring monolithic 3355-line renderers (`~/sources/amis/packages/amis/src/renderers/CRUD.tsx`).
2. Flux schema can express ERP business patterns — approval workflows, master-detail with cascading sub-tables, combo line-item editing, tree-filtered lists — that reference the set of 20 open-source ERP systems under `~/sources/erp/`.
3. Flux schema can express complex form patterns (wizard, fieldset groups, cascading selects, combo) comparable to `~/sources/formily/packages/` and `~/sources/nocobase/` while keeping each concern isolated in its own page.

## Code Anchors

- `apps/playground/src/complex-pages/complex-pages-showcase.tsx` — shell with category sidebar
- `apps/playground/src/complex-pages/complex-pages-model.ts` — entry/category definitions
- `apps/playground/src/complex-pages/schema-page.tsx` — `import.meta.glob` JSON loader
- `apps/playground/src/complex-pages/shared/render-host.tsx` — `ShowcaseSchemaHost`
- `apps/playground/src/complex-pages/shared/showcase-env.ts` — mock `RendererEnv` (fetcher, notify, confirm, loadDict)
- `apps/playground/src/complex-pages/shared/mock-backend.ts` — in-memory database + routing
- `apps/playground/src/complex-pages/complex-pages.test.tsx` — 16 focused tests

## Architecture

```
┌───────────────────────────────────────────────┐
│            complex-pages-showcase.tsx          │
│  (sidebar nav + SchemaPage area)               │
├───────────────────────────────────────────────┤
│            schema-page.tsx                     │
│  (import.meta.glob → JSON → component cache)   │
├───────────────────────────────────────────────┤
│            shared/render-host.tsx              │
│  (ShowcaseSchemaHost: registry + compiler)      │
├───────────────────────────────────────────────┤
│            @nop-chaos/flux-react               │
│  (SchemaRenderer, useRendererRuntime, hooks)   │
├───────────────────────────────────────────────┤
│            shared/showcase-env.tsx             │
│  (RendererEnv: fetcher → mock-backend)         │
├───────────────────────────────────────────────┤
│            shared/mock-backend.ts              │
│  (MockDatabase: 36 users, 30 orders, ...)      │
└───────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Showcase shell** (`complex-pages-showcase.tsx`): category sidebar navigation, renders the selected page via `SchemaPage`. No scenario logic.

2. **Schema loader** (`schema-page.tsx`): Vite build-time `import.meta.glob('./page-schemas/*.json', { eager: true })` cache. `page-schemas/` is _not_ inside `src/` — JSON files are loaded from the colocated directory. The schema is passed to `ShowcaseSchemaHost` for rendering.

3. **Render host** (`render-host.tsx`): wraps the schema in a full Flux renderer environment — registers all renderer packages (basic, form, form-advanced, data, content, layout), installs the formula compiler (including the `$Arr` aggregation namespace), and mounts `Toaster`/`ConfirmHost` for the mock env.

4. **Renderer env** (`showcase-env.tsx`): a `RendererEnv` object with:
   - **fetcher** — routes `/r/...` URLs to `MockDatabase` methods via an `if/else` chain
   - **notify** — wraps `toast()` from `@nop-chaos/ui`
   - **confirm** — delegates to `confirm-bridge.tsx` AlertDialog
   - **loadDict** — returns static dictionaries (role, userStatus)

5. **Mock backend** (`mock-backend.ts`): in-memory SQL-like database with `createMockDatabase()` generating 30+ records per entity. Supports filtering (`$filter=deptId eq d1-2`), sorting (`$orderBy=id`), pagination (`$skip/$limit`), and CSV export.

## Schema Patterns

### Category A: Data Lists (standard-crud, tree-crud, inline-edit-table, advanced-query, crud-views-export)

These pages exercise the `CRUD` + `Table` renderer family. In amis (`~/sources/amis/packages/amis/src/renderers/CRUD.tsx`, 3355 lines), a single monolithic renderer owns fetch/sort/filter/paginate/render across all display modes (`mode: 'table' | 'cards' | 'list'`). Flux decomposes this:

| Concern         | amis (monolithic)                                | Flux (decomposed)                                                      |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Orchestration   | Inline inside CRUD.tsx                           | Schema `type: 'crud'` with loadAction/selection/dialog config          |
| Table rendering | `columns` on crud node                           | Separate `type: 'table'` inside crud's `body`                          |
| Card rendering  | `card` config on crud node with `mode: 'cards'`  | Separate page/tab with distinct schema, shared data-source             |
| Query form      | `filter` on crud node                            | Query form in sidebar or above table, with `filterTogglable`           |
| Bulk actions    | `bulkActions` array on crud node                 | `listActions` + `toolbarLayout` slots                                  |
| Export          | Built-in strings `'export-excel'`/`'export-csv'` | Explicit `ajax` action writing to scope, rendered via `link` component |
| Inline editing  | `quickEdit: true` on column                      | `quickEdit.body` + `quickSaveItemAction`                               |

**Design decision**: Flux keeps the `CRUD` orchestrator but does not embed all display modes inside it. The `crud-views-export` page demonstrates that table and cards views are independent schema fragments sharing a data source — the cards view has its own CRUD node with `mountOnEnter: true` and does not share the table's CRUD store. This avoids the amis problem where switching mode reuses the same store and field definitions become mode-coupled.

**ERP reference** (`~/sources/erp/INDEX.md`): The tree-crud page (left department tree + right user table filtered by selection) matches the organizational hierarchy pattern common across jsh-erp, redragon-erp, and odoo's employee directory. The advanced-query page (keyword + status + role + date range + ID interval) mirrors the filter panels in carbon-erp's React/TypeScript frontend.

### Category B: Master-Detail (master-detail, detail-subtables, approval-tasks)

These pages model the "one-to-many parent + children" arrangement pervasive in ERP order/document systems (`~/sources/erp/INDEX.md` — metasfresh, odoo sale.order, erpnext sales invoice).

| Pattern                           | Page             | Mechanism                                                  |
| --------------------------------- | ---------------- | ---------------------------------------------------------- |
| Select parent → load children     | master-detail    | Left radio list, `dependsOn` data-sources for right panels |
| Static parent → render sub-tables | detail-subtables | Default row, 3 sub-tables in tabs + 3 stacked              |
| Action on child → update parent   | approval-tasks   | Dialog form → ajax → `component:refresh` parent list       |

**Design decision**: Sub-tables use independent `data-sources` with `dependsOn` referencing the parent's selected row. Each sub-table has its own store; there is no "master" CRUD owning children. This matches the Flux data-domain-owner model (`docs/architecture/data-domain-owner.md`) where each data entity owns its fetch lifecycle.

**ERP reference**: The approval-tasks page (list → dialog → approve/reject → status change → refresh) directly maps to the "my pending approvals" dashboard card in odoo (`~/sources/odoo/addons/hr_holidays`) and carbon-erp's approval workflow. The detail-subtables page (order items + logistics timeline + shipping address + payment history) matches the odoo sale.order form view layout.

### Category C: Complex Forms (complex-form, combo-editor, form-wizard, business-document)

These pages exercise Flux's form composition capabilities beyond simple CRUD dialogs.

| Pattern           | Page              | Key features                                                                  |
| ----------------- | ----------------- | ----------------------------------------------------------------------------- |
| Sectioned form    | complex-form      | 3 fieldsets, cascading province/city selects, agreement checkbox gates submit |
| Repeatable rows   | combo-editor      | `type: 'combo'` with add/remove/reorder, seed rows, per-row inline fields     |
| Multi-step wizard | form-wizard       | 3 steps, per-step validation, final commit as single submit action            |
| Computed fields   | business-document | `$Arr.sumField` formula for line-item subtotals + grand total with tax        |

**Design decision**: The wizard (`form-wizard.json`) keeps per-step forms inside `steps[].body` and uses the parent form's submit — no shared store across steps. The combo editor (`combo-editor.json`) uses the `combo` renderer's built-in add/remove/reorder. The business document (`business-document.json`) demonstrates Flux formula expressions (`$Arr`) as a replacement for amis's `<%= expression %>` template syntax — the aggregation logic lives in the formula compiler rather than in column `tpl` strings.

**Formily reference** (`~/sources/formily/`): Formily decomposes forms into `@formily/reactive` (field-level state) + `@formily/react` (connector) + UI packages (`antd`, `next`, `element`). Flux's approach is different — each form field is a renderer component with its own store subscription. The complex-form page's cascading province/city selects demonstrate that Flux field-level reactivity matches Formily's `reactions` field but through runtime formula evaluation rather than a dedicated reactive kernel.

### Category D: Data Visualization (dashboard)

The dashboard page (`dashboard.json`) combines:

- Stat cards (total users, orders, revenue, approval rate, pending tasks, active products)
- Bar chart (daily trend via Chart.js wrapper)
- Two data tables (recent orders, pending approvals)

This validates that Flux can compose heterogeneous data sources into a single page without requiring a dedicated dashboard framework.

**NocoBase reference** (`~/sources/nocobase/`): NocoBase's data-model-driven approach decouples UI from data structure entirely. Flux's dashboard takes a middle path — data fetching is explicit (`data-sources` + API routes) but the mock backend generates aggregated responses (`/r/dashboard/summary`, `/r/dashboard/trend/daily`) that mirror nop's backend convention, not a general-purpose aggregation engine. This is a pragmatic choice for the playground; production ERP dashboards would likely use the nop report engine.

## Data Flow

### Schema Loading

```
complex-pages-showcase.tsx
  → receives pageId from route
  → mounts <SchemaPage pageId={pageId} />
    → import.meta.glob('./page-schemas/*.json', { eager: true })
    → SCHEMA_CACHE[pageId] = the parsed JSON
    → <ShowcaseSchemaHost schema={schema} />
      → registers all renderer packages
      → installs formula compiler ($Arr namespace)
      → creates RendererEnv with mock fetcher
      → renders <SchemaRenderer schema={schema} env={env} />
```

### API Routing

All API requests go through a single `RendererEnv.fetcher` function in `showcase-env.ts`:

```
/r/User/list          → MockDatabase.findUsers(filter, sort, page, pageSize)
/r/User/export        → MockDatabase.exportUsers() → CSV data URL
/r/Order/list         → MockDatabase.findOrders()
/r/Order/<id>/items   → MockDatabase.findOrderItems(orderId)
/r/Task/<id>/approve  → MockDatabase.approveTask(taskId)
/r/dashboard/summary  → MockDatabase.getDashboardSummary()
...
```

The route pattern follows nop's API convention (`/r/<Entity>/<action>`). The mock backend returns the same response envelope shape (`{ status, data, ... }`) that a real nop backend would.

### Mock Data

Generated by `MockDatabase` in `mock-backend.ts`:

| Entity        | Records | Key fields                                                   |
| ------------- | ------- | ------------------------------------------------------------ |
| departments   | 16      | id, name, parentId (tree: head → 3 divisions → 12 sub-depts) |
| users         | 36      | id, name, email, role, status, deptId, createTime            |
| orders        | 30      | 5 statuses, 3 channels, up to 6 items each                   |
| budgets       | 30      | year, department, monthly values, total                      |
| approvalTasks | 30      | title, applicant, amount, status, submitTime                 |
| orderItems    | auto    | sku, name, qty, price, subtotal                              |
| orderLogs     | auto    | time, action, operator                                       |
| addresses     | auto    | recipient, phone, address                                    |
| payments      | auto    | time, method, amount, status                                 |
| shipments     | auto    | time, station, description                                   |

30+ records per paginated entity ensures at least 3 pages at `pageSize: 10`, exercising pagination and filter cross-page selection.

## Design Decisions

### Why a mock backend instead of a real server?

- Zero external dependencies for the playground. The mock backend lives in `shared/mock-backend.ts` and starts/stops with the page.
- Deterministic data for tests. The `createMockDatabase()` function produces reproducible seed data — `users[0]` is always "张三", `departments[0]` is always "总公司".
- Fast iteration. Schema changes don't require backend API changes.
- The mock fetcher routes are structured to mirror nop backend conventions, so migrating to a real backend requires only URL changes in schema `api`/`loadAction` fields.

### Why per-page schemas instead of a unified CRUD config?

15 separate JSON schemas under `page-schemas/` each define exactly one page's layout. This is intentional:

- **Isolation**: Changing `dashboard.json` doesn't risk breaking `master-detail.json`.
- **Testability**: Each test assertion works against a specific schema file, with focused selectors.
- **Documentation**: Each JSON file is a self-contained example of a Flux pattern. Readers can open any file and understand the complete schema for that use case.
- **Flexibility**: A tree-crud and a standard-crud share the same underlying CRUD renderer but express completely different layouts. A single unified config would require branching logic that obscures the distinct use cases.

### Why the `$Arr` formula compiler extension?

The `$Arr` namespace (`$Arr.sumField`, `$Arr.sumProducts`, `$Arr.count`) is registered only in the showcase's formula compiler, not in the core Flux formula engine. This avoids pulling an array-aggregation dependency into `flux-formula`. The business-document page demonstrates that extension points are sufficient for domain-specific aggregation without core changes.

### Why `mountOnEnter: true` for CRUD cards and dynamic tabs?

- `crud-views-export` cards tab: prevents the cards CRUD from fetching data on initial page load when the table tab is active. The cards CRUD has its own data source and should not compete with the table view.
- `dynamic-tabs` remote tab: demonstrates lazy schema loading — the second tab mounts only when clicked, triggering `DynamicRenderer.loadAction` that fetches the CRUD schema from the mock backend.

## Comparison With amis CRUD (`~/sources/amis/`)

| Area                | amis (monolithic)                                           | Flux (decomposed)                                                   |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| **CRUD size**       | 3355 lines in CRUD.tsx                                      | ~400 lines orchestrator + separate table/cards/list renderers       |
| **Mode switching**  | `mode: 'table'\|'cards'\|'list'` on single crud node        | Separate schema nodes per view, shared data-sources                 |
| **Store**           | MobX-state-tree ICRUDStore                                  | Zustand vanilla stores (crud-store, table-store)                    |
| **Inline editing**  | `quickEdit` column config                                   | `quickEdit.body` renderer + `quickSaveItemAction`                   |
| **Export**          | Built-in toolbar strings                                    | Explicit ajax action → `setValue` → `link` component                |
| **Templates**       | `${var}` and `<%= expr %>` in string config                 | Solely formula expressions via Flux formula compiler                |
| **Filter form**     | `filter` on crud node                                       | `filterTogglable` + inline filter fields in CRUD body               |
| **Bulk operations** | `bulkActions` with inline forms                             | `listActions` with `toolbarLayout` slot composition                 |
| **Actions**         | `actionType: 'dialog'\|'ajax'\|'drawer'` with inline schema | Action node tree with `actionType` + separate dialog/drawer schemas |
| **Component model** | Class components with mixins                                | React 19 functional components with hooks                           |

## Comparison With ERP Frontends (`~/sources/erp/`)

The complex-pages exhibit intentionally mirrors the dominant ERP frontend patterns:

| ERP Pattern                                    | Complex Pages                   | Reference ERP                            |
| ---------------------------------------------- | ------------------------------- | ---------------------------------------- |
| Department tree + user list                    | tree-crud                       | jsh-erp, redragon-erp organization panel |
| Master order + item/address/payment sub-tables | master-detail, detail-subtables | odoo sale.order, erpnext sales invoice   |
| Approval workflow (list → dialog → approve)    | approval-tasks                  | carbon-erp, odoo hr_holidays Approval    |
| Dashboard with KPI cards + charts              | dashboard                       | odoo dashboard, carbon-erp home          |
| Multi-condition query form                     | advanced-query                  | All 20 ERPs' search panels               |
| Line-item combo with computed totals           | combo-editor, business-document | odoo sale.order lines, erpnext items     |
| Multi-step wizard                              | form-wizard                     | odoo onboarding, erpnext setup wizard    |
| Inline table editing                           | inline-edit-table               | carbon-erp budget grid, metasfresh       |

## Automation Coverage

The test suite (`complex-pages.test.tsx`) provides 16 tests covering every page:

- **2 registry tests**: entry ↔ component mapping, no orphaned entries
- **14 runtime tests**: one per page, using `screen.getByTestId` selectors and `textContent` assertions

Pattern per test:

1. Navigate to page via category selection → verify page component exists
2. Wait for data-sources to resolve → verify key data appears (e.g. user "张三" in tables, stat numbers in dashboard)
3. Interact (click tree node, click tab, click approve, click export) → verify expected side effect (filtered rows, card view shown, status changed, download URL written)

The tests do not use screenshot comparison (per AGENTS.md rule: "NEVER diagnose UI failures via screenshots"). All assertions are programmatic: `textContent` matching, `toHaveLength`, `not.toMatch`, and element existence checks.

## Related Documents

- `docs/architecture/playground-experience.md` — playground page model and route design
- `docs/architecture/renderer-runtime.md` — renderer/runtime/React contract
- `docs/architecture/data-domain-owner.md` — data ownership semantics
- `docs/architecture/scope-ownership-and-isolation.md` — scope isolation for sub-tables
- `docs/components/crud/design.md` — CRUD renderer design
- `docs/components/table/design.md` — table renderer design
- `docs/components/cards/design.md` — cards renderer design
- `docs/components/wizard/design.md` — wizard renderer design
- `docs/components/combo/design.md` — combo editor design
- `~/sources/amis/packages/amis/src/renderers/CRUD.tsx` — amis CRUD reference
- `~/sources/amis/examples/components/CRUD/` — amis CRUD examples
- `~/sources/erp/INDEX.md` — ERP reference index
- `~/sources/formily/packages/` — Formily field architecture reference
