# Complex Page Visual Snapshot Analysis — 2026-08-24

> Status: snapshot baseline (recorded after the R1/C1/C2 ui-review close).
> Purpose: record the current "framework-only" visual state across the 19
> `apps/playground/src/complex-pages/page-schemas/*.json` pages, identify the
> shared issues driving the "all pages look the same" complaint, and feed the
> auto-fix plan in `apps/playground/src/complex-pages/`.

## Scope

19 complex-page JSON schemas rendered through one shared wrapper:

- `apps/playground/src/complex-pages/complex-pages-showcase.tsx`
  — sidebar + active-page header (badges + title + description)
- `apps/playground/src/complex-pages/schema-page.tsx`
  — loads `page-schemas/*.json` and wraps in `PageFrame`
- `apps/playground/src/complex-pages/shared/page-frame.tsx`
  — the inner white `Card` container
- `apps/playground/src/complex-pages/shared/render-host.tsx`
  — `ShowcaseSchemaHost` (formula compiler + registry + Toaster + ConfirmHost)

Every page ultimately renders through the **same** header in
`complex-pages-showcase.tsx` + the **same** `PageFrame` in `page-frame.tsx`.
So a single fix at those two points propagates to all 19 pages, which is the
"only modify the core interaction-mode pages and the product will be basically
the same" observation the user is making.

## Methodology

Programmatic inspection per AGENTS.md (no screenshot-based diagnosis):

1. `page.evaluate()` against `http://127.0.0.1:5180/#/complex-pages/<id>`
2. `getComputedStyle()` on header / frame / table cells / buttons
3. Visual snapshots saved to `_tmp/cp-screens/` for the user to look at
   (PNGs only — programmatic reading is the actual diagnostic basis).

Visual snapshots captured (full-page Playwright, viewport 1440×900):

```
00-empty.png           advanced-query.png     approval-tasks.png
business-document.png  combo-editor.png       complex-form.png
crud-views-export.png  dashboard.png          detail-subtables.png
form-wizard.png        inline-edit-table.png  master-detail.png
standard-crud.png      tree-crud.png
```

## Findings

All findings are scoped to the **shared wrapper**, because the schema pages
themselves already render correctly — the schemas use Tailwind `text-2xl
font-bold` for titles, `text-sm text-muted-foreground` for descriptions, and
the inner widgets (table/form/wizard/combo) all render.

### F-1 — Wrapper header is too thin / "framework only"

`complex-pages-showcase.tsx:166-188` renders:

```tsx
<div className="mb-4 flex items-start justify-between gap-4 shrink-0">
  <div>
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
        {categoryLabel}
      </Badge>
      {features.map((f) => (
        <Badge key={f} variant="secondary" className="text-[10px]">
          {f}
        </Badge>
      ))}
    </div>
    <h1 className="text-2xl font-bold text-[var(--nop-text-strong)] m-0">{title}</h1>
    <p className="text-sm text-[var(--nop-body-copy)] opacity-70 mt-1 max-w-3xl">{description}</p>
  </div>
</div>
```

This is a `text-2xl` title on a transparent background with category + feature
badges above it. The 13 features (one per page) become a generic purple-tinted
badge cloud that looks identical on every page — that's the visual signal
people pick up as "all pages look the same".

Specifics:

- Category label uses `Badge variant="outline"` with `tracking-wider uppercase`
  — looks like a system label, not a section anchor
- Feature tags use plain `Badge variant="secondary"` — purple/violet across
  all 19 pages, no per-category differentiation
- Title `h1 text-2xl font-bold` is the same size as the page-internal h1
  titles in some schemas (e.g. `standard-crud.json:7` `text-2xl font-bold`)
- Description sits at `opacity-70` — feels like a footnote, not intro

### F-2 — `PageFrame` is a plain white Card

`shared/page-frame.tsx` (15 LOC):

```tsx
<Card className="p-4 flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</Card>
```

This produces a flat white container with `ring-1 ring-foreground/10` from
the underlying `nop-card` class. Issues:

- No shadow / no depth
- No category-tinted accent
- No section divider between the wrapper header and the page content
- The flatness means every schema's content sits inside an identical beige box

### F-3 — Two schemas have duplicate titles/descriptions

The wrapper already provides a header (title + description + category badge +
feature tags). Two schemas independently render their own title/description
inside the `PageFrame`, creating the "double title" visible in the
`standard-crud.png` and `dynamic-tabs.png` snapshots:

- `page-schemas/standard-crud.json:6-14`
  — `text | "用户管理（CRUD）"` + long description paragraph
- `page-schemas/dynamic-tabs.json:4-7`
  — `text | "远程标签页"`

The other 17 schemas correctly leave header to the wrapper.

### F-4 — Generic sidebar / empty state

`complex-pages-showcase.tsx:97-108`:

```tsx
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <p className="text-2xl font-bold text-[var(--nop-text-strong)]">Complex Pages</p>
      <p className="text-sm leading-relaxed text-[var(--nop-body-copy)] max-w-sm">{...}</p>
      <p className="text-xs text-[var(--nop-body-copy)] opacity-60">
        {n} 个真实业务页面 · {m} 个分类
      </p>
    </div>
  );
}
```

Centered text only, no icon, no visual anchor — feels like a placeholder.

### F-5 — Schema pages themselves render correctly

After removing F-3 duplicates and polishing F-1/F-2, no per-schema changes
are needed. The 13 shared operation modes (CRUD/Tree/InlineEdit/AdvancedQuery/
MasterDetail/DetailSubtables/ApprovalTasks/ComplexForm/Combo/Wizard/
BusinessDocument/Dashboard/CrudViewsExport) all use the same pattern (badges
→ title → description → content card), so a unified header + frame fix
applies to all of them.

## Fix Surface

Three files cover 100% of the pages:

1. `apps/playground/src/complex-pages/complex-pages-showcase.tsx`
   — header redesign + empty-state visual anchor
2. `apps/playground/src/complex-pages/shared/page-frame.tsx`
   — visual treatment (subtle accent, depth, divider)
3. `apps/playground/src/complex-pages/page-schemas/standard-crud.json`
   `apps/playground/src/complex-pages/page-schemas/dynamic-tabs.json`
   — remove duplicate title/description text inside body

No renderer-package changes needed — the inner widgets already render.

## Verification

- Programmatic: `page.evaluate()` reads of header DOM height, frame DOM
  shadow / border, badge count per category, "double-title" presence
  (`document.querySelectorAll('h1').length` per route)
- Visual: compare `_tmp/cp-screens/*.png` before/after
- Tests: `apps/playground/src/complex-pages/complex-pages.test.tsx` should
  still pass; tests use `data-testid` selectors so they don't depend on the
  visual classes we touch.
