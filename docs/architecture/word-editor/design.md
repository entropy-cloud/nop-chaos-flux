# Word Editor Architecture

> Owner Doc Status: Active
> Last Updated: 2026-04-16

## Overview

The Word Editor is a document template designer built on `@hufe921/canvas-editor`, providing a Word-like editing experience for creating NOP platform template documents. It follows the two-package pattern used by other complex editors in the workspace:

- `@nop-chaos/word-editor-core` — Framework-agnostic state management, models, and canvas-editor integration
- `@nop-chaos/word-editor-renderers` — React rendering layer and UI components

## Package Responsibilities

### word-editor-core

Pure TypeScript package with no React dependencies. Contains:

| Module                    | Responsibility                                                   |
| ------------------------- | ---------------------------------------------------------------- |
| `editor-store.ts`         | Zustand store for editor state (mode, selection, dirty tracking) |
| `dataset-store.ts`        | Zustand store for dataset management (data sources, fields)      |
| `canvas-editor-bridge.ts` | Bridge to `@hufe921/canvas-editor` instance commands             |
| `document-io.ts`          | Document serialization/deserialization                           |
| `template-expr.ts`        | Template expression parsing (`${expr}` syntax)                   |
| `template-tags.ts`        | Template tag definitions (`<c:for>`, `<c:if>`, etc.)             |
| `template-model.ts`       | Template document model types                                    |
| `chart-model.ts`          | Chart placeholder model                                          |
| `code-model.ts`           | Code block model                                                 |
| `dataset-model.ts`        | Dataset and field definitions                                    |
| `paper-settings.ts`       | Paper size and margin configuration                              |

### word-editor-renderers

React 19 rendering layer. Contains:

| Module               | Responsibility                               |
| -------------------- | -------------------------------------------- |
| `WordEditorPage.tsx` | Main page component orchestrating all panels |
| `EditorCanvas.tsx`   | Canvas-editor wrapper with React lifecycle   |
| `toolbar/`           | Ribbon-style toolbar components              |
| `panels/`            | Side panels (dataset, properties)            |
| `dialogs/`           | Modal dialogs (chart config, code config)    |
| `preview/`           | Document preview components                  |
| `hooks/`             | React hooks for editor integration           |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        WordEditorPage                           │
│  ┌──────────────┐  ┌─────────────────────┐  ┌───────────────┐  │
│  │ DatasetPanel │  │    EditorCanvas     │  │ PropertyPanel │  │
│  │              │  │                     │  │               │  │
│  │ dataset-store│  │ canvas-editor-bridge│  │  editor-store │  │
│  └──────┬───────┘  └──────────┬──────────┘  └───────┬───────┘  │
│         │                     │                     │          │
│         └─────────────────────┼─────────────────────┘          │
│                               ▼                                │
│                      @hufe921/canvas-editor                    │
│                        (Canvas 2D rendering)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Document Model

The live editor currently separates three related but distinct data surfaces:

1. `WordDocument` - the editable template document projected into host scope
2. `SavedDocumentData` - the persisted envelope used by document save/load
3. dataset store state - the separate data-source model injected through host scope

Current `WordDocument` shape:

```typescript
interface WordDocument {
  header: ElementList;
  main: ElementList;
  footer: ElementList;
  charts?: ChartConfig[];
  codes?: CodeConfig[];
}
```

Current persisted envelope:

```typescript
interface SavedDocumentData {
  data: WordDocument;
  paperSettings: PaperSettings;
  savedAt: string;
}
```

Notes:

- `paperSettings` belongs to the saved envelope, not `WordDocument`
- datasets are maintained in the separate dataset store and projected through host scope as `datasets`
- the canonical public vocabulary is `Dataset*`
- the live document model does not currently expose `watermark`
- `document` in host scope is the persisted/autosaved document snapshot, not the realtime in-memory editor internals

## Template Expression System

