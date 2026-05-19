# Word Editor Architecture

> Owner Doc Status: Active
> Last Updated: 2026-05-19

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

| Module                 | Responsibility                               |
| ---------------------- | -------------------------------------------- |
| `word-editor-page.tsx` | Main page component orchestrating all panels |
| `editor-canvas.tsx`    | Canvas-editor wrapper with React lifecycle   |
| `toolbar/`             | Ribbon-style toolbar components              |
| `panels/`              | Side panels (dataset, outline)               |
| `dialogs/`             | Modal dialogs (chart config, code config)    |
| `preview/`             | Document preview components                  |
| `hooks/`               | React hooks for editor integration           |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        WordEditorPage                           │
│  ┌──────────────┐  ┌─────────────────────┐  ┌───────────────┐  │
│  │ DatasetPanel │  │    EditorCanvas     │  │ OutlinePanel  │  │
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

- Word Editor now follows the shared workbench-shell baseline in `docs/architecture/designer-workbench-shell.md`
- left and right authoring panels are family-config-generated optional panels; they are not permanently-on renderer-private sidebars
- current dataset/field and outline surfaces are the default generators behind the current minimal `WordEditorConfig`
- `toolbar`, `leftPanel`, and `rightPanel` remain explicit override surfaces; when provided, the renderer mounts those schema regions with the word-editor host scope and action scope
- when no resolved left or right panel definition exists, that side should hide completely instead of leaving a collapsed placeholder rail

Current minimal side-panel config contract:

```ts
interface WordEditorConfig {
  leftPanel?: { generator?: 'default' };
  rightPanel?: { generator?: 'default' };
}
```

- `leftPanel` controls whether the dataset/field side exists at all
- `rightPanel` controls whether the outline side exists at all
- the current supported generator is `'default'`, which selects the built-in panel generators
- page `leftPanel` / `rightPanel` regions remain override surfaces that mount only after the corresponding config side exists

The renderer publishes the `word-editor` host family manifest, host projection scope, and namespaced actions such as `word-editor:save`, `word-editor:insertField`, `word-editor:insertChart`, `word-editor:insertCode`, `word-editor:undo`, and `word-editor:redo`.

### Host Projection Timing

The host scope projects four read-only fields (`document`, `datasets`, `runtime`, `selection`) with mixed timing semantics:

- `document` is populated by the `EditorCanvas` debounced autosave callback (~500ms lag). It is a persisted snapshot, not the real-time editor content. When `runtime.dirty` is true, `document` may still reflect a previous autosave state.
- `runtime`, `selection`, and `datasets` are real-time, driven by their respective Zustand stores via `useSyncExternalStoreWithSelector`.
- The `runtime` field aggregates editor-store state with cross-store counts (`datasetCount`, `chartCount`, `codeCount`) via independent subscriptions, avoiding cross-store hot-path contamination inside the editor-store selector.

Save and autosave truth rules:

- local dirty state is cleared only after the renderer-local save succeeds and the host `saveEvent` also returns success
- a failed host save keeps the editor dirty so close protection, status publication, and host integrations still see unsaved work
- explicit save passes the full `SavedDocumentData` envelope to the host `saveEvent(saved, ctx)` callback instead of a blank event payload
- `statusPath.busy` tracks the renderer-local explicit save lifecycle, so external hosts can distinguish idle from in-flight save state
- autosave must build `SavedDocumentData` from the current runtime `charts` / `codes`, not from `initialDocument`
- when an explicit save succeeds, the persisted host projection updates its saved `charts` / `codes` extras from the same runtime values used for the save
- explicit save now treats `SavedDocumentData` as the single persisted truth surface for the renderer-owned save path: the success callback receives the full saved envelope, and host projection `document` refreshes from `saved.data` in that same envelope
- dataset persistence is part of the successful save commit only; datasets must not be written ahead of host save success / abort adjudication
- async save completion must not recreate local UI state after unmount; save-success banners and timers are renderer-local affordances only while the page is still mounted
- in-repo live renderer call sites use the canonical `flux.wordEditor.*` i18n namespace; legacy unprefixed forms are not the current source baseline
- document/dataset persistence helpers are browser-optional: in SSR or non-browser environments they must return explicit safe fallbacks (`false`, `null`, `[]`) instead of touching `localStorage`
- mount-time recovery is persisted-first: when recovered saved state exists, host projection `document` should hydrate from that recovered persisted snapshot instead of continuing to expose schema `initialDocument`
- `datasets` are also persisted-first on remount: schema `datasets` seed the initial store only when no recovered dataset state exists, and must not overwrite later persisted user edits on every mount
- template-tag insertion must preserve the canonical tag kind published by `@nop-chaos/word-editor-core`; self-closing tags such as `c:out` stay self-closing instead of being downgraded into `tag-open`
- supported insertion surfaces may only advertise executable template tags; `c:out` remains supported because the dialog/toolbar/snippet paths now emit its `tag-selfclose` expression directly
- `word-editor:insertChart` / `word-editor:insertCode` provider enforcement now matches the published manifest contract and rejects payloads the core validators would later discard
- chart/code dialogs use the same `validateDocChart` / `validateDocCode` gate as the provider path, so invalid metadata is rejected before insertion and before persisted recovery drift can occur
- watermark commands are not part of the supported persisted truth surface and therefore are not a supported authoring surface in the current page UI

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

- Development plan (historical): `docs/archive/plans/24-word-editor-development-plan.md`
- Bug fixes: `docs/bugs/24-*`, `docs/bugs/25-*`, `docs/bugs/26-*`
