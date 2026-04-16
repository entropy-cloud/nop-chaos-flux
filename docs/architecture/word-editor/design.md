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

| Module | Responsibility |
|--------|---------------|
| `editor-store.ts` | Zustand store for editor state (mode, selection, dirty tracking) |
| `dataset-store.ts` | Zustand store for dataset management (data sources, fields) |
| `canvas-editor-bridge.ts` | Bridge to `@hufe921/canvas-editor` instance commands |
| `document-io.ts` | Document serialization/deserialization |
| `template-expr.ts` | Template expression parsing (`${expr}` syntax) |
| `template-tags.ts` | Template tag definitions (`<c:for>`, `<c:if>`, etc.) |
| `template-model.ts` | Template document model types |
| `chart-model.ts` | Chart placeholder model |
| `code-model.ts` | Code block model |
| `dataset-model.ts` | Dataset and field definitions |
| `paper-settings.ts` | Paper size and margin configuration |

### word-editor-renderers

React 19 rendering layer. Contains:

| Module | Responsibility |
|--------|---------------|
| `WordEditorPage.tsx` | Main page component orchestrating all panels |
| `EditorCanvas.tsx` | Canvas-editor wrapper with React lifecycle |
| `toolbar/` | Ribbon-style toolbar components |
| `panels/` | Side panels (dataset, properties) |
| `dialogs/` | Modal dialogs (chart config, code config) |
| `preview/` | Document preview components |
| `hooks/` | React hooks for editor integration |

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

The editor uses a three-zone document structure matching canvas-editor's model:

```typescript
interface WordDocument {
  header: ElementList;   // Page header content
  main: ElementList;     // Main body content
  footer: ElementList;   // Page footer content
  
  // Metadata
  paperSettings: PaperSettings;
  watermark?: WatermarkConfig;
  
  // Template-specific
  charts: ChartConfig[];     // Chart placeholders
  codes: CodeConfig[];       // Code block configs
  datasets: DatasetConfig[]; // Data source definitions
}
```

## Template Expression System

The Word Editor uses NOP platform's XLang expression syntax:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `${expr}` | Text expression | `${order.customerName}` |
| `<c:for>` | Loop block | `<c:for items="${orders}">...</c:for>` |
| `<c:if>` | Conditional | `<c:if test="${total > 100}">...</c:if>` |
| `expr:` | Hyperlink annotation | `expr:${imageResource}` |

This differs from SpringReport's `{{field}}` syntax but aligns with nop-entropy's WordTemplate model.

## Integration Points

### With Flux Runtime

The Word Editor page can be rendered as a Flux surface via the `word-editor` renderer type. The page receives:

- `onSave` callback for document persistence
- `initialDocument` for loading existing templates
- `datasets` for pre-configured data sources

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
- Development plan (historical): `docs/plans/24-word-editor-development-plan.md`
- Bug fixes: `docs/bugs/24-*`, `docs/bugs/25-*`, `docs/bugs/26-*`