The Word Editor uses NOP platform's XLang expression syntax:

| Syntax    | Purpose              | Example                                  |
| --------- | -------------------- | ---------------------------------------- |
| `${expr}` | Text expression      | `${order.customerName}`                  |
| `<c:for>` | Loop block           | `<c:for items="${orders}">...</c:for>`   |
| `<c:if>`  | Conditional          | `<c:if test="${total > 100}">...</c:if>` |
| `expr:`   | Hyperlink annotation | `expr:${imageResource}`                  |

This differs from SpringReport's `{{field}}` syntax but aligns with nop-entropy's WordTemplate model.

## Integration Points

### With Flux Runtime

The Word Editor page is rendered as the `word-editor-page` host-owner renderer and follows the same host-manifest / host-projection / namespaced-action pattern as the other domain editors. The page receives:

- `onBack` and `onSave` action handlers
- `initialDocument` for loading existing templates
- `datasets` for pre-configured data sources
- `statusPath` for a narrow external host summary when needed

Current live workbench behavior is:

- substantial built-in default UI remains renderer-owned, including the Ribbon toolbar, the default dataset/field left panel, and the default outline right panel
- `toolbar`, `leftPanel`, and `rightPanel` are explicit override surfaces; when provided, the renderer mounts those schema regions with the word-editor host scope and action scope
- this is a host-family-specific “default UI + differential override” pattern, not a requirement that every visible control be declared by schema
- this pattern is intentionally owned by `word-editor-page` itself; Flux does not currently define one universal cross-designer baseline object that all workbench families must implement

The renderer publishes the `word-editor` host family manifest, host projection scope, and namespaced actions such as `word-editor:save`, `word-editor:insertField`, `word-editor:insertChart`, `word-editor:insertCode`, `word-editor:undo`, and `word-editor:redo`.

### Host Projection Timing

The host scope projects four read-only fields (`document`, `datasets`, `runtime`, `selection`) with mixed timing semantics:

- `document` is populated by the `EditorCanvas` debounced autosave callback (~500ms lag). It is a persisted snapshot, not the real-time editor content. When `runtime.dirty` is true, `document` may still reflect a previous autosave state.
- `runtime`, `selection`, and `datasets` are real-time, driven by their respective Zustand stores via `useSyncExternalStoreWithSelector`.
- The `runtime` field aggregates editor-store state with cross-store counts (`datasetCount`, `chartCount`, `codeCount`) via independent subscriptions, avoiding cross-store hot-path contamination inside the editor-store selector.

Save and autosave truth rules:

- local dirty state is cleared only after the renderer-local save succeeds and the host `saveEvent` also returns success
- a failed host save keeps the editor dirty so close protection, status publication, and host integrations still see unsaved work
- autosave must build `SavedDocumentData` from the current runtime `charts` / `codes`, not from `initialDocument`
- when an explicit save succeeds, the persisted host projection updates its saved `charts` / `codes` extras from the same runtime values used for the save
- async save completion must not recreate local UI state after unmount; save-success banners and timers are renderer-local affordances only while the page is still mounted
- in-repo live renderer call sites use the canonical `flux.wordEditor.*` i18n namespace; legacy unprefixed forms are not the current source baseline

### With nop-entropy Backend

Template compilation flow:

1. Frontend saves document JSON
2. Backend receives and stores document
3. On render request, WordTemplate compiles to XPL
4. XPL executes with data context
5. Output DOCX returned

## Testing Strategy

- `word-editor-core`: Unit tests for stores, models, and expression parsing
- `word-editor-renderers`: Component tests for panels and dialogs
- E2E: Playwright tests for full editor workflows in playground

## Related Documentation

- Component contract: `docs/components/word-editor-page/README.md`
- Development plan (historical): `docs/archive/plans/24-word-editor-development-plan.md`
- Bug fixes: `docs/bugs/24-*`, `docs/bugs/25-*`, `docs/bugs/26-*`
